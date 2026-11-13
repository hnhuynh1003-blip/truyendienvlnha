// G3A: bounded, fail-closed ABSTRACT reachability for author drafts.
// A potential route is never proof that opaque triggers will fire, a mission
// completes, an ending plays, or any player may receive a real reward.
// No arbitrary expression evaluation, NPC AI, server writes, or public route.
import {inspectContent} from './vangioi-content.mjs';
import {copyAuthoringContent} from './vangioi-authoring.mjs';

export const G3A_REACHABILITY_VERSION='g3a-abstract-1';
const MAX_SCENES=1600,MAX_LINKS=12000,MAX_FLAGS=4000,MAX_ROUNDS=128;
const MAX_ISSUES=120;
const issue=(code,path)=>({code,path,severity:'review'});
const unique=list=>[...new Set(list)];

export function analyzeG3AReachability(value){
 const validity=inspectContent(value);
 const base={analyzerVersion:G3A_REACHABILITY_VERSION,
  canPublish:false,engineVerified:false,productionAuthorized:false,
  analysisKind:'optimistic-structural-and-declared-flag-closure'};
 if(!validity.valid)return {...base,inputValid:false,status:'invalid-content',
  issues:validity.errors.map(e=>issue(e.code,e.path)).slice(0,MAX_ISSUES),
  profiles:[],truncated:validity.errors.length>MAX_ISSUES};
 const c=copyAuthoringContent(value),issues=[],profiles=[];
 let truncated=false;
 const warn=(code,path,entryPath)=>{
  if(issues.length<MAX_ISSUES)issues.push({...issue(code,path),entryPath});
  else truncated=true;
 };
 const scenes=new Map(c.scenes.map((s,i)=>[s.sceneId,{...s,index:i}]));
 const viewsByScene=new Map();
 for(const v of c.views){const list=viewsByScene.get(v.sceneId)||[];
  list.push(v);viewsByScene.set(v.sceneId,list);}
 const npcs=new Map(c.npcs.map(n=>[n.npcId,n]));
 const shops=new Map(c.shops.map(s=>[s.shopId,s]));
 const items=new Map(c.items.map(x=>[x.itemId,x]));
 const hotspots=new Map();
 for(const [i,v] of c.views.entries())for(const [j,h] of v.hotspots.entries())
  hotspots.set(h.hotspotId,{sceneId:v.sceneId,path:`/views/${i}/hotspots/${j}`,
   action:h.action,targetId:h.targetId});
 const declaredFlags=unique([
  ...c.playerEntryProfiles.flatMap(p=>p.initialFlags||[]),
  ...c.events.flatMap(e=>e.setFlags||[]),
  ...c.npcs.flatMap(n=>(n.dialogueNodes||[]).flatMap(
   node=>(node.choices||[]).map(choice=>choice.setFlag).filter(Boolean)))
 ]);
 const edgeCount=c.scenes.reduce((n,s)=>n+(s.transitions||[]).length,0)+
  c.views.reduce((n,v)=>n+v.hotspots.filter(h=>h.action==='move').length,0);
 if(c.scenes.length>MAX_SCENES||edgeCount>MAX_LINKS||
  declaredFlags.length>MAX_FLAGS)return {...base,inputValid:true,
   status:'analysis-budget-exceeded',profiles:[],
   issues:[issue('analysis-budget-exceeded','/')],truncated:false};

 // A graph edge may be traversed only if its declared requiredFlag COULD
 // exist. Free-text triggers, NPC choices and events are all unverified.
 function maybeScenes(entry,flags){
  const seen=new Set(),queue=[entry];
  for(let i=0;i<queue.length;i++){
   const id=queue[i];if(seen.has(id)||!scenes.has(id))continue;
   seen.add(id);
   for(const t of scenes.get(id).transitions||[])
    if((!t.requiredFlag||flags.has(t.requiredFlag))&&!seen.has(t.toSceneId))
     queue.push(t.toSceneId);
   for(const v of viewsByScene.get(id)||[])for(const h of v.hotspots)
    if(h.action==='move'&&!seen.has(h.targetId))queue.push(h.targetId);
  }
  return seen;
 }
 const itemSources=(item,possible,verb,requiredCount=1)=>{
  if(!item)return 'unknown';
  if(verb==='inspect'&&[...hotspots.values()].some(h=>h.action==='inspect'&&
   h.targetId===item.itemId&&possible.has(h.sceneId)))return 'possible';
  let unresolved=false;
  for(const m of item.acquisitionMethods||[]){
   if(verb==='purchase'&&m.type!=='shop')continue;
   if(m.type==='starting')return 'possible';
   if(m.type==='pickup'&&[...possible].some(sid=>scenes.get(sid)?.placeId===m.placeId))
    return 'possible';
   if(m.type==='shop'&&shops.has(m.shopId)&&[...possible].some(
    sid=>scenes.get(sid)?.placeId===shops.get(m.shopId).placeId)&&
    (shops.get(m.shopId).stock||[]).some(s=>s.itemId===item.itemId&&
     s.quantity>=requiredCount))return 'possible';
   if(['questReward','npcGift','craft'].includes(m.type))unresolved=true;
  }
  return unresolved?'unknown':'no-declared-path';
 };

 for(const [i,profile] of c.playerEntryProfiles.entries()){
  const path=`/playerEntryProfiles/${i}`;
  const report=(code,target)=>warn(code,target,path);
  const flags=new Set(profile.initialFlags||[]);
  let possible=new Set(),changed=true,rounds=0;
  while(changed&&rounds<MAX_ROUNDS){
   rounds++;changed=false;
   possible=maybeScenes(profile.startSceneId,flags);
   // Event triggers are opaque: these are UPPER-BOUND flag sources only.
   for(const e of c.events){
    if(!(e.requiredFlags||[]).every(f=>flags.has(f)))continue;
    for(const flag of e.setFlags||[])if(!flags.has(flag)){
     flags.add(flag);changed=true;
    }
   }
   // Dialogue choices are possible only if the NPC's declared intro scene
   // is possibly reachable; actual conversation options remain unverified.
   for(const n of c.npcs){
    if(!possible.has(n.introSceneId))continue;
    for(const node of n.dialogueNodes||[])for(const choice of node.choices||[])
     if(choice.setFlag&&!flags.has(choice.setFlag)){
      flags.add(choice.setFlag);changed=true;
     }
   }
  }
  if(changed){report('flag-closure-budget-exceeded',path);
   profiles.push({entryPath:path,mode:profile.mode,status:'analysis-budget-exceeded',
    possibleSceneCount:null,unreachableSceneCount:null,possibleEndingCount:null});
   continue;
  }
  // Last flag round may have opened new transitions.
  possible=maybeScenes(profile.startSceneId,flags);
  for(const s of c.scenes)if(!possible.has(s.sceneId))
   report('profile-scene-no-declared-route',`/scenes/${scenes.get(s.sceneId).index}`);
  for(const [j,s] of c.scenes.entries())for(const [k,t] of (s.transitions||[]).entries())
   if(possible.has(s.sceneId)&&t.requiredFlag&&!flags.has(t.requiredFlag))
    report('transition-flag-not-producible',`/scenes/${j}/transitions/${k}/requiredFlag`);

  for(const [j,m] of c.missions.entries()){
   if(m.kind!=='main'||!m.requiredForCompletion)continue;
   if(!possible.has(m.startSceneId))
    report('main-mission-start-no-route',`/missions/${j}/startSceneId`);
   for(const [k,o] of m.objectives.entries()){
    const p=`/missions/${j}/objectives/${k}`;
    let status='unknown';
    if(o.verb==='reach')status=possible.has(o.targetId)?'possible':'no-declared-path';
    else if(o.verb==='talk')status=possible.has(npcs.get(o.targetId)?.introSceneId)?'possible':'no-declared-path';
    else if(o.verb==='choose')status=possible.has(hotspots.get(o.targetId)?.sceneId)?'possible':'no-declared-path';
    else if(['collect','inspect','deliver','purchase'].includes(o.verb))
     status=itemSources(items.get(o.targetId),possible,o.verb,o.requiredCount);
    // A survive/event objective may be resolved by engine rules, never assume.
    if(status==='no-declared-path')report('main-objective-no-declared-source',p);
   }
  }
  for(const [j,pid] of c.playRequirements.requiredVisitPlaceIds.entries())
   if(![...possible].some(sid=>scenes.get(sid)?.placeId===pid))
    report('required-place-no-declared-route',`/playRequirements/requiredVisitPlaceIds/${j}`);
  for(const [j,nid] of c.playRequirements.requiredInteractNpcIds.entries())
   if(!possible.has(npcs.get(nid)?.introSceneId))
    report('required-npc-intro-no-declared-route',`/playRequirements/requiredInteractNpcIds/${j}`);
  let possibleEndingCount=0;
  for(const [j,e] of c.endings.entries()){
   if(e.requiredFlags.every(flag=>flags.has(flag)))possibleEndingCount++;
   else report('ending-flags-no-declared-source',`/endings/${j}/requiredFlags`);
  }
  profiles.push({entryPath:path,mode:profile.mode,status:'needs-engine-review',
   possibleSceneCount:possible.size,
   unreachableSceneCount:c.scenes.length-possible.size,
   possibleEndingCount});
 }
 // Zero findings is still not evidence the story can reach an ending.
 return {...base,inputValid:true,status:'needs-engine-review',profiles,
  issues,truncated};
}
