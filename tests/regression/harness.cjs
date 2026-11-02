const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {createRequire} = require('node:module');
const root = path.resolve(process.env.PORTAL_SOURCE_ROOT || path.join(__dirname, '../..'));
const localRequire = createRequire(path.join(__dirname, '../../package.json'));
const ts = localRequire('typescript');
const revision = process.env.PORTAL_REVISION;
const config = {FIRESTORE_ACTIVE_USERS_COLLECTION:'users',ASSETS_SUBCOLLECTION:'assets',ASSETS_GENERAL_DOC_ID:'general',ASSETS_AGQ_DOC_ID:'agq',ASSETS_AK1_DOC_ID:'ak1',ACTIVITIES_SUBCOLLECTION:'activities',GRAPHPOINTS_SUBCOLLECTION:'graphPoints',NOTIFICATIONS_SUBCOLLECTION:'notifications',SCHEDULED_ACTIVITIES_COLLECTION:'scheduledActivities'};
class Timestamp {
  constructor(date){this.date=date;}
  toDate(){return this.date;}
  toMillis(){return this.date.getTime();}
  static fromDate(date){return new Timestamp(date);}
}
const normalize = value => JSON.parse(JSON.stringify(value));
function harness() {
  const calls={reads:[],writes:[],deletes:[],functions:[],pdf:[],deliveries:0};
  const records=new Map();const results=new Map();const replies=new Map();
  const ref=(base,...parts)=>({path:[base?.path,...parts].filter(Boolean).join('/')});
  const snapshot=(p,data)=>({id:p.split('/').at(-1),ref:{path:p,parent:{path:p.split('/').slice(0,-1).join('/')}},exists:()=>data!==undefined,data:()=>data});
  const fsMock={Timestamp,getFirestore:()=>({}),collection:ref,doc:ref,collectionGroup:(_,name)=>({path:'**/'+name}),where:(...args)=>args,query:(base,...filters)=>({...base,filters}),
    getDoc:async r=>{calls.reads.push(r);return snapshot(r.path,records.get(r.path));},
    getDocs:async r=>{calls.reads.push(r);const docs=(results.get(r.path)||[]).map(([p,data])=>snapshot(p,data));return {docs,empty:!docs.length,size:docs.length,forEach:cb=>docs.forEach(cb)};},
    setDoc:async(r,data,options)=>{calls.writes.push({path:r.path,data,options});},
    addDoc:async(r,data)=>{calls.writes.push({path:r.path,data});return {id:'new-id'};},
    deleteDoc:async r=>calls.deletes.push(r.path),
    writeBatch:()=>({delete:r=>calls.deletes.push(r.path),commit:async()=>{}}),
  };
  const fnMock={getFunctions:()=>({}),httpsCallable:(_,name)=>async data=>{calls.functions.push({name,data});const reply=replies.get(name);if(reply instanceof Error)throw reply;return {data:reply};}};
  const pdf={addVirtualFileSystem(){},createPdf(definition){calls.pdf.push(definition);return {open(){calls.deliveries++;},getBlob(cb){cb(new Blob(['pdf']));}};}};
  const cache = new Map();const injected = new Map([
    ['firebase/firestore',fsMock],['firebase/functions',fnMock],['firebase/storage',{getStorage:()=>({}),ref:(_,p)=>p,uploadBytes:async()=>{throw Error('Legacy regression must not upload');}}],
    ['react-firebase-hooks/auth',{useAuthState:()=>[null,false,null]}],['pdfmake/build/pdfmake',pdf],['pdfmake/build/vfs_fonts',{}],
  ]);
  function load(relative) {
    const file=relative.replace(/\\/g,'/');if(cache.has(file))return cache.get(file).exports;
    let source=revision?execFileSync('git',['show',`${revision}:${file}`],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8');
    source=source.replaceAll('import.meta.env','({})');
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
    const module={exports:{}};cache.set(file,module);
    const requireFromSource=name=>{
      if(injected.has(name))return injected.get(name);
      if(/(^|\/)App(\.tsx)?$/.test(name))return {app:{},auth:{}};
      if(name.endsWith('config.json'))return config;
      if(name.endsWith('/logos.ts'))return {agqTopLogo:'logo',agqWatermarkLogo:'watermark'};
      if(name.startsWith('.')||name.startsWith('src/')){
        let child=path.posix.normalize(name.startsWith('src/')?name:path.posix.join(path.posix.dirname(file),name));
        if(!/\.(tsx?|json)$/.test(child))child+='.ts';
        if(child.endsWith('.json'))return JSON.parse(revision?execFileSync('git',['show',`${revision}:${child}`],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,child),'utf8'));
        return load(child);
      }
      return localRequire(name);
    };
    vm.runInNewContext(code,{module,exports:module.exports,require:requireFromSource,Date,Intl,Blob,Buffer,crypto:require('node:crypto').webcrypto,console:{log(){},error(){},warn(){}},setTimeout(){},clearTimeout(){},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},document:{body:{appendChild(){}},createElement:()=>({click(){calls.deliveries++;},remove(){}})}},{filename:file});
    return module.exports;
  }
  return {load,calls,records,results,replies,snapshot,Timestamp,injected};
}
module.exports={harness,normalize,root,revision};
