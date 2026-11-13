import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {content} from './fixtures/vangioi-content.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION,prepareG4AEngine} from '../src/vangioi-engine-g4a.mjs';
import {G4B_EVENT_VERSION,createG4BSession,applyG4BEvent} from '../src/vangioi-engine-g4b.mjs';
import {createAdmissionRehearsal} from '../src/vangioi-admission-rehearsal.mjs';
import {createG4CFixtureStore} from '../src/vangioi-engine-g4c-fixture.mjs';
import {createG4DAuthorityFixture} from '../src/vangioi-engine-g4d-authority-fixture.mjs';
import {createG4EObjectiveFixture} from '../src/vangioi-engine-g4e-objective-fixture.mjs';

const actorId='synthetic-player',instanceId='instance-g4e',worldId='world-synthetic';
const sourceHash='b'.repeat(64),snapshotHash='c'.repeat(64);
const event=(eventId='event-arrive',expectedRevision=0,ruleId='go-exit')=>({
 version:G4B_EVENT_VERSION,eventId,playerId:actorId,worldInstanceId:instanceId,
 expectedRevision,ruleId});
const rows=db=>['vg_g4c_sessions_fixture_v1','vg_g4c_receipts_fixture_v1',
 'vg_g4c_ledger_fixture_v1','vg_g4d_authority_fixture_v1'].map(table=>
  db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);

async function setup({objectives,worldMutator,onBeforeCommit}={}){
 const world=content();
 world.maps[0].placeIds.push('place-exit');
 world.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 world.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Exit',viewIds:['view-exit'],transitions:[{toSceneId:'scene-room',trigger:'back'}]});
 world.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 world.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'open the exit'}];
 world.missions[0].objectives=objectives??[{objectiveId:'objective-exit',verb:'reach',
  targetId:'scene-exit',requiredCount:1}];
 worldMutator?.(world);
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[
   {ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
    condition:{op:'flag_unset',flag:'blocked'},actions:[{op:'set_flag',flag:'visited'},
     {op:'enter_scene',sceneId:'scene-exit'}]},
   {ruleId:'go-back',fromSceneId:'scene-exit',transitionIndex:0,
    condition:{op:'flag_set',flag:'visited'},actions:[{op:'enter_scene',sceneId:'scene-room'}]}
  ]};
 const prepared=await prepareG4AEngine(world,manifest);assert.equal(prepared.ok,true);
 const database=new DatabaseSync(':memory:');
 const releaseGate={evaluateApprovedWorld:async(_,request)=>({ok:true,eligible:true,
  worldId:request.worldId,snapshotHash,gateVersion:'world-release-1'})};
 const admission=createAdmissionRehearsal({releaseGate});
 const operatorRequest={fixtureOperator:true};
 const release=await admission.prepareRelease(operatorRequest,{worldId});
 assert.equal(release.ok,true);
 const started=await admission.simulateStart(operatorRequest,{candidateId:release.candidateId});
 assert.equal(started.ok,true);
 const authority=createG4DAuthorityFixture({database,plan:prepared.plan,admission,operatorRequest,
  verifyPlayer:async request=>request?.token==='synthetic-token'?{playerId:actorId}:null,
  readTrustedAccess:async()=>({allowed:true,revision:1}),
  readApprovedPin:async()=>({worldId,snapshotHash,contentVersion:world.contentVersion,
   contentHash:manifest.contentHash,sourceVersion:'source-v1',sourceHash}),onBeforeCommit});
 assert.equal((await authority.provision({playerRequest:{token:'synthetic-token'},binding:{
  worldId,worldInstanceId:instanceId,entryId:'entry-local',admissionSessionId:started.sessionId
 }})).ok,true);
 const fixture=await createG4EObjectiveFixture({database,plan:prepared.plan,world});
 assert.equal(fixture.ok,true);
 const submit=(payload=event())=>authority.submit({playerRequest:{token:'synthetic-token'},event:payload});
 const evaluate=(request={worldInstanceId:instanceId,actorId})=>fixture.fixture.evaluate(request);
 return {database,world,plan:prepared.plan,submit,evaluate,fixture};
}

test('G4E reads a committed G4D/G4C scene arrival, not the starting scene or claim',async()=>{
 const h=await setup();
 const initial=await h.evaluate();
 assert.equal(initial.ok,true);assert.equal(initial.revision,0);
 assert.equal(initial.missions[0].reviewCandidate,false);
 assert.equal(initial.missions[0].objectives[0].status,'pending');
 assert.equal(initial.missionCompleted,false);assert.equal(initial.rewardAuthorized,false);
 const committed=await h.submit();assert.equal(committed.ok,true);
 const proof=await h.evaluate();assert.equal(proof.ok,true);
 assert.equal(proof.revision,1);assert.equal(proof.authority,'offline-fixture-only');
 assert.equal(proof.missions[0].reviewCandidate,true);
 assert.deepEqual(proof.missions[0].objectives,[{objectiveId:'objective-exit',status:'observed',
  evidence:{eventId:'event-arrive',revision:1,chainHash:committed.receipt.chainHash,ruleId:'go-exit'}}]);
 assert.equal(proof.missionCompleted,false);assert.equal(proof.endingVerified,false);
 assert.equal(proof.rewardAuthorized,false);assert.equal(proof.rewardCommitted,false);
 assert.equal(proof.productionAuthorized,false);h.database.close();
});

test('G4E does not treat initial spawn or a final flag as a scene-arrival receipt',async()=>{
 const h=await setup({objectives:[{objectiveId:'objective-start',verb:'reach',
  targetId:'scene-room',requiredCount:1}]});
 assert.equal((await h.evaluate()).missions[0].objectives[0].status,'pending');
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.evaluate()).missions[0].objectives[0].status,'pending');
 assert.equal((await h.submit(event('return-event',1,'go-back'))).ok,true);
 const proof=await h.evaluate();
 assert.equal(proof.missions[0].objectives[0].status,'observed');
 assert.equal(proof.missions[0].objectives[0].evidence.eventId,'return-event');
 h.database.close();
});

test('G4E rejects unsupported verbs and repeated-count semantics even if the scene was reached',async()=>{
 const h=await setup({worldMutator:world=>world.views[0].hotspots.push({
  hotspotId:'hotspot-exit',presentation:'text',label:'Leave',action:'move',targetId:'scene-exit'
 }),objectives:[
  {objectiveId:'objective-exit',verb:'reach',targetId:'scene-exit',requiredCount:1},
  {objectiveId:'objective-choice',verb:'choose',targetId:'hotspot-exit',requiredCount:1},
  {objectiveId:'objective-laps',verb:'reach',targetId:'scene-exit',requiredCount:2}
 ]});
 assert.equal((await h.submit()).ok,true);
 assert.equal((await h.submit(event('event-back',1,'go-back'))).ok,true);
 assert.equal((await h.submit(event('event-arrive-again',2,'go-exit'))).ok,true);
 const proof=await h.evaluate();assert.equal(proof.ok,true);
 assert.deepEqual(proof.missions[0].objectives.map(o=>o.status),['observed','unsupported','unsupported']);
 assert.equal(proof.missions[0].reviewCandidate,false);h.database.close();
});

test('G4E derives optional side/hidden missions independently; main is not a global grant',async()=>{
 const h=await setup({worldMutator:world=>{
  world.missions.push({missionId:'mission-hidden',name:'Find a secret',kind:'hidden',
   requiredForCompletion:false,startSceneId:'scene-room',summary:'Optional scene.',
   objectives:[{objectiveId:'objective-back',verb:'reach',targetId:'scene-room',requiredCount:1}],
   rewardRequest:{exp:9999,items:[]},replayPolicy:'none'});
 }});
 assert.equal((await h.submit()).ok,true);
 let proof=await h.evaluate();assert.equal(proof.missions[0].reviewCandidate,true);
 assert.equal(proof.missions[1].reviewCandidate,false);
 assert.equal(proof.missions[1].requiredForCompletion,false);
 assert.equal((await h.submit(event('return-event',1,'go-back'))).ok,true);
 proof=await h.evaluate();assert.equal(proof.missions[1].reviewCandidate,true);
 assert.equal(proof.rewardAuthorized,false);h.database.close();
});

test('G4E is idempotent after retry and rejects client-supplied completion or receipt claims',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 const before=await h.evaluate();
 assert.equal((await h.submit()).duplicate,true);
 assert.deepEqual(await h.evaluate(),before);
 for(const extra of [{missionCompleted:true},{rewardAuthorized:true},{session:{}},
  {receipt:{eventId:'forged'}},{playerId:actorId}])
  assert.equal((await h.evaluate({worldInstanceId:instanceId,actorId,...extra})).code,'invalid-request');
 assert.deepEqual(rows(h.database),[1,1,1,1]);h.database.close();
});

test('G4E needs committed receipts/ledger; a valid client-made G4B candidate is insufficient',async()=>{
 const h=await setup();
 const local=await createG4BSession(h.plan,{playerId:actorId,worldInstanceId:instanceId,entryId:'entry-local'});
 const candidate=await applyG4BEvent(h.plan,local.session,event());assert.equal(candidate.ok,true);
 assert.equal(candidate.session.revision,1);
 assert.equal((await h.evaluate()).missions[0].reviewCandidate,false);
 assert.deepEqual(rows(h.database),[1,0,0,1]);h.database.close();
});

test('G4E rejects access or G4D fence revocation, content/source rotation and impersonation',async()=>{
 const cases=[
  "UPDATE vg_g4c_gates_fixture_v1 SET access_state='denied'",
  "UPDATE vg_g4c_gates_fixture_v1 SET license_state='held'",
  "UPDATE vg_g4c_gates_fixture_v1 SET source_state='stale'",
  "UPDATE vg_g4d_authority_fixture_v1 SET status='blocked',fence_epoch=fence_epoch+1",
  "UPDATE vg_g4d_authority_fixture_v1 SET source_hash='d' || substr(source_hash,2)",
  "UPDATE vg_g4c_sessions_fixture_v1 SET content_hash='e' || substr(content_hash,2)"
 ];
 for(const sql of cases){
  const h=await setup();assert.equal((await h.submit()).ok,true);
  h.database.exec(sql);
  const r=await h.evaluate();assert.equal(r.ok,false,sql);
  h.database.close();
 }
 const h=await setup();
 assert.equal((await h.evaluate({worldInstanceId:instanceId,actorId:'intruder'})).code,
  'fixture-access-denied');h.database.close();
});

test('G4E rejects missing or modified persisted receipt and audit records',async()=>{
 for(const sql of [
  'DROP TRIGGER vg_g4c_receipts_immutable_delete; DELETE FROM vg_g4c_receipts_fixture_v1',
  'DROP TRIGGER vg_g4c_ledger_immutable_delete; DELETE FROM vg_g4c_ledger_fixture_v1',
  "DROP TRIGGER vg_g4c_ledger_immutable_update; UPDATE vg_g4c_ledger_fixture_v1 SET request_hash='f' || substr(request_hash,2)",
  "DROP TRIGGER vg_g4c_receipts_immutable_update; UPDATE vg_g4c_receipts_fixture_v1 SET receipt_json='{}'"
 ]){
  const h=await setup();assert.equal((await h.submit()).ok,true);
  h.database.exec(sql);
  assert.equal((await h.evaluate()).ok,false,sql);h.database.close();
 }
});

test('G4E rejects corrupt replay state even when a receipt row remains intact',async()=>{
 const h=await setup();assert.equal((await h.submit()).ok,true);
 h.database.prepare("UPDATE vg_g4c_sessions_fixture_v1 SET session_json=?").run('{}');
 assert.equal((await h.evaluate()).code,'fixture-evidence-corrupt');h.database.close();
});

test('G4E does not observe a failed G4C/G4D transaction or grant rewards',async()=>{
 let db;
 const h=await setup({onBeforeCommit:()=>db.prepare(
  "UPDATE vg_g4d_authority_fixture_v1 SET status='blocked',fence_epoch=fence_epoch+1").run()});
 db=h.database;
 assert.equal((await h.submit()).code,'authority-fence-denied');
 assert.deepEqual(rows(db),[1,0,0,1]);
 assert.equal((await h.evaluate()).ok,false);db.close();
});

test('G4E fails closed on stale authoring content and legacy G4C without a G4D fence',async()=>{
 const h=await setup();
 const different=structuredClone(h.world);different.missions[0].objectives[0].targetId='scene-room';
 assert.equal((await createG4EObjectiveFixture({database:h.database,plan:h.plan,world:different})).code,
  'stale-world');
 h.database.exec('DELETE FROM vg_g4d_authority_fixture_v1');
 assert.equal((await h.evaluate()).code,'authority-fence-unavailable');h.database.close();
 const second=new DatabaseSync(':memory:');
 const legacy=createG4CFixtureStore({database:second,plan:h.plan});
 assert.equal((await legacy.seed({playerId:actorId,worldInstanceId:'old-instance',
  entryId:'entry-local',sourceVersion:'source-v1',sourceHash,accessState:'allowed',
  licenseState:'active',sourceState:'current'})).ok,true);
 const fixture=await createG4EObjectiveFixture({database:second,plan:h.plan,world:h.world});
 assert.equal((await fixture.fixture.evaluate({worldInstanceId:'old-instance',actorId})).code,
  'fixture-read-unavailable');second.close();
});

test('G4E has no Worker/Creator/Thiên Mệnh/Firebase connection or mission/reward writer',()=>{
 const src=readFileSync(new URL('../src/vangioi-engine-g4e-objective-fixture.mjs',import.meta.url),'utf8');
 for(const path of ['../src/index.mjs','../../index.html'])
  assert.equal(readFileSync(new URL(path,import.meta.url),'utf8').includes(
   'vangioi-engine-g4e-objective-fixture'),false);
 for(const token of ['firebase-admin','wrangler deploy','grantReward','UPDATE vg_g4c',
  'INSERT INTO vg_g4c','reward_authorized=1','worldAccess:true'])
  assert.equal(src.includes(token),false,token);
});
