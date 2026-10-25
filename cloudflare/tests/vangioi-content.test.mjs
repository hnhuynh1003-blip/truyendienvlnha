import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {inspectContent,validateDraftContent,createContentValidator,proposeLegacyContent} from '../src/vangioi-content.mjs';
import {createSqlAuthoringService} from '../src/vangioi-authoring-sql.mjs';

const W='world-content-test',USER='content-test-owner',HASH='a'.repeat(64),ASSET_HASH='b'.repeat(64);
const request=()=>new Request('https://unit.test',{headers:{Authorization:'Bearer fixture'}});
function content(){return {
 schemaVersion:'world-content-1',contentVersion:'1.0.0',title:'A room',genreId:'era',requestedWorldRank:'F',dangerLevel:'low',
 storySource:{kind:'library',storyId:'epub-existing_story',storyVersion:'version-7',contentHash:HASH},
 story:{logline:'A visitor solves a riddle.',setting:'A quiet room.',playerRole:'A local caretaker.',opening:'The door closes.',
  secretTruth:'SECRET_TRUTH_SENTINEL',plotBeats:['Read the room.','Solve the riddle.'],worldRules:['The door opens after the riddle.']},
 worldCoverAssetId:'art-cover',assets:[
  {assetId:'art-cover',assetVersion:'v1',contentHash:ASSET_HASH,kind:'worldCover',altText:'An old house'},
  {assetId:'art-room',assetVersion:'v1',contentHash:ASSET_HASH,kind:'sceneBackground',altText:'A quiet room'}],
 maps:[{mapId:'map-room',name:'House',placeIds:['place-room']}],
 places:[{placeId:'place-room',mapId:'map-room',name:'Room',sceneIds:['scene-room']}],
 scenes:[{sceneId:'scene-room',placeId:'place-room',backgroundAssetId:'art-room',summary:'A room.',viewIds:['view-room'],transitions:[]}],
 views:[{viewId:'view-room',sceneId:'scene-room',kind:'wide',assetId:'art-room',hotspots:[]}],
 cast:[],characterVisuals:[],characterAppearances:[],npcs:[],
 playerEntryProfiles:[{entryId:'entry-local',label:'Caretaker',mode:'native_extra',nativeSlotId:'slot-local',
  socialAnchorNotes:'A caretaker who has lived here for years.',startSceneId:'scene-room',initialKnownFacts:[],initialFlags:[]}],
 entryPolicy:{mode:'fixed',forcedEntryId:'entry-local'},entry:{entrySceneId:'scene-room'},
 items:[],shops:[],missions:[{missionId:'mission-room',name:'Visit the room',kind:'main',requiredForCompletion:true,
  startSceneId:'scene-room',summary:'Find a way out.',objectives:[{objectiveId:'objective-room',verb:'reach',targetId:'scene-room',requiredCount:1}],
  rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'}],events:[],
 endings:[{endingId:'ending-room',title:'Morning',result:'success',requiredFlags:[]}],
 playRequirements:{requiredVisitPlaceIds:[],requiredInteractNpcIds:[]},
 aiPolicy:{aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false}
};}
function registry(){
 return {readStorySource:async(ref,ctx)=>({...ref,worldId:ctx.worldId,grantStatus:'active',grantRevision:1}),
  readAsset:async(ref,ctx)=>({...ref,worldId:ctx.worldId,grantStatus:'active',grantRevision:1,
   reviewStatus:'pending',license:'original',sourceNote:'Declared original art',proofRef:null})};
}
const context={worldId:W,actorUid:USER};
test('G1D a one-room world with no NPC/item quotas can be submitted for review',async()=>{
 const c=content();const r=await createContentValidator(registry())(c,context);
 assert.equal(r.readyForReview,true);assert.equal(r.canPublish,false);
 assert.equal(r.dependencies.length,3);assert.equal(r.warnings.length,2);
 assert.equal(c.story.secretTruth,'SECRET_TRUTH_SENTINEL');
});
test('G1D incomplete drafts remain savable but cannot pass submit validation',()=>{
 for(const draft of [{},{story:{}},{scenes:[{}]},{title:''},{assets:[{assetId:'art-pending'}]}]){
  assert.equal(validateDraftContent(draft).valid,true);
  assert.equal(inspectContent(draft).valid,false);
 }
});
test('G1D draft validation does not allow invalid types, AI authority or official metadata',()=>{
 for(const draft of [{title:42},{worldRank:'S'},{officialWorldRank:'S'},{ownerUid:USER},{status:'published'},
  {aiPolicy:{allowAiRewards:true}},{shops:[{stock:[{price:-1}]}]},{story:{extra:'unknown'}}])
  assert.equal(validateDraftContent(draft).valid,false);
});
test('G1D submit requires canonical genre, schema version and a pinned source',()=>{
 for(const change of [{genreId:'period'},{schemaVersion:'world-authoring-0.1'},{storySource:{kind:'library',storyId:'id'}}])
  assert.equal(inspectContent({...content(),...change}).valid,false);
});
test('G1D requested S rank does not require more scenes, NPCs or main missions',()=>{
 const c=content();c.requestedWorldRank='S';assert.equal(inspectContent(c).valid,true);
});
test('G1D reports omit secret prose and raw schema values',()=>{
 const c=content();c.story.secretTruth={private:'SECRET_BAD_VALUE'};
 const result=inspectContent(c);assert.equal(result.valid,false);
 assert.equal(JSON.stringify(result).includes('SECRET_BAD_VALUE'),false);
});
test('G1D numeric booleans, unsafe integers, NaN and non-JSON content are rejected',()=>{
 for(const value of [true,Number.MAX_SAFE_INTEGER+1,NaN,Infinity]){
  const c=content();c.missions[0].rewardRequest.exp=value;assert.equal(inspectContent(c).valid,false);
 }
 const c=content();c.story.secretTruth=()=>true;assert.equal(inspectContent(c).valid,false);
});
test('G1D content with TODO cannot become a review snapshot',()=>{
 const c=content();c.story.opening='[TODO]';
 assert.equal(inspectContent(c).errors.some(x=>x.code==='unfinished-todo'),true);
});
test('G1D whitespace-only required prose is not a complete Story Bible',()=>{
 const c=content();c.story.opening='   ';assert.equal(inspectContent(c).valid,false);
});
for(const [name,key] of Object.entries({assets:'assetId',maps:'mapId',places:'placeId',scenes:'sceneId',views:'viewId',
 playerEntryProfiles:'entryId',missions:'missionId',endings:'endingId'}))
 test('G1D duplicate '+name+' IDs are rejected',()=>{
  const c=content();c[name].push(structuredClone(c[name][0]));
  assert.equal(inspectContent(c).errors.some(e=>e.code==='duplicate-id'),true,key);
 });
test('G1D missing or wrong-kind cover/background cannot pass',()=>{
 for(const mutate of [c=>c.worldCoverAssetId='missing-art',c=>c.assets[0].kind='itemIcon',
  c=>c.scenes[0].backgroundAssetId='art-cover',c=>c.assets[1].kind='itemIcon']){
  const c=content();mutate(c);assert.equal(inspectContent(c).valid,false);
 }
});
test('G1D map/place/scene/view reverse references and parent cycles are checked',()=>{
 for(const mutate of [c=>c.maps[0].overviewAssetId='missing-art',c=>c.places[0].parentPlaceId='place-room',
  c=>c.scenes[0].viewIds=[],c=>c.views[0].sceneId='missing-scene',c=>c.places[0].mapId='missing-map']){
  const c=content();mutate(c);assert.equal(inspectContent(c).valid,false);
 }
});
test('G1D fixed entry profiles must exist and native residents need social history',()=>{
 for(const mutate of [c=>c.entryPolicy.forcedEntryId='missing-entry',c=>delete c.playerEntryProfiles[0].socialAnchorNotes,
  c=>c.entry.entrySceneId='missing-scene']){
  const c=content();mutate(c);assert.equal(inspectContent(c).valid,false);
 }
});
test('G1D cast art may exist without an NPC but cannot reference another character variant',()=>{
 const c=content();c.cast=[{characterId:'char-local',displayName:'Caretaker',narrativeRole:'supporting',presence:'onstage'}];
 c.assets.push({assetId:'art-portrait',assetVersion:'v1',contentHash:ASSET_HASH,kind:'characterPortrait',altText:'Caretaker'});
 c.characterVisuals=[{characterId:'char-local',visualPriority:'supporting',identityNotes:'Older caretaker',fixedTraits:['older'],
  variants:[{variantId:'variant-local',assetId:'art-portrait',format:'portrait'}]}];
 c.characterAppearances=[{appearanceId:'appearance-local',characterId:'char-local',viewId:'view-room',variantId:'variant-local',
  displayMode:'portrait',showOn:'scene_enter',hideOn:'view_exit'}];
 assert.equal(inspectContent(c).valid,true);
 c.characterAppearances[0].characterId='missing-character';assert.equal(inspectContent(c).valid,false);
});
test('G1D hidden/side missions cannot block main completion or reference missing targets',()=>{
 for(const mutate of [c=>c.missions[0].kind='hidden',c=>c.missions[0].objectives[0].targetId='missing-scene',
  c=>c.missions[0].rewardRequest.items=[{itemId:'missing-item',quantity:1}]]){
  const c=content();mutate(c);assert.equal(inspectContent(c).valid,false);
 }
});
test('G1D old V0.1 example converts to a proposal without importing rights, trial or approval',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../../contracts/vangioi/source-v0.1/world_example_F.json',import.meta.url),'utf8'));
 const before=structuredClone(raw);const {content:c,notices}=proposeLegacyContent(raw,{storySource:content().storySource});
 assert.deepEqual(raw,before);assert.equal(c.schemaVersion,'world-content-1');
 assert.equal('worldId' in c,false);assert.equal('author' in c,false);assert.equal('status' in c,false);
 assert.deepEqual(Object.keys(c.entry),['entrySceneId']);
 assert.equal(c.assets.some(a=>'assetStatus' in a||'license' in a),false);
 assert.equal(validateDraftContent(c).valid,true);assert.equal(inspectContent(c).valid,false);
 c.assets.forEach(a=>{a.assetVersion='v1';a.contentHash=ASSET_HASH;});
 assert.deepEqual(inspectContent(c).errors,[]);assert.equal(notices.includes('asset-versions-required'),true);
});
test('G1D pickups must agree in both hotspot and item acquisition records',()=>{
 const c=content();
 c.items=[{itemId:'item-key',name:'Key',category:'quest',transferPolicy:'world_only',stackLimit:1,acquisitionMethods:[{type:'starting'}]}];
 c.views[0].hotspots=[{hotspotId:'hotspot-key',presentation:'text',label:'Pick up key',action:'pickup',targetId:'item-key',uniquePickupId:'pickup-key'}];
 assert.equal(inspectContent(c).valid,false);
 c.items[0].acquisitionMethods=[{type:'pickup',placeId:'place-room',viewId:'view-room',hotspotId:'hotspot-key',uniquePickupId:'pickup-key'}];
 assert.equal(inspectContent(c).valid,true);
 c.items[0].acquisitionMethods[0].uniquePickupId='different-key';assert.equal(inspectContent(c).valid,false);
});
test('G1D source resolution binds kind, existing story ID, exact version, hash and world permission',async()=>{
 for(const change of [null,{worldId:'world-other'},{grantStatus:'revoked'},{grantRevision:0},
  {storyVersion:'latest'},{contentHash:'c'.repeat(64)},{kind:'manuscript'}]){
  const r=registry();const base=r.readStorySource;
  r.readStorySource=async(...args)=>change===null?null:{...await base(...args),...change};
  const result=await createContentValidator(r)(content(),context);
  assert.equal(result.readyForReview,false);
 }
});
test('G1D asset version/hash/kind/grant/licence must match registry, never client approval labels',async()=>{
 for(const change of [null,{assetVersion:'v2'},{contentHash:'c'.repeat(64)},{kind:'itemIcon'},
  {grantStatus:'revoked'},{reviewStatus:'rejected'},{license:'unknown'},{license:'licensed',proofRef:''},{sourceNote:''}]){
  const r=registry();const base=r.readAsset;
  r.readAsset=async(...args)=>change===null?null:{...await base(...args),...change};
  assert.equal((await createContentValidator(r)(content(),context)).readyForReview,false);
 }
 const c=content();c.assets[0].assetStatus='approved';assert.equal(inspectContent(c).valid,false);
});
test('G1D missing or failing registries cannot pass review readiness',async()=>{
 for(const r of [{}, {...registry(),readAsset:async()=>{throw Error('PRIVATE_STORAGE_ERROR');}}]){
  const result=await createContentValidator(r)(content(),context);
  assert.equal(result.readyForReview,false);assert.equal(JSON.stringify(result.errors).includes('PRIVATE_STORAGE_ERROR'),false);
 }
});
test('G1D compiled validator and schemas reproduce from the unchanged V0.1 source',()=>{
 execFileSync(process.execPath,[new URL('../scripts/build-vangioi-validator.mjs',import.meta.url).pathname,'--check']);
 const text=fs.readFileSync(new URL('../src/generated/vangioi-content-validators.cjs',import.meta.url),'utf8');
 assert.equal(/new Function\(|\beval\(/.test(text),false);
});

function sqlFixture({registered=true,missingVersion=false}={}){
 const db=new DatabaseSync(':memory:');
 const hooks={beforeTx:null,count:0};
 const sql={exec(q,...args){
  const query=q.trim();let rows=[];
  if(query.startsWith('CREATE '))db.exec(query);
  else{const stmt=db.prepare(query);if(/^(SELECT|WITH)\b|\bRETURNING\b/i.test(query))rows=stmt.all(...args);else stmt.run(...args);}
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){
  hooks.count++;hooks.beforeTx?.(hooks.count);db.exec('BEGIN IMMEDIATE');
  try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const service=createSqlAuthoringService({storage,projectId:'truyendienvl',verify:async()=>({uid:USER}),now:()=>1000});
 const c=content();
 sql.exec("INSERT INTO vg_authoring_worlds_v1 VALUES(?,?,1,1,'draft','[]')",W,USER);
 sql.exec('INSERT INTO vg_authoring_drafts_v1 VALUES(?,1,?)',W,JSON.stringify(c));
 if(registered){
  const s=c.storySource;
  sql.exec('INSERT INTO vg_authoring_source_versions_v1 VALUES(?,?,?,?)',s.kind,s.storyId,s.storyVersion,s.contentHash);
  sql.exec("INSERT INTO vg_authoring_source_grants_v1 VALUES(?,?,?,?,'active',1)",W,s.kind,s.storyId,s.storyVersion);
  for(const a of c.assets){
   if(missingVersion&&a.assetId==='art-room')continue;
   sql.exec('INSERT INTO vg_authoring_asset_versions_v1 VALUES(?,?,?,?)',a.assetId,a.assetVersion,a.contentHash,a.kind);
   sql.exec("INSERT INTO vg_authoring_asset_grants_v1 VALUES(?,?,?,'active',1,'pending','original','Declared art',NULL)",W,a.assetId,a.assetVersion);
  }
 }
 return {db,sql,service,hooks,submit:()=>service.submitDraft(request(),{worldId:W,expectedRevision:1,requestId:crypto.randomUUID()}),
  state:()=>sql.exec('SELECT draft_state FROM vg_authoring_worlds_v1').toArray()[0].draft_state,
  snapshotCount:()=>sql.exec('SELECT COUNT(*) n FROM vg_authoring_submissions_v1').toArray()[0].n};
}
test('G1D SQL default validator submits a complete draft using pinned registries without a stub',async()=>{
 const f=sqlFixture();try{
  const r=await f.submit();assert.equal(r.ok,true);assert.equal(f.state(),'submitted');assert.equal(f.snapshotCount(),1);
  const stored=await f.service.viewSubmission(request(),{worldId:W,snapshotHash:r.snapshotHash});
  assert.deepEqual(stored.snapshot.content.storySource,content().storySource);
  assert.equal('dependencies' in stored.snapshot,false);
 }finally{f.db.close();}
});
test('G1D absent source or asset versions prevent locking the draft',async()=>{
 for(const options of [{registered:false},{missingVersion:true}]){
  const f=sqlFixture(options);try{
   assert.equal((await f.submit()).ok,false);assert.equal(f.state(),'draft');assert.equal(f.snapshotCount(),0);
  }finally{f.db.close();}
 }
});
test('G1D revoking source or asset rights in the final gap is rechecked inside commit',async()=>{
 for(const table of ['source','asset']){
  const f=sqlFixture();try{
   const target=f.hooks.count+2;
   f.hooks.beforeTx=n=>{if(n===target)f.sql.exec(`UPDATE vg_authoring_${table}_grants_v1 SET status='revoked',grant_revision=2`);};
   const r=await f.submit();assert.equal(r.code,'dependency-conflict');assert.equal(f.state(),'draft');assert.equal(f.snapshotCount(),0);
  }finally{f.db.close();}
 }
});
test('G1D changing registry metadata in the final gap also invalidates the prepared snapshot',async()=>{
 const f=sqlFixture();try{
  const target=f.hooks.count+2;
  f.hooks.beforeTx=n=>{if(n===target)f.sql.exec("UPDATE vg_authoring_asset_grants_v1 SET review_status='rejected'");};
  assert.equal((await f.submit()).code,'dependency-conflict');assert.equal(f.state(),'draft');
 }finally{f.db.close();}
});
test('G1D immutable version records cannot be silently replaced beneath stored references',()=>{
 const f=sqlFixture();try{
  for(const [table,column] of [['source_versions','content_hash'],['asset_versions','content_hash']]){
   assert.throws(()=>f.sql.exec(`UPDATE vg_authoring_${table}_v1 SET ${column}='changed'`),/immutable-authoring-record/);
   assert.throws(()=>f.sql.exec(`DELETE FROM vg_authoring_${table}_v1`),/immutable-authoring-record/);
  }
 }finally{f.db.close();}
});
