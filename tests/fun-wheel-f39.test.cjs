'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const wheel=require('../js/fun-wheel-f39.js');
const catalog=require('../js/item-catalog-v2.js');
const read=file=>readFileSync(join(__dirname,'..',file),'utf8');

test('F3.9 featured item is the strongest actual receipt, not a random preview',()=>{
 const rows=[{kind:'COIN',amount:30,rank:'COIN'},
  {kind:'ITEM',itemId:'f36-d',rank:'D'},
  {kind:'DUPLICATE',itemId:'f36-s',rank:'S'},
  {kind:'ITEM',itemId:'f36-s2',rank:'S'},
  {kind:'ITEM',itemId:'f36-sss',rank:'SSS'}];
 assert.equal(wheel.featured(rows),rows[4]);
 assert.equal(wheel.featured(rows.slice(0,4)),rows[3],
  'With equal rank, a newly obtained item beats a duplicate');
 assert.equal(wheel.featured(null),null);
 assert.equal(wheel.featured([]),null);
});

test('F3.9 pointer lands precisely on the winning 1-of-9 medallion',()=>{
 const seen=new Set();
 for(const item of catalog.funVantVat){
  const outcome=wheel.landing(item.id);
  assert.ok(Number.isInteger(outcome.slot));
  assert.ok(outcome.slot>=0&&outcome.slot<9);
  assert.equal((outcome.slot*40+outcome.degrees)%360,0,item.id);
  assert.deepEqual(outcome,wheel.landing(item.id));
  seen.add(outcome.slot);
 }
 assert.ok(seen.size>=7,'Not every prize is painted into the same wheel sector');
 assert.throws(()=>wheel.landing('relic',7),/invalid-sectors/);
});

test('F3.9 batch summary counts inventory and Xu payouts without modifying receipt',()=>{
 const results=[{kind:'ITEM',rank:'SSS',itemId:'a'},
  {kind:'ITEM',rank:'F',itemId:'b'},
  {kind:'DUPLICATE',rank:'S',itemId:'c',amount:17},
  {kind:'COIN',rank:'COIN',amount:30}];
 const before=JSON.stringify(results),result=wheel.summary(results);
 assert.equal(result.count,4);
 assert.equal(result.rare,2);
 assert.equal(result.items,2);
 assert.equal(result.duplicates,1);
 assert.equal(result.gold,47);
 assert.equal(result.focus,results[0]);
 assert.equal(JSON.stringify(results),before,'Presentation must not mutate signed rewards');
});

test('F3.9 history is newest-first, capped, and deduplicated from account receipts',()=>{
 const data={batchReceipts:{old:{at:10,results:[
  {spinId:'1',itemId:'a'},{spinId:'2',itemId:'b'}]},
  fresh:{at:20,results:[{spinId:'3',itemId:'c'},
   {spinId:'4',itemId:'d'},{spinId:'2',itemId:'b'}]}},
 history:[{id:'5',itemId:'e',duplicate:true,returned:6}]};
 assert.deepEqual(wheel.recent(data).map(entry=>entry.spinId),['2','4','3','1','5']);
 assert.deepEqual(wheel.recent(data,3).map(entry=>entry.spinId),['2','4','3']);
 assert.deepEqual(wheel.recent(data,0),[]);
 assert.equal(wheel.recent({batchReceipts:{many:{at:1,results:
  Array.from({length:40},(_,i)=>({spinId:`s${i}`}))}}}).length,20);
});

test('F3.9 links wheel/receipt helper before UI and renders shared museum shelf',()=>{
 const html=read('index.html'),ui=read('js/dudu-fun-ui-v43.js');
 const museum=read('js/museum-vault-c426.js'),css=read('css/dudu-fun-v43.css');
 assert.ok(html.indexOf('js/fun-wheel-f39.js?v=f39-1')<
  html.indexOf('js/dudu-fun-ui-v43.js?v=f39-1'));
 assert.match(ui,/vvBridge\(\)\.runBatch\(pending\)/);
 assert.match(ui,/await landVisualSpin\(wheelUI\(\)\?\.featured\?\.\(result\.results\)/);
 assert.match(ui,/wheelUI\(\)\?\.recent\?\.\(vvState,20\)/);
 assert.match(ui,/f39-vantvat-celebration/);
 assert.match(css,/@keyframes f39-wheel-run/);
 assert.match(css,/@keyframes f39-wheel-settle/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(museum,/\['S','SS','SSS'\]\.includes\(item\.rank\)/);
 assert.match(museum,/owned\.append\(el\('section','museum-c426-vanbao'\)\)/);
 assert.match(museum,/owned\.append\(el\('section','museum-c426-vantvat'\)\)/);
 assert.doesNotMatch(museum,/\['gallery','display','preview','owned','vantvat','memories'\]/);
});
