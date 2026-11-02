const {test}=require('node:test');
const assert=require('node:assert/strict');
const {aggregateAum}=require('../lib/src/analytics/aum');
const point=(clientId,fund,amount,day,extra={})=>({clientId,fund,amount,time:Date.parse(day),created:1,id:clientId+day,account:'Cumulative',...extra});
const now=Date.parse('2026-01-31');
test('replaces cumulative balances, carries other clients/funds forward, and combines funds',()=>{
  const result=aggregateAum([
    point('a','AGQ',100,'2026-01-01'),point('b','AGQ',200,'2026-01-02'),
    point('a','AK1',50,'2026-01-02'),point('a','AGQ',120,'2026-01-03'),
    point('a','AGQ',120,'2026-01-03',{id:'duplicate'}),
    point('a','AGQ',120,'2026-01-03',{account:'Personal'}),
  ],now);
  assert.deepEqual(result.points,[
    {date:'2026-01-01',AGQ:100,AK1:0,combined:100},
    {date:'2026-01-02',AGQ:300,AK1:50,combined:350},
    {date:'2026-01-03',AGQ:320,AK1:50,combined:370},
  ]);
});
test('uses newest written cumulative balance when event timestamps match',()=>{
  const result=aggregateAum([point('a','AGQ',80,'2026-01-01',{created:3}),point('a','AGQ',100,'2026-01-01',{created:2})],now);
  assert.equal(result.points[0].AGQ,80);
});
test('excludes future and malformed points, preserves withdrawals/negative balances, and rounds cents',()=>{
  const result=aggregateAum([
    point('a','AGQ',0.1,'2026-01-01'),point('b','AGQ',0.2,'2026-01-01'),
    point('a','AK1',-25,'2026-01-02'),point('a','AGQ',999,'2027-01-01'),
    point('x','OTHER',25,'2026-01-02'),point('x','AGQ',NaN,'2026-01-02'),
  ],now);
  assert.equal(result.invalid,2);
  assert.deepEqual(result.points.at(-1),{date:'2026-01-02',AGQ:0.3,AK1:-25,combined:-24.7});
});
test('range filtering carries the opening balance and does not invent history before the first record',()=>{
  const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
  const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../src/views/dashboard/aumRange.ts'),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const context={exports:{}};vm.runInNewContext(output,context);
  const select=context.exports.selectAumRange;
  const history=[{date:'2026-01-01',AGQ:100,AK1:0,combined:100},{date:'2026-01-20',AGQ:200,AK1:0,combined:200}];
  assert.equal(JSON.stringify(select(history,'2026-01-10','2026-01-25')),JSON.stringify([{...history[0],date:'2026-01-10'},history[1],{...history[1],date:'2026-01-25'}]));
  assert.equal(select(history,'2025-01-01','2025-12-31').length,0);
  assert.equal(select(history,'2026-02-01','2026-01-01').length,0);
});
test('AUM endpoint denies unauthenticated and non-admin callers before any reads',async()=>{
  const endpoint=require('../lib/src/analytics/getAumHistory').getAumHistory;
  await assert.rejects(endpoint.run({},{}),error=>error.code==='unauthenticated');
  await assert.rejects(endpoint.run({},{auth:{uid:'client',token:{}}}),error=>error.code==='permission-denied');
});
