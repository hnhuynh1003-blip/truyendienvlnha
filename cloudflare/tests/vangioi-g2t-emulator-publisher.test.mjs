import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertG2TEmulator,assertG2TPublishAuthority,
 createG2TEmulatorPublisher,G2T_HOST,G2T_PROJECT}
 from '../src/vangioi-v49-emulator-publish-g2t.mjs';

const storyId='epub-g2t-unit';
const uid='test-owner';
const sourceHash='sha256-'+'a'.repeat(64);
const source={ownerUid:uid,sourceHash,chapterCount:1};
const epoch={sourceEpoch:5};
const ready={
 storyId,ownerUid:uid,status:'ready',holdStatus:'clear',
 sourceHash,sourceEpoch:5,chapterCount:1,authorityRevision:3,
 permit:{status:'active',revision:4,ownerUid:uid,sourceHash,expiresAt:10000},
 pin:{status:'active',revision:6,sourceHash},
 assignment:{status:'approved',scope:'v49-draft-inspect',reviewerUid:'reviewer-one',
  revision:2,pinRevision:6,sourceHash},
 release:{status:'approved',revision:7,permitRevision:4,
  pinRevision:6,assignmentRevision:2,sourceEpoch:5,sourceHash}
};
const validate=a=>assertG2TPublishAuthority(a,{
 storyId,source,epoch,expectedRevision:3,now:9000});
const copy=()=>structuredClone(ready);

test('G2T accepts only the fully aligned server projection',()=>{
 assert.deepEqual(validate(copy()),{permitRevision:4,pinRevision:6,
  assignmentRevision:2,releaseRevision:7});
});

for(const [label,change] of [
 ['revoked permit',a=>a.permit.status='revoked'],
 ['expired permit',a=>a.permit.expiresAt=9000],
 ['foreign owner',a=>a.ownerUid='foreign'],
 ['notice hold',a=>a.holdStatus='active'],
 ['mismatched source hash',a=>a.sourceHash='sha256-'+'b'.repeat(64)],
 ['mismatched source epoch',a=>a.sourceEpoch=6],
 ['invalid source pin',a=>a.pin.status='revoked'],
 ['revoked reviewer',a=>a.assignment.status='revoked'],
 ['stale assignment pin revision',a=>a.assignment.pinRevision=5],
 ['wrong reviewer scope',a=>a.assignment.scope='publisher'],
 ['missing release signoff',a=>a.release.status='draft'],
 ['permit revision mismatch',a=>a.release.permitRevision=3],
 ['reviewer revision mismatch',a=>a.release.assignmentRevision=1],
 ['release bound to stale epoch',a=>a.release.sourceEpoch=4],
 ['schema pollution invalid projection',a=>a.permit=null]
]){
 test('G2T fails closed for '+label,()=>{
  const a=copy();change(a);assert.throws(()=>validate(a),
   /emulator-publish-authority-conflict/);
 });
}

test('G2T rejects real hosts, credential paths and cross-project selection',()=>{
 assert.deepEqual(assertG2TEmulator({emulatorHost:G2T_HOST,projectId:G2T_PROJECT}),
  {projectId:G2T_PROJECT,emulatorHost:G2T_HOST,emulatorOnly:true});
 for(const args of [
  {emulatorHost:'localhost:8080',projectId:G2T_PROJECT},
  {emulatorHost:G2T_HOST,projectId:'truyendienvl'},
  {emulatorHost:G2T_HOST,projectId:G2T_PROJECT,credentialPath:'secret.json'},
  {emulatorHost:G2T_HOST,projectId:G2T_PROJECT,activeProjectId:'real-project'}
 ])assert.throws(()=>assertG2TEmulator(args),/refuses/);
});

test('G2T publisher requires trusted server callbacks and never honors a client body role',async()=>{
 const db={projectId:G2T_PROJECT,collection:()=>({}),runTransaction:async()=>{throw Error('must-not-enter-tx');}};
 assert.throws(()=>createG2TEmulatorPublisher({firestore:db,
  emulatorHost:G2T_HOST}),/trusted fixture transaction host/);
 const publisher=createG2TEmulatorPublisher({firestore:db,
  emulatorHost:G2T_HOST,verifyOperator:async()=>null});
 const command={storyId,expectedEpoch:5,expectedSourceHash:sourceHash,
  expectedAuthorityRevision:3,operationId:'123e4567-e89b-42d3-a456-426614174000'};
 await assert.rejects(publisher.rehearsePublish({operator:true},command),
  /operator-required/);
 await assert.rejects(publisher.rehearsePublish({},{
  ...command,expectedEpoch:0}),/invalid-command/);
});

test('G2T files are not routed to live Firebase or Cloudflare',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(read('../../tools/vangioi/firebase-emulator-g2t.json')),
  {emulators:{firestore:{host:'127.0.0.1',port:18086}}});
 assert.equal('firestore' in JSON.parse(read('../../firebase.json')),false);
 const manual=read('./manual/vangioi-g2t-publish-emulator.mjs');
 for(const part of ['G2T_HOST','G2T_PROJECT','client-publish-blocked',
  'concurrent-publication','revocation-before-transaction-snapshot',
  'extra-chapter-fails-closed','serverSqliteAuthorityNotIntegrated:true'])
  assert.ok(manual.includes(part),part);
 for(const path of ['../src/index.mjs','../../js/epub-production-v49.js',
  '../../security/firestore-epub-v49.rules.review'])
  assert.equal(read(path).includes('vangioi-g2t'),false,path);
});
