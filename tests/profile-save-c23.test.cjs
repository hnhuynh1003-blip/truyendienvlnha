'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const saver=require('../js/profile-save-c23.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const authCode=fs.readFileSync(path.join(__dirname,'../js/auth-v2.js'),'utf8');

const copy=x=>JSON.parse(JSON.stringify(x));
function harness(initial){
 let server=initial===null?null:copy(initial),transactions=0;
 const writes=[];
 const db={collection(name){assert.equal(name,'profiles_v2');return{
  doc(uid){assert.equal(uid,'reader-a');return {uid};}
 };},async runTransaction(handler){
  transactions++;
  const tx={
   async get(ref){return{exists:server!==null,data:()=>copy(server)};},
   update(ref,patch){writes.push(copy(patch));server={...server,...copy(patch)};},
   set(ref,data){writes.push(copy(data));server={...(server||{}),...copy(data)};}
  };
  return handler(tx);
 }};
 const auth={currentUser:{uid:'reader-a'}};
 return {db,auth,writes,get server(){return server;},get transactions(){return transactions;}};
}
const sample=()=>({username:'reader-a',name:'Du',currency:100,exp:0,
 inventory:[{instanceId:'item-a'}],storyStates:{story1:{favoriteNpcV43:'npc-x',
  redPacketsV32:{'npc-x':{count:0}}}},readRewards:{}});

test('C2.3 main keeps a newer wallet, item and envelope after an unrelated save',async()=>{
 const baseline=sample(),live=copy(baseline);
 live.currency=80;live.inventory.push({instanceId:'item-b'});
 live.storyStates.story1.redPacketsV32['npc-x'].count=1;
 const h=harness(live),local=copy(baseline);local.name='An Du';
 saver.begin('reader-a',baseline);
 const result=await saver.enqueue({uid:'reader-a',db:h.db,auth:h.auth,
  data:local,intents:{name:local.name},isCurrent:()=>true});
 assert.equal(result.saved,true);
 assert.equal(h.server.name,'An Du');
 assert.equal(h.server.currency,80);
 assert.deepEqual(h.server.inventory,live.inventory);
 assert.deepEqual(h.server.storyStates,live.storyStates);
 assert.deepEqual(h.writes,[{name:'An Du'}]);
 saver.reset();
});

// Supersedes generic EXP and NPC-root writes: those belong to domain engines.
test('C2.3 ignores economic snapshots and explicit protected intents',async()=>{
 const baseline=sample(),local={...baseline,currency:999,exp:999};
 const h=harness(baseline);saver.begin('reader-a',baseline);
 const r=await saver.enqueue({uid:'reader-a',db:h.db,auth:h.auth,data:local,
  intents:{currency:999,exp:999,storyStates:{evil:{}}},isCurrent:()=>true});
 assert.equal(r.saved,false);assert.equal(h.transactions,0);
 assert.deepEqual(r.ignored,['currency','exp','storyStates']);
 assert.deepEqual(h.server,baseline);saver.reset();
});
test('C2.3 generic plans cannot write NPC preferences or remove receipts',()=>{
 const baseline=sample(),remote=copy(baseline),local=copy(baseline);
 remote.storyStates.story1.redPacketsV32['npc-x'].count=2;
 local.storyStates.story1.favoriteNpcV43='npc-y';
 const result=saver.merge({baseline,remote,local});
 assert.deepEqual(result.patch,{});
 assert.equal(remote.storyStates.story1.redPacketsV32['npc-x'].count,2);
});

test('C2.3 serializes saves in one tab and refuses writes after account switch',async()=>{
 const original=sample(),h=harness(original);
 saver.begin('reader-a',original);
 const local=copy(original);
 local.name='Du 1';
 const one=saver.enqueue({uid:'reader-a',db:h.db,auth:h.auth,
  data:local,intents:{name:local.name},isCurrent:()=>true});
 local.name='Du 2';
 const two=saver.enqueue({uid:'reader-a',db:h.db,auth:h.auth,
  data:local,intents:{name:local.name},isCurrent:()=>true});
 await Promise.all([one,two]);
 assert.equal(h.server.name,'Du 2');
 assert.equal(h.transactions,2);
 saver.reset();
 assert.deepEqual(await saver.enqueue({uid:'reader-a',db:h.db,auth:h.auth,
  data:local,intents:{name:local.name},isCurrent:()=>true}),{skipped:true});
});

// Generic recreation was unsafe; controlled first-time creation stays separate.
test('C2.3 missing existing profile fails closed; controlled creation stays owner scoped',async()=>{
 const h=harness(null),local=sample();saver.begin('reader-a',{});
 await assert.rejects(saver.enqueue({uid:'reader-a',db:h.db,auth:h.auth,
  intents:{name:'New Name'},isCurrent:()=>true}),/profile-missing/);
 assert.equal(h.server,null);
 const result=await saver.ensureNewProfile({uid:'reader-a',db:h.db,auth:h.auth,
  data:local,isCurrent:()=>true});
 assert.equal(result.created,true);assert.equal(h.server.currency,100);
 assert.equal((await saver.ensureNewProfile({uid:'reader-a',db:h.db,auth:h.auth,
  data:{currency:999},isCurrent:()=>true})).created,false);
 assert.equal(h.server.currency,100);
 assert.deepEqual(await saver.enqueue({uid:'reader-b',db:h.db,auth:h.auth,
  intents:{name:'Other'},isCurrent:()=>true}),{skipped:true});saver.reset();
});

test('C2.3 live wiring has no broad profile .set and installs the save guard before Auth',()=>{
 assert.match(html,/js\/profile-save-c23\.js\?v=c416-1-p4a3-1/);
 assert.ok(html.indexOf('js/profile-save-c23.js')<html.indexOf('js/auth-v2.js'));
 const begin=html.indexOf('function saveCurrentAccount() {');
 const end=html.indexOf('// V54: owner-confirmed one-time reset.',begin);
 const code=html.slice(begin,end);
 assert.match(code,/DuduProfileSaveC23\?\.enqueue/);
 assert.doesNotMatch(code,/\.set\(cloudData,\{merge:true\}\)/);
 assert.match(authCode,/DuduProfileSaveC23\?\.begin\?\.\(account\.uid, cloudData\)/);
 assert.match(authCode,/DuduProfileSaveC23\?\.reset\?\.\(\)/);
});
