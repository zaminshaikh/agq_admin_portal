const {spawnSync}=require('node:child_process');
const path=require('node:path');
const baseline=process.env.PORTAL_BASELINE || '10c9a7488234351adce2b720f568d1ebbc051924';
for(const [label,revision] of [['original portal',baseline],['working portal','']]){
  console.log(`\nPreservation suite: ${label}${revision ? ' ('+revision.slice(0,8)+')' : ''}`);
  const result=spawnSync(process.execPath,['--test',path.join(__dirname,'portal.test.cjs')],{stdio:'inherit',env:{...process.env,PORTAL_REVISION:revision}});
  if(result.status!==0)process.exit(result.status||1);
}
