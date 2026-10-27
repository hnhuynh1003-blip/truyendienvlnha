import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {inspectContent} from '../src/vangioi-content.mjs';
import {analyzeG3BMobileAssets,g3bCoverCrop,g3bObservationFromPng,
 G3B_MOBILE_ASSET_VERSION,G3B_VIEWPORTS} from '../src/vangioi-mobile-assets-g3b.mjs';

const errors=r=>r.issues.map(i=>i.code);
const obs=(asset,width=1920,height=1080,rest={})=>({
 assetId:asset.assetId,assetVersion:asset.assetVersion,contentHash:asset.contentHash,
 width,height,format:'png',...rest
});
const both=(c,extra={})=>c.assets.map(a=>obs(a,1920,1080,extra));

test('G3B does not pretend metadata-only world passed image/device QA',()=>{
 const c=content(),before=structuredClone(c),r=analyzeG3BMobileAssets(c);
 assert.equal(r.analyzerVersion,G3B_MOBILE_ASSET_VERSION);
 assert.equal(r.inputValid,true);
 assert.equal(r.status,'needs-device-review');
 assert.equal(r.canPublish,false);
 assert.equal(r.deviceVerified,false);
 assert.equal(r.rightsVerified,false);
 assert.equal(r.renderedAssetCount,2);
 assert.equal(r.unmeasuredAssetCount,2);
 assert.equal(errors(r).filter(code=>code==='rendered-asset-unmeasured').length,2);
 assert.deepEqual(c,before);
 assert.deepEqual(G3B_VIEWPORTS.slice(0,4).map(v=>v.width),[320,375,390,430]);
});

test('G3B observation coverage is limited to referenced art; no quota for other assets',()=>{
 const c=content();
 c.assets.push({assetId:'art-unused',assetVersion:'v2',contentHash:'c'.repeat(64),
  kind:'itemIcon',altText:'An unassigned item icon'});
 const r=analyzeG3BMobileAssets(c,{assetObservations:both(c).slice(0,2)});
 assert.equal(r.inputValid,true);
 assert.equal(r.renderedAssetCount,2);
 assert.equal(r.observedAssetCount,2);
 assert.equal(r.unmeasuredAssetCount,0);
 assert.equal(errors(r).includes('rendered-asset-unmeasured'),false);
});

test('G3B precise object-fit cover math preserves aspect and normalizes crop',()=>{
 const mobile=g3bCoverCrop(1600,900,{width:320,height:568});
 assert.ok(mobile.bounds[0]>0.34&&mobile.bounds[0]<0.35);
 assert.ok(mobile.bounds[2]>0.65&&mobile.bounds[2]<0.66);
 assert.equal(mobile.bounds[1],0);
 assert.equal(mobile.bounds[3],1);
 const desktop=g3bCoverCrop(1600,900,{width:1280,height:720});
 assert.deepEqual(desktop.bounds,[0,0,1,1]);
 assert.equal(desktop.upscaled,false);
});

test('G3B flags manually marked essential background region cropped on all four phones',()=>{
 const c=content(),s=obs(c.assets[1],1920,1080,{importantRegions:[
  {regionId:'entrance',bounds:[0.03,0.3,0.12,0.6]}
 ]});
 const r=analyzeG3BMobileAssets(c,{assetObservations:[obs(c.assets[0]),s]});
 const finding=r.issues.find(x=>x.code==='important-region-cropped');
 assert.deepEqual(finding.affectedViewports,
  ['mobile-320','mobile-375','mobile-390','mobile-430']);
 assert.equal(finding.regionId,'entrance');
 assert.equal(r.canPublish,false);
});

test('G3B focalPoint can preserve a left-side landmark without rewriting art',()=>{
 const c=content();
 c.assets[1].focalPoint=[0,0.5];
 const annotations={importantRegions:[{regionId:'door',bounds:[0.04,0.3,0.11,0.6]}]};
 const result=analyzeG3BMobileAssets(c,{assetObservations:[
  obs(c.assets[0]),obs(c.assets[1],1920,1080,annotations)
 ]});
 assert.equal(errors(result).includes('important-region-cropped'),false);
 assert.equal(result.annotatedBackgroundCount,1);
 assert.equal(result.deviceVerified,false);
});

test('G3B marks image upscaling as review, not an imposed grade F-S quota',()=>{
 const c=content();
 const r=analyzeG3BMobileAssets(c,{assetObservations:[
  obs(c.assets[0]),obs(c.assets[1],200,150)
 ]});
 assert.ok(errors(r).includes('image-small-for-mobile-preview'));
 assert.ok(errors(r).includes('preview-image-upscaled'));
 assert.equal(r.inputValid,true);
 assert.equal(r.status,'needs-device-review');
});

test('G3B handles a text-only view without requiring an invented view illustration',()=>{
 const c=content();
 c.views[0].kind='text_only';delete c.views[0].assetId;
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3BMobileAssets(c,{assetObservations:both(c)});
 assert.equal(r.renderedAssetCount,2);
 assert.equal(errors(r).includes('rendered-asset-unmeasured'),false);
});

test('G3B reviews same background reused across distinct places without rejecting it',()=>{
 const c=content();
 c.maps[0].placeIds.push('place-attic');
 c.places.push({placeId:'place-attic',mapId:'map-room',name:'Attic',
  sceneIds:['scene-attic']});
 c.scenes.push({sceneId:'scene-attic',placeId:'place-attic',
  backgroundAssetId:'art-room',summary:'Upper room',viewIds:['view-attic'],
  transitions:[]});
 c.views.push({viewId:'view-attic',sceneId:'scene-attic',kind:'wide',
  assetId:'art-room',hotspots:[]});
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3BMobileAssets(c,{assetObservations:both(c)});
 assert.ok(errors(r).includes('shared-background-across-places-needs-review'));
 assert.equal(r.canPublish,false);
});

test('G3B reviews using world cover as an in-game view asset',()=>{
 const c=content();c.views[0].assetId='art-cover';
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3BMobileAssets(c,{assetObservations:both(c)});
 assert.ok(errors(r).includes('world-cover-reused-as-scene-needs-review'));
});

test('G3B demands manual hotspot overlay placement checks; no fabricated coordinates',()=>{
 const c=content();
 c.views[0].hotspots=[{hotspotId:'hotspot-room',presentation:'hotspot_overlay',
  label:'Look at the room',action:'move',targetId:'scene-room'}];
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3BMobileAssets(c,{assetObservations:both(c)});
 assert.ok(errors(r).includes('hotspot-overlay-mobile-placement-unverified'));
 assert.ok(r.manualReview.includes('device-layout-and-tap-targets'));
});

test('G3B considers only used character appearance sprite, not the entire cast',()=>{
 const c=content();
 c.cast=[{characterId:'char-elder',displayName:'Elder',
  narrativeRole:'supporting',presence:'onstage'}];
 c.assets.push({assetId:'art-elder',assetVersion:'v1',contentHash:'d'.repeat(64),
  kind:'characterSprite',altText:'Elder standing'});
 c.characterVisuals=[{characterId:'char-elder',visualPriority:'supporting',
  identityNotes:'Elder',fixedTraits:['Elderly'],variants:[
   {variantId:'look-elder',assetId:'art-elder',format:'sprite'}]}];
 c.characterAppearances=[{appearanceId:'appear-elder',characterId:'char-elder',
  viewId:'view-room',variantId:'look-elder',displayMode:'sprite',
  showOn:'scene_enter',hideOn:'view_exit',
  position:{anchor:'right',x:0.8,y:0.7,scale:0.9}}];
 assert.equal(inspectContent(c).valid,true);
 const r=analyzeG3BMobileAssets(c,{assetObservations:[
  ...both(c).slice(0,2),obs(c.assets[2],800,1200,{hasAlpha:false})
 ]});
 assert.equal(r.renderedAssetCount,3);
 assert.ok(errors(r).includes('sprite-no-alpha-in-observation'));
 assert.ok(errors(r).includes('sprite-fallback-text-needs-review'));
 assert.ok(!errors(r).includes('rendered-asset-unmeasured'));
});

test('G3B rejects stale hash, unknown asset and duplicate evidence before QA',()=>{
 const c=content(),a=obs(c.assets[1]);
 const stale=analyzeG3BMobileAssets(c,{assetObservations:[{...a,contentHash:'0'.repeat(64)}]});
 assert.equal(stale.status,'invalid-evidence');
 assert.deepEqual(errors(stale),['asset-observation-invalid']);
 const duplicate=analyzeG3BMobileAssets(c,{assetObservations:[a,a]});
 assert.equal(duplicate.status,'invalid-evidence');
 const unknown=analyzeG3BMobileAssets(c,{assetObservations:[{...a,assetId:'art-unknown'}]});
 assert.equal(unknown.status,'invalid-evidence');
});

test('G3B rejects hostile or malformed metadata without leaking story prose',()=>{
 const c=content(),bad=obs(c.assets[1]);
 bad.importantRegions=[{regionId:'door',bounds:[0.9,0.2,0.1,0.8]}];
 assert.equal(analyzeG3BMobileAssets(c,{assetObservations:[bad]}).status,'invalid-evidence');
 const trapped={};Object.defineProperty(trapped,'width',{get(){throw Error('secret');}});
 const no=analyzeG3BMobileAssets(c,{assetObservations:[trapped]});
 assert.equal(no.status,'analysis-budget-or-evidence-invalid');
 c.story.secretTruth={private:'HIDDEN_G3B_SECRET'};
 const invalid=analyzeG3BMobileAssets(c);
 assert.equal(invalid.status,'invalid-content');
 assert.ok(!JSON.stringify(invalid).includes('HIDDEN_G3B_SECRET'));
});

test('G3B matches hash and dimensions of local PNG bytes without granting rights',async()=>{
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgkjP6DwAB6gFaZRSBGgAAAABJRU5ErkJggg==','base64');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const a={assetId:'art-png',assetVersion:'v1',contentHash:hash};
 const o=await g3bObservationFromPng(a,bytes);
 assert.equal(o.width,1);
 assert.equal(o.height,1);
 assert.equal(o.format,'png');
 assert.equal(o.contentHash,hash);
 await assert.rejects(g3bObservationFromPng({...a,contentHash:'a'.repeat(64)},bytes),
  /g3b-pin-mismatch/);
 await assert.rejects(g3bObservationFromPng(a,new Uint8Array([0])),/invalid-image/);
});

test('G3B remains an offline sidecar; no production route/reward/publish authority',()=>{
 const source=readFileSync(new URL('../src/vangioi-mobile-assets-g3b.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.equal(worker.includes('vangioi-mobile-assets-g3b'),false);
 assert.equal(source.includes('eval('),false);
 assert.equal(source.includes('new Function('),false);
 assert.equal(source.includes('firestore.collection('),false);
 const r=analyzeG3BMobileAssets(content());
 assert.equal(r.productionAuthorized,false);
 assert.equal(r.canPublish,false);
 assert.equal(r.deviceVerified,false);
});
