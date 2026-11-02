const {createHash} = require('node:crypto');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = fields => createHash('sha256').update(JSON.stringify(canonical(fields || {}))).digest('hex');
const batches = (items, size) => Array.from({length: Math.ceil(items.length / size)}, (_, i) => items.slice(i * size, (i + 1) * size));

/** Exact point-in-time copy, followed by verification and removal of stale target records.
 * Typed REST values preserve timestamps, bytes, references, geopoints, and integers.
 * An unrestricted descendant query also finds orphan subcollections.
 */
async function mirrorFirestore({request, project, readTime, source = '(default)', target = 'backup', pageSize = 10000}) {
  if (source !== '(default)' || target !== 'backup') throw new Error('Only (default) -> backup is permitted');
  const base = database => `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents`;
  async function* scan(database, atTime) {
    let cursor;
    do {
      const structuredQuery = {from: [{allDescendants: true}], orderBy: [{field: {fieldPath: '__name__'}, direction: 'ASCENDING'}], limit: pageSize};
      if (cursor) structuredQuery.startAt = {values: [{referenceValue: cursor}], before: false};
      const rows = await request(base(database) + ':runQuery', {structuredQuery, ...(atTime ? {readTime: atTime} : {})});
      const docs = rows.filter(row => row.document).map(row => row.document);
      yield docs;
      cursor = docs.length === pageSize ? docs.at(-1).name : undefined;
    } while (cursor);
  }
  const expected = new Map();
  for await (const docs of scan(source, readTime)) {
    const writes = docs.map(doc => {
      const path = doc.name.split('/documents/')[1];
      expected.set(path, hash(doc.fields));
      return {update: {name: `projects/${project}/databases/${target}/documents/${path}`, fields: doc.fields || {}}};
    });
    // Bounded concurrency keeps each commit below Firestore's write/request limits.
    const groups = batches(writes, 200);
    for (let i = 0; i < groups.length; i += 3) {
      await Promise.all(groups.slice(i, i + 3).map(writes => request(base(target) + ':commit', {writes})));
    }
    console.log(JSON.stringify({phase: 'copy', documents: expected.size}));
  }
  if (!expected.size) throw new Error('Source is empty; refusing to erase backup');
  const stale = [];
  let verified = 0;
  for await (const docs of scan(target)) {
    for (const doc of docs) {
      const path = doc.name.split('/documents/')[1];
      if (!expected.has(path)) stale.push({delete: doc.name, currentDocument: {updateTime: doc.updateTime}});
      else {
        if (expected.get(path) !== hash(doc.fields)) throw new Error('Backup content verification failed');
        verified++;
      }
    }
  }
  if (verified !== expected.size) throw new Error('Backup is missing copied documents');
  // Never prune until the complete source copy has been verified.
  for (const writes of batches(stale, 200)) await request(base(target) + ':commit', {writes});
  return {readTime, copied: expected.size, verified, removed: stale.length};
}
module.exports = {mirrorFirestore, hash};
