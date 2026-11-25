const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../js/personal-reading-reward-p2b.js');
const base=Date.UTC(2026,10,25,1,0,0);
const policy={id:'fixture-not-approved',expPerMinute:2,dailyMaxMinutes:120};
const data=()=>({currency:100,exp:99,level:1,inventory:[{id:'keep'}],storyStates:{book:{chapter:2}},readRewards:{old:true}});
const slots=(n,offset=0)=>Array.from({length:n},(_,i)=>base+(i+offset)*10000);
const plan=(d,s,p=policy,nowMs=base+3600000)=>engine.plan({data:d,policy:p,slots:s,nowMs});
test('explicit fixture policy and partial units preserve EXP, level, existing data and level-up Xu',()=>{
 const d=data();const first=plan(d,slots(3));assert.equal(first.awardExp,0);assert.equal(first.exp,99);
 const next=plan({...d,...first},slots(3,3));assert.equal(next.awardExp,2);
 assert.equal(next.level,2);assert.equal(next.exp,1);assert.equal(next.currency,130);
 assert.deepEqual(next.storyStates.book,{chapter:2});assert.equal(next.storyStates[engine.META].lifetimeObservedMs,60000);
});
test('overlap from tabs/devices and replay of old slots cannot mint duplicate EXP',()=>{
 const d=data(),first=plan(d,slots(6)),retry=plan({...d,...first},slots(6));
 assert.equal(retry.status,'already-credited');assert.equal(retry.awardExp,0);
 const next=plan({...d,...first},slots(6,3));assert.equal(next.newSlots,3);assert.equal(next.awardExp,0);
 assert.equal(next.storyStates[engine.META].lifetimeObservedMs,90000);
});
test('bounded daily bitmap, daily cap, old/future/misaligned windows and policy mismatch',()=>{
 const d=data(),p={...policy,dailyMaxMinutes:1},first=plan(d,slots(12),p);
 assert.equal(first.newSlots,6);assert.equal(first.awardExp,2);
 assert.equal(first.storyStates[engine.META].days['2026-11-25'].bits.length,2160);
 assert.throws(()=>plan(d,slots(1),null),/explicit-policy/);
 assert.throws(()=>plan(d,[base+1]),/invalid-reading-window/);
 assert.throws(()=>plan(d,[base+3600000]),/invalid-reading-window/);
 assert.throws(()=>plan(d,[base-86400000]),/invalid-reading-window/);
 assert.throws(()=>plan({...d,...first},slots(1),policy),/policy-migration/);
});
test('transaction retry/failure and account mismatch preserve prior profile fields',async()=>{
 let state=data(),writes=0,fail=false,queue=Promise.resolve();
 const auth={currentUser:{uid:'a'}};
 const db={collection:name=>{assert.equal(name,'profiles_v2');return {doc:id=>id};},runTransaction(fn){
  const task=queue.then(async()=>{let patch;const r=await fn({get:async id=>({exists:id==='a',data:()=>state}),
   update:(id,x)=>{assert.equal(id,'a');patch=x;}});
   if(fail)throw Error('network');if(patch){state={...state,...patch};writes++;}return r;});
  queue=task.catch(()=>{});return task;
 }};
 const buy=(s,uid='a')=>engine.run({db,auth,uid,policy,slots:s,now:()=>base+3600000});
 const [a,b]=await Promise.all([buy(slots(6)),buy(slots(6))]);assert.equal(a.status,'applied');assert.equal(b.status,'already-credited');
 assert.equal(writes,1);assert.equal(state.exp,1);assert.deepEqual(state.inventory,[{id:'keep'}]);assert.deepEqual(state.readRewards,{old:true});
 fail=true;await assert.rejects(buy(slots(6,6)),/network/);assert.equal(writes,1);
 await assert.rejects(buy(slots(6),'b'),/invalid-account/);
});
