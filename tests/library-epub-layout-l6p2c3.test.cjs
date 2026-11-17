'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const layout=require('../js/library-epub-layout-l6p2c3.js');
const bookId='epub-test-2026',revisionId='r-0123456789abcdef',chapterId='chapter-0001';
const segments=[
 {type:'text',text:'Chương 1'},
 {type:'text',text:'Tu vi tăng. '},
 {type:'image',assetId:'asset-0001',alt:'Pháp bảo'},
 {type:'text',text:'Sau ảnh, cảnh giới mới.'}
];
const chapterText='Chương 1\n\nTu vi tăng. Sau ảnh, cảnh giới mới.';
const opts=()=>({bookId,revisionId,chapterId,assetIds:['asset-0001'],chapterText,cryptoApi:webcrypto,segments:structuredClone(segments)});
test('L6-P2C3 emits deterministic UTF-8 JSON and SHA-256 for ordered text + image',async()=>{
 const a=await layout.encodeLayout(opts()),b=await layout.encodeLayout(opts());
 assert.equal(a.sha256,b.sha256);assert.deepEqual(a.data,b.data);
 assert.equal(a.layout.segments[2].type,'image');assert.equal(a.layout.segments[2].assetId,'asset-0001');
 assert.equal(a.bytes,a.data.length);assert.equal(a.sha256.length,64);
});
test('L6-P2C3 strict decode checks expected SHA, byte length and each source ID',async()=>{
 const e=await layout.encodeLayout(opts());
 const dec=await layout.decodeLayout(e.data,{bookId,revisionId,chapterId,assetIds:['asset-0001'],
  chapterText,expectedBytes:e.bytes,expectedSha256:e.sha256,cryptoApi:webcrypto});
 assert.equal(dec.segments.length,4);
 assert.equal(Object.isFrozen(dec),true);
 await assert.rejects(layout.decodeLayout(e.data,{bookId,revisionId:'r-ffffffffffffffff',assetIds:['asset-0001']}),/ID/);
 await assert.rejects(layout.decodeLayout(e.data,{bookId,revisionId,chapterId,assetIds:['asset-0001'],expectedBytes:3}),/dung lượng/);
 await assert.rejects(layout.decodeLayout(e.data,{bookId,revisionId,chapterId,assetIds:['asset-0001'],expectedSha256:'0'.repeat(64),cryptoApi:webcrypto}),/checksum/);
});
test('L6-P2C3 refuses missing/non-existent images',async()=>{
 const o=opts();o.assetIds=[];
 await assert.rejects(layout.encodeLayout(o),/ảnh không thuộc/);
});
test('L6-P2C3 refuses mismatched chapter text and missing text segments',async()=>{
 const o=opts();o.chapterText='Khác hoàn toàn';
 await assert.rejects(layout.encodeLayout(o),/không khớp/);
 const p=opts();p.segments=p.segments.filter(x=>x.type==='image');
 await assert.rejects(layout.encodeLayout(p),/chương không có chữ/);
});
test('L6-P2C3 refuses HTML elements as layout segments and unknown fields',async()=>{
 const a=opts();a.segments.push({type:'html',html:'<script>bad()</script>'});
 await assert.rejects(layout.encodeLayout(a),/không được hỗ trợ/);
 const b=opts();b.segments[0].script='alert(1)';
 await assert.rejects(layout.encodeLayout(b),/không được hỗ trợ/);
});
test('L6-P2C3 permits literary HTML-looking text as literal text',async()=>{
 const o=opts();
 o.segments[1].text='Câu nói <script>alert(1)</script>.';
 o.chapterText='Chương 1 Câu nói <script>alert(1)</script>. Sau ảnh, cảnh giới mới.';
 const encoded=await layout.encodeLayout(o);
 assert.match(new TextDecoder().decode(encoded.data),/<script>/);
});
test('L6-P2C3 preserves NFD spelling and line breaks',async()=>{
 const o=opts();o.segments[1].text='điện'.normalize('NFD')+'\nLinh khí.';
 o.chapterText='Chương 1 '+o.segments[1].text+' Sau ảnh, cảnh giới mới.';
 const encoded=await layout.encodeLayout(o);
 const decoded=await layout.decodeLayout(encoded.data,{bookId,revisionId,chapterId,assetIds:['asset-0001'],
  chapterText:o.chapterText});
 assert.equal(decoded.segments[1].text,o.segments[1].text);
});
test('L6-P2C3 rejects asset URLs, javascript pseudo-IDs and unsafe alt',async()=>{
 for(const change of [
   x=>{x.segments[2].assetId='https://evil.test/image.png';},
   x=>{x.segments[2].assetId='../../secret';},
   x=>{x.segments[2].alt='<img onerror=bad>';}
 ]){
  const o=opts();change(o);
  await assert.rejects(layout.encodeLayout(o),/ảnh/);
 }
});
test('L6-P2C3 requires trusted allocated book/revision identifiers',async()=>{
 const o=opts();o.bookId='';
 await assert.rejects(layout.encodeLayout(o),/schema/);
 const a=opts();a.revisionId='../latest';
 await assert.rejects(layout.encodeLayout(a),/schema/);
});
test('L6-P2C3 rejects tampered/noncanonical JSON even without a supplied digest',async()=>{
 const e=await layout.encodeLayout(opts());
 const broken=new Uint8Array(e.data);broken[15]^=1;
 await assert.rejects(layout.decodeLayout(broken,{bookId,revisionId,chapterId,assetIds:['asset-0001']}),/Layout EPUB/);
 const data=new TextEncoder().encode(JSON.stringify({...e.layout,unknown:true}));
 await assert.rejects(layout.decodeLayout(data,{bookId,revisionId,chapterId,assetIds:['asset-0001']}),/Layout EPUB/);
});
test('L6-P2C3 refuses chapters with over 220000 chars',async()=>{
 const o=opts();o.segments=[{type:'text',text:'x'.repeat(220001)}];o.chapterText=o.segments[0].text;
 await assert.rejects(layout.encodeLayout(o),/Layout EPUB không hợp lệ/);
});
