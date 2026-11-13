// G4G — read-only reconciliation and restart audit for G4C–G4F SQLite
// fixtures. NO repair, migration, publisher approval, save or reward grant.
import {DatabaseSync} from 'node:sqlite';
import {copyAuthoringContent,hashAuthoringJson} from './vangioi-authoring.mjs';
import {inspectG4BSession} from './vangioi-engine-g4b.mjs';
import {G4C_FIXTURE_VERSION} from './vangioi-engine-g4c-fixture.mjs';
import {createG4EObjectiveFixture} from './vangioi-engine-g4e-objective-fixture.mjs';
import {G4F_POLICY_VERSION,G4F_SETTLEMENT_VERSION} from './vangioi-engine-g4f-settlement-fixture.mjs';

export const G4G_AUDIT_VERSION='g4g-recovery-audit-1';
const MAX_ROWS=4096;
const fail=code=>({ok:false,code});
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const POLICY_FIELDS=['version','policyId','policyRevision','missionId','completionVersion',
 'contentVersion','contentHash','mode'];
const G4F_RECEIPT_FIELDS=['version','worldInstanceId','playerId','missionId',
 'completionVersion','requestId','decisionId','policyId','policyRevision',
 'evidenceRevision','evidenceChainHash','dryRunCommitted','missionCompleted',
 'saveCommitted','rewardAuthorized','rewardCommitted','productionAuthorized'];
const G4C_RECEIPT_FIELDS=['eventId','revision','chainHash','fixtureVersion',
 'worldInstanceId','contentVersion','contentHash'];
async function digestOrNull(value){
 try{return await hashAuthoringJson(value);}catch{return null;}
}

// No local result can satisfy these external production-release gates.
export const G4G_PRODUCTION_BLOCKERS=Object.freeze([
 'trusted-player-and-adjudicator-issuer-not-connected',
 'approved-real-reward-policy-and-ledger-not-connected',
 'non-reach-objective-and-ending-proofs-not-implemented',
 'cross-storage-revocation-and-outbox-atomicity-unproven',
 'production-migration-rollout-rollback-unapproved',
 'live-security-and-device-qa-not-certified'
]);

function readSnapshot(db,instance){
 db.exec('BEGIN');
 try{
  const one=(sql,...args)=>db.prepare(sql).get(...args)||null;
  const all=(sql,...args)=>db.prepare(sql).all(...args);
  const snapshot={
   session:one('SELECT * FROM vg_g4c_sessions_fixture_v1 WHERE world_instance_id=?',instance),
   gate:one('SELECT * FROM vg_g4c_gates_fixture_v1 WHERE world_instance_id=?',instance),
   fence:one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?',instance),
   eventReceipts:all('SELECT * FROM vg_g4c_receipts_fixture_v1 WHERE world_instance_id=? ORDER BY event_id',instance),
   eventLedger:all('SELECT * FROM vg_g4c_ledger_fixture_v1 WHERE world_instance_id=? ORDER BY revision',instance),
   policyRows:all('SELECT * FROM vg_g4f_policies_fixture_v1 ORDER BY mission_id,completion_version'),
   settlementReceipts:all('SELECT * FROM vg_g4f_receipts_fixture_v1 WHERE world_instance_id=? ORDER BY mission_id,completion_version',instance),
   settlementLedger:all('SELECT * FROM vg_g4f_ledger_fixture_v1 WHERE world_instance_id=? ORDER BY mission_id,completion_version',instance)
  };
  db.exec('COMMIT');return snapshot;
 }catch(e){db.exec('ROLLBACK');throw e;}
}

// The auditor accepts only a trusted TEST HOST's database handle. It does
// not accept a browser-supplied session, policy, proof, reward or JWT claim.
export async function createG4GRecoveryAuditor({database,plan,world}={}){
 if(!(database instanceof DatabaseSync))throw new TypeError('G4G is Node SQLite only');
 const verified=await createG4EObjectiveFixture({database,plan,world});
 if(!verified.ok)return verified;
 const content=copyAuthoringContent(world);
 const missions=new Map(content.missions.map(m=>[m.missionId,m]));
 const ruleDestinations=new Map(plan.rules.map(r=>[r.ruleId,r.toSceneId]));

 async function inspect(request){
  if(!exact(request,['worldInstanceId'])||!id(request.worldInstanceId))
   return fail('invalid-audit-request');
  const instance=request.worldInstanceId;
  let snapshot;
  try{snapshot=readSnapshot(database,instance);}catch{return fail('fixture-read-unavailable');}
  if(!snapshot.session)return fail('fixture-instance-not-found');
  if(Object.values(snapshot).some(v=>Array.isArray(v)&&v.length>MAX_ROWS))
   return fail('audit-row-budget-exceeded');
  const issues=new Set();
  const flag=code=>issues.add(code);
  const {session:row,gate,fence,eventReceipts,eventLedger,policyRows,
   settlementReceipts,settlementLedger}=snapshot;
  let session;
  try{session=JSON.parse(row.session_json);}catch{flag('g4c-session-json-invalid');}
  if(!plain(session)||!Array.isArray(session.events)){
   flag('g4c-session-json-invalid');session=null;
  }
  let replayOk=false;
  if(session){
   const replay=await inspectG4BSession(plan,session);
   replayOk=replay.ok&&session.playerId===row.player_id&&
    session.worldInstanceId===instance&&session.revision===row.revision&&
    session.chainHash===row.chain_hash&&session.contentHash===row.content_hash&&
    session.contentVersion===row.content_version&&row.content_hash===plan.contentHash&&
    row.content_version===plan.contentVersion;
   if(!replayOk)flag('g4c-replay-or-pin-invalid');
  }
  if(!gate||!fence)flag('g4d-gate-or-fence-missing');
  // Revocation, current source rotation or held license may be legitimate
  // AFTER committed history; never count that as a forged past receipt.
  const currentlyAllowed=!!gate&&!!fence&&fence.status==='active'&&
   hash(fence.snapshot_hash)&&Number.isSafeInteger(fence.fence_epoch)&&fence.fence_epoch>=1&&
   Number.isSafeInteger(fence.access_revision)&&fence.access_revision>=1&&
   gate.access_state==='allowed'&&gate.license_state==='active'&&
   gate.source_state==='current'&&gate.player_id===row.player_id&&
   fence.player_id===row.player_id&&gate.source_hash===row.source_hash&&
   fence.source_hash===row.source_hash&&gate.source_version===row.source_version&&
   fence.source_version===row.source_version&&gate.content_hash===row.content_hash&&
   fence.content_hash===row.content_hash&&gate.content_version===row.content_version&&
   fence.content_version===row.content_version;
  if(session){
   if(eventReceipts.length!==session.events.length||eventLedger.length!==session.events.length)
    flag('g4c-event-count-mismatch');
   const byEvent=new Map(eventReceipts.map(r=>[r.event_id,r]));
   for(const [index,event] of session.events.entries()){
    if(!plain(event)||!id(event.eventId)){
     flag('g4c-event-record-invalid');continue;
    }
    const receiptRow=byEvent.get(event.eventId),audit=eventLedger[index];
    if(!receiptRow||!audit){flag('g4c-event-row-missing');continue;}
    let receipt;
    try{receipt=JSON.parse(receiptRow.receipt_json);}catch{flag('g4c-receipt-json-invalid');continue;}
    if(!exact(receipt,G4C_RECEIPT_FIELDS)){
     flag('g4c-receipt-json-invalid');continue;
    }
    if(receipt.fixtureVersion!==G4C_FIXTURE_VERSION||receipt.eventId!==event.eventId||
     receipt.revision!==index+1||receipt.chainHash!==event.chainHash||
     receipt.worldInstanceId!==instance||receipt.contentHash!==plan.contentHash||
     receipt.contentVersion!==plan.contentVersion||
     receiptRow.request_hash!==event.requestHash||audit.event_id!==event.eventId||
     audit.request_hash!==event.requestHash||audit.revision!==index+1||
     audit.kind!=='scene_transition_only'||audit.reward_authorized!==0)
     flag('g4c-event-receipt-ledger-mismatch');
   }
  }

  const policyMap=new Map();
  for(const row of policyRows){
   const key=row.mission_id+'\u0000'+row.completion_version;
   if(policyMap.has(key)){flag('g4f-policy-duplicate');continue;}
   policyMap.set(key,row);
   let policy;
   try{policy=JSON.parse(row.policy_json);}catch{flag('g4f-policy-json-invalid');continue;}
   if(!exact(policy,POLICY_FIELDS)){
    flag('g4f-policy-json-invalid');continue;
   }
   if(policy.version!==G4F_POLICY_VERSION||
    policy.mode!=='dry-run-only'||policy.missionId!==row.mission_id||
    policy.completionVersion!==row.completion_version||
    policy.contentVersion!==plan.contentVersion||policy.contentHash!==plan.contentHash||
    !Number.isSafeInteger(row.policy_epoch)||row.policy_epoch<1||
    !['active','revoked'].includes(row.status)||
    await digestOrNull(policy)!==row.policy_hash)
    flag('g4f-policy-pin-invalid');
  }
  if(settlementReceipts.length!==settlementLedger.length)
   flag('g4f-settlement-count-mismatch');
  const ledgerMap=new Map(settlementLedger.map(r=>[r.mission_id+'\u0000'+r.completion_version,r]));
  const receiptKeys=new Set();
  for(const stored of settlementReceipts){
   const key=stored.mission_id+'\u0000'+stored.completion_version;
   receiptKeys.add(key);
   const audit=ledgerMap.get(key),policyRow=policyMap.get(key);
   if(!audit){flag('g4f-ledger-missing');continue;}
   if(!policyRow){flag('g4f-policy-missing');continue;}
   let receipt;
   try{receipt=JSON.parse(stored.receipt_json);}catch{flag('g4f-receipt-json-invalid');continue;}
   if(!exact(receipt,G4F_RECEIPT_FIELDS)){
    flag('g4f-receipt-json-invalid');continue;
   }
   if(receipt.version!==G4F_SETTLEMENT_VERSION||
    receipt.worldInstanceId!==instance||receipt.playerId!==row.player_id||
    receipt.missionId!==stored.mission_id||receipt.completionVersion!==stored.completion_version||
    receipt.requestId!==stored.request_id||receipt.dryRunCommitted!==true||
    receipt.missionCompleted!==false||receipt.saveCommitted!==false||
    receipt.rewardAuthorized!==false||receipt.rewardCommitted!==false||
    receipt.productionAuthorized!==false||stored.policy_hash!==policyRow.policy_hash||
    receipt.evidenceRevision<1||!Number.isSafeInteger(receipt.evidenceRevision)||
    !hash(receipt.evidenceChainHash)||!id(receipt.decisionId)||
    audit.request_id!==stored.request_id||audit.receipt_hash!==stored.receipt_hash||
    audit.kind!=='dry_run_only'||audit.reward_authorized!==0||audit.reward_committed!==0||
    await digestOrNull(receipt)!==stored.receipt_hash||
    await digestOrNull({worldInstanceId:instance,missionId:stored.mission_id,
     completionVersion:stored.completion_version,requestId:stored.request_id})!==stored.request_hash)
    flag('g4f-receipt-ledger-mismatch');
   let policy;
   try{policy=JSON.parse(policyRow.policy_json);}catch{continue;}
   if(receipt.policyId!==policy.policyId||receipt.policyRevision!==policy.policyRevision)
    flag('g4f-settlement-policy-mismatch');
   const event=session?.events?.[receipt.evidenceRevision-1];
   if(!event||event?.chainHash!==receipt.evidenceChainHash)
    flag('g4f-historical-evidence-mismatch');
   const mission=missions.get(receipt.missionId);
   if(!mission||!session||!Number.isSafeInteger(receipt.evidenceRevision)||
    !mission.objectives.every(o=>o.verb==='reach'&&o.requiredCount===1&&
     session.events.slice(0,receipt.evidenceRevision).some(e=>
      ruleDestinations.get(e?.ruleId)===o.targetId)))
    flag('g4f-settlement-without-objectives');
  }
  for(const key of ledgerMap.keys())if(!receiptKeys.has(key))flag('g4f-orphan-ledger');
  const fingerprint=await hashAuthoringJson(snapshot);
  const anomalies=[...issues].sort();
  return {ok:true,version:G4G_AUDIT_VERSION,worldInstanceId:instance,
   integrity:anomalies.length?'anomalies':'consistent',anomalies,
   fixtureReplayConsistent:replayOk&&anomalies.length===0,
   currentAccess:currentlyAllowed?'synthetic-allowed':'synthetic-blocked-or-stale',
   revision:Number.isSafeInteger(row.revision)?row.revision:null,
   counts:{events:eventLedger.length,settlements:settlementLedger.length,policies:policyRows.length},
   checkpointFingerprint:fingerprint,repairPerformed:false,
   productionReadiness:{ready:false,blockers:[...G4G_PRODUCTION_BLOCKERS]},
   rewardAuthorized:false,rewardCommitted:false,saveCommitted:false,
   missionCompleted:false,productionAuthorized:false};
 }
 return {ok:true,auditor:Object.freeze({inspect})};
}
