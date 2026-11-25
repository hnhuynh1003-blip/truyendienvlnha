const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {queue}=require('../js/personal-reading-slots-p2c.js');
const reward=require('../js/personal-reading-reward-p2b.js');
const policy=require('../js/personal-reading-policy-p2c.js').policy;
const base=Date.UTC(2026,10,25),slots=Array.from({length:6},(_,i)=>base+i*10000);
function storage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};}
function setup(s=storage(),options={}){const q=queue({storage:s,now:()=>base+60000,...options});q.bind('a');return q;}
test('refresh/crash before submit, during submit and before ACK restores exact candidates',()=>{
 for(const phase of ['before-submit','during-submit','before-ack']){
  const s=storage(),q=setup(s);q.push('a',slots);
  if(phase!=='before-submit')q.begin('a');
  const restored=setup(s);assert.deepEqual(restored.begin('a').slots,slots);
 }
});
test('lost ACK after remote commit replays through authoritative bitmap without extra reward',()=>{
 const s=storage(),q=setup(s);q.push('a',slots);const t=q.begin('a');
 const data={exp:0,level:1,currency:8,inventory:[{id:'keep'}],storyStates:{book:{chapter:7}}};
 const committed=reward.plan({data,policy,slots:t.slots,nowMs:base+60000});
 const restored=setup(s),retry=restored.begin('a');
 const result=reward.plan({data:{...data,...committed},policy,slots:retry.slots,nowMs:base+60000});
 assert.equal(result.status,'already-credited');assert.equal(result.awardExp,0);
 restored.settle(retry,result);assert.equal(restored.size(),0);
 assert.deepEqual(committed.storyStates.book,{chapter:7});assert.equal(committed.currency,8);
});
test('logout and A to B to A preserve A; stale or unconfirmed tickets cannot ACK',()=>{
 const s=storage(),q=setup(s);q.push('a',slots);const t=q.begin('a');
 q.bind(null);assert.equal(q.begin('a'),null);q.bind('b');assert.equal(q.size(),0);
 assert.equal(q.settle(t,{status:'applied'}),false);q.bind('a');assert.equal(q.size(),6);
 for(const result of [true,undefined,{status:'unknown'},null]){const ticket=q.begin('a');q.settle(ticket,result);assert.equal(q.size(),6);}
 const other=queue({storage:s,policyId:'new-policy',now:()=>base+60000});other.bind('a');assert.equal(other.size(),0);
});
test('two tabs union independent inserts and ACK never removes another slot',()=>{
 const s=storage(),a=setup(s),b=setup(s);a.push('a',slots.slice(0,3));b.push('a',slots.slice(3));
 const t=a.begin('a');assert.deepEqual(t.slots,slots);
 b.push('a',[base-10000]);a.settle(t,{status:'applied'});
 assert.equal(b.size(),1);assert.deepEqual(b.begin('a',{force:true}).slots,[base-10000]);
});
test('expiry, corruption, overflow and storage failures are explicit; rollback does not revive expiry',()=>{
 let at=base+60000;const s=storage(),q=setup(s,{now:()=>at,capacity:2});
 assert.equal(q.push('a',slots),false);assert.equal(q.size(),2);assert.ok(q.status().issues.includes('overflow'));
 s.setItem('dudu:reading:pending:v1:personal-reading-v1:a:bad','garbage');q.sync();assert.ok(q.status().issues.includes('corruption'));
 at+=86400001;q.sync();assert.equal(q.size(),0);assert.ok(q.status().issues.includes('expiry'));
 at=base+60000;q.sync();assert.ok(q.status().issues.includes('clock-rollback'));assert.equal(q.size(),0);
 const broken={get length(){throw Error('blocked');},setItem(){throw Error('quota');}};
 const fallback=setup(broken);assert.equal(fallback.push('a',slots),false);assert.equal(fallback.size(),6);
 assert.equal(fallback.status().durable,false);assert.ok(fallback.status().issues.includes('persistence-failure'));
});
function runtime(){
 const s=storage();setup(s).push('a',slots);
 let uid='a',mono=0,calls=0,fail=true,release;
 const events={},timers=[];
 const window={localStorage:s,DuduPersonalReadingSlotsP2C:require('../js/personal-reading-slots-p2c.js'),
  DuduPersonalReadingClockP2A:{create:()=>({snapshot:()=>({}),close(){},pause(){}})},
  DuduPersonalReadingPolicyP2C:{policy},DuduAuth:{uid:()=>uid},
  DuduReadingRewardBridgeP2C:{ready:u=>u===uid,submit:async()=>{calls++;if(fail)throw Error('offline');if(release)await new Promise(r=>release=r);return {status:'applied',awardExp:2};}},
  addEventListener:(e,f)=>(events[e]??=[]).push(f),dispatchEvent(){}};
 const context={window,document:{getElementById:()=>null,addEventListener(){}},navigator:{onLine:true},
  performance:{now:()=>mono},Date:class extends Date{static now(){return base+60000;}},
  setInterval:f=>{timers.push(f);return timers.length;},clearInterval(){},CustomEvent:class{},Event:class{}};
 // Queue defaults to its own realm clock, so inject the fixture clock explicitly.
 window.DuduPersonalReadingSlotsP2C={queue:opts=>queue({...opts,storage:s,now:()=>base+60000}),create:()=>({reset(){}})};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/personal-reading-runtime-p2a.js'),'utf8'),context);
 return {window,events,timers,setUid:u=>uid=u,setMono:m=>mono=m,setOnline:v=>context.navigator.onLine=v,setLocks:v=>context.navigator.locks=v,succeed:()=>fail=false,calls:()=>calls,
  hold:()=>{release=true;},release:()=>release(),size:()=>setup(s).size()};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('failed submit retries online after Reader stops; bounded backoff and single flight',async()=>{
 const r=runtime();r.timers[0]();await tick();assert.equal(r.calls(),1);assert.equal(r.size(),6);
 r.window.DuduPersonalReadingRuntimeP2A.stop();r.timers[0]();await tick();assert.equal(r.calls(),1);
 r.setMono(5000);r.succeed();r.hold();r.events.online[0]();await tick();r.timers[0]();await tick();assert.equal(r.calls(),2);
 r.release();await tick();assert.equal(r.size(),0);
});
test('account changes during submission preserve pending and same-account login restores outside Reader',async()=>{
 const r=runtime();r.succeed();r.hold();r.timers[0]();await tick();r.setUid('b');
 r.events['dudu-auth-state-changed'][0]();r.release();await tick();assert.equal(r.size(),6);
 r.setUid(null);r.timers[0]();await tick();assert.equal(r.calls(),1);
 r.setUid('a');r.events['dudu-auth-state-changed'][0]();await tick();r.release();await tick();assert.equal(r.size(),0);
});

test('retry delay doubles to five-minute ceiling; offline submission is suspended',async()=>{
 const r=runtime();r.setOnline(false);r.timers[0]();await tick();assert.equal(r.calls(),0);
 r.setOnline(true);let mono=0;
 for(let n=0;n<8;n++){
  r.setMono(mono);r.timers[0]();await tick();assert.equal(r.calls(),n+1);
  const delay=Math.min(300000,5000*2**n);
  r.setMono(mono+delay-1);r.timers[0]();await tick();assert.equal(r.calls(),n+1);
  mono+=delay;
 }
});
test('Web Locks rejection falls back to per-tab single flight',async()=>{
 const r=runtime();r.succeed();r.setLocks({request:async()=>{throw Error('unavailable');}});
 r.events.online[0]();await tick();assert.equal(r.calls(),1);assert.equal(r.size(),0);
});
test('failed ACK deletion retains durable record for safe replay; expiry survives refresh',()=>{
 const s=storage(),q=setup(s);q.push('a',slots);const t=q.begin('a');
 s.removeItem=()=>{throw Error('blocked');};q.settle(t,{status:'applied'});
 assert.ok(q.status().issues.includes('persistence-failure'));assert.equal(setup(s).size(),6);
 const expired=setup(s,{now:()=>base+86460001});assert.equal(expired.size(),0);
 assert.ok(expired.status().issues.includes('expiry'));
});
