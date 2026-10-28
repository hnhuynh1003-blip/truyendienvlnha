// G5B: synthetic moderation rehearsal over the existing G1L immutable SQL
// review and G1Y live-at-read rights preflight. This file is for isolated
// Node/SQLite fixtures only. Never import it into a Worker or public route.
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

export const G5B_REHEARSAL_VERSION='g5b-moderation-rehearsal-1';
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const rev=v=>Number.isSafeInteger(v)&&v>=1;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const fields=['worldId','requestId','expectedRevision','expectedAccessRevision','snapshotHash','decision','note'];
const flags=Object.freeze({fixtureOnly:true,productionAuthorized:false,published:false,
 publisherAuthorized:false,legalRightsVerified:false,contentLabelsVerified:false,
 deviceVerified:false,missionCompleted:false,saveCommitted:false,
 rewardAuthorized:false,rewardCommitted:false});
const output=(x={})=>Object.freeze({version:G5B_REHEARSAL_VERSION,
  moderationRecorded:false,fixtureGateEligible:false,readyForStaging:false,
  ...flags,...x});
const denied=(code,extra={})=>output({ok:false,code,...extra});

function validInput(v){
 return v&&typeof v==='object'&&!Array.isArray(v)&&
  Object.keys(v).length===fields.length&&Object.keys(v).every(k=>fields.includes(k))&&
  id(v.worldId)&&uuid(v.requestId)&&rev(v.expectedRevision)&&
  rev(v.expectedAccessRevision)&&sha(v.snapshotHash)&&
  ['approve','request_changes'].includes(v.decision)&&
  typeof v.note==='string'&&v.note.trim().length>0&&v.note.length<=4000;
}

// This attestation is read back from the TEST HOST'S SQL storage; neither a
// caller's role flag nor the G1L result JSON alone counts as a persisted review.
function recordedReview(storage,data,actor,digest,result){
 return storage.transactionSync(()=>{
  const one=(query,...args)=>storage.sql.exec(query,...args).toArray()[0]||null;
  const op=one(`SELECT action,request_hash,result_json FROM vg_authoring_operations_v1
   WHERE world_id=? AND actor_uid=? AND request_id=?`,data.worldId,actor,data.requestId);
  const audit=one(`SELECT action,actor_uid,from_revision,to_revision,snapshot_hash
   FROM vg_authoring_audit_v1 WHERE world_id=? AND actor_uid=? AND request_id=?`,
   data.worldId,actor,data.requestId);
  const review=one(`SELECT * FROM vg_authoring_reviews_v1 WHERE world_id=? AND revision=?`,
   data.worldId,data.expectedRevision);
  const header=one(`SELECT draft_revision,draft_state,access_revision FROM vg_authoring_worlds_v1
   WHERE world_id=?`,data.worldId);
  if(op?.action!=='review_submission'||op.request_hash!==digest||
   audit?.action!=='review_submission'||audit.actor_uid!==actor||
   audit.from_revision!==data.expectedRevision||audit.to_revision!==data.expectedRevision||
   audit.snapshot_hash!==data.snapshotHash||review?.reviewer_uid!==actor||
   review.revision!==data.expectedRevision||review.snapshot_hash!==data.snapshotHash||
   review.decision!==data.decision||review.note!==data.note)return null;
  let saved;
  try{saved=JSON.parse(op.result_json);}catch{return null;}
  if(saved?.ok!==true||saved.worldId!==data.worldId||
   saved.snapshotHash!==data.snapshotHash||saved.revision!==data.expectedRevision||
   saved.decision!==data.decision||saved.state!==(data.decision==='approve'?'approved':'inReview')||
   result?.ok!==true||result.snapshotHash!==saved.snapshotHash||result.decision!==saved.decision)
   return null;
  return {current:header?.draft_revision===data.expectedRevision&&
   header?.access_revision===data.expectedAccessRevision&&header?.draft_state===saved.state};
 });
}

/**
 * The *host* supplies identity verification, a G1L authoring service and a
 * G1Y release gate already bound to the same isolated fixture. operatorRequest
 * is not accepted from review input: the author/reviewer never impersonates an
 * operator. G1Y is checked AFTER review, because it requires approved state.
 */
export function createG5BModerationRehearsal({environment='fixture',storage,projectId,
 verify,authoring,releaseGate,operatorRequest}={}){
 if(environment!=='fixture'||!/^demo-[a-z0-9-]{1,59}$/.test(projectId||'')||
  !storage?.sql||typeof storage.sql.exec!=='function'||
  typeof storage.transactionSync!=='function'||typeof verify!=='function'||
  typeof authoring?.reviewSubmission!=='function'||
  typeof releaseGate?.evaluateApprovedWorld!=='function'||!operatorRequest)
  throw new TypeError('G5B needs isolated SQL, G1L, G1Y and trusted fixture identity');

 return Object.freeze({async review(request,input){
  let data;
  try{data=copyAuthoringJson(input);if(!validInput(data))return denied('invalid-request');}
  catch{return denied('invalid-request');}
  let actor;
  try{const who=await verify(request,projectId);if(uid(who?.uid))actor=who.uid;}
  catch{}
  if(!actor)return denied('unauthenticated');
  try{
   const digest=await hashAuthoringJson({action:'review_submission',...data});
   // G1L itself enforces reviewer assignment, contribution history, revision,
   // dependency validation and atomic decision/receipt/audit at SQL commit.
   const decision=await authoring.reviewSubmission(request,data);
   if(decision?.ok!==true)return denied(decision?.code||'review-blocked');
   const record=recordedReview(storage,data,actor,digest,decision);
   if(!record)return denied('review-attestation-conflict');
   const base={ok:true,moderationRecorded:true,decision:data.decision,
    worldId:data.worldId,snapshotHash:data.snapshotHash,receiptId:data.requestId,
    replayed:decision.replayed===true,currentReview:record.current,
    // Labels/danger level are author's metadata proposals, not proof of human
    // classification or of source/asset copyright.
    warnings:Object.freeze(['human-content-label-review-required',
     'legal-and-asset-license-review-required'])};
   if(data.decision==='request_changes'||!record.current)
    return output({...base,code:data.decision==='request_changes'?'changes-requested':'stale-review'});
   // A G1Y receipt is a fresh observation, NOT an atomic approval/publish.
   let gate;
   try{gate=await releaseGate.evaluateApprovedWorld(operatorRequest,{worldId:data.worldId});}
   catch{return output({...base,code:'g1y-reader-unavailable'});}
   if(gate?.ok!==true||gate.eligible!==true||gate.worldId!==data.worldId||
    gate.snapshotHash!==data.snapshotHash||gate.gateVersion!=='world-release-1')
    return output({...base,code:'g1y-blocked',gateCode:typeof gate?.code==='string'?
     gate.code:'invalid-g1y-result'});
   return output({...base,fixtureGateEligible:true,code:'synthetic-review-passed'});
  }catch{return denied('rehearsal-unavailable');}
 }});
}
