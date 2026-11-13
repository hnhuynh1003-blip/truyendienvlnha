import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION} from '../src/vangioi-engine-g4a.mjs';
import {G5A_CANDIDATE_VERSION} from '../src/vangioi-g5a-release-candidate.mjs';
import {G5C_ASSEMBLY_VERSION,assembleG5CStagingPackage}
 from '../src/vangioi-g5c-staging-assembly.mjs';

const WORLD='g5c-world',HASH='a'.repeat(64),copy=v=>structuredClone(v);
const codes=r=>r.blockers.map(x=>x.code);
const source={kind:'library',storyId:'epub-existing_story',storyVersion:'version-7',contentHash:HASH};
const arc=(arcId)=>({arcId,title:'Arc '+arcId,source:{...source},mode:'manual',
 startChapterId:'chapter-a',endChapterId:'chapter-z',opening:'',goal:'',ending:''});

async function fixture(world=content()){
 const payload={snapshotVersion:'vangioi-submission-1',worldId:WORLD,draftRevision:1,
  submittedBy:'author-fixture',submittedAt:1,validatorVersion:'world-content-1-semantic-2',content:world};
 const snapshot={...payload,snapshotHash:await hashAuthoringJson(payload)};
 const engineManifest={version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[]};
 const candidate={version:G5A_CANDIDATE_VERSION,worldId:WORLD,
  contentVersion:world.contentVersion,contentHash:engineManifest.contentHash,
  snapshotRevision:1,snapshotHash:snapshot.snapshotHash,source:{...world.storySource},
  assets:world.assets.map(({assetId,assetVersion,contentHash,kind})=>
   ({assetId,assetVersion,contentHash,kind})),
  entryIds:world.playerEntryProfiles.map(x=>x.entryId),arc:null,continuation:null,
  engine:{version:G4A_ENGINE_VERSION,manifestHash:await hashAuthoringJson(engineManifest)}};
 const assetObservations=world.assets.map(({assetId,assetVersion,contentHash})=>
  ({assetId,assetVersion,contentHash,width:1920,height:1080,format:'png'}));
 return {snapshot,candidate,engineManifest,assetObservations,parents:[],
  readReleaseGate:async({worldId})=>({ok:true,eligible:true,worldId,
   snapshotHash:snapshot.snapshotHash,gateVersion:'world-release-1'})};
}

async function withParents(){
 const x=await fixture(),base=content();base.contentVersion='0.9.0';
 base.endings=[{endingId:'ending-parent-failure',title:'A hard choice',result:'failure',requiredFlags:[]}];
 const p=await fixture(base);
 const parentPlan={schemaVersion:'arc-plan-1',arcs:[arc('arc-one')]};
 const currentPlan={schemaVersion:'arc-plan-1',arcs:[arc('arc-one'),arc('arc-two')]};
 p.candidate.arc={arcId:'arc-one',arcVersion:'version-1',planHash:await hashAuthoringJson(parentPlan),
  source:{...source},releaseOrder:1,storyTimeOrder:2};
 p.candidate.continuation={mode:'standalone_same_universe',prerequisites:[],
  carryForwardFactKeys:[],canonAnchors:[]};
 x.arcPlan=currentPlan;
 x.candidate.arc={arcId:'arc-two',arcVersion:'version-2',planHash:await hashAuthoringJson(currentPlan),
  source:{...source},releaseOrder:2,storyTimeOrder:1};
 x.candidate.continuation={mode:'direct_continuation',
  prerequisites:[{arcId:'arc-one',arcVersion:'version-1',contentHash:p.candidate.contentHash,
   acceptedEndingIds:['ending-parent-failure']}],carryForwardFactKeys:['npc-remembers-choice'],canonAnchors:[]};
 x.parents=[{snapshot:p.snapshot,candidate:p.candidate,arcPlan:parentPlan}];
 return x;
}

test('G5C assembles a deterministic scene/asset/entry index after fresh G5A review gate, without runtime privilege',async()=>{
 const x=await fixture(),before=copy(x.candidate);
 const r=await assembleG5CStagingPackage(x);
 assert.equal(r.version,G5C_ASSEMBLY_VERSION);
 assert.equal(r.assembled,true);assert.equal(r.blockers.length,0);
 assert.equal(r.packageIndex.entries[0].mode,'native_extra');
 assert.equal(r.packageIndex.scenes[0].backgroundAssetId,'art-room');
 assert.equal(r.packageIndex.assets.every(a=>a.fallbackTextAvailable&&a.syntheticObservationOnly),true);
 assert.equal(r.packageHash.length,64);
 for(const flag of ['readyForStaging','packagePublished','productionAuthorized',
  'publisherAuthorized','rightsVerified','deviceVerified','lineageVerified',
  'parentEndingVerified','missionCompleted','saveCommitted','rewardAuthorized','rewardCommitted'])
  assert.equal(r[flag],false,flag);
 assert.deepEqual(x.candidate,before);
 assert.equal((await assembleG5CStagingPackage(x)).packageHash,r.packageHash);
 assert.equal(JSON.stringify(r).includes('SECRET_TRUTH_SENTINEL'),false);
 assert.ok(Object.isFrozen(r.packageIndex.scenes));
});

test('G5C requires observations for all rendered assets, with no silent image fallback',async()=>{
 const x=await fixture();x.assetObservations.pop();
 const r=await assembleG5CStagingPackage(x);
 assert.ok(codes(r).includes('missing-required-asset-observations'));
 assert.equal(r.assembled,false);
 x.assetObservations[0].contentHash='f'.repeat(64);
 const invalid=await assembleG5CStagingPackage(x);
 assert.equal(invalid.assembled,false);
});

test('G5C refuses missing text fallback in an essential image instead of building an unusable scene',async()=>{
 const c=content();c.assets.find(a=>a.assetId==='art-room').altText='';
 const x=await fixture(c),r=await assembleG5CStagingPackage(x);
 assert.equal(r.assembled,false);
 assert.equal(r.readyForStaging,false);
});

test('G5C G3A rejects an entry whose required scene has no declared path',async()=>{
 const c=content();
 c.maps[0].placeIds.push('place-isolated');
 c.places.push({placeId:'place-isolated',mapId:'map-room',name:'Isolated',sceneIds:['scene-isolated']});
 c.scenes.push({sceneId:'scene-isolated',placeId:'place-isolated',
  backgroundAssetId:'art-room',summary:'Unreachable',viewIds:['view-isolated'],transitions:[]});
 c.views.push({viewId:'view-isolated',sceneId:'scene-isolated',kind:'wide',assetId:'art-room',hotspots:[]});
 c.missions[0].objectives[0].targetId='scene-isolated';
 const x=await fixture(c),r=await assembleG5CStagingPackage(x);
 assert.equal(r.assembled,false);
 assert.ok(codes(r).some(x=>x.startsWith('g3a-')));
});

test('G5C blocks stale content/source/asset/entry and unsupported schema, not just malformed manifest labels',async()=>{
 for(const change of [
  x=>x.candidate.contentHash='f'.repeat(64),
  x=>x.candidate.source.storyVersion='no-longer-valid',
  x=>x.candidate.assets[0].assetVersion='v9',
  x=>x.candidate.entryIds.pop(),
  x=>x.snapshot.content.schemaVersion='old-schema',
  x=>x.engineManifest.rules=[{ruleId:'bad',actions:[{op:'give_item',itemId:'item-x'}]}],
 ]){
  const x=await fixture();change(x);
  const r=await assembleG5CStagingPackage(x);
  assert.equal(r.assembled,false);
 }
});

test('G5C never accepts an author/AI self-asserted review, permission, publisher or reward flag',async()=>{
 const x=await fixture();
 for(const flag of ['ownerVerified','publisherApproved','reviewerApproved','admin',
  'missionCompleted','rewardAuthorized','published']){
  x.candidate[flag]=true;
  assert.ok(codes(await assembleG5CStagingPackage(x)).includes('invalid-candidate'));
  delete x.candidate[flag];
 }
 Object.defineProperty(x.candidate,'releaseToken',{enumerable:true,
  get(){throw Error('PRIVATE_NO_EXECUTION');}});
 const r=await assembleG5CStagingPackage(x);
 assert.equal(r.assembled,false);
 assert.equal(JSON.stringify(r).includes('PRIVATE_NO_EXECUTION'),false);
});

test('G5C G1Y missing, held, revoked or wrong snapshot cannot produce a staging package',async()=>{
 for(const deny of [{ok:false,code:'source-held'},{ok:false,code:'permit-revoked'},
  {ok:false,code:'asset-not-authorized'},
  {ok:true,eligible:true,worldId:WORLD,snapshotHash:'b'.repeat(64),gateVersion:'world-release-1'}]){
  const x=await fixture();x.readReleaseGate=async()=>deny;
  assert.equal((await assembleG5CStagingPackage(x)).assembled,false);
 }
 const x=await fixture();delete x.readReleaseGate;
 assert.equal((await assembleG5CStagingPackage(x)).assembled,false);
});

test('G5C multi-arc prequel keeps story time separate from publication time and checks parent ENDINGS on parent snapshot',async()=>{
 const x=await withParents(),r=await assembleG5CStagingPackage(x);
 assert.equal(r.assembled,true);
 assert.equal(r.packageIndex.arc.releaseOrder,2);
 assert.equal(r.packageIndex.arc.storyTimeOrder,1);
 assert.deepEqual(r.packageIndex.prerequisites[0].acceptedEndingIds,['ending-parent-failure']);
 assert.equal(r.parentEndingVerified,false);
 assert.equal(r.lineageVerified,false);
 assert.ok(r.warnings.some(x=>x.code==='parent-endings-exist-but-player-lineage-unverified'));
});

test('G5C missing parent snapshot or mismatched content/version/source pin blocks arc packaging',async()=>{
 for(const change of [
  x=>x.parents=[],
  x=>x.candidate.continuation.prerequisites[0].contentHash='b'.repeat(64),
  x=>x.candidate.continuation.prerequisites[0].arcVersion='unpublished-v9',
  x=>x.parents[0].candidate.contentHash='c'.repeat(64),
  x=>x.parents[0].candidate.arc.source.storyVersion='unknown',
  x=>x.parents[0].candidate.arc.releaseOrder=-1,
  x=>x.parents[0].arcPlan.arcs[0].source.storyVersion='unknown',
  x=>x.parents[0].snapshot.content.story.secretTruth='TAMPERED',
 ]){
  const x=await withParents();change(x);
  assert.equal((await assembleG5CStagingPackage(x)).assembled,false);
 }
});

test('G5C checks acceptedEndingIds in the correct historical parent, without requiring story victory',async()=>{
 const x=await withParents();x.candidate.continuation.prerequisites[0].acceptedEndingIds=['ending-room'];
 // ending-room is in the CURRENT world; only ending-parent-failure exists in parent.
 const r=await assembleG5CStagingPackage(x);
 assert.ok(codes(r).includes('parent-ending-not-in-snapshot'));
 assert.equal(r.assembled,false);
});

test('G5C rejects arc dependency cycles, duplicate nodes and orphaned parent data',async()=>{
 const cyc=await withParents();cyc.parents[0].candidate.continuation={mode:'direct_continuation',
  prerequisites:[{arcId:'arc-two',arcVersion:'version-2',contentHash:cyc.candidate.contentHash,
   acceptedEndingIds:['ending-room']}],carryForwardFactKeys:[],canonAnchors:[]};
 assert.ok(codes(await assembleG5CStagingPackage(cyc)).includes('arc-dependency-cycle'));
 const duplicate=await withParents();duplicate.parents.push(copy(duplicate.parents[0]));
 assert.equal((await assembleG5CStagingPackage(duplicate)).assembled,false);
 const orphan=await withParents();orphan.candidate.continuation={mode:'standalone_same_universe',
  prerequisites:[],carryForwardFactKeys:[],canonAnchors:[]};
 assert.equal((await assembleG5CStagingPackage(orphan)).assembled,false);
});

test('G5C a single-arc candidate cannot smuggle unneeded parent history or an unpinned arc plan',async()=>{
 const x=await fixture();x.parents=[{unexpected:true}];
 assert.equal((await assembleG5CStagingPackage(x)).assembled,false);
 const y=await withParents();y.candidate.arc.planHash='f'.repeat(64);
 assert.equal((await assembleG5CStagingPackage(y)).assembled,false);
});

test('G5C supports only declared entry profiles; no mandatory NPC/item/shop/survival template',async()=>{
 const x=await fixture(),r=await assembleG5CStagingPackage(x);
 assert.equal(r.assembled,true);
 assert.equal(r.packageIndex.entries.length,1);
 assert.equal(r.packageIndex.scenes.length,1);
 assert.equal('inventory' in r.packageIndex,false);
 assert.equal('npcAi' in r.packageIndex,false);
});

test('G5C holds detached snapshot/arc inputs if a fixture callback mutates the originals during async preflight',async()=>{
 const x=await withParents();
 const original=x.readReleaseGate;
 x.readReleaseGate=async args=>{
  x.snapshot.content.story.secretTruth='MUTATED_AFTER_HASH';
  x.arcPlan.arcs[0].source.storyVersion='MUTATED_AFTER_HASH';
  x.candidate.entryIds=[];
  x.parents[0].snapshot.content.endings=[];
  return original(args);
 };
 const r=await assembleG5CStagingPackage(x);
 assert.equal(r.assembled,true);
 assert.equal(r.packageIndex.entries.length,1);
 assert.equal(r.packageIndex.prerequisites[0].acceptedEndingIds[0],'ending-parent-failure');
 assert.equal(JSON.stringify(r).includes('MUTATED_AFTER_HASH'),false);
});

test('G5C cannot be imported into Worker, Creator, HTTP, and contains no production/staging writer',()=>{
 for(const f of ['../src/index.mjs','../../js/vangioi-creator.js',
  '../src/vangioi-authoring-http.mjs'])
  assert.equal(readFileSync(new URL(f,import.meta.url),'utf8').includes('vangioi-g5c-staging-assembly'),false);
 const source=readFileSync(new URL('../src/vangioi-g5c-staging-assembly.mjs',import.meta.url),'utf8');
 for(const bad of ['firebase-admin','transactionSync(','wrangler deploy','eval('])
  assert.equal(source.includes(bad),false);
});
