'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../js/personal-vantvat-f31.js');
const rule=require('../js/fun-vantvat-f31.js');
const spark=require('../js/personal-spark-items-v1.js');
const quick=require('../js/personal-bulk-sale-f34.js');
const copy=structuredClone;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(currency=10000){
 const accounts=new Map([['du',{currency,inventory:[],storyStates:{}}],
  ['other',{currency,inventory:[],storyStates:{}}]]);
 const auth={currentUser:{uid:'du'}};let writes=0;
 const db={collection(){return{doc(uid){return{uid,get:async()=>({exists:true,
  data:()=>copy(accounts.get(uid))})};}};},async runTransaction(work){
  const updates=[];const tx={get:async ref=>({exists:true,
   data:()=>copy(accounts.get(ref.uid))}),
   update:(ref,patch)=>updates.push([ref.uid,copy(patch)])};
  const result=await work(tx);
  for(const [uid,patch] of updates){Object.assign(accounts.get(uid),patch);writes++;}
  return result;
 }};
 const batch=(n,count=10,rolls=Array(count).fill(0))=>({db,auth,uid:'du',
  id:id(n),count,rolls,guaranteeRolls:Array(count).fill(0),
  spinIds:Array.from({length:count},(_,i)=>id(n*100+i+1))});
 return {db,auth,accounts,batch,get writes(){return writes;}};
}
test('F3.6 ten ×10 spins guarantee a physical A+ by the hundredth draw',async()=>{
 const f=fixture();let last;
 for(let n=1;n<=10;n++)last=await engine.runBatch(f.batch(n));
 const state=last.state;
 assert.equal(state.totalSpins,100);
 assert.equal(state.pity,0);
 assert.equal(last.results.filter(x=>x.pityTriggered).length,1);
 const guarantee=last.results.find(x=>x.pityTriggered);
 assert.ok(rule.HIGH_RANKS.includes(guarantee.rank));
 assert.equal(guarantee.kind,'ITEM','pity selects a high item, not coin');
 assert.equal(f.accounts.get('du').inventory.length,2,'low duplicate and high item each use one physical slot');
 assert.equal(f.accounts.get('other').inventory.length,0);
});
test('F3.6 x5 batch is one atomic receipt; retry, even after sale, pays nothing',async()=>{
 const f=fixture(500),params=f.batch(44,5);
 const first=await engine.runBatch(params);
 assert.equal(first.status,'applied');
 assert.equal(first.cost,125);
 assert.equal(first.state.totalSpins,5);
 assert.equal(first.results.length,5);
 assert.equal(first.results[0].kind,'ITEM');
 assert.equal(first.results.slice(1).every(x=>x.kind==='DUPLICATE'),true);
 assert.equal(first.currency,500-125+4*4);
 const item=first.inventory[0];
 assert.equal(spark.sellPrice(item),4);
 assert.equal(quick.candidates(first.inventory,first.storyStates).length,1);
 const written=f.writes;
 const same=await engine.runBatch(params);
 assert.equal(same.status,'already-applied');
 assert.equal(same.currency,first.currency);
 assert.deepEqual(same.results,first.results);
 assert.equal(f.writes,written);
 await assert.rejects(engine.runBatch({...params,rolls:[1,0,0,0,0]}),
  e=>e.reason==='batch-id-reused');
 assert.equal(f.writes,written);
 const sale=await spark.run({db:f.db,auth:f.auth,uid:'du',kind:'sell',
  requestId:'sell-'+id(999),itemId:item.id,instanceId:item.instanceId});
 const afterSale=f.writes;
 const lateReplay=await engine.runBatch(params);
 assert.equal(lateReplay.status,'already-applied');
 assert.equal(lateReplay.currency,sale.balance);
 assert.equal(lateReplay.inventory.length,0);
 assert.equal(f.writes,afterSale);
});
test('F3.6 pity at 99 guarantees unowned A+ and resets; low roll cannot bypass',async()=>{
 const f=fixture(1000);
 f.accounts.get('du').storyStates[engine.META]={pity:99,totalSpins:99};
 const result=await engine.runBatch(f.batch(50,1));
 assert.equal(result.results[0].pityTriggered,true);
 assert.ok(rule.HIGH_RANKS.includes(result.results[0].rank));
 assert.equal(result.state.pity,0);
 assert.equal(result.state.totalSpins,100);
 const rare=rule.guaranteed(0);
 assert.ok(rule.HIGH_RANKS.includes(rare.rank));
 assert.notEqual(rule.guaranteed(0,[rare.itemId]).itemId,rare.itemId,
  'a guaranteed draw prefers a high collectible not yet held');
});
test('F3.6 rejects insufficient Xu and full inventory without any partial write',async()=>{
 const f=fixture(124);
 await assert.rejects(engine.runBatch(f.batch(60,5)),e=>e.reason==='not-enough-xu');
 assert.equal(f.writes,0);
 assert.equal(f.accounts.get('du').currency,124);
 assert.equal(f.accounts.get('du').inventory.length,0);
 const malformed=f.batch(61,5);
 malformed.spinIds[1]=malformed.spinIds[0];
 await assert.rejects(engine.runBatch(malformed),e=>e.reason==='invalid-batch');
 assert.equal(f.writes,0);
 const full=fixture(1000);
 full.accounts.get('du').inventory=Array.from({length:500},(_,i)=>
  ({id:'placeholder-'+i,instanceId:'legacy-'+i}));
 await assert.rejects(engine.runBatch(full.batch(62,1)),e=>e.reason==='inventory-full');
 assert.equal(full.writes,0);
 assert.equal(full.accounts.get('du').currency,1000);
});
test('F3.6 a legacy sealed prize must be claimed first; no discount on x10',async()=>{
 const f=fixture(1000);
 await engine.run({db:f.db,auth:f.auth,uid:'du',kind:'start',id:id(70),roll:0});
 await assert.rejects(engine.runBatch(f.batch(71)),e=>e.reason==='unfinished-spin');
 await engine.run({db:f.db,auth:f.auth,uid:'du',kind:'claim',id:id(70)});
 assert.equal(f.accounts.get('du').storyStates[engine.META].pity,1);
 const bought=await engine.runBatch(f.batch(72,1));
 assert.equal(bought.cost,rule.PRICE);
 assert.equal(bought.state.pity,2);
});
