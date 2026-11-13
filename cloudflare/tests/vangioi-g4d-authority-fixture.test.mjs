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

const identity={worldId:'world-synthetic',worldInstanceId:'instance-synthetic',entryId:'entry-local'};
const operatorRequest={operatorFixture:'synthetic-only'};
const playerRequest={testToken:'synthetic-player-token'};
const snapshotHash='a'.repeat(64),sourceHash='b'.repeat(64);
const event=(eventId='event-one',expectedRevision=0,ruleId='go-exit',extra={})=>({
 version:G4B_EVENT_VERSION,eventId,playerId:'synthetic-player',worldInstanceId:identity.worldInstanceId,
 expectedRevision,ruleId,...extra});
const counts=db=>['vg_g4c_sessions_fixture_v1','vg_g4c_receipts_fixture_v1',
 'vg_g4c_ledger_fixture_v1','vg_g4d_authority_fixture_v1'].map(table=>
  db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);

async function plan(){
 const c=content();
 c.maps[0].placeIds.push('place-exit');
 c.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 c.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Exit',viewIds:['view-exit'],transitions:[{toSceneId:'scene-room',trigger:'return'}]});
 c.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 c.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'only narrative',requiredFlag:'door_open'}];
 c.playerEntryProfiles[0].initialFlags=['door_open'];
 const rules=[{ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
  condition:{op:'flag_set',flag:'door_open'},actions:[{op:'set_flag',flag:'visited'},
   {op:'enter_scene',sceneId:'scene-exit'}]}];
 const compiled=await prepareG4AEngine(c,{version:G4A_ENGINE_VERSION,
  contentVersion:c.contentVersion,contentHash:await hashAuthoringJson(c),rules});
 assert.equal(compiled.ok,true);
 return compiled.plan;
}

async function harness({onBeforeCommit}={}){
 const database=new DatabaseSync(':memory:'),compiled=await plan();
 const authority={eligible:true,snapshotHash,allowed:true,accessRevision:1,
  sourceVersion:'synthetic-v1',sourceHash,contentHash:compiled.contentHash,
  contentVersion:compiled.contentVersion};
 const releaseGate={evaluateApprovedWorld:async(request,{worldId})=>
  request===operatorRequest&&worldId===identity.worldId&&authority.eligible?
   {ok:true,eligible:true,worldId,snapshotHash:authority.snapshotHash,gateVersion:'world-release-1'}:
   {ok:false,code:'source-held'}};
 const admission=createAdmissionRehearsal({releaseGate});
 const released=await admission.prepareRelease(operatorRequest,{worldId:identity.worldId});
 assert.equal(released.ok,true);
 const started=await admission.simulateStart(operatorRequest,{candidateId:released.candidateId});
 assert.equal(started.ok,true);
 const binding={...identity,admissionSessionId:started.sessionId};
 const options={database,plan:compiled,admission,operatorRequest,onBeforeCommit,
  verifyPlayer:async request=>request?.testToken==='synthetic-player-token'?{playerId:'synthetic-player'}:
   request?.testToken==='intruder-token'?{playerId:'intruder'}:null,
  readTrustedAccess:async({playerId,worldId})=>({
   allowed:authority.allowed&&playerId==='synthetic-player'&&worldId===identity.worldId,
   revision:authority.accessRevision}),
  readApprovedPin:async({worldId,snapshotHash:hash})=>({worldId,snapshotHash:hash,
   contentVersion:authority.contentVersion,contentHash:authority.contentHash,
   sourceVersion:authority.sourceVersion,sourceHash:authority.sourceHash})};
 const engine=createG4DAuthorityFixture(options);
 const provision=()=>engine.provision({playerRequest,binding});
 const submit=(payload=event(),request=playerRequest)=>engine.submit({playerRequest:request,event:payload});
 return {database,compiled,authority,options,engine,binding,provision,submit};
}

test('G4D provisions only after G1Z operator recheck + separate player/content/access callbacks',async()=>{
 const h=await harness();
 assert.equal((await h.provision()).ok,true);
 assert.deepEqual(counts(h.database),[1,0,0,1]);
 const first=await h.submit();
 assert.equal(first.ok,true);assert.equal(first.authority,'synthetic-host-only');
 assert.equal(first.productionAuthorized,false);assert.equal(first.rewardCommitted,false);
 const retry=await h.submit();
 assert.equal(retry.duplicate,true);assert.deepEqual(retry.receipt,first.receipt);
 assert.deepEqual(counts(h.database),[1,1,1,1]);
 h.database.close();
});

test('G4D cannot use player JWT-like claims, author metadata or client event as issuer',async()=>{
 const h=await harness();
 assert.equal((await h.provision()).ok,true);
 assert.equal((await h.submit(event(),{testToken:'intruder-token',playerId:'synthetic-player',admin:true})).code,
  'player-access-denied');
 assert.equal((await h.submit(event(),{playerId:'synthetic-player',role:'publisher'})).code,
  'unauthenticated');
 assert.equal((await h.submit(event('event-one',0,'go-exit',{playerId:'intruder'}))).code,
  'session-mismatch');
 for(const payload of [{missionCompleted:true},{rewardGranted:true},{admin:true},
  {admissionSessionId:h.binding.admissionSessionId}])
  assert.equal((await h.submit(event('event-one',0,'go-exit',payload))).code,'invalid-event');
 assert.deepEqual(counts(h.database),[1,0,0,1]);
 h.database.close();
});

test('G4D fails closed if source/permit/approval recheck by G1Z becomes unavailable',async()=>{
 const h=await harness();assert.equal((await h.provision()).ok,true);
 h.authority.eligible=false;
 assert.equal((await h.submit()).code,'release-not-eligible');
 assert.deepEqual(counts(h.database),[1,0,0,1]);
 h.database.close();
});

test('G4D cannot silently reuse an old approval snapshot or changed world/source pin',async()=>{
 for(const [field,value,expected] of [
  ['snapshotHash','c'.repeat(64),'release-not-eligible'],
  ['contentHash','0'.repeat(64),'approved-pin-invalid'],
  ['contentVersion','9.9.9','approved-pin-invalid'],
  ['sourceVersion','synthetic-v2','admission-pin-changed'],
  ['sourceHash','0'.repeat(64),'admission-pin-changed']
 ]){
  const h=await harness();assert.equal((await h.provision()).ok,true);
  h.authority[field]=value;
  assert.equal((await h.submit()).code,expected,field);
  assert.deepEqual(counts(h.database),[1,0,0,1]);
  h.database.close();
 }
});

test('G4D denies absent, revoked or revised synthetic player entitlement before G4C',async()=>{
 for(const [field,value,expected] of [
  ['allowed',false,'player-access-denied'],['accessRevision',2,'admission-pin-changed']
 ]){
  const h=await harness();assert.equal((await h.provision()).ok,true);
  h.authority[field]=value;
  assert.equal((await h.submit()).code,expected);
  assert.deepEqual(counts(h.database),[1,0,0,1]);h.database.close();
 }
});

test('G4D same-SQLite fence catches revocation/source rotation after async G1Z check',async()=>{
 for(const action of [
  db=>db.prepare("UPDATE vg_g4d_authority_fixture_v1 SET status='blocked',fence_epoch=fence_epoch+1").run(),
  db=>db.prepare('UPDATE vg_g4d_authority_fixture_v1 SET access_revision=access_revision+1,fence_epoch=fence_epoch+1').run(),
  db=>db.prepare("UPDATE vg_g4d_authority_fixture_v1 SET source_hash=?,fence_epoch=fence_epoch+1").run('0'.repeat(64))
 ]){
  let db;
  const h=await harness({onBeforeCommit:()=>action(db)});db=h.database;
  assert.equal((await h.provision()).ok,true);
  assert.equal((await h.submit()).code,'authority-fence-denied');
  assert.deepEqual(counts(db),[1,0,0,1]);
  assert.equal(db.prepare('SELECT revision FROM vg_g4c_sessions_fixture_v1').get().revision,0);
  db.close();
 }
});

test('G4D independent requests still have G4C revision CAS and idempotent receipt',async()=>{
 const h=await harness();assert.equal((await h.provision()).ok,true);
 const [a,b]=await Promise.all([h.submit(event('first')),h.submit(event('second'))]);
 assert.equal([a,b].filter(x=>x.ok).length,1);
 assert.equal([a,b].filter(x=>x.code==='revision-conflict').length,1);
 const winner=a.ok?'first':'second';
 const receipt=(a.ok?a:b).receipt;
 const again=await h.submit(event(winner));
 assert.deepEqual(again.receipt,receipt);assert.equal(again.duplicate,true);
 assert.deepEqual(counts(h.database),[1,1,1,1]);
 h.database.close();
});

test('G4D fence and G4C session seed roll back together on duplicate/collision',async()=>{
 const h=await harness();assert.equal((await h.provision()).ok,true);
 assert.equal((await h.provision()).code,'fixture-exists-or-unavailable');
 assert.deepEqual(counts(h.database),[1,0,0,1]);
 const wrong=createG4DAuthorityFixture({...h.options,
  readApprovedPin:async()=>({worldId:identity.worldId,snapshotHash,
   contentVersion:'bad',contentHash:'0'.repeat(64),sourceVersion:'synthetic-v1',sourceHash})});
 assert.equal((await wrong.provision({playerRequest,binding:{...h.binding,worldInstanceId:'new-instance'}})).code,
  'approved-pin-invalid');
 assert.deepEqual(counts(h.database),[1,0,0,1]);
 h.database.close();
});

test('G4D stays isolated from Worker, Creator, Thiên Mệnh and production writers',()=>{
 const source=readFileSync(new URL('../src/vangioi-engine-g4d-authority-fixture.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 assert.equal(worker.includes('vangioi-engine-g4d-authority-fixture'),false);
 assert.equal(page.includes('vangioi-engine-g4d-authority-fixture'),false);
 for(const token of ['grantReward','wrangler deploy','firebase-admin','KV.put','worldAccess:true'])
  assert.equal(source.includes(token),false,token);
});
