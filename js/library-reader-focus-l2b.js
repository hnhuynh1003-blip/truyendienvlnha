/* L2B: transient reading controls and chapter-only progress.
 * No story/bookmark writes, Auth changes or Firebase dependencies. */
(function(root,factory){
  const api=factory();
  if(root)root.DuduReaderFocusL2B=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root?.document){
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',api.init,{once:true});
    else api.init();
  }
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const HIDE_AFTER_MS=4500;
  let initialized=false,hideTimer=null,lastScrollY=0;

  function chapterProgress(scrollY,paperTop,paperHeight,viewportHeight){
    const y=Number(scrollY),top=Number(paperTop),height=Number(paperHeight),view=Number(viewportHeight);
    if(![y,top,height,view].every(Number.isFinite)||height<=0||view<=0)return 0;
    const distance=Math.max(1,height-view);
    return Math.max(0,Math.min(100,Math.round((y-top)/distance*100)));
  }
  function active(){
    return typeof document!=='undefined'&&document.body.classList.contains('dudu-reading-active')&&
      document.getElementById('reader-view')?.style.display==='block';
  }
  function bar(){return document.getElementById('floating-reading-bar');}
  function visible(){return bar()?.style.display==='flex';}
  function hide(){
    if(hideTimer!==null){clearTimeout(hideTimer);hideTimer=null;}
    const controls=bar();if(controls)controls.style.display='none';
    document.body.classList.remove('dudu-reader-tools-visible');
  }
  function show(){
    if(!active())return false;
    const controls=bar();if(!controls)return false;
    controls.style.display='flex';
    document.body.classList.add('dudu-reader-tools-visible');
    if(hideTimer!==null)clearTimeout(hideTimer);
    hideTimer=setTimeout(hide,HIDE_AFTER_MS);
    return true;
  }
  function updateProgress(scrollY=window.scrollY){
    if(!active())return 0;
    const paper=document.getElementById('reader-paper');if(!paper)return 0;
    const rect=paper.getBoundingClientRect();
    const percent=chapterProgress(scrollY,scrollY+rect.top,rect.height,window.innerHeight);
    const indicator=document.getElementById('reading-bar');
    const label=document.getElementById('reader-quick-progress');
    if(indicator)indicator.style.width=percent+'%';
    if(label)label.textContent=percent+'%';
    return percent;
  }
  function reset(chapterIndex=0,chapterCount=0){
    hide();
    lastScrollY=typeof window!=='undefined'?window.scrollY:0;
    const prev=document.getElementById('reader-quick-prev');
    const next=document.getElementById('reader-quick-next');
    if(prev)prev.disabled=chapterIndex<=0;
    if(next)next.disabled=chapterIndex>=chapterCount-1;
    const label=document.getElementById('reader-quick-progress');
    if(label)label.textContent='0%';
    const indicator=document.getElementById('reading-bar');
    if(indicator)indicator.style.width='0%';
  }
  function onScroll(scrollY,upwardReveal){
    if(!active()){hide();return 0;}
    const y=Math.max(0,Number(scrollY)||0);
    if(upwardReveal)show();
    else if(y-lastScrollY>7)hide();
    lastScrollY=y;
    return updateProgress(y);
  }
  function onPaperClick(event){
    if(!active()||event.target?.closest?.('button,a,input,select,textarea,[role="button"]'))return;
    if(String(window.getSelection?.()||'').trim())return;
    if(visible())hide();else show();
  }
  function init(){
    if(initialized||typeof document==='undefined')return;
    const paper=document.getElementById('reader-paper');
    const settings=document.getElementById('reader-quick-settings');
    if(!paper||!bar()||!settings)return;
    initialized=true;
    paper.addEventListener('click',onPaperClick);
    settings.addEventListener('click',()=>{
      hide();
      window.DuduReaderPreferencesL2C?.toggle();
    });
    document.addEventListener('keydown',event=>{
      if(!active())return;
      if(event.key==='Escape')hide();
      // A keyboard alternative to tapping the prose. Do not steal text fields.
      if(event.key.toLowerCase()==='t'&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&
        !event.target?.closest?.('input,textarea,select,[contenteditable="true"]')){
        if(visible())hide();else show();
      }
    });
  }
  return Object.freeze({chapterProgress,init,reset,onScroll,show,hide,visible,updateProgress});
});
