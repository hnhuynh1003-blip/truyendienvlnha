/* CP-012: explicit, local-only diagnostic snapshot. No token, network, storage mutation or retry APIs. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduRuntimeDiagnosticsCP012=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_KEYS=20000;
 const VERSION='cp012-1';
 const count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
 const enumValue=(v,allowed)=>allowed.includes(v)?v:'unknown';
 function inspect(storage,uid,policyId,legacy=false){
  const encoded=encodeURIComponent(uid);
  const exact=legacy?['dudu-v52-purchase-pending:'+uid]:[
   'dudu-personal-shop:pending:'+uid,'dudu-personal-bulk:pending:'+uid,
   'dudu-personal-loot:pending:'+uid,'dudu-personal-arcade:exchange-pending-v1:'+encoded];
  const prefixes=legacy?[]:['dudu-personal-items:pending:'+uid+':','dudu-f43-sale:'+uid+':','dudu:npc-exchange:pending:'+uid+':'];
  const reading=legacy?null:'dudu:reading:pending:v1:'+encodeURIComponent(policyId)+':'+encoded+':';
  const cache=legacy?null:'dudu-canonical-profile:p4a3a2:'+encoded;
  let journals=0,slots=0,cachePresent=false;
  try{
   const n=storage.length;
   if(!Number.isSafeInteger(n)||n<0||n>MAX_KEYS)return {status:'not-verified'};
   for(let i=0;i<n;i++){
    const key=storage.key(i);
    if(typeof key!=='string')return {status:'not-verified'};
    if(exact.includes(key)||prefixes.some(p=>key.startsWith(p)))journals++;
    if(reading&&key.startsWith(reading))slots++;
    if(cache&&key===cache)cachePresent=true;
   }
   if(storage.length!==n)return {status:'not-verified'};
   return {status:'observed',journals, ...(legacy?{}:{persistedReadingKeys:slots,canonicalCacheKeyPresent:cachePresent})};
  }catch(_){return {status:'not-verified'};}
 }
 function collect({sandbox,uid,authUid,profileUid,ready,session,reading,local,sessionStorage,appCheckActivation,profileWrites,policyId}={}){
  const report={version:VERSION,scope:'local-only; known keys only; no server identity or token-health attestation',
   mode:sandbox===true?'sandbox':'live',
   appCheckActivation:enumValue(appCheckActivation,['not-configured','sandbox','activation-returned','activation-threw']),
   appCheckHealth:'not-verified'};
  if(sandbox===true)return Object.freeze({...report,auth:'not-applicable'});
  if(typeof uid!=='string'||!uid)return Object.freeze({...report,auth:'not-ready',identity:'not-verified'});
  const match=uid===authUid&&uid===profileUid;
  report.auth=ready===true?'ready':'not-ready';
  report.identity=match?'match':'mismatch';
  if(!match||ready!==true)return Object.freeze(report);
  report.reconciliation=enumValue(session,['synced','reading','pending','inactive']);
  report.profileWritesInFlight=count(profileWrites);
  report.reading=reading&&reading.uid===uid?{
   status:'observed-in-memory',pending:count(reading.pending),runnable:count(reading.runnable),
   held:count(reading.held),durable:typeof reading.durable==='boolean'?reading.durable:null,
   expired:count(reading.expired),overflow:count(reading.overflow),corrupt:count(reading.corrupt)
  }:{status:'not-verified'};
  // Policy is fixed at the adapter; only this known policy may be inspected.
  report.local=policyId==='personal-reading-v1'?inspect(local,uid,policyId):{status:'not-verified'};
  report.sessionStorage=inspect(sessionStorage,uid,'',true);
  return Object.freeze(report);
 }
 return Object.freeze({collect,VERSION,MAX_KEYS});
});
