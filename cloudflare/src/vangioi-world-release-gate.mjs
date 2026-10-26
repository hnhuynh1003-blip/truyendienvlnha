// G1Y: read-only offline publication/admission preflight for an already approved
// world. It grants no playable session and MUST be rechecked at the real boundary.
import {verifyFirebaseIdToken} from './auth.mjs';
import {verifySubmissionIntegrity} from './vangioi-authoring.mjs';

const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const fail=(code='forbidden')=>({ok:false,code});
const exactly=(a,b)=>a&&b&&typeof a==='object'&&typeof b==='object'&&
 Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>a[k]===b[k]);

export function createSqlWorldReleaseGate({storage,projectId,verify=verifyFirebaseIdToken}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function')
  throw new TypeError('G1Y requires a trusted, initialized G1X SQL authority');
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray();
 const one=(q,...args)=>all(q,...args)[0]||null;
 const operator=user=>one("SELECT uid FROM vg_authoring_registry_operators_v1 WHERE uid=? AND status='active'",user)!==null;

 function assess(worldId,serialized,hash){
  const w=one('SELECT * FROM vg_authoring_worlds_v1 WHERE world_id=?',worldId);
  if(!w||w.draft_state!=='approved')return fail('world-not-approved');
  const s=one(`SELECT snapshot_json,snapshot_hash FROM vg_authoring_submissions_v1
   WHERE world_id=? AND revision=?`,worldId,w.draft_revision);
  const r=one('SELECT * FROM vg_authoring_reviews_v1 WHERE world_id=? AND revision=?',worldId,w.draft_revision);
  if(!s||!r||s.snapshot_hash!==hash||s.snapshot_json!==serialized||
   r.snapshot_hash!==hash||r.decision!=='approve')return fail('approval-conflict');
  let snap;
  try{snap=JSON.parse(serialized);}catch{return fail('invalid-snapshot');}
  if(snap.worldId!==worldId||snap.draftRevision!==w.draft_revision||
   snap.snapshotHash!==hash||snap.submittedBy===r.reviewer_uid)return fail('approval-conflict');
  const source=snap.content?.storySource;
  if(!source||!['library','original','manuscript'].includes(source.kind)||
   typeof source.storyId!=='string'||typeof source.storyVersion!=='string'||
   !/^[a-f0-9]{64}$/.test(source.contentHash))return fail('invalid-source');
  if(!Array.isArray(snap.content.assets)||!snap.content.assets.length)return fail('invalid-assets');
  const version=one(`SELECT content_hash FROM vg_authoring_source_versions_v1
   WHERE kind=? AND story_id=? AND story_version=?`,source.kind,source.storyId,source.storyVersion);
  const grant=one(`SELECT status,grant_revision FROM vg_authoring_source_grants_v1
   WHERE world_id=? AND kind=? AND story_id=? AND story_version=?`,worldId,source.kind,source.storyId,source.storyVersion);
  if(!version||version.content_hash!==source.contentHash||grant?.status!=='active'||grant.grant_revision<1)
   return fail('source-not-authorized');
  const objects=all(`SELECT status,authorized_uid,reference_json FROM vg_authoring_registry_objects_v1
   WHERE category='source' AND json_extract(reference_json,'$.kind')=? AND
   json_extract(reference_json,'$.storyId')=? AND json_extract(reference_json,'$.storyVersion')=?`,
   source.kind,source.storyId,source.storyVersion);
  if(objects.length!==1||objects[0].status!=='active'||objects[0].authorized_uid!==w.owner_uid||
   !exactly(JSON.parse(objects[0].reference_json),source))return fail('source-not-authorized');
  if(source.kind==='library'){
   const held=one(`SELECT notice_id FROM vg_authoring_source_notices_v1
    WHERE story_id=? AND content_hash=? AND status='open' LIMIT 1`,source.storyId,source.contentHash);
   if(held)return fail('source-held');
   const permit=one(`SELECT status,permit_json FROM vg_authoring_adaptation_permits_v1
    WHERE story_id=? AND content_hash=?`,source.storyId,source.contentHash);
   // Legacy G1F sources without a G1R permit remain in the registry; this
   // preflight cannot attest release rights for them without an operator decision.
   if(!permit)return fail('permit-untracked');
   if(permit.status!=='active')return fail('permit-revoked');
   const p=JSON.parse(permit.permit_json);
   if(p.authorizedUid!==w.owner_uid)return fail('permit-mismatch');
  }
  // An approved snapshot may still depend on images subsequently revoked.
  // The review's original decision is never rewritten by this fresh check.
  for(const ref of snap.content.assets){
   const asset=one(`SELECT v.kind,v.content_hash,g.status FROM vg_authoring_asset_versions_v1 v
    JOIN vg_authoring_asset_grants_v1 g ON v.asset_id=g.asset_id AND v.asset_version=g.asset_version
    WHERE g.world_id=? AND v.asset_id=? AND v.asset_version=?`,worldId,ref.assetId,ref.assetVersion);
   if(!asset||asset.status!=='active'||asset.kind!==ref.kind||asset.content_hash!==ref.contentHash)
    return fail('asset-not-authorized');
   const objects=all(`SELECT status,authorized_uid,reference_json FROM vg_authoring_registry_objects_v1
    WHERE category='asset' AND json_extract(reference_json,'$.assetId')=? AND
    json_extract(reference_json,'$.assetVersion')=?`,ref.assetId,ref.assetVersion);
   if(objects.length!==1||objects[0].status!=='active'||objects[0].authorized_uid!==w.owner_uid||
    !exactly(JSON.parse(objects[0].reference_json),{
     assetId:ref.assetId,assetVersion:ref.assetVersion,kind:ref.kind,contentHash:ref.contentHash}))
    return fail('asset-not-authorized');
  }
  return {ok:true,eligible:true,worldId,snapshotHash:hash,gateVersion:'world-release-1'};
 }

 async function evaluateApprovedWorld(request,input){
  if(!input||Object.keys(input).sort().join(',')!=='worldId'||!id(input.worldId))return fail('invalid-request');
  let user;
  try{const who=await verify(request,projectId);if(uid(who?.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   if(!operator(user))return fail();
   const snapshot=storage.transactionSync(()=>{
    if(!operator(user))return null;
    const w=one('SELECT draft_revision,draft_state FROM vg_authoring_worlds_v1 WHERE world_id=?',input.worldId);
    if(w?.draft_state!=='approved')return null;
    return one('SELECT snapshot_hash,snapshot_json FROM vg_authoring_submissions_v1 WHERE world_id=? AND revision=?',
     input.worldId,w.draft_revision);
   });
   if(!snapshot)return fail('world-not-approved');
   let value;
   try{value=JSON.parse(snapshot.snapshot_json);}catch{return fail('invalid-snapshot');}
   if(!await verifySubmissionIntegrity(value))return fail('invalid-snapshot');
   return storage.transactionSync(()=>{
    if(!operator(user))return fail();
    return assess(input.worldId,snapshot.snapshot_json,snapshot.snapshot_hash);
   });
  }catch{return fail('release-gate-unavailable');}
 }
 return Object.freeze({evaluateApprovedWorld});
}
