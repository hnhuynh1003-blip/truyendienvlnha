'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto,createHash}=require('node:crypto');
const {buildPlan,stageBatch}=require('../js/library-epub-stage-l6p2c4.js');
const sha=b=>createHash('sha256').update(b).digest('hex');
const U=s=>new TextEncoder().encode(s);
const bookId='epub-preview-001',rev='r-0123456789abcdef',chId='chapter-0001';
const source=Uint8Array.from([80,75,3,4,4,5]),chapter=U('Chương 1 có ảnh');
const layout=U('{"segments":[]}'),image=Uint8Array.from([137,80,78,71,13,10,26,10]);
function fixture(){return {
 manifest:{schema:1,bookId,revisionId:rev,source:{name:'test.epub',bytes:source.length,sha256:sha(source)},
 chapters:[{id:chId,title:'Chương 1',order:0,wordCount:4,bytes:chapter.length,sha256:sha(chapter)}],
 assets:[{id:'asset-0001',role:'cover',mime:'image/png',bytes:image.length,sha256:sha(image)}]},
 layouts:[{chapterId:chId,bytes:layout.length,sha256:sha(layout)}],
 parts:[{kind:'asset',id:'asset-0001',data:image},{kind:'layout',id:chId,data:layout},
 {kind:'original',id:bookId,data:source},{kind:'chapter',id:chId,data:chapter}]
};}
const plan=()=>buildPlan({...fixture(),cryptoApi:webcrypto});
const validReceipt=r=>({status:201,data:{uploadId:'11111111-1111-4111-8111-111111111111',
 bytes:r.body.byteLength,sha256:sha(r.body),publishable:false}});
const tokenProvider=async()=> 'a'.repeat(120);
test('plan validates SHA and deterministic original/chapter/layout/asset order',async()=>{
 const p=await plan();
 assert.deepEqual(p.items.map(x=>x.kind),['original','chapter','layout','asset']);
 assert.equal(p.readyForPublication,false);assert.equal(p.eligibleForDeletion,false);
});
test('plan rejects missing, extra, duplicate and corrupted parts',async()=>{
 for(const change of [f=>f.parts.pop(),f=>f.parts.push(f.parts[0]),
 f=>f.parts[1]=f.parts[0],f=>f.parts[0].data=Uint8Array.from({length:image.length},()=>0)]){
  const f=fixture();change(f);
  await assert.rejects(buildPlan({...f,cryptoApi:webcrypto}),/stage bị từ chối/);
 }
});
test('stage requests are bounded sequentially with a fresh ephemeral Firebase token',async()=>{
 const p=await plan(),sent=[],progress=[];let tokens=0;
 const s=await stageBatch({plan:p,batchSize:4,cryptoApi:webcrypto,
  tokenProvider:async()=>{tokens++;return 'a'.repeat(120);},
  send:async r=>{sent.push(r);return validReceipt(r);},
  onProgress:v=>progress.push(v)});
 assert.equal(tokens,4);assert.equal(sent.length,4);assert.equal(progress.length,4);
 assert.equal(s.completed,true);assert.equal(s.publishable,false);assert.equal(s.eligibleForDeletion,false);
 assert.ok(sent.every(r=>r.route.startsWith('/v1/library/r2/stage/')&&r.method==='POST'));
});
test('failed HTTP response stops immediately, without automatic retry or publish',async()=>{
 const p=await plan();let attempts=0;
 await assert.rejects(stageBatch({plan:p,cryptoApi:webcrypto,tokenProvider,
  send:async()=>{attempts++;return {status:403,data:{}};}}),/Worker chưa xác nhận/);
 assert.equal(attempts,1);
});
test('untrusted server receipt, byte count, hash and publishable=true are refused',async()=>{
 const p=await plan();
 for(const data of [{uploadId:'bad',bytes:source.length,sha256:sha(source),publishable:false},
 {uploadId:'11111111-1111-4111-8111-111111111111',bytes:2,sha256:sha(source),publishable:false},
 {uploadId:'11111111-1111-4111-8111-111111111111',bytes:source.length,sha256:'0'.repeat(64),publishable:false},
 {uploadId:'11111111-1111-4111-8111-111111111111',bytes:source.length,sha256:sha(source),publishable:true}]){
  await assert.rejects(stageBatch({plan:p,batchSize:1,cryptoApi:webcrypto,tokenProvider,
   send:async()=>({status:201,data})}),/Worker chưa xác nhận/);
 }
});
test('no upload with invalid Firebase token, aborted signal or too-large batch',async()=>{
 const p=await plan();let sent=0;
 await assert.rejects(stageBatch({plan:p,cryptoApi:webcrypto,tokenProvider:async()=> 'bad',
  send:async()=>{sent++;}}),/ID Token/);
 const c=new AbortController();c.abort();
 const cancelled=await stageBatch({plan:p,cryptoApi:webcrypto,signal:c.signal,tokenProvider,
  send:async()=>{sent++;}});
 assert.equal(sent,0);assert.equal(cancelled.completed,false);
 await assert.rejects(stageBatch({plan:p,cryptoApi:webcrypto,batchSize:9,tokenProvider,
  send:async()=>{sent++;}}),/điều kiện/);
});
test('in-memory next cursor is explicit, no persistence and no publishing rights',async()=>{
 const p=await plan(),send=async r=>validReceipt(r);
 const a=await stageBatch({plan:p,cryptoApi:webcrypto,batchSize:2,tokenProvider,send});
 const b=await stageBatch({plan:p,cryptoApi:webcrypto,start:a.next,batchSize:2,tokenProvider,send});
 assert.equal(a.next,2);assert.equal(a.completed,false);assert.equal(b.next,4);
 assert.equal(b.completed,true);assert.equal(b.publishable,false);
});
test('mutation after buildPlan is detected again before upload',async()=>{
 const p=await plan();p.items[0].data.fill(0);let sent=0;
 await assert.rejects(stageBatch({plan:p,cryptoApi:webcrypto,tokenProvider,send:async()=>{sent++;}}),/tệp đã thay đổi/);
 assert.equal(sent,0);
});
