import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {auditStagedBook} from '../src/library-r2-quarantine-audit-v1.mjs';
import {promoteQuarantineBatch} from '../src/library-r2-promotion-v1.mjs';
const require=createRequire(import.meta.url);
const browser=require('../../js/library-epub-layout-l6p2c3.js');
const bookId='epub-layout-a',revision='r-0123456789abcdef',ownerUid='author-one',chapterId='chapter-0001',assetId='asset-0001';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(){
 const txt='Chương 1\n\nPháp bảo xuất hiện.',chapter=new TextEncoder().encode(txt);
 const layout=await browser.encodeLayout({bookId,revisionId:revision,chapterId,
  segments:[{type:'text',text:'Chương 1'},{type:'image',assetId,alt:'Bức tranh'},
   {type:'text',text:'Pháp bảo xuất hiện.'}],assetIds:[assetId],chapterText:txt,cryptoApi:webcrypto});
 const original=Uint8Array.from([80,75,3,4,1,2,3,4]);
 const asset=Uint8Array.from([137,80,78,71,13,10,26,10,1]);
 const catalog={ownerUid,revision,status:'draft',source:{bytes:original.length,sha256:sha(original)},
  chapters:new Map([[chapterId,{bytes:chapter.length,sha256:sha(chapter),
   layout:{bytes:layout.bytes,sha256:layout.sha256}}]]),
  assets:new Map([[assetId,{bytes:asset.length,sha256:sha(asset),mime:'image/png'}]])};
 const files=[
  {kind:'original',id:bookId,raw:original,uploadId:'11111111-1111-4111-8111-111111111111'},
  {kind:'chapter',id:chapterId,raw:chapter,uploadId:'22222222-2222-4222-8222-222222222222'},
  {kind:'layout',id:chapterId,raw:layout.data,uploadId:'33333333-3333-4333-8333-333333333333'},
  {kind:'asset',id:assetId,raw:asset,uploadId:'44444444-4444-4444-8444-444444444444'}
 ];
 const objects=new Map(),calls=[];
 const key=f=>'quarantine/epub/'+ownerUid+'/'+bookId+'/'+revision+'/'+f.uploadId+'.bin';
 for(const f of files){
  objects.set(key(f),{
   size:f.raw.byteLength,customMetadata:{state:'QUARANTINED',ownerUid,bookId,revision,
    kind:f.kind,itemId:f.kind==='original'?'source':f.id,sha256:sha(f.raw)},
   arrayBuffer:async()=>f.raw.buffer.slice(f.raw.byteOffset,f.raw.byteOffset+f.raw.byteLength)
  });
 }
 const bucket={
  async get(path){calls.push(['get',path]);return objects.get(path)||null;},
  async put(path,buffer,options){
   calls.push(['put',path,options]);
   assert.deepEqual(options.onlyIf,{etagDoesNotMatch:'*'});
   if(objects.has(path))return null;
   const bytes=new Uint8Array(buffer);
   objects.set(path,{size:bytes.length,customMetadata:options.customMetadata,
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)});
   return {etag:'ok'};
  },
  async delete(){throw Error('DELETE MUST NOT BE INVOKED');}
 };
 const uploads=files.map(({kind,id,uploadId})=>({kind,id,uploadId}));
 const common={bucket,catalog,bookId,ownerUid,uploads,cryptoApi:webcrypto};
 return {objects,calls,files,key,catalog,common,identity:{uid:ownerUid,admin:true}};
}
test('R2 quarantine audit validates source, text, layout and illustration with no rights granted',async()=>{
 const f=await fixture(),result=await auditStagedBook(f.common);
 assert.equal(result.complete,true);assert.equal(result.checked,4);assert.equal(result.verified,4);
 assert.equal(result.authorizedToPublish,false);assert.equal(result.eligibleForDeletion,false);
});
test('R2 immutable promotion handles layout, retries idempotently, preserves source',async()=>{
 const f=await fixture(),first=await promoteQuarantineBatch({...f.common,identity:f.identity});
 assert.equal(first.allVerified,true);assert.equal(first.copied,4);assert.equal(first.cutoverReady,false);
 const target='layouts/'+f.common.bookId+'/'+f.catalog.revision+'/'+chapterId+'.json';
 assert.ok(f.objects.has(target));
 const second=await promoteQuarantineBatch({...f.common,identity:f.identity});
 assert.equal(second.copied,0);assert.equal(second.reused,4);
 assert.ok(f.objects.has(f.key(f.files[2])));
 assert.equal(second.eligibleForDeletion,false);
});
test('Forged layout asset ID fails quarantine audit and promotion even if SHA matches',async()=>{
 const f=await fixture(),item=f.files[2],bad=new TextEncoder().encode(JSON.stringify({
  schema:1,bookId,revisionId:revision,chapterId,segments:[
   {type:'text',text:'Chương 1'},{type:'image',assetId:'asset-other',alt:'?'},
   {type:'text',text:'Pháp bảo xuất hiện.'}]
 }));
 const obj=f.objects.get(f.key(item));obj.size=bad.length;obj.customMetadata.sha256=sha(bad);
 obj.arrayBuffer=async()=>bad.buffer;
 f.catalog.chapters.get(chapterId).layout={bytes:bad.length,sha256:sha(bad)};
 const a=await auditStagedBook(f.common);
 assert.equal(a.complete,false);assert.ok(a.issues.some(x=>x.includes('layout:')&&x.endsWith(':payload')));
 const b=await promoteQuarantineBatch({...f.common,identity:f.identity,uploads:[f.common.uploads[2]]});
 assert.equal(b.allVerified,false);assert.equal(b.copied,0);
});
test('Layout cannot be promoted if book already published or R2 stage metadata wrong',async()=>{
 const f=await fixture();f.catalog.status='published';
 await assert.rejects(()=>promoteQuarantineBatch({...f.common,identity:f.identity}),/Promotion denied/);
 const g=await fixture();g.objects.get(g.key(g.files[2])).customMetadata.ownerUid='other';
 const r=await promoteQuarantineBatch({...g.common,identity:g.identity,uploads:[g.common.uploads[2]]});
 assert.equal(r.allVerified,false);assert.equal(r.issues[0],'layout:'+chapterId+':source-unverified');
});
