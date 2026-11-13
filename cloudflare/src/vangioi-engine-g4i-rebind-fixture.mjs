// G4I — TEST-HOST-ONLY G1Z re-admission after fixture restore. This does not
// issue real access, resume a live player, authorize rewards or connect Worker.
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
import {createG4GRecoveryAuditor} from './vangioi-engine-g4g-recovery-audit.mjs';

export const G4I_REBIND_VERSION='g4i-offline-rebind-1';
const fail=code=>({ok:false,code});
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const epoch=v=>Number.isSafeInteger(v)&&v>=1;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const PIN_KEYS=['worldId','snapshotHash','contentVersion','contentHash','sourceVersion','sourceHash'];
const COMMAND_KEYS=['playerRequest','operatorRebind'];
const BINDING_KEYS=['worldInstanceId','admissionSessionId','requestId'];
const RECEIPT_KEYS=['version','worldInstanceId','worldId','playerId','requestId',
 'admissionSessionId','accessRevision','fenceEpoch','contentVersion','contentHash',
 'sourceVersion','sourceHash','fixtureRebound','saveCommitted',
 'missionCompleted','rewardAuthorized','rewardCommitted','productionAuthorized'];
const digestJson=value=>createHash('sha256').update(
 JSON.stringify(copyAuthoringJson(value))).digest('hex');

function transaction(db,work){
 db.exec('BEGIN IMMEDIATE');
 try{const result=work();db.exec('COMMIT');return result;}
 catch(error){db.exec('ROLLBACK');throw error;}
}
function initialize(db){
 db.exec(`CREATE TABLE IF NOT EXISTS vg_g4i_rebind_receipts_fixture_v1(
  world_instance_id TEXT NOT NULL,request_id TEXT NOT NULL,
  admission_session_id TEXT NOT NULL,request_hash TEXT NOT NULL,
  receipt_hash TEXT NOT NULL,receipt_json TEXT NOT NULL,
  PRIMARY KEY(world_instance_id,request_id),
  UNIQUE(admission_session_id));
 CREATE TABLE IF NOT EXISTS vg_g4i_rebind_ledger_fixture_v1(
  world_instance_id TEXT NOT NULL,fence_epoch INTEGER NOT NULL CHECK(fence_epoch>=2),
  request_id TEXT NOT NULL,admission_session_id TEXT NOT NULL,receipt_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind='offline_rebind_only'),
  production_authorized INTEGER NOT NULL DEFAULT 0 CHECK(production_authorized=0),
  PRIMARY KEY(world_instance_id,fence_epoch),
  UNIQUE(world_instance_id,request_id));
 CREATE TRIGGER IF NOT EXISTS vg_g4i_receipt_no_update BEFORE UPDATE ON vg_g4i_rebind_receipts_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-rebind-receipt'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4i_receipt_no_delete BEFORE DELETE ON vg_g4i_rebind_receipts_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-rebind-receipt'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4i_ledger_no_update BEFORE UPDATE ON vg_g4i_rebind_ledger_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-rebind-ledger'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4i_ledger_no_delete BEFORE DELETE ON vg_g4i_rebind_ledger_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-rebind-ledger'); END;`);
}

// Existing G4D/G4C session/gate plus a G1Z session from a NEW, separate
// operator rehearsal are required; old session IDs never become bearer tokens.
export async function createG4IRebindFixture({database,plan,world,admission,
 operatorRequest,verifyPlayer,readTrustedAccess,readApprovedPin,
 onBeforeCommit,onCommitStep}={}){
 if(!(database instanceof DatabaseSync)||
  typeof admission?.simulateResume!=='function'||
  typeof verifyPlayer!=='function'||typeof readTrustedAccess!=='function'||
  typeof readApprovedPin!=='function'||
  (onBeforeCommit!==undefined&&typeof onBeforeCommit!=='function')||
  (onCommitStep!==undefined&&typeof onCommitStep!=='function'))
  throw new TypeError('G4I requires Node fixture and independently trusted test readers');
 const g4g=await createG4GRecoveryAuditor({database,plan,world});
 if(!g4g.ok)return g4g;
 initialize(database);
 const one=(sql,...args)=>database.prepare(sql).get(...args)||null;
 const session=instance=>one('SELECT * FROM vg_g4c_sessions_fixture_v1 WHERE world_instance_id=?',instance);
 const gate=instance=>one('SELECT * FROM vg_g4c_gates_fixture_v1 WHERE world_instance_id=?',instance);
 const fence=instance=>one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?',instance);
 const receipt=(instance,requestId)=>one(`SELECT * FROM vg_g4i_rebind_receipts_fixture_v1
  WHERE world_instance_id=? AND request_id=?`,instance,requestId);

 async function rebind(command){
  if(!exact(command,COMMAND_KEYS)||!exact(command.operatorRebind,BINDING_KEYS)||
   !id(command.operatorRebind.worldInstanceId)||!id(command.operatorRebind.admissionSessionId)||
   !id(command.operatorRebind.requestId))return fail('invalid-rebind-request');
  const {worldInstanceId:instance,admissionSessionId:newSession,requestId}=command.operatorRebind;
  let actor;
  try{const p=await verifyPlayer(command.playerRequest);
   if(!exact(p,['playerId'])||!id(p.playerId))return fail('unverified-player');
   actor=p.playerId;
  }catch{return fail('unverified-player');}
  const before={session:session(instance),gate:gate(instance),fence:fence(instance)};
  const {session:state,gate:accessGate,fence:old}=before;
  const previousReceipt=receipt(instance,requestId);
  if(!state||!accessGate||!old||old.player_id!==actor||
   state.player_id!==actor||accessGate.player_id!==actor||
   !epoch(old.fence_epoch)||!epoch(old.access_revision)||
   old.fence_epoch>=Number.MAX_SAFE_INTEGER||
   (newSession===old.admission_session_id&&!previousReceipt))
   return fail('rebind-session-or-player-denied');
  // Verify immutable history before considering a new synthetic admission.
  const report=await g4g.auditor.inspect({worldInstanceId:instance});
  if(!report.ok||report.integrity!=='consistent')return fail('rebind-history-corrupt');
  if(old.status!=='active'||accessGate.access_state!=='allowed'||
   accessGate.license_state!=='active'||accessGate.source_state!=='current')
   return fail('rebind-access-held-or-stale');
  if(state.content_version!==plan.contentVersion||state.content_hash!==plan.contentHash||
   state.content_version!==old.content_version||state.content_hash!==old.content_hash||
   state.source_version!==old.source_version||state.source_hash!==old.source_hash||
   accessGate.content_version!==old.content_version||
   accessGate.content_hash!==old.content_hash||
   accessGate.source_version!==old.source_version||accessGate.source_hash!==old.source_hash||
   !hash(old.snapshot_hash))return fail('rebind-pin-invalid');

  // Old RAM session must NOT still be valid in this G1Z rehearsal; this is
  // a recovery path, not an implicit way to renew active permissions.
  if(!previousReceipt){
   try{
    const prior=await admission.simulateResume(operatorRequest,{sessionId:old.admission_session_id});
    if(prior?.ok===true)return fail('rebind-old-admission-still-valid');
   }catch{return fail('rebind-admission-unavailable');}
  }
  let pin,access;
  try{
   const fresh=await admission.simulateResume(operatorRequest,{sessionId:newSession});
   if(!exact(fresh,['ok','stage','sessionId','worldId','snapshotHash'])||
    fresh.ok!==true||fresh.stage!=='simulated-resume'||
    fresh.sessionId!==newSession||fresh.worldId!==old.world_id||
    fresh.snapshotHash!==old.snapshot_hash||!hash(fresh.snapshotHash))
    return fail('rebind-new-admission-denied');
   [pin,access]=await Promise.all([
    readApprovedPin({worldId:old.world_id,snapshotHash:fresh.snapshotHash}),
    readTrustedAccess({playerId:actor,worldId:old.world_id,
     worldInstanceId:instance,entryId:old.entry_id})
   ]);
  }catch{return fail('rebind-trusted-readers-unavailable');}
  if(!exact(pin,PIN_KEYS)||pin.worldId!==old.world_id||
   pin.snapshotHash!==old.snapshot_hash||pin.contentVersion!==plan.contentVersion||
   pin.contentHash!==plan.contentHash||pin.sourceVersion!==old.source_version||
   pin.sourceHash!==old.source_hash||!hash(pin.sourceHash)||
   !exact(access,['allowed','revision'])||access.allowed!==true||
   !epoch(access.revision)||access.revision<old.access_revision)
   return fail('rebind-trusted-access-or-pin-denied');
  const requestHash=await hashAuthoringJson({worldInstanceId:instance,
   playerId:actor,admissionSessionId:newSession,requestId,accessRevision:access.revision});
  try{
   await onBeforeCommit?.();
   return transaction(database,()=>{
    const now={session:session(instance),gate:gate(instance),fence:fence(instance)};
    if(!now.session||!now.gate||!now.fence||
     now.gate.access_state!=='allowed'||now.gate.license_state!=='active'||
     now.gate.source_state!=='current'||now.fence.status!=='active'||
     now.session.player_id!==actor||now.gate.player_id!==actor||
     now.fence.player_id!==actor)return fail('rebind-access-held-or-stale');
    const prior=receipt(instance,requestId);
    if(prior){
     if(prior.request_hash!==requestHash||prior.admission_session_id!==newSession)
      return fail('rebind-request-conflict');
     let persisted;
     try{persisted=JSON.parse(prior.receipt_json);}catch{return fail('rebind-receipt-corrupt');}
     const ledger=one('SELECT * FROM vg_g4i_rebind_ledger_fixture_v1 WHERE world_instance_id=? AND request_id=?',instance,requestId);
     if(!exact(persisted,RECEIPT_KEYS)||persisted.version!==G4I_REBIND_VERSION||
      persisted.worldInstanceId!==instance||persisted.playerId!==actor||
      persisted.worldId!==now.fence.world_id||
      persisted.requestId!==requestId||persisted.admissionSessionId!==newSession||
      persisted.accessRevision!==access.revision||persisted.contentHash!==plan.contentHash||
      persisted.contentVersion!==plan.contentVersion||
      persisted.sourceVersion!==now.fence.source_version||
      persisted.sourceHash!==now.fence.source_hash||
      persisted.fixtureRebound!==true||persisted.productionAuthorized!==false||
      persisted.rewardAuthorized!==false||persisted.rewardCommitted!==false||
      persisted.saveCommitted!==false||persisted.missionCompleted!==false||
      digestJson(persisted)!==prior.receipt_hash||
      !ledger||ledger.fence_epoch!==persisted.fenceEpoch||
      ledger.admission_session_id!==newSession||ledger.kind!=='offline_rebind_only'||
      ledger.receipt_hash!==prior.receipt_hash||ledger.production_authorized!==0||
      now.fence.admission_session_id!==newSession||
      now.fence.fence_epoch!==persisted.fenceEpoch||
      now.fence.access_revision!==persisted.accessRevision)
      return fail('rebind-receipt-corrupt');
     return {ok:true,duplicate:true,receipt:persisted,fixtureOnly:true,
      saveCommitted:false,rewardAuthorized:false,rewardCommitted:false,
      productionAuthorized:false};
    }
    // CAS across all rows observed before the asynchronous G1Z/readers work.
    if(JSON.stringify(now)!==JSON.stringify(before))return fail('rebind-fence-stale');
    const updated=database.prepare(`UPDATE vg_g4d_authority_fixture_v1
     SET admission_session_id=?,access_revision=?,fence_epoch=?
     WHERE world_instance_id=? AND player_id=? AND admission_session_id=?
     AND access_revision=? AND fence_epoch=? AND status='active'`).run(
     newSession,access.revision,old.fence_epoch+1,instance,actor,
     old.admission_session_id,old.access_revision,old.fence_epoch);
    if(updated.changes!==1)throw Error('rebind-cas-failed');
    const step=onCommitStep?.('after-fence');
    if(step&&typeof step.then==='function')throw Error('async-rebind-hook');
    const verified={version:G4I_REBIND_VERSION,worldInstanceId:instance,
     worldId:old.world_id,playerId:actor,requestId,
     admissionSessionId:newSession,accessRevision:access.revision,
     fenceEpoch:old.fence_epoch+1,contentVersion:plan.contentVersion,
     contentHash:plan.contentHash,sourceVersion:old.source_version,
     sourceHash:old.source_hash,fixtureRebound:true,saveCommitted:false,
     missionCompleted:false,rewardAuthorized:false,rewardCommitted:false,
     productionAuthorized:false};
    const receiptHash=digestJson(verified);
    database.prepare('INSERT INTO vg_g4i_rebind_receipts_fixture_v1 VALUES(?,?,?,?,?,?)').run(
     instance,requestId,newSession,requestHash,receiptHash,JSON.stringify(verified));
    const step2=onCommitStep?.('after-receipt');
    if(step2&&typeof step2.then==='function')throw Error('async-rebind-hook');
    database.prepare(`INSERT INTO vg_g4i_rebind_ledger_fixture_v1
     VALUES(?,?,?,?,?,'offline_rebind_only',0)`).run(
     instance,old.fence_epoch+1,requestId,newSession,receiptHash);
    const step3=onCommitStep?.('after-ledger');
    if(step3&&typeof step3.then==='function')throw Error('async-rebind-hook');
    return {ok:true,duplicate:false,receipt:verified,fixtureOnly:true,
     saveCommitted:false,rewardAuthorized:false,rewardCommitted:false,
     productionAuthorized:false};
   });
  }catch{return fail('rebind-transaction-rolled-back');}
 }
 return {ok:true,fixture:Object.freeze({rebind})};
}
