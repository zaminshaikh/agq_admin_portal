const { test } = require('node:test');
const assert = require('node:assert/strict');
const { proposedName, migrate } = require('./migrate-client-names.cjs');
test('joins trimmed personal names with a space', () => {
  assert.equal(proposedName({ name: { first: ' Ada ', last: ' Lovelace ' } }), 'Ada Lovelace');
  assert.equal(proposedName({ name: { first: 'Ada' }, accountName: '' }), 'Ada');
});
test('renames custom account names and preserves existing client names', () => {
  assert.equal(proposedName({ name: { first: 'Ada' }, accountName: 'Family Trust' }), 'Family Trust');
  assert.equal(proposedName({ clientName: 'Updated Trust', accountName: 'Family Trust' }), 'Updated Trust');
  assert.equal(proposedName({ clientName: 'Updated Trust' }), null);
});
test('does not invent missing names or replace malformed data', () => {
  assert.equal(proposedName({ name: {} }), null);
  assert.equal(proposedName({ name: { first: 42 } }), null);
  assert.equal(proposedName({ accountName: 42, name: { first: 'Ada' } }), null);
});
test('migration atomically renames the field and preserves concurrent edits', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'account-backfill-'));
  const backup = path.join(dir, 'backup.json');
  const original = { name: { first: 'Ada', last: 'Lovelace' }, accountName: 'Family Trust' };
  const docs = ['a','b'].map(id => ({ ref: { path: `users/${id}` }, data: () => original }));
  const writes=[];
  const db={collection:()=>({get:async()=>({docs,size:2})}),runTransaction:async cb=>cb({
    get:async ref=>({exists:true,data:()=>ref.path.endsWith('/b')?{...original,accountName:'New edit'}:original}),
    update:(ref,data)=>writes.push({path:ref.path,...data}),
  })};
  try {
    assert.deepEqual(await migrate(db,'users',false),{total:2,candidates:2,updated:0,skipped:0});
    assert.equal(writes.length,0);
    const deleteField = Symbol('delete');
    assert.deepEqual(await migrate(db,'users',true,backup,deleteField),{total:2,candidates:2,updated:1,skipped:1});
    assert.deepEqual(writes,[{path:'users/a',clientName:'Family Trust',accountName:deleteField}]);
    const saved=JSON.parse(fs.readFileSync(backup)).records[0];
    assert.equal(saved.hadAccountName,true);
    assert.equal(saved.accountName,'Family Trust');
    assert.equal(saved.hadClientName,false);
  } finally { fs.rmSync(dir,{recursive:true}); }
});
