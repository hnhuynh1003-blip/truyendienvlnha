'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const spin=require('../js/personal-vantvat-f31.js');
const rule=require('../js/fun-vantvat-f31.js');
const favorite=require('../js/personal-vantvat-f33.js');
const quick=require('../js/personal-bulk-sale-f34.js');
const catalog=require('../js/item-catalog-v2.js');
const copy=structuredClone;
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(){
 const accounts=new Map([['du',{currency:100,inventory:[],storyStates:{}}],
  ['other',{currency:100,inventory:[],storyStates:{}}]]);
 const auth={currentUser:{uid:'du'}};
 let writes=0;
 const db={collection(){return{doc(uid){return{uid};}};},async runTransaction(work){
  const updates=[];
  const tx={get:async ref=>({exists:true,data:()=>copy(accounts.get(ref.uid))}),
   update:(ref,patch)=>updates.push([ref.uid,copy(patch)])};
  const result=await work(tx);
  for(const [uid,patch] of updates){Object.assign(accounts.get(uid),patch);writes++;}
  return result;
 }};
 return {db,auth,accounts,get writes(){return writes;}};
}
function rollFor(id){let n=0;for(const row of rule.POOL){
 if(row.itemId===id)return n;
 n+=row.weight;
}throw Error('missing prize '+id);}
async function win(h,id,n){
 await spin.run({db:h.db,auth:h.auth,uid:'du',kind:'start',id:uuid(n),roll:rollFor(id)});
 return (await spin.run({db:h.db,auth:h.auth,uid:'du',kind:'claim',id:uuid(n)})).reward;
}
test('F3.4 previews rank F/E/D and excludes locked, consumable or unsellable items',async()=>{
 const h=fixture();
 const a=await win(h,'f31-fossil-shell',1),b=await win(h,'f31-apple-moon',2);
 const before=quick.candidates(h.accounts.get('du').inventory,h.accounts.get('du').storyStates);
 assert.equal(before.length,2);
 await favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'lock',instanceId:a.instanceId});
 const after=quick.candidates(h.accounts.get('du').inventory,h.accounts.get('du').storyStates);
 assert.deepEqual(after.map(x=>x.instanceId),[b.instanceId]);
 assert.deepEqual(quick.candidates(h.accounts.get('du').inventory,
  h.accounts.get('du').storyStates,['D']),[]);
});
test('F3.4 sells multiple physical instances in one receipt; retry never credits twice',async()=>{
 const h=fixture();
 const first=await win(h,'f31-fossil-shell',10),second=await win(h,'f31-apple-moon',11);
 const ids=[first.instanceId,second.instanceId],balance=h.accounts.get('du').currency;
 const requestId='sell-'+uuid(12);
 const sale=await quick.run({db:h.db,auth:h.auth,uid:'du',requestId,instanceIds:ids});
 assert.equal(sale.status,'applied');assert.equal(sale.count,2);
 assert.equal(sale.price,8);assert.equal(sale.balance,balance+8);
 assert.equal(sale.inventory.length,0);
 const writes=h.writes;
 const again=await quick.run({db:h.db,auth:h.auth,uid:'du',requestId,instanceIds:ids});
 assert.equal(again.status,'already-applied');assert.equal(again.balance,balance+8);
 assert.equal(h.writes,writes);
 const receipt=h.accounts.get('du').storyStates.__duduPersonalItemsV1.receipts[requestId];
 assert.deepEqual(receipt.instanceIds,ids);assert.equal(receipt.price,8);
 assert.equal(h.accounts.get('other').currency,100);
});
test('F3.4 blocks locked, stale, forged or reused batches with no partial payout',async()=>{
 const h=fixture();
 const first=await win(h,'f31-fossil-shell',21),second=await win(h,'f31-apple-moon',22);
 await favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'lock',instanceId:second.instanceId});
 const before=h.accounts.get('du').currency,writes=h.writes;
 await assert.rejects(quick.run({db:h.db,auth:h.auth,uid:'du',requestId:'sell-'+uuid(23),
  instanceIds:[first.instanceId,second.instanceId]}),/khóa/);
 assert.equal(h.writes,writes);assert.equal(h.accounts.get('du').currency,before);
 await assert.rejects(quick.run({db:h.db,auth:h.auth,uid:'du',requestId:'sell-'+uuid(24),
  instanceIds:[first.instanceId,first.instanceId]}),/không hợp lệ/);
 await assert.rejects(quick.run({db:h.db,auth:h.auth,uid:'du',requestId:'sell-'+uuid(25),
  instanceIds:[first.instanceId,'invented']}),/khóa|đổi/);
 const one=await quick.run({db:h.db,auth:h.auth,uid:'du',requestId:'sell-'+uuid(26),
  instanceIds:[first.instanceId]});
 assert.equal(one.count,1);
 await assert.rejects(quick.run({db:h.db,auth:h.auth,uid:'du',requestId:'sell-'+uuid(26),
  instanceIds:[second.instanceId]}),/Mã giao dịch/);
});
test('F3.4 adds three illustrated Origin statues without increasing rarity budgets',()=>{
 assert.equal(catalog.funVantVat.length,66);
 for(const id of ['f34-origin-dawn-goddess','f34-origin-moon-fairy',
  'f34-origin-star-priestess']){
  assert.equal(catalog.byId(id).funRealm,'ORIGIN');
  assert.ok(rule.POOL.some(row=>row.itemId===id&&row.weight>0));
 }
 const budgets={};
 for(const row of rule.POOL)budgets[row.rank]=(budgets[row.rank]||0)+row.weight;
 assert.deepEqual(budgets,{E:400000,D:280000,C:170000,B:80000,
  A:36000,S:14000,SS:3000,SSS:200,COIN:92000});
 assert.equal(rule.PRICE,25); // F3.5 changes Vạn Tượng but not Vạn Bảo.
});
