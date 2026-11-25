/* Read-only reader bridge. Browser activity is a heuristic, not proof. */
(function(){
 'use strict';
 const clock=window.DuduPersonalReadingClockP2A?.create();
 if(!clock)return;
 const now=()=>performance.now();
 let identity=null,delayUntil=0,lastScroll=0,timer=null;
 const collector=window.DuduPersonalReadingSlotsP2C?.create(),queue=window.DuduPersonalReadingSlotsP2C?.queue();
 let retryAt=0,chapterSlots=0,questDone=false,questPending=false,questRetryAt=0,chapterEpoch=0,lootEligible=false,sessionAward=0;
 const bridge=()=>window.DuduReadingRewardBridgeP2C;
 function flush(uid,force=false){
  if(!bridge()?.ready(uid)||!queue||Date.now()<retryAt)return;
  const ticket=queue.begin(uid,{force});if(!ticket)return;
  Promise.resolve().then(()=>bridge().submit(uid,ticket.slots)).then(result=>{
   if(!queue.settle(ticket,true))return;
   retryAt=0;if(identity?.uid===uid){sessionAward+=result.awardExp||0;renderStatus(clock.snapshot());}
   if(queue.size()>=6)flush(uid);
  }).catch(()=>{if(queue.settle(ticket,false))retryAt=Date.now()+15000;});
 }
 function renderStatus(state){
  const node=document.getElementById('reader-exp-live-p2d');if(!node)return;
  const enabled=!!identity&&bridge()?.ready(identity.uid)===true;
  node.hidden=!enabled;if(!enabled)return;
  const seconds=Math.floor(state.chapterMs/1000),minutes=Math.floor(seconds/60);
  const value='Đọc tích cực '+minutes+'p '+String(seconds%60).padStart(2,'0')+'s · +'+sessionAward+' EXP phiên này'+(state.active?'':' · Tạm dừng');
  if(node.textContent!==value)node.textContent=value;
 }
 const visibleReader=()=>document.getElementById('reader-view')?.style.display==='block';
 const eligible=()=>visibleReader()&&!document.hidden&&document.hasFocus()&&navigator.onLine!==false;
 function stop(){if(identity)flush(identity.uid,true);identity=null;chapterEpoch++;collector?.reset();clock.close();renderStatus(clock.snapshot());if(timer!==null){clearInterval(timer);timer=null;}}
 function pause(){collector?.reset();clock.pause(now());renderStatus(clock.snapshot());if(lootEligible){lootEligible=false;window.dispatchEvent(new Event('dudu-r2-loot-observation-p3'));}}
 function sample(){
  if(!identity)return;
  let uid=null;try{uid=identity.currentUid();}catch(_){}
  if(uid!==identity.uid||!visibleReader()){stop();return;}
  const mono=now(),wall=Date.now();
  const state=clock.sample({at:mono,uid,readerOpen:true,visible:!document.hidden,
   focused:document.hasFocus(),online:navigator.onLine!==false});
  const loot=window.DuduPersonalR2ChapterLootP3;
  const nextLoot=loot?.ENABLED===true&&state.context?.mode==='EPUB_R2'&&state.active&&state.chapterMs>=loot.MIN_ACTIVE_MS;
  if(nextLoot!==lootEligible){lootEligible=nextLoot;window.dispatchEvent(new Event('dudu-r2-loot-observation-p3'));}
  renderStatus(state);
  if(!bridge()?.ready(uid)||!collector||!queue)return;
  const slots=collector.observe({wall,mono,observed:state.observedMs,active:state.active});
  if(slots.length){queue.push(uid,slots);chapterSlots+=slots.length;}
  flush(uid);
  if(chapterSlots>=6&&!questDone&&!questPending&&Date.now()>=questRetryAt){
   const ctx=identity,epoch=chapterEpoch;questPending=true;
   Promise.resolve().then(()=>bridge().quest(uid,ctx.storyId,ctx.chapterId)).then(ok=>{
    if(epoch===chapterEpoch){questDone=ok===true;if(!questDone)questRetryAt=Date.now()+15000;}
   }).catch(()=>{if(epoch===chapterEpoch)questRetryAt=Date.now()+15000;}).finally(()=>{if(epoch===chapterEpoch)questPending=false;});
  }
 }
 function open(ctx){
  if(!ctx?.uid||typeof ctx.currentUid!=='function'){stop();return;}
  if(identity?.uid!==ctx.uid){stop();sessionAward=0;retryAt=0;}
  queue?.bind(ctx.uid);collector?.reset();chapterEpoch++;lootEligible=false;chapterSlots=0;questDone=false;questPending=false;questRetryAt=0;
  identity=ctx;delayUntil=now()+400;lastScroll=window.scrollY;
  clock.open(ctx,now());renderStatus(clock.snapshot());
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
 window.addEventListener('pagehide',()=>{if(identity)flush(identity.uid,true);});
 document.addEventListener('visibilitychange',pause);
 for(const e of ['dudu-auth-state-changed','dudu-account-changed'])window.addEventListener(e,()=>{if(identity&&identity.currentUid()!==identity.uid){stop();queue?.bind(null);}});
 window.DuduPersonalReadingRuntimeP2A=Object.freeze({open,stop,snapshot:()=>clock.snapshot()});
})();
