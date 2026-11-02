#!/usr/bin/env node
// Build functions first. Dry-run unless --apply is provided.
const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const catalog = require('../src/content/catalog.json');

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS');
  const credential = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  const projectId = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.firebaserc'), 'utf8')).projects.default;
  if (projectId !== credential.project_id) throw new Error('Credential project does not match .firebaserc');
  const backupPath = args[args.indexOf('--backup') + 1];
  if (apply && (!args.includes('--backup') || !path.isAbsolute(backupPath))) throw new Error('--apply requires --backup /absolute/private/path.json');
  admin.initializeApp({ credential: admin.credential.cert(credential), projectId, storageBucket: `${projectId}.appspot.com` });
  try {
    const ref = admin.firestore().doc('appContent/published');
    const before = await ref.get();
    const data = before.data();
    const missing = kind => catalog.filter(entry => (entry.kind === 'image') === (kind === 'image') && !Object.hasOwn((kind === 'image' ? data?.images : data?.texts) ?? {}, entry.id)).length;
    console.log(JSON.stringify({ projectId, database: '(default)', document: ref.path, mode: apply ? 'apply' : 'dry-run', missingTexts: missing('text'), missingImages: missing('image') }));
    if (apply) {
      fs.writeFileSync(backupPath, JSON.stringify({ path: ref.path, exists: before.exists, data: data ?? null }, null, 2), { flag: 'wx', mode: 0o600 });
      const { seedAppContentDefaults } = require('../lib/src/content/appContent');
      console.log(JSON.stringify(await seedAppContentDefaults(`migration:${credential.client_email}`)));
      const after = (await ref.get()).data();
      console.log(JSON.stringify({ texts: Object.keys(after.texts).length, images: Object.keys(after.images).length, supportEmail: after.texts['contact.support_email'] }));
    }
  } finally { await admin.app().delete(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
