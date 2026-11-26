/* P4A.3A.2 core: read-only, session-fenced canonical profile reconciliation.
 * Not wired to production callers yet. A transaction receipt is NOT a profile
 * version. Only an explicitly server-confirmed read may publish a projection.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduProfileReconciliationP4A3A2=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_READS_PER_DRAIN=2;
 function create({read,apply,isCurrent}={}){
  if([read,apply,isCurrent].some(fn=>typeof fn!=='function'))
   throw TypeError('reconciliation-adapters-required');
  let current=null;
  const active=s=>current===s&&isCurrent(s.uid,s.identity)===true;
  const result=(status)=>Object.freeze({status});
  function begin(uid,identity){
   if(typeof uid!=='string'||!uid||!identity)throw TypeError('invalid-session');
   const ticket=Object.freeze({});
   current={uid,identity,ticket,requested:0,published:0,flight:null};
   return ticket;
  }
  function reset(){current=null;}
  function capture(){return current&&active(current)?current.ticket:null;}
  function lookup(ticket){return current&&current.ticket===ticket&&active(current)?current:null;}
  async function drain(s){
   for(let i=0;i<MAX_READS_PER_DRAIN;i++){
    if(!active(s))return result('session-changed');
    if(s.requested===s.published)return result('synced');
    const target=s.requested;
    let snap;
    try{snap=await read(s.uid,s.identity);}
    catch(_){return result(active(s)?'read-failed':'session-changed');}
    if(!active(s))return result('session-changed');
    // A newer completion was observed while the read was pending. Do not
    // publish this possibly obsolete view, even if the read succeeded.
    if(target!==s.requested)continue;
    if(!snap||snap.exists!==true||snap.fromCache!==false||
       snap.hasPendingWrites!==false||!snap.data||
       typeof snap.data!=='object'||Array.isArray(snap.data))
     return result('unconfirmed');
    try{apply(s.uid,snap.data,s.identity);}
    catch(_){return result(active(s)?'apply-failed':'session-changed');}
    if(!active(s))return result('session-changed');
    s.published=target;
    if(s.requested===s.published)return result('synced');
   }
   return result('pending');
  }
  function schedule(s){
   if(s.flight)return s.flight;
   if(s.requested===s.published)return Promise.resolve(result('synced'));
   // Batch synchronous completion notifications; at most one read in flight
   // per session. No polling, auto retry, writes, or transaction resubmission.
   const flight=Promise.resolve().then(()=>drain(s)).finally(()=>{
    if(s.flight===flight)s.flight=null;
   });
   s.flight=flight;
   return flight;
  }
  function afterCommit(ticket){
   const s=lookup(ticket);
   if(!s)return Promise.resolve(result('session-changed'));
   s.requested++;
   return schedule(s);
  }
  function retry(ticket){
   const s=lookup(ticket);
   return s?schedule(s):Promise.resolve(result('session-changed'));
  }
  function status(ticket){
   const s=lookup(ticket);
   if(!s)return result('session-changed');
   return result(s.requested===s.published?'synced':s.flight?'reading':'pending');
  }
  return Object.freeze({begin,reset,capture,afterCommit,retry,status});
 }
 return Object.freeze({create,MAX_READS_PER_DRAIN});
});
