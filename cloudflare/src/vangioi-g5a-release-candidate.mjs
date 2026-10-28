// G5A: strictly offline release-candidate sidecar inspection. Its readers are
// synthetic test-host callbacks, NOT server identity or publishing authority.
// Do not import into a live Worker, Creator, Functions, or reward path.
import {copyAuthoringJson,hashAuthoringJson,verifySubmissionIntegrity}
 from './vangioi-authoring.mjs';
import {inspectCreatorQa} from '../../js/vangioi-creator-validation-entry.mjs';
import {prepareG4AEngine,G4A_ENGINE_VERSION} from './vangioi-engine-g4a.mjs';
import G1NArcPlan from '../../js/vangioi-arc-plan.js';

export const G5A_CANDIDATE_VERSION='g5a-release-candidate-1';
const modes=new Set(['direct_continuation','canon_bounded_continuation','standalone_same_universe']);
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const name=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(v);
const nonempty=(v,max=120)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const unique=(v,check,max=256)=>Array.isArray(v)&&v.length<=max&&v.every(check)&&
 new Set(v).size===v.length;
const pin=(a,b)=>a&&b&&a.kind===b.kind&&a.storyId===b.storyId&&
 a.storyVersion===b.storyVersion&&a.contentHash===b.contentHash;
const assetPin=(a,b)=>a&&b&&a.assetId===b.assetId&&a.assetVersion===b.assetVersion&&
 a.contentHash===b.contentHash&&a.kind===b.kind;
const inspectArcPlan=G1NArcPlan.inspect;
const sourceShape=s=>exact(s,['kind','storyId','storyVersion','contentHash'])&&
 ['library','original','manuscript'].includes(s.kind)&&nonempty(s.storyId,160)&&
 nonempty(s.storyVersion,100)&&hash(s.contentHash);
const assetShape=a=>exact(a,['assetId','assetVersion','kind','contentHash'])&&id(a.assetId)&&
 nonempty(a.assetVersion,100)&&nonempty(a.kind,80)&&hash(a.contentHash);
const denied=(code,path='/')=>({code,path});
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const OUTCOME_FLAGS=Object.freeze({candidateOnly:true,productionAuthorized:false,
 published:false,saveCommitted:false,missionCompleted:false,
 rewardAuthorized:false,rewardCommitted:false,rightsVerified:false,
 engineVerified:false,deviceVerified:false,lineageVerified:false,
 parentEndingVerified:false});

function inspectShape(candidate){
 const issues=[],add=(code,path)=>issues.push(denied(code,path));
 if(!exact(candidate,['version','worldId','contentVersion','contentHash','snapshotRevision',
  'snapshotHash','source','assets','entryIds','arc','continuation','engine'])||
  candidate.version!==G5A_CANDIDATE_VERSION||!id(candidate.worldId)||
  !nonempty(candidate.contentVersion,100)||!hash(candidate.contentHash)||
  !Number.isSafeInteger(candidate.snapshotRevision)||candidate.snapshotRevision<1||
  !hash(candidate.snapshotHash)||!sourceShape(candidate.source)||
  !Array.isArray(candidate.assets)||candidate.assets.length>1600||
  !candidate.assets.every(assetShape)||
  !unique(candidate.assets.map(a=>a.assetId),id,1600)||
  !unique(candidate.entryIds,id,200)||candidate.entryIds.length===0)
  return [denied('invalid-candidate')];
 if(candidate.arc!==null&&(!exact(candidate.arc,['arcId','arcVersion','planHash','source',
  'releaseOrder','storyTimeOrder'])||!id(candidate.arc.arcId)||
  !nonempty(candidate.arc.arcVersion,100)||!hash(candidate.arc.planHash)||
  !sourceShape(candidate.arc.source)||
  !Number.isSafeInteger(candidate.arc.releaseOrder)||candidate.arc.releaseOrder<1||
  !Number.isSafeInteger(candidate.arc.storyTimeOrder)))add('invalid-arc-pin','/arc');
 if(candidate.engine!==null&&(!exact(candidate.engine,['version','manifestHash'])||
  candidate.engine.version!==G4A_ENGINE_VERSION||!hash(candidate.engine.manifestHash)))
  add('invalid-engine-pin','/engine');
 const c=candidate.continuation;
 if(candidate.arc===null){if(c!==null)add('continuation-requires-arc','/continuation');}
 else if(!exact(c,['mode','prerequisites','carryForwardFactKeys','canonAnchors'])||
  !modes.has(c.mode)||!Array.isArray(c.prerequisites)||c.prerequisites.length>16||
  !unique(c.carryForwardFactKeys,name,128)||!unique(c.canonAnchors,id,128))
  add('invalid-continuation','/continuation');
 else{
  const seen=new Set();
  for(const [i,p] of c.prerequisites.entries()){
   if(!exact(p,['arcId','arcVersion','contentHash','acceptedEndingIds'])||
    !id(p.arcId)||!nonempty(p.arcVersion,100)||!hash(p.contentHash)||
    !unique(p.acceptedEndingIds,id,128)||p.acceptedEndingIds.length===0||
    seen.has(p.arcId)||p.arcId===candidate.arc.arcId)
    add('invalid-parent-pin',`/continuation/prerequisites/${i}`);
   else seen.add(p.arcId);
  }
  if(c.mode==='standalone_same_universe'&&
   (c.prerequisites.length||c.carryForwardFactKeys.length||c.canonAnchors.length))
   add('standalone-must-not-inherit','/continuation');
  if(c.mode!=='standalone_same_universe'&&!c.prerequisites.length)
   add('continuation-missing-parent','/continuation/prerequisites');
  if(c.mode==='direct_continuation'&&c.canonAnchors.length)
   add('canon-anchors-require-canon-bounded-mode','/continuation/canonAnchors');
 }
 return issues;
}

// G1Y may be wrapped by a test host via readReleaseGate({worldId}). Its
// result is compared with an independently hashed submission snapshot, but
// even a PASS is never a signed issuer, durable permission, or release token.
export async function inspectG5AReleaseCandidate({snapshot,candidate,arcPlan=null,
 engineManifest=null,assetObservations=[],readReleaseGate}={}){
 const blockers=[],warnings=[],add=(code,path='/')=>blockers.push(denied(code,path)),
  warn=(code,path='/')=>warnings.push(denied(code,path));
 let c;
 try{c=copyAuthoringJson(candidate);}catch{add('invalid-candidate');}
 if(c)blockers.push(...inspectShape(c));
 const result=(extra={})=>freeze({version:G5A_CANDIDATE_VERSION,
  contractValid:blockers.length===0,syntheticPreflightPassed:false,
  blockers,warnings,...OUTCOME_FLAGS,...extra});
 if(blockers.length)return result();
 if(!await verifySubmissionIntegrity(snapshot)){
  add('invalid-submission-snapshot');return result();
 }
 const world=snapshot.content,contentHash=await hashAuthoringJson(world);
 if(c.worldId!==snapshot.worldId||c.snapshotRevision!==snapshot.draftRevision||
  c.snapshotHash!==snapshot.snapshotHash||c.contentVersion!==world.contentVersion||
  c.contentHash!==contentHash)add('stale-snapshot-pin','/snapshotHash');
 if(!pin(c.source,world.storySource))add('source-pin-conflict','/source');
 if(c.assets.length!==world.assets.length||world.assets.some(a=>
  !c.assets.some(ref=>assetPin(ref,a))))add('asset-pin-conflict','/assets');
 const profiles=world.playerEntryProfiles.map(p=>p.entryId);
 if(c.entryIds.length!==profiles.length||profiles.some(id=>!c.entryIds.includes(id)))
  add('entry-profile-conflict','/entryIds');
 if(c.arc!==null){
  if(!arcPlan||!inspectArcPlan(arcPlan).valid||
   c.arc.planHash!==await hashAuthoringJson(arcPlan))add('arc-plan-pin-conflict','/arc');
  else{
   const selected=arcPlan.arcs.find(a=>a.arcId===c.arc.arcId);
   if(!selected||!selected.source||!pin(c.arc.source,selected.source))
    add('arc-source-pin-conflict','/arc/source');
   if(c.continuation&&c.continuation.mode!=='standalone_same_universe'){
    for(const [i,p] of c.continuation.prerequisites.entries()){
     // Parent endings belong to the pinned PARENT snapshot, not the current
     // world content; never reject a legitimate sequel for that reason.
     if(!arcPlan.arcs.some(a=>a.arcId===p.arcId))
      add('dangling-continuation-reference',`/continuation/prerequisites/${i}`);
    }
    // G1N has no per-arc ending, lineage, or verified mission outcome.
    warn('parent-ending-and-lineage-unverified','/continuation');
   }
  }
 }else if(arcPlan!==null&&(!inspectArcPlan(arcPlan).valid||arcPlan.arcs.length))
  add('arc-selection-required','/arc');
 if(blockers.length)return result();

 const qa=inspectCreatorQa(world,{assetObservations});
 if(!qa.valid){add('invalid-world-content');return result();}
 for(const entry of qa.reachability.profiles){
  if(entry.status==='analysis-budget-exceeded'||!entry.possibleSceneCount)
   add('entry-path-unavailable',entry.entryPath);
 }
 for(const issue of qa.reachability.issues){
  if(['main-mission-start-no-route','main-objective-no-declared-source',
   'required-place-no-declared-route','required-npc-intro-no-declared-route',
   'flag-closure-budget-exceeded'].includes(issue.code))
   add('g3a-'+issue.code,issue.path);
 }
 if(qa.mobileAssets.status==='invalid-evidence'||
  qa.mobileAssets.status==='analysis-budget-or-evidence-invalid')
  add('g3b-invalid-preview-evidence');
 if(qa.mobileAssets.unmeasuredAssetCount)warn('g3b-assets-unmeasured');
 warn('physical-device-qa-required');

 if(c.engine===null||engineManifest===null)add('g4a-engine-plan-missing');
 else{
  let enginePin;
  try{enginePin=await hashAuthoringJson(engineManifest);}catch{}
  if(enginePin!==c.engine.manifestHash)add('g4a-engine-pin-conflict');
  else{
   const engine=await prepareG4AEngine(world,engineManifest);
   if(!engine.ok)add('g4a-'+engine.code,engine.path);
   else warn('g4a-only-synthetic-state');
  }
 }
 let fixtureGatePassed=false;
 if(typeof readReleaseGate!=='function')add('g1y-reader-missing');
 else{
  try{
   const gate=await readReleaseGate({worldId:c.worldId});
   if(gate?.ok===true&&gate.eligible===true&&gate.worldId===c.worldId&&
    gate.snapshotHash===c.snapshotHash&&gate.gateVersion==='world-release-1')
    fixtureGatePassed=true;
   else add(['source-held','source-not-authorized','permit-untracked','permit-revoked',
    'asset-not-authorized','world-not-approved','approval-conflict'].includes(gate?.code)?
    'g1y-'+gate.code:'g1y-blocked');
  }catch{add('g1y-reader-unavailable');}
 }
 warn('rights-and-review-recheck-required-at-real-boundary');
 const valid=blockers.length===0;
 return result({contractValid:valid,syntheticPreflightPassed:valid&&fixtureGatePassed,
  fixtureGatePassed,contentHash:c.contentHash,snapshotHash:c.snapshotHash,
  selectedArcId:c.arc?.arcId||null,entryCount:profiles.length,
  sceneCount:world.scenes.length,assetCount:world.assets.length});
}
