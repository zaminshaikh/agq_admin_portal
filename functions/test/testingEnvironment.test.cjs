const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const cwd=path.resolve(__dirname,'..');

test('testing server refuses the production database',()=>{
  assert.throws(()=>execFileSync(process.execPath,['-e',"require('./lib/src/testing')"],{
    cwd,env:{...process.env,FIRESTORE_DATABASE_ID:'(default)'},stdio:'pipe',
  }),error=>error.stderr.toString().includes('requires FIRESTORE_DATABASE_ID=testing'));
});
test('testing server selects named database, namespaces uploads, and blocks shared Auth mutations',()=>{
  const result=execFileSync(process.execPath,['-e',`
    const assert=require('node:assert/strict');
    const endpoints=require('./lib/src/testing');
    const environment=require('./lib/src/helpers/database');
    assert.equal(environment.getDatabase().databaseId,'testing');
    assert.equal(environment.contentStoragePath('app-content/uploads/photo'),'testing/app-content/uploads/photo');
    const context={auth:{uid:'test-admin',token:{adminPermissions:'admin'}}};
    Promise.all(['createAdminAccount','updateAdminPermissions','deleteAdmin','adminLinkUser','unlinkUser','verifyUserEmail','sendInviteEmail'].map(async name=>{
      await assert.rejects(endpoints[name].run({},context),error=>error.code==='failed-precondition');
    })).then(()=>console.log('isolated')).catch(error=>{console.error(error);process.exitCode=1;});
  `],{cwd,env:{...process.env,FIRESTORE_DATABASE_ID:'testing'},encoding:'utf8'});
  assert.match(result,/isolated/);
});
