// Static, build-time compiled JSON Schema: no new Function/eval in Workers.
import validators from './generated/vangioi-content-validators.cjs';
import {AUTHORING_FIELDS,copyAuthoringContent,copyAuthoringJson} from './vangioi-authoring.mjs';

export const CONTENT_VALIDATOR_VERSION='world-content-1-semantic-1';
const issue=(code,path)=>({code,path});
const schemaErrors=validator=>(validator.errors||[]).map(e=>issue('schema:'+e.keyword,
 e.keyword==='required'&&/^[A-Za-z][A-Za-z0-9]*$/.test(e.params?.missingProperty||'')?
 (e.instancePath||'')+'/'+e.params.missingProperty:e.instancePath||'/'));
export function validateDraftContent(value){
 try{
  const content=copyAuthoringContent(value);
  return validators.validateDraft(content)?{valid:true,errors:[]}:{valid:false,errors:schemaErrors(validators.validateDraft)};
 }catch{return {valid:false,errors:[issue('invalid-json-content','/')]};}
}

export function inspectContent(value){
 let c;
 try{c=copyAuthoringContent(value);}catch{return {valid:false,errors:[issue('invalid-json-content','/')],warnings:[]};}
 if(!validators.validateSubmit(c))return {valid:false,errors:schemaErrors(validators.validateSubmit),warnings:[]};
 const errors=[],warnings=[];
 const err=(code,path)=>errors.push(issue(code,path));
 const warn=(code,path)=>warnings.push(issue(code,path));
 const registry=(rows,key,path)=>{
  const m=new Map();for(const [i,row] of rows.entries()){
   if(m.has(row[key]))err('duplicate-id',`${path}/${i}/${key}`);else m.set(row[key],row);
  }return m;
 };
 const ref=(key,map,path)=>{if(!map.has(key))err('missing-reference',path);};
 const r={};
 for(const [name,key] of Object.entries({assets:'assetId',maps:'mapId',places:'placeId',scenes:'sceneId',
  views:'viewId',cast:'characterId',npcs:'npcId',playerEntryProfiles:'entryId',items:'itemId',shops:'shopId',
  missions:'missionId',events:'eventId',endings:'endingId',characterVisuals:'characterId',characterAppearances:'appearanceId'}))
  r[name]=registry(c[name]||[],key,'/'+name);
 ref(c.worldCoverAssetId,r.assets,'/worldCoverAssetId');
 if(r.assets.get(c.worldCoverAssetId)?.kind!=='worldCover')err('cover-kind','/worldCoverAssetId');
 if(!c.assets.some(a=>a.kind==='sceneBackground'))err('missing-background','/assets');
 for(const [i,m] of c.maps.entries()){
  if(m.overviewAssetId)ref(m.overviewAssetId,r.assets,`/maps/${i}/overviewAssetId`);
  for(const pid of m.placeIds){
   ref(pid,r.places,`/maps/${i}/placeIds`);
   if(r.places.has(pid)&&r.places.get(pid).mapId!==m.mapId)err('map-place-mismatch',`/maps/${i}/placeIds`);
  }
 }
 for(const [i,p] of c.places.entries()){
  ref(p.mapId,r.maps,`/places/${i}/mapId`);
  if(r.maps.has(p.mapId)&&!r.maps.get(p.mapId).placeIds.includes(p.placeId))err('place-not-listed',`/places/${i}`);
  if(p.parentPlaceId){
   ref(p.parentPlaceId,r.places,`/places/${i}/parentPlaceId`);
   const seen=new Set([p.placeId]);let next=p.parentPlaceId;
   while(next&&r.places.has(next)){
    if(seen.has(next)){err('parent-cycle',`/places/${i}/parentPlaceId`);break;}
    seen.add(next);next=r.places.get(next).parentPlaceId;
   }
  }
  for(const sid of p.sceneIds){ref(sid,r.scenes,`/places/${i}/sceneIds`);
   if(r.scenes.has(sid)&&r.scenes.get(sid).placeId!==p.placeId)err('place-scene-mismatch',`/places/${i}/sceneIds`);}
 }
 for(const [i,s] of c.scenes.entries()){
  ref(s.placeId,r.places,`/scenes/${i}/placeId`);
  if(r.places.has(s.placeId)&&!r.places.get(s.placeId).sceneIds.includes(s.sceneId))err('scene-not-listed',`/scenes/${i}`);
  ref(s.backgroundAssetId,r.assets,`/scenes/${i}/backgroundAssetId`);
  if(!['sceneBackground','sceneVariant'].includes(r.assets.get(s.backgroundAssetId)?.kind))err('background-kind',`/scenes/${i}`);
  for(const vid of s.viewIds||[]){ref(vid,r.views,`/scenes/${i}/viewIds`);
   if(r.views.has(vid)&&r.views.get(vid).sceneId!==s.sceneId)err('scene-view-mismatch',`/scenes/${i}/viewIds`);}
  for(const [j,t] of (s.transitions||[]).entries()){
   ref(t.toSceneId,r.scenes,`/scenes/${i}/transitions/${j}`);
   if(!t.trigger.trim())err('empty-trigger',`/scenes/${i}/transitions/${j}`);
  }
 }
 const hotspots=new Map(),pickupKeys=new Set(),dialogues=new Map(),viewsByScene=new Map();
 for(const [i,v] of c.views.entries()){
  if(!viewsByScene.has(v.sceneId))viewsByScene.set(v.sceneId,[]);
  viewsByScene.get(v.sceneId).push(v);
  ref(v.sceneId,r.scenes,`/views/${i}/sceneId`);
  if(r.scenes.has(v.sceneId)&&!(r.scenes.get(v.sceneId).viewIds||[]).includes(v.viewId))err('view-not-listed',`/views/${i}`);
  if(v.assetId)ref(v.assetId,r.assets,`/views/${i}/assetId`);
  for(const cid of v.depictedCharacterIds||[])ref(cid,r.cast,`/views/${i}/depictedCharacterIds`);
  for(const [j,h] of v.hotspots.entries()){
   const path=`/views/${i}/hotspots/${j}`;
   if(hotspots.has(h.hotspotId))err('duplicate-hotspot',path);
   hotspots.set(h.hotspotId,{...h,viewId:v.viewId,sceneId:v.sceneId});
   const target={inspect:r.items,pickup:r.items,read:r.items,talk:r.npcs,shop:r.shops,move:r.scenes,focus:r.views}[h.action];
   ref(h.targetId,target,path+'/targetId');
   if(h.action==='focus'&&r.views.has(h.targetId)&&r.views.get(h.targetId).sceneId!==v.sceneId)err('focus-crosses-scene',path);
   if(h.action==='pickup'){
    if(!h.uniquePickupId)err('missing-pickup-key',path);
    else if(pickupKeys.has(h.uniquePickupId))err('duplicate-pickup-key',path);
    pickupKeys.add(h.uniquePickupId);
   }
  }
 }
 for(const [i,n] of c.npcs.entries()){
  ref(n.introSceneId,r.scenes,`/npcs/${i}/introSceneId`);
  if(n.characterId)ref(n.characterId,r.cast,`/npcs/${i}/characterId`);
  const nodes=new Set((n.dialogueNodes||[]).map(x=>x.nodeId));
  for(const [j,node] of (n.dialogueNodes||[]).entries()){
   if(dialogues.has(node.nodeId))err('duplicate-dialogue',`/npcs/${i}/dialogueNodes/${j}`);
   dialogues.set(node.nodeId,n.npcId);
   for(const choice of node.choices||[])if(choice.nextNodeId&&!nodes.has(choice.nextNodeId))err('missing-dialogue',`/npcs/${i}/dialogueNodes/${j}`);
  }
  if(n.mode==='ai_candidate'&&(!n.interactionLevels.includes('ai_candidate')||!nodes.size))err('ai-needs-scripted-fallback',`/npcs/${i}`);
  if(n.mode==='ai_candidate'&&!c.aiPolicy.aiNpcRequested)err('ai-request-not-declared',`/npcs/${i}`);
 }
 const variants=new Map(),formats={portrait:['characterPortrait','npcPortrait'],sprite:['characterSprite'],
  illustration:['characterIllustration'],silhouette:['characterSilhouette'],avatar:['characterAvatar']};
 for(const [i,v] of (c.characterVisuals||[]).entries()){
  ref(v.characterId,r.cast,`/characterVisuals/${i}`);
  for(const look of v.variants){
   if(variants.has(look.variantId))err('duplicate-variant',`/characterVisuals/${i}`);
   variants.set(look.variantId,{...look,characterId:v.characterId});
   ref(look.assetId,r.assets,`/characterVisuals/${i}`);
   if(!formats[look.format].includes(r.assets.get(look.assetId)?.kind))err('visual-asset-kind',`/characterVisuals/${i}`);
  }
 }
 const possessed=new Set(c.playerEntryProfiles.filter(p=>p.mode==='cast_possession').map(p=>p.castTargetId));
 for(const [i,a] of (c.characterAppearances||[]).entries()){
  const path=`/characterAppearances/${i}`;
  ref(a.characterId,r.cast,path);ref(a.viewId,r.views,path);ref(a.variantId,variants,path);
  const look=variants.get(a.variantId);
  if(look&&(look.characterId!==a.characterId||look.format!==a.displayMode))err('appearance-variant-mismatch',path);
  if(a.showOn==='dialogue_start')ref(a.triggerRef,dialogues,path+'/triggerRef');
  if(a.showOn==='event_flag'&&!a.triggerRef?.trim())err('missing-appearance-trigger',path);
  if((a.requiredFlags||[]).some(f=>(a.forbiddenFlags||[]).includes(f)))err('contradictory-flags',path);
  if(a.displayMode==='sprite'&&possessed.has(a.characterId)&&a.suppressWhenPossessed!==true)err('possessed-sprite-duplicate',path);
 }
 for(const [i,p] of c.playerEntryProfiles.entries()){
  const path=`/playerEntryProfiles/${i}`;ref(p.startSceneId,r.scenes,path);
  if(p.mode==='cast_possession'){
   ref(p.castTargetId,r.cast,path);
   if(!r.cast.get(p.castTargetId)?.playableAsCast)err('cast-not-playable',path);
   if(c.npcs.some(n=>n.characterId===p.castTargetId))warn('rebind-possessed-actor',path);
  }
  if(p.mode==='system_cover'&&(!p.coverName?.trim()||!p.identityAssurance))err('cover-identity-required',path);
  if(p.mode==='native_extra'&&(!p.nativeSlotId||!p.socialAnchorNotes?.trim()))err('native-history-required',path);
 }
 if(c.entryPolicy.mode==='fixed')ref(c.entryPolicy.forcedEntryId,r.playerEntryProfiles,'/entryPolicy/forcedEntryId');
 ref(c.entry.entrySceneId,r.scenes,'/entry/entrySceneId');
 const itemPickups=new Set();
 for(const [i,item] of c.items.entries())for(const [j,m] of item.acquisitionMethods.entries()){
  const path=`/items/${i}/acquisitionMethods/${j}`;
  if(m.type==='pickup'){
   ref(m.placeId,r.places,path);ref(m.hotspotId,hotspots,path);
   const h=hotspots.get(m.hotspotId);
   if(!m.uniquePickupId||itemPickups.has(m.uniquePickupId))err('item-pickup-key',path);
   itemPickups.add(m.uniquePickupId);
   if(h&&(h.action!=='pickup'||h.targetId!==item.itemId||h.uniquePickupId!==m.uniquePickupId||
    (m.viewId&&h.viewId!==m.viewId)||r.scenes.get(h.sceneId)?.placeId!==m.placeId))err('pickup-source-mismatch',path);
  }
  if(m.type==='shop')ref(m.shopId,r.shops,path);
  if(m.type==='questReward')ref(m.missionId,r.missions,path);
 }
 for(const h of hotspots.values())if(h.action==='pickup'&&r.items.has(h.targetId)&&
  !r.items.get(h.targetId).acquisitionMethods.some(m=>m.type==='pickup'&&m.hotspotId===h.hotspotId&&m.uniquePickupId===h.uniquePickupId))
  err('pickup-not-declared-on-item','/views');
 for(const [i,s] of c.shops.entries()){
  ref(s.placeId,r.places,`/shops/${i}`);ref(s.currencyItemId,r.items,`/shops/${i}`);
  if(r.items.has(s.currencyItemId)&&r.items.get(s.currencyItemId).category!=='currency')err('shop-currency-kind',`/shops/${i}`);
  if(s.merchantNpcId)ref(s.merchantNpcId,r.npcs,`/shops/${i}`);
  for(const stock of s.stock)ref(stock.itemId,r.items,`/shops/${i}/stock`);
 }
 let main=0;const objectives=new Set();
 for(const [i,m] of c.missions.entries()){
  const path=`/missions/${i}`;ref(m.startSceneId,r.scenes,path);
  if(m.kind==='main'&&m.requiredForCompletion)main++;
  if(m.kind!=='main'&&m.requiredForCompletion)err('optional-mission-required',path);
  for(const o of m.objectives){
   if(objectives.has(o.objectiveId))err('duplicate-objective',path);objectives.add(o.objectiveId);
   const targets={talk:r.npcs,collect:r.items,inspect:r.items,purchase:r.items,reach:r.scenes,deliver:r.items,
    choose:hotspots,survive:r.events}[o.verb];ref(o.targetId,targets,path+'/objectives');
  }
  for(const reward of m.rewardRequest.items)ref(reward.itemId,r.items,path+'/rewardRequest');
 }
 if(!main)err('required-main-mission','/missions');
 for(const pid of c.playRequirements.requiredVisitPlaceIds)ref(pid,r.places,'/playRequirements/requiredVisitPlaceIds');
 for(const nid of c.playRequirements.requiredInteractNpcIds)ref(nid,r.npcs,'/playRequirements/requiredInteractNpcIds');
 const scan=[c];while(scan.length){const v=scan.pop();
  if(typeof v==='string'&&v.includes('[TODO]')){err('unfinished-todo','/');break;}
  if(v&&typeof v==='object')scan.push(...Object.values(v));
 }
 // Structural reachability is advisory; conditions/events still need engine playtests.
 for(const profile of c.playerEntryProfiles){
  const seen=new Set(),queue=[profile.startSceneId];
  for(let i=0;i<queue.length;i++){
   const sid=queue[i];if(seen.has(sid))continue;seen.add(sid);
   for(const t of r.scenes.get(sid)?.transitions||[])if(!seen.has(t.toSceneId))queue.push(t.toSceneId);
   for(const v of viewsByScene.get(sid)||[])for(const h of v.hotspots)
    if(h.action==='move'&&!seen.has(h.targetId))queue.push(h.targetId);
  }
  if(seen.size<c.scenes.length)warn('unreachable-scenes-check-events','/playerEntryProfiles');
 }
 if(c.events?.length||c.scenes.some(s=>s.transitions?.length))warn('engine-rule-review-required','/events');
 return {valid:errors.length===0,errors,warnings};
}

export function createContentValidator({readStorySource,readAsset}={}){
 return async function validateContent(value,{worldId,actorUid}={}){
  const report=inspectContent(value);
  const verdict={readyForReview:false,validatorVersion:CONTENT_VALIDATOR_VERSION,
   errors:report.errors,warnings:report.warnings,dependencies:[],canPublish:false};
  if(!report.valid)return verdict;
  if(typeof readStorySource!=='function'||typeof readAsset!=='function'||!worldId||!actorUid){
   verdict.errors.push(issue('registry-unavailable','/'));return verdict;
  }
  const c=copyAuthoringContent(value);
  try{
   const source=copyAuthoringJson(await readStorySource(c.storySource,{worldId,actorUid}));
   if(!source||source.worldId!==worldId||source.grantStatus!=='active'||!Number.isSafeInteger(source.grantRevision)||
    source.grantRevision<1||source.kind!==c.storySource.kind||source.storyId!==c.storySource.storyId||
    source.storyVersion!==c.storySource.storyVersion||source.contentHash!==c.storySource.contentHash)
    verdict.errors.push(issue('source-not-authorized','/storySource'));
   else verdict.dependencies.push({kind:'source',reference:c.storySource,record:source});
   for(const [i,asset] of c.assets.entries()){
    const a=copyAuthoringJson(await readAsset(asset,{worldId,actorUid}));
    if(!a||a.worldId!==worldId||a.grantStatus!=='active'||!Number.isSafeInteger(a.grantRevision)||a.grantRevision<1||
     a.assetId!==asset.assetId||a.assetVersion!==asset.assetVersion||a.contentHash!==asset.contentHash||a.kind!==asset.kind||
     !['pending','inReview','approved'].includes(a.reviewStatus)||!['original','licensed','public_domain'].includes(a.license)||
     !a.sourceNote?.trim()||(a.license==='licensed'&&!a.proofRef?.trim()))
     verdict.errors.push(issue('asset-not-authorized',`/assets/${i}`));
    else{
     verdict.dependencies.push({kind:'asset',reference:asset,record:a});
     if(a.reviewStatus!=='approved')verdict.warnings.push(issue('asset-review-pending',`/assets/${i}`));
    }
   }
  }catch{verdict.errors.push(issue('registry-unavailable','/'));}
  verdict.readyForReview=verdict.errors.length===0;return verdict;
 };
}

export function proposeLegacyContent(value,{storySource}={}){
 const original=copyAuthoringJson(value);
 if(original?.schemaVersion!=='world-authoring-0.1')throw Error('Unsupported legacy authoring version');
 const content=Object.fromEntries(Object.entries(original).filter(([k])=>AUTHORING_FIELDS.includes(k)));
 content.schemaVersion='world-content-1';content.requestedWorldRank=original.worldRank;
 if(content.genreId==='period')content.genreId='era';
 content.entry={entrySceneId:original.entry?.entrySceneId};
 content.assets=(original.assets||[]).map(a=>({assetId:a.assetId,kind:a.kind,altText:a.altText,
  ...(a.focalPoint?{focalPoint:a.focalPoint}:{})}));
 if(storySource)content.storySource=copyAuthoringJson(storySource);
 return {content,notices:['legacy-world-id-not-rebound','owner-and-approvals-not-imported',
  'entry-policy-needs-backend-grant','asset-versions-required','rank-is-request']};
}
