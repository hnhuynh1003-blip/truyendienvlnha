/* DUDU Library L6-P2A: R2 EPUB re-upload manifest contract (offline).
 * This module has NO network, Firebase, R2, delete, upload, or auth operations.
 * It must not be treated as server-side authentication or an upload endpoint.
 */
(function (root, factory) {
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubR2ManifestL6P2A=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_CHAPTERS=160, MAX_CHAPTER_BYTES=420000, MAX_EPUB_BYTES=30*1024*1024;
 const MAX_ASSETS=3000, MAX_IMAGE_BYTES=10*1024*1024;
 const idPattern=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
 const shaPattern=/^[a-f0-9]{64}$/;
 const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
 const own=(x,p)=>Object.prototype.hasOwnProperty.call(x,p);
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
 const exact=(x,names)=>plain(x)&&Object.keys(x).length===names.length&&names.every(n=>own(x,n));
 const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const text=(s,max)=>typeof s==='string'&&s.length>=1&&s.length<=max&&!/[\u0000-\u001F<>]/u.test(s);
 const digest=s=>typeof s==='string'&&shaPattern.test(s);
 const issue=s=>{throw Error('Manifest EPUB R2 không hợp lệ: '+s);};
 function validate(input){
  if(!exact(input,['schema','bookId','revisionId','source','chapters','assets']))
   issue('thiếu hoặc có trường không được phép');
  if(input.schema!==1)issue('phiên bản schema');
  if(!idPattern.test(input.bookId)||typeof input.bookId!=='string')issue('bookId');
  if(typeof input.revisionId!=='string'||!/^r-[a-f0-9]{16,32}$/.test(input.revisionId))issue('revisionId');
  if(!exact(input.source,['name','bytes','sha256'])||!text(input.source.name,180)||
    !/\.epub$/i.test(input.source.name)||!integer(input.source.bytes,1,MAX_EPUB_BYTES)||
    !digest(input.source.sha256))issue('EPUB gốc');
  if(!Array.isArray(input.chapters)||!input.chapters.length||input.chapters.length>MAX_CHAPTERS)issue('số chương');
  if(!Array.isArray(input.assets)||input.assets.length>MAX_ASSETS)issue('ảnh EPUB');
  const ids=new Set();
  const chapters=input.chapters.map((ch,i)=>{
   if(!exact(ch,['id','title','order','wordCount','bytes','sha256'])||
      typeof ch.id!=='string'||!idPattern.test(ch.id)||ids.has(ch.id)||
      !text(ch.title,140)||!integer(ch.order,0,MAX_CHAPTERS-1)||ch.order!==i||
      !integer(ch.wordCount,1,220000)||!integer(ch.bytes,1,MAX_CHAPTER_BYTES)||
      !digest(ch.sha256))issue('chương thứ '+(i+1));
   ids.add(ch.id);
   return Object.freeze({...ch});
  });
  const assetIds=new Set(),assets=input.assets.map((a,i)=>{
   if(!exact(a,['id','role','mime','bytes','sha256'])||
      typeof a.id!=='string'||!idPattern.test(a.id)||assetIds.has(a.id)||
      !['cover','illustration'].includes(a.role)||!MIME.has(a.mime)||
      !integer(a.bytes,1,MAX_IMAGE_BYTES)||!digest(a.sha256))issue('hình ảnh thứ '+(i+1));
   assetIds.add(a.id);return Object.freeze({...a});
  });
  if(assets.filter(x=>x.role==='cover').length>1)issue('trùng ảnh bìa');
  return Object.freeze({
   schema:1,bookId:input.bookId,revisionId:input.revisionId,
   source:Object.freeze({...input.source}),
   chapters:Object.freeze(chapters),assets:Object.freeze(assets)
  });
 }
 function compareDeclaredReceipts(manifest,receipts){
  // Caller-provided receipts are untrusted. This helper compares metadata
  // only: it NEVER authorizes a cutover, publication or deletion.
  const parsed=validate(manifest);
  if(!Array.isArray(receipts))return Object.freeze({matching:false,eligibleForDeletion:false,missing:['Biên nhận kiểm tra R2 không hợp lệ']});
  const keys=new Map();
  for(const r of receipts){
   if(!plain(r)||typeof r.kind!=='string'||typeof r.id!=='string'||
      !digest(r.sha256)||!Number.isSafeInteger(r.bytes)||r.bytes<=0||
      r.verified!==true)return Object.freeze({matching:false,eligibleForDeletion:false,missing:['Biên nhận chưa được xác minh']});
   const key=r.kind+':'+r.id;
   if(keys.has(key))return Object.freeze({matching:false,eligibleForDeletion:false,missing:['Biên nhận trùng']});
   keys.set(key,r);
  }
  const needed=[
   {kind:'original',id:parsed.bookId,bytes:parsed.source.bytes,sha256:parsed.source.sha256},
   ...parsed.chapters.map(x=>({kind:'chapter',id:x.id,bytes:x.bytes,sha256:x.sha256})),
   ...parsed.assets.map(x=>({kind:'asset',id:x.id,bytes:x.bytes,sha256:x.sha256}))
  ];
  const missing=[];
  for(const r of needed){
   const actual=keys.get(r.kind+':'+r.id);
   if(!actual||actual.bytes!==r.bytes||actual.sha256!==r.sha256)
    missing.push(r.kind+':'+r.id);
  }
  return Object.freeze({matching:missing.length===0,eligibleForDeletion:false,missing:Object.freeze(missing)});
 }
 return Object.freeze({validate,compareDeclaredReceipts,MAX_CHAPTERS,MAX_CHAPTER_BYTES,MAX_EPUB_BYTES});
});
