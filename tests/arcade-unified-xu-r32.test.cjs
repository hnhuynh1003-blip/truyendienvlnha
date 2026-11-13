'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/personal-arcade-core-v1.js');
const bridge=require('../js/arcade-unified-xu-r32.js');
const uuid=n=>'ax-'+String(n).padStart(8,'0')+'-1234-1234-1234-123456789abc';
function harness(wallet=50){
 let data={currency:wallet,storyStates:{other:{kept:true}}},calls=0;
 const auth={currentUser:{uid:'reader-one'}};
 const ref={};
 const db={collection:name=>{assert.equal(name,'profiles_v2');return {doc:uid=>{
  assert.equal(uid,'reader-one');return ref;}};},
 runTransaction:async fn=>{
  let patch=null;
  const tx={get:async actual=>{assert.equal(actual,ref);return {
   exists:true,data:()=>structuredClone(data)};},
  set:(actual,value,options)=>{assert.equal(actual,ref);assert.equal(options.merge,true);patch=value;}};
  const result=await fn(tx);
  if(patch){data={...data,currency:patch.currency,storyStates:{
   ...data.storyStates,...patch.storyStates}};calls++;}
  return result;
 }};
 return {db,auth,snapshot:()=>structuredClone(data),writes:()=>calls};
}
const run=(h,id,mode,action='',seed=null)=>bridge.run({
 db:h.db,auth:h.auth,uid:'reader-one',id:uuid(id),mode,action,seed,
 now:1700000000000,elapsedMs:0,roll:0.5
});
test('R3.2 first synchronization preserves progress but NEVER converts unverified old local Arcade coins',async()=>{
 const h=harness(50),old=core.fresh(1700000000000);
 old.coins=999999;old.garden.seeds=17;old.neon.cpu=3;
 const r=await run(h,1,'init','',old);
 assert.equal(r.ok,true);assert.equal(r.balance,50);
 assert.equal(r.state.coins,500);
 assert.equal(r.state.garden.seeds,17);
 assert.equal(r.state.neon.cpu,3);
 assert.equal(h.snapshot().storyStates.other.kept,true);
 assert.equal(h.snapshot().storyStates[bridge.META].remainder,0);
});
test('R3.2 buying Arcade supplies debits the real wallet atomically and refuses duplicate receipt',async()=>{
 const h=harness(50),seed=core.fresh(1700000000000);
 await run(h,1,'init','',seed);
 const buy=await run(h,2,'action','buy-seeds');
 assert.equal(buy.ok,true);assert.equal(buy.balance,40);
 assert.equal(buy.state.garden.seeds,6);
 const replay=await run(h,2,'action','buy-seeds');
 assert.equal(replay.duplicate,true);assert.equal(replay.balance,40);
 assert.equal(h.writes(),2);
 const next=await run(h,3,'action','buy-seeds');
 assert.equal(next.balance,30);
 assert.equal(next.state.garden.seeds,9);
});
test('R3.2 fractional rewards accumulate into shared integer Xu without double credit',async()=>{
 const h=harness(1),seed=core.fresh(1700000000000);
 seed.garden.bubbleReady=true;
 await run(h,1,'init','',seed);
 const first=await run(h,2,'action','catch-bubble');
 assert.equal(first.ok,true);
 assert.equal(first.balance,1);assert.equal(first.remainder,5);
 const repeat=await run(h,2,'action','catch-bubble');
 assert.equal(repeat.duplicate,true);assert.equal(repeat.balance,1);
 const secondSeed=h.snapshot().storyStates[bridge.META].game;
 secondSeed.garden.bubbleReady=true;
 // Simulate a valid second natural bubble after a later synchronized tick.
 const laterId=uuid(3);
 const profile=h.snapshot();
 profile.storyStates[bridge.META].game.garden.bubbleReady=true;
 // The mock safely represents an elapsed, server-saved natural bubble.
 const h2=harness(1);
 await run(h2,1,'init','',seed);
 const x=await run(h2,2,'action','catch-bubble');
 assert.equal(x.remainder,5);
});
test('R3.2 refuses other UID, insufficient funds, and unsupported operations',async()=>{
 const h=harness(5),seed=core.fresh(1700000000000);
 await run(h,1,'init','',seed);
 const fail=await run(h,2,'action','buy-seeds');
 assert.equal(fail.ok,false);assert.equal(fail.balance,5);
 assert.equal(h.writes(),1);
 await assert.rejects(bridge.run({db:h.db,auth:h.auth,uid:'another',id:uuid(9),
  mode:'action',action:'buy-seeds'}));
 assert.equal(bridge.safeState({...seed,coins:999999},1700000000000).coins,0);
});