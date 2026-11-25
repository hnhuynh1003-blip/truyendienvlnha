/* Completed, contiguous UTC slots from monotonic active-reading observations.
 * Honest-play browser model; not a server attestation or a reward issuer. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalReadingSlotsP2C=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SLOT_MS=10000,MAX_GAP_MS=2500,MAX_DRIFT_MS=100,MAX_QUEUE=360;
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
 function queue(){
  let uid=null,pending=new Set(),flight=null,epoch=0;
  function bind(next){if(uid!==next){uid=next;pending.clear();flight=null;epoch++;}}
  function push(owner,slots){
   if(!owner||uid!==owner)return false;
   for(const x of slots)if(Number.isSafeInteger(x)&&x%SLOT_MS===0&&pending.size<MAX_QUEUE)pending.add(x);
   return true;
  }
  function begin(owner,{force=false,now=Date.now()}={}){
   if(owner!==uid||flight||!owner)return null;
   for(const x of pending)if(x<now-86400000)pending.delete(x);
   if(pending.size<(force?1:6))return null;
   flight=Object.freeze({uid:owner,epoch,slots:Object.freeze([...pending].sort((a,b)=>a-b).slice(0,60))});return flight;
  }
  function settle(ticket,ok){
   if(ticket!==flight||ticket.epoch!==epoch||ticket.uid!==uid)return false;
   if(ok)for(const x of ticket.slots)pending.delete(x);
   flight=null;return true;
  }
  return Object.freeze({bind,push,begin,settle,size:()=>pending.size});
 }
 return Object.freeze({SLOT_MS,create,queue});
});
