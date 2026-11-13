import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION} from '../src/vangioi-engine-g4a.mjs';
import {G5A_CANDIDATE_VERSION,inspectG5AReleaseCandidate}
 from '../src/vangioi-g5a-release-candidate.mjs';

const WORLD='world-g5a-fixture',H='a'.repeat(64),OTHER='c'.repeat(64);
const copy=x=>structuredClone(x);
const codes=r=>r.blockers.map(x=>x.code);

async function setup(world=content()){
 const payload={snapshotVersion:'vangioi-submission-1',worldId:WORLD,draftRevision:1,
  submittedBy:'author-synthetic',submittedAt:1,validatorVersion:'world-content-1-semantic-2',
  content:world};
 const snapshot={...payload,snapshotHash:await hashAuthoringJson(payload)};
 const manifest={version:G4A_ENGINE_VERSION,contentVersion:world.contentVersion,
  contentHash:await hashAuthoringJson(world),rules:[]};
 const candidate={version:G5A_CANDIDATE_VERSION,worldId:WORLD,
  contentVersion:world.contentVersion,contentHash:manifest.contentHash,
  snapshotRevision:1,snapshotHash:snapshot.snapshotHash,
  source:{...world.storySource},
  assets:world.assets.map(({assetId,assetVersion,contentHash,kind})=>
   ({assetId,assetVersion,contentHash,kind})),
  entryIds:world.playerEntryProfiles.map(p=>p.entryId),arc:null,continuation:null,
  engine:{version:G4A_ENGINE_VERSION,manifestHash:await hashAuthoringJson(manifest)}};
 return {snapshot,candidate,engineManifest:manifest,readReleaseGate:async({worldId})=>({
  ok:true,eligible:true,worldId,snapshotHash:snapshot.snapshotHash,gateVersion:'world-release-1'})};
}

test('G5A composes G1B/G1L snapshot, G3C/G4A and G1Y fixture preflight without any release rights',async()=>{
 const input=await setup(),before=copy(input.candidate);
 const r=await inspectG5AReleaseCandidate(input);
 assert.equal(r.contractValid,true);
 assert.equal(r.syntheticPreflightPassed,true);
 assert.equal(r.fixtureGatePassed,true);
 assert.equal(r.candidateOnly,true);
 for(const k of ['published','productionAuthorized','rightsVerified','engineVerified',
  'deviceVerified','missionCompleted','saveCommitted','rewardAuthorized','rewardCommitted'])
  assert.equal(r[k],false,k);
 assert.deepEqual(input.candidate,before);
 assert.ok(Object.isFrozen(r.blockers));
 assert.ok(!JSON.stringify(r).includes('SECRET_TRUTH_SENTINEL'));
 assert.ok(r.warnings.some(x=>x.code==='physical-device-qa-required'));
});

test('G5A rejects revision/hash/content changes and forged snapshot approval',async()=>{
 for(const patch of [
  x=>x.candidate.snapshotRevision++,x=>x.candidate.snapshotHash=H,
  x=>x.candidate.contentVersion='new',x=>x.candidate.contentHash=OTHER,
  x=>x.snapshot.content.story.secretTruth='TAMPER',
  x=>x.snapshot.publisherApproved=true,
 ]){
  const x=await setup();patch(x);
  const r=await inspectG5AReleaseCandidate(x);
  assert.equal(r.contractValid,false);
  assert.equal(r.published,false);
 }
});

test('G5A fails closed on source/asset pin drift or missing entry profiles',async()=>{
 for(const patch of [
  x=>x.candidate.source.storyVersion='new',
  x=>x.candidate.assets[0].contentHash=OTHER,
  x=>x.candidate.assets.pop(),
  x=>x.candidate.entryIds=[],
  x=>x.candidate.entryIds=['entry-different'],
 ]){
  const x=await setup();patch(x);
  const r=await inspectG5AReleaseCandidate(x);
  assert.equal(r.contractValid,false);
 }
});

test('G5A never converts synthetic G1Y denials into authority',async()=>{
 for(const code of ['source-held','source-not-authorized','permit-revoked',
  'permit-untracked','asset-not-authorized','world-not-approved','approval-conflict']){
  const x=await setup();x.readReleaseGate=async()=>({ok:false,code});
  const r=await inspectG5AReleaseCandidate(x);
  assert.ok(codes(r).includes('g1y-'+code));
  assert.equal(r.syntheticPreflightPassed,false);
  assert.equal(r.productionAuthorized,false);
 }
 const x=await setup();x.readReleaseGate=async()=>({ok:true,eligible:true,
  worldId:WORLD,snapshotHash:OTHER,gateVersion:'world-release-1'});
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('g1y-blocked'));
});

test('G5A absent or failing G1Y host cannot fall back to an author claim',async()=>{
 const x=await setup();delete x.readReleaseGate;
 x.candidate.ownerVerified=true;
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('invalid-candidate'));
 delete x.candidate.ownerVerified;
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('g1y-reader-missing'));
 x.readReleaseGate=()=>{throw Error('PRIVATE_REGISTRY_SECRET');};
 const r=await inspectG5AReleaseCandidate(x);
 assert.ok(codes(r).includes('g1y-reader-unavailable'));
 assert.ok(!JSON.stringify(r).includes('PRIVATE_REGISTRY_SECRET'));
});

test('G5A refuses client-supplied publisher/reward flags and malicious object getters',async()=>{
 for(const key of ['publisherApproved','rewardAuthorized','ownerVerified','admin','role',
  'published','missionCompleted','canPublish']){
  const x=await setup();x.candidate[key]=true;
  assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('invalid-candidate'),key);
 }
 const x=await setup();Object.defineProperty(x.candidate,'publisherApproved',{
  enumerable:true,get(){throw Error('MUST_NOT_EXECUTE');}});
 const r=await inspectG5AReleaseCandidate(x);
 assert.ok(codes(r).includes('invalid-candidate'));
 assert.ok(!JSON.stringify(r).includes('MUST_NOT_EXECUTE'));
});

test('G5A prevents unpinned or privilege-bearing G4A manifests',async()=>{
 const x=await setup();x.engineManifest.rules=[{ruleId:'r',actions:[{op:'give_item',itemId:'item-god'}]}];
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('g4a-engine-pin-conflict'));
 x.candidate.engine.manifestHash=await hashAuthoringJson(x.engineManifest);
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).some(x=>x.startsWith('g4a-')));
 x.candidate.engine=null;
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('g4a-engine-plan-missing'));
});

test('G5A G3A blocks an unreachable main objective for every configured entry, without revealing story',async()=>{
 const c=content();
 c.maps[0].placeIds.push('place-unreachable');
 c.places.push({placeId:'place-unreachable',mapId:'map-room',name:'Closed room',sceneIds:['scene-unreachable']});
 c.scenes.push({sceneId:'scene-unreachable',placeId:'place-unreachable',backgroundAssetId:'art-room',
  summary:'Never reached',viewIds:['view-unreachable'],transitions:[]});
 c.views.push({viewId:'view-unreachable',sceneId:'scene-unreachable',kind:'wide',
  assetId:'art-room',hotspots:[]});
 c.missions[0].objectives[0].targetId='scene-unreachable';
 const x=await setup(c),r=await inspectG5AReleaseCandidate(x);
 assert.ok(codes(r).includes('g3a-main-objective-no-declared-source'));
 assert.equal(r.syntheticPreflightPassed,false);
});

async function withArcs(){
 const x=await setup(),source={kind:'library',storyId:'epub-existing_story',
  storyVersion:'version-7',contentHash:H};
 x.arcPlan={schemaVersion:'arc-plan-1',arcs:['arc-one','arc-two'].map((arcId,i)=>({
  arcId,title:'Arc '+i,source:{...source},mode:'manual',startChapterId:'chapter-a',
  endChapterId:'chapter-z',opening:'',goal:'',ending:''}))};
 x.candidate.arc={arcId:'arc-two',arcVersion:'version-2',
  planHash:await hashAuthoringJson(x.arcPlan),source:{...source},
  releaseOrder:2,storyTimeOrder:1};
 x.candidate.continuation={mode:'direct_continuation',
  prerequisites:[{arcId:'arc-one',arcVersion:'version-1',contentHash:OTHER,
   acceptedEndingIds:['ending-from-parent-snapshot']}],
  carryForwardFactKeys:['npc_helped'],canonAnchors:[]};
 return x;
}

test('G5A allows an author-pinned two-arc prequel order without treating release order as timeline',async()=>{
 const x=await withArcs(),r=await inspectG5AReleaseCandidate(x);
 assert.equal(r.contractValid,true);
 assert.equal(r.selectedArcId,'arc-two');
 assert.ok(r.warnings.some(x=>x.code==='parent-ending-and-lineage-unverified'));
 assert.equal(r.missionCompleted,false);
});

test('G5A rejects dangling, self-referential and duplicate arc prerequisites',async()=>{
 const patches=[
  x=>x.candidate.continuation.prerequisites[0].arcId='arc-unknown',
  x=>x.candidate.continuation.prerequisites[0].arcId='arc-two',
  x=>x.candidate.continuation.prerequisites.push(copy(x.candidate.continuation.prerequisites[0])),
  x=>x.candidate.continuation.prerequisites[0].acceptedEndingIds=[],
  x=>x.candidate.continuation.prerequisites=[],
  x=>x.candidate.arc.arcVersion='',
  x=>x.candidate.arc.planHash=OTHER,
 ];
 for(const patch of patches){const x=await withArcs();patch(x);
  assert.equal((await inspectG5AReleaseCandidate(x)).contractValid,false);
 }
});

test('G5A preserves separate direct, canon-bounded and independent spinoff declarations',async()=>{
 const x=await withArcs();
 x.candidate.continuation.mode='canon_bounded_continuation';
 x.candidate.continuation.canonAnchors=['canon-death-locked'];
 assert.equal((await inspectG5AReleaseCandidate(x)).contractValid,true);
 x.candidate.continuation.mode='direct_continuation';
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('canon-anchors-require-canon-bounded-mode'));
 x.candidate.continuation={mode:'standalone_same_universe',prerequisites:[],
  carryForwardFactKeys:[],canonAnchors:[]};
 assert.equal((await inspectG5AReleaseCandidate(x)).contractValid,true);
 x.candidate.continuation.carryForwardFactKeys.push('secret_production_xu');
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('standalone-must-not-inherit'));
});

test('G5A does not trust changed arc pin, fake history or a multi-arc plan without a selected arc',async()=>{
 const x=await withArcs();x.arcPlan.arcs[0].source.storyVersion='version-8';
 assert.ok(codes(await inspectG5AReleaseCandidate(x)).includes('arc-plan-pin-conflict'));
 const y=await setup();y.arcPlan=x.arcPlan;
 assert.ok(codes(await inspectG5AReleaseCandidate(y)).includes('arc-selection-required'));
});

test('G5A remains isolated from Worker, Firebase, Creator UI, reward, and persistent writers',()=>{
 const path=new URL('../src/vangioi-g5a-release-candidate.mjs',import.meta.url);
 const src=readFileSync(path,'utf8'),worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8'),
  creator=readFileSync(new URL('../../js/vangioi-creator.js',import.meta.url),'utf8');
 assert.ok(!worker.includes('vangioi-g5a-release-candidate'));
 assert.ok(!creator.includes('vangioi-g5a-release-candidate'));
 assert.ok(!src.includes('transactionSync('));
 assert.ok(!src.includes('eval('));
 assert.ok(!src.includes('firebase-admin'));
});
