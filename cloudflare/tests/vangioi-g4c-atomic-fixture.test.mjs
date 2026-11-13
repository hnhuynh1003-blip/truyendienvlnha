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
import {createG4CFixtureStore} from '../src/vangioi-engine-g4c-fixture.mjs';

const identities={playerId:'synthetic-player',worldInstanceId:'synthetic-instance',entryId:'entry-local'};
const sourcePin={sourceVersion:'synthetic-source-v1',sourceHash:'f'.repeat(64),
 accessState:'allowed',licenseState:'active',sourceState:'current'};
const command=(eventId='event-one',expectedRevision=0,ruleId='go-exit',extra={})=>({
 version:G4B_EVENT_VERSION,eventId,playerId:identities.playerId,
 worldInstanceId:identities.worldInstanceId,expectedRevision,ruleId,...extra});
const rowCount=(db,table)=>db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

async function compiled(){
 const c=content();
 c.maps[0].placeIds.push('place-exit');
 c.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 c.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Returnable room',viewIds:['view-exit'],transitions:[{toSceneId:'scene-room',trigger:'return'}]});
 c.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 c.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'prose is not executable',requiredFlag:'door_open'}];
 c.playerEntryProfiles[0].initialFlags=['door_open'];
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:c.contentVersion,
  contentHash:await hashAuthoringJson(c),rules:[
   {ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
    condition:{op:'flag_set',flag:'door_open'},actions:[{op:'set_flag',flag:'visited'},
     {op:'enter_scene',sceneId:'scene-exit'}]},
   {ruleId:'go-back',fromSceneId:'scene-exit',transitionIndex:0,
    condition:{op:'flag_set',flag:'visited'},actions:[{op:'clear_flag',flag:'door_open'},
     {op:'enter_scene',sceneId:'scene-room'}]}
  ]};
 const result=await prepareG4AEngine(c,manifest);
 assert.equal(result.ok,true);
 return result.plan;
}

async function harness({onCommitStep,db=new DatabaseSync(':memory:'),plan}={}){
 const pinned=plan||await compiled();
 const store=createG4CFixtureStore({database:db,plan:pinned,onCommitStep});
 assert.equal((await store.seed({...identities,...sourcePin})).ok,true);
 return {db,plan:pinned,store};
}
const submit=(store,event=command(),actorId=identities.playerId)=>store.submit({actorId,event});
const counts=db=>[rowCount(db,'vg_g4c_receipts_fixture_v1'),rowCount(db,'vg_g4c_ledger_fixture_v1')];

test('G4C simultaneous candidates on the same revision: exactly one CAS winner',async()=>{
 const {db,store}=await harness();
 const [a,b]=await Promise.all([submit(store,command('left')),submit(store,command('right'))]);
 assert.equal([a,b].filter(x=>x.ok).length,1);
 assert.equal([a,b].filter(x=>x.code==='revision-conflict').length,1);
 assert.equal(store.inspect(identities.worldInstanceId).session.revision,1);
 assert.deepEqual(counts(db),[1,1]);
 assert.equal(a.saveCommitted??b.saveCommitted,false);
 db.close();
});

test('G4C independent SQLite handles cannot commit competing stale candidates',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'dudu-g4c-race-'));
 const file=join(directory,'shared.sqlite');
 let a,b;
 try{
  const plan=await compiled();
  a=new DatabaseSync(file);b=new DatabaseSync(file);
  const left=createG4CFixtureStore({database:a,plan});
  const right=createG4CFixtureStore({database:b,plan});
  assert.equal((await left.seed({...identities,...sourcePin})).ok,true);
  const [first,second]=await Promise.all([submit(left,command('left')),submit(right,command('right'))]);
  assert.equal([first,second].filter(x=>x.ok).length,1);
  assert.equal([first,second].filter(x=>x.code==='revision-conflict').length,1);
  assert.deepEqual(counts(a),[1,1]);assert.deepEqual(counts(b),[1,1]);
  assert.equal(left.inspect(identities.worldInstanceId).session.revision,1);
 }finally{a?.close();b?.close();rmSync(directory,{recursive:true,force:true});}
});

test('G4C receipt is byte-equivalent after repeated retry, with one immutable audit ledger row',async()=>{
 const {db,store}=await harness();
 const first=await submit(store),again=await submit(store),third=await submit(store);
 assert.equal(first.ok,true);assert.equal(first.fixtureCommitted,true);
 assert.equal(first.duplicate,false);assert.equal(again.duplicate,true);
 assert.deepEqual(first.receipt,again.receipt);assert.deepEqual(again.receipt,third.receipt);
 assert.deepEqual(counts(db),[1,1]);
 assert.equal(store.inspect(identities.worldInstanceId).session.revision,1);
 assert.equal((await submit(store,command('event-one',0,'go-back'))).code,'event-id-conflict');
 assert.equal((await submit(store,command('event-one',1))).code,'event-id-conflict');
 assert.equal((await submit(store,command('another',0))).code,'revision-conflict');
 assert.deepEqual(counts(db),[1,1]);
 assert.throws(()=>db.prepare(`UPDATE vg_g4c_receipts_fixture_v1 SET request_hash='x'`).run());
 assert.throws(()=>db.prepare(`DELETE FROM vg_g4c_ledger_fixture_v1`).run());
 db.close();
});

test('G4C crash/lost response then reopen a separate SQLite connection returns old receipt',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'dudu-g4c-'));
 const file=join(directory,'fixture.sqlite');
 let a,b;
 try{
  const plan=await compiled();
  a=new DatabaseSync(file);
  const firstStore=createG4CFixtureStore({database:a,plan});
  assert.equal((await firstStore.seed({...identities,...sourcePin})).ok,true);
  const lostResponse=await submit(firstStore); // Commit occurred; simulated transport discarded the reply.
  assert.equal(lostResponse.ok,true);
  a.close();a=null;
  b=new DatabaseSync(file);
  const secondStore=createG4CFixtureStore({database:b,plan});
  const retry=await submit(secondStore);
  assert.equal(retry.duplicate,true);
  assert.deepEqual(retry.receipt,lostResponse.receipt);
  assert.deepEqual(counts(b),[1,1]);
  const next=await submit(secondStore,command('event-two',1,'go-back'));
  assert.equal(next.ok,true);
  assert.equal(secondStore.inspect(identities.worldInstanceId).session.revision,2);
 }finally{a?.close();b?.close();rmSync(directory,{recursive:true,force:true});}
});

test('G4C fault at every intermediate write rolls back state, receipt and ledger together',async()=>{
 for(const step of ['after-state','after-receipt','after-ledger']){
  const db=new DatabaseSync(':memory:');
  const plan=await compiled();
  const failing=createG4CFixtureStore({database:db,plan,onCommitStep:where=>{
   if(where===step)throw Error('synthetic crash');
  }});
  assert.equal((await failing.seed({...identities,...sourcePin})).ok,true);
  assert.equal((await submit(failing)).code,'fixture-transaction-failed');
  assert.equal(failing.inspect(identities.worldInstanceId).session.revision,0);
  assert.deepEqual(counts(db),[0,0]);
  const recovered=createG4CFixtureStore({database:db,plan});
  assert.equal((await submit(recovered)).ok,true);
  assert.deepEqual(counts(db),[1,1]);
  db.close();
 }
});

test('G4C pins host actor, player, instance, content version/hash and rejects extras',async()=>{
 const {db,store,plan}=await harness();
 assert.equal((await submit(store,command(),'attacker')).code,'fixture-gate-denied');
 assert.equal((await submit(store,command('event-one',0,'go-exit',{playerId:'attacker'}))).code,'session-mismatch');
 assert.equal((await submit(store,command('event-one',0,'go-exit',{worldInstanceId:'attacker'}))).code,'fixture-gate-denied');
 for(const field of [{rewardGranted:true},{missionCompleted:true},{exp:999},{publisher:true},{role:'admin'}])
  assert.equal((await submit(store,command('event-one',0,'go-exit',field))).code,'invalid-event');
 assert.deepEqual(counts(db),[0,0]);
 const stale={...plan,contentHash:'0'.repeat(64)};
 const other=createG4CFixtureStore({database:db,plan:stale});
 assert.equal((await submit(other)).code,'fixture-gate-denied');
 assert.equal((await submit(store)).ok,true);
 for(const row of store.inspect(identities.worldInstanceId).ledger){
  assert.equal(row.kind,'scene_transition_only');assert.equal(row.reward_authorized,0);
 }
 db.close();
});

test('G4C simulated permit/rights/source freshness gates must remain valid at commit',async()=>{
 const {db,store}=await harness();
 for(const [column,value] of [
  ['access_state','denied'],['license_state','held'],['license_state','revoked'],
  ['source_state','stale'],['source_version','rotated-v2'],['source_hash','0'.repeat(64)],
  ['content_hash','0'.repeat(64)]
 ]){
  const original=db.prepare(`SELECT ${column} AS v FROM vg_g4c_gates_fixture_v1`).get().v;
  db.prepare(`UPDATE vg_g4c_gates_fixture_v1 SET ${column}=?`).run(value);
  assert.equal((await submit(store)).code,'fixture-gate-denied',column);
  db.prepare(`UPDATE vg_g4c_gates_fixture_v1 SET ${column}=?`).run(original);
 }
 assert.deepEqual(counts(db),[0,0]);
 const first=await submit(store);assert.equal(first.ok,true);
 db.prepare(`UPDATE vg_g4c_gates_fixture_v1 SET license_state='revoked'`).run();
 assert.equal((await submit(store)).code,'fixture-gate-denied');
 assert.deepEqual(counts(db),[1,1]);
 db.close();
});

test('G4C rechecks permit/source gates after asynchronous preparation, inside the CAS transaction',async()=>{
 for(const [column,value] of [['license_state','revoked'],['source_state','stale'],
  ['access_state','denied'],['source_hash','0'.repeat(64)]]){
  const db=new DatabaseSync(':memory:');
  const plan=await compiled();
  const initial=createG4CFixtureStore({database:db,plan});
  assert.equal((await initial.seed({...identities,...sourcePin})).ok,true);
  const racing=createG4CFixtureStore({database:db,plan,onBeforeCommit:()=>{
   db.prepare(`UPDATE vg_g4c_gates_fixture_v1 SET ${column}=?`).run(value);
  }});
  assert.equal((await submit(racing)).code,'fixture-gate-denied',column);
  assert.equal(initial.inspect(identities.worldInstanceId).session.revision,0);
  assert.deepEqual(counts(db),[0,0]);
  db.close();
 }
});

test('G4C does not trust edited session rows or leak live integrations',async()=>{
 const {db,store}=await harness();
 db.prepare(`UPDATE vg_g4c_sessions_fixture_v1 SET session_json=?`).run(JSON.stringify({
  version:'fake',revision:0,rewardGranted:true
 }));
 assert.equal((await submit(store)).code,'fixture-corrupt');
 assert.deepEqual(counts(db),[0,0]);
 db.close();
 const source=readFileSync(new URL('../src/vangioi-engine-g4c-fixture.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 assert.ok(!worker.includes('vangioi-engine-g4c-fixture'));
 assert.ok(!page.includes('vangioi-engine-g4c-fixture'));
 for(const token of ['grantReward','firebase-admin','wrangler deploy','KV.put','worldAccess:true'])
  assert.ok(!source.includes(token),token);
});
