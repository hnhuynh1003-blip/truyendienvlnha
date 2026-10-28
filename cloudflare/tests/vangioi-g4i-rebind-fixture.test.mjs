import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
import {createG4HFixtureBackup,createG4HFixtureRestore} from '../src/vangioi-engine-g4h-fixture-recovery.mjs';
import {createG4IRebindFixture,G4I_REBIND_VERSION} from '../src/vangioi-engine-g4i-rebind-fixture.mjs';

const actor='player-fixture',instance='instance-g4i',worldId='world-fixture';
const event=(eventId='event-one',revision=0,ruleId='go-exit')=>({
 version:G4B_EVENT_VERSION,eventId,playerId:actor,worldInstanceId:instance,
 expectedRevision:revision,ruleId});
const count=(db,table)=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const rebindCounts=db=>['vg_g4i_rebind_receipts_fixture_v1',
 'vg_g4i_rebind_ledger_fixture_v1'].map(t=>count(db,t));

async function prepareWorld(){
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
 return {plan:p.plan,world};
}
async function admission(){
 const operator={testOperator:true};
 const rehearsal=createAdmissionRehearsal({releaseGate:{evaluateApprovedWorld:async(_,{worldId:w})=>({
  ok:true,eligible:true,worldId:w,snapshotHash:'a'.repeat(64),gateVersion:'world-release-1'
 })}});
 const released=await rehearsal.prepareRelease(operator,{worldId});assert.equal(released.ok,true);
 const started=await rehearsal.simulateStart(operator,{candidateId:released.candidateId});
 assert.equal(started.ok,true);
 return {rehearsal,operator,sessionId:started.sessionId};
}
const mockReaders=(plan,flags)=>({
 verifyPlayer:async()=>flags.playerValid?{playerId:actor}:null,
 readTrustedAccess:async()=>({allowed:flags.allowed,revision:flags.revision}),
 readApprovedPin:async()=>({worldId,snapshotHash:'a'.repeat(64),
  contentVersion:plan.contentVersion,contentHash:flags.contentHash,
  sourceVersion:'synthetic-v1',sourceHash:flags.sourceHash})
});
async function fixtureSetup(){
 const {plan,world}=await prepareWorld(),source=new DatabaseSync(':memory:');
 const flags={playerValid:true,allowed:true,revision:1,
  contentHash:plan.contentHash,sourceHash:'b'.repeat(64)};
 const old=await admission(),readers=mockReaders(plan,flags);
 const g4d=createG4DAuthorityFixture({database:source,plan,admission:old.rehearsal,
  operatorRequest:old.operator,...readers});
 createG4CFixtureStore({database:source,plan});
 assert.equal((await g4d.provision({playerRequest:{test:true},binding:{worldId,
  worldInstanceId:instance,entryId:'entry-local',admissionSessionId:old.sessionId}})).ok,true);
 const settlementOptions={plan,world,verifyAdjudicator:async()=>({adjudicatorId:'mock'}),
  adjudicateMission:async({missionId,proof})=>({approved:true,decisionId:'mock-decision',
   missionId,contentHash:plan.contentHash,evidenceRevision:proof.revision,
   evidenceChainHash:proof.chainHash})};
 const f=await createG4FSettlementFixture({database:source,...settlementOptions});assert.equal(f.ok,true);
 assert.equal((await f.fixture.seedPolicy({version:G4F_POLICY_VERSION,policyId:'mock-policy',
  policyRevision:1,missionId:'mission-room',completionVersion:'completion-v1',
  contentVersion:world.contentVersion,contentHash:plan.contentHash,mode:'dry-run-only'})).ok,true);
 assert.equal((await g4d.submit({playerRequest:{test:true},event:event()})).ok,true);
 assert.equal((await f.fixture.settle({adjudicatorRequest:{test:true},worldInstanceId:instance,
  missionId:'mission-room',completionVersion:'completion-v1',requestId:'settlement-one'})).ok,true);
 const sourceExport=await createG4HFixtureBackup({database:source,plan,world});
 const copy=await sourceExport.fixture.exportInstance({worldInstanceId:instance});
 assert.equal(copy.ok,true);
 const target=new DatabaseSync(':memory:');
 const fresh=await admission();
 createG4CFixtureStore({database:target,plan});
 const activeG4D=createG4DAuthorityFixture({database:target,plan,admission:fresh.rehearsal,
  operatorRequest:fresh.operator,...readers});
 const f2=await createG4FSettlementFixture({database:target,...settlementOptions});assert.equal(f2.ok,true);
 const restored=await createG4HFixtureRestore({database:target,plan,world});
 assert.equal((await restored.fixture.restore(copy.backup)).ok,true);
 const makeG4I=(options={})=>createG4IRebindFixture({database:target,plan,world,
  admission:fresh.rehearsal,operatorRequest:fresh.operator,...readers,...options});
 const g4i=await makeG4I();assert.equal(g4i.ok,true);
 const command={playerRequest:{test:true},operatorRebind:{worldInstanceId:instance,
  admissionSessionId:fresh.sessionId,requestId:'rebind-one'}};
 const inspect=async()=>{
  const audit=await createG4GRecoveryAuditor({database:target,plan,world});
  return audit.auditor.inspect({worldInstanceId:instance});
 };
 return {plan,world,source,target,flags,old,fresh,readers,activeG4D,g4i:g4i.fixture,
  makeG4I,command,inspect,
  close(){source.close();target.close();}};
}

test('G4I cannot submit using the expired G1Z RAM handle after G4H restore',async()=>{
 const h=await fixtureSetup();
 const denied=await h.activeG4D.submit({playerRequest:{test:true},event:event('new',1,'go-back')});
 assert.equal(denied.code,'release-not-eligible');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I test-host rebind updates only G4D fence and immutable local audit, then G4D resumes',async()=>{
 const h=await fixtureSetup(),before=await h.inspect();
 const result=await h.g4i.rebind(h.command);
 assert.equal(result.ok,true);assert.equal(result.duplicate,false);
 assert.equal(result.receipt.version,G4I_REBIND_VERSION);
 assert.equal(result.receipt.fenceEpoch,2);
 assert.equal(result.productionAuthorized,false);assert.equal(result.rewardAuthorized,false);
 assert.deepEqual(rebindCounts(h.target),[1,1]);
 const after=await h.inspect();assert.equal(after.integrity,'consistent');
 assert.notEqual(after.checkpointFingerprint,before.checkpointFingerprint);
 assert.deepEqual(after.counts,before.counts);
 assert.equal((await h.activeG4D.submit({playerRequest:{test:true},event:event('go-back',1,'go-back')})).ok,true);
 h.close();
});

test('G4I concurrent duplicate retry gets same receipt after lost response',async()=>{
 const h=await fixtureSetup();
 const [a,b]=await Promise.all([h.g4i.rebind(h.command),h.g4i.rebind(h.command)]);
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.deepEqual(a.receipt,b.receipt);
 assert.ok([a.duplicate,b.duplicate].includes(true));
 assert.deepEqual(rebindCounts(h.target),[1,1]);
 const retry=await h.g4i.rebind(h.command);
 assert.equal(retry.ok,true);assert.equal(retry.duplicate,true);
 assert.deepEqual(retry.receipt,a.receipt);h.close();
});

test('G4I rejects changed payload with the same rebind requestId',async()=>{
 const h=await fixtureSetup();assert.equal((await h.g4i.rebind(h.command)).ok,true);
 const alternative=await admission();
 const conflicting=await h.makeG4I({admission:alternative.rehearsal,operatorRequest:alternative.operator});
 const result=await conflicting.fixture.rebind({...h.command,
  operatorRebind:{...h.command.operatorRebind,admissionSessionId:alternative.sessionId}});
 assert.equal(result.code,'rebind-request-conflict');
 assert.deepEqual(rebindCounts(h.target),[1,1]);h.close();
});

test('G4I rejects a rebind while the old G1Z session is still valid',async()=>{
 const h=await fixtureSetup();
 const oldHost=await h.makeG4I({admission:h.old.rehearsal,operatorRequest:h.old.operator});
 // A second session from the same G1Z operator does not imply a restart.
 const released=await h.old.rehearsal.prepareRelease(h.old.operator,{worldId});
 const started=await h.old.rehearsal.simulateStart(h.old.operator,{candidateId:released.candidateId});
 const result=await oldHost.fixture.rebind({...h.command,
  operatorRebind:{...h.command.operatorRebind,admissionSessionId:started.sessionId}});
 assert.equal(result.code,'rebind-old-admission-still-valid');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I held license and revoked access do not become allowed on rebind',async()=>{
 const h=await fixtureSetup();
 h.target.exec("UPDATE vg_g4c_gates_fixture_v1 SET license_state='held'");
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-access-held-or-stale');
 h.target.exec("UPDATE vg_g4c_gates_fixture_v1 SET license_state='active'");
 h.flags.allowed=false;
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-trusted-access-or-pin-denied');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I rejects wrong actor or freshly rotated source/content pins',async()=>{
 const h=await fixtureSetup();
 h.flags.playerValid=false;
 assert.equal((await h.g4i.rebind(h.command)).code,'unverified-player');
 h.flags.playerValid=true;h.flags.sourceHash='c'.repeat(64);
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-trusted-access-or-pin-denied');
 h.flags.sourceHash='b'.repeat(64);h.flags.contentHash='d'.repeat(64);
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-trusted-access-or-pin-denied');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I detects a damaged G4C/G4F historical ledger before attempting rebind',async()=>{
 const h=await fixtureSetup();
 h.target.exec('DROP TRIGGER vg_g4f_ledger_no_delete; DELETE FROM vg_g4f_ledger_fixture_v1');
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-history-corrupt');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I rejects stale state/revoke changed during async trusted checks',async()=>{
 const h=await fixtureSetup();
 const contender=await h.makeG4I({onBeforeCommit:()=>{
  h.target.exec("UPDATE vg_g4c_gates_fixture_v1 SET license_state='revoked'");
 }});
 const result=await contender.fixture.rebind(h.command);
 assert.equal(result.code,'rebind-access-held-or-stale');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I rolled-back fence and audit when the fixture crashes between writes',async()=>{
 const h=await fixtureSetup();
 const fenceBefore=h.target.prepare('SELECT * FROM vg_g4d_authority_fixture_v1').get();
 const broken=await h.makeG4I({onCommitStep:step=>{
  if(step==='after-receipt')throw Error('synthetic-crash');
 }});
 assert.equal((await broken.fixture.rebind(h.command)).code,'rebind-transaction-rolled-back');
 assert.deepEqual(h.target.prepare('SELECT * FROM vg_g4d_authority_fixture_v1').get(),fenceBefore);
 assert.deepEqual(rebindCounts(h.target),[0,0]);
 assert.equal((await h.g4i.rebind(h.command)).ok,true);h.close();
});

test('G4I immutable rebind receipts and ledgers reject ordinary UPDATE/DELETE',async()=>{
 const h=await fixtureSetup();assert.equal((await h.g4i.rebind(h.command)).ok,true);
 assert.throws(()=>h.target.exec(`UPDATE vg_g4i_rebind_receipts_fixture_v1
  SET receipt_json='{}'`));
 assert.throws(()=>h.target.exec('DELETE FROM vg_g4i_rebind_ledger_fixture_v1'));
 assert.deepEqual(rebindCounts(h.target),[1,1]);h.close();
});

test('G4I detects a changed historical rebind receipt even if a trigger is removed',async()=>{
 const h=await fixtureSetup();assert.equal((await h.g4i.rebind(h.command)).ok,true);
 h.target.exec('DROP TRIGGER vg_g4i_receipt_no_update');
 h.target.prepare('UPDATE vg_g4i_rebind_receipts_fixture_v1 SET receipt_json=?').run('{}');
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-receipt-corrupt');
 assert.deepEqual(rebindCounts(h.target),[1,1]);h.close();
});

test('G4I detects orphaned rebind receipt if its audit ledger was removed',async()=>{
 const h=await fixtureSetup();assert.equal((await h.g4i.rebind(h.command)).ok,true);
 h.target.exec('DROP TRIGGER vg_g4i_ledger_no_delete; DELETE FROM vg_g4i_rebind_ledger_fixture_v1');
 assert.equal((await h.g4i.rebind(h.command)).code,'rebind-receipt-corrupt');
 assert.deepEqual(rebindCounts(h.target),[1,0]);h.close();
});

test('G4H v1 refuses to silently omit newly created G4I rebind history from backup',async()=>{
 const h=await fixtureSetup();
 const legacy=await createG4HFixtureBackup({database:h.target,plan:h.plan,world:h.world});
 assert.equal((await legacy.fixture.exportInstance({worldInstanceId:instance})).ok,true);
 assert.equal((await h.g4i.rebind(h.command)).ok,true);
 assert.equal((await legacy.fixture.exportInstance({worldInstanceId:instance})).code,
  'rebind-history-not-backup-compatible');
 h.close();
});

test('G4H v1 still fails closed if both G4I journal rows were removed',async()=>{
 const h=await fixtureSetup();assert.equal((await h.g4i.rebind(h.command)).ok,true);
 h.target.exec(`DROP TRIGGER vg_g4i_receipt_no_delete;
  DROP TRIGGER vg_g4i_ledger_no_delete;
  DELETE FROM vg_g4i_rebind_receipts_fixture_v1;
  DELETE FROM vg_g4i_rebind_ledger_fixture_v1`);
 const backup=await createG4HFixtureBackup({database:h.target,plan:h.plan,world:h.world});
 assert.equal((await backup.fixture.exportInstance({worldInstanceId:instance})).code,
  'rebind-history-not-backup-compatible');
 h.close();
});

test('G4I CAS blocks a changed fence epoch during async re-admission',async()=>{
 const h=await fixtureSetup();
 const contender=await h.makeG4I({onBeforeCommit:()=>{
  h.target.exec('UPDATE vg_g4d_authority_fixture_v1 SET fence_epoch=fence_epoch+1');
 }});
 assert.equal((await contender.fixture.rebind(h.command)).code,'rebind-fence-stale');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I rejects unsupported client claims and role spoofing',async()=>{
 const h=await fixtureSetup();
 for(const extra of [{missionCompleted:true},{admin:true},{role:'publisher'},
  {rewardGranted:true},{sourceHash:'a'.repeat(64)}]){
  assert.equal((await h.g4i.rebind({...h.command,...extra})).code,'invalid-rebind-request');
 }
 assert.equal((await h.g4i.rebind({...h.command,
  operatorRebind:{...h.command.operatorRebind,admin:true}})).code,'invalid-rebind-request');
 assert.deepEqual(rebindCounts(h.target),[0,0]);h.close();
});

test('G4I never imports into public Worker, Creator or browser paths',async()=>{
 const source=readFileSync(new URL('../src/vangioi-engine-g4i-rebind-fixture.mjs',import.meta.url),'utf8');
 assert.equal(source.includes("from 'node:sqlite'"),true);
 for(const path of ['../src/index.mjs','../../index.html','../../functions/index.js'])
  assert.equal(readFileSync(new URL(path,import.meta.url),'utf8').includes(
   'vangioi-engine-g4i-rebind-fixture'),false);
});
