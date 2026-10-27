// G4H — isolated Node SQLite backup/restore DRILL. No production data,
// authority, reward writer, network route, real player recovery or migration.
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {copyAuthoringJson} from './vangioi-authoring.mjs';
import {createG4CFixtureStore} from './vangioi-engine-g4c-fixture.mjs';
import {createG4DAuthorityFixture} from './vangioi-engine-g4d-authority-fixture.mjs';
import {createG4FSettlementFixture} from './vangioi-engine-g4f-settlement-fixture.mjs';
import {createG4GRecoveryAuditor} from './vangioi-engine-g4g-recovery-audit.mjs';

export const G4H_BACKUP_VERSION='g4h-offline-fixture-backup-1';
const fail=code=>({ok:false,code});
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const digest=value=>createHash('sha256').update(JSON.stringify(copyAuthoringJson(value))).digest('hex');
const TABLES=Object.freeze([
 {key:'session',name:'vg_g4c_sessions_fixture_v1',columns:[
  'world_instance_id','player_id','content_version','content_hash','source_version',
  'source_hash','revision','chain_hash','session_json']},
 {key:'gate',name:'vg_g4c_gates_fixture_v1',columns:[
  'world_instance_id','player_id','content_version','content_hash','source_version',
  'source_hash','access_state','license_state','source_state']},
 {key:'fence',name:'vg_g4d_authority_fixture_v1',columns:[
  'world_instance_id','world_id','player_id','entry_id','admission_session_id',
  'snapshot_hash','content_version','content_hash','source_version','source_hash',
  'access_revision','fence_epoch','status']},
 {key:'eventReceipts',name:'vg_g4c_receipts_fixture_v1',columns:[
  'world_instance_id','event_id','request_hash','receipt_json']},
 {key:'eventLedger',name:'vg_g4c_ledger_fixture_v1',columns:[
  'world_instance_id','event_id','revision','request_hash','kind','reward_authorized']},
 {key:'policyRows',name:'vg_g4f_policies_fixture_v1',columns:[
  'mission_id','completion_version','policy_json','policy_hash','policy_epoch','status']},
 {key:'settlementReceipts',name:'vg_g4f_receipts_fixture_v1',columns:[
  'world_instance_id','mission_id','completion_version','request_id','request_hash',
  'policy_hash','receipt_hash','receipt_json']},
 {key:'settlementLedger',name:'vg_g4f_ledger_fixture_v1',columns:[
  'world_instance_id','mission_id','completion_version','request_id','receipt_hash',
  'kind','reward_authorized','reward_committed']}
]);
const SNAPSHOT_KEYS=TABLES.map(t=>t.key);
const BACKUP_KEYS=['version','contentVersion','contentHash','worldInstanceId',
 'playerId','checkpointFingerprint','snapshot','checksum'];
const REQUIRED_TRIGGERS=[
 'vg_g4c_receipts_immutable_update','vg_g4c_receipts_immutable_delete',
 'vg_g4c_ledger_immutable_update','vg_g4c_ledger_immutable_delete',
 'vg_g4f_policy_pin_immutable','vg_g4f_policy_no_delete','vg_g4f_policy_no_aba',
 'vg_g4f_receipt_no_update','vg_g4f_receipt_no_delete',
 'vg_g4f_ledger_no_update','vg_g4f_ledger_no_delete'
];

// Identical row ordering and fields to G4G's checkpoint calculation.
function rows(db,worldInstanceId){
 const one=(sql)=>db.prepare(sql).get(worldInstanceId)||null;
 const all=(sql,...args)=>db.prepare(sql).all(...args);
 return {
  session:one('SELECT * FROM vg_g4c_sessions_fixture_v1 WHERE world_instance_id=?'),
  gate:one('SELECT * FROM vg_g4c_gates_fixture_v1 WHERE world_instance_id=?'),
  fence:one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?'),
  eventReceipts:all('SELECT * FROM vg_g4c_receipts_fixture_v1 WHERE world_instance_id=? ORDER BY event_id',worldInstanceId),
  eventLedger:all('SELECT * FROM vg_g4c_ledger_fixture_v1 WHERE world_instance_id=? ORDER BY revision',worldInstanceId),
  policyRows:all('SELECT * FROM vg_g4f_policies_fixture_v1 ORDER BY mission_id,completion_version'),
  settlementReceipts:all('SELECT * FROM vg_g4f_receipts_fixture_v1 WHERE world_instance_id=? ORDER BY mission_id,completion_version',worldInstanceId),
  settlementLedger:all('SELECT * FROM vg_g4f_ledger_fixture_v1 WHERE world_instance_id=? ORDER BY mission_id,completion_version',worldInstanceId)
 };
}
function snapshotRead(db,instance){
 db.exec('BEGIN');
 try{const result=rows(db,instance);db.exec('COMMIT');return result;}
 catch(e){db.exec('ROLLBACK');throw e;}
}
function wellFormedSnapshot(snapshot,instance,player){
 if(!exact(snapshot,SNAPSHOT_KEYS)||!plain(snapshot.session)||
  !plain(snapshot.gate)||!plain(snapshot.fence)||
  snapshot.session.world_instance_id!==instance||snapshot.session.player_id!==player||
  snapshot.gate.world_instance_id!==instance||snapshot.fence.world_instance_id!==instance||
  snapshot.gate.player_id!==player||snapshot.fence.player_id!==player)return false;
 let total=0;
 for(const table of TABLES){
  const value=snapshot[table.key];
  const list=Array.isArray(value)?value:[value];
  if(!Array.isArray(value)&&!['session','gate','fence'].includes(table.key))return false;
  if(Array.isArray(value)&&['session','gate','fence'].includes(table.key))return false;
  total+=list.length;
  if(total>4096||list.some(row=>!exact(row,table.columns)))return false;
  if(table.key!=='policyRows'&&list.some(row=>row.world_instance_id!==instance))return false;
 }
 return true;
}
function assertEmptyPreparedTarget(db){
 for(const table of TABLES){
  const cols=db.prepare(`PRAGMA table_info(${table.name})`).all().map(r=>r.name);
  if(cols.join('\u0000')!==table.columns.join('\u0000'))throw Error('schema-mismatch');
  if(db.prepare(`SELECT COUNT(*) AS n FROM ${table.name}`).get().n!==0)
   throw Error('target-not-empty');
 }
 const triggers=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'")
  .all().map(row=>row.name));
 if(REQUIRED_TRIGGERS.some(name=>!triggers.has(name)))throw Error('missing-immutable-trigger');
}
function insertSnapshot(db,snapshot,onRestoreStep){
 for(const table of TABLES){
  const list=Array.isArray(snapshot[table.key])?snapshot[table.key]:[snapshot[table.key]];
  const slots=table.columns.map(()=>'?').join(',');
  const prepared=db.prepare(`INSERT INTO ${table.name} (${table.columns.join(',')}) VALUES (${slots})`);
  for(const row of list)prepared.run(...table.columns.map(key=>row[key]));
  const result=onRestoreStep?.(table.key);
  if(result&&typeof result.then==='function')throw Error('async-restore-hook');
 }
}

// Rehearse the exact image in a disposable, separate SQLite database first.
// The callbacks below are inert schema initializers, NEVER authority issuers.
async function preflightSnapshot(backup,plan,world){
 const scratch=new DatabaseSync(':memory:');
 try{
  createG4CFixtureStore({database:scratch,plan});
  createG4DAuthorityFixture({database:scratch,plan,
   admission:{simulateResume:async()=>null},operatorRequest:{},
   verifyPlayer:async()=>null,readTrustedAccess:async()=>null,
   readApprovedPin:async()=>null});
  const fixture=await createG4FSettlementFixture({database:scratch,plan,world,
   verifyAdjudicator:async()=>null,adjudicateMission:async()=>null});
  if(!fixture.ok)return false;
  scratch.exec('BEGIN IMMEDIATE');
  try{insertSnapshot(scratch,backup.snapshot);scratch.exec('COMMIT');}
  catch(e){scratch.exec('ROLLBACK');throw e;}
  const checked=await createG4GRecoveryAuditor({database:scratch,plan,world});
  if(!checked.ok)return false;
  const report=await checked.auditor.inspect({worldInstanceId:backup.worldInstanceId});
  return report.ok&&report.integrity==='consistent'&&
   report.checkpointFingerprint===backup.checkpointFingerprint;
 }catch{return false;}
 finally{scratch.close();}
}

// Trusted TEST HOST only. Backup includes fixture player/session data and must
// NEVER be exposed to browser, AI, author, logs or a real recovery service.
export async function createG4HFixtureBackup({database,plan,world}={}){
 if(!(database instanceof DatabaseSync))throw new TypeError('G4H requires Node SQLite');
 const g4g=await createG4GRecoveryAuditor({database,plan,world});
 if(!g4g.ok)return g4g;
 async function exportInstance(request){
  if(!exact(request,['worldInstanceId'])||!id(request.worldInstanceId))
   return fail('invalid-backup-request');
  const instance=request.worldInstanceId;
  const report=await g4g.auditor.inspect({worldInstanceId:instance});
  if(!report.ok||report.integrity!=='consistent')return fail('source-not-consistent');
  let snapshot;
  try{snapshot=snapshotRead(database,instance);
   if(!wellFormedSnapshot(snapshot,instance,snapshot.session?.player_id)||
    digest(snapshot)!==report.checkpointFingerprint)return fail('source-changed-during-export');
  }catch{return fail('source-export-unavailable');}
  const payload={version:G4H_BACKUP_VERSION,contentVersion:plan.contentVersion,
   contentHash:plan.contentHash,worldInstanceId:instance,playerId:snapshot.session.player_id,
   checkpointFingerprint:report.checkpointFingerprint,snapshot};
  try{return {ok:true,backup:copyAuthoringJson({...payload,checksum:digest(payload)}),
   fixtureBackupOnly:true,productionAuthorized:false};}
  catch{return fail('backup-size-or-format-invalid');}
 }
 return {ok:true,fixture:Object.freeze({exportInstance})};
}

// Restore is only into an ALREADY INITIALIZED, COMPLETELY EMPTY SQLite test
// fixture. It never creates tables, replaces real data, or provisions access.
export async function createG4HFixtureRestore({database,plan,world,onRestoreStep}={}){
 if(!(database instanceof DatabaseSync)||
  (onRestoreStep!==undefined&&typeof onRestoreStep!=='function'))
  throw new TypeError('G4H requires Node SQLite and a synchronous test hook');
 const g4g=await createG4GRecoveryAuditor({database,plan,world});
 if(!g4g.ok)return g4g;
 async function restore(input){
  let backup;
  try{backup=copyAuthoringJson(input);}catch{return fail('invalid-backup');}
  if(!exact(backup,BACKUP_KEYS)||backup.version!==G4H_BACKUP_VERSION||
   backup.contentVersion!==plan.contentVersion||backup.contentHash!==plan.contentHash||
   !id(backup.worldInstanceId)||!id(backup.playerId)||
   !hash(backup.checkpointFingerprint)||!hash(backup.checksum)||
   !wellFormedSnapshot(backup.snapshot,backup.worldInstanceId,backup.playerId))
   return fail('invalid-backup');
  const {checksum,...payload}=backup;
  try{if(digest(payload)!==checksum||digest(backup.snapshot)!==backup.checkpointFingerprint)
   return fail('backup-integrity-mismatch');}
  catch{return fail('invalid-backup');}
  if(!await preflightSnapshot(backup,plan,world))return fail('backup-replay-invalid');
  try{
   database.exec('BEGIN IMMEDIATE');
   try{
    assertEmptyPreparedTarget(database);
    insertSnapshot(database,backup.snapshot,onRestoreStep);
    if(digest(rows(database,backup.worldInstanceId))!==backup.checkpointFingerprint)
     throw Error('target-fingerprint-mismatch');
    database.exec('COMMIT');
   }catch(e){database.exec('ROLLBACK');throw e;}
  }catch{return fail('restore-refused-or-rolled-back');}
  const report=await g4g.auditor.inspect({worldInstanceId:backup.worldInstanceId});
  return {ok:report.ok&&report.integrity==='consistent'&&
    report.checkpointFingerprint===backup.checkpointFingerprint,
   code:report.ok&&report.integrity==='consistent'&&
    report.checkpointFingerprint===backup.checkpointFingerprint?undefined:'restored-fixture-needs-inspection',
   fixtureRestoreCommitted:true,checkpointFingerprint:backup.checkpointFingerprint,
   fixtureIntegrity:report.integrity??'unavailable',
   recoveryAuthorized:false,saveCommitted:false,missionCompleted:false,
   rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false};
 }
 return {ok:true,fixture:Object.freeze({restore})};
}
