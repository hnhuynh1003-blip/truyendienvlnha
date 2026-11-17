import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {validateLayoutBytes,layoutMatchesChapter} from '../src/library-r2-layout-v1.mjs';
import {handleLibraryR2Private} from '../src/library-r2-private-v1.mjs';
import {prepareR2CatalogDraft} from '../src/library-r2-catalog-draft-v1.mjs';
import {parseCatalog} from '../src/library-r2-firestore-acl-v1.mjs';
const require=createRequire(import.meta.url);
const browser=require('../../js/library-epub-layout-l6p2c3.js');
const bookId='epub-test-book',chapterId='chapter-0001',revisionId='r-0123456789abcdef';
const TOKEN='a'.repeat(120),ORIGIN='https://hnhuynh1003-blip.github.io';
const text='Chương 1\n\nLinh khí tăng. Sau ảnh, đột phá.',assetId='asset-0001';
const sha=b=>createHash('sha256').update(b).digest('hex');
const SAMPLE={
 schema:1,bookId,revisionId,chapterId,segments:[
  {type:'text',text:'Chương 1'},
  {type:'text',text:'Linh khí tăng. '},
  {type:'image',assetId,alt:'Một pháp bảo'},
  {type:'text',text:'Sau ảnh, đột phá.'}
 ]
};
const shape=()=>JSON.parse(JSON.stringify(SAMPLE));
async function setup({status='published',identity={uid:'reader',admin:false},r2Enabled=true,authorizer=true,withLayout=true}={}){
 const original=await browser.encodeLayout({bookId,revisionId,chapterId,segments:shape().segments,
  chapterText:text,assetIds:[assetId],cryptoApi:webcrypto});
 const plain=new TextEncoder().encode(text),layoutPath='layouts/'+bookId+'/'+revisionId+'/'+chapterId+'.json';
 const chapterPath='chapters/'+bookId+'/'+revisionId+'/'+chapterId+'.txt';
 const assets=new Map([[assetId,{id:assetId,bytes:11,sha256:'a'.repeat(64),mime:'image/png'}]]);
 const catalog={ownerUid:'author',revision:revisionId,status,chapters:new Map([[
  chapterId,{id:chapterId,bytes:plain.length,sha256:sha(plain),
   layout:withLayout?{bytes:original.bytes,sha256:original.sha256}:null}
 ]]),assets,source:{bytes:5,sha256:'a'.repeat(64)}};
 const objects=new Map([[layoutPath,original.data],[chapterPath,plain]]),calls=[];
 const bucket={
  async get(key){calls.push(['get',key]);const bytes=objects.get(key);
   return bytes?{size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}:null;},
  async put(key,buffer,options){calls.push(['put',key,options]);objects.set(key,new Uint8Array(buffer));return {etag:'ok'};},
  async delete(){throw Error('DELETE MUST NEVER BE CALLED');}
 };
 const env={PROJECT_ID:'truyendienvl',ALLOWED_ORIGIN:ORIGIN,LIBRARY_R2_ENABLED:r2Enabled?'true':'false',
  DUDU_LIBRARY_EPUB_BUCKET:bucket};
 const deps={verifyIdentity:async()=>identity,loadCatalog:async()=>authorizer?catalog:null,cryptoApi:webcrypto};
 const request=(action='read',verb='GET',payload=null,kind='layout')=>new Request(
  'https://preview.test/v1/library/r2/'+action+'/'+kind+'/'+bookId+'/'+chapterId,{
  method:verb,headers:{Origin:ORIGIN,Authorization:'Bearer '+TOKEN,
   ...(payload?{'Content-Type':'application/json; charset=utf-8'}:{})},body:payload});
 const run=(req)=>handleLibraryR2Private(req,env,deps);
 return {catalog,original,objects,calls,bucket,env,deps,request,run,layoutPath,chapterPath,plain};
}
test('Browser encoded layout decodes in Worker with strict schema and matching text',async()=>{
 const f=await setup();
 const clean=validateLayoutBytes(f.original.data,{bookId,revisionId,chapterId,assetIds:new Set([assetId]),chapterText:text});
 assert.equal(clean.segments[2].assetId,assetId);
 assert.equal(layoutMatchesChapter(clean,text),true);
});
test('Worker GET layout requires approved catalog and verifies two separate R2 object digests',async()=>{
 const f=await setup(),response=await f.run(f.request());
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/json; charset=utf-8');
 assert.match(response.headers.get('Cache-Control'),/no-store/);
 assert.deepEqual(await response.json(),SAMPLE);
 assert.deepEqual(f.calls.map(x=>x[1]),[f.layoutPath,f.chapterPath]);
});
test('Worker GET layout fails closed for disabled feature, denied catalog, absent layout metadata',async()=>{
 for(const cfg of [{r2Enabled:false},{authorizer:false},{withLayout:false}]){
  const f=await setup(cfg),res=await f.run(f.request());
  assert.ok([503,403,404].includes(res.status));assert.equal(f.calls.length,0);
 }
});
test('Layout JSON matching its own checksum but differing from verified chapter is rejected',async()=>{
 const f=await setup();
 const forged=await browser.encodeLayout({bookId,revisionId,chapterId,segments:[
  {type:'text',text:'Nội dung đã bị thay đổi'},
  {type:'image',assetId,alt:'Một ảnh'}],assetIds:[assetId],cryptoApi:webcrypto});
 f.objects.set(f.layoutPath,forged.data);
 f.catalog.chapters.get(chapterId).layout={bytes:forged.bytes,sha256:forged.sha256};
 assert.equal((await f.run(f.request())).status,502);
});
test('Tampered layout fails byte-length, SHA and image allowlist checks',async()=>{
 const f=await setup();
 const wrong=new Uint8Array(f.original.data.length);wrong.fill(32);f.objects.set(f.layoutPath,wrong);
 assert.equal((await f.run(f.request())).status,502);
 const g=await setup();g.catalog.assets.delete(assetId);
 assert.equal((await g.run(g.request())).status,502);
 const h=await setup();h.catalog.chapters.get(chapterId).layout.sha256='0'.repeat(64);
 assert.equal((await h.run(h.request())).status,502);
});
test('Read is not permitted to choose arbitrary R2 key, even with valid reader token',async()=>{
 const f=await setup(),bad=new Request('https://preview.test/v1/library/r2/read/layout/'+bookId+'/..%2Fsecret',{
  headers:{Authorization:'Bearer '+TOKEN}});
 assert.equal((await f.run(bad)).status,404);assert.equal(f.calls.length,0);
});
test('Author may stage a validated draft layout only into quarantine',async()=>{
 const f=await setup({status:'draft',identity:{uid:'author',admin:true}});
 const res=await f.run(f.request('stage','POST',f.original.data));
 assert.equal(res.status,201);
 const payload=await res.json();
 assert.equal(payload.publishable,false);
 const write=f.calls.find(x=>x[0]==='put');
 assert.ok(write&&write[1].startsWith('quarantine/epub/author/'));
 assert.equal(write[2].customMetadata.kind,'layout');
 assert.equal(f.objects.has('layouts/'+bookId+'/'+revisionId+'/'+chapterId+'.json'),true); // fixture object already exists; no promote
 assert.equal(f.calls.filter(x=>x[0]==='put').length,1);
});
test('Unapproved reader cannot stage layout or original; published owner cannot stage',async()=>{
 for(const cfg of [{status:'draft'},{status:'published',identity:{uid:'author',admin:true}}]){
  const f=await setup(cfg);
  const res=await f.run(f.request('stage','POST',f.original.data));
  assert.equal(res.status,403);assert.equal(f.calls.length,0);
 }
});
test('Catalog draft builder serializes complete layout checksums, without writing or publishing',async()=>{
 const f=await setup();
 const manifest={schema:1,bookId,revisionId,
  source:{name:'Tác phẩm.epub',bytes:5,sha256:'a'.repeat(64)},
  chapters:[{id:chapterId,title:'Chương 1',order:0,wordCount:9,bytes:f.plain.byteLength,sha256:sha(f.plain)}],
  assets:[{id:assetId,role:'illustration',mime:'image/png',bytes:11,sha256:'a'.repeat(64)}]};
 const prepared=prepareR2CatalogDraft({
  manifest,identity:{uid:'author',admin:true},metadata:{title:'Truyện mẫu',author:'Tác giả',description:''},
  layouts:[{chapterId,bytes:f.original.bytes,sha256:f.original.sha256}]
 });
 assert.equal(prepared.catalogWritten,false);assert.equal(prepared.authorizedToPublish,false);
 assert.equal(prepared.eligibleForDeletion,false);
 const parsed=parseCatalog(prepared.fields);
 assert.deepEqual(parsed.chapters.get(chapterId).layout,{bytes:f.original.bytes,sha256:f.original.sha256});
 assert.equal(prepared.fields.status.stringValue,'importing');
});
test('Catalog draft builder rejects missing, duplicate or mismatched chapter layouts and false owner',async()=>{
 const f=await setup();
 const manifest={schema:1,bookId,revisionId,
  source:{name:'test.epub',bytes:5,sha256:'a'.repeat(64)},
  chapters:[{id:chapterId,title:'Chương 1',order:0,wordCount:8,bytes:f.plain.length,sha256:sha(f.plain)}],
  assets:[]};
 const config={manifest,layouts:[{chapterId,bytes:f.original.bytes,sha256:f.original.sha256}],
  identity:{uid:'author',admin:true},metadata:{title:'Truyện',author:'Tác giả',description:''}};
 assert.throws(()=>prepareR2CatalogDraft({...config,identity:{uid:'author',admin:false}}),/owner/);
 assert.throws(()=>prepareR2CatalogDraft({...config,layouts:[]}),/count/);
 assert.throws(()=>prepareR2CatalogDraft({...config,layouts:[{chapterId:'chapter-0002',bytes:1,sha256:'a'.repeat(64)}]}),/chapter/);
});
test('Backward-compatible Firestore catalog with no layout does not expose layout endpoint',async()=>{
 const f=await setup({withLayout:false});
 assert.equal(f.catalog.chapters.get(chapterId).layout,null);
 assert.equal((await f.run(f.request())).status,404);
});
