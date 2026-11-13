// G5C: Node/test-host-only synthetic staging assembly. Produces an index of
// pinned IDs, NOT a runnable bundle, signed release, permission or save.
import {copyAuthoringJson,hashAuthoringJson,verifySubmissionIntegrity}
 from './vangioi-authoring.mjs';
import {inspectG5AReleaseCandidate,G5A_CANDIDATE_VERSION}
 from './vangioi-g5a-release-candidate.mjs';
import {inspectCreatorQa} from '../../js/vangioi-creator-validation-entry.mjs';
import G1NArcPlan from '../../js/vangioi-arc-plan.js';

export const G5C_ASSEMBLY_VERSION='g5c-synthetic-staging-1';
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&Object.keys(x).every(k=>keys.includes(k));
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const sameSource=(a,b)=>a&&b&&a.kind===b.kind&&a.storyId===b.storyId&&
 a.storyVersion===b.storyVersion&&a.contentHash===b.contentHash;
const sameAsset=(a,b)=>a&&b&&a.assetId===b.assetId&&a.assetVersion===b.assetVersion&&
 a.kind===b.kind&&a.contentHash===b.contentHash;
const flags=Object.freeze({fixtureOnly:true,readyForStaging:false,packagePublished:false,
 productionAuthorized:false,publisherAuthorized:false,rightsVerified:false,
 deviceVerified:false,lineageVerified:false,parentEndingVerified:false,
 missionCompleted:false,saveCommitted:false,rewardAuthorized:false,rewardCommitted:false});
const frozen=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(frozen);Object.freeze(x);}return x;};
const result=(v={})=>frozen({version:G5C_ASSEMBLY_VERSION,assembled:false,
 blockers:[],warnings:[],...flags,...v});
const failure=code=>result({blockers:[{code}]});

async function inspectParent(p,worldId){
 if(!exact(p,['candidate','snapshot','arcPlan'])||
  !exact(p.candidate,['version','worldId','contentVersion','contentHash','snapshotRevision',
   'snapshotHash','source','assets','entryIds','arc','continuation','engine'])||
  p.candidate.version!==G5A_CANDIDATE_VERSION||p.candidate.worldId!==worldId||
  !exact(p.candidate.arc,['arcId','arcVersion','planHash','source','releaseOrder','storyTimeOrder'])||
  typeof p.candidate.arc.arcId!=='string'||
  !/^[a-z][a-z0-9-]{1,63}$/.test(p.candidate.arc.arcId)||
  typeof p.candidate.arc.arcVersion!=='string'||!p.candidate.arc.arcVersion.trim()||
  !Number.isSafeInteger(p.candidate.arc.releaseOrder)||p.candidate.arc.releaseOrder<1||
  !Number.isSafeInteger(p.candidate.arc.storyTimeOrder)||
  !exact(p.candidate.continuation,['mode','prerequisites','carryForwardFactKeys','canonAnchors'])||
  !Array.isArray(p.candidate.continuation.prerequisites)||
  p.candidate.continuation.prerequisites.length>16||
  !Array.isArray(p.candidate.assets)||!Array.isArray(p.candidate.entryIds)||
  !hex(p.candidate.contentHash)||!hex(p.candidate.snapshotHash)||
  !hex(p.candidate.arc.planHash)||!G1NArcPlan.inspect(p.arcPlan).valid||
  await hashAuthoringJson(p.arcPlan)!==p.candidate.arc.planHash||
  !await verifySubmissionIntegrity(p.snapshot))return null;
 const c=p.candidate,s=p.snapshot,w=s.content;
 if(!inspectCreatorQa(w).valid||s.worldId!==worldId||s.draftRevision!==c.snapshotRevision||
  s.snapshotHash!==c.snapshotHash||w.contentVersion!==c.contentVersion||
  await hashAuthoringJson(w)!==c.contentHash||!sameSource(c.source,w.storySource)||
  c.assets.length!==w.assets.length||
  w.assets.some(a=>!c.assets.some(b=>sameAsset(a,b)))||
  c.entryIds.length!==w.playerEntryProfiles.length||
  w.playerEntryProfiles.some(e=>!c.entryIds.includes(e.entryId)))return null;
 const arc=p.arcPlan.arcs.find(x=>x.arcId===c.arc.arcId);
 if(!arc||!sameSource(arc.source,c.arc.source)||
  !['direct_continuation','canon_bounded_continuation','standalone_same_universe']
   .includes(c.continuation.mode))return null;
 return {candidate:c,snapshot:s};
}

// All historical parent references are checked structurally, including
// accepted ending IDs in their own PINNED snapshots. They NEVER demonstrate
// that a particular player reached an ending or may enter a later arc.
async function inspectArcDependencies(snapshot,candidate,arcPlan,parents){
 if(!Array.isArray(parents)||parents.length>32)return 'invalid-parent-list';
 if(candidate.arc===null)return parents.length?'unexpected-parent':'none';
 const nodes=new Map([[candidate.arc.arcId,{candidate,snapshot}]]);
 for(const raw of parents){
  const p=await inspectParent(raw,candidate.worldId);
  if(!p||nodes.has(p.candidate.arc.arcId))return 'invalid-parent-snapshot';
  nodes.set(p.candidate.arc.arcId,p);
 }
 const selected=new Set(arcPlan.arcs.map(x=>x.arcId));
 const visit=new Map();
 const traverse=id=>{
  const v=visit.get(id);if(v===1)return 'arc-dependency-cycle';if(v===2)return null;
  const node=nodes.get(id);if(!node)return 'missing-parent-snapshot';
  visit.set(id,1);
  const c=node.candidate.continuation;
  if(!c||!Array.isArray(c.prerequisites)||c.prerequisites.length>16)
   return 'invalid-parent-dependencies';
  if(c.mode==='standalone_same_universe'&&c.prerequisites.length)
   return 'standalone-parent-conflict';
  if(c.mode!=='standalone_same_universe'&&!c.prerequisites.length)
   return 'missing-parent-snapshot';
  const seen=new Set();
  for(const ref of c.prerequisites){
   if(!exact(ref,['arcId','arcVersion','contentHash','acceptedEndingIds'])||
    !Array.isArray(ref.acceptedEndingIds)||!ref.acceptedEndingIds.length||
    ref.acceptedEndingIds.length>128||!hex(ref.contentHash)||seen.has(ref.arcId))
    return 'invalid-parent-reference';
   seen.add(ref.arcId);
   const parent=nodes.get(ref.arcId);
   if(!selected.has(ref.arcId)||!parent||
    parent.candidate.arc?.arcVersion!==ref.arcVersion||
    parent.candidate.contentHash!==ref.contentHash)return 'stale-or-missing-parent-pin';
   const endings=new Set(parent.snapshot.content.endings.map(x=>x.endingId));
   if(new Set(ref.acceptedEndingIds).size!==ref.acceptedEndingIds.length||
    ref.acceptedEndingIds.some(x=>!endings.has(x)))return 'parent-ending-not-in-snapshot';
   const issue=traverse(ref.arcId);if(issue)return issue;
  }
  visit.set(id,2);return null;
 };
 const err=traverse(candidate.arc.arcId);if(err)return err;
 if(visit.size!==nodes.size)return 'unreferenced-parent-snapshot';
 return null;
}

/** The G1Y reader belongs to the isolated host; no self-asserted G5A/G5B
 * boolean result is accepted as permission or bypass. */
export async function assembleG5CStagingPackage({snapshot,candidate,arcPlan=null,
 engineManifest=null,assetObservations=[],parents=[],readReleaseGate}={}){
 let c,s,plan,engine,observations,parentsCopy;
 try{c=copyAuthoringJson(candidate);s=copyAuthoringJson(snapshot);
  plan=copyAuthoringJson(arcPlan);engine=copyAuthoringJson(engineManifest);
  observations=copyAuthoringJson(assetObservations);
  parentsCopy=copyAuthoringJson(parents);}catch{return failure('invalid-input');}
 // Keep one detached input snapshot across G5A's async hash/gate reads and
 // manifest assembly. An interleaving host callback must not mutate the plan.
 const preflight=await inspectG5AReleaseCandidate({snapshot:s,candidate:c,arcPlan:plan,
  engineManifest:engine,assetObservations:observations,readReleaseGate});
 if(!preflight.syntheticPreflightPassed)return result({blockers:preflight.blockers.length?
  preflight.blockers:[{code:'g5a-preflight-blocked'}],warnings:preflight.warnings});
 const content=s.content;
 const qa=inspectCreatorQa(content,{assetObservations:observations});
 if(!qa.valid||qa.mobileAssets.inputValid!==true||
  qa.mobileAssets.unmeasuredAssetCount>0)return failure('missing-required-asset-observations');
 const assetMap=new Map(content.assets.map(a=>[a.assetId,a]));
 const used=new Set([content.worldCoverAssetId]);
 for(const s of content.scenes)used.add(s.backgroundAssetId);
 for(const v of content.views)if(v.assetId)used.add(v.assetId);
 for(const a of content.characterAppearances||[]){
  const look=(content.characterVisuals||[]).flatMap(x=>x.variants||[])
   .find(x=>x.variantId===a.variantId);
  if(look)used.add(look.assetId);
 }
 if([...used].some(id=>!assetMap.has(id)||!assetMap.get(id).altText?.trim()))
  return failure('missing-visual-fallback');
 let graphIssue;
 try{graphIssue=await inspectArcDependencies(s,c,plan,parentsCopy);}
 catch{return failure('invalid-parent-snapshot');}
 if(graphIssue&&graphIssue!=='none')return failure(graphIssue);
 const packageIndex={worldId:c.worldId,contentVersion:c.contentVersion,
  contentHash:c.contentHash,snapshotRevision:c.snapshotRevision,snapshotHash:c.snapshotHash,
  source:{...c.source},engine:{...c.engine},
  arc:c.arc?{arcId:c.arc.arcId,arcVersion:c.arc.arcVersion,
   releaseOrder:c.arc.releaseOrder,storyTimeOrder:c.arc.storyTimeOrder,
   planHash:c.arc.planHash}:null,
  prerequisites:c.continuation?.prerequisites.map(p=>({arcId:p.arcId,
   arcVersion:p.arcVersion,contentHash:p.contentHash,
   acceptedEndingIds:[...p.acceptedEndingIds]}))||[],
  entries:content.playerEntryProfiles.map(p=>({entryId:p.entryId,mode:p.mode,
   startSceneId:p.startSceneId})),
  scenes:content.scenes.map(s=>({sceneId:s.sceneId,placeId:s.placeId,
   backgroundAssetId:s.backgroundAssetId,
   transitionTargets:s.transitions.map(t=>t.toSceneId).filter(Boolean)})),
  assets:[...used].sort().map(id=>({assetId:id,assetVersion:assetMap.get(id).assetVersion,
   contentHash:assetMap.get(id).contentHash,kind:assetMap.get(id).kind,
   fallbackTextAvailable:true,syntheticObservationOnly:true}))};
 const packageHash=await hashAuthoringJson(packageIndex);
 return result({assembled:true,packageHash,packageIndex,
  warnings:[...preflight.warnings,
   ...(c.continuation?.prerequisites.length?
    [{code:'parent-endings-exist-but-player-lineage-unverified'},
     {code:'historical-parent-license-and-source-recheck-required'}]:[]),
   {code:'image-observations-are-not-physical-device-qa'},
   {code:'staging-package-index-is-not-playable'}]});
}
