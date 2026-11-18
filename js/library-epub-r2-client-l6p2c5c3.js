/* DUDU STUDIO L6-P2C5C.3 — REVIEW ONLY. NOT LOADED BY index.html.
 * Reuse DuduEpubStorageL6P1 and the existing V49 reader data shape.
 * No Firestore LIST on client; fetch Worker private catalog and chapter only.
 * No credentials/cache persistence; failed R2 read NEVER falls back to V49.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibraryR2ClientL6P2C5C3=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const BOOK=/^epub-[0-9a-f]{32}$/;
 const CHAPTER=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
 const REV=/^r-[0-9a-f]{32}$/;
 const MAX_CHAPTER_BYTES=420000;
 const LIMIT_PAGES=100;
 const fail=()=>{throw Error('Không thể đọc EPUB R2 hoặc phiên đọc đã thay đổi.');};
 function safeText(s,max,empty=false){return typeof s==='string'&&s.length<=max&&
  (empty||!!s.trim())&&!/[\u0000-\u001F<>]/u.test(s);}
 function mapBook(book){
  if(!book||!BOOK.test(book.id||'')||!safeText(book.title,140)||
   !safeText(book.author,140)||!safeText(book.description,3000,true)||
   !Array.isArray(book.chapters)||book.chapters.length<1||book.chapters.length>160)
   fail();
  const seen=new Set();
  const chapters=book.chapters.map((ch,i)=>{
   if(!CHAPTER.test(ch?.id||'')||seen.has(ch.id)||!safeText(ch.title,140)||
     !Number.isSafeInteger(ch.wordCount)||ch.wordCount<1||ch.wordCount>220000)fail();
   seen.add(ch.id);
   return {id:ch.id,title:ch.title,content:null,wordCount:ch.wordCount,order:i,
    characterIds:[],storyItemIds:[]};
  });
  // Older 3-field drafts are shown as 'Chưa xác định', not fabricated as
  // 'Đang ra'. Full new records retain canonical V49 labels and genre.
  const genre=book.genre===null||book.genre===undefined?'':book.genre;
  const publicationState=book.publicationState===null||book.publicationState===undefined?
   'Chưa xác định':book.publicationState;
  if(!safeText(genre,220,true)||
    !['Đang ra','Hoàn thành','Chưa xác định'].includes(publicationState)||
    ((book.genre===null||book.genre===undefined)!==
     (book.publicationState===null||book.publicationState===undefined))||
    !REV.test(book.revision||''))fail();
  const coverId=book.coverAssetId===undefined?'':book.coverAssetId;
  if(typeof coverId!=='string'||(coverId&&!CHAPTER.test(coverId)))fail();
  const description=book.description;
  // IMPORTANT: _cloudV49 means "use the existing reader layout" only.
  // Empty _ownerUidV49 intentionally disables V49-only edit/archive buttons.
  // Never send an R2 book to epub-production-v49 metadata or chapter writers.
  return {id:book.id,title:book.title,author:book.author,
   status:publicationState,genre,desc:description,
   _cloudV49:true,_r2V1:true,_ownerUidV49:'',coverImage:'',
   _r2CoverAssetId:coverId,
   _r2Revision:book.revision,
   updatedAt:typeof book.updatedAt==='string'?book.updatedAt:'',createdAt:'',
   introData:{title:'VĂN ÁN',code:'ARCHIVE',text:description},
   characters:[],chapters};
 }
 function create({enabled=false,workerBaseUrl,auth,firestoreReader,
  storageAdapter,fetchFn=globalThis.fetch}={}){
  if(typeof enabled!=='boolean'||typeof auth!=='function'||
     typeof firestoreReader!=='function'||typeof storageAdapter?.create!=='function'||
     typeof fetchFn!=='function'||typeof workerBaseUrl!=='string'||
     !/^https:\/\/[^/]+$/i.test(workerBaseUrl))throw Error('R2 adapter chưa được cấu hình an toàn.');
  const base=workerBaseUrl.replace(/\/$/,'');
  let cachedUid=null;
  const chapterTitles=new Map();
  function session(){
   if(!enabled)fail();
   const user=auth()?.currentUser;
   if(!user?.uid||typeof user.getIdToken!=='function')fail();
   if(cachedUid!==user.uid){chapterTitles.clear();cachedUid=user.uid;}
   return user;
  }
  async function authorizedFetch(path,{accept}={}){
   const user=session(),uid=user.uid;
   let token;
   try{token=await user.getIdToken();}catch{fail();}
   if(auth()?.currentUser?.uid!==uid||typeof token!=='string'||token.length<100)fail();
   let response;
   try{response=await fetchFn(base+path,{method:'GET',headers:{Authorization:'Bearer '+token,
     Accept:accept||'application/json'},cache:'no-store',redirect:'error'});}
   catch{fail();}
   if(auth()?.currentUser?.uid!==uid||!response||response.status!==200)fail();
   return response;
  }
  async function listPublished(){
   if(!enabled)fail();
   const uid=session().uid;
   const out=[],ids=new Set();let after='';
   const titles=new Map();
   for(let i=0;i<LIMIT_PAGES;i++){
    const response=await authorizedFetch('/v1/library/r2/catalog/books'+
     (after?'?after='+encodeURIComponent(after):''));
    if(!/application\/json/i.test(response.headers?.get('Content-Type')||''))fail();
    let page;try{page=await response.json();}catch{fail();}
    if(page?.ok!==true||!Array.isArray(page.books)||page.books.length>20)fail();
    for(const raw of page.books){
     const card=mapBook(raw);
     if(ids.has(card.id))fail();ids.add(card.id);
     for(const ch of card.chapters)titles.set(card.id+'/'+ch.id,ch.title);
     out.push(card);
    }
    if(page.nextAfter===null){
     if(page.books.length===20||auth()?.currentUser?.uid!==uid)fail();
     chapterTitles.clear();for(const [k,v] of titles)chapterTitles.set(k,v);
     return out;
    }
    if(!BOOK.test(page.nextAfter||'')||page.books.length!==20||
       page.books.at(-1)?.id!==page.nextAfter||page.nextAfter<=after)fail();
    after=page.nextAfter;
   }
   fail();
  }
  async function r2Reader(bookId,chapterId){
   const uid=session().uid;
   const title=chapterTitles.get(bookId+'/'+chapterId);
   if(!title)fail();
   const response=await authorizedFetch('/v1/library/r2/read/chapter/'+bookId+'/'+chapterId,
    {accept:'text/plain'});
   if(!/^text\/plain(?:\s*;|$)/i.test(response.headers?.get('Content-Type')||''))fail();
   const declared=response.headers?.get('Content-Length');
   if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_CHAPTER_BYTES))fail();
   let buffer;try{buffer=await response.arrayBuffer();}catch{fail();}
   if(auth()?.currentUser?.uid!==uid||!buffer.byteLength||buffer.byteLength>MAX_CHAPTER_BYTES)fail();
   let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{fail();}
   return {title,content};
  }
  const reader=storageAdapter.create({firestoreReader,r2Reader,r2Enabled:enabled});
  async function readChapter(book,chapterId){
   if(!book||!CHAPTER.test(chapterId||''))fail();
   if(book._r2V1===true){
    if(!BOOK.test(book.id||'')||!book.chapters?.some(c=>c.id===chapterId))fail();
    return reader.readChapter(book.id,chapterId,{backend:'r2'});
   }
   return reader.readChapter(book.id,chapterId,{backend:'firestore'});
  }
  return Object.freeze({enabled,listPublished,readChapter});
 }
 return Object.freeze({create,mapBook});
});
