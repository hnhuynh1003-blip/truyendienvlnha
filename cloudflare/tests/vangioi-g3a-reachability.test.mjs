import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {inspectContent} from '../src/vangioi-content.mjs';
import {analyzeG3AReachability,G3A_REACHABILITY_VERSION}
 from '../src/vangioi-reachability-g3a.mjs';

const codes=result=>result.issues.map(x=>x.code);
const route=()=>{
 const c=content();
 c.maps[0].placeIds.push('place-exit');
 c.places.push({placeId:'place-exit',mapId:'map-room',name:'Exit',sceneIds:['scene-exit']});
 c.scenes.push({sceneId:'scene-exit',placeId:'place-exit',backgroundAssetId:'art-room',
  summary:'Another room',viewIds:['view-exit'],transitions:[]});
 c.views.push({viewId:'view-exit',sceneId:'scene-exit',kind:'wide',assetId:'art-room',hotspots:[]});
 c.missions[0].objectives[0].targetId='scene-exit';
 c.playRequirements.requiredVisitPlaceIds=['place-exit'];
 return c;
};
const edge=(c,requiredFlag)=>{
 c.scenes[0].transitions=[{toSceneId:'scene-exit',trigger:'an-opaque-event',
  ...(requiredFlag?{requiredFlag}:{})}];
};

test('G3A a one-room, one-profile world stays valid without NPC/item quotas',()=>{
 const c=content(),before=structuredClone(c);
 const r=analyzeG3AReachability(c);
 assert.equal(r.analyzerVersion,G3A_REACHABILITY_VERSION);
 assert.equal(r.inputValid,true);
 assert.equal(r.status,'needs-engine-review');
 assert.equal(r.canPublish,false);
 assert.equal(r.engineVerified,false);
 assert.equal(r.profiles.length,1);
 assert.equal(r.profiles[0].possibleSceneCount,1);
 assert.equal(r.profiles[0].possibleEndingCount,1);
 assert.deepEqual(r.issues,[]);
 assert.deepEqual(c,before);
});

test('G3A disconnected main target and required place are reported per entry',()=>{
 const c=route();assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].unreachableSceneCount,1);
 assert.ok(codes(r).includes('profile-scene-no-declared-route'));
 assert.ok(codes(r).includes('main-objective-no-declared-source'));
 assert.ok(codes(r).includes('required-place-no-declared-route'));
 assert.ok(r.issues.every(x=>x.entryPath==='/playerEntryProfiles/0'));
});

test('G3A opaque transitions are MAYBE reachable, never verified gameplay',()=>{
 const c=route();edge(c);
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].possibleSceneCount,2);
 assert.equal(r.profiles[0].unreachableSceneCount,0);
 assert.equal(r.status,'needs-engine-review');
 assert.equal(r.engineVerified,false);
 assert.equal(r.canPublish,false);
});

test('G3A missing declared flag source blocks the optimistic transition and ending',()=>{
 const c=route();edge(c,'flag-no-declared-writer');
 c.endings[0].requiredFlags=['flag-no-declared-writer'];
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].possibleSceneCount,1);
 assert.equal(r.profiles[0].possibleEndingCount,0);
 assert.ok(codes(r).includes('transition-flag-not-producible'));
 assert.ok(codes(r).includes('ending-flags-no-declared-source'));
});

test('G3A possible event flag unlocks MAYBE scene without claiming trigger executed',()=>{
 const c=route();edge(c,'flag-from-event');
 c.endings[0].requiredFlags=['flag-from-event'];
 c.events=[{eventId:'event-maybe',trigger:'arbitrary-hidden-condition',
  requiredFlags:[],setFlags:['flag-from-event']}];
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].possibleSceneCount,2);
 assert.equal(r.profiles[0].possibleEndingCount,1);
 assert.equal(r.engineVerified,false);
 assert.equal(r.status,'needs-engine-review');
});

test('G3A NPC dialogue may grant a flag only when its intro scene is maybe reachable',()=>{
 const c=route();edge(c,'flag-npc-door');
 c.npcs=[{npcId:'npc-guide',name:'Guide',mode:'scripted',
  interactionLevels:['scripted'],dialoguePolicy:'choice_tree',friendable:false,
  introSceneId:'scene-room',role:'Guide',knowledge:[],
  dialogueNodes:[{nodeId:'dialogue-guide',text:'Hello',
   choices:[{label:'Agree',setFlag:'flag-npc-door'}]}]}];
 assert.equal(inspectContent(c).valid,true);
 assert.equal(analyzeG3AReachability(c).profiles[0].possibleSceneCount,2);
 c.npcs[0].introSceneId='scene-exit';
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].possibleSceneCount,1);
 assert.ok(codes(r).includes('transition-flag-not-producible'));
});

test('G3A cyclic unknown flag producers cannot be assumed available',()=>{
 const c=route();edge(c,'flag-a');
 c.events=[
  {eventId:'event-a',trigger:'opaque-a',requiredFlags:['flag-b'],setFlags:['flag-a']},
  {eventId:'event-b',trigger:'opaque-b',requiredFlags:['flag-a'],setFlags:['flag-b']}
 ];
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].unreachableSceneCount,1);
 assert.ok(codes(r).includes('transition-flag-not-producible'));
});

test('G3A independently inspects supported profiles without forcing three modes',()=>{
 const c=route();edge(c,'flag-private');
 c.playerEntryProfiles.push({entryId:'entry-cover',label:'Visitor',mode:'system_cover',
  coverName:'Visitor',identityAssurance:'verified',startSceneId:'scene-exit',
  initialKnownFacts:[],initialFlags:[]});
 c.entryPolicy={mode:'player_choice',authorNote:'Either background'};
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles.length,2);
 assert.equal(r.profiles[0].possibleSceneCount,1);
 assert.equal(r.profiles[1].possibleSceneCount,1);
 assert.ok(r.issues.some(x=>x.entryPath==='/playerEntryProfiles/1'&&
  x.code==='main-mission-start-no-route'));
 assert.ok(r.issues.some(x=>x.entryPath==='/playerEntryProfiles/0'&&
  x.code==='transition-flag-not-producible'));
});

test('G3A movement hotspot is a possible route, not an automatic flag grant',()=>{
 const c=route();
 c.views[0].hotspots=[{hotspotId:'hotspot-door',presentation:'text',
  label:'Open door',action:'move',targetId:'scene-exit'}];
 const r=analyzeG3AReachability(c);
 assert.equal(r.profiles[0].possibleSceneCount,2);
 assert.equal(r.profiles[0].possibleEndingCount,1);
 assert.equal(r.engineVerified,false);
});

test('G3A known starting item is not a proof of a purchasable shop offer',()=>{
 const c=content();
 c.items=[{itemId:'item-start',name:'Starter',category:'quest',
  transferPolicy:'world_only',stackLimit:1,acquisitionMethods:[{type:'starting'}]}];
 c.missions[0].objectives=[{objectiveId:'objective-buy',verb:'purchase',
  targetId:'item-start',requiredCount:1}];
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3AReachability(c);
 assert.ok(codes(r).includes('main-objective-no-declared-source'));
});

test('G3A inspect hotspot can provide a local declared source without item pickup',()=>{
 const c=content();
 c.items=[{itemId:'item-note',name:'A note',category:'quest',
  transferPolicy:'world_only',stackLimit:1,acquisitionMethods:[]}];
 c.missions[0].objectives=[{objectiveId:'objective-note',verb:'inspect',
  targetId:'item-note',requiredCount:1}];
 c.views[0].hotspots=[{hotspotId:'hotspot-note',presentation:'text',
  label:'Read a note',action:'inspect',targetId:'item-note'}];
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3AReachability(c);
 assert.equal(codes(r).includes('main-objective-no-declared-source'),false);
});

test('G3A malformed drafts never run reachability or leak private prose',()=>{
 const c=content();c.story.secretTruth={private:'LEAK_THIS_STORY_SECRET'};
 const r=analyzeG3AReachability(c);
 assert.equal(r.inputValid,false);
 assert.equal(r.status,'invalid-content');
 assert.deepEqual(r.profiles,[]);
 assert.ok(!JSON.stringify(r).includes('LEAK_THIS_STORY_SECRET'));
});

test('G3A is independent of production routes and synthetic output cannot publish',()=>{
 const source=readFileSync(new URL('../src/vangioi-reachability-g3a.mjs',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.ok(!worker.includes('vangioi-reachability-g3a'));
 assert.ok(!source.includes('eval('));
 assert.ok(!source.includes('new Function('));
 assert.ok(!source.includes('firestore.collection('));
 assert.ok(source.includes('canPublish:false'));
 assert.ok(source.includes('engineVerified:false'));
});
