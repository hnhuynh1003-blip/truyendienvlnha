/* Completed, contiguous UTC slots from monotonic active-reading observations.
 * Honest-play browser model; not a server attestation or a reward issuer. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalReadingSlotsP2C=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SLOT_MS=10000,MAX_GAP_MS=2500,MAX_DRIFT_MS=100;
 function create(){
  let previous=null,start=null,coveredUntil=null;
  function reset(){previous=null;start=null;coveredUntil=null;}
  function observe({wall,mono,observed,active}={}){
   if(![wall,mono,observed].every(Number.isFinite)||wall<0||mono<0||observed<0){reset();return [];}
   const current={wall,mono,observed,active:active===true};
   const old=previous;previous=current;
   if(!old||!old.active||!current.active){start=null;coveredUntil=null;return [];}
   const dt=mono-old.mono,wallDelta=wall-old.wall,credited=observed-old.observed;
   if(dt<=0||dt>MAX_GAP_MS||Math.abs(wallDelta-dt)>MAX_DRIFT_MS||
      Math.abs(credited-dt)>2||wallDelta<=0){start=null;coveredUntil=null;return [];}
   if(start===null||coveredUntil!==old.wall){
    start=Math.ceil(old.wall/SLOT_MS)*SLOT_MS;
   }
   coveredUntil=wall;
   const complete=[];
   while(start+SLOT_MS<=coveredUntil){
    complete.push(start);start+=SLOT_MS;
   }
   return complete;
  }
  return Object.freeze({observe,reset});
 }
 // One key per slot: concurrent tabs never replace a shared queue array.
 // Values: 1 = normal, p = isolate a rejected batch, h:<wall-ms> = retained hold.
 // Holds are retry metadata, never an ACK; only confirmed transactions delete slots.
 function queue({storage,policyId='personal-reading-v1',now=()=>Date.now(),capacity=8640,onStatus=()=>{}}={}){
  const DAY_MS=86400000,RECONCILE_MS=300000;
  let uid=null,flight=null,epoch=0,highWater=0,reconciledAt=-Infinity,dirty=true;
  const owners=new Map();
  const prefix='dudu:reading:pending:v1:'+encodeURIComponent(policyId)+':';
  if(storage===undefined){try{storage=window.localStorage;}catch(_){storage=null;}}
  const scope=owner=>prefix+encodeURIComponent(owner)+':';
  function records(owner=uid){
   if(!owners.has(owner))owners.set(owner,{slots:new Map(),volatile:new Set(),persisted:new Set(),issues:new Set(),seen:new Set(),expired:0,overflow:0,corrupt:0,persistenceFailed:false,cache:null,nextChange:0});
   return owners.get(owner);
  }
  function time(){
   const at=now();
   if(!Number.isSafeInteger(at)||at<0){report('clock-invalid');return highWater;}
   if(at<highWater)report('clock-rollback');
   highWater=Math.max(highWater,at);return highWater;
  }
  function status(){
   const row=records(),at=highWater;
   if(row.cache&&at<row.nextChange)return row.cache;
   let held=0,probing=false,runnable=0;row.nextChange=Infinity;
   for(const [slot,value] of row.slots){
    if(slot>=at-DAY_MS)row.nextChange=Math.min(row.nextChange,slot+DAY_MS+1);
    if(slot+SLOT_MS>at)row.nextChange=Math.min(row.nextChange,slot+SLOT_MS);
    if(value.startsWith('h:')&&Number(value.slice(2))>at)row.nextChange=Math.min(row.nextChange,Number(value.slice(2)));
    if(value.startsWith('h:')&&Number(value.slice(2))>at)held++;
    else if(slot>=at-DAY_MS&&slot+SLOT_MS<=at){runnable++;if(value!=='1')probing=true;}
   }
   return row.cache=Object.freeze({uid,pending:uid?row.slots.size:0,runnable:uid?runnable:0,held:uid?held:0,probing,
    durable:!!storage&&!row.persistenceFailed,issues:Object.freeze([...row.issues]),
    expired:row.expired,overflow:row.overflow,corrupt:row.corrupt});
  }
  function notify(){records().cache=null;onStatus(status());}
  function report(code,slot=''){
   const row=records(),key=code+':'+slot;
   if(code==='persistence-failure')row.persistenceFailed=true;
   row.issues.add(code);
   if(!row.seen.has(key)){
    row.seen.add(key);
    if(code==='expiry')row.expired++;
    if(code==='overflow')row.overflow++;
    if(code==='corruption')row.corrupt++;
    notify();
   }
  }
  function remove(key){try{storage?.removeItem(key);}catch(_){report('persistence-failure');}}
  function write(slot,value){
   const row=records();row.cache=null;row.slots.set(slot,value);
   try{if(!storage)throw Error('unavailable');storage.setItem(scope(uid)+slot,value);row.volatile.delete(slot);row.persisted.add(slot);}
   catch(_){row.volatile.add(slot);report('persistence-failure');return false;}
   return true;
  }
  function accept(key,raw,at){
   const row=records();row.cache=null;const suffix=key.slice(scope(uid).length),slot=Number(suffix);
   if(!/^\d+$/.test(suffix)||!Number.isSafeInteger(slot)||slot<0||slot%SLOT_MS||
    !(raw==='1'||raw==='p'||/^h:\d+$/.test(raw)&&Number.isSafeInteger(Number(raw.slice(2))))){
    report('corruption',key);
    if(row.volatile.has(slot))return; // Keep a valid volatile candidate despite corrupt persisted metadata.
    remove(key);row.slots.delete(slot);row.persisted.delete(slot);return;
   }
   if(slot<at-DAY_MS){report('expiry',slot);remove(key);row.slots.delete(slot);row.volatile.delete(slot);row.persisted.delete(slot);return;}
   row.persisted.add(slot);
   if(row.volatile.has(slot)){
    // A failed metadata write is newer than a normal stored value. Merge holds
    // conservatively if another tab has already recorded a later retry deadline.
    const local=row.slots.get(slot);
    if(local?.startsWith('h:')||raw.startsWith('h:'))raw='h:'+Math.max(
     local?.startsWith('h:')?Number(local.slice(2)):0,raw.startsWith('h:')?Number(raw.slice(2)):0);
    else if(local==='p')raw='p';
   }
   row.slots.set(slot,raw);
  }
  function prune(at){
   const row=records();
   for(const slot of row.slots.keys())if(slot<at-DAY_MS){
    row.slots.delete(slot);row.volatile.delete(slot);row.persisted.delete(slot);remove(scope(uid)+slot);report('expiry',slot);
   }
  }
  function sync(){
   if(!uid)return;
   const at=time(),row=records(),base=scope(uid);reconciledAt=at;dirty=false;
   if(storage)try{
    const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(base));
    const present=new Set();
    for(const key of keys){const raw=storage.getItem(key);if(raw===null)continue;present.add(Number(key.slice(base.length)));accept(key,raw,at);}
    for(const slot of row.slots.keys())if(!present.has(slot)&&(!row.volatile.has(slot)||row.persisted.has(slot))){
     row.slots.delete(slot);row.volatile.delete(slot);row.persisted.delete(slot);
    }
    // Recovery from a quota/read failure is explicit; preserve memory until written.
    for(const slot of row.volatile){
     // Recheck a previously durable key before rewriting metadata: a peer may
     // have ACKed it since the enumeration. Never resurrect that known ACK.
     if(row.persisted.has(slot)&&storage.getItem(base+slot)===null){
      row.slots.delete(slot);row.volatile.delete(slot);row.persisted.delete(slot);
     }else write(slot,row.slots.get(slot));
    }
    if(row.volatile.size===0)row.persistenceFailed=false;
   }catch(_){report('persistence-failure');}
   else report('persistence-failure');
   prune(at);notify();
  }
  function bind(next){
   next=next||null;
   if(uid!==next){uid=next;flight=null;epoch++;dirty=true;if(uid)sync();else notify();}
  }
  function maintain(){
   if(!uid)return;
   const at=time();
   if(dirty||at-reconciledAt>=RECONCILE_MS)sync();
  }
  function storageEvent(event){
   if(!uid)return;
   if(event.key===null){dirty=true;return;}
   if(!event.key?.startsWith(scope(uid)))return;
   if(event.storageArea&&storage&&event.storageArea!==storage)return;
   // Read current value, rather than applying an event that may already be stale.
   try{
    const raw=storage.getItem(event.key),slot=Number(event.key.slice(scope(uid).length));
    if(raw===null){
     const row=records();
     if(!row.volatile.has(slot)||row.persisted.has(slot)){row.slots.delete(slot);row.volatile.delete(slot);row.persisted.delete(slot);}
    }
    else accept(event.key,raw,time());
    notify();
   }catch(_){dirty=true;report('persistence-failure');}
  }
  function push(owner,slots){
   if(!owner||owner!==uid)return false;
   maintain();const row=records(),at=time();let accepted=true;
   for(const slot of slots){
    if(!Number.isSafeInteger(slot)||slot<0||slot%SLOT_MS||slot+SLOT_MS>at){report('invalid-slot',slot);accepted=false;continue;}
    if(slot<at-DAY_MS){report('expiry',slot);accepted=false;continue;}
    if(row.slots.has(slot))continue;
    if(row.slots.size>=capacity){prune(at);if(row.slots.size>=capacity){report('overflow',slot);accepted=false;continue;}}
    if(!write(slot,'1'))accepted=false;
   }
   notify();return accepted;
  }
  function begin(owner,{force=false,recovery,now:at}={}){
   if(owner!==uid||flight||!owner)return null;
   // Called only when cached state suggests work, or for explicit recovery.
   sync();const wall=at??time(),row=records();
   const eligible=[...row.slots].filter(([slot,value])=>slot>=wall-DAY_MS&&slot+SLOT_MS<=wall&&
    (!value.startsWith('h:')||Number(value.slice(2))<=wall)).sort((a,b)=>a[0]-b[0]);
   // Revalidate the captured recovery set after synchronization; a peer ACK
   // must not turn a newly collected slot into a forced partial submission.
   if(recovery)force=force&&eligible.some(([slot])=>recovery.has(slot));
   const probe=eligible.find(([,value])=>value!=='1');
   const slots=probe?[probe[0]]:eligible.slice(0,60).map(([slot])=>slot);
   if(!slots.length||!probe&&slots.length<(force?1:6))return null;
   flight=Object.freeze({uid:owner,epoch,slots:Object.freeze(slots)});return flight;
  }
  const current=ticket=>ticket===flight&&ticket.epoch===epoch&&ticket.uid===uid;
  function settle(ticket,result){
   if(!current(ticket))return false;
   if(result?.status==='applied'||result?.status==='already-credited'){
    for(const slot of ticket.slots){records().slots.delete(slot);records().volatile.delete(slot);records().persisted.delete(slot);remove(scope(uid)+slot);}
   }
   flight=null;notify();return true;
  }
  function rejectWindow(ticket){
   if(!current(ticket))return false;
   // A known plan rejection has not committed. Isolate members without discarding
   // any candidate, then let other slots progress while a rejected singleton waits.
   for(const slot of ticket.slots)write(slot,ticket.slots.length===1?'h:'+(time()+300000):'p');
   report('rejected-window');flight=null;notify();return true;
  }
  function isEligible(slot){
   const value=records().slots.get(slot),at=time();
   return value!==undefined&&slot>=at-DAY_MS&&slot+SLOT_MS<=at&&(!value.startsWith('h:')||Number(value.slice(2))<=at);
  }
  const eligibleSlots=()=>[...records().slots.keys()].filter(isEligible);
  return Object.freeze({bind,push,begin,settle,rejectWindow,isEligible,eligibleSlots,sync,maintain,storageEvent,status,size:()=>{sync();return uid?records().slots.size:0;}});
 }
 return Object.freeze({SLOT_MS,create,queue});
});
