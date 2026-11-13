import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION,prepareG4AEngine,startG4AEngine,applyG4ATransition}
 from '../src/vangioi-engine-g4a.mjs';

function world(){
 const c=content();
 c.maps[0].placeIds.push('place-exit');
 c.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 c.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'An exit',viewIds:['view-exit'],transitions:[]});
 c.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 c.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'author prose: not executable',requiredFlag:'door_open'}];
 c.playerEntryProfiles[0].initialFlags=['door_open'];
 return c;
}
async function ready(c=world()){
 return {world:c,manifest:{version:G4A_ENGINE_VERSION,contentVersion:c.contentVersion,
  contentHash:await hashAuthoringJson(c),rules:[{ruleId:'rule-exit',fromSceneId:'scene-room',
   transitionIndex:0,condition:{op:'all',conditions:[
    {op:'flag_set',flag:'door_open'},
    {op:'any',conditions:[{op:'flag_unset',flag:'guard_arrived'},{op:'flag_set',flag:'escort'}]}
   ]},actions:[{op:'set_flag',flag:'visited_exit'},
    {op:'enter_scene',sceneId:'scene-exit'}]}]}};
}

test('G4A compiles pinned declarative transition; produces immutable candidate state only',async()=>{
 const {world:c,manifest}=await ready(),before=structuredClone(c),beforeManifest=structuredClone(manifest);
 const compiled=await prepareG4AEngine(c,manifest);
 assert.equal(compiled.ok,true);
 assert.equal(Object.isFrozen(compiled.plan),true);
 const started=startG4AEngine(compiled.plan,'entry-local');
 assert.deepEqual(started,{ok:true,state:{sceneId:'scene-room',flags:['door_open']}});
 const result=applyG4ATransition(compiled.plan,started.state,'rule-exit');
 assert.deepEqual(result,{ok:true,state:{sceneId:'scene-exit',flags:['door_open','visited_exit']},
  appliedRuleId:'rule-exit',engineVerified:false,productionAuthorized:false});
 assert.deepEqual(started.state,{sceneId:'scene-room',flags:['door_open']});
 assert.deepEqual(c,before);assert.deepEqual(manifest,beforeManifest);
});

test('G4A missing gate flag fails even if other branches of the condition match',async()=>{
 const {world:c,manifest}=await ready();
 const p=(await prepareG4AEngine(c,manifest)).plan;
 const result=applyG4ATransition(p,{sceneId:'scene-room',flags:[]},'rule-exit');
 assert.deepEqual(result,{ok:false,code:'condition-not-met',path:'/'});
 assert.equal(applyG4ATransition(p,{sceneId:'scene-exit',flags:['door_open']},'rule-exit').code,'wrong-scene');
 assert.equal(applyG4ATransition(p,{sceneId:'scene-room',flags:['door_open']},'wrong').code,'unknown-rule');
});

test('G4A detects stale content, changed version and malformed world without reading prose',async()=>{
 const {world:c,manifest}=await ready();
 c.story.secretTruth='MUST_NOT_BE_IN_ERROR';
 const r=await prepareG4AEngine(c,manifest);
 assert.deepEqual(r,{ok:false,code:'stale-world',path:'/'});
 assert.ok(!JSON.stringify(r).includes('MUST_NOT_BE_IN_ERROR'));
 manifest.contentVersion='999';
 assert.equal((await prepareG4AEngine(c,manifest)).code,'invalid-manifest');
 assert.equal((await prepareG4AEngine({},manifest)).code,'invalid-world');
});

test('G4A rejects undeclared route, duplicate edge rule and target that is not the edge destination',async()=>{
 const {world:c,manifest}=await ready();
 manifest.rules[0].transitionIndex=1;
 assert.equal((await prepareG4AEngine(c,manifest)).code,'missing-edge');
 manifest.rules[0].transitionIndex=0;
 manifest.rules[0].actions.at(-1).sceneId='scene-room';
 assert.equal((await prepareG4AEngine(c,manifest)).code,'invalid-action');
 manifest.rules[0].actions.at(-1).sceneId='scene-exit';
 manifest.rules.push({...manifest.rules[0],ruleId:'rule-again'});
 assert.equal((await prepareG4AEngine(c,manifest)).code,'duplicate-edge-rule');
});

test('G4A has a strict condition/action allowlist, no eval, rewards, inventory or arbitrary JavaScript',async()=>{
 const {world:c,manifest}=await ready();
 const r=manifest.rules[0],base=structuredClone(r);
 for(const attack of [
  {op:'javascript',source:'true'},
  {op:'all',conditions:[]},
  {op:'flag_set',flag:'__proto__'},
  {op:'flag_set',flag:'ok',eval:'process.exit(1)'},
 ]){
  r.condition=attack;
  assert.equal((await prepareG4AEngine(c,manifest)).ok,false);
 }
 r.condition=base.condition;
 for(const action of [
  {op:'grant_exp',amount:999},
  {op:'give_item',itemId:'item-god',quantity:999},
  {op:'set_flag',flag:'x',amount:1},
  {op:'enter_scene',sceneId:'scene-room'},
 ]){
  r.actions=[action,{op:'enter_scene',sceneId:'scene-exit'}];
  assert.equal((await prepareG4AEngine(c,manifest)).ok,false);
 }
 r.actions=[{op:'set_flag',flag:'ok'}];
 assert.equal((await prepareG4AEngine(c,manifest)).code,'missing-enter-scene');
 r.actions=[{op:'set_flag',flag:'ok'},{op:'clear_flag',flag:'ok'},{op:'enter_scene',sceneId:'scene-exit'}];
 assert.equal((await prepareG4AEngine(c,manifest)).code,'invalid-action');
});

test('G4A refuses prototype keys, accessors, unknown manifest fields and condition budget overflow',async()=>{
 const {world:c,manifest}=await ready();
 const injected=JSON.parse(JSON.stringify(manifest));
 Object.defineProperty(injected,'constructor',{value:{role:'publisher'},enumerable:true});
 assert.equal((await prepareG4AEngine(c,injected)).code,'invalid-manifest');
 const withGetter=structuredClone(manifest);
 Object.defineProperty(withGetter.rules[0],'actions',{get(){throw Error('NEVER EVAL');},enumerable:true});
 assert.equal((await prepareG4AEngine(c,withGetter)).code,'invalid-manifest');
 const extra=structuredClone(manifest);extra.productionAuthorized=true;
 assert.equal((await prepareG4AEngine(c,extra)).code,'invalid-manifest');
 const nested=structuredClone(manifest);let expr={op:'flag_set',flag:'safe'};
 for(let i=0;i<10;i++)expr={op:'all',conditions:[expr]};
 nested.rules[0].condition=expr;
 assert.equal((await prepareG4AEngine(c,nested)).code,'condition-budget');
});

test('G4A state validation, flag budget, and clear/set action have deterministic no-write semantics',async()=>{
 const {world:c,manifest}=await ready();
 manifest.rules[0].actions=[{op:'clear_flag',flag:'door_open'},
  {op:'set_flag',flag:'passed'},{op:'enter_scene',sceneId:'scene-exit'}];
 const p=(await prepareG4AEngine(c,manifest)).plan;
 const a=applyG4ATransition(p,{sceneId:'scene-room',flags:['door_open']},'rule-exit');
 assert.deepEqual(a.state,{sceneId:'scene-exit',flags:['passed']});
 assert.equal(applyG4ATransition(p,{sceneId:'scene-room',flags:['door_open','door_open']},'rule-exit').code,'invalid-state');
 assert.equal(applyG4ATransition(p,{sceneId:'scene-room',flags:['__proto__']},'rule-exit').code,'invalid-state');
 assert.equal(startG4AEngine(p,'entry-unknown').code,'unknown-entry');
 assert.equal(startG4AEngine({engineVersion:G4A_ENGINE_VERSION},'entry-local').code,'invalid-plan');
 assert.equal(applyG4ATransition({engineVersion:G4A_ENGINE_VERSION},{},'rule-exit').code,'invalid-plan');
 assert.equal(applyG4ATransition(p,{sceneId:'scene-room',flags:Array.from({length:257},(_,i)=>'f'+i)},'rule-exit').code,'invalid-state');
});

test('G4A is not wired to a live Worker, Creator, saving or reward writers',()=>{
 const source=readFileSync(new URL('../src/vangioi-engine-g4a.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.ok(!worker.includes('vangioi-engine-g4a'));
 assert.ok(!source.includes('eval('));
 for(const writer of ['Firebase','firestore','KV.put','EXP +=','grantReward'])
  assert.ok(!source.includes(writer),'unexpected writer token '+writer);
});
