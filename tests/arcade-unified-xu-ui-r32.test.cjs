'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const core=require('../js/personal-arcade-core-v1.js');
const bridge=require('../js/arcade-unified-xu-r32.js');
const source=path=>readFileSync(join(__dirname,'..',path),'utf8');
const flush=()=>new Promise(done=>setImmediate(done));
test('R3.2 live Arcade purchases debit profiles_v2 currency, never legacy local coins',async()=>{
 const uid='reader-one',auth={currentUser:{uid}},store=new Map();
 const old=core.fresh(Date.now());old.coins=15000;old.garden.seeds=9;
 const gameKey='dudu-personal-arcade:v1:'+encodeURIComponent(uid);
 store.set(gameKey,JSON.stringify(old));
 let doc={currency:30,storyStates:{existing:{value:1}}},numberOfWrites=0,id=0;
 const ref={};
 const db={collection:name=>{assert.equal(name,'profiles_v2');return {doc:u=>{
  assert.equal(u,uid);return ref;}};},runTransaction:async callback=>{
  let patch;
  const tx={get:async r=>{assert.equal(r,ref);return {exists:true,data:()=>structuredClone(doc)};},
   set:(r,p,opt)=>{assert.equal(r,ref);assert.equal(opt.merge,true);patch=p;}};
  const result=await callback(tx);
  if(patch){doc={...doc,currency:patch.currency,
   storyStates:{...doc.storyStates,...patch.storyStates}};numberOfWrites++;}
  return result;
 }};
 const profile={currency:30};let reads=0;
 const coordinator=require('../js/profile-reconciliation-p4a3a2.js').create({
  isCurrent:(u,identity)=>u===uid&&identity===auth.currentUser,
  read:async()=>{reads++;return {exists:true,fromCache:false,hasPendingWrites:false,data:structuredClone(doc)};},
  apply:(_,data)=>Object.assign(profile,data)
 });
 coordinator.begin(uid,auth.currentUser);
 const notice={textContent:''},scroll={scrollTop:0};
 const host={innerHTML:'',scrollTop:0,listeners:{},
  querySelector:selector=>selector==='.arcade-scroll'?scroll:notice,querySelectorAll:()=>[],
  addEventListener(k,cb){this.listeners[k]=cb;}};
 const arcade={style:{display:'flex'}};
 const walletChip={textContent:'',listeners:{},addEventListener(k,cb){this.listeners[k]=cb;}};
 const docBrowser={getElementById:k=>k==='personal-arcade-v1'?host:
  k==='phone-app-arcade'?arcade:k==='arcade-header-wallet-v1'?walletChip:null};
 let onTick;
 const root={document:docBrowser,DuduPersonalArcadeCoreV1:core,
  DuduArcadeUnifiedXuR32:bridge,DUDU_ARCADE_UNIFIED_XU_R32_READY:true,
  DuduCanonicalProfileP4A3A2:{capture:coordinator.capture,current:t=>coordinator.capture()===t,afterCommit:coordinator.afterCommit},
  DuduAuth:{uid:()=>uid,isReady:()=>true},crypto:{randomUUID:()=>{
   id++;return String(id).padStart(8,'0')+'-1234-1234-1234-123456789abc';}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),
   removeItem:k=>store.delete(k)},
  firebase:{auth:()=>auth,firestore:()=>db},
  setInterval:cb=>{onTick=cb;return 1;},addEventListener(){}};
 const context={window:root,document:docBrowser,userProfile:profile,
  saveCurrentAccount(){throw Error('Arcade must not use an unrelated profile save');}};
 vm.runInNewContext(source('js/personal-jade-ui-v1.js'),context);
 vm.runInNewContext(source('js/personal-arcade-ui-v1.js'),context);
 root.DuduPersonalArcadeUIV1.render();
 onTick();
 await flush();await flush();
 assert.equal(doc.currency,30,'no old local currency is credited');
 assert.equal(doc.storyStates.existing.value,1);
 assert.equal(doc.storyStates[bridge.META].game.garden.seeds,9);
 const archived=JSON.parse(store.get('dudu-personal-arcade:legacy-pre-unified-r32:'+uid));
 assert.equal(archived.coins,15000,'original local money remains backed up');
 assert.equal(walletChip.listeners.click,undefined,'old 10:1 exchange entry is gone');
 assert.equal(root.DuduPersonalArcadeUIV1.interact('buy-seeds'),true);
 await flush();await flush();
 assert.equal(doc.currency,20);
 assert.equal(profile.currency,20);
 assert.equal(doc.storyStates[bridge.META].game.garden.seeds,12);
 assert.equal(numberOfWrites,2);
 assert.equal(reads,2,'init and explicit action each reconcile once');
 assert.match(host.innerHTML,/dudu-money-icon--gold/);
});
