/* DUDU Studio L6-P2C5C.8 — isolated preview media integration.
 * REVIEW ONLY. This module makes no Firestore writes, grants no permissions,
 * never persists private blobs, and does not change V49 reading / reward code.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduR2PreviewMediaBridgeL6P2C5C8=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fail=()=>{throw Error('R2 media preview unavailable or session changed.');};
 function create({enabled=false,privateMediaApi,workerBaseUrl,auth,fetchFn,
   urlApi,BlobCtor,doc}={}){
  if(enabled!==true||typeof privateMediaApi?.create!=='function'||
    typeof privateMediaApi?.renderSegments!=='function'||
    typeof auth!=='function'||!/^https:\/\/[^/]+$/i.test(workerBaseUrl||''))fail();
  const opts={enabled:true,workerBaseUrl,auth};
  if(fetchFn)opts.fetchFn=fetchFn;
  if(urlApi)opts.urlApi=urlApi;
  if(BlobCtor)opts.BlobCtor=BlobCtor;
  const cards=privateMediaApi.create(opts);
  const hero=privateMediaApi.create(opts);
  const reader=privateMediaApi.create(opts);
  const documentApi=doc||((typeof document!=='undefined')?document:null);
  let disposed=false,cardEpoch=0,heroEpoch=0,chapterEpoch=0,prepared=null;
  const cardHandles=new Set();
  const currentUid=()=>auth()?.currentUser?.uid||null;
  const requireLive=()=>{if(disposed||!currentUid())fail();};
  function clearCovers(){
   cardEpoch++;
   for(const handle of cardHandles)handle.release();
   cardHandles.clear();
   cards.releaseAll();
  }
  function clearHero(){heroEpoch++;hero.releaseAll();}
  function clearChapter(){
   chapterEpoch++;
   reader.releaseAll();
   prepared=null;
  }
  function clearAll(){clearCovers();clearHero();clearChapter();}
  function dispose(){
   if(disposed)return;
   disposed=true;clearAll();
   cards.dispose();hero.dispose();reader.dispose();
  }
  // Called when a catalog page is re-rendered; old detached cards are never
  // written after an outstanding asynchronous private cover request finishes.
  async function loadCardCover(book,coverElement){
   if(!book?._r2V1||!book._r2CoverAssetId)return false;
   requireLive();
   const epoch=cardEpoch,uid=currentUid();
   const handle=await cards.cover(book);
   if(disposed||epoch!==cardEpoch||currentUid()!==uid||
     !coverElement?.appendChild||coverElement.isConnected===false){
    handle.release();return false;
   }
   const image=documentApi.createElement('img');
   image.alt='';image.loading='lazy';image.decoding='async';image.src=handle.url;
   image.addEventListener?.('error',()=>{
    if(cardHandles.delete(handle))handle.release();
    image.remove?.();
    if(coverElement.isConnected!==false){
     coverElement.textContent=(book.title||'').trim().slice(0,1)||'✦';
    }
   });
   coverElement.replaceChildren(image);
   coverElement.removeAttribute?.('aria-hidden');
   cardHandles.add(handle);
   return true;
  }
  async function loadHeroCover(book,heroElement){
   clearHero();
   if(!book?._r2V1||!book._r2CoverAssetId)return false;
   requireLive();
   const epoch=heroEpoch,uid=currentUid();
   const handle=await hero.cover(book);
   if(disposed||epoch!==heroEpoch||currentUid()!==uid||!heroElement?.style){
    handle.release();return false;
   }
   // URL is minted locally, never from a request or from a storage key.
   heroElement.style.backgroundImage='url("'+handle.url+'")';
   return true;
  }
  function isChapterReady(book,chapterId,content){
   return !!(!disposed&&prepared&&prepared.uid===currentUid()&&
     book?._r2V1===true&&book.id===prepared.bookId&&
     book._r2Revision===prepared.revision&&chapterId===prepared.chapterId&&
     typeof content==='string'&&content===prepared.content);
  }
  async function prepareChapter(book,chapterId,content){
   requireLive();
   if(!book?._r2V1||typeof content!=='string'||!content.trim())fail();
   if(isChapterReady(book,chapterId,content))return true;
   clearChapter();
   const epoch=chapterEpoch,uid=currentUid();
   const same=()=>!disposed&&epoch===chapterEpoch&&currentUid()===uid;
   try{
    const layout=await reader.layout(book,chapterId,content);
    if(!same())fail();
    const assetUrls=new Map();
    for(const segment of layout.segments){
     if(segment.type!=='image'||assetUrls.has(segment.assetId))continue;
     const handle=await reader.image(book,segment.assetId);
     if(!same()){handle.release();fail();}
     assetUrls.set(segment.assetId,handle.url);
    }
    if(!same())fail();
    prepared={uid,bookId:book.id,revision:book._r2Revision,chapterId,content,
      layout,assetUrls};
    return true;
   }catch(error){
    if(epoch===chapterEpoch)clearChapter();
    throw error;
   }
  }
  function renderChapter(host,book,chapterId,content,binder){
   requireLive();
   if(!isChapterReady(book,chapterId,content)||typeof binder!=='function')fail();
   // Preserve the V49 display-only rule: if the first complete paragraph is
   // exactly the chapter heading, do not display it twice. The signed/canonical
   // layout and underlying chapter bytes are NOT modified or persisted.
   const title=book.chapters?.find(ch=>ch.id===chapterId)?.title;
   const sameHeading=s=>String(s||'').normalize('NFC').replace(/\s+/gu,' ').trim().replace(/[:：]+$/u,'');
   const first=prepared.layout.segments[0];
   const skipHeading=typeof title==='string'&&first?.type==='text'&&
     sameHeading(first.text)===sameHeading(title);
   const display=skipHeading?
     {...prepared.layout,segments:prepared.layout.segments.slice(1)}:
     prepared.layout;
   return privateMediaApi.renderSegments(host,display,prepared.assetUrls,
     {doc:documentApi,binder});
  }
  return Object.freeze({clearCovers,clearHero,clearChapter,clearAll,dispose,
    loadCardCover,loadHeroCover,isChapterReady,prepareChapter,renderChapter});
 }
 return Object.freeze({create});
});
