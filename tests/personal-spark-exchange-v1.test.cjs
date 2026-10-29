'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../js/personal-spark-exchange-v1.js');

function setup(){
 const uid='du-a',docs=new Map([['profiles_v2/'+uid,{username:uid,currency:13}]]);
 const auth={currentUser:{uid}};
 let commits=0;
 const doc=path=>({id:path.split('/').at(-1),path,
  collection:name=>({doc:id=>doc(path+'/'+name+'/'+id)})});
 const db={collection:name=>({doc:id=>doc(name+'/'+id)}),
  runTransaction:async fn=>{
   const writes=[];
   const tx={get:async ref=>({exists:docs.has(ref.path),data:()=>structuredClone(docs.get(ref.path))}),
    set:(ref,data)=>writes.push({op:'set',ref,data}),
    update:(ref,data)=>writes.push({op:'update',ref,data})};
   const result=await fn(tx);
   for(const entry of writes){
    if(entry.op==='set'){
     assert.equal(docs.has(entry.ref.path),false);
     docs.set(entry.ref.path,structuredClone(entry.data));
    }else Object.assign(docs.get(entry.ref.path),structuredClone(entry.data));
   }
   commits+=writes.length;
   return result;
  }};
 return {docs,db,auth,uid,get commits(){return commits;}};
}
const id='ex-12345678-1234-4123-8123-123456789012';
test('10:1 transfers a chosen amount and records one matching receipt',async()=>{
 const s=setup();
 const r=await bridge.transfer({db:s.db,auth:s.auth,uid:s.uid,id,
  gameXu:50,availableTenths:800});
 assert.equal(r.status,'credited');assert.equal(r.walletXu,5);
 assert.equal(s.docs.get('profiles_v2/du-a').currency,18);
 assert.equal(s.docs.get('profiles_v2/du-a').arcadeLastReceiptV1,id);
 const receipt=s.docs.get('profiles_v2/du-a/arcade_receipts_v1/'+id);
 assert.equal(receipt.gameBalanceTenthsBefore,800);
 assert.equal(receipt.rate,10);
 assert.equal(s.commits,2);
});
test('retry of same request never credits twice, even if ACK was lost',async()=>{
 const s=setup(),opts={db:s.db,auth:s.auth,uid:s.uid,id,gameXu:100,availableTenths:1000};
 assert.equal((await bridge.transfer(opts)).status,'credited');
 const r=await bridge.transfer(opts);
 assert.equal(r.status,'already-credited');
 assert.equal(r.balance,23);assert.equal(s.commits,2);
 await assert.rejects(bridge.transfer({...opts,gameXu:50}),/lệnh khác/);
});
test('cannot transfer fake amount, other UID, missing profile or overfull wallet',async()=>{
 const s=setup();
 for(const value of [0,5,11,100]){
  await assert.rejects(bridge.transfer({db:s.db,auth:s.auth,uid:s.uid,id,
   gameXu:value,availableTenths:500}),/không hợp lệ|vượt số dư/);
 }
 await assert.rejects(bridge.transfer({db:s.db,auth:s.auth,uid:'other',id,
  gameXu:10,availableTenths:500}),/phiên tài khoản/);
 s.docs.get('profiles_v2/du-a').currency=bridge.MAX_WALLET;
 await assert.rejects(bridge.transfer({db:s.db,auth:s.auth,uid:s.uid,id,
  gameXu:10,availableTenths:500}),/giới hạn/);
 assert.equal(s.commits,0);
});
test('a session switch during the transaction never commits',async()=>{
 const s=setup();
 const original=s.db.runTransaction;
 s.db.runTransaction=fn=>original(async tx=>{
  const wrapped={...tx,get:async ref=>{const result=await tx.get(ref);
   s.auth.currentUser={uid:'other'};return result;}};
  return fn(wrapped);
 });
 await assert.rejects(bridge.transfer({db:s.db,auth:s.auth,uid:s.uid,id,
  gameXu:10,availableTenths:500}),/thay đổi/);
 assert.equal(s.commits,0);
});
test('id generation uses crypto randomUUID and validates its shape',()=>{
 assert.equal(bridge.requestId({randomUUID:()=>id.slice(3)}),id);
 assert.throws(()=>bridge.requestId({}),/mã giao dịch/);
});
