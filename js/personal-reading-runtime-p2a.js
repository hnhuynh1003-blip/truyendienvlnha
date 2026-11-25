/* Read-only reader bridge. Browser activity is a heuristic, not proof. */
(function(){
 'use strict';
 const clock=window.DuduPersonalReadingClockP2A?.create();
 if(!clock)return;
 const now=()=>performance.now();
 let identity=null,delayUntil=0,lastScroll=0,timer=null;
 const visibleReader=()=>document.getElementById('reader-view')?.style.display==='block';
 const eligible=()=>visibleReader()&&!document.hidden&&document.hasFocus()&&navigator.onLine!==false;
 function stop(){identity=null;clock.close();if(timer!==null){clearInterval(timer);timer=null;}}
 function pause(){clock.pause(now());}
 function sample(){
  if(!identity)return;
  let uid=null;try{uid=identity.currentUid();}catch(_){}
  if(uid!==identity.uid||!visibleReader()){stop();return;}
  clock.sample({at:now(),uid,readerOpen:true,visible:!document.hidden,
   focused:document.hasFocus(),online:navigator.onLine!==false});
 }
 function open(ctx){
  if(!ctx?.uid||typeof ctx.currentUid!=='function'){stop();return;}
  if(identity?.uid!==ctx.uid)stop();
  identity=ctx;delayUntil=now()+400;lastScroll=window.scrollY;
  clock.open(ctx,now());
  if(timer===null)timer=setInterval(sample,1000);
 }
 function input(event){
  if(!identity||!event.isTrusted||now()<delayUntil||!eligible())return;
  const content=document.getElementById('reader-content');
  if(!content)return;
  if(event.type==='scroll'){
   const y=window.scrollY,diff=Math.abs(y-lastScroll);lastScroll=y;
   if(diff<12)return;
   // Ignore scrolling outside the actual reading area.
   const r=content.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight)return;
  }else if(event.type==='keydown'){
   if(!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))return;
   if(event.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
  }else if(!content.contains(event.target))return;
  clock.activity(now());
 }
 for(const e of ['scroll','pointerup','keydown'])window.addEventListener(e,input,{passive:true});
 for(const e of ['blur','offline','pagehide'])window.addEventListener(e,pause);
 document.addEventListener('visibilitychange',pause);
 for(const e of ['dudu-auth-state-changed','dudu-account-changed'])window.addEventListener(e,()=>{if(identity&&identity.currentUid()!==identity.uid)stop();});
 window.DuduPersonalReadingRuntimeP2A=Object.freeze({open,stop,snapshot:()=>clock.snapshot()});
})();
