'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const spin=require('../js/personal-vantvat-f31.js');
const favorite=require('../js/personal-vantvat-f33.js');
const spark=require('../js/personal-spark-items-v1.js');
const copy=x=>structuredClone(x);
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(){
 const profiles=new Map([['du',{currency:100,inventory:[],storyStates:{}}],
  ['other',{currency:100,inventory:[],storyStates:{}}]]);
 const auth={currentUser:{uid:'du'}};
 let writes=0;
 const db={collection(){return{doc(uid){return{uid,get:async()=>({exists:true,data:()=>copy(profiles.get(uid))})};}};},
  async runTransaction(fn){
   const patches=[];
   const tx={get:async ref=>({exists:true,data:()=>copy(profiles.get(ref.uid))}),
    update:(ref,patch)=>patches.push([ref.uid,copy(patch)])};
   const res=await fn(tx);
   for(const [uid,patch] of patches){Object.assign(profiles.get(uid),patch);writes++;}
   return res;
  }};
 return {profiles,auth,db,get writes(){return writes;}};
}
test('F3.3 lock prevents a sale in the same profile transaction; unlock restores it',async()=>{
 const h=fixture();
 await spin.run({db:h.db,auth:h.auth,uid:'du',kind:'start',id:id(1),roll:0});
 const won=await spin.run({db:h.db,auth:h.auth,uid:'du',kind:'claim',id:id(1)});
 const item=won.reward;
 assert.equal((await favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'lock',
  instanceId:item.instanceId})).status,'applied');
 assert.equal(favorite.locked(h.profiles.get('du').storyStates,item.instanceId),true);
 const count=h.writes;
 assert.equal((await favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'lock',
  instanceId:item.instanceId})).status,'already-applied');
 assert.equal(h.writes,count);
 await assert.rejects(spark.run({db:h.db,auth:h.auth,uid:'du',kind:'sell',
  requestId:'sell-'+id(2),itemId:item.id,instanceId:item.instanceId}),/đang khóa/);
 assert.equal(h.profiles.get('du').currency,75);
 assert.equal(h.profiles.get('du').inventory.length,1);
 await favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'unlock',instanceId:item.instanceId});
 const sale=await spark.run({db:h.db,auth:h.auth,uid:'du',kind:'sell',
  requestId:'sell-'+id(3),itemId:item.id,instanceId:item.instanceId});
 assert.equal(sale.balance,79);
 assert.equal(sale.inventory.length,0);
 assert.equal(h.profiles.get('other').currency,100);
});
test('F3.3 album survives resale and repeated wins without duplicate discoveries',async()=>{
 const h=fixture();
 for(const n of [5,6]){
  await spin.run({db:h.db,auth:h.auth,uid:'du',kind:'start',id:id(n),roll:0});
  await spin.run({db:h.db,auth:h.auth,uid:'du',kind:'claim',id:id(n)});
 }
 const state=h.profiles.get('du').storyStates[spin.META];
 assert.equal(state.album.length,1);
 assert.equal(state.history.length,2);
 assert.equal(spin.norm(state).album.length,1);
});
test('F3.3 locks refuse foreign or fabricated items',async()=>{
 const h=fixture();
 await assert.rejects(favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'lock',
  instanceId:'fun-vantvat-'+id(99)}),e=>e.reason==='not-owned');
 h.auth.currentUser={uid:'other'};
 await assert.rejects(favorite.run({db:h.db,auth:h.auth,uid:'du',kind:'lock',
  instanceId:'fun-vantvat-'+id(99)}),e=>e.reason==='invalid-request');
});
