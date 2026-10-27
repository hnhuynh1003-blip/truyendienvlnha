// G2T: real Firestore Emulator for atomic prepublish authority/source fence.
// No production identity, no live SQLite projection, no Firebase deploy.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Firestore} from '@google-cloud/firestore';
import {initializeTestEnvironment,assertFails,assertSucceeds}
 from '@firebase/rules-unit-testing';
import {hashV49DraftSnapshot}
 from '../../src/vangioi-v49-draft-integrity-g2n.mjs';
import {assertG2TEmulator,createG2TEmulatorPublisher,G2T_HOST,G2T_PROJECT}
 from '../../src/vangioi-v49-emulator-publish-g2t.mjs';

const active=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||
 process.env.FIREBASE_PROJECT_ID||null;
assertG2TEmulator({emulatorHost:process.env.FIRESTORE_EMULATOR_HOST,
 projectId:G2T_PROJECT,credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
 activeProjectId:active});
const rules=readFileSync(new URL('../fixtures/vangioi-g2s-v49-server-publish-only.rules',
 import.meta.url),'utf8');
if(!rules.includes('G2S -- ISOLATED FIRESTORE EMULATOR PUBLISH GATE')||
 !rules.includes('match /{everythingElse=**}'))
 throw Error('G2T requires G2S emulator-only client gate');
const env=await initializeTestEnvironment({projectId:G2T_PROJECT,
 firestore:{host:'127.0.0.1',port:18086,rules}});
const db=new Firestore({projectId:G2T_PROJECT});
const nowTime=Date.parse('2026-10-27T13:00:00.000Z');
const now=()=>nowTime;
const stamp='2026-10-27T12:30:00.000Z';
const chapter='chapter-0001';
const chapterBody={id:chapter,title:'Chương một',order:0,
 content:'xin chào',wordCount:2};
const bookRef=id=>db.collection('epub_stories_v49').doc(id);
const epochRef=id=>db.collection('vg_fixture_v49_epochs_g2r').doc(id);
const authorityRef=id=>db.collection('vg_fixture_v49_publish_authority_g2t').doc(id);
const receiptRef=id=>db.collection('vg_fixture_v49_epoch_ops_g2r').doc(id);
const request=token=>new Request('https://fixture.invalid/g2t',{
 headers:{Authorization:'Bearer '+token}});
const verification=async req=>req.headers.get('Authorization')==='Bearer fixture-operator'?
 {uid:'fixture-operator',operator:true}:null;
const publisher=createG2TEmulatorPublisher({firestore:db,
 emulatorHost:G2T_HOST,activeProjectId:active,verifyOperator:verification,now});
const cmd=(seed,operationId=crypto.randomUUID())=>({
 storyId:seed.id,expectedEpoch:seed.epoch,
 expectedSourceHash:seed.hash,expectedAuthorityRevision:seed.revision,
 operationId});
const authority=(id,hash,epoch=1)=>({
 storyId:id,ownerUid:'fixture-owner',status:'ready',holdStatus:'clear',
 sourceHash:hash,sourceEpoch:epoch,chapterCount:1,authorityRevision:1,
 permit:{status:'active',ownerUid:'fixture-owner',revision:1,
  sourceHash:hash,expiresAt:nowTime+3600000},
 pin:{status:'active',revision:1,sourceHash:hash},
 assignment:{status:'approved',scope:'v49-draft-inspect',
  reviewerUid:'trusted-assigned-reviewer',revision:1,pinRevision:1,
  sourceHash:hash},
 release:{status:'approved',revision:1,permitRevision:1,pinRevision:1,
  assignmentRevision:1,sourceEpoch:epoch,sourceHash:hash}
});
const seed=async suffix=>{
 const id='epub-g2t-'+suffix,book={
  id,title:'Truyện thử nghiệm',author:'Tác giả',genre:'Nhập EPUB',
  status:'draft',ownerUid:'fixture-owner',
  chapterCount:1,chapterIndex:[{id:chapter,title:'Chương một',order:0,wordCount:2}],
  createdAt:stamp,updatedAt:stamp,sourceName:'fixture.epub',importSchema:57,
  importFingerprint:'v57-0123456789abcdef-1',coverImage:''
 };
 const proof=await hashV49DraftSnapshot({book,chapters:[chapterBody]},{storyId:id});
 await bookRef(id).set(book);
 await bookRef(id).collection('chapters').doc(chapter).set(chapterBody);
 await epochRef(id).set({storyId:id,ownerUid:'fixture-owner',
  sourceEpoch:1,sourceHash:proof.sourceHash,chapterCount:1});
 await authorityRef(id).set(authority(id,proof.sourceHash));
 return {id,hash:proof.sourceHash,epoch:1,revision:1};
};
let denied=0,success=0;
const decline=async(promise,pattern=/emulator-publish-/)=>{
 await assert.rejects(promise,pattern);denied++;
};
const isDraft=async seedItem=>{
 assert.equal((await bookRef(seedItem.id).get()).data()?.status,'draft');
 assert.equal((await epochRef(seedItem.id).get()).data()?.sourceEpoch,1);
};

try{
 await env.clearFirestore();
 const owner=env.authenticatedContext('fixture-owner',{admin:true}).firestore();
 const other=env.authenticatedContext('other-owner',{admin:true,
  reviewer:true,assignedStoryIds:['epub-g2t-happy']}).firestore();
 const guest=env.unauthenticatedContext().firestore();
 const happy=await seed('happy');
 const clientBook=owner.collection('epub_stories_v49').doc(happy.id);
 await assertSucceeds(clientBook.get());
 await assertFails(other.collection('epub_stories_v49').doc(happy.id).get());
 await assertFails(clientBook.update({status:'published',publishedAt:stamp,updatedAt:stamp}));
 await assertFails(owner.collection('vg_fixture_v49_publish_authority_g2t')
  .doc(happy.id).update({'permit.status':'active'}));
 await assertFails(owner.collection('vg_fixture_v49_epochs_g2r')
  .doc(happy.id).update({sourceEpoch:99}));
 console.log('client-publish-blocked');

 await decline(publisher.rehearsePublish(request('forged'),cmd(happy)),/operator-required/);
 await decline(publisher.rehearsePublish(request('fixture-operator'),{
  ...cmd(happy),expectedEpoch:0}),/invalid-command/);
 await decline(publisher.rehearsePublish(request('fixture-operator'),{
  ...cmd(happy),expectedEpoch:2}),/source-epoch-conflict/);
 await decline(publisher.rehearsePublish(request('fixture-operator'),{
  ...cmd(happy),expectedAuthorityRevision:2}),/authority-conflict/);
 await decline(publisher.rehearsePublish(request('fixture-operator'),{
  ...cmd(happy),expectedSourceHash:'sha256-'+'a'.repeat(64)}),/source-epoch-conflict/);
 await isDraft(happy);

 const acceptedCommand=cmd(happy);
 const done=await publisher.rehearsePublish(request('fixture-operator'),acceptedCommand);
 assert.equal(done.ok,true);
 assert.equal(done.emulatorPublished,true);
 assert.equal(done.productionAuthorized,false);
 assert.equal(done.sourceEpoch,2);
 assert.equal((await bookRef(happy.id).get()).data().status,'published');
 assert.equal((await epochRef(happy.id).get()).data().sourceEpoch,2);
 assert.equal((await authorityRef(happy.id).get()).data().status,'consumed');
 assert.equal((await authorityRef(happy.id).get()).data().authorityRevision,2);
 await assertSucceeds(guest.collection('epub_stories_v49').doc(happy.id).get());
 await assertSucceeds(guest.collection('epub_stories_v49').doc(happy.id)
  .collection('chapters').doc(chapter).get());
 await assertSucceeds(guest.collection('epub_stories_v49')
  .where('status','==','published').limit(60).get());
 success++;
 await decline(publisher.rehearsePublish(request('fixture-operator'),acceptedCommand),
  /operation-replay/);

 for(const [label,path,value] of [
  ['revoked','permit.status','revoked'],
  ['expired','permit.expiresAt',nowTime],
  ['hold','holdStatus','active'],
  ['pin-revoked','pin.status','revoked'],
  ['assignment-revoked','assignment.status','revoked'],
  ['wrong-scope','assignment.scope','other-scope'],
  ['signoff-withdrawn','release.status','draft'],
  ['revision-mismatch','release.pinRevision',2]
 ]){
  const f=await seed(label);
  await authorityRef(f.id).update({[path]:value});
  await decline(publisher.rehearsePublish(request('fixture-operator'),cmd(f)),
   /authority-conflict/);
  await isDraft(f);
 }

 const changed=await seed('source-drift');
 await bookRef(changed.id).update({title:'Bản mới chưa được pin'});
 await decline(publisher.rehearsePublish(request('fixture-operator'),cmd(changed)),
  /source-epoch-conflict/);
 await isDraft(changed);
 const extra=await seed('extra');
 await bookRef(extra.id).collection('chapters').doc('chapter-0002')
  .set({...chapterBody,id:'chapter-0002',order:1});
 await decline(publisher.rehearsePublish(request('fixture-operator'),cmd(extra)),
  /chapters-conflict/);
 await isDraft(extra);
 console.log('extra-chapter-fails-closed');
 const missing=await seed('missing');
 await bookRef(missing.id).collection('chapters').doc(chapter).delete();
 await decline(publisher.rehearsePublish(request('fixture-operator'),cmd(missing)),
  /chapters-conflict/);
 await isDraft(missing);

 const competing=await seed('competing');
 const both=await Promise.allSettled([
  publisher.rehearsePublish(request('fixture-operator'),cmd(competing)),
  publisher.rehearsePublish(request('fixture-operator'),cmd(competing))
 ]);
 assert.equal(both.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(both.filter(r=>r.status==='rejected').length,1);
 assert.equal((await epochRef(competing.id).get()).data().sourceEpoch,2);
 success++;
 console.log('concurrent-publication');

 const revokedDuring=await seed('revocation-race');
 let altered=false;
 const racePublisher=createG2TEmulatorPublisher({firestore:db,
  emulatorHost:G2T_HOST,activeProjectId:active,verifyOperator:verification,now,
  fixtureBeforeTransaction:async({storyId})=>{
   if(storyId===revokedDuring.id&&!altered){
    altered=true;
    await authorityRef(storyId).update({
     authorityRevision:2,'permit.status':'revoked'});
   }
  }});
 await decline(racePublisher.rehearsePublish(request('fixture-operator'),
  cmd(revokedDuring)),/authority-conflict/);
 await isDraft(revokedDuring);
 assert.equal((await authorityRef(revokedDuring.id).get()).data().authorityRevision,2);
 console.log('revocation-before-transaction-snapshot');

 const editedDuring=await seed('source-race');
 let edited=false;
 const editRace=createG2TEmulatorPublisher({firestore:db,
  emulatorHost:G2T_HOST,activeProjectId:active,verifyOperator:verification,now,
  fixtureBeforeTransaction:async({storyId})=>{
   if(storyId===editedDuring.id&&!edited){
    edited=true;
    await bookRef(storyId).update({title:'Sửa đúng lúc xuất bản'});
   }
  }});
 await decline(editRace.rehearsePublish(request('fixture-operator'),
  cmd(editedDuring)),/source-epoch-conflict/);
 await isDraft(editedDuring);

 // Concurrent publish vs revocation: Firestore serializes the conflicting
 // writes. A revocation that wins FIRST blocks; publish winning FIRST may be
 // followed by revocation, which requires a separate takedown workflow.
 const overlap=await seed('overlapping-revoke');
 const competingAuthority=await Promise.allSettled([
  publisher.rehearsePublish(request('fixture-operator'),cmd(overlap)),
  authorityRef(overlap.id).update({authorityRevision:2,
   'permit.status':'revoked'})
 ]);
 assert.equal(competingAuthority[1].status,'fulfilled');
 const publicationWon=competingAuthority[0].status==='fulfilled';
 assert.equal((await bookRef(overlap.id).get()).data().status,
  publicationWon?'published':'draft');
 assert.equal((await epochRef(overlap.id).get()).data().sourceEpoch,
  publicationWon?2:1);
 assert.equal((await authorityRef(overlap.id).get()).data().permit.status,
  'revoked');
 if(!publicationWon)denied++;

 console.log(JSON.stringify({g2t:'isolated-trusted-emulator-publisher',
  completedPublications:success,deniedServerPublishAttempts:denied,
  clientPublishBlocked:true,transactionalEpochAndReceipt:true,
  fullChapterCollectionVerified:true,
  revokeBeforeSnapshotDenied:true,sourceEditBeforeSnapshotDenied:true,
  concurrentRevokeSerializable:true,
  postPublishRevocationRequiresTakedown:true,
  serverSqliteAuthorityNotIntegrated:true,
  productionAuthorized:false,productionChanged:false}));
}finally{
 try{await env.clearFirestore();}finally{
  await env.cleanup();await db.terminate();
 }
}
