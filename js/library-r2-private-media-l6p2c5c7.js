/* DUDU Studio L6-P2C5C.7 — PRIVATE MEDIA PREVIEW ADAPTER. REVIEW ONLY.
 * No public R2 keys, no remote <img src>, no persistent credential storage.
 * The Worker is the authorization and content-hash authority on every GET.
 * Do NOT attach to the deployed reader without Codex browser/identity QA.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduR2PrivateMediaL6P2C5C7=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BOOK=/^epub-[0-9a-f]{32}$/;
 const REV=/^r-[0-9a-f]{32}$/;
 const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
 const MIME=new Set(['image/png','image/jpeg','image/webp','image/gif']);
 const IMAGE_MAX=10*1024*1024,LAYOUT_MAX=1048576,MAX_IMAGE_URLS=40;
 const broken=()=>{throw Error('Ảnh hoặc bố cục EPUB R2 chưa được xác minh.');};
 const collapsed=x=>x.replace(/\s+/gu,' ').trim();
 function validateBook(book){
  if(!book||book._r2V1!==true||!BOOK.test(book.id||'')||!REV.test(book._r2Revision||''))broken();
  return book;
 }
 function signature(bytes,mime){
  const b=new Uint8Array(bytes);
  if(mime==='image/png')return b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  if(mime==='image/jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  if(mime==='image/gif')return b.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)));
  return mime==='image/webp'&&b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&
   String.fromCharCode(...b.slice(8,12))==='WEBP';
 }
 function parseLayout(bytes,{bookId,revisionId,chapterId,chapterText}){
  if(!(bytes instanceof ArrayBuffer)||!bytes.byteLength||bytes.byteLength>LAYOUT_MAX||
    typeof chapterText!=='string')broken();
  let raw,v;
  try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);v=JSON.parse(raw);}
  catch{broken();}
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==
    'bookId,chapterId,revisionId,schema,segments'||v.schema!==1||v.bookId!==bookId||
    v.revisionId!==revisionId||v.chapterId!==chapterId||!Array.isArray(v.segments)||
    !v.segments.length||v.segments.length>4000)broken();
  let count=0,length=0,images=0;
  const segments=v.segments.map(s=>{
   if(s?.type==='text'&&Object.keys(s).sort().join(',')==='text,type'){
    if(typeof s.text!=='string'||!s.text.trim()||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(s.text))broken();
    count++;length+=s.text.length;
    if(length>220000)broken();
    return {type:'text',text:s.text};
   }
   if(s?.type==='image'&&Object.keys(s).sort().join(',')==='alt,assetId,type'){
    if(!ID.test(s.assetId||'')||typeof s.alt!=='string'||s.alt.length>180||
      /[\u0000-\u001F<>]/u.test(s.alt))broken();
    if(++images>300)broken();
    return {type:'image',assetId:s.assetId,alt:s.alt};
   }
   broken();
  });
  if(!count||collapsed(segments.filter(s=>s.type==='text').map(s=>s.text).join(' '))!==
    collapsed(chapterText))broken();
  // Mirror the canonical server layout's strict, deterministic JSON encoding.
  if(JSON.stringify({schema:1,bookId,revisionId,chapterId,segments})!==raw)broken();
  return Object.freeze({schema:1,bookId,revisionId,chapterId,segments});
 }
 function create({enabled=false,workerBaseUrl,auth,fetchFn=globalThis.fetch,
    urlApi=globalThis.URL,BlobCtor=globalThis.Blob}={}){
  if(typeof enabled!=='boolean'||typeof workerBaseUrl!=='string'||
    !/^https:\/\/[^/]+$/i.test(workerBaseUrl)||typeof auth!=='function'||
    typeof fetchFn!=='function'||typeof urlApi?.createObjectURL!=='function'||
    typeof urlApi?.revokeObjectURL!=='function'||typeof BlobCtor!=='function')broken();
  const base=workerBaseUrl.replace(/\/$/,'');
  let ownerUid=null,disposed=false,unsubscribe=null;
  const tracked=new Set();
  function releaseAll(){for(const url of tracked)urlApi.revokeObjectURL(url);tracked.clear();}
  function dispose(){
   if(disposed)return;
   disposed=true;releaseAll();
   if(typeof unsubscribe==='function'){const fn=unsubscribe;unsubscribe=null;fn();}
  }
  function user(){
   if(!enabled||disposed)broken();
   const current=auth()?.currentUser;
   if(!current?.uid||typeof current.getIdToken!=='function')broken();
   if(ownerUid!==null&&ownerUid!==current.uid){releaseAll();disposed=true;broken();}
   if(ownerUid===null)ownerUid=current.uid;
   return current;
  }
  function sameUser(uid){return !disposed&&ownerUid===uid&&auth()?.currentUser?.uid===uid;}
  async function authorizedGet(path,mime){
   const identity=user(),uid=identity.uid;
   let token;try{token=await identity.getIdToken();}catch{broken();}
   if(!sameUser(uid)||typeof token!=='string'||token.length<100)broken();
   let response;try{response=await fetchFn(base+path,{method:'GET',headers:{
    Authorization:'Bearer '+token,Accept:mime},cache:'no-store',redirect:'error'});}
   catch{broken();}
   if(!sameUser(uid)||response?.status!==200)broken();
   const type=(response.headers?.get('Content-Type')||'').split(';')[0].trim().toLowerCase();
   if(mime==='application/json' ? type!=='application/json' : !MIME.has(type))broken();
   const max=mime==='application/json'?LAYOUT_MAX:IMAGE_MAX;
   const size=response.headers?.get('Content-Length');
   if(size!==null&&(!/^\d+$/.test(size)||Number(size)>max))broken();
   let bytes;try{bytes=await response.arrayBuffer();}catch{broken();}
   if(!sameUser(uid)||!(bytes instanceof ArrayBuffer)||!bytes.byteLength||bytes.byteLength>max)broken();
   if(mime!=='application/json'&&!signature(bytes,type))broken();
   return {bytes,type};
  }
  async function image(book,assetId){
   validateBook(book);
   if(!ID.test(assetId||'')||tracked.size>=MAX_IMAGE_URLS)broken();
   const uid=user().uid;
   const path='/v1/library/r2/read/asset/'+book.id+'/'+assetId;
   const {bytes,type}=await authorizedGet(path,'image/*');
   if(!sameUser(uid))broken();
   const url=urlApi.createObjectURL(new BlobCtor([bytes],{type}));
   if(!sameUser(uid)){urlApi.revokeObjectURL(url);broken();}
   tracked.add(url);
   return Object.freeze({url,mime:type,release(){if(tracked.delete(url))urlApi.revokeObjectURL(url);}});
  }
  async function cover(book){
   validateBook(book);
   if(!ID.test(book._r2CoverAssetId||''))broken();
   return image(book,book._r2CoverAssetId);
  }
  async function layout(book,chapterId,chapterText){
   validateBook(book);
   if(!ID.test(chapterId||'')||!book.chapters?.some(ch=>ch.id===chapterId))broken();
   const {bytes}=await authorizedGet('/v1/library/r2/read/layout/'+book.id+'/'+chapterId,'application/json');
   return parseLayout(bytes,{bookId:book.id,revisionId:book._r2Revision,chapterId,chapterText});
  }
  // Firebase auth sign-out/switch revokes local blob URLs without waiting for
  // another asset GET. If an adapter has no auth observer, the caller MUST
  // explicitly dispose when it is told access has been revoked.
  const authInstance=auth();
  if(typeof authInstance?.onAuthStateChanged==='function')
   unsubscribe=authInstance.onAuthStateChanged(next=>{
    if(ownerUid!==null&&next?.uid!==ownerUid)dispose();
   });
  // Caller must also dispose on page exit, route failure and book switch.
  return Object.freeze({cover,image,layout,releaseAll,dispose});
 }
 // Only DOM helper. Caller must supply the existing name binder and a safe
 // document. Rendering does not fetch images: caller provides local blob URLs.
 function renderSegments(host,layout,assetUrls,{doc,binder}={}){
  if(!host?.replaceChildren||!doc?.createElement||!Array.isArray(layout?.segments)||
    typeof binder!=='function'||!(assetUrls instanceof Map))broken();
  const nodes=[];
  for(const segment of layout.segments){
   if(segment.type==='text'){
    const p=doc.createElement('p');binder(p,segment.text);nodes.push(p);
   }else if(segment.type==='image'){
    const safe=assetUrls.get(segment.assetId);
    if(typeof safe!=='string'||!safe.startsWith('blob:'))broken();
    const img=doc.createElement('img');img.src=safe;img.alt=segment.alt;
    img.loading='lazy';img.referrerPolicy='no-referrer';img.style.maxWidth='100%';
    nodes.push(img);
   }else broken();
  }
  host.replaceChildren(...nodes);
  return nodes.length;
 }
 return Object.freeze({create,parseLayout,renderSegments});
});
