import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {promoteQuarantineBatch} from '../src/library-r2-promotion-v1.mjs';
const bookId='epub-test-book',ownerUid='author-one',rev='r-0123456789abcdef';
const image=Uint8Array.from([137,80,78,71,13,10,26,10,1,1,1]);
const chapter=new TextEncoder().encode('Linh căn thức tỉnh.\n\nPháp bảo mới.');
const original=Uint8Array.from([80,75,3,4,9,8,7]);
const sha=b=>createHash('sha256').update(b).digest('hex');
const uploads=[
 {kind:'original',id:bookId,uploadId:'11111111-1111-4111-8111-111111111111'},
 {kind:'chapter',id:'chapter-0001',uploadId:'22222222-2222-4222-8222-222222222222'},
 {kind:'asset',id:'asset-0001',uploadId:'33333333-3333-4333-8333-333333333333'}
];
const data={original,chapter,asset:image};
const key=r=>'quarantine/epub/'+ownerUid+'/'+bookId+'/'+rev+'/'+r.uploadId+'.bin';
const target=r=>(r.kind==='original'?'originals':r.kind==='chapter'?'chapters':'assets')+'/'+bookId+'/'+rev+'/'+
 (r.kind==='original'?'source.epub':r.id+(r.kind==='chapter'?'.txt':'.png'));
function fixture(){
 const catalog={status:'draft',ownerUid,revision:rev,
  source:{bytes:original.length,sha256:sha(original)},
  chapters:new Map([['chapter-0001',{bytes:chapter.length,sha256:sha(chapter)}]]),
  assets:new Map([['asset-0001',{bytes:image.length,sha256:sha(image),mime:'image/png'}]])};
 const stored=new Map(),calls=[];
 for(const u of uploads){
  const bytes=data[u.kind];stored.set(key(u),{
   size:bytes.byteLength,
   customMetadata:{state:'QUARANTINED',ownerUid,bookId,revision:rev,kind:u.kind,
    itemId:u.kind==='original'?'source':u.id,sha256:sha(bytes)},
   arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)
  });
 }
 const bucket={async get(k){calls.push(['get',k]);return stored.get(k)||null;},
  async put(k,buf,options){
   calls.push(['put',k,options]);
   assert.deepEqual(options.onlyIf,{etagDoesNotMatch:'*'});
   if(stored.has(k))return null;
   const bytes=new Uint8Array(buf);
   stored.set(k,{size:bytes.byteLength,customMetadata:options.customMetadata,
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
   return {etag:'new'};
  },async delete(){throw Error('DELETE forbidden');}};
 const args={bucket,catalog,identity:{uid:ownerUid,admin:true},bookId,ownerUid,uploads:structuredClone(uploads),cryptoApi:webcrypto};
 return {catalog,stored,calls,bucket,args};
}
test('conditional immutable promote copies and verifies all source objects with no publication',async()=>{
 const f=fixture(),result=await promoteQuarantineBatch(f.args);
 assert.equal(result.allVerified,true);assert.equal(result.copied,3);assert.equal(result.reused,0);
 assert.equal(result.authorizedToPublish,false);assert.equal(result.eligibleForDeletion,false);
 assert.equal(result.cutoverReady,false);
 for(const u of uploads){assert.ok(f.stored.has(key(u)));assert.ok(f.stored.has(target(u)));}
 assert.equal(f.calls.filter(x=>x[0]==='put').length,3);
});
test('retry reuses identical staged objects, not overwrite or duplicate writes',async()=>{
 const f=fixture();await promoteQuarantineBatch(f.args);const count=f.calls.filter(x=>x[0]==='put').length;
 const again=await promoteQuarantineBatch(f.args);
 assert.deepEqual({copied:again.copied,reused:again.reused},{copied:0,reused:3});
 assert.equal(f.calls.filter(x=>x[0]==='put').length,count);
});
test('wrong owner, non-admin and published book fail before R2 touches',async()=>{
 for(const change of [f=>{f.args.identity.admin=false;},f=>{f.args.ownerUid='other';},
  f=>{f.catalog.status='published';},f=>{f.catalog.revision='../../bad';}]){
  const f=fixture();change(f);
  await assert.rejects(()=>promoteQuarantineBatch(f.args),/Promotion denied/);
  assert.equal(f.calls.length,0);
 }
});
test('bad upload IDs and duplicate references rejected before R2 touches',async()=>{
 for(const change of [f=>{f.args.uploads[0].uploadId='../../path';},
  f=>{f.args.uploads[1]={...f.args.uploads[0]};},
  f=>{f.args.uploads[2].kind='unknown';},
  f=>{f.args.uploads.push(...f.args.uploads,...f.args.uploads);f.args.uploads.push(...f.args.uploads);}]){
  const f=fixture();change(f);
  await assert.rejects(()=>promoteQuarantineBatch(f.args),/Promotion denied/);
  assert.equal(f.calls.length,0);
 }
});
test('missing or forged quarantined metadata never creates destination objects',async()=>{
 for(const change of [f=>f.stored.delete(key(uploads[0])),
  f=>f.stored.get(key(uploads[0])).customMetadata.ownerUid='other',
  f=>f.stored.get(key(uploads[0])).customMetadata.sha256='0'.repeat(64)]){
  const f=fixture();change(f);
  const r=await promoteQuarantineBatch(f.args);
  assert.equal(r.allVerified,false);assert.equal(r.copied,0);
  assert.equal(f.calls.filter(x=>x[0]==='put').length,0);
 }
});
test('tampered staged content at same length rejected by SHA-256',async()=>{
 const f=fixture(),bad=new Uint8Array(original.byteLength).fill(88);
 f.stored.get(key(uploads[0])).arrayBuffer=async()=>bad.buffer;
 const r=await promoteQuarantineBatch(f.args);
 assert.equal(r.allVerified,false);assert.match(r.issues[0],/source-unverified/);
 assert.equal(f.calls.filter(x=>x[0]==='put').length,0);
});
test('existing conflicting destination blocks immutable overwrite',async()=>{
 const f=fixture(),bad=new Uint8Array(original.byteLength).fill(7);
 f.stored.set(target(uploads[0]),{size:bad.byteLength,
  customMetadata:{state:'STAGED',ownerUid,bookId,revision:rev,kind:'original',itemId:'source',sha256:sha(original)},
  arrayBuffer:async()=>bad.buffer});
 const r=await promoteQuarantineBatch(f.args);
 assert.equal(r.allVerified,false);assert.match(r.issues[0],/immutable-conflict/);
 assert.equal(f.calls.filter(x=>x[0]==='put').length,0);
});
test('conditional write race fails closed and never permits overwrite',async()=>{
 const f=fixture();f.bucket.put=async()=>null;
 const r=await promoteQuarantineBatch(f.args);
 assert.deepEqual(r.issues,['original:'+bookId+':conditional-write-blocked']);
 assert.equal(r.authorizedToPublish,false);
});
test('partial promotion leaves safe staged objects for retry, no rollback deletes',async()=>{
 const f=fixture(),badkey=key(uploads[1]);f.stored.delete(badkey);
 const a=await promoteQuarantineBatch(f.args);
 assert.equal(a.copied,1);assert.equal(a.allVerified,false);
 assert.ok(f.stored.has(target(uploads[0])));assert.equal(f.stored.has(target(uploads[1])),false);
 const bytes=data.chapter;
 f.stored.set(badkey,{size:bytes.length,customMetadata:{state:'QUARANTINED',ownerUid,bookId,revision:rev,kind:'chapter',itemId:'chapter-0001',sha256:sha(bytes)},
  arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
 const b=await promoteQuarantineBatch(f.args);
 assert.equal(b.copied,2);assert.equal(b.reused,1);
 assert.equal(b.allVerified,true);
});
test('readback mismatch after PUT refuses success',async()=>{
 const f=fixture(),put=f.bucket.put;
 f.bucket.put=async(k,body,opt)=>{const out=await put(k,body,opt);f.stored.get(k).customMetadata.state='BAD';return out;};
 const r=await promoteQuarantineBatch(f.args);
 assert.equal(r.allVerified,false);assert.match(r.issues[0],/readback-mismatch/);
});
