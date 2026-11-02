const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mirrorFirestore} = require('../mirror.cjs');
const name = (db, path) => `projects/test/databases/${db}/documents/${path}`;
function fixture({failCopy = false, corrupt = false, empty = false} = {}) {
  const source = new Map(empty ? [] : [
    ['users/a', {name: {mapValue: {fields: {first: {stringValue: 'A'}}}}, number: {integerValue: '9007199254740993'}}],
    ['users/a/assets/agq', {amount: {doubleValue: 1.5}, time: {timestampValue: '2026-01-01T00:00:00.123456Z'}}],
    ['users/orphan/graphpoints/1', {reference: {referenceValue: name('(default)', 'users/a')}, bytes: {bytesValue: 'AA=='}}],
  ]);
  const target = new Map([['users/a', {obsolete: {booleanValue: true}}], ['old/x/child/y', {}]]);
  const deletes = []; const readTimes = [];
  const request = async (url, body) => {
    const db = url.includes('/(default)/') ? '(default)' : 'backup';
    if (url.endsWith(':runQuery')) {
      if (db === '(default)') readTimes.push(body.readTime);
      const map = db === '(default)' ? source : target;
      const cursor = body.structuredQuery.startAt?.values[0].referenceValue;
      return [...map].sort(([a],[b]) => a.localeCompare(b)).map(([path, fields]) => ({document: {name: name(db, path), fields: corrupt && db === 'backup' && path === 'users/a' ? {} : fields, updateTime: '2026-01-01T00:00:00Z'}})).filter(row => !cursor || row.document.name > cursor).slice(0, body.structuredQuery.limit);
    }
    for (const write of body.writes) {
      if (write.update) {
        if (failCopy) throw Error('Simulated failed copy');
        target.set(write.update.name.split('/documents/')[1], write.update.fields);
      } else {
        assert.ok(write.currentDocument.updateTime);
        deletes.push(write.delete); target.delete(write.delete.split('/documents/')[1]);
      }
    }
    return {};
  };
  return {source, target, deletes, readTimes, request};
}
test('mirrors all descendants, preserves typed values, replaces fields and prunes stale documents', async () => {
  const f = fixture(); const result = await mirrorFirestore({request:f.request, project: 'test', readTime: 'snapshot', pageSize: 2});
  assert.deepEqual(f.target, f.source); assert.equal(result.verified, 3); assert.equal(result.removed, 1);
  assert.ok(f.readTimes.length > 1); assert.ok(f.readTimes.every(time => time === 'snapshot'));
});
test('failed copying or verification never prunes the previous backup', async () => {
  for (const options of [{failCopy:true}, {corrupt:true}]) {
    const f = fixture(options); await assert.rejects(mirrorFirestore({request:f.request, project:'test', readTime:'snapshot', pageSize:2}));
    assert.equal(f.deletes.length, 0); assert.ok(f.target.has('old/x/child/y'));
  }
});
test('refuses empty-source deletion and any destination other than backup', async () => {
  const f=fixture({empty:true});await assert.rejects(mirrorFirestore({request:f.request,project:'test',readTime:'snapshot'}),/empty/);
  for(const target of ['(default)','testing'])await assert.rejects(mirrorFirestore({request:f.request,project:'test',target}),/Only/);
  assert.equal(f.deletes.length,0);
});
