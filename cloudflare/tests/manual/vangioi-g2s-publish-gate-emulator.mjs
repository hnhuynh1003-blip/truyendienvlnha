// G2S: genuine Firestore Rules Unit Testing + Admin SDK bypass demonstration.
// Local demo project and localhost ONLY; never connects to staging/production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {Firestore} from '@google-cloud/firestore';
import {initializeTestEnvironment,assertSucceeds,assertFails}
 from '@firebase/rules-unit-testing';

const PROJECT='demo-vangioi-g2s',HOST='127.0.0.1:18085';
if(process.env.FIRESTORE_EMULATOR_HOST!==HOST||
 process.env.GOOGLE_APPLICATION_CREDENTIALS||
 [process.env.GCLOUD_PROJECT,process.env.GOOGLE_CLOUD_PROJECT,
  process.env.FIREBASE_PROJECT_ID].some(id=>id&&id!==PROJECT))
 throw Error('G2S refuses real/cross-project Firestore');

const rules=readFileSync(new URL('../fixtures/vangioi-g2s-v49-server-publish-only.rules',
 import.meta.url),'utf8');
if(!rules.includes('G2S -- ISOLATED FIRESTORE EMULATOR PUBLISH GATE')||
 !rules.includes('match /{everythingElse=**}'))
 throw Error('G2S requires isolated candidate rules');

const require=createRequire(import.meta.url);
const epub=require('../../../js/epub-production-v49.js');
const env=await initializeTestEnvironment({projectId:PROJECT,
 firestore:{host:'127.0.0.1',port:18085,rules}});
const adminDb=new Firestore({projectId:PROJECT});
const stamp='2026-10-27T12:34:56.000Z';
const OWNER='owner-a',FOREIGN='owner-b';
const chapter='chapter-0001';
const index=[{id:chapter,order:0,title:'Chương một',wordCount:2}];
const book=(id,status='draft',ownerUid=OWNER)=>({
 id,ownerUid,status,title:'Truyện giả lập',author:'Tác giả thử nghiệm',
 genre:'Nhập EPUB',chapterCount:1,chapterIndex:index,
 createdAt:stamp,updatedAt:stamp,sourceName:'fixture.epub',
 importSchema:57,importFingerprint:'v57-0123456789abcdef-1',
 coverImage:'',...(status==='published'?{publishedAt:stamp}:{})
});
const content={id:chapter,title:'Chương một',order:0,
 content:'xin chào',wordCount:2};
const root=db=>db.collection('epub_stories_v49');
const doc=(db,id)=>root(db).doc(id);
const child=ref=>ref.collection('chapters').doc(chapter);
const epoch=db=>db.collection('vg_fixture_v49_epochs_g2r').doc('epub-g2s-draft');
let allowed=0,denied=0;
const yes=async(label,promise)=>{await assertSucceeds(promise);allowed++;return label;};
const no=async(label,promise)=>{await assertFails(promise);denied++;return label;};

try{
 await env.clearFirestore();
 // Rules disabled only for synthetic existing records, not for auth checks.
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const [id,status,uid] of [
   ['epub-g2s-published','published',OWNER],
   ['epub-g2s-draft','draft',OWNER],
   ['epub-g2s-other','draft',FOREIGN]]){
   await doc(db,id).set(book(id,status,uid));
   await child(doc(db,id)).set(content);
  }
  await epoch(db).set({storyId:'epub-g2s-draft',ownerUid:OWNER,
   sourceEpoch:7,sourceHash:'sha256-'+'0'.repeat(64),chapterCount:1});
 });
 const owner=env.authenticatedContext(OWNER,{admin:true}).firestore();
 const other=env.authenticatedContext(FOREIGN,{admin:true,reviewer:true,
  assignedStoryIds:['epub-g2s-draft']}).firestore();
 const reader=env.authenticatedContext('reader',{admin:false}).firestore();
 const guest=env.unauthenticatedContext().firestore();
 const draft=doc(owner,'epub-g2s-draft');
 const imported=doc(owner,'epub-g2s-importing');
 const published=doc(guest,'epub-g2s-published');

 await yes('owner-read-private',draft.get());
 await yes('owner-read-chapter',child(draft).get());
 await yes('owner-list-own',root(owner).where('ownerUid','==',OWNER).get());
 await yes('guest-read-existing-published',published.get());
 await yes('guest-read-existing-public-chapter',child(published).get());
 await yes('guest-published-query',root(guest).where('status','==','published').limit(60).get());
 for(const [label,action] of [
  ['guest-unfiltered-list',()=>root(guest).get()],
  ['guest-read-private',()=>doc(guest,'epub-g2s-draft').get()],
  ['guest-read-private-chapter',()=>child(doc(guest,'epub-g2s-draft')).get()],
  ['other-admin-read-private',()=>doc(other,'epub-g2s-draft').get()],
  ['other-admin-edit-private',()=>doc(other,'epub-g2s-draft').update({title:'Hacked'})],
  ['nonadmin-read-private',()=>doc(reader,'epub-g2s-draft').get()],
  ['client-read-sidecar',()=>epoch(owner).get()],
  ['client-write-sidecar',()=>epoch(owner).update({sourceEpoch:999})],
  ['owner-create-foreign-uid',()=>root(owner).doc('epub-g2s-extra')
   .set({...book('epub-g2s-extra','importing'),ownerUid:FOREIGN})],
  ['owner-publish-direct',()=>draft.update({status:'published',publishedAt:stamp,updatedAt:stamp})],
  ['owner-publish-merge',()=>draft.set({status:'published',publishedAt:stamp},{merge:true})],
  ['owner-publish-overwrite',()=>draft.set(book('epub-g2s-draft','published'))],
  ['owner-create-published',()=>doc(owner,'epub-g2s-create-published')
   .set(book('epub-g2s-create-published','published'))],
  ['owner-create-draft',()=>doc(owner,'epub-g2s-create-draft').set(book('epub-g2s-create-draft'))],
  ['owner-chapter-mutate',()=>child(draft).update({content:'changed'})],
  ['owner-delete-draft',()=>draft.delete()],
  ['owner-schema-pollution',()=>draft.update({status:'published',publishedAt:stamp,canPublish:true})],
  ['owner-uid-hijack',()=>draft.update({status:'published',publishedAt:stamp,ownerUid:FOREIGN})]
 ])await no(label,action());

 const batch=owner.batch();
 batch.update(draft,{status:'published',publishedAt:stamp,updatedAt:stamp});
 batch.update(epoch(owner),{sourceEpoch:8});
 await no('atomic-owner-publish-and-epoch-bypass',batch.commit());
 assert.equal((await doc(adminDb,'epub-g2s-draft').get()).data().status,'draft');
 assert.equal((await epoch(adminDb).get()).data().sourceEpoch,7);

 // Original client API reaches the Rules denial after its chapter preflight.
 const auth={currentUser:{uid:OWNER,
  getIdTokenResult:async()=>({claims:{admin:true}})}};
 await assert.rejects(epub.publishDraft('epub-g2s-draft',
  {db:owner,auth,confirmRights:true}),
 err=>err?.code==='permission-denied');
 denied++;

 // V49 import and resumption still work through the legacy client.
 await yes('owner-create-importing',imported.set(book('epub-g2s-importing','importing')));
 await yes('owner-create-importing-chapter',child(imported).set(content));
 await no('malformed-import-finalize',imported.update({status:'draft',
  updatedAt:stamp,ownerUid:FOREIGN}));
 await yes('owner-finalize-to-draft',imported.update({status:'draft',updatedAt:stamp}));
 await no('owner-publish-after-import',imported.update({status:'published',
  updatedAt:stamp,publishedAt:stamp}));
 await no('guest-read-new-private',doc(guest,'epub-g2s-importing').get());

 // A privileged server SDK ignores client Rules entirely. This is a known
 // remaining risk, NOT a trusted publish implementation or authorization.
 await adminDb.runTransaction(async tx=>{
  const ref=doc(adminDb,'epub-g2s-draft'),snap=await tx.get(ref);
  assert.equal(snap.data().status,'draft');
  tx.update(ref,{status:'published',updatedAt:stamp,publishedAt:stamp});
 });
 assert.equal((await epoch(adminDb).get()).data().sourceEpoch,7);
 await yes('guest-read-server-published',doc(guest,'epub-g2s-draft').get());
 assert.equal((await published.get()).data().importFingerprint,
  'v57-0123456789abcdef-1');
 console.log(JSON.stringify({g2s:'emulator-client-publish-gate',
  allowed,denied,clientPublishBypassClosed:true,
  legacyClientPublishDraftBlocked:true,existingPublicQueryPreserved:true,
  importToDraftPreserved:true,serverSdkBypassesRules:true,
  serverCanStillPublishWithoutEpoch:true,
  publicParentMetadataStillExposed:true,
  productionChanged:false,emulatorOnly:true}));
}finally{
 try{await env.clearFirestore();}finally{
  await env.cleanup();await adminDb.terminate();
 }
}
