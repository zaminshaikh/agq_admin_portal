const {test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const validation = require('../lib/src/content/validation');
const fullCatalog = require('../src/content/catalog.json');
const catalog = fullCatalog.filter(entry => entry.editable);
let published, uploads, deleted;
const ref = {};
const snapshot = () => ({data: () => published});
const firestore = () => ({doc: () => ({...ref, get: async () => snapshot()}), runTransaction: async callback => callback({
  get: async () => snapshot(), set: (_ref, value) => { published = value; }, update: (_ref, value) => { published = {...published, ...value}; },
})});
firestore.FieldValue = {serverTimestamp: () => 'timestamp'};
const fakeAdmin = {firestore, storage: () => ({bucket: () => ({name: 'test-bucket',file: path => ({
  save: async (bytes, options) => {uploads.push({path,bytes,options});},
  delete: async () => {deleted.push(path);},
})})})};
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'firebase-admin') return fakeAdmin;
  if (request === 'firebase-admin/firestore') return { getFirestore: firestore };
  return originalLoad.call(this,request,parent,main);
};
const {getAppContentForAdmin, saveAppContent, updateAppImage, seedAppContentDefaults} = require('../lib/src/content/appContent');
Module._load = originalLoad;
const admin = {auth: {uid: 'admin-user', token: {adminPermissions: 'admin'}}};
beforeEach(() => {published=undefined; uploads=[]; deleted=[];});

test('admin migration seeds all defaults once and preserves existing edits on rerun', async () => {
  published={version:2,texts:{'contact.support_email':'custom@example.com'},images:{'image.sonny_headshot_png':{url:'existing-photo'}}};
  assert.deepEqual(await seedAppContentDefaults('migration:test'),{changed:true,version:3});
  assert.equal(Object.keys(published.texts).length,catalog.filter(e=>e.kind!=='image').length+1);
  assert.equal(Object.keys(published.images).length,2);
  assert.equal(published.texts['contact.support_email'],'custom@example.com');
  assert.match(published.texts['signup.cid_help'],/custom@example.com/);
  assert.equal(published.images['image.sonny_headshot_png'].url,'existing-photo');
  assert.equal(uploads.length,1);
  assert.deepEqual(await seedAppContentDefaults('migration:test'),{changed:false,version:3});
  assert.equal(uploads.length,1);
});

test('catalog copies match and every default validates', () => {
  assert.deepEqual(fullCatalog, require('../../src/content/catalog.json'));
  assert.equal(new Set(catalog.map(e=>e.id)).size, catalog.length);
  for (const entry of catalog) if(entry.kind !== 'image') assert.equal(validation.validateText(entry.id,entry.defaultValue),entry.defaultValue);
});
test('all editing endpoints enforce administrator claims', async () => {
  for (const endpoint of [getAppContentForAdmin, saveAppContent, updateAppImage]) {
    await assert.rejects(endpoint.run({},{}), error=>error.code==='unauthenticated');
    await assert.rejects(endpoint.run({}, {auth:{uid:'reader',token:{adminPermissions:'read'}}}), error=>error.code==='permission-denied');
  }
  assert.equal(uploads.length,0); assert.equal(published,undefined);
});
test('initial publish stores the full text catalog and all default images', async () => {
  const data=await saveAppContent.run({baseVersion:0,texts:{'signup.cid_help':'carter@agqconsulting.com'}},admin);
  assert.equal(data.version,1);
  assert.equal(Object.keys(data.texts).length,catalog.filter(e=>e.kind!=='image').length);
  assert.equal(Object.keys(data.images).length,catalog.filter(e=>e.kind==='image').length);
  assert.equal(uploads.length,Object.keys(data.images).length);
  assert.equal(published.updatedBy,'admin-user');
  assert.match(data.images['image.sonny_headshot_png'].url,/firebasestorage.googleapis.com/);
});
test('text updates preserve other content and stale edits cannot overwrite it', async () => {
  published={version:4,texts:{...validation.defaultTexts,'signup.cid_help':'existing@example.com'},images:{portrait:{url:'saved'}}};
  const data=await saveAppContent.run({baseVersion:4,texts:{'signup.cid_help':'new@example.com'}},admin);
  assert.equal(data.version,5); assert.deepEqual(data.images,{portrait:{url:'saved'}});
  await assert.rejects(saveAppContent.run({baseVersion:4,texts:{'signup.cid_help':'stale@example.com'}},admin),error=>error.code==='aborted');
  assert.equal(published.texts['signup.cid_help'],'new@example.com');
});
test('invalid text, unknown keys, and missing dynamic placeholders are rejected', async () => {
  const template=catalog.find(e=>e.placeholders.length);
  for (const texts of [{'contact.sonny_email_message':'not an email'}, {'unknown':'test'}, {[template.id]:'missing placeholders'}, {'signup.cid_help':''}]) {
    await assert.rejects(saveAppContent.run({baseVersion:0,texts},admin),error=>error.code==='invalid-argument');
  }
  assert.equal(uploads.length,0);
});
test('photo uploads validate bytes and preserve unrelated settings', async () => {
  published={version:1,texts:validation.defaultTexts,images:{}};
  await assert.rejects(updateAppImage.run({baseVersion:1,id:'image.sonny_headshot_png',base64:Buffer.from('<svg><script/></svg>').toString('base64')},admin),error=>error.code==='invalid-argument');
  const png=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../assets/app-content/sonny_headshot.png'));
  const result=await updateAppImage.run({baseVersion:1,id:'image.sonny_headshot_png',base64:png.toString('base64')},admin);
  assert.equal(result.version,2);assert.equal(result.images['image.sonny_headshot_png'].contentType,'image/png');
  assert.equal(result.texts['signup.cid_help'],validation.defaultTexts['signup.cid_help']);
  const reset=await updateAppImage.run({baseVersion:2,id:'image.sonny_headshot_png',reset:true},admin);
  assert.equal(reset.version,3);assert.match(reset.images['image.sonny_headshot_png'].url,/defaults/);
});
test('image uploads reject stale sessions before uploading any bytes', async () => {
  published={version:2,texts:validation.defaultTexts,images:{}};
  await assert.rejects(updateAppImage.run({baseVersion:1,id:'image.sonny_headshot_png',reset:true},admin),error=>error.code==='aborted');
  assert.equal(uploads.length,0);
});

test('legacy CID text and custom contact become one editable message without losing wording', async()=>{
  const old='text.screens.authenticate.create_account.create_account.your_client_id_number_cid_is_an_8_digi_1450b8';
  published={version:8,texts:{[old]:'For your code, write to {supportEmail}. Thank you!','contact.support_email':'custom@example.com'},images:{}};
  const data=await getAppContentForAdmin.run({},admin);
  assert.equal(data.texts['signup.cid_help'],'For your code, write to custom@example.com. Thank you!');
  assert.equal(published.version,8);
  const saved=await saveAppContent.run({baseVersion:8,texts:{'signup.cid_help':'Need your Client ID? Email another@example.com.'}},admin);
  assert.equal(saved.texts['signup.cid_help'],'Need your Client ID? Email another@example.com.');
  assert.equal(saved.texts[old],published.texts[old]);
  assert.equal(catalog.some(e=>e.id==='contact.support_email'||e.id===old),false);
});

test('full contact lines preserve old wording, keep actions valid, and reject ambiguous targets',()=>{
  const {withInlineContact}=require('../lib/src/content/inlineText');
  const result=withInlineContact({'contact.sonny_email':'custom@example.com','text.screens.profile.pages.help.email_sonny_agqconsulting_com_58c8a4':'Reach us at {email}'});
  assert.equal(result['contact.sonny_email_message'],'Reach us at custom@example.com');
  assert.equal(validation.validateText('contact.sonny_email_message','Write to changed@example.com'),'Write to changed@example.com');
  assert.equal(validation.validateText('contact.sonny_phone_message','Call +1 (555) 123-4567'),'Call +1 (555) 123-4567');
  for(const [key,text] of [['contact.sonny_email_message','No email'],['contact.sonny_email_message','a@example.com or b@example.com'],['contact.sonny_phone_message','No phone'],['contact.sonny_phone_message','555-123-4567 or 555-987-6543']])assert.throws(()=>validation.validateText(key,text));
});

test('renamed and unknown placeholders are rejected before any publish', async () => {
  const template=catalog.find(e=>e.placeholders.length);
  const token=template.placeholders[0];
  for(const value of [template.defaultValue.replace(`{${token}}`,'{renamedValue}'),template.defaultValue+' {unknownValue}']) {
    await assert.rejects(saveAppContent.run({baseVersion:0,texts:{[template.id]:value}},admin),error=>error.code==='invalid-argument');
  }
  assert.equal(published,undefined);assert.equal(uploads.length,0);
});

test('button labels and non-profile images cannot be published',async()=>{
  const logout=fullCatalog.find(entry=>entry.defaultValue==='Logout');
  assert.equal(logout.editable,false);
  await assert.rejects(saveAppContent.run({baseVersion:0,texts:{[logout.id]:'Different action'}},admin),error=>error.code==='invalid-argument');
  await assert.rejects(updateAppImage.run({baseVersion:1,id:'image.agq_logo_png',reset:true},admin),error=>error.code==='invalid-argument');
  assert.equal(uploads.length,0);assert.equal(published,undefined);
});
test('descriptive editor tokens round-trip every saved message without changing its meaning',()=>{
  const esbuild=require('../../node_modules/esbuild');const vm=require('node:vm');
  const output=esbuild.buildSync({entryPoints:[require('node:path').resolve(__dirname,'../../src/content/editorText.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  const module={exports:{}};vm.runInNewContext(output,{module,exports:module.exports});
  const {toEditorText,toStoredText}=module.exports;
  for(const entry of catalog.filter(entry=>entry.kind!=='image')){
    const custom='Custom wording: '+entry.defaultValue;
    const editor=toEditorText(entry.id,custom);
    assert.doesNotMatch(editor,/\{value\d+\}/);
    assert.equal(toStoredText(entry.id,editor),custom);
    assert.equal(validation.validateText(entry.id,toStoredText(entry.id,editor)),custom);
  }
});
