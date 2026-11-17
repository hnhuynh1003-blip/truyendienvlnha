/* L6-P2C3 — offline, canonical EPUB text/image layout. NOT loaded in index.html.
 * Never inserts EPUB HTML and never chooses a public R2 object URL.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubLayoutL6P2C3=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BOOK=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
 const REV=/^r-[a-f0-9]{16,32}$/;
 const HASH=/^[0-9a-f]{64}$/;
 const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
 const MAX_BYTES=1048576,MAX_SEGMENTS=4000,MAX_IMAGES=300,MAX_TEXT=220000;
 const fail=reason=>{throw Error('Layout EPUB không hợp lệ: '+reason);};
 const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
 const exact=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===fields.length&&fields.every(k=>own(value,k));
 const id=(value)=>typeof value==='string'&&BOOK.test(value);
 const whitespace=s=>s.replace(/\s+/gu,' ').trim();
 function validate(record,{bookId,revisionId,chapterId,assetIds,chapterText}={}){
  if(!exact(record,['schema','bookId','revisionId','chapterId','segments'])||
   record.schema!==1||!id(record.bookId)||!id(record.chapterId)||typeof record.revisionId!=='string'||
   !REV.test(record.revisionId))fail('schema hoặc ID');
  if(bookId!==undefined&&record.bookId!==bookId||
   revisionId!==undefined&&record.revisionId!==revisionId||
   chapterId!==undefined&&record.chapterId!==chapterId)fail('ID không trùng bản thảo');
  if(!Array.isArray(record.segments)||!record.segments.length||
   record.segments.length>MAX_SEGMENTS)fail('số đoạn');
  const assets=new Set();
  if(assetIds!==undefined){
   if(!Array.isArray(assetIds)||assetIds.length>3000||assetIds.some(a=>!id(a)))fail('bảng ảnh');
   for(const a of assetIds){if(assets.has(a))fail('ID ảnh trùng');assets.add(a);}
  }
  let count=0,totalChars=0,imageCount=0;
  const segments=record.segments.map(x=>{
   if(x?.type==='text'&&exact(x,['type','text'])){
    if(typeof x.text!=='string'||!x.text.trim()||x.text.length>MAX_TEXT||
     /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(x.text))fail('văn bản');
    totalChars+=x.text.length;count++;
    if(totalChars>MAX_TEXT)fail('tổng văn bản quá dài');
    return Object.freeze({type:'text',text:x.text});
   }
   if(x?.type==='image'&&exact(x,['type','assetId','alt'])){
    if(!id(x.assetId)||typeof x.alt!=='string'||x.alt.length>180||
     /[\u0000-\u001F<>]/u.test(x.alt))fail('ảnh');
    if(assetIds!==undefined&&!assets.has(x.assetId))fail('ảnh không thuộc truyện');
    imageCount++;
    if(imageCount>MAX_IMAGES)fail('quá nhiều ảnh trong chương');
    return Object.freeze({type:'image',assetId:x.assetId,alt:x.alt});
   }
   fail('đoạn không được hỗ trợ');
  });
  if(!count)fail('chương không có chữ');
  if(chapterText!==undefined){
   if(typeof chapterText!=='string'||whitespace(chapterText)!==
    whitespace(segments.filter(s=>s.type==='text').map(s=>s.text).join(' ')))
    fail('bố cục không khớp văn bản chương');
  }
  return Object.freeze({schema:1,bookId:record.bookId,revisionId:record.revisionId,
   chapterId:record.chapterId,segments:Object.freeze(segments)});
 }
 async function sha256(buffer,cryptoApi=globalThis.crypto){
  if(!cryptoApi?.subtle?.digest)fail('thiếu bộ kiểm SHA-256');
  const hash=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',buffer));
  return [...hash].map(v=>v.toString(16).padStart(2,'0')).join('');
 }
 async function encodeLayout({bookId,revisionId,chapterId,segments,chapterText,assetIds,cryptoApi=globalThis.crypto}={}){
  const layout=validate({schema:1,bookId,revisionId,chapterId,segments},
   {bookId,revisionId,chapterId,chapterText,assetIds});
  const data=new TextEncoder().encode(JSON.stringify(layout));
  if(data.byteLength>MAX_BYTES)fail('tệp JSON vượt 1 MiB');
  return Object.freeze({layout,data,bytes:data.byteLength,sha256:await sha256(data,cryptoApi)});
 }
 async function decodeLayout(bytes,{bookId,revisionId,chapterId,assetIds,chapterText,expectedBytes,expectedSha256,cryptoApi=globalThis.crypto}={}){
  if(!(bytes instanceof ArrayBuffer)&&!(bytes instanceof Uint8Array))fail('định dạng dữ liệu');
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(!data.byteLength||data.byteLength>MAX_BYTES||
   expectedBytes!==undefined&&data.byteLength!==expectedBytes)fail('dung lượng JSON');
  if(expectedSha256!==undefined&&(!HASH.test(expectedSha256)||
   await sha256(data,cryptoApi)!==expectedSha256))fail('checksum');
  let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}
  catch{fail('JSON hoặc Unicode');}
  const layout=validate(parsed,{bookId,revisionId,chapterId,assetIds,chapterText});
  if(JSON.stringify(layout)!==new TextDecoder('utf-8',{fatal:true}).decode(data))
   fail('dữ liệu không theo định dạng chuẩn');
  return layout;
 }
 /* Safe, optional preview helper. No live-reader binding. Any image must be
  * a Blob from a trusted authenticated fetcher; raw URLs/HTML are rejected.
  * Image object URLs are revoked on cleanup; no text-to-HTML parsing.
  */
 async function renderPreview(container,layout,{fetchImage,doc=container?.ownerDocument,urlApi=globalThis.URL}={}){
  if(!container?.replaceChildren||!doc?.createElement||typeof fetchImage!=='function'||
   typeof urlApi?.createObjectURL!=='function'||typeof urlApi?.revokeObjectURL!=='function')
   fail('thiếu trình hiển thị thử nghiệm an toàn');
  const clean=validate(layout);
  const frag=doc.createDocumentFragment(),urls=[];
  try{
   for(const segment of clean.segments){
    if(segment.type==='text'){
     const p=doc.createElement('p');p.textContent=segment.text;p.style.whiteSpace='pre-wrap';frag.append(p);
    }else{
     const blob=await fetchImage(segment.assetId);
     if(!(blob instanceof Blob)||!MIME.has(blob.type)||!blob.size||blob.size>10*1024*1024)
      fail('ảnh từ máy chủ không hợp lệ');
     const u=urlApi.createObjectURL(blob);urls.push(u);
     const image=doc.createElement('img');
     image.src=u;image.alt=segment.alt;image.loading='lazy';image.decoding='async';
     image.style.maxWidth='100%';frag.append(image);
    }
   }
   container.replaceChildren(frag);
   return Object.freeze({cleanup(){for(const u of urls)urlApi.revokeObjectURL(u);}});
  }catch(e){
   for(const u of urls)urlApi.revokeObjectURL(u);
   throw e;
  }
 }
 return Object.freeze({validate,encodeLayout,decodeLayout,renderPreview,MAX_BYTES});
});
