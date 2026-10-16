/* DUDU V42.6 — predictable collection cadence.
 * Phone: one attempt every two minutes.
 * Chapter: one successful drop per chapter per browser-local calendar day.
 * Historic boolean values remain readable and become eligible for a new
 * daily claim; no player save is erased or bulk-migrated.
 *
 * This client-only module is a gameplay rule, NOT server-side anti-cheat.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduLootCadenceV42=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const PHONE_COOLDOWN_MS=2*60*1000;
  function dayKey(now=Date.now()){
    const date=new Date(now);
    if(!Number.isFinite(date.getTime()))return '';
    const pad=n=>String(n).padStart(2,'0');
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
  }
  function claimedToday(value,now=Date.now()){
    const today=dayKey(now);
    // Old value true was a one-time, undated flag. Its original claim
    // date is unknowable, so allow the next V42.6 daily attempt.
    return !!today&&typeof value==='string'&&value===today;
  }
  function nextClaimValue(now=Date.now()){
    const key=dayKey(now);
    if(!key)throw Error('invalid-current-date');
    return key;
  }
  function phoneRemainingMs(lastTimestamp,now=Date.now()){
    const last=Number(lastTimestamp);
    if(!Number.isFinite(last)||last<=0||!Number.isFinite(Number(now)))return 0;
    const elapsed=Number(now)-last;
    return Math.max(0,Math.min(PHONE_COOLDOWN_MS,PHONE_COOLDOWN_MS-elapsed));
  }
  return Object.freeze({PHONE_COOLDOWN_MS,dayKey,claimedToday,
    nextClaimValue,phoneRemainingMs});
});
