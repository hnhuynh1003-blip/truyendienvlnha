import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {auditStagedBook} from '../src/library-r2-quarantine-audit-v1.mjs';
const enc=new TextEncoder(),zip=new Uint8Array([80,75,3,4,7,8,9]),
 chapter=enc.encode('Tu vi tăng.\n\nLinh căn thức tỉnh.'),
 cover=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
const sha=b=>createHash('sha256').update(b).digest('hex');
const bookId='epub-book-123',ownerUid='author-one',revision='r-0123456789abcdef';
const ids=[
 {kind:'original',id:bookId,uploadId:'11111111-1111-4111-8111-111111111111'},
 {kind:'chapter',id:'chapter-0001',uploadId:'22222222-2222-4222-8222-222222222222'},
 {kind:'asset',id:'cover-0001',uploadId:'33333333-3333-4333-8333-333333333333'}];
function fx(){
 const catalog={ownerUid,revision,status:'draft',source:{bytes:zip.length,sha256:sha(zip)},
 chapters:new Map([['chapter-0001',{bytes:chapter.length,sha256:sha(chapter)}]]),
 assets:new Map([['cover-0001',{bytes:cover.length,sha256:sha(cover),mime:'image/png'}]])};
 const values={original:zip,chapter,asset:cover},objects=new Map(),calls=[];
 for(const r of ids){
  const b=values[r.kind],key='quarantine/epub/'+ownerUid+'/'+bookId+'/'+revision+'/'+r.uploadId+'.bin';
  objects.set(key,{size:b.length,
   customMetadata:{state:'QUARANTINED',ownerUid,bookId,revision,kind:r.kind,
    itemId:r.kind==='original'?'source':r.id,sha256:sha(b)},
   arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)});
 }
 const bucket={async get(k){calls.push(k);return objects.get(k)||null;},
  async put(){throw Error('FORBIDDEN WRITE');},
  async delete(){throw Error('FORBIDDEN DELETE');}};
 return {catalog,objects,calls,args:{bucket,catalog,bookId,ownerUid,
  uploads:structuredClone(ids),cryptoApi:webcrypto}};
}
const key=(r)=>'quarantine/epub/'+ownerUid+'/'+bookId+'/'+revision+'/'+r.uploadId+'.bin';
test('reads every R2 quarantined object independently, hashes bytes, never grants publish/delete',async()=>{
 const f=fx(),result=await auditStagedBook(f.args);
 assert.equal(result.complete,true);assert.equal(result.checked,3);
 assert.equal(result.verified,3);assert.deepEqual(result.issues,[]);
 assert.equal(result.authorizedToPublish,false);
 assert.equal(result.eligibleForDeletion,false);assert.equal(f.calls.length,3);
});
test('browser-supplied verified flag is rejected rather than trusted',async()=>{
 const f=fx();f.args.uploads[0].verified=true;
 await assert.rejects(()=>auditStagedBook(f.args),/Untrusted upload/);
});
test('missing object and R2 error fail closed',async()=>{
 const f=fx();f.objects.delete(key(ids[1]));
 const outcome=await auditStagedBook(f.args);
 assert.equal(outcome.complete,false);
 assert.ok(outcome.issues.includes('chapter:chapter-0001:missing'));
 f.args.bucket.get=async()=>{throw Error('offline');};
 assert.equal((await auditStagedBook(f.args)).issues.length,3);
});
test('fake UUID, duplicate references and missing receipts fail before R2 lookup',async()=>{
 const f=fx();f.args.uploads[1].uploadId='../../other';
 await assert.rejects(()=>auditStagedBook(f.args),/Untrusted upload/);
 const x=fx();x.args.uploads[1]={...x.args.uploads[0]};
 await assert.rejects(()=>auditStagedBook(x.args),/Duplicate/);
 const y=fx();y.args.uploads.pop();
 await assert.rejects(()=>auditStagedBook(y.args),/count/);
});
test('quarantined object metadata must match UID, book, revision, kind, item and checksum',async()=>{
 for(const field of ['ownerUid','bookId','revision','state','kind','itemId','sha256']){
  const f=fx();f.objects.get(key(ids[1])).customMetadata[field]='forged';
  const result=await auditStagedBook(f.args);
  assert.equal(result.complete,false,field);
  assert.ok(result.issues.includes('chapter:chapter-0001:metadata'));
 }
});
test('same-length corrupted chapter is rejected by SHA-256',async()=>{
 const f=fx(),bad=enc.encode('X'.repeat(chapter.length));
 f.objects.get(key(ids[1])).arrayBuffer=async()=>bad.buffer;
 assert.ok((await auditStagedBook(f.args)).issues.includes('chapter:chapter-0001:checksum'));
});
test('bad image signature, invalid UTF8 and bad ZIP header fail even with matching declared digest',async()=>{
 for(const [r,bytes,meta] of [[ids[2],cover,fx().catalog.assets.get('cover-0001')],
  [ids[1],chapter,fx().catalog.chapters.get('chapter-0001')],
  [ids[0],zip,fx().catalog.source]]){
  const f=fx(),bad=new Uint8Array(bytes.length).fill(255),obj=f.objects.get(key(r));
  const target=r.kind==='asset'?f.catalog.assets.get(r.id):
    r.kind==='chapter'?f.catalog.chapters.get(r.id):f.catalog.source;
  target.sha256=sha(bad);obj.customMetadata.sha256=sha(bad);
  obj.arrayBuffer=async()=>bad.buffer;
  assert.ok((await auditStagedBook(f.args)).issues.some(v=>v.startsWith(r.kind+':'+r.id+':payload')));
 }
});
test('published/archived books and other owners cannot enter quarantine verification',async()=>{
 for(const state of ['published','archived','deleting']){
  const f=fx();f.catalog.status=state;
  await assert.rejects(()=>auditStagedBook(f.args),/context/);
 }
 const f=fx();f.args.ownerUid='other-user';
 await assert.rejects(()=>auditStagedBook(f.args),/context/);
});
test('oversized catalog chapter aborts before bucket reads',async()=>{
 const f=fx();f.catalog.chapters.get('chapter-0001').bytes=420001;
 await assert.rejects(()=>auditStagedBook(f.args),/Catalog metadata/);
 assert.equal(f.calls.length,0);
});
