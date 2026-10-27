// G2W: actual local G2V Firestore Emulator, G2S candidate Rules, fake books.
// No SQLite source, Firebase prod/staging, server IAM or release capability.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Firestore} from '@google-cloud/firestore';
import {initializeTestEnvironment,assertFails,assertSucceeds}
 from '@firebase/rules-unit-testing';
import {hashV49DraftSnapshot}
 from '../../src/vangioi-v49-draft-integrity-g2n.mjs';
import {createG2WGuardedPublisher}
 from '../../src/vangioi-v49-guarded-publisher-g2w.mjs';
import {createG2VEmergencyRehearsal,assertG2VEmulator,G2V_HOST,G2V_PROJECT}
 from '../../src/vangioi-v49-emergency-hold-g2v.mjs';

const active=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||
 process.env.FIREBASE_PROJECT_ID||null;
assertG2VEmulator({emulatorHost:process.env.FIRESTORE_EMULATOR_HOST,
 projectId:G2V_PROJECT,credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
 activeProjectId:active});
const rules=readFileSync(new URL('../fixtures/vangioi-g2s-v49-server-publish-only.rules',
 import.meta.url),'utf8');
assert.ok(rules.includes('G2S -- ISOLATED FIRESTORE EMULATOR PUBLISH GATE'));
const environment=await initializeTestEnvironment({projectId:G2V_PROJECT,
 firestore:{host:'127.0.0.1',port:18088,rules}});
const db=new Firestore({projectId:G2V_PROJECT});
const current=Date.parse('2026-10-27T16:00:00.000Z');
const stamp='2026-10-27T15:00:00.000Z';
const CHAPTER='chapter-0001',OWNER='fixture-owner-g2w';
const chapter={id:CHAPTER,order:0,title:'Chương một',
 content:'xin chào nhé',wordCount:3};
const bookRef=id=>db.collection('epub_stories_v49').doc(id);
const epochRef=id=>db.collection('vg_fixture_v49_epochs_g2r').doc(id);
const authorityRef=id=>db.collection('vg_fixture_v49_publish_authority_g2t').doc(id);
const holdRef=id=>db.collection('vg_fixture_v49_emergency_holds_g2v').doc(id);
const receiptRef=id=>db.collection('vg_fixture_v49_writer_ops_g2w').doc(id);
const clearanceRef=id=>db.collection('vg_fixture_v49_recovery_clearances_g2v').doc(id);
const request=token=>new Request('https://fixture.invalid/g2w',{
 headers:{Authorization:'Bearer '+token}});
const verifyPublisher=async(req,{storyId,intent})=>
 req.headers.get('Authorization')==='Bearer server-publisher'?
 {uid:'trusted-publisher',publisher:true,storyId,intent}:null;
const caseId=storyId=>'case-'+storyId;
const verifyEmergency=async(req,{storyId})=>
 req.headers.get('Authorization')==='Bearer two-person-emergency'?
 {storyId,caseId:caseId(storyId),reason:'urgent-rights-hold',authorized:true,
  operatorUid:'fixture-operator',rightsOfficerUid:'fixture-rights-officer'}:null;
const verifyRecovery=async(req,{storyId})=>
 req.headers.get('Authorization')==='Bearer three-person-recovery'?
 {storyId,caseId:caseId(storyId),authorized:true,
  operatorUid:'fixture-operator',rightsOfficerUid:'fixture-rights-officer',
  reviewerUid:'fixture-independent-reviewer'}:null;
const createWriter=(other={})=>createG2WGuardedPublisher({firestore:db,
 emulatorHost:G2V_HOST,activeProjectId:active,verifyPublisher,now:()=>current,...other});
const writer=createWriter();
const emergency=createG2VEmergencyRehearsal({firestore:db,
 emulatorHost:G2V_HOST,activeProjectId:active,verifyEmergency,verifyRecovery,
 now:()=>current});
const book=id=>({id,title:'Truyện diễn tập',author:'DUDU Fixture',genre:'Nhập EPUB',
 status:'draft',ownerUid:OWNER,chapterCount:1,
 chapterIndex:[{id:CHAPTER,title:chapter.title,order:0,wordCount:3}],
 createdAt:stamp,updatedAt:stamp,sourceName:'fixture.epub',importSchema:57,
 importFingerprint:'v57-0123456789abcdef-1',coverImage:''});
const authority=(id,sourceHash,sourceEpoch=1,revision=1)=>({
 storyId:id,ownerUid:OWNER,status:'ready',holdStatus:'clear',
 sourceHash,sourceEpoch,chapterCount:1,authorityRevision:revision,
 permit:{status:'active',revision:1,ownerUid:OWNER,sourceHash,
  expiresAt:current+3600000},
 pin:{status:'active',revision:1,sourceHash},
 assignment:{status:'approved',scope:'v49-draft-inspect',
  reviewerUid:'fixture-independent-reviewer',revision:1,pinRevision:1,
  sourceHash},
 release:{status:'approved',revision:1,permitRevision:1,pinRevision:1,
  assignmentRevision:1,sourceEpoch,sourceHash}
});
const seed=async suffix=>{
 const id='epub-g2w-'+suffix,initial=book(id);
 const proof=await hashV49DraftSnapshot({book:initial,chapters:[chapter]},{storyId:id});
 await bookRef(id).set(initial);
 await bookRef(id).collection('chapters').doc(CHAPTER).set(chapter);
 await epochRef(id).set({storyId:id,ownerUid:OWNER,sourceEpoch:1,
  sourceHash:proof.sourceHash,chapterCount:1});
 await authorityRef(id).set(authority(id,proof.sourceHash));
 return {id,hash:proof.sourceHash,epoch:1,revision:1};
};
const cmd=(item,operationId=crypto.randomUUID())=>({
 storyId:item.id,expectedEpoch:item.epoch,expectedSourceHash:item.hash,
 expectedAuthorityRevision:item.revision,operationId
});
let rejects=0,publications=0,hidden=0;
const deny=async(promise,matcher=/emulator-writer-/)=>{
 await assert.rejects(promise,matcher);rejects++;
};
try{
 await environment.clearFirestore();
 const guest=environment.unauthenticatedContext().firestore();
 const owner=environment.authenticatedContext(OWNER,{admin:true}).firestore();
 const client=id=>owner.collection('epub_stories_v49').doc(id);
 const publicBook=id=>guest.collection('epub_stories_v49').doc(id);
 const ordinary=await seed('ordinary');
 await assertFails(client(ordinary.id).update({status:'published',publishedAt:stamp}));
 await assertFails(client(ordinary.id).collection('chapters').doc(CHAPTER)
  .update({content:'override'}));
 await assertFails(owner.collection('vg_fixture_v49_emergency_holds_g2v')
  .doc(ordinary.id).set({status:'released'}));
 await deny(writer.publishDraft(request('forgery'),cmd(ordinary)),/publisher-required/);
 const publishCommand=cmd(ordinary);
 const published=await writer.publishDraft(request('server-publisher'),publishCommand);
 assert.equal(published.emulatorPublished,true);
 assert.equal(published.holdCheckedAbsent,true);
 assert.equal(published.productionAuthorized,false);
 assert.equal((await receiptRef(publishCommand.operationId).get()).data().holdCheckedAbsent,true);
 assert.equal((await epochRef(ordinary.id).get()).data().sourceEpoch,2);
 await assertSucceeds(publicBook(ordinary.id).get());
 publications++;
 await deny(writer.publishDraft(request('server-publisher'),publishCommand),
  /operation-replay/);
 console.log('fenced-publish-success');

 const emergencyResult=await emergency.emergencyHide(
  request('two-person-emergency'),{storyId:ordinary.id,operationId:crypto.randomUUID()});
 assert.equal(emergencyResult.emulatorHidden,true);
 assert.equal((await holdRef(ordinary.id).get()).data().status,'held');
 assert.equal((await epochRef(ordinary.id).get()).data().sourceEpoch,3);
 await assertFails(publicBook(ordinary.id).get());
 await assertFails(publicBook(ordinary.id).collection('chapters').doc(CHAPTER).get());
 hidden++;
 // Restore valid source proof/authority fixture, but do NOT clear the hold.
 await authorityRef(ordinary.id).set(authority(ordinary.id,ordinary.hash,3,3));
 const postHold={...ordinary,epoch:3,revision:3};
 await deny(writer.publishDraft(request('server-publisher'),cmd(postHold)),
  /emergency-hold/);
 await deny(writer.restoreAfterHold(request('server-publisher'),cmd(postHold)),
  /emergency-hold/);
 // G2V recoveryReview requires an independent server-signed clearance.
 await clearanceRef(ordinary.id).set({storyId:ordinary.id,
  caseId:caseId(ordinary.id),status:'approved',sourceEpoch:3,
  sourceHash:ordinary.hash,authorityRevision:3,
  operatorUid:'fixture-operator',rightsOfficerUid:'fixture-rights-officer',
  reviewerUid:'fixture-independent-reviewer'});
 await emergency.recoveryReview(request('three-person-recovery'),{
  storyId:ordinary.id,expectedHoldRevision:1,
  expectedAuthorityRevision:3,operationId:crypto.randomUUID()});
 assert.equal((await holdRef(ordinary.id).get()).data().status,'review-ready');
 await deny(writer.publishDraft(request('server-publisher'),cmd(postHold)),
  /emergency-hold/);
 await deny(writer.restoreAfterHold(request('server-publisher'),cmd(postHold)),
  /emergency-hold/);
 await assertFails(publicBook(ordinary.id).get());
 console.log('review-ready-is-not-release');

 const corrupted=await seed('corrupt-hold');
 await holdRef(corrupted.id).set({wrong:'record'});
 await deny(writer.publishDraft(request('server-publisher'),cmd(corrupted)),
  /emergency-hold/);
 await deny(writer.restoreAfterHold(request('server-publisher'),cmd(corrupted)),
  /emergency-hold/);
 assert.equal((await bookRef(corrupted.id).get()).data().status,'draft');

 const race=await seed('hold-before-transaction');
 let injected=false;
 const racingWriter=createWriter({fixtureBeforeTransaction:async({storyId})=>{
  if(storyId===race.id&&!injected){
   injected=true;
   await holdRef(storyId).set({storyId,status:'held',
    caseId:'fixture-race',holdRevision:1});
  }
 }});
 await deny(racingWriter.publishDraft(request('server-publisher'),cmd(race)),
  /emergency-hold/);
 assert.equal(injected,true);
 assert.equal((await bookRef(race.id).get()).data().status,'draft');
 assert.equal((await epochRef(race.id).get()).data().sourceEpoch,1);
 assert.equal((await authorityRef(race.id).get()).data().status,'ready');
 console.log('hold-created-before-snapshot-denied');

 const revoked=await seed('revoked-before-transaction');
 const revokedWriter=createWriter({fixtureBeforeTransaction:async({storyId})=>{
  if(storyId===revoked.id)await authorityRef(storyId).update({
   authorityRevision:2,'permit.status':'revoked'});
 }});
 await deny(revokedWriter.publishDraft(request('server-publisher'),cmd(revoked)),
  /authority-conflict/);
 assert.equal((await bookRef(revoked.id).get()).data().status,'draft');

 const competing=await seed('competing');
 const overlapping=await Promise.allSettled([
  writer.publishDraft(request('server-publisher'),cmd(competing)),
  writer.publishDraft(request('server-publisher'),cmd(competing))
 ]);
 assert.equal(overlapping.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(overlapping.filter(x=>x.status==='rejected').length,1);
 assert.equal((await epochRef(competing.id).get()).data().sourceEpoch,2);
 assert.equal((await bookRef(competing.id).get()).data().status,'published');
 publications++;

 // No restore entry point can bypass review requirements even with NO hold.
 const orphan=await seed('restore-without-hold');
 await deny(writer.restoreAfterHold(request('server-publisher'),cmd(orphan)),
  /independent-restore-release-required/);

 // Known remaining blocker: raw Admin SDK bypasses facade and client Rules.
 // This is a NEGATIVE demonstration, not an approved restoration mechanism.
 await bookRef(ordinary.id).update({status:'published',publishedAt:stamp});
 await assertSucceeds(publicBook(ordinary.id).get());
 assert.equal((await holdRef(ordinary.id).get()).data().status,'review-ready');
 console.log('raw-admin-sdk-bypass-remains-open');

 console.log(JSON.stringify({g2w:'guarded-publisher-and-restore-denial-emulator',
  publications,hidden,serverRejects:rejects,
  clientPublishDenied:true,emergencyHoldCheckedInTransaction:true,
  malformedHoldDenied:true,reviewReadyDenied:true,
  holdBeforeSnapshotDenied:true,revocationBeforeSnapshotDenied:true,
  concurrentPublishExactlyOne:true,restoreNotAuthorized:true,
  rawAdminBypassStillOpen:true,productionAuthorized:false,productionChanged:false}));
}finally{
 try{await environment.clearFirestore();}finally{
  await environment.cleanup();await db.terminate();
 }
}
