/* V56.8: Firebase-UID-scoped reading position and built-in phone appearance.
 * User photos and private IndexedDB media remain device-only.
 * Existing V55/V56 local reading keys remain unchanged.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalSyncV568=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const validStory=id=>typeof id==='string'&&id.length>0&&id.length<=160&&
  !['__proto__','prototype','constructor'].includes(id);
 const WALLPAPERS=new Set(['midnight','sakura','astral','jade',
  'world-xianxia','world-modern','world-cyberpunk','world-gothic',
  'v34-night','v34-room','v34-sakura','v34-neon','v37-sakura','v37-city-rain',
  'v37-city-night']);
 const FONTS=new Set(['be','quicksand','nunito','serif']);
 const SIZES=new Set(['small','normal','large']);
 const THEMES=new Set(['default','warm','oled']);
 const DATE_MAX=4102444800000;
 function cleanBookmark(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const chIdx=Number(value.chIdx);
  if(!Number.isSafeInteger(chIdx)||chIdx<0||chIdx>100000)return null;
  const chapterId=typeof value.chapterId==='string'&&value.chapterId.length<=160?
   value.chapterId:'';
  const scrollTop=Number(value.scrollTop);
  const updatedAt=Number(value.updatedAt);
  return {chIdx,chapterId,
   scrollTop:Number.isFinite(scrollTop)?Math.max(0,Math.min(1e7,Math.floor(scrollTop))):0,
   updatedAt:Number.isFinite(updatedAt)&&updatedAt>0&&updatedAt<DATE_MAX?
    Math.floor(updatedAt):0};
 }
 function safeBookmarks(map){
  const result={};
  if(!map||typeof map!=='object'||Array.isArray(map))return result;
  for(const [storyId,position] of Object.entries(map).slice(0,200)){
   const parsed=cleanBookmark(position);
   if(validStory(storyId)&&parsed)Object.defineProperty(result,storyId,
    {value:parsed,enumerable:true,writable:true,configurable:true});
  }
  return result;
 }
 function localBookmark(storage,key){
  if(!key)return null;
  try{return cleanBookmark(JSON.parse(storage.getItem(key)||'null'));}
  catch(_){return null;}
 }
 function cleanAppearance(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  return {
   wallpaper:WALLPAPERS.has(value.wallpaper)?value.wallpaper:'midnight',
   mode:value.mode==='world'?'world':'personal',
   font:FONTS.has(value.font)?value.font:'be',
   size:SIZES.has(value.size)?value.size:'normal',
   readerFontSize:[16,18,21].includes(Number(value.readerFontSize))?Number(value.readerFontSize):16,
   theme:THEMES.has(value.theme)?value.theme:'default',
   updatedAt:Number.isFinite(Number(value.updatedAt))&&Number(value.updatedAt)>0&&
     Number(value.updatedAt)<DATE_MAX?Math.floor(Number(value.updatedAt)):0
  };
 }
 function bookmarkForNovel(saved,novel){
  const value=cleanBookmark(saved);
  if(!value||!Array.isArray(novel?.chapters))return null;
  const chapters=novel.chapters;
  if(value.chapterId){
   const idx=chapters.findIndex(ch=>ch?.id===value.chapterId);
   if(idx>=0)return {...value,chIdx:idx};
   // A known deleted chapter must not accidentally resume a different one.
   return null;
  }
  return chapters[value.chIdx]?value:null;
 }
 function captureChapter(novel,chIdx,scrollTop=0){
  const chapter=novel?.chapters?.[chIdx];
  if(!validStory(novel?.id)||!chapter||!Number.isInteger(chIdx))return null;
  return cleanBookmark({chIdx,chapterId:String(chapter.id||'').slice(0,160),
   scrollTop,updatedAt:Date.now()});
 }
 function hydrateBookmarks(storage,profile,novels,keyFor){
  const cloud=safeBookmarks(profile.readingBookmarksV568);
  let migrated=false;
  for(const novel of novels||[]){
   if(!validStory(novel?.id))continue;
   const key=keyFor(novel.id);
   const local=localBookmark(storage,key);
   const remote=bookmarkForNovel(cloud[novel.id],novel);
   if(remote){
    // Cloud authority for cross-device resume, but preserve newer local edits.
    if(!local||remote.updatedAt>=local.updatedAt){
     try{storage.setItem(key,JSON.stringify(remote));}catch(_){}
    }else{cloud[novel.id]=local;migrated=true;}
   }else if(!cloud[novel.id]&&local){
    cloud[novel.id]=local;migrated=true;
   }
  }
  profile.readingBookmarksV568=cloud;
  return migrated;
 }
 return Object.freeze({cleanBookmark,safeBookmarks,localBookmark,cleanAppearance,
  bookmarkForNovel,captureChapter,hydrateBookmarks,WALLPAPERS});
});
