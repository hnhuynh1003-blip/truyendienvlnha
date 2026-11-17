/* DUDU L6-P2C4 — offline EPUB staged uploader. Not included by index.html.
 * Nothing here can create a Firestore catalog, promote, publish, or delete.
 * All requests require an injected transport and fresh Firebase ID token.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubStageL6P2C4=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
 const REV=/^r-[a-f0-9]{16,32}$/;
 const SHA=/^[a-f0-9]{64}$/;
 const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
 const bad=reason=>{throw Error('L6-P2C4 stage bị từ chối: '+reason);};
 const bytes=value=>value instanceof Uint8Array?value:value instanceof ArrayBuffer?new Uint8Array(value):null;
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const exact=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)&&
  Object.keys(x).length===fields.length&&fields.every(k=>own(x,k));
 async function digest(buffer,cryptoApi){
  if(!cryptoApi?.subtle?.digest)bad('Web Crypto không khả dụng');
  const out=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',buffer));
  return [...out].map(v=>v.toString(16).padStart(2,'0')).join('');
 }
 function expectedEntries({manifest,layouts}){
  if(!exact(manifest,['schema','bookId','revisionId','source','chapters','assets'])||
   manifest.schema!==1||!ID.test(manifest.bookId||'')||!REV.test(manifest.revisionId||'')||
   !Array.isArray(manifest.chapters)||manifest.chapters.length<1||manifest.chapters.length>160||
   !Array.isArray(manifest.assets)||manifest.assets.length>3000||
   !Array.isArray(layouts)||layouts.length!==manifest.chapters.length)bad('manifest');
  const all=[],ids=new Set();
  function add(kind,id,detail,mime,max){
   const key=kind+':'+id;
   if(!ID.test(id||'')||ids.has(key)||!detail||
    !Number.isSafeInteger(detail.bytes)||detail.bytes<1||detail.bytes>max||
    !SHA.test(detail.sha256||'')||typeof mime!=='string')bad('mục '+kind);
   ids.add(key);all.push(Object.freeze({kind,id,bytes:detail.bytes,sha256:detail.sha256,mime}));
  }
  add('original',manifest.bookId,manifest.source,'application/epub+zip',30*1024*1024);
  const lm=new Map();
  for(const layout of layouts){
   if(!exact(layout,['chapterId','bytes','sha256'])||
    !ID.test(layout.chapterId||'')||lm.has(layout.chapterId))bad('layout trùng');
   lm.set(layout.chapterId,layout);
  }
  manifest.chapters.forEach((ch,i)=>{
   if(!exact(ch,['id','title','order','wordCount','bytes','sha256'])||
    ch.order!==i||!lm.has(ch.id))bad('chương thiếu layout');
   add('chapter',ch.id,ch,'text/plain; charset=utf-8',420000);
   add('layout',ch.id,lm.get(ch.id),'application/json; charset=utf-8',1048576);
  });
  for(const asset of manifest.assets){
   if(!exact(asset,['id','role','mime','bytes','sha256'])||
    !['cover','illustration'].includes(asset.role)||!MIME.has(asset.mime))bad('ảnh');
   add('asset',asset.id,asset,asset.mime,10*1024*1024);
  }
  return all;
 }
 async function buildPlan({manifest,layouts,parts,cryptoApi=globalThis.crypto}={}){
  const expected=expectedEntries({manifest,layouts});
  if(!Array.isArray(parts)||parts.length!==expected.length)bad('số tệp không khớp');
  const byKey=new Map();
  for(const part of parts){
   if(!exact(part,['kind','id','data'])||!ID.test(part.id||''))bad('tệp nhập không hợp lệ');
   const key=part.kind+':'+part.id;
   if(byKey.has(key))bad('tệp trùng');byKey.set(key,part);
  }
  const items=[];
  for(const entry of expected){
   const part=byKey.get(entry.kind+':'+entry.id),data=bytes(part?.data);
   if(!data||data.byteLength!==entry.bytes||await digest(data,cryptoApi)!==entry.sha256)
    bad('SHA-256 hoặc kích thước sai: '+entry.kind+':'+entry.id);
   items.push(Object.freeze({...entry,data:new Uint8Array(data)}));
  }
  return Object.freeze({bookId:manifest.bookId,revisionId:manifest.revisionId,
   items:Object.freeze(items),readyForPublication:false,eligibleForDeletion:false});
 }
 /* Bounded sequential staging. The injected transport POSTs to the private
  * Worker with a freshly obtained Firebase token. No stored credentials.
  * In-memory receipts have no publication authority; restarting requires
  * re-validation by the trusted backend before any publication.
  */
 async function stageBatch({plan,start=0,batchSize=4,send,tokenProvider,onProgress,signal,
  cryptoApi=globalThis.crypto}={}){
  if(!plan||!ID.test(plan.bookId||'')||!REV.test(plan.revisionId||'')||
   !Array.isArray(plan.items)||plan.items.length<1||
   !Number.isSafeInteger(start)||start<0||start>plan.items.length||
   !Number.isSafeInteger(batchSize)||batchSize<1||batchSize>8||
   typeof send!=='function'||typeof tokenProvider!=='function')bad('điều kiện tải lên');
  const receipts=[];
  for(let i=start;i<Math.min(plan.items.length,start+batchSize);i++){
   if(signal?.aborted)break;
   const item=plan.items[i];
   if(!ID.test(item.id||'')||!['original','chapter','layout','asset'].includes(item.kind)||
    !SHA.test(item.sha256||'')||!(item.data instanceof Uint8Array)||
    item.data.byteLength!==item.bytes||await digest(item.data,cryptoApi)!==item.sha256)
    bad('tệp đã thay đổi');
   const token=await tokenProvider();
   if(typeof token!=='string'||token.length<100||token.length>12000||
    !/^[A-Za-z0-9_.-]+$/.test(token))bad('không có Firebase ID Token hợp lệ');
   const route='/v1/library/r2/stage/'+item.kind+'/'+plan.bookId+
    (item.kind==='original'?'':'/'+item.id);
   const response=await send({route,method:'POST',mime:item.mime,token,
    body:new Uint8Array(item.data),signal});
   if(!response||response.status!==201||!response.data||
    response.data.publishable!==false||!UUID.test(response.data.uploadId||'')||
    response.data.bytes!==item.bytes||response.data.sha256!==item.sha256)
    bad('Worker chưa xác nhận dữ liệu: '+item.kind+':'+item.id);
   const receipt=Object.freeze({kind:item.kind,id:item.id,uploadId:response.data.uploadId});
   receipts.push(receipt);
   if(typeof onProgress==='function')onProgress(Object.freeze({completed:i+1,total:plan.items.length,
    kind:item.kind,id:item.id}));
  }
  return Object.freeze({receipts:Object.freeze(receipts),next:start+receipts.length,
   completed:start+receipts.length===plan.items.length,
   publishable:false,eligibleForDeletion:false});
 }
 return Object.freeze({buildPlan,stageBatch});
});
