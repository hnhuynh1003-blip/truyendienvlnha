'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const receipt=require('../js/dudu-casino-slot-receipt-v1.js');
const design=require('../js/dudu-casino-design-v1.js');
const copy=x=>structuredClone(x);
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const safeRolls=[0,0,0,260000,260000,480000,700000,800000,900000];
function env(balance=100){
 const accounts=new Map([['du',{currency:balance,storyStates:{other:{level:5}}}],
  ['stranger',{currency:100,storyStates:{}}]]);
 const auth={currentUser:{uid:'du'}};let writes=0;let queue=Promise.resolve();
 const db={collection(name){
  assert.equal(name,'profiles_v2');
  return{doc(uid){return{uid,async get(){return{
   exists:accounts.has(uid),data:()=>copy(accounts.get(uid))};}};}};
 },runTransaction(callback){
  // Serialize commits like a Firestore transaction retry/atomicity guarantee.
  const operation=queue.then(async()=>{
   const updates=[];
   const tx={async get(ref){return{exists:accounts.has(ref.uid),
    data:()=>copy(accounts.get(ref.uid))};},
    update(ref,patch){updates.push([ref.uid,copy(patch)]);}};
   const output=await callback(tx);
   for(const [uid,patch] of updates){Object.assign(accounts.get(uid),patch);writes++;}
   return output;
  });
  queue=operation.catch(()=>{});
  return operation;
 }};
 const run=(kind,n,opts={})=>receipt.run({db,auth,uid:'du',kind,id:id(n),
  bet:10,rolls:safeRolls,...opts});
 return{accounts,auth,db,run,get writes(){return writes;}};
}

test('CASINO-SLOT1 receipt: charge a precommitted spin once and claim once',async()=>{
 const e=env(100);
 const charged=await e.run('start',1);
 assert.equal(charged.status,'applied');
 assert.equal(charged.currency,90);
 assert.equal(charged.state.active.status,'spinning');
 assert.equal(charged.state.active.payout,51);
 assert.deepEqual(e.accounts.get('du').storyStates.other,{level:5});
 const copied=await receipt.load({db:e.db,auth:e.auth,uid:'du'});
 assert.equal(copied.currency,90);
 assert.equal(copied.state.active.id,id(1));
 const writes=e.writes;
 assert.equal((await e.run('start',1)).status,'already-applied');
 assert.equal(e.writes,writes);
 const won=await e.run('claim',1);
 assert.equal(won.status,'applied');
 assert.equal(won.payout,51);
 assert.equal(won.currency,141);
 assert.equal(won.state.active.status,'claimed');
 assert.equal(won.state.history.length,1);
 const after=e.writes;
 assert.equal((await e.run('claim',1)).status,'already-applied');
 assert.equal(e.writes,after);
 assert.equal(e.accounts.get('du').currency,141);
 assert.equal(e.accounts.get('stranger').currency,100);
});

test('CASINO-SLOT1 receipt: concurrent tabs and reload cannot double charge or win',async()=>{
 const e=env(100);
 const [a,b]=await Promise.all([e.run('start',1),e.run('start',1)]);
 assert.deepEqual([a.status,b.status].sort(),['already-applied','applied']);
 assert.equal(e.accounts.get('du').currency,90);
 const [x,y]=await Promise.all([e.run('claim',1),e.run('claim',1)]);
 assert.deepEqual([x.status,y.status].sort(),['already-applied','applied']);
 assert.equal(e.accounts.get('du').currency,141);
 // A new client session still reads the same stored receipt.
 const reloaded=await receipt.load({db:e.db,auth:e.auth,uid:'du'});
 assert.equal(reloaded.state.active.status,'claimed');
 assert.equal((await e.run('claim',1)).status,'already-applied');
 assert.equal((await e.run('start',1)).status,'already-applied');
 assert.equal(e.writes,2);
});

test('CASINO-SLOT1 receipt: unfinished spins block new bets, insufficient Xu blocks start',async()=>{
 const e=env(15);
 await e.run('start',1);
 assert.equal(e.accounts.get('du').currency,5);
 await assert.rejects(e.run('start',2),x=>x.reason==='unfinished-spin');
 await assert.rejects(e.run('claim',2),x=>x.reason==='spin-not-found');
 await e.run('claim',1);
 assert.equal(e.accounts.get('du').currency,56);
 await e.run('start',2,{bet:50,rolls:new Array(9).fill(999999)});
 assert.equal(e.accounts.get('du').currency,6);
 await e.run('claim',2);
 assert.equal(e.accounts.get('du').currency,10506);
 const after=e.writes;
 assert.equal((await e.run('claim',1)).status,'already-applied');
 assert.equal(e.writes,after);
 const poor=env(9);
 await assert.rejects(poor.run('start',1),x=>x.reason==='not-enough-xu');
 assert.equal(poor.writes,0);
});

test('CASINO-SLOT1 receipt: account and input validation reject unsafe operations',async()=>{
 const e=env();
 await assert.rejects(e.run('start',1,{bet:5}),x=>x.reason==='invalid-spin');
 await assert.rejects(e.run('start',1,{rolls:[0]}),x=>x.reason==='invalid-spin');
 await assert.rejects(e.run('start',1,{rolls:new Array(9).fill(1000000)}),
  x=>x.reason==='invalid-spin');
 await assert.rejects(e.run('start',1,{id:'not-a-uuid'}),x=>x.reason==='invalid-spin');
 e.auth.currentUser={uid:'stranger'};
 await assert.rejects(e.run('start',1),x=>x.reason==='invalid-account');
 assert.equal(e.writes,0);
 const broken=env();
 broken.accounts.get('du').storyStates[receipt.META]={version:999};
 await assert.rejects(broken.run('start',1),x=>x.reason==='invalid-slot-ledger');
 assert.equal(broken.writes,0);
});

test('CASINO-SLOT1 receipt: oversized payout cannot overflow wallet and remains pending',async()=>{
 const e=env(receipt.MAX_WALLET);
 const allCrowns=new Array(9).fill(999999);
 await e.run('start',1,{bet:10,rolls:allCrowns});
 assert.equal(e.accounts.get('du').currency,receipt.MAX_WALLET-10);
 const before=e.writes;
 await assert.rejects(e.run('claim',1),x=>x.reason==='wallet-cap');
 assert.equal(e.writes,before);
 assert.equal((await receipt.load({db:e.db,auth:e.auth,uid:'du'})).state.active.status,
  'spinning');
});

test('CASINO-SLOT1 receipt remains disconnected from public DUDU FUN and Firebase Rules',()=>{
 const root=join(__dirname,'..');
 const html=readFileSync(join(root,'index.html'),'utf8');
 const preview=readFileSync(join(root,'previews/casino-slot1.html'),'utf8');
 const code=readFileSync(join(root,'js/dudu-casino-slot-receipt-v1.js'),'utf8');
 const rules=readFileSync(join(root,'firestore.rules'),'utf8');
 assert.doesNotMatch(html,/dudu-casino-slot-(?:receipt|ui)-v1/);
 assert.doesNotMatch(preview,/dudu-casino-slot-receipt|firebase-app|firebase-firestore/);
 assert.doesNotMatch(code,/localStorage|userProfile|setInterval/);
 assert.match(code,/runTransaction/);
 assert.match(rules,/deletingOwnedBook\(storyId\)/);
 assert.equal(design.slotRtp()<1,true);
});
