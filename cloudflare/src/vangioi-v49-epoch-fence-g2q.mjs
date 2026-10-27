// G2Q: observation-only epoch fence around G2P, never a publish/submit gate.

const story=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(v);
const hash=v=>typeof v==='string'&&/^sha256-[a-f0-9]{64}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const epoch=v=>Number.isSafeInteger(v)&&v>=1&&v<Number.MAX_SAFE_INTEGER;
const denied=code=>Object.freeze({ok:false,code});
const KEYS=['storyId','ownerUid','sourceEpoch','sourceHash','chapterCount',
 'operationHighwater'];
function valid(f,storyId){
 return !!f&&typeof f==='object'&&!Array.isArray(f)&&
  Object.getPrototypeOf(f)===Object.prototype&&
  Object.keys(f).sort().join(',')===[...KEYS].sort().join(',')&&
  f.storyId===storyId&&uid(f.ownerUid)&&epoch(f.sourceEpoch)&&
  hash(f.sourceHash)&&Number.isSafeInteger(f.chapterCount)&&
  f.chapterCount>=1&&f.chapterCount<=160&&
  epoch(f.operationHighwater);
}
const same=(a,b)=>KEYS.every(k=>a[k]===b[k]);

/**
 * Works only when all SOURCE writes also advance the trusted epoch record.
 * Observation cannot substitute for an atomic source commit-time CAS.
 */
export function createV49EpochFencedRehearsal({environment='fixture',projectId,
 readSourceEpoch,rehearse}={}){
 if(environment!=='fixture'||typeof projectId!=='string'||
  !/^demo-[a-z0-9-]{1,59}$/.test(projectId)||
  typeof readSourceEpoch!=='function'||typeof rehearse!=='function')
  throw new TypeError('G2Q requires trusted fixture epoch/rehearsal callbacks');

 return async function fencedRehearsal(request,{storyId,mode}={}){
  if(!story(storyId)||!['prepublish','review'].includes(mode))return denied('forbidden');
  try{
   const first=await readSourceEpoch({storyId});
   if(!valid(first,storyId))return denied('forbidden');
   const result=await rehearse(request,{storyId,mode});
   if(result?.ok!==true)return denied(result?.ok===false&&
    ['forbidden','source-conflict','authority-conflict',
     'rehearsal-unavailable'].includes(result.code)?result.code:'forbidden');
   if(result.storyId!==storyId||result.sourceHash!==first.sourceHash||
    result.chapterCount!==first.chapterCount||
    !epoch(result.sourceRevision)||
    result.inspectionOnly!==true||result.raceRehearsalOnly!==true||
    result.canPublish!==false)return denied('source-epoch-conflict');
   const final=await readSourceEpoch({storyId});
   if(!valid(final,storyId)||!same(first,final))
    return denied('source-epoch-conflict');
   return Object.freeze({ok:true,storyId,sourceHash:first.sourceHash,
    sourceEpoch:first.sourceEpoch,sourceRevision:result.sourceRevision,
    chapterCount:result.chapterCount,access:result.access,
    epochFencedFixtureOnly:true,inspectionOnly:true,canPublish:false});
  }catch{return denied('source-epoch-unavailable');}
 };
}
