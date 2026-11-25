/* Read-only reader bridge. Browser activity is a heuristic, not proof. */
(function(){
 'use strict';
 const clock=window.DuduPersonalReadingClockP2A?.create();
 if(!clock)return;
 const now=()=>performance.now();
 let identity=null,delayUntil=0,lastScroll=0,timer=null;
 const collector=window.DuduPersonalReadingSlotsP2C?.create(),queue=window.DuduPersonalReadingSlotsP2C?.queue();
 let retryAt=0,chapterSlots=0,questDone=false,questPending=false,chapterEpoch=0;
 const bridge=()=>window.DuduReadingRewardBridgeP2C;
 function flush(uid,force=false){
  if(!bridge()?.ready(uid)||!queue||Date.now()<retryAt)return;
  const ticket=queue.begin(uid,{force});if(!ticket)return;
  Promise.resolve().then(()=>bridge().submit(uid,ticket.slots)).then(()=>{
   queue.settle(ticket,true);retryAt=0;
  }).catch(()=>{queue.settle(ticket,false);retryAt=Date.now()+15000;});
 }
 const visibleReader=()=>document.getElementById('reader-view')?.style.display==='block';
 const eligible=()=>visibleReader()&&!document.hidden&&document.hasFocus()&&navigator.onLine!==false;
 function stop(){if(identity)flush(identity.uid,true);identity=null;chapterEpoch++;collector?.reset();clock.close();if(timer!==null){clearInterval(timer);timer=null;}}
 function pause(){collector?.reset();clock.pause(now());}
 function sample(){
  if(!identity)return;
  let uid=null;try{uid=identity.currentUid();}catch(_){}
  if(uid!==identity.uid||!visibleReader()){stop();return;}
  const mono=now(),wall=Date.now();
  const state=clock.sample({at:mono,uid,readerOpen:true,visible:!document.hidden,
   focused:document.hasFocus(),online:navigator.onLine!==false});
  if(!bridge()?.ready(uid)||!collector||!queue)return;
  const slots=collector.observe({wall,mono,observed:state.observedMs,active:state.active});
  if(slots.length){queue.push(uid,slots);chapterSlots+=slots.length;}
  flush(uid);
  if(chapterSlots>=6&&!questDone&&!questPending){
   const ctx=identity,epoch=chapterEpoch;questPending=true;
   Promise.resolve().then(()=>bridge().quest(uid,ctx.storyId,ctx.chapterId)).then(ok=>{
    if(epoch===chapterEpoch)questDone=ok===true;
   }).catch(()=>{}).finally(()=>{if(epoch===chapterEpoch)questPending=false;});
  }
 }
 function open(ctx){
  if(!ctx?.uid||typeof ctx.currentUid!=='function'){stop();return;}
  if(identity?.uid!==ctx.uid)stop();
  queue?.bind(ctx.uid);collector?.reset();chapterEpoch++;chapterSlots=0;questDone=false;questPending=false;
  identity=ctx;delayUntil=now()+400;lastScroll=window.scrollY;
  clock.open(ctx,now());
  if(timer===null)timer=setInterval(sample,1000);
 }
 function input(event){
  if(!identity||!event.isTrusted||!eligible())return;
  if(now()<delayUntil){lastScroll=window.scrollY;return;}
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
 for(const e of ['dudu-auth-state-changed','dudu-account-changed'])window.addEventListener(e,()=>{if(identity&&identity.currentUid()!==identity.uid){stop();queue?.bind(null);}});
 window.DuduPersonalReadingRuntimeP2A=Object.freeze({open,stop,snapshot:()=>clock.snapshot()});
})();
