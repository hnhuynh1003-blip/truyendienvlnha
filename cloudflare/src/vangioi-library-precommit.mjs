// G1V: best-effort V49 source recheck just before G1F registry intake.
// This does NOT lock Firestore source data or bridge Firestore/SQLite transactions.
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

const validHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const fail=code=>({ok:false,code});
const keys=(o,w)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...w].sort().join(',');

async function canonicalPlan(input){
 const p=copyAuthoringJson(input);
 if(!keys(p,['ok','reference','permitRevision','registryInput'])||p.ok!==true||
  !keys(p.reference,['kind','storyId','storyVersion','contentHash'])||
  p.reference.kind!=='library'||!validHash(p.reference.contentHash)||
  p.reference.storyVersion!=='sha256-'+p.reference.contentHash||
  !p.registryInput||p.registryInput.kind!=='library'||
  p.registryInput.storyId!==p.reference.storyId||
  p.registryInput.storyVersion!==p.reference.storyVersion||
  !Number.isSafeInteger(p.permitRevision)||p.permitRevision<1||
  !p.registryInput.payload||
  await hashAuthoringJson(p.registryInput.payload)!==p.reference.contentHash)throw Error('invalid-plan');
 return p;
}

/**
 * Only compose G1Q's trusted `prepare` and G1F's trusted `registerSource`.
 * Caller owns the prepared plan server-side; never accept it from an author.
 */
export function createV49PrecommitRecheck({prepare,registerSource}={}){
 if(typeof prepare!=='function'||typeof registerSource!=='function')
  throw new TypeError('G1V requires trusted G1Q and G1F callbacks');
 return async function recheckThenRegister(request,preparedPlan){
  let original;
  try{original=await canonicalPlan(preparedPlan);}catch{return fail('invalid-plan');}
  let fresh;
  try{
   const renewed=await prepare(request,{requestId:original.registryInput.requestId,
    storyId:original.reference.storyId,authorizedUid:original.registryInput.authorizedUid});
   if(renewed?.ok!==true)return fail(['unauthenticated','forbidden','source-conflict'].includes(renewed?.code)?renewed.code:'source-unavailable');
   fresh=await canonicalPlan(renewed);
   // Hash the complete trusted plan, including permit revision/rights and payload.
   if(await hashAuthoringJson(fresh)!==await hashAuthoringJson(original))return fail('source-conflict');
  }catch{return fail('source-unavailable');}
  try{
   // G1R rechecks current permit inside the registry SQL transaction.
   // Firestore may change after the final read; this is NOT an atomic fence.
   return await registerSource(request,original.registryInput);
  }catch{return fail('registry-unavailable');}
 };
}
