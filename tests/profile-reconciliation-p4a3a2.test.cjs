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
