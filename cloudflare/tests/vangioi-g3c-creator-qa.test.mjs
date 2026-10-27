import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {content} from './fixtures/vangioi-content.mjs';
import {inspectCreatorQa,parseDraft} from '../../js/vangioi-creator-validation-entry.mjs';

const codes=list=>(list||[]).map(x=>x.code);
const evidence=(a,regions=[])=>({
 assetId:a.assetId,assetVersion:a.assetVersion,contentHash:a.contentHash,
 width:1920,height:1080,format:'png',importantRegions:regions
});

test('G3C single existing check combines G1D, G3A and G3B without publish authority',()=>{
 const c=content(),snapshot=structuredClone(c);
 const r=inspectCreatorQa(c);
 assert.equal(r.valid,true);
 assert.equal(r.qaStatus,'needs-engine-and-device-review');
 assert.equal(r.canPublish,false);
 assert.equal(r.engineVerified,false);
 assert.equal(r.deviceVerified,false);
 assert.equal(r.productionAuthorized,false);
 assert.equal(r.reachability.profiles.length,1);
 assert.equal(r.reachability.profiles[0].possibleSceneCount,1);
 assert.equal(r.reachability.canPublish,false);
 assert.equal(r.mobileAssets.unmeasuredAssetCount,2);
 assert.equal(r.mobileAssets.rightsVerified,false);
 assert.deepEqual(c,snapshot);
});

test('G3C complete Creator form without optional visual collections still runs mobile QA',()=>{
 const c=content();
 delete c.characterVisuals;
 delete c.characterAppearances;
 const result=inspectCreatorQa(c);
 assert.equal(result.valid,true);
 assert.equal(result.qaStatus,'needs-engine-and-device-review');
 assert.equal(result.mobileAssets.status,'needs-device-review');
 assert.equal(result.mobileAssets.unmeasuredAssetCount,2);
 assert.equal(result.canPublish,false);
});

test('G3C partial, malformed or schema-invalid drafts short-circuit before QA',()=>{
 const partial={schemaVersion:'world-content-1',story:{secretTruth:'G3C_TOP_SECRET'}};
 assert.equal(parseDraft(JSON.stringify(partial)).ok,true);
 const r=inspectCreatorQa(partial);
 assert.equal(r.valid,false);
 assert.equal(r.qaStatus,'fix-structure-first');
 assert.equal(r.reachability,null);
 assert.equal(r.mobileAssets,null);
 assert.ok(!JSON.stringify(r).includes('G3C_TOP_SECRET'));
});

test('G3C per-profile paths are retained for unreachable main scene',()=>{
 const c=content();
 c.maps[0].placeIds.push('place-back');
 c.places.push({placeId:'place-back',mapId:'map-room',
  name:'Another room',sceneIds:['scene-back']});
 c.scenes.push({sceneId:'scene-back',placeId:'place-back',
  backgroundAssetId:'art-room',summary:'A second room',
  viewIds:['view-back'],transitions:[]});
 c.views.push({viewId:'view-back',sceneId:'scene-back',kind:'wide',
  assetId:'art-room',hotspots:[]});
 c.missions[0].objectives[0].targetId='scene-back';
 const r=inspectCreatorQa(c);
 assert.equal(r.valid,true);
 assert.ok(codes(r.reachability.issues).includes('main-objective-no-declared-source'));
 assert.ok(r.reachability.issues.some(x=>x.entryPath==='/playerEntryProfiles/0'));
});

test('G3C uses pinned observation to flag mobile crop and avoids any image writes',()=>{
 const c=content();
 const r=inspectCreatorQa(c,{assetObservations:[
  evidence(c.assets[0]),evidence(c.assets[1],[
   {regionId:'door',bounds:[0.04,0.2,0.12,0.6]}
  ])
 ]});
 assert.equal(r.valid,true);
 assert.equal(r.mobileAssets.unmeasuredAssetCount,0);
 assert.ok(codes(r.mobileAssets.issues).includes('important-region-cropped'));
 assert.equal(r.mobileAssets.deviceVerified,false);
 assert.equal(r.canPublish,false);
});

test('G3C wrong pin or duplicate metadata remains invalid preview, no silent fallback to pass',()=>{
 const c=content();
 const forged=evidence(c.assets[1]);forged.contentHash='0'.repeat(64);
 const r=inspectCreatorQa(c,{assetObservations:[forged]});
 assert.equal(r.valid,true);
 assert.equal(r.mobileAssets.status,'invalid-evidence');
 assert.ok(codes(r.mobileAssets.issues).includes('asset-observation-invalid'));
 assert.equal(r.canPublish,false);
});

test('G3C returns code/path only; no private Story Bible or NPC dialogue in report',()=>{
 const c=content();
 c.story.secretTruth='G3C_PRIVATE_CANON_SECRET';
 const r=inspectCreatorQa(c);
 assert.equal(r.valid,true);
 assert.ok(!JSON.stringify(r).includes('G3C_PRIVATE_CANON_SECRET'));
});

test('G3C browser entry cannot import live Worker / server writers',()=>{
 const entry=readFileSync(new URL('../../js/vangioi-creator-validation-entry.mjs',import.meta.url),'utf8');
 const bundle=readFileSync(new URL('../../js/vangioi-creator-validation.js',import.meta.url),'utf8');
 const creator=readFileSync(new URL('../../js/vangioi-creator.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.ok(entry.includes('analyzeG3AReachability'));
 assert.ok(entry.includes('analyzeG3BMobileAssets'));
 assert.ok(bundle.includes('inspectCreatorQa'));
 assert.ok(creator.includes('V.inspectCreatorQa(model,{assetObservations:artObservations()})'));
 assert.ok(!entry.includes('from ../cloudflare/src/index.mjs'));
 assert.ok(!worker.includes('vangioi-mobile-assets-g3b'));
 assert.ok(!worker.includes('vangioi-reachability-g3a'));
});
