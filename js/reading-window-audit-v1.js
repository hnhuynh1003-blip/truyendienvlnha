/* R-EXP1 offline/read-only eligibility audit for future verified reading.
 * This module cannot attest that a human read. All observations are
 * client-reported and MUST NOT directly mint EXP, Tu Vi, Xu or items.
 * Reward rate, caps and the authoritative issuer are NOT approved.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReadingWindowAuditV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1;
 const validKey=s=>typeof s==='string'&&s.length>0&&s.length<=128&&
  !/[\u0000-\u001f]/.test(s);
 const validTime=n=>Number.isSafeInteger(n)&&n>=0;
 function inspectWindow({
  uid,storyId,chapterId,contentVersion,startMs,endMs,
  readerOpen=false,visible=false,focused=false,interacting=false,
  progressed=false,offline=false
 }={}){
  const reasons=[];
  if(![uid,storyId,chapterId,contentVersion].every(validKey))
   reasons.push('missing-content-identity');
  if(!validTime(startMs)||!validTime(endMs)||endMs<=startMs)
   reasons.push('invalid-window');
  if(!readerOpen)reasons.push('reader-closed');
  if(!visible)reasons.push('page-hidden');
  if(!focused)reasons.push('page-unfocused');
  if(!interacting)reasons.push('reader-inactive');
  if(!progressed)reasons.push('no-new-content-progress');
  if(offline)reasons.push('offline-unverifiable');
  const candidate=reasons.length===0;
  return Object.freeze({
   version:VERSION,status:candidate?'CANDIDATE_ONLY':'INELIGIBLE',
   candidate,clientObservedMs:candidate?endMs-startMs:0,
   // Never treat browser observations as signed, trusted reading receipts.
   verifiedMs:0,awardExp:0,awardTuVi:0,
   authority:'NONE',writable:false,
   reasons:Object.freeze(reasons)
  });
 }
 return Object.freeze({VERSION,inspectWindow});
});
