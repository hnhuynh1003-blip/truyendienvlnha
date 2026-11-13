// G4E — offline-only, read-only objective evidence against COMMITTED G4C
// SQLite receipts/ledger. This is not mission completion, a reward authority,
// a playable endpoint, or a trusted cross-storage proof.
import {DatabaseSync} from 'node:sqlite';
import {copyAuthoringContent,copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
import {inspectContent} from './vangioi-content.mjs';
import {G4A_ENGINE_VERSION} from './vangioi-engine-g4a.mjs';
import {G4C_FIXTURE_VERSION} from './vangioi-engine-g4c-fixture.mjs';
import {inspectG4BSession} from './vangioi-engine-g4b.mjs';

export const G4E_OBJECTIVE_FIXTURE_VERSION='g4e-objective-evidence-1';
const fail=code=>({ok:false,code});
const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const receiptKeys=['eventId','revision','chainHash','fixtureVersion',
 'worldInstanceId','contentVersion','contentHash'];

// A synchronous SQLite read transaction provides a consistent committed
// snapshot of session, gate, G4D fence, receipts and ledger. Never await in it.
function readCommitted(database,worldInstanceId){
 database.exec('BEGIN');
 try{
  const one=(sql,...args)=>database.prepare(sql).get(...args)||null;
  const all=(sql,...args)=>database.prepare(sql).all(...args);
  const state=one('SELECT * FROM vg_g4c_sessions_fixture_v1 WHERE world_instance_id=?',worldInstanceId);
  const gate=one('SELECT * FROM vg_g4c_gates_fixture_v1 WHERE world_instance_id=?',worldInstanceId);
  const fence=one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?',worldInstanceId);
  const receipts=all('SELECT * FROM vg_g4c_receipts_fixture_v1 WHERE world_instance_id=?',worldInstanceId);
  const ledger=all('SELECT * FROM vg_g4c_ledger_fixture_v1 WHERE world_instance_id=? ORDER BY revision',worldInstanceId);
  database.exec('COMMIT');
  return {state,gate,fence,receipts,ledger};
 }catch(error){database.exec('ROLLBACK');throw error;}
}

// Caller supplies a G4A plan compiled from a host-approved immutable manifest.
// No content, mission or authority claims are accepted from a player event.
export async function createG4EObjectiveFixture({database,plan,world}={}){
 if(!(database instanceof DatabaseSync)||!plain(plan)||plan.engineVersion!==G4A_ENGINE_VERSION||
  !digest(plan.contentHash)||typeof plan.contentVersion!=='string'||
  !Array.isArray(plan.rules))throw new TypeError('G4E requires SQLite and a pinned G4A plan');
 let content,pinnedPlan;
 try{content=copyAuthoringContent(world);pinnedPlan=copyAuthoringJson(plan);}
 catch{return fail('invalid-world-or-plan');}
 if(!inspectContent(content).valid)return fail('invalid-world');
 if(content.contentVersion!==pinnedPlan.contentVersion||
  await hashAuthoringJson(content)!==pinnedPlan.contentHash)return fail('stale-world');
 const sceneIds=new Set(content.scenes.map(s=>s.sceneId));
 const edges=new Map();
 for(const rule of pinnedPlan.rules){
  if(!plain(rule)||!identifier(rule.ruleId)||!sceneIds.has(rule.toSceneId)||
   edges.has(rule.ruleId))return fail('invalid-plan');
  const from=content.scenes.find(s=>s.sceneId===rule.fromSceneId);
  if(!from?.transitions?.some(e=>e.toSceneId===rule.toSceneId))return fail('invalid-plan');
  edges.set(rule.ruleId,rule.toSceneId);
 }
 // This is a schema-preserving view of actual authored missions. Only one
 // arrival per reach target is semantically supported; other verbs/counts
 // require new, independently verified engine actions in a later stage.
 const missions=content.missions.map(m=>({missionId:m.missionId,kind:m.kind,
  requiredForCompletion:m.requiredForCompletion,objectives:m.objectives.map(o=>({
   objectiveId:o.objectiveId,verb:o.verb,targetId:o.targetId,requiredCount:o.requiredCount,
   supported:o.verb==='reach'&&o.requiredCount===1&&sceneIds.has(o.targetId)
  }))}));

 async function evaluate(request){
  // actorId comes from the offline test driver, never from a browser/player
  // identity claim. No arbitrary session/evidence payload is accepted.
  if(!exact(request,['worldInstanceId','actorId'])||
   !identifier(request.worldInstanceId)||!identifier(request.actorId))return fail('invalid-request');
  let snapshot;
  try{snapshot=readCommitted(database,request.worldInstanceId);}
  catch{return fail('fixture-read-unavailable');}
  const {state,gate,fence,receipts,ledger}=snapshot;
  if(!state||!gate||!fence)return fail('authority-fence-unavailable');
  if(state.player_id!==request.actorId||gate.player_id!==request.actorId||
   fence.player_id!==request.actorId||state.world_instance_id!==fence.world_instance_id||
   gate.world_instance_id!==state.world_instance_id||fence.status!=='active'||
   !Number.isSafeInteger(fence.access_revision)||fence.access_revision<1||
   !Number.isSafeInteger(fence.fence_epoch)||fence.fence_epoch<1||
   gate.access_state!=='allowed'||gate.license_state!=='active'||gate.source_state!=='current')
   return fail('fixture-access-denied');
  if(state.content_version!==pinnedPlan.contentVersion||
   state.content_hash!==pinnedPlan.contentHash||
   gate.content_version!==state.content_version||gate.content_hash!==state.content_hash||
   fence.content_version!==state.content_version||fence.content_hash!==state.content_hash||
   state.source_version!==gate.source_version||state.source_hash!==gate.source_hash||
   state.source_version!==fence.source_version||state.source_hash!==fence.source_hash||
   !digest(fence.snapshot_hash))return fail('fixture-pin-mismatch');
  let session;
  try{session=JSON.parse(state.session_json);}catch{return fail('fixture-evidence-corrupt');}
  const replay=await inspectG4BSession(pinnedPlan,session);
  if(!replay.ok||session.playerId!==state.player_id||
   session.worldInstanceId!==state.world_instance_id||session.entryId!==fence.entry_id||
   session.revision!==state.revision||session.chainHash!==state.chain_hash)
   return fail('fixture-evidence-corrupt');
  if(receipts.length!==session.events.length||ledger.length!==session.events.length)
   return fail('fixture-evidence-incomplete');
  const byEvent=new Map();
  for(const row of receipts){
   if(byEvent.has(row.event_id))return fail('fixture-evidence-corrupt');
   byEvent.set(row.event_id,row);
  }
  const arrivalEvidence=new Map();
  for(const [index,event] of session.events.entries()){
   const storedReceipt=byEvent.get(event.eventId),audit=ledger[index];
   if(!storedReceipt||!audit)return fail('fixture-evidence-incomplete');
   let receipt;
   try{receipt=JSON.parse(storedReceipt.receipt_json);}catch{return fail('fixture-evidence-corrupt');}
   if(!exact(receipt,receiptKeys)||receipt.fixtureVersion!==G4C_FIXTURE_VERSION||
    receipt.eventId!==event.eventId||receipt.revision!==index+1||
    receipt.chainHash!==event.chainHash||receipt.worldInstanceId!==state.world_instance_id||
    receipt.contentVersion!==state.content_version||receipt.contentHash!==state.content_hash||
    storedReceipt.request_hash!==event.requestHash||
    audit.event_id!==event.eventId||audit.revision!==index+1||
    audit.request_hash!==event.requestHash||audit.kind!=='scene_transition_only'||
    audit.reward_authorized!==0)return fail('fixture-evidence-corrupt');
   const target=edges.get(event.ruleId);
   if(!target)return fail('fixture-evidence-corrupt');
   // A start scene is NOT an arrived-at scene. No client-provided claimed
   // count, last-known flag or free-text trigger can create objective proof.
   if(!arrivalEvidence.has(target))arrivalEvidence.set(target,{eventId:event.eventId,
    revision:index+1,chainHash:event.chainHash,ruleId:event.ruleId});
  }
  return {ok:true,version:G4E_OBJECTIVE_FIXTURE_VERSION,authority:'offline-fixture-only',
   worldInstanceId:state.world_instance_id,playerId:state.player_id,
   contentVersion:state.content_version,contentHash:state.content_hash,
   revision:state.revision,chainHash:state.chain_hash,
   missions:missions.map(m=>{
    const objectives=m.objectives.map(o=>({objectiveId:o.objectiveId,
     status:!o.supported?'unsupported':arrivalEvidence.has(o.targetId)?'observed':'pending',
     ...((o.supported&&arrivalEvidence.has(o.targetId))?
      {evidence:arrivalEvidence.get(o.targetId)}:{})}));
    return {missionId:m.missionId,kind:m.kind,requiredForCompletion:m.requiredForCompletion,
     objectives,reviewCandidate:objectives.every(o=>o.status==='observed')};
   }),missionCompleted:false,endingVerified:false,saveCommitted:false,
   rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false};
 }
 return {ok:true,fixture:Object.freeze({evaluate})};
}
