import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {content} from './fixtures/vangioi-content.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION,prepareG4AEngine} from '../src/vangioi-engine-g4a.mjs';
import {G4B_EVENT_VERSION} from '../src/vangioi-engine-g4b.mjs';
import {createAdmissionRehearsal} from '../src/vangioi-admission-rehearsal.mjs';
import {createG4DAuthorityFixture} from '../src/vangioi-engine-g4d-authority-fixture.mjs';
import {createG4FSettlementFixture,G4F_POLICY_VERSION} from '../src/vangioi-engine-g4f-settlement-fixture.mjs';
import {createG4GRecoveryAuditor,G4G_PRODUCTION_BLOCKERS} from '../src/vangioi-engine-g4g-recovery-audit.mjs';

const actor='player-fixture',instance='instance-g4g',worldId='world-fixture';
const event=(eventId='event-one',revision=0,ruleId='go-exit')=>({
 version:G4B_EVENT_VERSION,eventId,playerId:actor,worldInstanceId:instance,
 expectedRevision:revision,ruleId});
const transactionCounts=db=>['vg_g4f_receipts_fixture_v1','vg_g4f_ledger_fixture_v1'].map(t=>
 db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n);

async function setup({database=new DatabaseSync(':memory:'),objectives,afterReceipt}={}){
 const world=content();
 world.maps[0].placeIds.push('place-exit');
 world.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 world.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Exit',viewIds:['view-exit'],transitions:[{toSceneId:'scene-room',trigger:'back'}]});
 world.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 world.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'go'}];
 world.missions[0].objectives=objectives??[{objectiveId:'objective-exit',verb:'reach',
  targetId:'scene-exit',requiredCount:1}];
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[
   {ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'enter_scene',sceneId:'scene-exit'}]},
   {ruleId:'go-back',fromSceneId:'scene-exit',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'enter_scene',sceneId:'scene-room'}]}
  ]};
 const p=await prepareG4AEngine(world,manifest);assert.equal(p.ok,true);
 const operator={testOperator:true};
 const admission=createAdmissionRehearsal({releaseGate:{evaluateApprovedWorld:async(_,{worldId:w})=>({
  ok:true,eligible:true,worldId:w,snapshotHash:'a'.repeat(64),gateVersion:'world-release-1'
 })}});
 const released=await admission.prepareRelease(operator,{worldId});assert.equal(released.ok,true);
 const started=await admission.simulateStart(operator,{candidateId:released.candidateId});
 assert.equal(started.ok,true);
 const g4d=createG4DAuthorityFixture({database,plan:p.plan,admission,operatorRequest:operator,
  verifyPlayer:async()=>({playerId:actor}),readTrustedAccess:async()=>({allowed:true,revision:1}),
  readApprovedPin:async()=>({worldId,snapshotHash:'a'.repeat(64),
   contentVersion:world.contentVersion,contentHash:manifest.contentHash,
   sourceVersion:'synthetic-v1',sourceHash:'b'.repeat(64)})});
 assert.equal((await g4d.provision({playerRequest:{fixture:true},binding:{worldId,
  worldInstanceId:instance,entryId:'entry-local',admissionSessionId:started.sessionId}})).ok,true);
 const g4fOptions={database,plan:p.plan,world,
  verifyAdjudicator:async()=>({adjudicatorId:'synthetic-adjudicator'}),
  adjudicateMission:async({missionId,proof})=>({approved:true,decisionId:'mock-decision',
   missionId,contentHash:manifest.contentHash,evidenceRevision:proof.revision,
   evidenceChainHash:proof.chainHash}),onCommitStep:afterReceipt};
 const f=await createG4FSettlementFixture(g4fOptions);assert.equal(f.ok,true);
 const policy={version:G4F_POLICY_VERSION,policyId:'mock-policy',policyRevision:1,
  missionId:'mission-room',completionVersion:'completion-v1',
  contentVersion:world.contentVersion,contentHash:manifest.contentHash,mode:'dry-run-only'};
 assert.equal((await f.fixture.seedPolicy(policy)).ok,true);
 const g=await createG4GRecoveryAuditor({database,plan:p.plan,world});assert.equal(g.ok,true);
 const submit=(e=event())=>g4d.submit({playerRequest:{fixture:true},event:e});
 const settle=()=>f.fixture.settle({adjudicatorRequest:{fixture:true},worldInstanceId:instance,
  missionId:'mission-room',completionVersion:'completion-v1',requestId:'settlement-one'});
 const audit=()=>g.auditor.inspect({worldInstanceId:instance});
 return {database,world,plan:p.plan,g4fOptions,g4f:f.fixture,submit,settle,audit};
}

test('G4G clean empty fixture reports consistency but never production readiness',async()=>{
 const h=await setup(),r=await h.audit();
 assert.equal(r.ok,true);assert.equal(r.integrity,'consistent');
 assert.equal(r.fixtureReplayConsistent,true);
 assert.deepEqual(r.counts,{events:0,settlements:0,policies:1});
 assert.equal(r.currentAccess,'synthetic-allowed');
 assert.equal(r.productionReadiness.ready,false);
 assert.deepEqual(r.productionReadiness.blockers,G4G_PRODUCTION_BLOCKERS);
 assert.equal(r.repairPerformed,false);assert.equal(r.rewardAuthorized,false);
 assert.equal(r.saveCommitted,false);h.database.close();
});

test('G4G reconciles G4C transition and G4F dry-run settlement without granting rewards',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 const report=await h.audit();
 assert.equal(report.integrity,'consistent');
 assert.equal(report.fixtureReplayConsistent,true);
 assert.deepEqual(report.counts,{events:1,settlements:1,policies:1});
 assert.equal(report.revision,1);assert.match(report.checkpointFingerprint,/^[a-f0-9]{64}$/);
 assert.equal(report.missionCompleted,false);assert.equal(report.productionAuthorized,false);
 h.database.close();
});

test('G4G checkpoint fingerprint is stable after SQLite close and reopen',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'dudu-g4g-'));
 const file=join(folder,'state.sqlite');
 try{
  const h=await setup({database:new DatabaseSync(file)});
  assert.equal((await h.submit()).ok,true);assert.equal((await h.settle()).ok,true);
  const before=await h.audit();h.database.close();
  const db=new DatabaseSync(file);
  const reopened=await createG4GRecoveryAuditor({database:db,plan:h.plan,world:h.world});
  assert.equal(reopened.ok,true);
  const after=await reopened.auditor.inspect({worldInstanceId:instance});
  assert.deepEqual(after,before);
  assert.deepEqual(transactionCounts(db),[1,1]);db.close();
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('G4G treats legitimate policy revocation and access hold as current blocks, not history tampering',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 h.database.exec("UPDATE vg_g4f_policies_fixture_v1 SET status='revoked',policy_epoch=policy_epoch+1");
 h.database.exec("UPDATE vg_g4c_gates_fixture_v1 SET license_state='held'");
 const report=await h.audit();assert.equal(report.integrity,'consistent');
 assert.equal(report.fixtureReplayConsistent,true);
 assert.equal(report.currentAccess,'synthetic-blocked-or-stale');
 assert.equal(report.productionReadiness.ready,false);h.database.close();
});

test('G4G detects missing G4C ledger after a committed transition',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 h.database.exec('DROP TRIGGER vg_g4c_ledger_immutable_delete; DELETE FROM vg_g4c_ledger_fixture_v1');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4c-event-count-mismatch'));
 assert.equal(report.fixtureReplayConsistent,false);h.database.close();
});

test('G4G detects missing G4C immutable receipt after a committed transition',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 h.database.exec('DROP TRIGGER vg_g4c_receipts_immutable_delete; DELETE FROM vg_g4c_receipts_fixture_v1');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4c-event-row-missing'));
 assert.equal(report.repairPerformed,false);h.database.close();
});

test('G4G detects changed G4C replay state without attempting repair',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 h.database.prepare('UPDATE vg_g4c_sessions_fixture_v1 SET session_json=?').run('{}');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4c-replay-or-pin-invalid')||
  report.anomalies.includes('g4c-session-json-invalid'));
 assert.equal(report.repairPerformed,false);h.database.close();
});

test('G4G fails closed on malformed event entries rather than crashing the auditor',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 const saved=JSON.parse(h.database.prepare('SELECT session_json FROM vg_g4c_sessions_fixture_v1').get().session_json);
 saved.events[0]=null;
 h.database.prepare('UPDATE vg_g4c_sessions_fixture_v1 SET session_json=?').run(JSON.stringify(saved));
 const report=await h.audit();assert.equal(report.ok,true);
 assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4c-event-record-invalid'));
 h.database.close();
});

test('G4G finds a partial G4F receipt/ledger pair after deliberate fixture corruption',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 h.database.exec('DROP TRIGGER vg_g4f_ledger_no_delete; DELETE FROM vg_g4f_ledger_fixture_v1');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4f-ledger-missing'));
 assert.equal(report.productionReadiness.ready,false);h.database.close();
});

test('G4G detects an orphaned G4F audit ledger after its receipt is removed',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 h.database.exec('DROP TRIGGER vg_g4f_receipt_no_delete; DELETE FROM vg_g4f_receipts_fixture_v1');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4f-orphan-ledger'));
 assert.equal(report.fixtureReplayConsistent,false);h.database.close();
});

test('G4G catches a forged dry-run settlement for unsupported repeat-count objectives',async()=>{
 const h=await setup({objectives:[{objectiveId:'objective-laps',verb:'reach',
  targetId:'scene-exit',requiredCount:2}]});
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).code,'mission-not-proven');
 const session=JSON.parse(h.database.prepare('SELECT session_json FROM vg_g4c_sessions_fixture_v1').get().session_json);
 const pinned=h.database.prepare('SELECT * FROM vg_g4f_policies_fixture_v1').get();
 const policy=JSON.parse(pinned.policy_json);
 const receipt={version:'g4f-dry-run-settlement-1',worldInstanceId:instance,playerId:actor,
  missionId:'mission-room',completionVersion:'completion-v1',requestId:'forge-run',
  decisionId:'fake-review',policyId:policy.policyId,policyRevision:policy.policyRevision,
  evidenceRevision:1,evidenceChainHash:session.events[0].chainHash,
  dryRunCommitted:true,missionCompleted:false,saveCommitted:false,
  rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false};
 const receiptHash=await hashAuthoringJson(receipt);
 const requestHash=await hashAuthoringJson({worldInstanceId:instance,
  missionId:'mission-room',completionVersion:'completion-v1',requestId:'forge-run'});
 h.database.prepare('INSERT INTO vg_g4f_receipts_fixture_v1 VALUES(?,?,?,?,?,?,?,?)').run(
  instance,'mission-room','completion-v1','forge-run',requestHash,pinned.policy_hash,
  receiptHash,JSON.stringify(receipt));
 h.database.prepare('INSERT INTO vg_g4f_ledger_fixture_v1 VALUES(?,?,?,?,?,?,?,?)').run(
  instance,'mission-room','completion-v1','forge-run',receiptHash,'dry_run_only',0,0);
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4f-settlement-without-objectives'));
 assert.equal(report.productionReadiness.ready,false);h.database.close();
});

test('G4G detects a forged G4F receipt and mismatched audit hash',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 h.database.exec('DROP TRIGGER vg_g4f_receipt_no_update');
 h.database.prepare('UPDATE vg_g4f_receipts_fixture_v1 SET receipt_json=?').run('{}');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4f-receipt-json-invalid'));
 assert.equal(report.fixtureReplayConsistent,false);h.database.close();
});

test('G4G detects invalid policy pin and still keeps all outputs offline',async()=>{
 const h=await setup();
 h.database.exec('DROP TRIGGER vg_g4f_policy_pin_immutable');
 h.database.prepare('UPDATE vg_g4f_policies_fixture_v1 SET policy_json=?').run('{}');
 const report=await h.audit();assert.equal(report.integrity,'anomalies');
 assert.ok(report.anomalies.includes('g4f-policy-json-invalid'));
 assert.equal(report.rewardCommitted,false);h.database.close();
});

test('G4G observes clean rollback when G4F fails between receipt and ledger',async()=>{
 const h=await setup({afterReceipt:stage=>{if(stage==='after-receipt')throw Error('fault');}});
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).code,'settlement-transaction-failed');
 assert.deepEqual(transactionCounts(h.database),[0,0]);
 const report=await h.audit();assert.equal(report.integrity,'consistent');
 assert.deepEqual(report.counts,{events:1,settlements:0,policies:1});h.database.close();
});

test('G4G fingerprint records accepted state progression without claiming a live checkpoint',async()=>{
 const h=await setup();const first=await h.audit();
 assert.equal((await h.submit()).ok,true);
 const second=await h.audit();
 assert.notEqual(first.checkpointFingerprint,second.checkpointFingerprint);
 assert.equal(second.revision,1);assert.equal(second.productionReadiness.ready,false);
 h.database.close();
});

test('G4G rejects arbitrary client sessions/claims and remains outside all live applications',async()=>{
 const h=await setup();
 const reader=await createG4GRecoveryAuditor({database:h.database,plan:h.plan,world:h.world});
 assert.equal(reader.ok,true);
 for(const extra of [{session:{}},{rewardGranted:true},{actorId:actor},{admin:true}])
  assert.equal((await reader.auditor.inspect({worldInstanceId:instance,...extra})).code,
   'invalid-audit-request');
 const src=readFileSync(new URL('../src/vangioi-engine-g4g-recovery-audit.mjs',import.meta.url),'utf8');
 assert.equal(src.includes('CREATE TABLE'),false);
 assert.equal(src.includes('INSERT INTO'),false);
 for(const path of ['../src/index.mjs','../../index.html'])
  assert.equal(readFileSync(new URL(path,import.meta.url),'utf8').includes(
   'vangioi-engine-g4g-recovery-audit'),false);
 h.database.close();
});
