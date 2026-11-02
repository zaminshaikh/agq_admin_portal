const {onSchedule} = require('firebase-functions/v2/scheduler');
const {GoogleAuth} = require('google-auth-library');
const {initializeApp} = require('firebase-admin/app');
const {getStorage} = require('firebase-admin/storage');
const {randomUUID} = require('node:crypto');
const {mirrorFirestore} = require('./mirror.cjs');
const project = 'team-shaikh-app-52dc5';
initializeApp({projectId: project, storageBucket: project + '.appspot.com'});

async function refreshBackup() {
  const bucket = getStorage().bucket();
  const lock = bucket.file('.backup-control/monthly-lock.json');
  let lockGeneration;
  const started = Date.now();
  try {
    // A generation-checked lock protects manual invocations and scheduler retries.
    let generation = 0;
    try {
      const [meta] = await lock.getMetadata();
      if (Date.now() - Date.parse(meta.updated) < 40 * 60 * 1000) throw new Error('Backup refresh already running');
      generation = meta.generation;
    } catch (error) { if (error.code !== 404) throw error; }
    await lock.save(JSON.stringify({id: randomUUID(), startedAt: new Date(started).toISOString()}), {resumable: false, preconditionOpts: {ifGenerationMatch: generation}});
    lockGeneration = (await lock.getMetadata())[0].generation;
    const client = await new GoogleAuth({scopes: ['https://www.googleapis.com/auth/cloud-platform']}).getClient();
    const request = async (url, data) => (await client.request({url, method: 'POST', data, timeout: 120000})).data;
    // Minute-aligned PITR snapshot remains consistent across every query page.
    const readTime = new Date(Math.floor(started / 60000) * 60000 - 60000).toISOString();
    const database = await mirrorFirestore({request, project, readTime});
    const [files] = await bucket.getFiles();
    const originals = files.filter(file => !['testing/', 'backup/', '.backup-control/'].some(prefix => file.name.startsWith(prefix)));
    const retained = new Set();
    for (let i = 0; i < originals.length; i += 5) {
      await Promise.all(originals.slice(i, i + 5).map(async file => {
        const target = bucket.file('backup/' + file.name);
        const [source] = await file.getMetadata();
        await bucket.file(file.name, {generation: source.generation}).copy(target);
        const [copy] = await target.getMetadata();
        if (copy.crc32c !== source.crc32c || copy.size !== source.size) throw new Error('Storage copy verification failed');
        retained.add(target.name);
      }));
    }
    // Remove only obsolete backup objects; production/testing objects are untouched.
    for (const file of files.filter(file => file.name.startsWith('backup/') && !retained.has(file.name))) {
      await file.delete({ifGenerationMatch: file.metadata.generation});
    }
    const report = {startedAt: new Date(started).toISOString(), completedAt: new Date().toISOString(), database, storageFiles: retained.size};
    await bucket.file('.backup-control/latest.json').save(JSON.stringify(report), {resumable: false, contentType: 'application/json'});
    console.log(JSON.stringify(report));
    return report;
  } finally {
    if (lockGeneration) await lock.delete({ifGenerationMatch: lockGeneration});
  }
}
exports.monthlyBackup = onSchedule({
  schedule: '0 2 1 * *', timeZone: 'America/Los_Angeles', region: 'us-central1',
  timeoutSeconds: 1800, memory: '1GiB', maxInstances: 1, concurrency: 1,
  retryCount: 3, minBackoffSeconds: 300, maxBackoffSeconds: 900,
}, refreshBackup);
