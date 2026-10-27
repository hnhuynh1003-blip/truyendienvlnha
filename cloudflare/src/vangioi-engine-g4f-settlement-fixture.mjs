// G4F — Node-only dry-run settlement rehearsal. It NEVER completes a real
// mission or grants EXP, money, items, access, inventory or player rewards.
// Host-supplied reviewers/policies are SYNTHETIC and not server credentials.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {copyAuthoringContent,copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
import {createG4EObjectiveFixture} from './vangioi-engine-g4e-objective-fixture.mjs';

export const G4F_SETTLEMENT_VERSION='g4f-dry-run-settlement-1';
export const G4F_POLICY_VERSION='g4f-dry-run-policy-1';
const fail=code=>({ok:false,code});
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const policyKeys=['version','policyId','policyRevision','missionId','completionVersion',
 'contentVersion','contentHash','mode'];
const commandKeys=['adjudicatorRequest','worldInstanceId','missionId','completionVersion','requestId'];
const decisionKeys=['approved','decisionId','missionId','contentHash','evidenceRevision','evidenceChainHash'];
const digestJson=value=>createHash('sha256').update(JSON.stringify(copyAuthoringJson(value))).digest('hex');

function transaction(db,work){
 db.exec('BEGIN IMMEDIATE');
 try{const result=work();db.exec('COMMIT');return result;}
 catch(error){db.exec('ROLLBACK');throw error;}
}
function init(db){
 db.exec(`CREATE TABLE IF NOT EXISTS vg_g4f_policies_fixture_v1(
  mission_id TEXT NOT NULL,completion_version TEXT NOT NULL,policy_json TEXT NOT NULL,
  policy_hash TEXT NOT NULL,policy_epoch INTEGER NOT NULL CHECK(policy_epoch>=1),
  status TEXT NOT NULL CHECK(status IN ('active','revoked')),
  PRIMARY KEY(mission_id,completion_version));
 CREATE TABLE IF NOT EXISTS vg_g4f_receipts_fixture_v1(
  world_instance_id TEXT NOT NULL,mission_id TEXT NOT NULL,completion_version TEXT NOT NULL,
  request_id TEXT NOT NULL,request_hash TEXT NOT NULL,policy_hash TEXT NOT NULL,
  receipt_hash TEXT NOT NULL,receipt_json TEXT NOT NULL,
  PRIMARY KEY(world_instance_id,mission_id,completion_version),
  UNIQUE(world_instance_id,request_id));
 CREATE TABLE IF NOT EXISTS vg_g4f_ledger_fixture_v1(
  world_instance_id TEXT NOT NULL,mission_id TEXT NOT NULL,completion_version TEXT NOT NULL,
  request_id TEXT NOT NULL,receipt_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind='dry_run_only'),
  reward_authorized INTEGER NOT NULL DEFAULT 0 CHECK(reward_authorized=0),
  reward_committed INTEGER NOT NULL DEFAULT 0 CHECK(reward_committed=0),
  PRIMARY KEY(world_instance_id,mission_id,completion_version));
 CREATE TRIGGER IF NOT EXISTS vg_g4f_policy_pin_immutable BEFORE UPDATE OF
  mission_id,completion_version,policy_json,policy_hash ON vg_g4f_policies_fixture_v1
 BEGIN SELECT RAISE(ABORT,'fixture-policy-pin-immutable'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4f_policy_no_delete BEFORE DELETE ON vg_g4f_policies_fixture_v1
 BEGIN SELECT RAISE(ABORT,'fixture-policy-no-delete'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4f_policy_no_aba BEFORE UPDATE OF status,policy_epoch
  ON vg_g4f_policies_fixture_v1
 WHEN NOT (OLD.status='active' AND NEW.status='revoked' AND
  NEW.policy_epoch=OLD.policy_epoch+1)
 BEGIN SELECT RAISE(ABORT,'fixture-policy-revocation-monotonic'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4f_receipt_no_update BEFORE UPDATE ON vg_g4f_receipts_fixture_v1
 BEGIN SELECT RAISE(ABORT,'fixture-receipt-immutable'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4f_receipt_no_delete BEFORE DELETE ON vg_g4f_receipts_fixture_v1
 BEGIN SELECT RAISE(ABORT,'fixture-receipt-immutable'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4f_ledger_no_update BEFORE UPDATE ON vg_g4f_ledger_fixture_v1
 BEGIN SELECT RAISE(ABORT,'fixture-ledger-immutable'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4f_ledger_no_delete BEFORE DELETE ON vg_g4f_ledger_fixture_v1
 BEGIN SELECT RAISE(ABORT,'fixture-ledger-immutable'); END;`);
}

// The fixture has no public route and no method accepting author rewardRequest.
// seedPolicy is performed by the test host, NEVER by Creator/client/player.
export async function createG4FSettlementFixture({database,plan,world,verifyAdjudicator,
 adjudicateMission,onBeforeCommit,onCommitStep}={}){
 if(!(database instanceof DatabaseSync)||typeof verifyAdjudicator!=='function'||
  typeof adjudicateMission!=='function'||
  (onBeforeCommit!==undefined&&typeof onBeforeCommit!=='function')||
  (onCommitStep!==undefined&&typeof onCommitStep!=='function'))
  throw new TypeError('G4F requires a Node fixture and synthetic host adjudication');
 const evidence=await createG4EObjectiveFixture({database,plan,world});
 if(!evidence.ok)return evidence;
 let worldContent;
 try{worldContent=copyAuthoringContent(world);}catch{return fail('invalid-world');}
 const missionIds=new Set(worldContent.missions.map(m=>m.missionId));
 init(database);
 const one=(sql,...args)=>database.prepare(sql).get(...args)||null;
 const run=(sql,...args)=>database.prepare(sql).run(...args);
 const stateRow=instance=>one('SELECT * FROM vg_g4c_sessions_fixture_v1 WHERE world_instance_id=?',instance);
 const gateRow=instance=>one('SELECT * FROM vg_g4c_gates_fixture_v1 WHERE world_instance_id=?',instance);
 const fenceRow=instance=>one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?',instance);
 const policyRow=(mission,completion)=>one('SELECT * FROM vg_g4f_policies_fixture_v1 WHERE mission_id=? AND completion_version=?',mission,completion);
 const receiptByKey=(instance,mission,completion)=>one(`SELECT * FROM vg_g4f_receipts_fixture_v1
  WHERE world_instance_id=? AND mission_id=? AND completion_version=?`,instance,mission,completion);
 const receiptById=(instance,requestId)=>one('SELECT * FROM vg_g4f_receipts_fixture_v1 WHERE world_instance_id=? AND request_id=?',instance,requestId);
 const ledgerByKey=(instance,mission,completion)=>one(`SELECT * FROM vg_g4f_ledger_fixture_v1
  WHERE world_instance_id=? AND mission_id=? AND completion_version=?`,instance,mission,completion);
 const read=(instance,mission,completion)=>({state:stateRow(instance),gate:gateRow(instance),
  fence:fenceRow(instance),policy:policyRow(mission,completion)});
 const same=(before,after)=>JSON.stringify(before)===JSON.stringify(after);

 // Caller MUST be a test operator; this is NOT a publisher approval service.
 async function seedPolicy(input){
  let p;
  try{p=copyAuthoringJson(input);}catch{return fail('invalid-dry-run-policy');}
  if(!exact(p,policyKeys)||p.version!==G4F_POLICY_VERSION||
   !id(p.policyId)||!Number.isSafeInteger(p.policyRevision)||p.policyRevision<1||
   !missionIds.has(p.missionId)||!id(p.completionVersion)||
   p.contentVersion!==plan.contentVersion||p.contentHash!==plan.contentHash||
   p.mode!=='dry-run-only')return fail('invalid-dry-run-policy');
  const digest=await hashAuthoringJson(p);
  try{
   transaction(database,()=>run('INSERT INTO vg_g4f_policies_fixture_v1 VALUES(?,?,?,?,?,?)',
    p.missionId,p.completionVersion,JSON.stringify(p),digest,1,'active'));
  }catch{return fail('dry-run-policy-exists-or-unavailable');}
  return {ok:true,policyFixtureOnly:true,productionAuthorized:false};
 }

 function admission(context,instance){
  const {state,gate,fence,policy}=context;
  if(!state||!gate||!fence)return fail('fixture-gate-unavailable');
  if(!policy||policy.status!=='active'||!Number.isSafeInteger(policy.policy_epoch)||
   policy.policy_epoch<1)return fail('dry-run-policy-denied');
  let pinnedPolicy;
  try{pinnedPolicy=JSON.parse(policy.policy_json);}catch{return fail('dry-run-policy-corrupt');}
  if(!exact(pinnedPolicy,policyKeys)||pinnedPolicy.version!==G4F_POLICY_VERSION||
   pinnedPolicy.mode!=='dry-run-only'||pinnedPolicy.missionId!==policy.mission_id||
   pinnedPolicy.completionVersion!==policy.completion_version||
   pinnedPolicy.contentVersion!==plan.contentVersion||pinnedPolicy.contentHash!==plan.contentHash||
   !Number.isSafeInteger(pinnedPolicy.policyRevision)||pinnedPolicy.policyRevision<1||
   digestJson(pinnedPolicy)!==policy.policy_hash)return fail('dry-run-policy-corrupt');
  if(state.world_instance_id!==instance||gate.world_instance_id!==instance||
   fence.world_instance_id!==instance||state.player_id!==gate.player_id||
   state.player_id!==fence.player_id||fence.status!=='active'||
   !Number.isSafeInteger(fence.fence_epoch)||fence.fence_epoch<1||
   gate.access_state!=='allowed'||gate.license_state!=='active'||gate.source_state!=='current')
   return fail('fixture-gate-denied');
  if(state.content_version!==plan.contentVersion||state.content_hash!==plan.contentHash||
   gate.content_version!==state.content_version||gate.content_hash!==state.content_hash||
   fence.content_version!==state.content_version||fence.content_hash!==state.content_hash||
   gate.source_hash!==state.source_hash||fence.source_hash!==state.source_hash||
   gate.source_version!==state.source_version||fence.source_version!==state.source_version||
   !hash(fence.snapshot_hash))return fail('fixture-pin-mismatch');
  return {ok:true};
 }

 function duplicate(instance,mission,completion,requestId,requestHash,policyHash){
  const priorId=receiptById(instance,requestId);
  const prior=receiptByKey(instance,mission,completion);
  if(priorId&&(!prior||priorId.mission_id!==mission||
   priorId.completion_version!==completion))return fail('settlement-request-conflict');
  if(!prior)return null;
  if(prior.request_id!==requestId||prior.request_hash!==requestHash)
   return fail('settlement-key-conflict');
  if(prior.policy_hash!==policyHash)return fail('dry-run-policy-changed');
  const audit=ledgerByKey(instance,mission,completion);
  if(!audit||audit.request_id!==prior.request_id||audit.receipt_hash!==prior.receipt_hash||
   audit.kind!=='dry_run_only'||audit.reward_authorized!==0||audit.reward_committed!==0)
   return fail('settlement-ledger-corrupt');
  let receipt;
  try{receipt=JSON.parse(prior.receipt_json);}catch{return fail('settlement-receipt-corrupt');}
  if(!exact(receipt,['version','worldInstanceId','playerId','missionId','completionVersion',
   'requestId','decisionId','policyId','policyRevision','evidenceRevision','evidenceChainHash',
   'dryRunCommitted','missionCompleted','saveCommitted','rewardAuthorized',
   'rewardCommitted','productionAuthorized'])||
   receipt.version!==G4F_SETTLEMENT_VERSION||receipt.worldInstanceId!==instance||
   receipt.missionId!==mission||receipt.completionVersion!==completion||
   receipt.requestId!==requestId||receipt.rewardAuthorized!==false||
   receipt.rewardCommitted!==false||receipt.missionCompleted!==false||
   receipt.saveCommitted!==false||
   receipt.productionAuthorized!==false||receipt.dryRunCommitted!==true||
   digestJson(receipt)!==prior.receipt_hash)
   return fail('settlement-receipt-corrupt');
  return {ok:true,duplicate:true,receipt,dryRunCommitted:true,missionCompleted:false,
   saveCommitted:false,
   rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false};
 }

 async function settle(command){
  if(!exact(command,commandKeys)||!id(command.worldInstanceId)||
   !missionIds.has(command.missionId)||!id(command.completionVersion)||
   !id(command.requestId))return fail('invalid-settlement-request');
  // This callback stands in for a trusted host, not client-provided role flags.
  let adjudicator;
  try{adjudicator=await verifyAdjudicator(command.adjudicatorRequest);}
  catch{return fail('unverified-adjudicator');}
  if(!exact(adjudicator,['adjudicatorId'])||!id(adjudicator.adjudicatorId))
   return fail('unverified-adjudicator');
  const {worldInstanceId,missionId,completionVersion,requestId}=command;
  const requestHash=await hashAuthoringJson({worldInstanceId,missionId,completionVersion,requestId});
  let baseline;
  try{
   const first=transaction(database,()=>{
    const snapshot=read(worldInstanceId,missionId,completionVersion);
    const allowed=admission(snapshot,worldInstanceId);
    if(!allowed.ok)return allowed;
    const prior=duplicate(worldInstanceId,missionId,completionVersion,requestId,
     requestHash,snapshot.policy.policy_hash);
    return prior||{ok:true,snapshot};
   });
   if(!first.ok)return first;
   if(first.duplicate){
    const state=stateRow(worldInstanceId);
    const replay=await evidence.fixture.evaluate({worldInstanceId,actorId:state.player_id});
    return replay.ok&&replay.missions.some(m=>m.missionId===missionId&&m.reviewCandidate)?
     first:fail('objective-evidence-unavailable');
   }
   baseline=first.snapshot;
  }catch{return fail('settlement-transaction-failed');}

  // G4E reads only receipts and ledger already committed by G4D/G4C. It
  // cannot decide mission success or authorize money/rewards on its own.
  const proof=await evidence.fixture.evaluate({worldInstanceId,actorId:baseline.state.player_id});
  if(!proof.ok)return fail('objective-evidence-unavailable');
  const mission=proof.missions.find(m=>m.missionId===missionId);
  if(!mission?.reviewCandidate)return fail('mission-not-proven');
  if(proof.revision!==baseline.state.revision||proof.chainHash!==baseline.state.chain_hash||
   proof.playerId!==baseline.state.player_id||proof.contentHash!==plan.contentHash)
   return fail('settlement-evidence-stale');
  let decision;
  try{decision=copyAuthoringJson(await adjudicateMission({
   adjudicatorId:adjudicator.adjudicatorId,worldInstanceId,missionId,proof
  }));}catch{return fail('adjudication-unavailable');}
  if(!exact(decision,decisionKeys)||decision.approved!==true||!id(decision.decisionId)||
   decision.missionId!==missionId||decision.contentHash!==plan.contentHash||
   decision.evidenceRevision!==proof.revision||decision.evidenceChainHash!==proof.chainHash)
   return fail('adjudication-denied');
  const policy=JSON.parse(baseline.policy.policy_json);
  const receipt={version:G4F_SETTLEMENT_VERSION,worldInstanceId,
   playerId:proof.playerId,missionId,completionVersion,requestId,
   decisionId:decision.decisionId,policyId:policy.policyId,
   policyRevision:policy.policyRevision,evidenceRevision:proof.revision,
   evidenceChainHash:proof.chainHash,dryRunCommitted:true,missionCompleted:false,
   saveCommitted:false,rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false};
  const receiptHash=await hashAuthoringJson(receipt);
  try{
   await onBeforeCommit?.(); // may change fixture state; never await INSIDE BEGIN IMMEDIATE
   return transaction(database,()=>{
    const current=read(worldInstanceId,missionId,completionVersion);
    const allowed=admission(current,worldInstanceId);
    if(!allowed.ok)return allowed;
    const prior=duplicate(worldInstanceId,missionId,completionVersion,requestId,
     requestHash,current.policy.policy_hash);
    if(prior)return prior; // a concurrent writer won; no second ledger row
    if(!same(current,baseline))return fail('settlement-fence-stale');
    run(`INSERT INTO vg_g4f_receipts_fixture_v1 VALUES(?,?,?,?,?,?,?,?)`,
     worldInstanceId,missionId,completionVersion,requestId,requestHash,
     current.policy.policy_hash,receiptHash,JSON.stringify(receipt));
    const receiptStep=onCommitStep?.('after-receipt');
    if(receiptStep&&typeof receiptStep.then==='function')throw Error('async-transaction-hook');
    run(`INSERT INTO vg_g4f_ledger_fixture_v1
     (world_instance_id,mission_id,completion_version,request_id,receipt_hash,kind,
      reward_authorized,reward_committed) VALUES(?,?,?,?,?,'dry_run_only',0,0)`,
     worldInstanceId,missionId,completionVersion,requestId,receiptHash);
    const ledgerStep=onCommitStep?.('after-ledger');
    if(ledgerStep&&typeof ledgerStep.then==='function')throw Error('async-transaction-hook');
    return {ok:true,duplicate:false,receipt,dryRunCommitted:true,
     missionCompleted:false,saveCommitted:false,rewardAuthorized:false,
     rewardCommitted:false,productionAuthorized:false};
   });
  }catch{return fail('settlement-transaction-failed');}
 }

 // Test-host inspection only; not a player history or reward API.
 function inspect(instance){
  return {receipts:database.prepare('SELECT * FROM vg_g4f_receipts_fixture_v1 WHERE world_instance_id=?').all(instance),
   ledger:database.prepare('SELECT * FROM vg_g4f_ledger_fixture_v1 WHERE world_instance_id=?').all(instance)};
 }
 return {ok:true,fixture:Object.freeze({seedPolicy,settle,inspect})};
}
