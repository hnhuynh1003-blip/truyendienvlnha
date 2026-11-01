/* C4.43 — ephemeral tab resume, independent of account bookmarks and rewards.
   Never writes to Firestore or touches the existing chapter/EPUB records. */
(function(root,factory){
  const api=factory();
  if(root)root.DuduReadingReturnC443=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const KEY='dudu-reader-current-tab-c443';
  const MAX_AGE=7*24*60*60*1000;
  const HISTORY_MARK='duduReaderBackC443';
  let historyActive=false;

  function remember(storage,owner,novel,chapterIndex,scrollTop,now=Date.now()){
    const chapter=novel?.chapters?.[chapterIndex];
    if(!storage||!owner||!novel?.id||!chapter||!Number.isInteger(chapterIndex))return false;
    const entry={owner:String(owner),storyId:String(novel.id),
      chapterId:chapter.id==null?'':String(chapter.id),chapterIndex,
      scrollTop:Math.max(0,Math.min(10000000,Number(scrollTop)||0)),savedAt:now};
    try{storage.setItem(KEY,JSON.stringify(entry));return true;}catch{return false;}
  }
  function resolve(storage,owner,novels,now=Date.now()){
    let entry;
    try{entry=JSON.parse(storage?.getItem(KEY)||'null');}catch{return null;}
    if(!entry||entry.owner!==owner||typeof entry.storyId!=='string'||
      !Number.isFinite(entry.savedAt)||entry.savedAt>now+60000||
      now-entry.savedAt>MAX_AGE||!Array.isArray(novels))return null;
    const novelIndex=novels.findIndex(n=>n?.id===entry.storyId);
    if(novelIndex<0)return null;
    const novel=novels[novelIndex],chapters=novel.chapters;
    if(!Array.isArray(chapters)||!chapters.length)return null;
    const chapterIndex=entry.chapterId?
      chapters.findIndex(ch=>String(ch?.id||'')===entry.chapterId):
      Number.isInteger(entry.chapterIndex)?entry.chapterIndex:-1;
    if(chapterIndex<0||!chapters[chapterIndex])return null;
    const scrollTop=Number(entry.scrollTop);
    return {novelIndex,chapterIndex,scrollTop:Number.isFinite(scrollTop)?
      Math.max(0,Math.min(10000000,scrollTop)):0};
  }
  function clear(storage){
    try{storage?.removeItem(KEY);return true;}catch{return false;}
  }
  function enterHistory(win){
    if(historyActive)return;
    try{
      if(!win.history.state?.[HISTORY_MARK]){
        win.history.pushState({...win.history.state,[HISTORY_MARK]:true},'',win.location.href);
      }
      historyActive=true;
    }catch{/* Browser restrictions must never prevent reading. */}
  }
  function exitHistory(win,unwind=true){
    if(!historyActive)return;
    historyActive=false;
    try{
      if(!win.history.state?.[HISTORY_MARK])return;
      if(unwind)win.history.back();
      else win.history.replaceState({...win.history.state,[HISTORY_MARK]:false},'',win.location.href);
    }catch{/* Browser history is optional. */}
  }
  function handleBack(win,onReaderBack){
    win.addEventListener('popstate',()=>{
      if(!historyActive)return;
      historyActive=false;
      if(win.document.body.classList.contains('dudu-reading-active'))onReaderBack();
    });
  }
  return Object.freeze({KEY,remember,resolve,clear,enterHistory,exitHistory,handleBack});
});
