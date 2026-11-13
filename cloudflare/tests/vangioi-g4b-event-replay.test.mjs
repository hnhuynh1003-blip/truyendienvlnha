import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION,prepareG4AEngine} from '../src/vangioi-engine-g4a.mjs';
import {G4B_SESSION_VERSION,G4B_EVENT_VERSION,createG4BSession,
 inspectG4BSession,applyG4BEvent} from '../src/vangioi-engine-g4b.mjs';

async function setup(){
 const c=content();
 c.maps[0].placeIds.push('place-exit');
 c.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 c.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'A second room',viewIds:['view-exit'],
  transitions:[{toSceneId:'scene-room',trigger:'return'}]});
 c.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 c.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'author prose',requiredFlag:'door_open'}];
 c.playerEntryProfiles[0].initialFlags=['door_open'];
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:c.contentVersion,
  contentHash:await hashAuthoringJson(c),rules:[
   {ruleId:'go-exit',fromSceneId:'scene-room',transitionIndex:0,
    condition:{op:'flag_set',flag:'door_open'},actions:[
     {op:'set_flag',flag:'exit_visited'},{op:'enter_scene',sceneId:'scene-exit'}]},
   {ruleId:'go-back',fromSceneId:'scene-exit',transitionIndex:0,
    condition:{op:'flag_set',flag:'exit_visited'},actions:[
     {op:'clear_flag',flag:'door_open'},{op:'enter_scene',sceneId:'scene-room'}]}
  ]};
 const compiled=await prepareG4AEngine(c,manifest);
 assert.equal(compiled.ok,true);
 return {world:c,manifest,plan:compiled.plan};
}
const ids={playerId:'player-synthetic',worldInstanceId:'instance-synthetic',entryId:'entry-local'};
const event=(id='event-one',expectedRevision=0,ruleId='go-exit',extra={})=>
 ({version:G4B_EVENT_VERSION,eventId:id,playerId:ids.playerId,
  worldInstanceId:ids.worldInstanceId,expectedRevision,ruleId,...extra});

test('G4B creates one pinned local session, then applies exactly one candidate transition',async()=>{
 const {plan}=await setup();
 const first=await createG4BSession(plan,ids);
 assert.equal(first.ok,true);assert.equal(first.session.version,G4B_SESSION_VERSION);
 assert.equal(first.session.revision,0);assert.equal(first.session.events.length,0);
 assert.equal(first.saveCommitted,false);assert.equal(first.rewardCommitted,false);
 const original=structuredClone(first.session),command=event();
 const done=await applyG4BEvent(plan,first.session,command);
 assert.equal(done.ok,true);assert.equal(done.duplicate,false);
 assert.equal(done.session.revision,1);
 assert.deepEqual(done.session.state,{sceneId:'scene-exit',flags:['door_open','exit_visited']});
 assert.equal(done.receipt.eventId,'event-one');
 assert.deepEqual(first.session,original);assert.deepEqual(command,event());
 assert.equal((await inspectG4BSession(plan,done.session)).ok,true);
});

test('G4B duplicate event id is a no-op and preserves original receipt/state',async()=>{
 const {plan}=await setup(),first=(await createG4BSession(plan,ids)).session;
 const one=await applyG4BEvent(plan,first,event());
 const duplicate=await applyG4BEvent(plan,one.session,event());
 assert.equal(duplicate.ok,true);assert.equal(duplicate.duplicate,true);
 assert.deepEqual(duplicate.session,one.session);
 assert.deepEqual(duplicate.receipt,one.receipt);
 assert.equal(one.session.events.length,1);
});

test('G4B same id/different payload conflicts before revision; new stale event rejected',async()=>{
 const {plan}=await setup(),first=(await createG4BSession(plan,ids)).session;
 const one=await applyG4BEvent(plan,first,event());
 assert.equal((await applyG4BEvent(plan,one.session,event('event-one',1))).code,'event-id-conflict');
 assert.equal((await applyG4BEvent(plan,one.session,event('event-one',0,'go-back'))).code,'event-id-conflict');
 assert.equal((await applyG4BEvent(plan,one.session,event('event-two',0,'go-back'))).code,'revision-conflict');
 assert.equal((await applyG4BEvent(plan,one.session,event('event-two',1,'wrong-rule'))).code,'unknown-rule');
});

test('G4B propagates G4A condition and scene denial without recording a failed event',async()=>{
 const {plan}=await setup(),first=(await createG4BSession(plan,ids)).session;
 const denied=await applyG4BEvent(plan,first,event('no-back',0,'go-back'));
 assert.equal(denied.code,'wrong-scene');
 assert.equal(first.revision,0);assert.deepEqual(first.events,[]);
 assert.equal((await inspectG4BSession(plan,first)).ok,true);
});

test('G4B makes no false cross-worker atomicity claim for two independent stale snapshots',async()=>{
 const {plan}=await setup(),first=(await createG4BSession(plan,ids)).session;
 const left=await applyG4BEvent(plan,first,event('left',0));
 const right=await applyG4BEvent(plan,first,event('right',0));
 assert.equal(left.ok,true);assert.equal(right.ok,true);
 assert.equal(left.session.revision,1);assert.equal(right.session.revision,1);
 assert.notEqual(left.session.chainHash,right.session.chainHash);
 assert.deepEqual(first.events,[]);
 // A trusted transaction/CAS adapter is required to select only one winner.
});

test('G4B applies two ordered events and can verify replay without mutable save',async()=>{
 const {plan}=await setup();
 const first=(await createG4BSession(plan,ids)).session;
 const one=(await applyG4BEvent(plan,first,event())).session;
 const two=await applyG4BEvent(plan,one,event('event-two',1,'go-back'));
 assert.equal(two.ok,true);assert.equal(two.session.revision,2);
 assert.deepEqual(two.session.state,{sceneId:'scene-room',flags:['exit_visited']});
 assert.equal(two.session.events.length,2);
 assert.equal((await inspectG4BSession(plan,two.session)).ok,true);
 // A retransmission of the first event remains idempotent after subsequent events.
 const duplicate=await applyG4BEvent(plan,two.session,event());
 assert.equal(duplicate.ok,true);assert.equal(duplicate.duplicate,true);
 assert.deepEqual(duplicate.session,two.session);
});

test('G4B rejects forged state, forged hash, changed rule and missing log records',async()=>{
 const {plan}=await setup();
 const first=(await createG4BSession(plan,ids)).session;
 const one=(await applyG4BEvent(plan,first,event())).session;
 const change=(f)=>{const x=structuredClone(one);f(x);return x;};
 for(const sample of [
  change(x=>x.state.flags.push('free_gold')),
  change(x=>x.state.sceneId='scene-room'),
  change(x=>x.chainHash='0'.repeat(64)),
  change(x=>x.events[0].chainHash='0'.repeat(64)),
  change(x=>x.events[0].requestHash='f'.repeat(64)),
  change(x=>x.events[0].ruleId='go-back'),
  change(x=>x.events=[]),
  change(x=>x.revision=2)
 ])assert.equal((await inspectG4BSession(plan,sample)).ok,false);
});

test('G4B refuses wrong player/instance, version or stale content hash',async()=>{
 const {world,manifest,plan}=await setup(),first=(await createG4BSession(plan,ids)).session;
 assert.equal((await applyG4BEvent(plan,first,event('one',0,'go-exit',{playerId:'attacker'}))).code,'session-mismatch');
 assert.equal((await applyG4BEvent(plan,first,event('one',0,'go-exit',{worldInstanceId:'other'}))).code,'session-mismatch');
 const bad=structuredClone(first);bad.contentVersion='unknown';
 assert.equal((await inspectG4BSession(plan,bad)).code,'invalid-session');
 const newWorld=structuredClone(world);newWorld.story.secretTruth='another edition';
 const stale=await prepareG4AEngine(newWorld,manifest);
 assert.equal(stale.code,'stale-world');
});

test('G4B invalid event, accessors, foreign keys and non-JSON input fail closed',async()=>{
 const {plan}=await setup(),s=(await createG4BSession(plan,ids)).session;
 for(const e of [
  {...event(),javascript:'alert(1)'},
  {...event(),expectedRevision:-1},
  {...event(),eventId:'__proto__'},
  {...event(),version:'g4b-transition-999'},
 ])assert.equal((await applyG4BEvent(plan,s,e)).code,'invalid-event');
 const malicious=structuredClone(s);
 Object.defineProperty(malicious,'state',{enumerable:true,get(){throw Error('should never execute getter');}});
 assert.equal((await inspectG4BSession(plan,malicious)).code,'invalid-session');
 const extra=structuredClone(s);extra.productionAuthorized=true;
 assert.equal((await inspectG4BSession(plan,extra)).code,'invalid-session');
});

test('G4B does not mark reward/save committed even when an event succeeds',async()=>{
 const {plan}=await setup(),s=(await createG4BSession(plan,ids)).session;
 const result=await applyG4BEvent(plan,s,event());
 for(const r of [result,await applyG4BEvent(plan,result.session,event()),
  await inspectG4BSession(plan,result.session)]){
  assert.equal(r.saveCommitted,false);assert.equal(r.rewardCommitted,false);
  assert.equal(r.productionAuthorized,false);
 }
});

test('G4B rejects oversized event log without truncating it and no rewards are ever inferred',async()=>{
 const {plan}=await setup(),s=(await createG4BSession(plan,ids)).session;
 const tooLong=structuredClone(s);
 tooLong.events=Array.from({length:1025},(_,i)=>({eventId:'event-'+i}));
 tooLong.revision=1025;
 assert.equal((await inspectG4BSession(plan,tooLong)).code,'invalid-session');
 assert.equal((await applyG4BEvent(plan,s,event('event-invalid',0,'unknown'))).code,'unknown-rule');
 assert.deepEqual(s.events,[]);
});

test('G4B stays disconnected from Worker routes, Creator, live saves and reward writers',()=>{
 const source=readFileSync(new URL('../src/vangioi-engine-g4b.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 assert.equal(worker.includes('vangioi-engine-g4b'),false);
 assert.equal(page.includes('vangioi-engine-g4b'),false);
 assert.equal(source.includes('eval('),false);
 for(const forbidden of ['firestore','Firebase','grantReward','KV.put','DuduAuth'])
  assert.equal(source.includes(forbidden),false,forbidden);
});
