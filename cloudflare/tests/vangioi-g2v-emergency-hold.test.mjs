import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertG2VEmulator,createG2VEmergencyRehearsal,G2V_HOST,G2V_PROJECT}
 from '../src/vangioi-v49-emergency-hold-g2v.mjs';

const id='epub-g2v-unit';
const caseId='case-g2v-unit';
const emergency={storyId:id,caseId,authorized:true,
 operatorUid:'operator-one',rightsOfficerUid:'rights-two',
 reason:'authority-sync-unknown'};
const recovery={storyId:id,caseId,authorized:true,
 operatorUid:'operator-one',rightsOfficerUid:'rights-two',reviewerUid:'reviewer-three'};
const firestore={projectId:G2V_PROJECT,collection:()=>({}),
 runTransaction:async()=>{throw Error('should-not-write');}};
const command={storyId:id,operationId:'123e4567-e89b-42d3-a456-426614174000'};
const provider=(e=()=>emergency,r=()=>recovery)=>
 createG2VEmergencyRehearsal({firestore,emulatorHost:G2V_HOST,
  verifyEmergency:e,verifyRecovery:r});

test('G2V accepts exactly the isolated Emulator and denies credentials',()=>{
 assert.deepEqual(assertG2VEmulator({emulatorHost:G2V_HOST,projectId:G2V_PROJECT}),
  {projectId:G2V_PROJECT,emulatorHost:G2V_HOST,emulatorOnly:true});
 for(const args of [
  {emulatorHost:'localhost:8080',projectId:G2V_PROJECT},
  {emulatorHost:G2V_HOST,projectId:'truyendienvl'},
  {emulatorHost:G2V_HOST,projectId:G2V_PROJECT,credentialPath:'secret.json'},
  {emulatorHost:G2V_HOST,projectId:G2V_PROJECT,activeProjectId:'production'}
 ])assert.throws(()=>assertG2VEmulator(args),/refuses/);
});

test('G2V never accepts missing trusted verification callbacks',()=>{
 assert.throws(()=>createG2VEmergencyRehearsal({firestore,
  emulatorHost:G2V_HOST,verifyEmergency:()=>emergency}),
  /two independent trusted host decisions/);
});

for(const [label,actor] of [
 ['no dual authorizer',null],
 ['self authorizes', {...emergency,rightsOfficerUid:'operator-one'}],
 ['fake reason', {...emergency,reason:'any-book'}],
 ['wrong story', {...emergency,storyId:'epub-elsewhere'}],
 ['missing case', {...emergency,caseId:''}],
 ['unverified',{...emergency,authorized:false}]
 ]){
 test('G2V emergency refuses '+label,async()=>{
  await assert.rejects(provider(async()=>actor).emergencyHide({},command),
   /dual-approval-required/);
 });
}

for(const [label,signoff] of [
 ['same operator and reviewer',{...recovery,reviewerUid:'operator-one'}],
 ['same rights officer and reviewer',{...recovery,reviewerUid:'rights-two'}],
 ['no rights clearance',{...recovery,authorized:false}],
 ['foreign story',{...recovery,storyId:'another-book'}]
 ]){
 test('G2V recovery refuses '+label,async()=>{
  await assert.rejects(provider(undefined,async()=>signoff).recoveryReview({},{
   ...command,expectedHoldRevision:1,expectedAuthorityRevision:1}),
  /dual-approval-required/);
 });
}

test('G2V commands require valid scope and do not begin writes when malformed',async()=>{
 const host=provider();
 await assert.rejects(host.emergencyHide({},{
  ...command,operationId:'short'}),/invalid-command/);
 await assert.rejects(host.recoveryReview({},{
  ...command,expectedHoldRevision:0,expectedAuthorityRevision:1}),
  /invalid-command/);
});

test('G2V has no runtime wiring or production Rules edits',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(read('../../tools/vangioi/firebase-emulator-g2v.json')),
  {emulators:{firestore:{host:'127.0.0.1',port:18088}}});
 assert.equal('firestore' in JSON.parse(read('../../firebase.json')),false);
 const manual=read('./manual/vangioi-g2v-emergency-emulator.mjs');
 for(const marker of ['G2V_PROJECT','G2V_HOST','emergency-hidden-without-epoch',
  'guest-remains-private-after-recovery','false-restore-denied',
  'old-admin-writers-still-bypass-rules'])
  assert.ok(manual.includes(marker),marker);
 for(const path of ['../src/index.mjs','../../js/epub-production-v49.js',
  '../../security/firestore-epub-v49.rules.review'])
  assert.equal(read(path).includes('vangioi-g2v'),false);
});
