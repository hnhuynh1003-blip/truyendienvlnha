'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../js/personal-vantvat-f31.js');
const prices=require('../js/fun-vantvat-f31.js');
const market=require('../js/personal-spark-items-v1.js');
const box=require('../js/personal-blind-box-c29.js');
const catalog=require('../js/item-catalog-v2.js');
const copy=x=>structuredClone(x);
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function env(){
 const accounts=new Map([['a',{currency:100,inventory:[],storyStates:{}}],
  ['b',{currency:100,inventory:[],storyStates:{}}]]);
 const auth={currentUser:{uid:'a'}};
 let writes=0;
 const db={collection(){return{doc(uid){return{uid,get:async()=>({exists:true,data:()=>copy(accounts.get(uid))})};}};},
  async runTransaction(fn){const changes=[];
   const tx={get:async ref=>({exists:true,data:()=>copy(accounts.get(ref.uid))}),
    update:(ref,patch)=>changes.push([ref.uid,copy(patch)])};
   const result=await fn(tx);
   for(const [uid,patch] of changes){Object.assign(accounts.get(uid),patch);writes++;}
   return result;
  }};
 return {accounts,auth,db,get writes(){return writes;},
  spin:(kind,n,opts={})=>engine.run({db,auth,uid:auth.currentUser.uid,kind,id:id(n),...opts}),
  sell:(item,n)=>market.run({db,auth,uid:auth.currentUser.uid,kind:'sell',
   requestId:'sell-'+id(n),itemId:item.id,instanceId:item.instanceId})};
}
test('F3.1 starts once, claims once, sells exactly one actual item',async()=>{
 const e=env(),before=e.accounts.get('a');
 const start=await e.spin('start',1,{roll:0});
 assert.equal(start.currency,85);
 assert.equal((await e.spin('start',1,{roll:0})).status,'already-applied');
 const claimed=await e.spin('claim',1);
 assert.equal(claimed.inventory.length,1);
 assert.equal(claimed.inventory[0].id,prices.POOL[0].itemId);
 assert.equal(prices.valueOf(claimed.inventory[0]),3);
 const count=e.writes;
 assert.equal((await e.spin('claim',1)).status,'already-applied');
 assert.equal(e.writes,count);
 const item=claimed.inventory[0];
 const sold=await e.sell(item,2);
 assert.equal(sold.balance,88);
 assert.equal(sold.inventory.length,0);
 assert.equal((await e.sell(item,2)).status,'already-applied');
 assert.equal(e.accounts.get('a').currency,88);
 await assert.rejects(e.sell(item,3));
});
test('F3.1 resale rejects forged source and never touches another UID',async()=>{
 const e=env();
 await e.spin('start',4,{roll:prices.TOTAL-921});
 const reward=(await e.spin('claim',4)).reward;
 assert.equal(prices.valueOf(reward),900);
 assert.equal(prices.valueOf({...reward,obtainedFrom:{kind:'EVENT',source:'FAKE',eventId:id(4)}}),0);
 assert.equal(e.accounts.get('b').currency,100);
 assert.equal(e.accounts.get('b').inventory.length,0);
});
test('F3.1 coin reward is credited once on claim, not again on retry',async()=>{
 const e=env(),coinRoll=prices.TOTAL-1;
 assert.equal((await e.spin('start',7,{roll:coinRoll})).currency,85);
 const first=await e.spin('claim',7);
 assert.equal(first.reward.kind,'COIN');
 assert.equal(first.currency,115);
 assert.equal(first.inventory.length,0);
 assert.equal((await e.spin('claim',7)).status,'already-applied');
 assert.equal(e.accounts.get('a').currency,115);
});
test('F3.1 unique prize cannot duplicate in Kho; duplicate is auto-sold once',async()=>{
 const e=env();
 await e.spin('start',8,{roll:0});
 await e.spin('claim',8);
 assert.equal(e.accounts.get('a').inventory.length,1);
 await e.spin('start',9,{roll:0});
 const duplicate=await e.spin('claim',9);
 assert.equal(duplicate.reward.kind,'DUPLICATE');
 assert.equal(duplicate.reward.amount,3);
 assert.equal(duplicate.currency,73);
 assert.equal(duplicate.inventory.length,1);
 assert.equal((await e.spin('claim',9)).status,'already-applied');
 assert.equal(e.accounts.get('a').currency,73);
});
test('Vạn Bảo legacy pool stays 19 items at 20 Xu per paid box',()=>{
 assert.equal(box.POOL.length,19);
 assert.equal(box.PRICE,20);
});
test('F3.2A adds eight three-item realm sets without changing rank probabilities',()=>{
 const fresh=catalog.funVantVat.filter(x=>x.id.startsWith('f32-'));
 assert.equal(fresh.length,24);
 const groups=fresh.reduce((acc,item)=>(acc[item.funRealm]=(acc[item.funRealm]||0)+1,acc),{});
 assert.equal(Object.keys(groups).length,8);
 assert.ok(Object.values(groups).every(n=>n===3));
 assert.equal(prices.TOTAL,10752);
 const expected={E:4000,D:2800,C:1700,B:800,A:360,S:140,SS:30,SSS:2,COIN:920};
 for(const [rank,weight] of Object.entries(expected))
  assert.equal(prices.POOL.filter(x=>x.rank===rank).reduce((n,x)=>n+x.weight,0),weight);
});
