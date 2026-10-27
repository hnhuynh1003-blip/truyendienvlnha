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
import {createG4CFixtureStore} from '../src/vangioi-engine-g4c-fixture.mjs';
import {createG4DAuthorityFixture} from '../src/vangioi-engine-g4d-authority-fixture.mjs';
import {createG4FSettlementFixture,G4F_POLICY_VERSION} from '../src/vangioi-engine-g4f-settlement-fixture.mjs';
import {createG4GRecoveryAuditor} from '../src/vangioi-engine-g4g-recovery-audit.mjs';
import {createG4HFixtureBackup,createG4HFixtureRestore,G4H_BACKUP_VERSION}
 from '../src/vangioi-engine-g4h-fixture-recovery.mjs';

const actor='player-fixture',instance='instance-g4h',worldId='world-fixture';
const event=(eventId='event-one',revision=0,ruleId='go-exit')=>({
 version:G4B_EVENT_VERSION,eventId,playerId:actor,worldInstanceId:instance,
 expectedRevision:revision,ruleId});
const count=(db,table)=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const tables=['vg_g4c_sessions_fixture_v1','vg_g4c_gates_fixture_v1',
 'vg_g4d_authority_fixture_v1','vg_g4c_receipts_fixture_v1','vg_g4c_ledger_fixture_v1',
 'vg_g4f_policies_fixture_v1','vg_g4f_receipts_fixture_v1','vg_g4f_ledger_fixture_v1'];
const counts=db=>tables.map(t=>count(db,t));
const clone=value=>JSON.parse(JSON.stringify(value));

async function worldPlan(){
 const world=content();
 world.maps[0].placeIds.push('place-exit');
 world.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 world.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Exit',viewIds:['view-exit'],transitions:[{toSceneId:'scene-room',trigger:'back'}]});
 world.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 world.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'go'}];
 world.missions[0].objectives=[{objectiveId:'objective-exit',verb:'reach',
  targetId:'scene-exit',requiredCount:1}];
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[
   {ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'enter_scene',sceneId:'scene-exit'}]},
   {ruleId:'go-back',fromSceneId:'scene-exit',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'enter_scene',sceneId:'scene-room'}]}
  ]};
 const p=await prepareG4AEngine(world,manifest);assert.equal(p.ok,true);
 return {world,plan:p.plan};
}
async function host({database,world,plan,provision=false}={}){
 const operator={testOperator:true};
 const admission=createAdmissionRehearsal({releaseGate:{evaluateApprovedWorld:async(_,{worldId:w})=>({
  ok:true,eligible:true,worldId:w,snapshotHash:'a'.repeat(64),gateVersion:'world-release-1'
 })}});
 const released=await admission.prepareRelease(operator,{worldId});assert.equal(released.ok,true);
 const started=await admission.simulateStart(operator,{candidateId:released.candidateId});
 assert.equal(started.ok,true);
 const g4d=createG4DAuthorityFixture({database,plan,admission,operatorRequest:operator,
  verifyPlayer:async()=>({playerId:actor}),readTrustedAccess:async()=>({allowed:true,revision:1}),
  readApprovedPin:async()=>({worldId,snapshotHash:'a'.repeat(64),
   contentVersion:world.contentVersion,contentHash:plan.contentHash,
   sourceVersion:'synthetic-v1',sourceHash:'b'.repeat(64)})});
 createG4CFixtureStore({database,plan});
 const f=await createG4FSettlementFixture({database,plan,world,
  verifyAdjudicator:async()=>({adjudicatorId:'synthetic-adjudicator'}),
  adjudicateMission:async({missionId,proof})=>({approved:true,decisionId:'mock-decision',
   missionId,contentHash:plan.contentHash,evidenceRevision:proof.revision,
   evidenceChainHash:proof.chainHash})});
 assert.equal(f.ok,true);
 const submit=(e=event())=>g4d.submit({playerRequest:{fixture:true},event:e});
 const settle=()=>f.fixture.settle({adjudicatorRequest:{fixture:true},worldInstanceId:instance,
  missionId:'mission-room',completionVersion:'completion-v1',requestId:'settlement-one'});
 if(provision){
  assert.equal((await g4d.provision({playerRequest:{fixture:true},binding:{worldId,
   worldInstanceId:instance,entryId:'entry-local',admissionSessionId:started.sessionId}})).ok,true);
  assert.equal((await f.fixture.seedPolicy({version:G4F_POLICY_VERSION,policyId:'mock-policy',
   policyRevision:1,missionId:'mission-room',completionVersion:'completion-v1',
   contentVersion:world.contentVersion,contentHash:plan.contentHash,mode:'dry-run-only'})).ok,true);
 }
 return {submit,settle};
}
async function setup({withEvent=true,withSettlement=true}={}){
 const {world,plan}=await worldPlan(),source=new DatabaseSync(':memory:');
 const original=await host({database:source,world,plan,provision:true});
 if(withEvent)assert.equal((await original.submit()).ok,true);
 if(withSettlement)assert.equal((await original.settle()).ok,true);
 const exported=await createG4HFixtureBackup({database:source,plan,world});
 assert.equal(exported.ok,true);
 const image=await exported.fixture.exportInstance({worldInstanceId:instance});
 assert.equal(image.ok,true);
 const target=new DatabaseSync(':memory:');
 const recovered=await host({database:target,world,plan});
 const restoration=await createG4HFixtureRestore({database:target,plan,world});
 assert.equal(restoration.ok,true);
 return {source,target,world,plan,original,recovered,exported,
  image:image.backup,restoration:restoration.fixture,
  close(){source.close();target.close();}};
}

test('G4H roundtrip restores committed G4C and dry-run G4F with exact G4G fingerprint',async()=>{
 const h=await setup(),before=counts(h.source);
 const result=await h.restoration.restore(h.image);
 assert.equal(result.ok,true);assert.equal(result.fixtureRestoreCommitted,true);
 assert.equal(result.fixtureIntegrity,'consistent');
 assert.equal(result.checkpointFingerprint,h.image.checkpointFingerprint);
 assert.deepEqual(counts(h.target),before);
 assert.equal(result.rewardAuthorized,false);assert.equal(result.saveCommitted,false);
 assert.equal(result.productionAuthorized,false);h.close();
});

test('G4H keeps immutable receipts after reboot but never recreates expired G1Z admission',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'dudu-g4h-'));
 try{
  const h=await setup();const file=join(folder,'rehearsal.sqlite');
  const target=new DatabaseSync(file);
  const recovered=await host({database:target,world:h.world,plan:h.plan});
  const restore=await createG4HFixtureRestore({database:target,plan:h.plan,world:h.world});
  assert.equal((await restore.fixture.restore(h.image)).ok,true);
  const denied=await recovered.submit();
  assert.equal(denied.ok,false);
  assert.equal(denied.code,'release-not-eligible');
  assert.deepEqual(counts(target),counts(h.source));
  const originalCounts=counts(target);target.close();
  const reopened=new DatabaseSync(file);
  const audit=await createG4GRecoveryAuditor({database:reopened,plan:h.plan,world:h.world});
  assert.equal((await audit.auditor.inspect({worldInstanceId:instance})).integrity,'consistent');
  assert.deepEqual(counts(reopened),originalCounts);reopened.close();h.close();
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('G4H can restore a revision-0 fixture without inventing progress',async()=>{
 const h=await setup({withEvent:false,withSettlement:false});
 assert.equal((await h.restoration.restore(h.image)).ok,true);
 assert.deepEqual(counts(h.target),[1,1,1,0,0,1,0,0]);
 const reader=await createG4GRecoveryAuditor({database:h.target,plan:h.plan,world:h.world});
 const report=await reader.auditor.inspect({worldInstanceId:instance});
 assert.equal(report.revision,0);assert.equal(report.productionReadiness.ready,false);h.close();
});

test('G4H preserves legitimate held license and revoked policy but never renews them',async()=>{
 const h=await setup();
 h.source.exec("UPDATE vg_g4c_gates_fixture_v1 SET license_state='held'");
 h.source.exec("UPDATE vg_g4f_policies_fixture_v1 SET status='revoked',policy_epoch=policy_epoch+1");
 const next=await h.exported.fixture.exportInstance({worldInstanceId:instance});
 assert.equal(next.ok,true);
 assert.equal((await h.restoration.restore(next.backup)).ok,true);
 const reader=await createG4GRecoveryAuditor({database:h.target,plan:h.plan,world:h.world});
 const report=await reader.auditor.inspect({worldInstanceId:instance});
 assert.equal(report.integrity,'consistent');
 assert.equal(report.currentAccess,'synthetic-blocked-or-stale');
 assert.equal(h.target.prepare('SELECT policy_epoch FROM vg_g4f_policies_fixture_v1').get().policy_epoch,2);
 assert.equal((await h.recovered.submit(event('event-new',1,'go-back'))).ok,false);h.close();
});

test('G4H export fails closed if G4G identifies a damaged historical ledger',async()=>{
 const h=await setup();
 h.source.exec('DROP TRIGGER vg_g4f_ledger_no_delete; DELETE FROM vg_g4f_ledger_fixture_v1');
 const result=await h.exported.fixture.exportInstance({worldInstanceId:instance});
 assert.equal(result.code,'source-not-consistent');h.close();
});

test('G4H altered backup body or checksum is rejected before any target write',async()=>{
 const h=await setup();const backup=clone(h.image);
 backup.snapshot.session.revision=42;
 assert.equal((await h.restoration.restore(backup)).code,'backup-integrity-mismatch');
 assert.deepEqual(counts(h.target),[0,0,0,0,0,0,0,0]);
 const tampered=clone(h.image);tampered.checksum='0'.repeat(64);
 assert.equal((await h.restoration.restore(tampered)).code,'backup-integrity-mismatch');h.close();
});

test('G4H recomputed hashes cannot turn malformed G4B replay into valid restore',async()=>{
 const h=await setup();const forged=clone(h.image);
 const saved=JSON.parse(forged.snapshot.session.session_json);
 saved.events[0].chainHash='0'.repeat(64);
 forged.snapshot.session.session_json=JSON.stringify(saved);
 forged.checkpointFingerprint=await hashAuthoringJson(forged.snapshot);
 const {checksum,...payload}=forged;forged.checksum=await hashAuthoringJson(payload);
 assert.equal((await h.restoration.restore(forged)).code,'backup-replay-invalid');
 assert.deepEqual(counts(h.target),[0,0,0,0,0,0,0,0]);h.close();
});

test('G4H refuses nonempty target without clearing previous data',async()=>{
 const h=await setup();
 assert.equal((await h.restoration.restore(h.image)).ok,true);
 const before=counts(h.target);
 assert.equal((await h.restoration.restore(h.image)).code,'restore-refused-or-rolled-back');
 assert.deepEqual(counts(h.target),before);h.close();
});

test('G4H rejects target missing immutable triggers without touching it',async()=>{
 const h=await setup();
 h.target.exec('DROP TRIGGER vg_g4f_receipt_no_delete');
 assert.equal((await h.restoration.restore(h.image)).code,'restore-refused-or-rolled-back');
 assert.deepEqual(counts(h.target),[0,0,0,0,0,0,0,0]);h.close();
});

test('G4H transaction rolls back every table after injected mid-restore fault',async()=>{
 const h=await setup();
 const writer=await createG4HFixtureRestore({database:h.target,plan:h.plan,world:h.world,
  onRestoreStep:key=>{if(key==='eventLedger')throw Error('synthetic-power-loss');}});
 assert.equal((await writer.fixture.restore(h.image)).code,'restore-refused-or-rolled-back');
 assert.deepEqual(counts(h.target),[0,0,0,0,0,0,0,0]);
 assert.equal((await h.restoration.restore(h.image)).ok,true);h.close();
});

test('G4H refuses an asynchronous callback while a transaction is held',async()=>{
 const h=await setup();
 const writer=await createG4HFixtureRestore({database:h.target,plan:h.plan,world:h.world,
  onRestoreStep:()=>Promise.resolve()});
 assert.equal((await writer.fixture.restore(h.image)).code,'restore-refused-or-rolled-back');
 assert.deepEqual(counts(h.target),[0,0,0,0,0,0,0,0]);h.close();
});

test('G4H backup never acts as a bearer token, completion or reward request',async()=>{
 const h=await setup();
 assert.equal(h.image.version,G4H_BACKUP_VERSION);
 for(const extra of [{admin:true},{rewardGranted:true},{missionCompleted:true},
  {productionAuthorized:true},{releaseId:'fake'}, {role:'publisher'}]){
  assert.equal((await h.restoration.restore({...h.image,...extra})).code,'invalid-backup');
 }
 assert.equal((await h.exported.fixture.exportInstance({worldInstanceId:instance,admin:true})).code,
  'invalid-backup-request');
 assert.deepEqual(counts(h.target),[0,0,0,0,0,0,0,0]);h.close();
});

test('G4H stays outside the public Worker, browser, Creator and Pages',async()=>{
 const source=readFileSync(new URL('../src/vangioi-engine-g4h-fixture-recovery.mjs',import.meta.url),'utf8');
 assert.equal(source.includes("from 'node:sqlite'"),true);
 assert.equal(source.includes('firebase-admin'),false);
 for(const path of ['../src/index.mjs','../../index.html','../../functions/index.js']){
  const body=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.equal(body.includes('vangioi-engine-g4h-fixture-recovery'),false);
 }
});
