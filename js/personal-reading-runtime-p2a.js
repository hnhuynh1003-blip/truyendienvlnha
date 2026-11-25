/* Read-only reader bridge. Browser activity is a heuristic, not proof. */
(function(){
 'use strict';
 const clock=window.DuduPersonalReadingClockP2A?.create();
 if(!clock)return;
 const now=()=>performance.now();
 let identity=null,delayUntil=0,lastScroll=0,timer=null;
 const collector=window.DuduPersonalReadingSlotsP2C?.create();
 const queue=window.DuduPersonalReadingSlotsP2C?.queue({
  policyId:window.DuduPersonalReadingPolicyP2C?.policy.id,
  onStatus:status=>window.dispatchEvent(new CustomEvent('dudu-reading-pending-status',{detail:status}))
 });
 let chapterSlots=0,questDone=false,questPending=false,questRetryAt=0,chapterEpoch=0,lootEligible=false,sessionAward=0;
 let boundUid=null,pumping=false;
 const retries=new Map(),recovering=new Map();
 const bridge=()=>window.DuduReadingRewardBridgeP2C;
 const currentUid=()=>{try{return window.DuduAuth?.uid()||null;}catch(_){return null;}};
 function retryState(uid){
  if(!retries.has(uid))retries.set(uid,{at:0,failures:0,reason:null});
  return retries.get(uid);
 }
 function bindAccount(uid){
  if(boundUid!==uid){
   boundUid=uid;queue?.bind(uid);
   markRecovery(uid);
  }
 }
 function markRecovery(uid){
  if(!uid||boundUid!==uid)return;
  const slots=new Set(queue?.eligibleSlots()||[]);
  if(slots.size)recovering.set(uid,slots);else recovering.delete(uid);
 }
 function needsRecovery(uid){
  const slots=recovering.get(uid);if(!slots)return false;
  for(const slot of slots){if(queue?.isEligible(slot))return true;slots.delete(slot);}
  recovering.delete(uid);return false;
 }
 function blocked(uid){return now()<retryState(uid).at;}
 function failed(uid,error){
  const state=retryState(uid),reason=error?.reason||String(error?.code||'').replace(/^firestore\//,'');
  state.reason=reason||'transient';
  state.failures=Math.min(state.failures+1,7);
  const permanent=['invalid-profile','invalid-reading-history','policy-migration-required','explicit-policy-required','profile-missing',
   'permission-denied','unauthenticated','invalid-account','account-changed','reading-disabled'].includes(reason);
  state.at=now()+(permanent?300000:reason==='clock-backwards'?60000:Math.min(300000,5000*2**(state.failures-1)));
 }
 async function flush(uid,force=false){
  if(pumping||!uid||currentUid()!==uid||navigator.onLine===false||!bridge()?.ready(uid)||!queue||blocked(uid))return;
  bindAccount(uid);
  const pending=queue.status();
  if(!pending.runnable||!force&&!pending.probing&&pending.runnable<6)return;
  pumping=true;renderStatus(clock.snapshot());
  const submit=async()=>{
   if(currentUid()!==uid||!bridge()?.ready(uid))return;
   const ticket=queue.begin(uid,{force,recovery:recovering.get(uid)});if(!ticket)return;
   try{
    const result=await bridge().submit(uid,ticket.slots);
    if(currentUid()!==uid||!bridge()?.ready(uid)){queue.settle(ticket,null);return;}
    if(!['applied','already-credited'].includes(result?.status))throw Error('unconfirmed-reading-result');
    if(!queue.settle(ticket,result))return;
    retries.set(uid,{at:0,failures:0,reason:null});
    const recovery=recovering.get(uid);
    if(recovery)for(const slot of ticket.slots)recovery.delete(slot);
    needsRecovery(uid);
    if(identity?.uid===uid)sessionAward+=result.awardExp||0;
   }catch(error){
    if(error?.reason==='invalid-reading-window'){
     queue.rejectWindow(ticket);
     markRecovery(uid);
    }else{
     queue.settle(ticket,null);markRecovery(uid);
     if(currentUid()===uid)failed(uid,error);
    }
   }
  };
  try{
   if(navigator.locks?.request){
    try{await navigator.locks.request('dudu-reading-submit:'+uid,{ifAvailable:true},lock=>lock?submit():undefined);}
    catch(_){await submit();}
   }else await submit();
  }finally{pumping=false;renderStatus(clock.snapshot());}
 }
 function retry(){
  const uid=currentUid();bindAccount(uid);queue?.maintain();
  if(uid)void flush(uid,needsRecovery(uid));
  renderStatus(clock.snapshot());
 }
 // Cheap cached tick; storage enumeration is event-driven or bounded to five minutes.
 setInterval(retry,1000);
 window.addEventListener('online',retry);
 window.addEventListener('storage',event=>{queue?.storageEvent(event);retry();});
 function renderStatus(state){
  const node=document.getElementById('reader-exp-live-p2d');if(!node)return;
  const enabled=!!identity&&currentUid()===identity.uid;
  node.hidden=!enabled;if(!enabled)return;
  const pending=queue?.status(),retry=retryState(identity.uid);
  const seconds=Math.floor((state.chapterMs||0)/1000),minutes=Math.floor(seconds/60);
  let sync=pumping?'\u0110ang \u0111\u1ed3ng b\u1ed9':!bridge()?.ready(identity.uid)?'Ch\u1edd x\u00e1c th\u1ef1c':navigator.onLine===false?'Ngo\u1ea1i tuy\u1ebfn':
   now()<retry.at?'Ch\u1edd th\u1eed l\u1ea1i':pending?.held?'C\u00f3 kho\u1ea3ng \u0111\u1ecdc c\u1ea7n th\u1eed l\u1ea1i':pending?.pending?'Ch\u1edd \u0111\u1ed3ng b\u1ed9':'\u0110\u00e3 \u0111\u1ed3ng b\u1ed9';
  // Pending time is never converted to candidate EXP in the UI.
  const warnings=[];
  if(pending&&!pending.durable)warnings.push('L\u1ed7i l\u01b0u tr\u00ean m\u00e1y - ch\u01b0a b\u1ea3o \u0111\u1ea3m kh\u00f4i ph\u1ee5c');
  if(pending?.expired)warnings.push('H\u1ebft h\u1ea1n: '+pending.expired+' kho\u1ea3ng');
  if(pending?.overflow)warnings.push('\u0110\u1ea7y h\u00e0ng \u0111\u1ee3i: '+pending.overflow+' kho\u1ea3ng ch\u01b0a l\u01b0u');
  if(pending?.corrupt)warnings.push('D\u1eef li\u1ec7u l\u1ed7i: '+pending.corrupt+' kho\u1ea3ng');
  if(retry.reason&&['permission-denied','unauthenticated','invalid-account','account-changed'].includes(retry.reason))sync='C\u1ea7n x\u00e1c th\u1ef1c/quy\u1ec1n truy c\u1eadp';
  if(retry.reason&&['invalid-profile','invalid-reading-history','policy-migration-required','explicit-policy-required','profile-missing'].includes(retry.reason))sync='C\u1ea7n ki\u1ec3m tra h\u1ed3 s\u01a1/ch\u00ednh s\u00e1ch';
  if(retry.reason==='clock-backwards'||pending?.issues.includes('clock-rollback'))warnings.push('Ki\u1ec3m tra \u0111\u1ed3ng h\u1ed3 thi\u1ebft b\u1ecb');
  const value=(state.active?'\u0110ang \u0111\u1ecdc ':'T\u1ea1m d\u1eebng ')+minutes+'p '+String(seconds%60).padStart(2,'0')+'s - +'+sessionAward+' EXP \u0111\u00e3 x\u00e1c nh\u1eadn'+
   ' - Ch\u1edd \u0111\u1ed3ng b\u1ed9 '+(pending?.pending||0)*10+'s - '+sync+(warnings.length?' - '+warnings.join(' - '):'');
  if(node.textContent!==value)node.textContent=value;
  node.dataset.readingState=state.active?'active':'paused';
  node.dataset.syncState=pumping?'syncing':warnings.length||retry.reason||pending?.held?'error':pending?.pending?'pending':'committed';
 }
 const visibleReader=()=>document.getElementById('reader-view')?.style.display==='block';
 const eligible=()=>visibleReader()&&!document.hidden&&document.hasFocus()&&navigator.onLine!==false;
 function stop(){if(identity){markRecovery(identity.uid);void flush(identity.uid,needsRecovery(identity.uid));}identity=null;chapterEpoch++;collector?.reset();clock.close();renderStatus(clock.snapshot());if(timer!==null){clearInterval(timer);timer=null;}}
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
  if(slots.length){queue.push(uid,slots);chapterSlots+=slots.length;renderStatus(state);}
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
  if(identity?.uid!==ctx.uid){stop();sessionAward=0;}
  bindAccount(ctx.uid);collector?.reset();chapterEpoch++;lootEligible=false;chapterSlots=0;questDone=false;questPending=false;questRetryAt=0;
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
 window.addEventListener('pagehide',()=>{if(identity){markRecovery(identity.uid);void flush(identity.uid,needsRecovery(identity.uid));}});
 document.addEventListener('visibilitychange',pause);
 for(const e of ['dudu-auth-state-changed','dudu-account-changed'])window.addEventListener(e,()=>{
  if(identity&&identity.currentUid()!==identity.uid)stop();
  // An auth notification may release an authentication rejection, never transient backoff.
  const state=retries.get(currentUid());
  if(state&&['permission-denied','unauthenticated','invalid-account','account-changed','reading-disabled'].includes(state.reason))state.at=0;
  retry();
 });
 window.DuduPersonalReadingRuntimeP2A=Object.freeze({open,stop,snapshot:()=>clock.snapshot(),pendingStatus:()=>queue?.status()});
})();
