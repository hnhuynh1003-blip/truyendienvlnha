// G2V: REAL localhost Firestore Emulator only. All approvals are synthetic.
// No Firebase production, legal authority, SQL consumer or author UI wiring.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Firestore} from '@google-cloud/firestore';
import {initializeTestEnvironment,assertFails,assertSucceeds}
 from '@firebase/rules-unit-testing';
import {hashV49DraftSnapshot}
 from '../../src/vangioi-v49-draft-integrity-g2n.mjs';
import {createG2VEmergencyRehearsal,assertG2VEmulator,G2V_PROJECT,G2V_HOST}
 from '../../src/vangioi-v49-emergency-hold-g2v.mjs';

const active=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||
 process.env.FIREBASE_PROJECT_ID||null;
assertG2VEmulator({emulatorHost:process.env.FIRESTORE_EMULATOR_HOST,
 projectId:G2V_PROJECT,credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
 activeProjectId:active});
const rules=readFileSync(new URL('../fixtures/vangioi-g2s-v49-server-publish-only.rules',
 import.meta.url),'utf8');
if(!rules.includes('G2S -- ISOLATED FIRESTORE EMULATOR PUBLISH GATE')||
 !rules.includes('match /{everythingElse=**}'))
 throw Error('G2V requires isolated G2S client rules fixture');
const env=await initializeTestEnvironment({projectId:G2V_PROJECT,
 firestore:{host:'127.0.0.1',port:18088,rules}});
const db=new Firestore({projectId:G2V_PROJECT});
const now=Date.parse('2026-10-27T15:00:00.000Z');
const stamp='2026-10-27T14:00:00.000Z';
const OWNER='owner-g2v',CHAPTER='chapter-0001';
const content={id:CHAPTER,order:0,title:'Chương một',
 content:'xin chào',wordCount:2};
const ref=id=>db.collection('epub_stories_v49').doc(id);
const epochRef=id=>db.collection('vg_fixture_v49_epochs_g2r').doc(id);
const holdRef=id=>db.collection('vg_fixture_v49_emergency_holds_g2v').doc(id);
const opRef=id=>db.collection('vg_fixture_v49_emergency_ops_g2v').doc(id);
const authorityRef=id=>db.collection('vg_fixture_v49_publish_authority_g2t').doc(id);
const clearanceRef=id=>db.collection('vg_fixture_v49_recovery_clearances_g2v').doc(id);
const request=token=>new Request('https://fixture.invalid/g2v',{
 headers:{Authorization:'Bearer '+token}});
const caseId=storyId=>'case-'+storyId;
const verifyEmergency=async(req,{storyId})=>
 req?.headers?.get('Authorization')==='Bearer emergency'?
 {storyId,caseId:caseId(storyId),reason:'authority-sync-unknown',
  authorized:true,operatorUid:'trusted-operator',
  rightsOfficerUid:'independent-rights-officer'}:null;
const verifyRecovery=async(req,{storyId})=>
 req?.headers?.get('Authorization')==='Bearer recovery'?
 {storyId,caseId:caseId(storyId),authorized:true,
  operatorUid:'trusted-operator',rightsOfficerUid:'independent-rights-officer',
  reviewerUid:'independent-reviewer'}:null;
const service=createG2VEmergencyRehearsal({firestore:db,
 emulatorHost:G2V_HOST,activeProjectId:active,
 verifyEmergency,verifyRecovery,now:()=>now});
const book=id=>({id,title:'Truyện tổng hợp',author:'Người viết thử',
 genre:'Nhập EPUB',status:'published',ownerUid:OWNER,
 chapterCount:1,chapterIndex:[{id:CHAPTER,title:'Chương một',
  order:0,wordCount:2}],createdAt:stamp,updatedAt:stamp,publishedAt:stamp,
 sourceName:'synthetic.epub',importSchema:57,
 importFingerprint:'v57-0123456789abcdef-1',coverImage:''});
const seed=async id=>{
 const original=book(id);
 await ref(id).set(original);
 await ref(id).collection('chapters').doc(CHAPTER).set(content);
 const draft={...original,status:'draft'};
 delete draft.publishedAt;
 const proof=await hashV49DraftSnapshot({book:draft,chapters:[content]},{storyId:id});
 return proof.sourceHash;
};
const emergency=(id,operationId=crypto.randomUUID())=>({storyId:id,operationId});
const recovery=(id,operationId=crypto.randomUUID())=>({
 storyId:id,expectedHoldRevision:1,expectedAuthorityRevision:1,operationId});
const prepareRecovery=async(id,sourceHash)=>{
 await epochRef(id).set({storyId:id,ownerUid:OWNER,
  sourceEpoch:1,sourceHash,chapterCount:1});
 await authorityRef(id).set({storyId:id,ownerUid:OWNER,
  status:'ready',holdStatus:'clear',sourceHash,sourceEpoch:1,
  chapterCount:1,authorityRevision:1,
  permit:{status:'active',revision:1,ownerUid:OWNER,
   sourceHash,expiresAt:now+60000},
  pin:{status:'active',revision:1,sourceHash},
  assignment:{status:'approved',scope:'v49-draft-inspect',
   reviewerUid:'independent-reviewer',revision:1,pinRevision:1,sourceHash},
  release:{status:'approved',revision:1,permitRevision:1,pinRevision:1,
   assignmentRevision:1,sourceEpoch:1,sourceHash}
 });
 await clearanceRef(id).set({storyId:id,caseId:caseId(id),
  status:'approved',sourceEpoch:1,sourceHash,authorityRevision:1,
  operatorUid:'trusted-operator',
  rightsOfficerUid:'independent-rights-officer',
  reviewerUid:'independent-reviewer'});
};
let denied=0,hidden=0,reviewed=0;
const refuse=async(promise,pattern=/emulator-/)=>{
 await assert.rejects(promise,pattern);denied++;
};

try{
 await env.clearFirestore();
 const withoutEpoch='epub-g2v-missing-epoch';
 const proof=await seed(withoutEpoch);
 const guest=env.unauthenticatedContext().firestore();
 const owner=env.authenticatedContext(OWNER,{admin:true}).firestore();
 const other=env.unauthenticatedContext().firestore();
 const guestRef=(db,id)=>db.collection('epub_stories_v49').doc(id);
 await assertSucceeds(guestRef(guest,withoutEpoch).get());
 await assertSucceeds(guestRef(guest,withoutEpoch)
  .collection('chapters').doc(CHAPTER).get());
 await assertFails(owner.collection('vg_fixture_v49_emergency_holds_g2v')
  .doc(withoutEpoch).get());
 await refuse(service.emergencyHide(request('forged'),emergency(withoutEpoch)),
  /dual-approval-required/);
 await refuse(service.emergencyHide(request('emergency'),{
  storyId:withoutEpoch,operationId:'bad'}),/invalid-command/);
 const firstCommand=emergency(withoutEpoch);
 const first=await service.emergencyHide(request('emergency'),firstCommand);
 assert.equal(first.emulatorHidden,true);
 assert.equal(first.sourceEpochRecordUsable,false);
 assert.equal(first.sourceEpochAttested,false);
 assert.equal(first.sourceEpochAfter,null);
 assert.equal((await holdRef(withoutEpoch).get()).data().status,'held');
 assert.equal((await epochRef(withoutEpoch).get()).exists,false);
 assert.equal((await ref(withoutEpoch).get()).data().status,'draft');
 assert.equal('publishedAt' in (await ref(withoutEpoch).get()).data(),false);
 await assertFails(guestRef(guest,withoutEpoch).get());
 await assertFails(guestRef(guest,withoutEpoch)
  .collection('chapters').doc(CHAPTER).get());
 console.log('emergency-hidden-without-epoch');
 hidden++;
 await refuse(service.emergencyHide(request('emergency'),firstCommand),
  /operation-replay/);
 await refuse(service.recoveryReview(request('recovery'),recovery(withoutEpoch)),
  /evidence-unavailable/);
 await assertFails(owner.collection('epub_stories_v49').doc(withoutEpoch)
  .update({status:'published',publishedAt:stamp,updatedAt:stamp}));

 // Restoration of the evidence is a separate synthetic operator step.
 // A false clearance must not make the book public or even mark review-ready.
 await prepareRecovery(withoutEpoch,proof);
 await refuse(service.recoveryReview(request('forged'),recovery(withoutEpoch)),
  /dual-approval-required/);
 await clearanceRef(withoutEpoch).update({sourceHash:'sha256-'+'e'.repeat(64)});
 await refuse(service.recoveryReview(request('recovery'),recovery(withoutEpoch)),
  /clearance-conflict/);
 await clearanceRef(withoutEpoch).update({sourceHash:proof});
 await authorityRef(withoutEpoch).update({'permit.status':'revoked'});
 await refuse(service.recoveryReview(request('recovery'),recovery(withoutEpoch)),
  /authority-conflict/);
 await authorityRef(withoutEpoch).update({'permit.status':'active'});
 const before=(await ref(withoutEpoch).get()).data();
 assert.equal(before.status,'draft');
 console.log('false-restore-denied');

 const secondCommand=recovery(withoutEpoch);
 const second=await service.recoveryReview(request('recovery'),secondCommand);
 assert.equal(second.reviewReady,true);
 assert.equal(second.canRepublish,false);
 assert.equal(second.productionAuthorized,false);
 assert.equal((await holdRef(withoutEpoch).get()).data().status,'review-ready');
 assert.equal((await clearanceRef(withoutEpoch).get()).data().status,'consumed');
 assert.equal((await ref(withoutEpoch).get()).data().status,'draft');
 await assertFails(guestRef(guest,withoutEpoch).get());
 console.log('guest-remains-private-after-recovery');
 reviewed++;
 await refuse(service.recoveryReview(request('recovery'),secondCommand),
  /operation-replay/);

 // Valid existing epoch advances in the emergency transaction.
 const valid='epub-g2v-valid-epoch';
 const validProof=await seed(valid);
 await epochRef(valid).set({storyId:valid,ownerUid:OWNER,
  sourceEpoch:4,sourceHash:validProof,chapterCount:1});
 const good=await service.emergencyHide(request('emergency'),emergency(valid));
 assert.equal(good.sourceEpochRecordUsable,true);
 assert.equal(good.sourceEpochAttested,false);
 assert.equal(good.sourceEpochAfter,5);
 assert.equal((await epochRef(valid).get()).data().sourceEpoch,5);
 hidden++;

 // Corrupt epoch is NOT overwritten with a fabricated counter, but the
 // published book is hidden regardless of the poisoned sidecar.
 const corrupt='epub-g2v-corrupt-epoch';
 await seed(corrupt);
 await epochRef(corrupt).set({storyId:corrupt,ownerUid:OWNER,
  sourceEpoch:'not-a-number',sourceHash:'malformed'});
 const poisoned=await service.emergencyHide(request('emergency'),emergency(corrupt));
 assert.equal(poisoned.sourceEpochRecordUsable,false);
 assert.equal((await epochRef(corrupt).get()).data().sourceEpoch,'not-a-number');
 await assertFails(guestRef(guest,corrupt).get());
 hidden++;

 // A well-shaped but wrong sourceHash is NOT attested in emergency mode;
 // visibility still drops, and recovery will require independent full hash.
 const staleHash='epub-g2v-stale-hash';
 await seed(staleHash);
 await epochRef(staleHash).set({storyId:staleHash,ownerUid:OWNER,
  sourceEpoch:5,sourceHash:'sha256-'+'d'.repeat(64),chapterCount:1});
 const staleHold=await service.emergencyHide(request('emergency'),emergency(staleHash));
 assert.equal(staleHold.sourceEpochRecordUsable,true);
 assert.equal(staleHold.sourceEpochAttested,false);
 assert.equal((await epochRef(staleHash).get()).data().sourceEpoch,6);
 await assertFails(guestRef(guest,staleHash).get());
 hidden++;

 // Two emergency requests on the same published book: one wins.
 const concurrent='epub-g2v-concurrent';
 await seed(concurrent);
 const clash=await Promise.allSettled([
  service.emergencyHide(request('emergency'),emergency(concurrent)),
  service.emergencyHide(request('emergency'),emergency(concurrent))]);
 assert.equal(clash.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(clash.filter(x=>x.status==='rejected').length,1);
 await assertFails(guestRef(guest,concurrent).get());
 hidden++;

 // Known limitation: a different privileged Admin SDK writer can bypass ALL
 // client Rules and improperly re-publish a held record. This fixture proves
 // that a common server writer fence is STILL required before any rollout.
 const bypass='epub-g2v-admin-bypass';
 await seed(bypass);
 await service.emergencyHide(request('emergency'),emergency(bypass));
 await ref(bypass).update({status:'published',publishedAt:stamp});
 await assertSucceeds(guestRef(other,bypass).get());
 console.log('old-admin-writers-still-bypass-rules');

 console.log(JSON.stringify({g2v:'isolated-emergency-hide-and-recovery-review',
  hidden,reviewed,serverRejects:denied,
  emergencyWorksWithMissingEpoch:true,emergencyWorksWithCorruptEpoch:true,
  validEpochAdvanced:true,recoveryNeverRepublishes:true,
  falseClearanceDenied:true,concurrentEmergencyExactlyOne:true,
  oldAdminWriterBypassStillOpen:true,
  productionAuthorized:false,productionChanged:false}));
}finally{
 try{await env.clearFirestore();}finally{
  await env.cleanup();await db.terminate();
 }
}
