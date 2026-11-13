// G2A: fixture-only staging consistency probe. No consumer, network client,
// production connection or publication action is implemented here.
import {verifyFirebaseIdToken} from './auth.mjs';

const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const fail=(code='forbidden')=>({ok:false,code});
const only=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...keys].sort().join(',');

export function createSqlStagingReadinessService({storage,projectId,verify=verifyFirebaseIdToken,
 releaseGate,readCheckpoint,environment='fixture'}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||
  typeof releaseGate?.evaluateApprovedWorld!=='function'||typeof readCheckpoint!=='function'||
  environment!=='fixture')throw new TypeError('G2A needs trusted offline fixture and G1Y authority');
 const all=(sql,...params)=>storage.sql.exec(sql,...params).toArray();
 const one=(sql,...params)=>all(sql,...params)[0]||null;
 const operator=user=>one("SELECT uid FROM vg_authoring_registry_operators_v1 WHERE uid=? AND status='active'",user)!==null;

 function checkAuthority(user,checkpoint){
  return storage.transactionSync(()=>{
   if(!operator(user))return fail();
   // G1R permits from before G1U need an approved baseline migration. A cursor
   // at MAX(seq) is not proof that historical grants are represented.
   const missing=one(`SELECT story_id FROM vg_authoring_adaptation_permits_v1 p WHERE
    NOT EXISTS(SELECT 1 FROM vg_authoring_permit_outbox_v1 o WHERE
     o.story_id=p.story_id AND o.content_hash=p.content_hash AND o.permit_revision=1 AND o.status='active')
    OR (p.status='revoked' AND NOT EXISTS(SELECT 1 FROM vg_authoring_permit_outbox_v1 o WHERE
     o.story_id=p.story_id AND o.content_hash=p.content_hash AND o.permit_revision=p.revision AND o.status='revoked')) LIMIT 1`);
   if(missing)return fail('baseline-required');
   const head=one('SELECT COALESCE(MAX(seq),0) AS head FROM vg_authoring_permit_outbox_v1')?.head;
   if(!Number.isSafeInteger(head)||head<0)return fail('invalid-authority-head');
   if(checkpoint>head)return fail('checkpoint-ahead');
   if(checkpoint<head)return fail('checkpoint-lag');
   return {ok:true,head};
  });
 }

 async function checkWorld(request,input){
  if(!only(input,['worldId'])||!id(input.worldId))return fail('invalid-request');
  let user;
  try{const who=await verify(request,projectId);if(uid(who?.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   if(!operator(user))return fail();
   // readCheckpoint MUST be a trusted, read-only fixture adapter; no checkpoint
   // or projected permit state may be supplied by the requesting client.
   const projection=await readCheckpoint({projectId,environment:'fixture'});
   if(!only(projection,['projectId','environment','checkpoint'])||
    projection.projectId!==projectId||projection.environment!=='fixture'||
    !Number.isSafeInteger(projection.checkpoint)||projection.checkpoint<0)
    return fail('invalid-projection');
   const initial=checkAuthority(user,projection.checkpoint);
   if(!initial.ok)return initial;
   const decision=await releaseGate.evaluateApprovedWorld(request,{worldId:input.worldId});
   if(decision?.ok!==true)return decision?.ok===false&&typeof decision.code==='string'?
    fail(decision.code):fail('release-gate-unavailable');
   if(decision.eligible!==true||decision.worldId!==input.worldId||
    decision.gateVersion!=='world-release-1'||!/^[a-f0-9]{64}$/.test(decision.snapshotHash||''))
    return fail('invalid-gate-verdict');
   // A revoke may commit while the G1Y SHA-256 check yields; rescan outbox
   // after the async gate. G1Y also guards current permit/holds independently.
   const final=checkAuthority(user,projection.checkpoint);
   if(!final.ok)return final;
   if(final.head!==initial.head)return fail('authority-changed');
   return {ok:true,fixtureChecksPassed:true,worldId:input.worldId,snapshotHash:decision.snapshotHash,
    checkpoint:projection.checkpoint,readinessVersion:'staging-readiness-1',environment:'fixture'};
  }catch{return fail('staging-readiness-unavailable');}
 }
 return Object.freeze({checkWorld});
}
