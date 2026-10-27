// G2P: a read-only G2N/G2O concurrency RACE REHEARSAL on synthetic fixture.
// No lock, publication token, SQL/Firestore distributed transaction or route.

const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>=1&&v.length<=128&&!/[\p{C}]/u.test(v);
const hash=v=>typeof v==='string'&&/^sha256-[a-f0-9]{64}$/.test(v);
const revision=v=>Number.isSafeInteger(v)&&v>=1;
const validClock=v=>Number.isSafeInteger(v)&&v>=0;
const denied=code=>Object.freeze({ok:false,code});
const FENCE_FIELDS=['storyId','pinStatus','pinRevision','ownerUid','sourceHash',
 'assignmentStatus','assignmentRevision','assignmentPinRevision',
 'assignmentSourceHash','assignmentExpiresAt','operationHighwater'];

function validFence(f,storyId){
 return f!==null&&typeof f==='object'&&!Array.isArray(f)&&
  Object.getPrototypeOf(f)===Object.prototype&&
  Object.keys(f).sort().join(',')===[...FENCE_FIELDS].sort().join(',')&&
  f.storyId===storyId&&f.pinStatus==='active'&&revision(f.pinRevision)&&
  uid(f.ownerUid)&&hash(f.sourceHash)&&
  validClock(f.operationHighwater)&&f.operationHighwater>=1&&
  (f.assignmentStatus===null||['active','revoked'].includes(f.assignmentStatus))&&
  (f.assignmentRevision===null||revision(f.assignmentRevision))&&
  (f.assignmentPinRevision===null||revision(f.assignmentPinRevision))&&
  (f.assignmentSourceHash===null||hash(f.assignmentSourceHash))&&
  (f.assignmentExpiresAt===null||validClock(f.assignmentExpiresAt));
}
const unchanged=(before,after)=>FENCE_FIELDS.every(field=>before[field]===after[field]);
function validInspection(result,fence,{mode,now}){
 if(result?.ok!==true||result.storyId!==fence.storyId||
  result.sourceHash!==fence.sourceHash||result.sourceRevision!==fence.pinRevision||
  !revision(result.chapterCount)||result.chapterCount>160||
  result.inspectionOnly!==true||result.canPublish!==false||
  !['owner','assigned-reviewer'].includes(result.access)||
  (mode==='prepublish'&&result.access!=='owner'))return false;
 if(result.access==='assigned-reviewer')return mode==='review'&&
  fence.assignmentStatus==='active'&&
  revision(fence.assignmentRevision)&&
  fence.assignmentPinRevision===fence.pinRevision&&
  fence.assignmentSourceHash===fence.sourceHash&&
  fence.assignmentExpiresAt>now;
 return true;
}
const sameResult=(a,b)=>a.storyId===b.storyId&&a.sourceHash===b.sourceHash&&
 a.sourceRevision===b.sourceRevision&&a.chapterCount===b.chapterCount&&a.access===b.access;

/**
 * Two full G2N inspections bracket a fixture-only interleaving point. The
 * G2O authority-fence callback is one SQLite transaction per read. A source
 * mutation, authority rotation/revoke, expiry or operation history advance
 * causes fail-closed rejection if observed. This CANNOT fence a Firestore
 * change immediately after the last read or a source ABA without a version.
 */
export function createV49ReviewRaceRehearsal({environment='fixture',projectId,
 verify,inspect,readAuthorityFence,onInterleave=async()=>{},now=Date.now}={}){
 if(environment!=='fixture'||typeof projectId!=='string'||
  !/^demo-[a-z0-9-]{1,59}$/.test(projectId)||
  [verify,inspect,readAuthorityFence,onInterleave,now].some(fn=>typeof fn!=='function'))
  throw new TypeError('G2P requires isolated fixture-only trusted callbacks');

 return async function rehearse(request,{storyId,mode}={}){
  if(!id(storyId)||!['prepublish','review'].includes(mode))return denied('forbidden');
  try{
   const actor=await verify(request);
   if(!uid(actor?.uid))return denied('forbidden');
   const reader={storyId,reviewerUid:mode==='review'?actor.uid:null};
   const first=await readAuthorityFence(reader);
   if(!validFence(first,storyId))return denied('forbidden');
   const initial=await inspect(request,{storyId,mode});
   const firstTime=now();
   if(!validClock(firstTime))return denied('rehearsal-unavailable');
   if(!validInspection(initial,first,{mode,now:firstTime}))
    return denied(initial?.ok===false&&initial.code==='source-conflict'?
     'source-conflict':'forbidden');
   const afterFirst=await readAuthorityFence(reader);
   if(!validFence(afterFirst,storyId)||!unchanged(first,afterFirst))
    return denied('authority-conflict');

   // The interleaving hook is ONLY supplied by an isolated fixture host.
   // It is never taken from a client payload or exposed on a live route.
   await onInterleave({storyId,mode});
   const beforeSecond=await readAuthorityFence(reader);
   if(!validFence(beforeSecond,storyId)||!unchanged(first,beforeSecond))
    return denied('authority-conflict');
   const final=await inspect(request,{storyId,mode});
   const secondTime=now();
   if(!validClock(secondTime))return denied('rehearsal-unavailable');
   if(!validInspection(final,beforeSecond,{mode,now:secondTime})||
    !sameResult(initial,final))
    return denied(final?.ok===false&&final.code==='source-conflict'?
     'source-conflict':'forbidden');
   const afterSecond=await readAuthorityFence(reader);
   if(!validFence(afterSecond,storyId)||!unchanged(first,afterSecond))
    return denied('authority-conflict');
   return Object.freeze({ok:true,storyId,sourceHash:final.sourceHash,
    sourceRevision:final.sourceRevision,chapterCount:final.chapterCount,
    access:final.access,raceRehearsalOnly:true,inspectionOnly:true,
    canPublish:false});
  }catch{return denied('rehearsal-unavailable');}
 };
}
