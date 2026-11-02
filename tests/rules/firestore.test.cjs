const {test}=require('node:test');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {collectionGroup,query,where,getDocs,doc,setDoc,getDoc,setLogLevel}=require('firebase/firestore');
setLogLevel('silent');
const root=path.resolve(__dirname,'../..');
const host=process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8187';
if(!/^127\.0\.0\.1:\d+$/.test(host))throw Error('These rules tests only run against a local emulator.');
const prior=execFileSync('git',['show','b247719:firestore.testing.rules'],{cwd:root,encoding:'utf8'});
const current=fs.readFileSync(path.join(root,'firestore.testing.rules'),'utf8');
for(const [label,rules] of [['before',prior],['after',current]]){
  test(`${label}: activity query contract and access restrictions`,async()=>{
    // Unit-test contexts use the emulator's default database. Only substitute
    // the outer database matcher; all document/query rules remain unchanged.
    const env=await initializeTestEnvironment({projectId:'demo-agq-regression',firestore:{host:'127.0.0.1',port:Number(host.split(':')[1]),rules:rules.replace('/databases/testing/','/databases/{database}/')}});
    try {
      await env.clearFirestore();
      await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'users/fixture/activities/a'),{parentCollection:'users',amount:100}));
      const activities=db=>getDocs(query(collectionGroup(db,'activities'),where('parentCollection','==','users')));
      for(const role of ['read','write','admin']){
        const db=env.authenticatedContext(role,{adminPermissions:role}).firestore();
        if(label==='before')await assertFails(activities(db));
        else assert.equal((await assertSucceeds(activities(db))).size,1);
      }
      const anonymous=env.unauthenticatedContext().firestore();
      await assertFails(activities(anonymous));
      await assertFails(activities(env.authenticatedContext('client',{}).firestore()));
      const reader=env.authenticatedContext('reader',{adminPermissions:'read'}).firestore();
      await assertFails(setDoc(doc(reader,'users/fixture/activities/new'),{parentCollection:'users'}));
      const writer=env.authenticatedContext('writer',{adminPermissions:'write'}).firestore();
      await assertSucceeds(setDoc(doc(writer,'users/fixture/activities/new'),{parentCollection:'users'}));
      const admin=env.authenticatedContext('admin',{adminPermissions:'admin'}).firestore();
      await assertFails(setDoc(doc(admin,'appContent/published'),{texts:{}}));
      await assertSucceeds(getDoc(doc(anonymous,'appContent/published')));
    } finally {await env.cleanup();}
  });
}
