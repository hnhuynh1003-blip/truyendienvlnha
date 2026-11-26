'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {create,MAX_READS_PER_DRAIN}=require('../js/profile-reconciliation-p4a3a2.js');
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject};};
const confirmed=data=>({exists:true,fromCache:false,hasPendingWrites:false,data});
function fixture(){
 let uid='A',identity={},calls=[],applied=[];
 const api=create({isCurrent:(u,i)=>u===uid&&i===identity,
  read:(u,i)=>{const d=deferred();calls.push({u,i,...d});return d.promise;},
  apply:(u,data,i)=>applied.push({u,data,i})});
 let ticket=api.begin(uid,identity);
 return {api,calls,applied,get ticket(){return ticket;},switchTo(u){uid=u;identity={};ticket=api.begin(uid,identity);}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('coalesces simultaneous commits into one server read, ignores transaction snapshot order',async()=>{
 const h=fixture(),p=h.api.afterCommit(h.ticket),q=h.api.afterCommit(h.ticket);
 a.equal(p,q);await tick();a.equal(h.calls.length,1);
 const canonical={currency:995,exp:2,inventory:[{id:'purchased'}],storyStates:{receipt:true,historical:{keep:true}}};
 h.calls[0].resolve(confirmed(canonical));a.equal((await p).status,'synced');
 a.deepEqual(h.applied.map(x=>x.data),[canonical]);a.equal(h.api.status(h.ticket).status,'synced');
});
test('a completion during a server read invalidates the earlier projection',async()=>{
 const h=fixture(),p=h.api.afterCommit(h.ticket);await tick();
 a.equal(h.api.afterCommit(h.ticket),p);
 h.calls[0].resolve(confirmed({currency:980}));await tick();
 a.equal(h.applied.length,0);a.equal(h.calls.length,2);
 h.calls[1].resolve(confirmed({currency:995}));a.equal((await p).status,'synced');
 a.deepEqual(h.applied.map(x=>x.data.currency),[995]);
});
test('bounded drain retains dirty status, manual retry never resubmits a transaction',async()=>{
 const h=fixture(),p=h.api.afterCommit(h.ticket);
 for(let i=0;i<MAX_READS_PER_DRAIN;i++){await tick();h.api.afterCommit(h.ticket);h.calls[i].resolve(confirmed({currency:i}));}
 a.equal((await p).status,'pending');a.equal(h.calls.length,MAX_READS_PER_DRAIN);a.equal(h.applied.length,0);
 const q=h.api.retry(h.ticket);await tick();h.calls.at(-1).resolve(confirmed({currency:9}));
 a.equal((await q).status,'synced');a.equal(h.applied[0].data.currency,9);
});
test('failed, missing, cached and locally pending reads cannot publish',async()=>{
 const h=fixture();let p=h.api.afterCommit(h.ticket);await tick();h.calls.at(-1).reject(Error('offline'));
 a.equal((await p).status,'read-failed');
 for(const snap of [{...confirmed({currency:1}),exists:false},{...confirmed({currency:1}),fromCache:true},{...confirmed({currency:1}),hasPendingWrites:true}]){
  p=h.api.retry(h.ticket);await tick();h.calls.at(-1).resolve(snap);a.equal((await p).status,'unconfirmed');
 }
 a.equal(h.applied.length,0);a.equal(h.api.status(h.ticket).status,'pending');
 p=h.api.retry(h.ticket);await tick();h.calls.at(-1).resolve(confirmed({currency:2}));a.equal((await p).status,'synced');
});
test('A to B to A and stale completion tickets never apply to a new session',async()=>{
 const h=fixture(),old=h.ticket,p=h.api.afterCommit(old);await tick();h.switchTo('B');h.switchTo('A');
 h.calls[0].resolve(confirmed({currency:999}));a.equal((await p).status,'session-changed');
 a.equal((await h.api.afterCommit(old)).status,'session-changed');a.equal(h.calls.length,1);a.equal(h.applied.length,0);
 const q=h.api.afterCommit(h.ticket);await tick();h.calls.at(-1).resolve(confirmed({currency:7}));a.equal((await q).status,'synced');
 a.equal(h.applied[0].data.currency,7);
});
test('reset fences an in-flight read and no idle polling or retry occurs',async()=>{
 const h=fixture(),ticket=h.ticket,p=h.api.afterCommit(ticket);await tick();h.api.reset();h.calls[0].resolve(confirmed({currency:1}));
 a.equal((await p).status,'session-changed');await tick();a.equal(h.calls.length,1);a.equal(h.applied.length,0);a.equal(h.api.capture(),null);
});
test('projection failure remains pending and a subsequent read can recover',async()=>{
 let fails=true,reads=0;const identity={};
 const api=create({isCurrent:()=>true,read:async()=>{reads++;return confirmed({currency:5});},apply:()=>{if(fails)throw Error('render');}});
 const ticket=api.begin('A',identity);a.equal((await api.afterCommit(ticket)).status,'apply-failed');fails=false;
 a.equal((await api.retry(ticket)).status,'synced');a.equal(reads,2);
});

test('confirmed cache is UID-scoped, isolated from legacy UI backup and retains unknown roots',()=>{
 const {cacheKey,storeConfirmed}=require('../js/profile-reconciliation-p4a3a2.js');
 const values=new Map([['profile_A','historical-device-backup']]);
 const storage={setItem:(k,v)=>values.set(k,v)};
 const profile={currency:20,storyStates:{historical:{npc:'preserved'}},unknown:{keep:true}};
 a.equal(storeConfirmed(storage,'A',profile),true);
 a.equal(values.get('profile_A'),'historical-device-backup');
 a.deepEqual(JSON.parse(values.get(cacheKey('A'))),profile);
 storage.setItem('profile_A','stale UI');
 a.deepEqual(JSON.parse(values.get(cacheKey('A'))),profile);
 a.equal(storeConfirmed(storage,'B',{currency:3}),true);
 a.equal(JSON.parse(values.get(cacheKey('B'))).currency,3);
 a.equal(storeConfirmed({setItem(){throw Error('quota');}},'A',profile),false);
});

test('actual canonical runtime repaints only the authenticated market and does not activate hidden FUN',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('    (function installCanonicalProfileP4A3A2(){'),end=html.indexOf('    const pendingLiveProfileWrites=',start);
 a.ok(start>=0&&end>start);
 const identity={uid:'A'},app={shop:{style:{display:'flex'}},fun:{style:{display:'none'}}},storage=new Map();
 let reads=0,market=0,legacy=0,fun=0;
 const canonical={currency:77,inventory:[{id:'owned'}],storyStates:{historical:{keep:true},__duduPersonalProgressC23:{lastGlobalLootAt:0}}};
 const userProfile={currency:100,inventory:[],storyStates:{},phoneAppearanceV568:{local:true}};
 const root={DuduProfileReconciliationP4A3A2:require('../js/profile-reconciliation-p4a3a2.js'),
  DuduEconomyLiveV52:{refreshPersonalMarket(){market++;}},
  DuduFunUIV43:{render(){fun++;}}};
 const ctx={window:root,userProfile,currentUsername:'A',IS_SANDBOX_MODE:false,
  DuduAuth:{uid:()=>identity.uid,isReady:()=>true},firebase:{auth:()=>({currentUser:identity})},
  db:{collection:name=>{a.equal(name,'profiles_v2');return {doc:uid=>{a.equal(uid,'A');return {get:async opts=>{a.equal(opts.source,'server');reads++;return {exists:true,metadata:{fromCache:false,hasPendingWrites:false},data:()=>structuredClone(canonical)};}};}};}},
  document:{getElementById:id=>app[id.replace('phone-app-','')],querySelectorAll:()=>[]},
  localStorage:{setItem:(k,v)=>storage.set(k,v)},lastLootTimestamp:123,scopedLocalKey:k=>k,startCooldownTicker(){},
  updatePhoneUI(){},renderWallet(){},renderQuests(){},renderInventory(){},updateChapterLootButtonState(){},refreshNpcViewsAfterLibraryUpdate(){},
  renderShop(){legacy++;},console};
 vm.runInNewContext(html.slice(start,end),ctx);
 const api=root.DuduCanonicalProfileP4A3A2,ticket=api.begin('A',identity);
 a.equal((await api.afterCommit(ticket)).status,'synced');
 a.equal(userProfile.currency,77);a.equal(userProfile.inventory.length,1);a.equal(ctx.lastLootTimestamp,0);
 a.deepEqual(userProfile.phoneAppearanceV568,{local:true});
 a.equal(market,1);a.equal(legacy,0);a.equal(fun,0);a.equal(reads,1);
 app.shop.style.display='none';app.fun.style.display='flex';
 a.equal((await api.afterCommit(ticket)).status,'synced');
 a.equal(market,1);a.equal(legacy,0);a.equal(fun,1);a.equal(reads,2);
});
