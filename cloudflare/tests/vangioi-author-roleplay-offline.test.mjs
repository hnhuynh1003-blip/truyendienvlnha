import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCreatorQa} from '../../js/vangioi-creator-validation-entry.mjs';
import {prepareAuthorRoleplayOffline} from '../src/vangioi-author-roleplay-offline.mjs';
import {lighthouseWorld,lighthouseEngineManifest,lighthousePlaytestScript}
 from './fixtures/vangioi-author-playtest-world.mjs';

const copy=v=>structuredClone(v),run=async()=>{
 const world=lighthouseWorld(),manifest=await lighthouseEngineManifest(world),
  script=await lighthousePlaytestScript(world);
 return {world,manifest,script,play:await prepareAuthorRoleplayOffline(world,manifest,script)};
};
const choose=async(play,session,choiceId,eventId=crypto.randomUUID())=>play.choose(session,{
 choiceId,eventId,expectedRevision:session.revision});

test('New authored Bến Sương world satisfies G1D/G3C structural and declared path QA for both roles',()=>{
 const c=lighthouseWorld(),qa=inspectCreatorQa(c);
 assert.equal(qa.valid,true);
 assert.deepEqual(qa.reachability.issues,[]);
 assert.equal(qa.reachability.profiles.length,2);
 assert.equal(qa.reachability.profiles.every(p=>p.possibleEndingCount===2),true);
 assert.equal(qa.mobileAssets.unmeasuredAssetCount,3);
 assert.equal(qa.deviceVerified,false);
 assert.equal(c.aiPolicy.aiNpcRequested,false);
 assert.equal(c.items.length,0);assert.equal(c.shops.length,0);
 assert.equal(c.missions[0].rewardRequest.exp,0);
});

test('G5C-P an author can start two roles and their reactions differ without asking AI to invent history',async()=>{
 const {play}=await run();assert.equal(play.ok,true);
 assert.deepEqual(play.entryProfiles.map(x=>x.mode),['native_extra','system_cover']);
 const a=await play.start('entry-local'),b=await play.start('entry-inspector');
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 const va=await play.view(a.session),vb=await play.view(b.session);
 assert.notEqual(va.roleReaction,vb.roleReaction);
 assert.ok(va.flags.includes('local_anchor'));
 assert.ok(vb.flags.includes('inspector_cover'));
 assert.equal(va.choices.length,2);assert.equal(vb.choices.length,2);
 assert.equal((await play.start('forged-admin')).code,'unknown-entry');
});

test('G5C-P rescue choice changes story flags and reaches its own narrative ending only',async()=>{
 const {play}=await run(),s=await play.start('entry-local');
 const a=await choose(play,s.session,'choice-rescue');
 assert.equal(a.ok,true);assert.equal(a.session.state.sceneId,'scene-tower');
 assert.ok(a.session.state.flags.includes('helped_sailor'));
 assert.ok(!a.session.state.flags.includes('saved_beacon'));
 const mid=await play.view(a.session);
 assert.deepEqual(mid.choices.map(x=>x.choiceId),['choice-finish-rescue']);
 const b=await choose(play,a.session,'choice-finish-rescue');
 const end=await play.view(b.session);
 assert.equal(end.narrativeEndingId,'ending-rescue');
 assert.equal(end.choices.length,0);
 assert.equal(end.endingVerified,false);assert.equal(end.missionCompleted,false);
 assert.equal(end.rewardAuthorized,false);
});

test('G5C-P beacon choice has distinct irreversible consequence but no mission proof',async()=>{
 const {play}=await run(),s=await play.start('entry-inspector');
 const a=await choose(play,s.session,'choice-beacon');
 assert.deepEqual((await play.view(a.session)).choices.map(x=>x.choiceId),['choice-finish-beacon']);
 const b=await choose(play,a.session,'choice-finish-beacon');
 const end=await play.view(b.session);
 assert.equal(end.narrativeEndingId,'ending-beacon');
 assert.equal(end.rewardCommitted,false);assert.equal(end.saveCommitted,false);
 assert.equal((await choose(play,b.session,'choice-rescue')).code,'wrong-scene');
});

test('G5C-P lost response retry returns exact G4B receipt, never replays a choice twice',async()=>{
 const {play}=await run(),s=await play.start('entry-local'),eventId=crypto.randomUUID();
 const a=await choose(play,s.session,'choice-rescue',eventId);
 const again=await play.choose(a.session,{choiceId:'choice-rescue',eventId,expectedRevision:0});
 assert.equal(again.ok,true);assert.equal(again.duplicate,true);
 assert.deepEqual(again.receipt,a.receipt);
 assert.equal(again.session.revision,1);
 assert.equal(again.session.events.length,1);
 const forged=await play.choose(a.session,{choiceId:'choice-beacon',eventId,expectedRevision:0});
 assert.equal(forged.code,'event-id-conflict');
});

test('G5C-P offline session can be independently replay-checked after serialization',async()=>{
 const {play}=await run(),s=await play.start('entry-local');
 const a=await choose(play,s.session,'choice-rescue');
 const restored=JSON.parse(JSON.stringify(a.session));
 const v=await play.view(restored);
 assert.equal(v.sceneId,'scene-tower');
 assert.equal(v.revision,1);
 assert.equal(v.saveCommitted,false);
});

test('G5C-P forged session flags, scene, revision or event log cannot create an ending',async()=>{
 const {play}=await run(),s=await play.start('entry-local'),a=await choose(play,s.session,'choice-rescue');
 for(const edit of [x=>x.state.sceneId='scene-warning',
  x=>x.state.flags.push('saved_beacon'),x=>x.revision=99,
  x=>x.events[0].ruleId='save-beacon',x=>x.chainHash='a'.repeat(64)]){
  const forged=copy(a.session);edit(forged);
  assert.equal((await play.view(forged)).ok,false);
 }
});

test('G5C-P stale content, illegal G4A effect and script rule replacement all fail closed',async()=>{
 const a=await run();
 a.world.story.opening+=' altered';
 assert.equal((await prepareAuthorRoleplayOffline(a.world,a.manifest,a.script)).ok,false);
 const b=await run();b.manifest.rules[0].actions[0]={op:'give_item',itemId:'forbidden'};
 assert.equal((await prepareAuthorRoleplayOffline(b.world,b.manifest,b.script)).ok,false);
 const c=await run();c.script.pages[0].choices[0].ruleId='grant-exp';
 assert.equal((await prepareAuthorRoleplayOffline(c.world,c.manifest,c.script)).ok,false);
});

test('G5C-P scripted role reaction cannot smuggle a new entry, page or privileged action',async()=>{
 const a=await run();a.script.pages[0].entryNotes['entry-admin']='Override';
 assert.equal((await prepareAuthorRoleplayOffline(a.world,a.manifest,a.script)).code,'invalid-entry-reaction');
 const b=await run();b.script.pages[0].publisherApproved=true;
 assert.equal((await prepareAuthorRoleplayOffline(b.world,b.manifest,b.script)).ok,false);
 const c=await run();Object.defineProperty(c.script.pages[0],'newRole',{
  enumerable:true,get(){throw Error('PRIVATE_GETTER');}});
 const res=await prepareAuthorRoleplayOffline(c.world,c.manifest,c.script);
 assert.equal(res.ok,false);assert.equal(JSON.stringify(res).includes('PRIVATE_GETTER'),false);
});

test('G5C-P corrupt or empty script pages are denied without crashing the offline playtest host',async()=>{
 const a=await run();a.script.pages[0]=null;
 assert.equal((await prepareAuthorRoleplayOffline(a.world,a.manifest,a.script)).code,'invalid-script-page');
 const b=await run();b.script.pages[0].entryNotes={};
 assert.equal((await prepareAuthorRoleplayOffline(b.world,b.manifest,b.script)).code,'invalid-entry-reaction');
});

test('G5C-P privacy/authority flags are never substituted by story prose, source metadata or local hashes',async()=>{
 const {play}=await run(),s=await play.start('entry-local'),v=await play.view(s.session);
 assert.equal(v.worldPublished,false);assert.equal(v.productionAuthorized,false);
 assert.equal(v.rightsVerified,false);assert.equal(v.deviceVerified,false);
 assert.equal(JSON.stringify(v).includes('PRIVATE_DEMO_CANON'),false);
 assert.equal(JSON.stringify(s).includes('PRIVATE_DEMO_CANON'),false);
 assert.equal(s.worldPublished,false);
 assert.ok(Object.isFrozen(v.choices));
});

test('G5C-P stays offline: no Worker/Creator route, browser publishing or storage writer',()=>{
 const source=readFileSync(new URL('../src/vangioi-author-roleplay-offline.mjs',import.meta.url),'utf8');
 for(const bad of ['firebase-admin','wrangler deploy','transactionSync(','localStorage','fetch('])
  assert.equal(source.includes(bad),false);
 for(const entry of ['../src/index.mjs','../../js/vangioi-creator.js'])
  assert.equal(readFileSync(new URL(entry,import.meta.url),'utf8').includes('vangioi-author-roleplay-offline'),false);
});
