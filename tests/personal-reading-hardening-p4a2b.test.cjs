const {test}=require('node:test'),assert=require('node:assert/strict');
const {BASE,storage,runtime,drain,reading180}=require('./helpers/personal-reading-runtime-p4a2b.cjs');
const {queue}=require('../js/personal-reading-slots-p2c.js');
const reward=require('../js/personal-reading-reward-p2b.js');
const policy=require('../js/personal-reading-policy-p2c.js').policy;
const key=s=>'dudu:reading:pending:v1:personal-reading-v1:a:'+s;
function seed(store,count=6,start=BASE-60000){for(let i=0;i<count;i++)store.setItem(key(start+i*10000),'1');}
test('180 continuous eligible minutes create 180 reward transactions, 1080 slots and no forced per-slot submissions',async()=>{
 let submitted=0,profile={exp:0,level:1,currency:8,inventory:[],storyStates:{}};
 let wall=BASE;
 const r=await reading180({submit:async(uid,slots)=>{
  assert.ok(slots.length>=6);submitted+=slots.length;wall=Math.max(...slots)+10000;
  const result=reward.plan({data:profile,policy,slots,nowMs:wall});profile={...profile,...result};return result;
 }});
 assert.equal(r.calls(),180);assert.equal(submitted,1080);assert.equal(r.quests(),1);
 assert.equal(profile.storyStates[reward.META].lifetimeObservedMs,10800000);
 assert.equal(r.queue().status().pending,0);assert.match(r.node.textContent,/360 EXP/);
});
test('normal partial batch waits; exiting forces partial and refreshing restores partial outside Reader',async()=>{
 const r=runtime();r.start();await drain();
 for(let second=1;second<=30;second++){r.setTime(second*1000);r.tick();await drain();}
 assert.equal(r.calls(),0);assert.equal(r.queue().status().pending,3);
 r.api.stop();await drain();assert.equal(r.calls(),1);assert.equal(r.queue().status().pending,0);
 const store=storage();seed(store,2,BASE-20000);const restored=runtime({store});restored.tick();await drain();
 assert.equal(restored.calls(),1);assert.equal(restored.queue().status().pending,0);
});
test('idle tick uses bounded reconciliation with 10 or 10000 unrelated keys and no unnecessary writes',async()=>{
 for(const unrelated of [10,10000]){
  const store=storage();for(let i=0;i<unrelated;i++)store.setItem('unrelated:'+i,'x');
  const r=runtime({store});r.tick();await drain();store.reset();
  for(let second=1;second<=3600;second++){r.setTime(second*1000);r.tick();}
  await drain();assert.equal(r.calls(),0);assert.equal(store.counts.length,12);
  assert.equal(store.counts.key,12*unrelated);assert.equal(store.counts.set,0);assert.equal(store.counts.remove,0);
 }
});
test('large queue restores all 8640 valid slots and drains in 144 capped batches without silent loss',()=>{
 const store=storage(),at=BASE+86400000;
 seed(store,8640,BASE);const q=queue({storage:store,now:()=>at});q.bind('a');assert.equal(q.status().pending,8640);
 let calls=0,submitted=0;while(q.status().pending){const t=q.begin('a');assert.ok(t);assert.equal(t.slots.length,60);
  calls++;submitted+=t.slots.length;q.settle(t,{status:'already-credited'});}
 assert.equal(calls,144);assert.equal(submitted,8640);assert.equal(store.m.size,0);
});
test('storage events update union and ACK without enumeration; unrelated events do no queue reads',()=>{
 const store=storage(),q=queue({storage:store,now:()=>BASE});q.bind('a');store.reset();
 store.setItem(key(BASE-10000),'1');q.storageEvent({key:key(BASE-10000),storageArea:store});
 assert.equal(q.status().pending,1);store.removeItem(key(BASE-10000));q.storageEvent({key:key(BASE-10000),storageArea:store});
 q.storageEvent({key:'other'});assert.equal(q.status().pending,0);assert.equal(store.counts.key,0);assert.equal(store.counts.get,2);
});
test('Reader status separates committed EXP from pending time and exposes persistence, expiry and overflow',async()=>{
 const store=storage();store.setItem=()=>{throw Error('quota');};
 const r=runtime({store,capacity:1});r.start();await drain();
 for(let second=1;second<=20;second++){r.setTime(second*1000);r.tick();await drain();}
 assert.equal(r.calls(),0);assert.equal(r.node.hidden,false);
 assert.match(r.node.textContent,/0 EXP \u0111\u00e3 x\u00e1c nh\u1eadn/);assert.match(r.node.textContent,/Ch\u1edd \u0111\u1ed3ng b\u1ed9 10s/);
 assert.match(r.node.textContent,/L\u1ed7i l\u01b0u tr\u00ean m\u00e1y/);assert.match(r.node.textContent,/\u0110\u1ea7y h\u00e0ng \u0111\u1ee3i: 1/);
 r.setTime(86430000);r.tick();await drain();assert.match(r.node.textContent,/H\u1ebft h\u1ea1n: 1/);
 assert.equal(r.node.dataset.syncState,'error');
});
test('server high-water rejection isolates old slots, retains them, and allows newer eligible slots',async()=>{
 const store=storage();seed(store,6,BASE-86400000+120000);seed(store,6,BASE-60000);
 let at=BASE;let profile={exp:0,level:1,currency:8,storyStates:{[reward.META]:{policyId:policy.id,expPerMinute:2,dailyMaxMinutes:180,
  lifetimeObservedMs:0,lastNowMs:BASE+240000,days:{}}}};
 const r=runtime({store,submit:async(uid,slots)=>{const result=reward.plan({data:profile,policy,slots,nowMs:at});profile={...profile,...result};return result;}});
 for(let n=0;n<20;n++){r.tick();await drain();}
 assert.equal(r.queue().status().held,6);assert.equal(r.queue().status().pending,6);
 assert.equal(profile.storyStates[reward.META].lifetimeObservedMs,60000);
 assert.ok([...store.m.values()].every(v=>v.startsWith('h:')));
 // Restoring a held record must not ACK or retry it immediately.
 const restored=runtime({store});restored.tick();await drain();assert.equal(restored.calls(),0);
 const before=r.calls();r.start();await drain();
 for(let second=1;second<=59;second++){at=BASE+second*1000;r.setTime(second*1000);r.tick();await drain();}
 assert.equal(r.calls(),before,'retained holds must not force new slots individually');
 at=BASE+60000;r.setTime(60000);r.tick();await drain();assert.equal(r.calls(),before+1);

});
test('permanent account/profile rejection is bounded and retains candidates; reopen cannot bypass backoff',async()=>{
 for(const reason of ['invalid-profile','policy-migration-required','profile-missing','permission-denied','unauthenticated','clock-backwards']){
  const store=storage();seed(store);const r=runtime({store,submit:async()=>{throw Object.assign(Error(reason),{reason});}});
  r.tick();await drain();assert.equal(r.calls(),1);
  r.open();r.api.stop();r.open();r.tick();r.event('online');await drain();assert.equal(r.calls(),1,reason);
  r.setTime(59000);r.tick();await drain();assert.equal(r.calls(),1,reason);assert.equal(r.queue().status().pending,6);
  if(reason==='permission-denied'||reason==='unauthenticated'){r.event('dudu-auth-state-changed');await drain();assert.equal(r.calls(),2);}
 }
});
test('transient uncertain commit survives stop/reopen, same-UID auth notifications and A to B to A backoff',async()=>{
 const store=storage();seed(store);const r=runtime({store,submit:async()=>{throw Error('lost response');}});
 r.tick();await drain();assert.equal(r.calls(),1);
 r.open();r.api.stop();r.open();r.event('dudu-auth-state-changed');r.tick();await drain();assert.equal(r.calls(),1);
 r.setUid('b');r.event('dudu-auth-state-changed');r.setUid('a');r.event('dudu-auth-state-changed');await drain();assert.equal(r.calls(),1);
 r.setTime(5000);r.tick();await drain();assert.equal(r.calls(),2);assert.equal(r.queue().status().pending,6);
});
test('idle unready account with 360 or 8640 candidates reconciles only twelve times per hour',async()=>{
 for(const count of [360,8640]){
  const store=storage();seed(store,count,BASE-count*10000);
  const r=runtime({store,ready:false});r.tick();await drain();store.reset();
  for(let second=1;second<=3600;second++){r.setTime(second*1000);r.tick();}
  await drain();assert.equal(r.calls(),0);assert.equal(store.counts.length,12);
  const reads=count===8640?101700:12*count; // Thirty oldest slots expire per reconciliation in the full-day fixture.
  assert.equal(store.counts.key,reads);assert.equal(store.counts.get,reads);assert.equal(store.counts.set,0);
  assert.equal(r.queue().status().expired,count===8640?360:0);
 }
});

test('A-19: empty stop/pagehide and same-UID reopen preserve six-slot normal batching',async()=>{
 for(const exit of ['stop','pagehide']){
  const r=runtime();r.start();await drain();
  if(exit==='stop')r.api.stop();else r.event('pagehide');
  r.start();await drain();
  for(let second=1;second<=59;second++){r.setTime(second*1000);r.tick();await drain();}
  assert.equal(r.calls(),0,exit);
  r.setTime(60000);r.tick();await drain();assert.equal(r.calls(),1,exit);
 }
});
test('A-19: peer ACK or expiry clears captured recovery without forcing newer slots',async()=>{
 for(const cause of ['ack-event','ack-before-begin','expiry']){
  const store=storage();const old=cause==='expiry'?BASE-86400000+10000:BASE-10000;seed(store,1,old);
  const r=runtime({store,ready:false});r.start();await drain();
  if(cause==='ack-event'){
   store.removeItem(key(old));r.queue().storageEvent({key:key(old),storageArea:store});r.event('online');
  }else if(cause==='ack-before-begin'){
   // No storage notification: begin() must revalidate the captured set after sync.
   store.removeItem(key(old));
  }else{r.setTime(20000);r.queue().maintain();}
  r.setReady(true);
  // Insert a new candidate while the old capture may still exist in cached state.
  r.queue().push('a',[BASE-20000]);r.tick();await drain();assert.equal(r.calls(),0,cause);
  r.queue().sync();assert.equal(r.queue().status().pending,1,cause);
 }
});
test('A-19: genuine failed partial flush retains recovery and backoff after reopening',async()=>{
 let fail=true;const r=runtime({submit:async()=>{if(fail)throw Error('network');return {status:'already-credited'};}});
 r.start();await drain();for(let second=1;second<=10;second++){r.setTime(second*1000);r.tick();await drain();}assert.equal(r.calls(),0);
 r.api.stop();await drain();assert.equal(r.calls(),1);r.open();r.tick();await drain();assert.equal(r.calls(),1);
 fail=false;r.setTime(15000);r.tick();await drain();assert.equal(r.calls(),2);assert.equal(r.queue().status().pending,0);
});
test('A-20: failed probe and hold writes survive stale storage, then persist on recovery',()=>{
 let at=BASE;const store=storage();seed(store,2,BASE-20000);
 const q=queue({storage:store,now:()=>at});q.bind('a');const first=q.begin('a',{force:true});assert.equal(first.slots.length,2);
 const set=store.setItem;store.setItem=()=>{throw Error('quota');};q.rejectWindow(first);
 const probe=q.begin('a',{force:true});assert.equal(probe.slots.length,1);assert.equal(store.getItem(key(probe.slots[0])),'1');
 q.rejectWindow(probe);const next=q.begin('a',{force:true});assert.equal(next.slots.length,1);assert.notEqual(next.slots[0],probe.slots[0]);
 q.settle(next,null);
 store.setItem=set;q.sync();assert.ok(store.getItem(key(probe.slots[0])).startsWith('h:'));
 assert.equal(store.getItem(key(next.slots[0])),'p');assert.equal(q.status().durable,true);
 at+=300000;const retry=q.begin('a',{force:true});assert.equal(retry.slots.length,1);
});
test('A-20: peer ACK wins over volatile metadata; never-persisted candidates remain recoverable',()=>{
 for(const path of ['sync','event']){
  const store=storage();seed(store,2,BASE-20000);const q=queue({storage:store,now:()=>BASE});q.bind('a');
  const t=q.begin('a',{force:true}),set=store.setItem;store.setItem=()=>{throw Error('quota');};q.rejectWindow(t);
  const peer=queue({storage:store,now:()=>BASE});peer.bind('a');const ack=peer.begin('a',{force:true});peer.settle(ack,{status:'already-credited'});
  if(path==='event')for(const slot of t.slots)q.storageEvent({key:key(slot),storageArea:store});else q.sync();
  store.setItem=set;q.sync();assert.equal(q.status().pending,0);assert.equal(store.m.size,0);
 }
 const store=storage(),q=queue({storage:store,now:()=>BASE});q.bind('a');const set=store.setItem;
 store.setItem=()=>{throw Error('quota');};q.push('a',[BASE-10000]);q.sync();assert.equal(q.status().pending,1);
 store.setItem=set;q.sync();assert.equal(store.getItem(key(BASE-10000)),'1');
});
test('Reader active/paused indication remains independent of pending sync state',async()=>{
 const r=runtime();r.start();await drain();assert.equal(r.node.dataset.readingState,'active');
 r.event('blur');assert.equal(r.node.dataset.readingState,'paused');assert.match(r.node.textContent,/T\u1ea1m d\u1eebng/);
 assert.match(r.node.textContent,/Ch\u1edd \u0111\u1ed3ng b\u1ed9 0s/);
 r.setTime(1000);r.clock.activity(1000);r.tick();await drain();assert.equal(r.node.dataset.readingState,'active');
 r.setTime(122000);r.tick();await drain();assert.equal(r.node.dataset.readingState,'paused');
});
