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

const actorId='synthetic-player',instanceId='instance-g4f',worldId='world-synthetic';
const snapshotHash='a'.repeat(64),sourceHash='b'.repeat(64);
const adjudicatorRequest={fixtureToken:'mock-adjudicator'};
const command=(extra={})=>({adjudicatorRequest,worldInstanceId:instanceId,
 missionId:'mission-room',completionVersion:'completion-v1',requestId:'settle-one',...extra});
const event=(eventId='event-arrive',expectedRevision=0,ruleId='go-exit')=>({
 version:G4B_EVENT_VERSION,eventId,playerId:actorId,worldInstanceId:instanceId,
 expectedRevision,ruleId});
const rows=db=>['vg_g4f_receipts_fixture_v1','vg_g4f_ledger_fixture_v1'].map(t=>
 db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n);

async function setup({database=new DatabaseSync(':memory:'),objectives,worldMutator,
 onBeforeCommit,onCommitStep}={}){
 const world=content();
 world.maps[0].placeIds.push('place-exit');
 world.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 world.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Exit',viewIds:['view-exit'],transitions:[{toSceneId:'scene-room',trigger:'back'}]});
 world.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 world.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'only transition'}];
 world.missions[0].objectives=objectives??[{objectiveId:'objective-exit',verb:'reach',
  targetId:'scene-exit',requiredCount:1}];
 // Author intent is NOT a reward authorization, regardless of amount.
 world.missions[0].rewardRequest.exp=99999;
 worldMutator?.(world);
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[
   {ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'enter_scene',sceneId:'scene-exit'}]},
   {ruleId:'go-back',fromSceneId:'scene-exit',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'enter_scene',sceneId:'scene-room'}]}
  ]};
 const compiled=await prepareG4AEngine(world,manifest);assert.equal(compiled.ok,true);
 const operatorRequest={testOperator:true};
 const releaseGate={evaluateApprovedWorld:async(_,{worldId:w})=>({ok:true,eligible:true,
  worldId:w,snapshotHash,gateVersion:'world-release-1'})};
 const admission=createAdmissionRehearsal({releaseGate});
 const prepared=await admission.prepareRelease(operatorRequest,{worldId});
 assert.equal(prepared.ok,true);
 const started=await admission.simulateStart(operatorRequest,{candidateId:prepared.candidateId});
 assert.equal(started.ok,true);
 const authority=createG4DAuthorityFixture({database,plan:compiled.plan,admission,operatorRequest,
  verifyPlayer:async request=>request?.fixtureToken==='mock-player'?{playerId:actorId}:null,
  readTrustedAccess:async()=>({allowed:true,revision:1}),
  readApprovedPin:async()=>({worldId,snapshotHash,contentVersion:world.contentVersion,
   contentHash:manifest.contentHash,sourceVersion:'source-v1',sourceHash})});
 assert.equal((await authority.provision({playerRequest:{fixtureToken:'mock-player'},binding:{
  worldId,worldInstanceId:instanceId,entryId:'entry-local',admissionSessionId:started.sessionId
 }})).ok,true);
 const state={adjudicatorAllowed:true,decisionApproved:true};
 const callbacks={database,plan:compiled.plan,world,onBeforeCommit,onCommitStep,
  verifyAdjudicator:async request=>state.adjudicatorAllowed&&
   request?.fixtureToken==='mock-adjudicator'?{adjudicatorId:'reviewer-fixture'}:null,
  adjudicateMission:async({missionId,proof})=>({approved:state.decisionApproved,
   decisionId:'fixture-decision',missionId,contentHash:manifest.contentHash,
   evidenceRevision:proof.revision,evidenceChainHash:proof.chainHash})};
 const created=await createG4FSettlementFixture(callbacks);assert.equal(created.ok,true);
 const policy=(extra={})=>({version:G4F_POLICY_VERSION,policyId:'policy-fixture',
  policyRevision:1,missionId:'mission-room',completionVersion:'completion-v1',
  contentVersion:world.contentVersion,contentHash:manifest.contentHash,
  mode:'dry-run-only',...extra});
 const seedPolicy=(p=policy())=>created.fixture.seedPolicy(p);
 const settle=(cmd=command())=>created.fixture.settle(cmd);
 const submit=(payload=event())=>authority.submit({playerRequest:{fixtureToken:'mock-player'},event:payload});
 return {database,world,plan:compiled.plan,callbacks,created,policy,seedPolicy,settle,submit,state};
}

test('G4F needs G4E committed objective evidence AND an independent synthetic adjudication',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.settle()).code,'mission-not-proven');
 assert.deepEqual(rows(h.database),[0,0]);
 assert.equal((await h.submit()).ok,true);
 const outcome=await h.settle();assert.equal(outcome.ok,true);
 assert.equal(outcome.duplicate,false);assert.equal(outcome.dryRunCommitted,true);
 assert.equal(outcome.receipt.decisionId,'fixture-decision');
 assert.equal(outcome.receipt.evidenceRevision,1);
 assert.equal(outcome.rewardAuthorized,false);assert.equal(outcome.rewardCommitted,false);
 assert.equal(outcome.saveCommitted,false);
 assert.equal(outcome.missionCompleted,false);assert.equal(outcome.productionAuthorized,false);
 assert.deepEqual(rows(h.database),[1,1]);
 const ledger=h.created.fixture.inspect(instanceId).ledger[0];
 assert.equal(ledger.kind,'dry_run_only');assert.equal(ledger.reward_authorized,0);
 assert.equal(ledger.reward_committed,0);
 assert.equal(h.database.prepare('SELECT revision FROM vg_g4c_sessions_fixture_v1').get().revision,1);
 h.database.close();
});

test('G4F does not convert unsupported objectives or author rewardRequest to an entitlement',async()=>{
 const h=await setup({objectives:[{objectiveId:'objective-exit',verb:'reach',
  targetId:'scene-exit',requiredCount:2}]});
 assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).code,'mission-not-proven');
 assert.deepEqual(rows(h.database),[0,0]);h.database.close();
});

test('G4F optional hidden missions have independent dry-run keys without gating the main story',async()=>{
 const h=await setup({worldMutator:world=>world.missions.push({
  missionId:'mission-secret',name:'Return',kind:'hidden',requiredForCompletion:false,
  startSceneId:'scene-room',summary:'An optional visit.',
  objectives:[{objectiveId:'objective-secret',verb:'reach',targetId:'scene-room',requiredCount:1}],
  rewardRequest:{exp:900000,items:[]},replayPolicy:'none'
 })});
 assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.seedPolicy(h.policy({missionId:'mission-secret'}))).ok,true);
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 assert.equal((await h.settle(command({missionId:'mission-secret',requestId:'secret-run'}))).code,
  'mission-not-proven');
 assert.equal((await h.submit(event('return-event',1,'go-back'))).ok,true);
 const secret=await h.settle(command({missionId:'mission-secret',requestId:'secret-run'}));
 assert.equal(secret.ok,true);assert.equal(secret.rewardAuthorized,false);
 assert.deepEqual(rows(h.database),[2,2]);h.database.close();
});

test('G4F denies missing synthetic reviewer, rejected decision and forged client claims',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.submit()).ok,true);
 h.state.adjudicatorAllowed=false;
 assert.equal((await h.settle()).code,'unverified-adjudicator');
 h.state.adjudicatorAllowed=true;h.state.decisionApproved=false;
 assert.equal((await h.settle()).code,'adjudication-denied');
 h.state.decisionApproved=true;
 for(const claim of [{rewardGranted:true},{exp:9999},{playerId:actorId},
  {missionCompleted:true},{policy:{mode:'approved'}}])
  assert.equal((await h.settle(command(claim))).code,'invalid-settlement-request');
 assert.deepEqual(rows(h.database),[0,0]);h.database.close();
});

test('G4F policy must be separately pinned; cannot be a numeric author reward claim',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).code,'dry-run-policy-denied');
 for(const invalid of [
  h.policy({mode:'real-reward'}),h.policy({contentHash:'f'.repeat(64)}),
  h.policy({exp:500}),h.policy({policyRevision:0})
 ])assert.equal((await h.seedPolicy(invalid)).code,'invalid-dry-run-policy');
 assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.seedPolicy()).code,'dry-run-policy-exists-or-unavailable');
 assert.equal((await h.settle()).ok,true);h.database.close();
});

test('G4F policy revocation is monotonic; restoring active status cannot launder a stale approval',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 h.database.exec("UPDATE vg_g4f_policies_fixture_v1 SET status='revoked',policy_epoch=policy_epoch+1");
 assert.throws(()=>h.database.exec(
  "UPDATE vg_g4f_policies_fixture_v1 SET status='active',policy_epoch=policy_epoch+1"),
  /fixture-policy-revocation-monotonic/);
 assert.equal((await h.settle()).code,'dry-run-policy-denied');
 assert.deepEqual(rows(h.database),[0,0]);h.database.close();
});

test('G4F retry after response loss returns identical receipt with no double settlement',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.submit()).ok,true);
 const first=await h.settle();assert.equal(first.ok,true);
 const duplicate=await h.settle();assert.equal(duplicate.duplicate,true);
 assert.deepEqual(duplicate.receipt,first.receipt);assert.deepEqual(rows(h.database),[1,1]);
 assert.equal((await h.submit(event('return-event',1,'go-back'))).ok,true);
 const later=await h.settle();assert.equal(later.duplicate,true);
 assert.deepEqual(later.receipt,first.receipt);assert.deepEqual(rows(h.database),[1,1]);
 h.database.close();
});

test('G4F uniquely locks completion-version and requestId; different payload cannot reuse receipt',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 assert.equal((await h.settle(command({requestId:'another-request'}))).code,'settlement-key-conflict');
 assert.equal((await h.seedPolicy(h.policy({completionVersion:'completion-v2'}))).ok,true);
 assert.equal((await h.settle(command({completionVersion:'completion-v2'}))).code,'settlement-request-conflict');
 assert.deepEqual(rows(h.database),[1,1]);h.database.close();
});

test('G4F two concurrent requests on the same completion key settle once only',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.submit()).ok,true);
 const [a,b]=await Promise.all([h.settle(),h.settle(command({requestId:'second-request'}))]);
 assert.equal([a,b].filter(x=>x.ok).length,1);
 assert.equal([a,b].filter(x=>x.code==='settlement-key-conflict').length,1);
 assert.deepEqual(rows(h.database),[1,1]);h.database.close();
});

test('G4F rolls back receipt and ledger together on injected failures',async()=>{
 for(const stage of ['after-receipt','after-ledger']){
  const h=await setup({onCommitStep:at=>{if(at===stage)throw Error('test-failure');}});
  assert.equal((await h.seedPolicy()).ok,true);
  assert.equal((await h.submit()).ok,true);
  assert.equal((await h.settle()).code,'settlement-transaction-failed');
  assert.deepEqual(rows(h.database),[0,0]);
  assert.equal(h.database.prepare('SELECT revision FROM vg_g4c_sessions_fixture_v1').get().revision,1);
  h.database.close();
 }
});

test('G4F catches policy revocation and G4D epoch/access changes just before commit',async()=>{
 for(const sql of [
  "UPDATE vg_g4f_policies_fixture_v1 SET status='revoked',policy_epoch=policy_epoch+1",
  "UPDATE vg_g4d_authority_fixture_v1 SET status='blocked',fence_epoch=fence_epoch+1",
  'UPDATE vg_g4d_authority_fixture_v1 SET access_revision=access_revision+1,fence_epoch=fence_epoch+1',
  "UPDATE vg_g4c_gates_fixture_v1 SET license_state='revoked'",
  'UPDATE vg_g4c_sessions_fixture_v1 SET revision=revision+1'
 ]){
  let db;
  const h=await setup({onBeforeCommit:()=>db.exec(sql)});db=h.database;
  assert.equal((await h.seedPolicy()).ok,true);
  assert.equal((await h.submit()).ok,true);
  const r=await h.settle();assert.equal(r.ok,false,sql);
  assert.deepEqual(rows(db),[0,0],sql);db.close();
 }
});

test('G4F missing G4C evidence or corrupted persisted receipt denies re-application',async()=>{
 const h=await setup();assert.equal((await h.seedPolicy()).ok,true);
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.settle()).ok,true);
 h.database.exec('DROP TRIGGER vg_g4f_ledger_no_delete; DELETE FROM vg_g4f_ledger_fixture_v1');
 assert.equal((await h.settle()).code,'settlement-ledger-corrupt');
 h.database.close();
});

test('G4F fixture receipt persists across SQLite reopen after lost network response',async()=>{
 const path=mkdtempSync(join(tmpdir(),'dudu-g4f-'));
 const file=join(path,'fixture.sqlite');
 try{
  const h=await setup({database:new DatabaseSync(file)});
  assert.equal((await h.seedPolicy()).ok,true);
  assert.equal((await h.submit()).ok,true);
  const first=await h.settle();assert.equal(first.ok,true);
  h.database.close();
  const database=new DatabaseSync(file);
  const reopened=await createG4FSettlementFixture({...h.callbacks,database});
  assert.equal(reopened.ok,true);
  const second=await reopened.fixture.settle(command());
  assert.equal(second.duplicate,true);
  assert.deepEqual(second.receipt,first.receipt);
  assert.deepEqual(rows(database),[1,1]);database.close();
 }finally{rmSync(path,{recursive:true,force:true});}
});

test('G4F is Node-only; no Worker/Creator/Thiên Mệnh binding or production grant',()=>{
 const source=readFileSync(new URL('../src/vangioi-engine-g4f-settlement-fixture.mjs',import.meta.url),'utf8');
 for(const target of ['../src/index.mjs','../../index.html'])
  assert.equal(readFileSync(new URL(target,import.meta.url),'utf8').includes(
   'vangioi-engine-g4f-settlement-fixture'),false);
 for(const token of ['firebase-admin','wrangler deploy','grantReward','reward_authorized=1',
  'globalInventory','worldAccess:true'])assert.equal(source.includes(token),false,token);
});
