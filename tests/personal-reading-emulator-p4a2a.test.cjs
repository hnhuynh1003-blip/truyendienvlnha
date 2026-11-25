// Local emulator only. Uses unchanged repository Rules; no live acceptance claim.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=require('../js/personal-reading-reward-p2b.js');
const {queue}=require('../js/personal-reading-slots-p2c.js');
const policy=require('../js/personal-reading-policy-p2c.js').policy;
test('emulator: lost ACK, duplicate transactions, UID isolation and high-water rejection recovery', {skip:!process.env.P4A2A_EMULATOR},async()=>{
 const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
 const env=await initializeTestEnvironment({projectId:'demo-dudu-p4a2a',firestore:{host:'127.0.0.1',port:8194,
  rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 try{
  const data={name:'Fixture',role:'reader',currency:8,exp:72,level:1,inventory:[],storyStates:{book:{chapter:2}}};
  await env.withSecurityRulesDisabled(async ctx=>ctx.firestore().collection('profiles_v2').doc('a').set(data));
  const db=env.authenticatedContext('a').firestore(),auth={currentUser:{uid:'a'}};
  const now=Date.UTC(2026,10,25,1),slots=Array.from({length:6},(_,i)=>now-60000+i*10000);
  const store=new Map(),storage={get length(){return store.size;},key:i=>[...store.keys()][i],getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  const q=queue({storage,now:()=>now});q.bind('a');q.push('a',slots);q.begin('a');
  const run=()=>engine.run({db,auth,uid:'a',policy,slots,now:()=>now});
  const committed=await run();assert.equal(committed.awardExp,2); // Simulate lost ACK.
  const restored=queue({storage,now:()=>now});restored.bind('a');const ticket=restored.begin('a');
  const results=await Promise.all([run(),run()]);assert.ok(results.every(r=>r.status==='already-credited'));
  restored.settle(ticket,results[0]);assert.equal(restored.size(),0);
  const after=(await db.collection('profiles_v2').doc('a').get()).data();
  assert.equal(after.exp,74);assert.equal(after.currency,8);assert.deepEqual(after.inventory,[]);
  assert.deepEqual(after.storyStates.book,{chapter:2});
  assert.equal(after.storyStates[engine.META].lifetimeObservedMs,60000);
  await assertFails(env.authenticatedContext('b').firestore().collection('profiles_v2').doc('a').get());
  auth.currentUser={uid:'b'};await assert.rejects(run(),/invalid-account/);
  auth.currentUser={uid:'a'};
  await env.withSecurityRulesDisabled(async ctx=>ctx.firestore().collection('profiles_v2').doc('a').update({
   storyStates:{...after.storyStates,[engine.META]:{...after.storyStates[engine.META],lastNowMs:now+240000}}
  }));
  const recovery=queue({storage,now:()=>now});recovery.bind('a');
  const old=Array.from({length:6},(_,i)=>now-86400000+120000+i*10000);
  const newer=Array.from({length:6},(_,i)=>now-120000+i*10000);
  recovery.push('a',[...old,...newer]);
  for(let attempt=0;attempt<20;attempt++){
   const ticket=recovery.begin('a',{force:true});if(!ticket)break;
   try{const result=await engine.run({db,auth,uid:'a',policy,slots:ticket.slots,now:()=>now});recovery.settle(ticket,result);}
   catch(error){assert.equal(error.reason,'invalid-reading-window');recovery.rejectWindow(ticket);}
  }
  assert.equal(recovery.status().held,6);assert.equal(recovery.status().pending,6);
  const recovered=(await db.collection('profiles_v2').doc('a').get()).data();
  assert.equal(recovered.exp,76);assert.equal(recovered.currency,8);
  assert.equal(recovered.storyStates[engine.META].lifetimeObservedMs,120000);
  assert.deepEqual(recovered.storyStates.book,{chapter:2});

 }finally{await env.cleanup();}
});
