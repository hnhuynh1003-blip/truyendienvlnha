// G2U: localhost-only visibility suspension and authority freshness rehearsal.
// Real Firestore Emulator; all notices/permits/people are synthetic.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Firestore} from '@google-cloud/firestore';
import {initializeTestEnvironment,assertFails,assertSucceeds}
 from '@firebase/rules-unit-testing';
import {assertG2UEmulator,createG2UEmulatorSuspender,
 createG2UAuthorityFreshnessAudit,G2U_HOST,G2U_PROJECT}
 from '../../src/vangioi-v49-authority-visibility-g2u.mjs';

const active=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||
 process.env.FIREBASE_PROJECT_ID||null;
assertG2UEmulator({emulatorHost:process.env.FIRESTORE_EMULATOR_HOST,
 projectId:G2U_PROJECT,credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
 activeProjectId:active});
const rules=readFileSync(new URL('../fixtures/vangioi-g2s-v49-server-publish-only.rules',
 import.meta.url),'utf8');
if(!rules.includes('G2S -- ISOLATED FIRESTORE EMULATOR PUBLISH GATE')||
 !rules.includes('match /{everythingElse=**}'))
 throw Error('G2U needs G2S isolated client rules');
const env=await initializeTestEnvironment({projectId:G2U_PROJECT,
 firestore:{host:'127.0.0.1',port:18087,rules}});
const db=new Firestore({projectId:G2U_PROJECT});
const now=Date.parse('2026-10-27T14:00:00.000Z');
const stamp='2026-10-27T13:00:00.000Z';
const hash='sha256-'+'b'.repeat(64);
const chapter='chapter-0001',OWNER='owner-g2u';
const ref=id=>db.collection('epub_stories_v49').doc(id);
const epochRef=id=>db.collection('vg_fixture_v49_epochs_g2r').doc(id);
const authorityRef=id=>db.collection('vg_fixture_v49_publish_authority_g2t').doc(id);
const noticeRef=id=>db.collection('vg_fixture_v49_takedown_notices_g2u').doc(id);
const opRef=id=>db.collection('vg_fixture_v49_epoch_ops_g2r').doc(id);
const req=token=>new Request('https://fixture.invalid/g2u',{
 headers:{Authorization:'Bearer '+token}});
const verify=async r=>r?.headers?.get('Authorization')==='Bearer trusted-operator'?
 {uid:'trusted-operator',operator:true}:null;
const suspender=createG2UEmulatorSuspender({firestore:db,
 emulatorHost:G2U_HOST,activeProjectId:active,verifyOperator:verify,now:()=>now});
const cmd=(id,operationId=crypto.randomUUID())=>({storyId:id,expectedEpoch:2,
 expectedAuthorityRevision:3,expectedNoticeRevision:1,operationId});
const book=id=>({
 id,title:'Truyện giả lập',author:'Tác giả giả lập',genre:'Nhập EPUB',
 status:'published',ownerUid:OWNER,chapterCount:1,
 chapterIndex:[{id:chapter,order:0,title:'Chương đầu',wordCount:2}],
 createdAt:stamp,updatedAt:stamp,publishedAt:stamp,
 sourceName:'sample.epub',importSchema:57,
 importFingerprint:'v57-0123456789abcdef-1',coverImage:''
});
const content={id:chapter,order:0,title:'Chương đầu',
 content:'xin chào',wordCount:2};
const authority=id=>({storyId:id,ownerUid:OWNER,status:'consumed',
 authorityRevision:3,sourceHash:hash,sourceEpoch:1,
 permit:{status:'revoked',revision:2},holdStatus:'clear'});
const notice=(id,reason='permit-revoked')=>({
 storyId:id,status:'active',revision:1,authorityRevision:3,
 sourceEpoch:2,sourceHash:hash,sourceCheckpoint:42,reason
});
const seed=async(id,{withNotice=true}={})=>{
 await ref(id).set(book(id));
 await ref(id).collection('chapters').doc(chapter).set(content);
 await epochRef(id).set({storyId:id,ownerUid:OWNER,sourceEpoch:2,
  sourceHash:hash,chapterCount:1});
 await authorityRef(id).set(authority(id));
 if(withNotice)await noticeRef(id).set(notice(id));
};
const checkStillPublished=async id=>{
 assert.equal((await ref(id).get()).data().status,'published');
 assert.equal((await epochRef(id).get()).data().sourceEpoch,2);
};
let rejects=0,hidden=0;
const denied=async(promise,pattern=/emulator-suspend-/)=>{
 await assert.rejects(promise,pattern);rejects++;
};

try{
 await env.clearFirestore();
 // Construct synthetic G2T-after-publish state directly via trusted SDK.
 const revoked='epub-g2u-revoked',other='epub-g2u-public-untouched';
 await seed(revoked);await seed(other,{withNotice:false});
 const guest=env.unauthenticatedContext().firestore();
 const owner=env.authenticatedContext(OWNER,{admin:true}).firestore();
 const guestRef=id=>guest.collection('epub_stories_v49').doc(id);
 const publishedQuery=()=>guest.collection('epub_stories_v49')
  .where('status','==','published').limit(60).get();
 await assertSucceeds(guestRef(revoked).get());
 await assertSucceeds(guestRef(revoked).collection('chapters').doc(chapter).get());
 assert.equal((await publishedQuery()).docs.length,2);
 await assertFails(owner.collection('vg_fixture_v49_takedown_notices_g2u')
  .doc(revoked).get());
 await assertFails(owner.collection('vg_fixture_v49_takedown_notices_g2u')
  .doc(revoked).set(notice(revoked)));
 await denied(suspender.rehearseSuspend(req('forged'),cmd(revoked)),
  /operator-required/);
 await denied(suspender.rehearseSuspend(req('trusted-operator'),{
  ...cmd(revoked),expectedEpoch:1}),/source-epoch-conflict/);
 await denied(suspender.rehearseSuspend(req('trusted-operator'),{
  ...cmd(revoked),expectedAuthorityRevision:2}),/authority-conflict/);
 await denied(suspender.rehearseSuspend(req('trusted-operator'),{
  ...cmd(revoked),expectedNoticeRevision:2}),/notice-conflict/);
 await checkStillPublished(revoked);

 const operation=cmd(revoked);
 const result=await suspender.rehearseSuspend(req('trusted-operator'),operation);
 assert.equal(result.ok,true);
 assert.equal(result.productionAuthorized,false);
 assert.equal(result.sourceEpoch,3);
 assert.equal((await ref(revoked).get()).data().status,'draft');
 assert.equal('publishedAt' in (await ref(revoked).get()).data(),false);
 assert.equal((await epochRef(revoked).get()).data().sourceEpoch,3);
 assert.equal((await noticeRef(revoked).get()).data().status,'consumed');
 assert.equal((await authorityRef(revoked).get()).data().status,'suspended');
 assert.equal((await opRef(operation.operationId).get()).data().kind,
  'g2u-emulator-suspend');
 await assertFails(guestRef(revoked).get());
 await assertFails(guestRef(revoked).collection('chapters').doc(chapter).get());
 console.log('guest-public-after-suspend-denied');
 await assertSucceeds(owner.collection('epub_stories_v49').doc(revoked).get());
 await assertFails(owner.collection('epub_stories_v49').doc(revoked)
  .update({status:'published',publishedAt:stamp,updatedAt:stamp}));
 await assertSucceeds(guestRef(other).get());
 const publicList=await publishedQuery();
 assert.deepEqual(publicList.docs.map(x=>x.id),[other]);
 await denied(suspender.rehearseSuspend(req('trusted-operator'),operation),
  /operation-replay/);
 hidden++;
 console.log('notice-revoked-after-publication');

 const absent='epub-g2u-absent-notice';
 await seed(absent,{withNotice:false});
 await denied(suspender.rehearseSuspend(req('trusted-operator'),cmd(absent)),
  /record-unavailable/);
 await checkStillPublished(absent);
 for(const [tag,patch] of [
  ['inactive-notice',{'status':'withdrawn'}],
  ['stale-revision',{'authorityRevision':2}],
  ['wrong-hash',{'sourceHash':'sha256-'+'a'.repeat(64)}],
  ['bad-checkpoint',{'sourceCheckpoint':-1}],
  ['invalid-reason',{'reason':'client-self-publish'}],
  ['unrevoked-permit',null]
 ]){
  const id='epub-g2u-'+tag;
  await seed(id);
  if(patch)await noticeRef(id).update(patch);
  else await authorityRef(id).update({'permit.status':'active'});
  await denied(suspender.rehearseSuspend(req('trusted-operator'),cmd(id)),
   /notice-conflict/);
  await checkStillPublished(id);
 }

 const held='epub-g2u-legal-hold';
 await seed(held);
 await noticeRef(held).update({reason:'legal-hold'});
 await authorityRef(held).update({holdStatus:'active','permit.status':'active'});
 const heldResult=await suspender.rehearseSuspend(req('trusted-operator'),cmd(held));
 assert.equal(heldResult.emulatorHidden,true);
 await assertFails(guestRef(held).get());
 hidden++;

 const concurrent='epub-g2u-concurrent';
 await seed(concurrent);
 const clash=await Promise.allSettled([
  suspender.rehearseSuspend(req('trusted-operator'),cmd(concurrent)),
  suspender.rehearseSuspend(req('trusted-operator'),cmd(concurrent))]);
 assert.equal(clash.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(clash.filter(x=>x.status==='rejected').length,1);
 assert.equal((await epochRef(concurrent).get()).data().sourceEpoch,3);
 hidden++;
 console.log('concurrent-suspension-exactly-one');

 // The SQL source and Firestore projection are represented by trusted
 // CALLBACKS only: absence/staleness forbids a freshness PASS, but an observed
 // PASS is NOT a cross-database transaction or permission to publish.
 let authorityHead={projectId:G2U_PROJECT,head:42,
  digest:'sha256-'+'c'.repeat(64)};
 let replica={projectId:G2U_PROJECT,checkpoint:42,
  digest:authorityHead.digest,observedAt:now-500};
 const audit=createG2UAuthorityFreshnessAudit({verifyOperator:verify,
  readAuthorityHead:async()=>authorityHead,
  readProjectedAuthority:async()=>replica,now:()=>now});
 assert.equal((await audit(req('trusted-operator'))).canPublish,false);
 authorityHead={...authorityHead,head:43};
 assert.equal((await audit(req('trusted-operator'))).code,'checkpoint-lag');
 replica={...replica,checkpoint:43,digest:'sha256-'+'f'.repeat(64)};
 assert.equal((await audit(req('trusted-operator'))).code,'projection-mismatch');
 console.log(JSON.stringify({g2u:'emulator-authority-freshness-and-takedown',
  hidden,serverRejects:rejects,publicQueryExcludesHidden:true,
  publishedChapterDeniedAfterSuspension:true,epochAndReceiptAtomic:true,
  otherPublishedBookUnaffected:true,clientCannotUndo:true,
  staleAuthorityDetected:true,sqliteFreshnessNotTransactional:true,
  productionAuthorized:false,productionChanged:false}));
}finally{
 try{await env.clearFirestore();}finally{
  await env.cleanup();await db.terminate();
 }
}
