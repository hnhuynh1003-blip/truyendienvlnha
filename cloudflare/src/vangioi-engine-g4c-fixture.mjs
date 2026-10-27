// G4C — Node-only SQLite transaction/CAS rehearsal. This is NOT a Worker,
// production save writer, authorization service, or reward/EXP/item ledger.
import {DatabaseSync} from 'node:sqlite';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
import {createG4BSession,inspectG4BSession,applyG4BEvent} from './vangioi-engine-g4b.mjs';

export const G4C_FIXTURE_VERSION='g4c-sqlite-fixture-1';
const fail=code=>({ok:false,code});
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));

function transaction(database,work){
 database.exec('BEGIN IMMEDIATE');
 try{
  const result=work(); // Never await while holding the SQLite transaction.
  database.exec('COMMIT');
  return result;
 }catch(error){database.exec('ROLLBACK');throw error;}
}

function initialize(database){
 database.exec(`CREATE TABLE IF NOT EXISTS vg_g4c_sessions_fixture_v1(
  world_instance_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,
  content_version TEXT NOT NULL,content_hash TEXT NOT NULL,
  source_version TEXT NOT NULL,source_hash TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision>=0),chain_hash TEXT NOT NULL,
  session_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS vg_g4c_gates_fixture_v1(
  world_instance_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,
  content_version TEXT NOT NULL,content_hash TEXT NOT NULL,
  source_version TEXT NOT NULL,source_hash TEXT NOT NULL,
  access_state TEXT NOT NULL CHECK(access_state IN ('allowed','denied')),
  license_state TEXT NOT NULL CHECK(license_state IN ('active','held','revoked')),
  source_state TEXT NOT NULL CHECK(source_state IN ('current','stale')));
 CREATE TABLE IF NOT EXISTS vg_g4c_receipts_fixture_v1(
  world_instance_id TEXT NOT NULL,event_id TEXT NOT NULL,request_hash TEXT NOT NULL,
  receipt_json TEXT NOT NULL,PRIMARY KEY(world_instance_id,event_id));
 CREATE TABLE IF NOT EXISTS vg_g4c_ledger_fixture_v1(
  world_instance_id TEXT NOT NULL,event_id TEXT NOT NULL,revision INTEGER NOT NULL,
  request_hash TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind='scene_transition_only'),
  reward_authorized INTEGER NOT NULL DEFAULT 0 CHECK(reward_authorized=0),
  PRIMARY KEY(world_instance_id,event_id),UNIQUE(world_instance_id,revision));
 CREATE TRIGGER IF NOT EXISTS vg_g4c_receipts_immutable_update BEFORE UPDATE ON vg_g4c_receipts_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-fixture-receipt'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4c_receipts_immutable_delete BEFORE DELETE ON vg_g4c_receipts_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-fixture-receipt'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4c_ledger_immutable_update BEFORE UPDATE ON vg_g4c_ledger_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-fixture-ledger'); END;
 CREATE TRIGGER IF NOT EXISTS vg_g4c_ledger_immutable_delete BEFORE DELETE ON vg_g4c_ledger_fixture_v1
 BEGIN SELECT RAISE(ABORT,'immutable-fixture-ledger'); END;`);
}

// Caller must be a test operator. No method here can attest real access, IP
// licenses, source freshness or Firebase identity. The gate is synthetic.
export function createG4CFixtureStore({database,plan,onCommitStep,onBeforeCommit}={}){
 if(!(database instanceof DatabaseSync)||!plain(plan)||typeof plan.contentVersion!=='string'||
  !digest(plan.contentHash)||(onCommitStep!==undefined&&typeof onCommitStep!=='function')||
  (onBeforeCommit!==undefined&&typeof onBeforeCommit!=='function'))
  throw new TypeError('G4C requires a Node SQLite fixture and pinned G4A plan');
 initialize(database);
 const one=(sql,...args)=>database.prepare(sql).get(...args)||null;
 const run=(sql,...args)=>database.prepare(sql).run(...args);
 const sessionRow=instanceId=>one('SELECT * FROM vg_g4c_sessions_fixture_v1 WHERE world_instance_id=?',instanceId);
 const gateRow=instanceId=>one('SELECT * FROM vg_g4c_gates_fixture_v1 WHERE world_instance_id=?',instanceId);
 const receiptRow=(instanceId,eventId)=>one(
  'SELECT * FROM vg_g4c_receipts_fixture_v1 WHERE world_instance_id=? AND event_id=?',instanceId,eventId);
 const allowed=(row,gate,actor)=>!!row&&!!gate&&row.player_id===actor&&gate.player_id===actor&&
  row.content_version===plan.contentVersion&&row.content_hash===plan.contentHash&&
  gate.content_version===row.content_version&&gate.content_hash===row.content_hash&&
  gate.source_version===row.source_version&&gate.source_hash===row.source_hash&&
  gate.access_state==='allowed'&&gate.license_state==='active'&&gate.source_state==='current';

 async function seed({playerId,worldInstanceId,entryId,sourceVersion,sourceHash,
  accessState,licenseState,sourceState}={}){
  if(!id(playerId)||!id(worldInstanceId)||!id(entryId)||!id(sourceVersion)||!digest(sourceHash)||
   !['allowed','denied'].includes(accessState)||!['active','held','revoked'].includes(licenseState)||
   !['current','stale'].includes(sourceState))return fail('invalid-fixture');
  const initial=await createG4BSession(plan,{playerId,worldInstanceId,entryId});
  if(!initial.ok)return initial;
  try{
   transaction(database,()=>{
    run(`INSERT INTO vg_g4c_sessions_fixture_v1 VALUES(?,?,?,?,?,?,?,?,?)`,
     worldInstanceId,playerId,plan.contentVersion,plan.contentHash,sourceVersion,sourceHash,
     0,initial.session.chainHash,JSON.stringify(initial.session));
    run(`INSERT INTO vg_g4c_gates_fixture_v1 VALUES(?,?,?,?,?,?,?,?,?)`,
     worldInstanceId,playerId,plan.contentVersion,plan.contentHash,sourceVersion,sourceHash,
     accessState,licenseState,sourceState);
   });
  }catch{return fail('fixture-exists-or-unavailable');}
  return {ok:true,fixtureInitialized:true,productionAuthorized:false};
 }

 async function submit({actorId,event}={}){
  // actorId is supplied by an isolated trusted test driver, NEVER established
  // from the event. This method is not an HTTP handler or authentication API.
  if(!id(actorId))return fail('unverified-actor');
  let request;
  try{request=copyAuthoringJson(event);}catch{return fail('invalid-event');}
  if(!plain(request)||!id(request.worldInstanceId)||!id(request.eventId))return fail('invalid-event');
  const row=sessionRow(request.worldInstanceId),gate=gateRow(request.worldInstanceId);
  if(!allowed(row,gate,actorId))return fail('fixture-gate-denied');
  let saved;
  try{saved=JSON.parse(row.session_json);}catch{return fail('fixture-corrupt');}
  const checked=await inspectG4BSession(plan,saved);
  if(!checked.ok||saved.revision!==row.revision||saved.chainHash!==row.chain_hash||
   saved.playerId!==actorId||saved.worldInstanceId!==row.world_instance_id)
   return fail('fixture-corrupt');
  // G4B verifies the strict request shape, identity and the candidate result.
  const candidate=await applyG4BEvent(plan,saved,request);
  if(!candidate.ok)return candidate;
  const requestHash=await hashAuthoringJson(request);
  try{
   // Test-only race hook: no await is permitted INSIDE the transaction.
   await onBeforeCommit?.();
   return transaction(database,()=>{
    const current=sessionRow(request.worldInstanceId),currentGate=gateRow(request.worldInstanceId);
    if(!allowed(current,currentGate,actorId))return fail('fixture-gate-denied');
    const prior=receiptRow(request.worldInstanceId,request.eventId);
    if(prior){
     if(prior.request_hash!==requestHash)return fail('event-id-conflict');
     return {ok:true,duplicate:true,receipt:JSON.parse(prior.receipt_json),
      fixtureCommitted:true,saveCommitted:false,rewardAuthorized:false,
      rewardCommitted:false,productionAuthorized:false};
    }
    if(current.revision!==saved.revision||current.chain_hash!==saved.chainHash||
     current.session_json!==row.session_json)return fail('revision-conflict');
    if(candidate.duplicate)return fail('fixture-corrupt');
    const updated=candidate.session;
    const cas=run(`UPDATE vg_g4c_sessions_fixture_v1
     SET revision=?,chain_hash=?,session_json=?
     WHERE world_instance_id=? AND player_id=? AND revision=? AND chain_hash=?`,
     updated.revision,updated.chainHash,JSON.stringify(updated),request.worldInstanceId,
     actorId,saved.revision,saved.chainHash);
    if(cas.changes!==1)throw Error('fixture-cas-failed');
    onCommitStep?.('after-state');
    const receipt={...candidate.receipt,fixtureVersion:G4C_FIXTURE_VERSION,
     worldInstanceId:request.worldInstanceId,contentVersion:plan.contentVersion,
     contentHash:plan.contentHash};
    run('INSERT INTO vg_g4c_receipts_fixture_v1 VALUES(?,?,?,?)',
     request.worldInstanceId,request.eventId,requestHash,JSON.stringify(receipt));
    onCommitStep?.('after-receipt');
    run(`INSERT INTO vg_g4c_ledger_fixture_v1
     (world_instance_id,event_id,revision,request_hash,kind,reward_authorized)
     VALUES(?,?,?,?,'scene_transition_only',0)`,
     request.worldInstanceId,request.eventId,updated.revision,requestHash);
    onCommitStep?.('after-ledger');
    return {ok:true,duplicate:false,receipt,fixtureCommitted:true,
     saveCommitted:false,rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false};
   });
  }catch{return fail('fixture-transaction-failed');}
 }

 // Read-only fixture inspection is for tests, not an authenticated player API.
 function inspect(instanceId){
  const row=sessionRow(instanceId);
  if(!row)return null;
  return {session:JSON.parse(row.session_json),receipts:database.prepare(
   'SELECT event_id,request_hash,receipt_json FROM vg_g4c_receipts_fixture_v1 WHERE world_instance_id=? ORDER BY event_id'
  ).all(instanceId).map(r=>({eventId:r.event_id,requestHash:r.request_hash,receipt:JSON.parse(r.receipt_json)})),
   ledger:database.prepare('SELECT * FROM vg_g4c_ledger_fixture_v1 WHERE world_instance_id=? ORDER BY revision')
    .all(instanceId)};
 }
 return {seed,submit,inspect};
}
