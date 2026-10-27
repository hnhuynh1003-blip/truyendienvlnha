import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertG2WNoEmergencyHold,createG2WGuardedPublisher}
 from '../src/vangioi-v49-guarded-publisher-g2w.mjs';
import {G2V_PROJECT,G2V_HOST}
 from '../src/vangioi-v49-emergency-hold-g2v.mjs';

const storyId='epub-g2w-test';
const command=()=>({storyId,expectedEpoch:1,
 expectedSourceHash:'sha256-'+'f'.repeat(64),expectedAuthorityRevision:1,
 operationId:'771753e8-50f6-4b6a-860a-e286c6aa33d1'});
const ref=path=>({path,collection:sub=>ref(path+'/'+sub)});
const firestore=(holdExists=false)=>({
 projectId:G2V_PROJECT,
 collection:coll=>({doc:id=>ref(coll+'/'+id)}),
 runTransaction:async callback=>callback({get:async r=>({
  exists:r.path.startsWith('vg_fixture_v49_emergency_holds_g2v/')?
   holdExists:false
 })})
});
const verified=async(_request,{storyId,intent})=>({
 uid:'fixture-publisher',publisher:true,storyId,intent
});
const create=(args={})=>createG2WGuardedPublisher({
 firestore:firestore(),emulatorHost:G2V_HOST,verifyPublisher:verified,...args
});

test('G2W denies any present hold, including malformed and review-ready',()=>{
 for(const status of ['held','review-ready','released','nonsense']){
  assert.throws(()=>assertG2WNoEmergencyHold({exists:true,data:()=>({status})}),
   /emergency-hold/);
 }
});
test('G2W fails closed when hold read is absent or unreadable',()=>{
 assert.throws(()=>assertG2WNoEmergencyHold(null),/hold-unreadable/);
 assert.throws(()=>assertG2WNoEmergencyHold({}),/hold-unreadable/);
 assert.equal(assertG2WNoEmergencyHold({exists:false}),true);
});
test('G2W refuses live database, other project, or other localhost port',()=>{
 assert.throws(()=>create({firestore:{...firestore(),projectId:'truyendienvl'}}),
  /nonlocal\/cross-project/);
 assert.throws(()=>create({emulatorHost:'127.0.0.1:8080'}),/nonlocal/);
 assert.throws(()=>create({activeProjectId:'truyendienvl'}),/nonlocal/);
 assert.throws(()=>create({credentialPath:'/secrets/key.json'}),/nonlocal/);
});
test('G2W requires trusted callbacks and Firestore transaction support',()=>{
 assert.throws(()=>create({verifyPublisher:null}),/trusted local publisher/);
 assert.throws(()=>create({firestore:{projectId:G2V_PROJECT}}),/trusted local publisher/);
});
test('G2W rejects forged request even with a syntactically valid operation',async()=>{
 const writer=create({verifyPublisher:async()=>null});
 await assert.rejects(writer.publishDraft({},command()),/publisher-required/);
});
test('G2W publisher identity must match story and operation intent',async()=>{
 const writer=create({verifyPublisher:async()=>({
  uid:'fixture-publisher',publisher:true,storyId:'epub-elsewhere',intent:'publish'
 })});
 await assert.rejects(writer.publishDraft({},command()),/publisher-required/);
 await assert.rejects(writer.restoreAfterHold({},command()),/publisher-required/);
});
test('G2W refuses client-like invalid, replay-prone or weak command IDs',async()=>{
 const writer=create();
 for(const change of [{storyId:'bad/path'},{expectedEpoch:0},
  {expectedSourceHash:'weak'},{expectedAuthorityRevision:0},
  {operationId:'same-token'}])
  await assert.rejects(writer.publishDraft({}, {...command(),...change}),
   /invalid-command/);
});
test('G2W both public-write entry points consult the hold in one transaction',async()=>{
 const paths=[];
 const db=firestore(true);
 db.runTransaction=async fn=>fn({get:async r=>{
  paths.push(r.path);
  return {exists:r.path.startsWith('vg_fixture_v49_emergency_holds_g2v/')};
 }});
 const writer=create({firestore:db});
 await assert.rejects(writer.publishDraft({},command()),/emergency-hold/);
 await assert.rejects(writer.restoreAfterHold({},command()),/emergency-hold/);
 assert.equal(paths.filter(x=>x==='vg_fixture_v49_emergency_holds_g2v/'+storyId).length,2);
});
test('G2W restore is blocked even without a hold: G2V review-ready is no grant',async()=>{
 await assert.rejects(create().restoreAfterHold({},command()),
  /independent-restore-release-required/);
});
test('G2W refuses missing source records and cannot publish based on owner claims',async()=>{
 await assert.rejects(create().publishDraft({},command()),/source-unavailable/);
});
test('G2W fails closed on errors in the fixture pre-transaction hook',async()=>{
 const writer=create({fixtureBeforeTransaction:async()=>{throw Error('fixture-broken');}});
 await assert.rejects(writer.publishDraft({},command()),/fixture-broken/);
});
test('G2W exports no production authorizations or real publishing wiring',()=>{
 const src=readFileSync(new URL('../src/vangioi-v49-guarded-publisher-g2w.mjs',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.ok(!worker.includes('vangioi-v49-guarded-publisher-g2w'));
 assert.ok(!src.includes('admin.firestore()'));
 assert.ok(!src.includes('process.env.GOOGLE_APPLICATION_CREDENTIALS'));
 assert.ok(src.includes('productionAuthorized:false'));
 assert.ok(!src.includes('grantRole('));
});
