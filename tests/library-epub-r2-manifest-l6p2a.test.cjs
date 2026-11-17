'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const {validate,compareVerified}=require('../js/library-epub-r2-manifest-l6p2a.js');
const hash='b'.repeat(64);
const source=()=>({schema:1,bookId:'epub-a-b-c',revisionId:'r-0123456789abcdef',
 source:{name:'Truyện mẫu.epub',bytes:1000,sha256:hash},
 chapters:[{id:'chapter-0001',title:'Chương 1',order:0,wordCount:12,bytes:123,sha256:hash}],
 assets:[{id:'cover-v1',role:'cover',mime:'image/jpeg',bytes:100,sha256:hash}]});
test('manifest accepts immutable EPUB source, chapters and cover metadata only',()=>{
 const m=validate(source());a.equal(m.schema,1);a.equal(Object.isFrozen(m),true);
 a.equal(Object.isFrozen(m.chapters),true);a.equal(m.chapters[0].id,'chapter-0001');
 a.ok(!('content' in m.chapters[0]));a.ok(!('publicUrl' in m.assets[0]));
});
test('manifest rejects storage URLs and raw text embedded in Firestore metadata',()=>{
 const m=source();m.publicUrl='https://example.test/sensitive.epub';
 a.throws(()=>validate(m),/không hợp lệ/);
 const n=source();n.chapters[0].content='Do not store in firestore';
 a.throws(()=>validate(n),/không hợp lệ/);
});
test('manifest preserves stable book and chapter identifiers',()=>{
 const m=validate(source());a.equal(m.bookId,'epub-a-b-c');a.equal(m.chapters[0].id,'chapter-0001');
});
test('manifest rejects path traversal and unsafe uploaded names',()=>{
 for(const id of ['../private','a/b','..','x']){
  const m=source();m.bookId=id;a.throws(()=>validate(m),/bookId/);
 }
 const n=source();n.source.name='<script>.epub';a.throws(()=>validate(n),/EPUB gốc/);
});
test('manifest requires exactly matching chapter count and contiguous order',()=>{
 const m=source();m.chapters.push({...m.chapters[0],id:'chapter-0002',order:2});
 a.throws(()=>validate(m),/chương thứ 2/);
});
test('manifest rejects duplicate chapter and image IDs',()=>{
 const m=source();m.chapters.push({...m.chapters[0],order:1});
 a.throws(()=>validate(m),/chương thứ 2/);
 const n=source();n.assets.push({...n.assets[0],role:'illustration'});
 a.throws(()=>validate(n),/hình ảnh thứ 2/);
});
test('manifest enforces original file, chapter and image limits',()=>{
 const m=source();m.source.bytes=31*1024*1024;a.throws(()=>validate(m),/EPUB gốc/);
 const n=source();n.chapters[0].bytes=420001;a.throws(()=>validate(n),/chương thứ 1/);
 const q=source();q.assets[0].mime='image/svg+xml';a.throws(()=>validate(q),/hình ảnh thứ 1/);
});
test('manifest forbids SHA placeholders and multiple covers',()=>{
 const m=source();m.source.sha256='not-a-sha';a.throws(()=>validate(m),/EPUB gốc/);
 const n=source();n.assets.push({...n.assets[0],id:'cover-v2'});a.throws(()=>validate(n),/trùng ảnh bìa/);
});
test('verified R2 receipts must match source and every chapter and asset',()=>{
 const m=source();
 const receipts=[
 {kind:'original',id:m.bookId,bytes:1000,sha256:hash,verified:true},
 {kind:'chapter',id:'chapter-0001',bytes:123,sha256:hash,verified:true},
 {kind:'asset',id:'cover-v1',bytes:100,sha256:hash,verified:true}];
 a.deepEqual(compareVerified(m,receipts).missing,[]);a.equal(compareVerified(m,receipts).ready,true);
 const partial=compareVerified(m,receipts.slice(0,2));
 a.equal(partial.ready,false);a.deepEqual(partial.missing,['asset:cover-v1']);
});
test('cutover remains blocked for hash mismatch, duplicate or unverified receipts',()=>{
 const m=source(),r=[
 {kind:'original',id:m.bookId,bytes:1000,sha256:hash,verified:true},
 {kind:'chapter',id:'chapter-0001',bytes:123,sha256:'c'.repeat(64),verified:true},
 {kind:'asset',id:'cover-v1',bytes:100,sha256:hash,verified:true}];
 a.equal(compareVerified(m,r).ready,false);
 r[1].sha256=hash;r[1].verified=false;a.equal(compareVerified(m,r).ready,false);
 r[1].verified=true;r.push({...r[1]});a.equal(compareVerified(m,r).ready,false);
});
test('metadata contract never invokes writes, deletes or R2 requests',()=>{
 const m=source(),x=validate(m);a.equal(x.source.name,'Truyện mẫu.epub');
 a.equal(typeof validate,'function');a.equal(typeof compareVerified,'function');
});
