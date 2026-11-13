// G2G: operator-only read-only reconciliation of a consumed G2F receipt with
// one explicitly selected G2D target fixture. NOT an automatic unlock/repair.
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

const id=v=>typeof v==='string'&&/^[a-z0-9-]{1,64}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const seq=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...fields].sort().join(',');
const fail=code=>({ok:false,code});
const stable=(a,b)=>a&&b&&a.projectId===b.projectId&&a.environment===b.environment&&
 a.highwaterCheckpoint===b.highwaterCheckpoint&&a.highwaterDigest===b.highwaterDigest&&
 a.attemptCount===b.attemptCount;

export function createFixturePermitRestoreReconciliation({guard,readTargetBackup,readTargetIdentity=null,
 authorizeOperator,projectId,environment='fixture'}={}){
 if(typeof guard?.readAttempt!=='function'||typeof guard?.readGuardSnapshot!=='function'||
  typeof readTargetBackup!=='function'||typeof authorizeOperator!=='function'||
  (readTargetIdentity!==null&&typeof readTargetIdentity!=='function')||
  !id(projectId)||environment!=='fixture')
  throw new TypeError('G2G requires trusted operator gate and isolated fixture readers');

 async function reconcile(request,input){
  if(!only(input,['nonce'])||!uuid(input.nonce))return fail('invalid-request');
  let allowed=false;
  try{allowed=await authorizeOperator(request,projectId)===true;}catch{}
  if(!allowed)return fail('forbidden');
  try{
   const before=await guard.readGuardSnapshot();
   if(before?.projectId!==projectId||before.environment!=='fixture')return fail('invalid-ledger');
   const receipt=await guard.readAttempt(input.nonce);
   if(!receipt)return fail('receipt-not-found');
   if(!only(receipt,['projectId','environment','nonce','issuerId','keyId',
    'checkpoint','backupDigest','createdAt','targetFixtureId'])||receipt.projectId!==projectId||
    receipt.environment!=='fixture'||receipt.nonce!==input.nonce||
    !seq(receipt.checkpoint)||!sha(receipt.backupDigest)||
    (receipt.targetFixtureId!==null&&!uuid(receipt.targetFixtureId)))return fail('invalid-receipt');

   // G2H: legacy receipts remain unbound. A newly bound receipt must match
   // its trusted target fixture identity BEFORE target backup bytes are read.
   if(receipt.targetFixtureId!==null){
    if(!readTargetIdentity)return fail('target-identity-unavailable');
    let identity;
    try{identity=await readTargetIdentity({projectId,environment:'fixture'});}
    catch{return fail('target-identity-unavailable');}
    if(!only(identity,['projectId','environment','targetFixtureId'])||
     identity.projectId!==projectId||identity.environment!=='fixture'||
     !uuid(identity.targetFixtureId))return fail('target-identity-unavailable');
    if(identity.targetFixtureId!==receipt.targetFixtureId)return fail('target-identity-mismatch');
   }

   // The trusted G2D source callback reads target rows and checkpoint together.
   // Copy result before hashing so a mutating callback cannot swap its fields.
   const target=copyAuthoringJson(await readTargetBackup({projectId,environment:'fixture'}));
   if(!only(target,['format','projectId','environment','checkpoint','entries','events','digest'])||
    target.format!=='permit-fixture-backup-1'||target.projectId!==projectId||
    target.environment!=='fixture'||!seq(target.checkpoint)||!sha(target.digest)||
    !Array.isArray(target.entries)||!Array.isArray(target.events))return fail('invalid-target');
   const {digest,...payload}=target;
   if((await hashAuthoringJson(payload))!==digest)return fail('invalid-target');

   const after=await guard.readGuardSnapshot();
   if(!stable(before,after))return fail('ledger-changed');
   if(receipt.targetFixtureId!==null){
    let again;
    try{again=await readTargetIdentity({projectId,environment:'fixture'});}
    catch{return fail('target-identity-unavailable');}
    if(again?.targetFixtureId!==receipt.targetFixtureId)return fail('target-identity-changed');
   }
   const sameReceipt=await guard.readAttempt(input.nonce);
   if(!sameReceipt||sameReceipt.checkpoint!==receipt.checkpoint||
    sameReceipt.backupDigest!==receipt.backupDigest||
    sameReceipt.targetFixtureId!==receipt.targetFixtureId)return fail('ledger-changed');

   let code;
   if(target.checkpoint<receipt.checkpoint)code='target-behind';
   else if(target.checkpoint>receipt.checkpoint)code='target-advanced-unverified';
   else if(target.digest!==receipt.backupDigest)code='target-diverged';
   else if(target.checkpoint===0)code='indeterminate-empty';
   else code='target-matches-receipt';
   return {ok:code==='target-matches-receipt',code,projectId,environment:'fixture',
    nonce:receipt.nonce,receiptCheckpoint:receipt.checkpoint,
    observedCheckpoint:target.checkpoint,requiresAuthorityAudit:true};
  }catch{return fail('reconciliation-unavailable');}
 }
 return Object.freeze({reconcile});
}
