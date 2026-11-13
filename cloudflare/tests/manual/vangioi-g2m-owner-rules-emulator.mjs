// G2M only: candidate Rules loaded into a localhost demo Firestore Emulator.
// No Firebase project, project credentials, firebase.json, or deployed rules.
// Run via npx firebase-tools@13.35.1 emulators:exec with G2M config.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';

const PROJECT='demo-vangioi-g2m',HOST='127.0.0.1:18083';
if(process.env.FIRESTORE_EMULATOR_HOST!==HOST ||
 process.env.GOOGLE_APPLICATION_CREDENTIALS ||
 [process.env.GCLOUD_PROJECT,process.env.GOOGLE_CLOUD_PROJECT,process.env.FIREBASE_PROJECT_ID]
  .some(id=>id&&id!==PROJECT))throw Error('G2M must run against isolated localhost demo Emulator');
const rules=readFileSync(new URL('../fixtures/vangioi-g2m-v49-owner-only.rules',import.meta.url),'utf8');
if(!rules.includes('ISOLATED FIRESTORE EMULATOR CANDIDATE')||
 !rules.includes('match /{everythingElse=**}'))throw Error('Refusing non-G2M rules fixture');
const env=await initializeTestEnvironment({projectId:PROJECT,
 firestore:{host:'127.0.0.1',port:18083,rules}});
const stamp='2026-10-27T12:34:56.000Z';
const chapter='chapter-0001';
const fingerprint='v57-0123456789abcdef-1';
const index=[{id:chapter,title:'Chương một',order:0,wordCount:2}];
const book=(id,ownerUid='owner-a',status='importing')=>({
 id,title:'Truyện tổng hợp',author:'Tác giả tổng hợp',genre:'Nhập EPUB',status,ownerUid,
 chapterCount:1,chapterIndex:index,createdAt:stamp,updatedAt:stamp,sourceName:'test.epub',
 importSchema:57,importFingerprint:fingerprint,coverImage:'',
 ...(status==='published'?{publishedAt:stamp}:{})
});
const content={id:chapter,title:'Chương một',order:0,content:'xin chào',wordCount:2};
const expectPass=async(label,promise)=>{await assertSucceeds(promise);return label;};
const expectDeny=async(label,promise)=>{await assertFails(promise);return label;};
let passed=0,blocked=0;
const ok=async(label,promise)=>{await expectPass(label,promise);passed++;};
const no=async(label,promise)=>{await expectDeny(label,promise);blocked++;};

try {
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const root=ctx.firestore().collection('epub_stories_v49');
  for(const [id,ownerUid,status] of [
   ['epub-g2m-public','owner-a','published'],
   ['epub-g2m-private','owner-a','draft'],
   ['epub-g2m-importing','owner-a','importing'],
   ['epub-g2m-other-private','owner-b','draft']
  ]){
   await root.doc(id).set(book(id,ownerUid,status));
   await root.doc(id).collection('chapters').doc(chapter).set(content);
  }
 });
 const guest=env.unauthenticatedContext().firestore();
 const reader=env.authenticatedContext('reader',{admin:false}).firestore();
 const owner=env.authenticatedContext('owner-a',{admin:true}).firestore();
 const other=env.authenticatedContext('owner-b',{admin:true}).firestore();
 const reviewer=env.authenticatedContext('reviewer-x',{admin:true,reviewer:true,
  assignedStoryIds:['epub-g2m-private']}).firestore();
 const readerSpoof=env.authenticatedContext('reader',{admin:false,reviewer:true}).firestore();
 const collection=db=>db.collection('epub_stories_v49');
 const publicDoc=db=>collection(db).doc('epub-g2m-public');
 const privateDoc=db=>collection(db).doc('epub-g2m-private');
 const child=ref=>ref.collection('chapters').doc(chapter);

 // Existing V49 publicBooks/readChapter queries and owner publisher list.
 await ok('guest-published-get',publicDoc(guest).get());
 await ok('guest-published-chapter',child(publicDoc(guest)).get());
 await ok('guest-published-query',collection(guest).where('status','==','published').limit(60).get());
 await no('guest-unfiltered-list',collection(guest).get());
 await no('guest-private-book',privateDoc(guest).get());
 await no('guest-private-chapter',child(privateDoc(guest)).get());
 await no('reader-private-book',privateDoc(reader).get());
 await no('reader-private-chapter',child(privateDoc(reader)).get());
 await ok('owner-private-book',privateDoc(owner).get());
 await ok('owner-private-chapter',child(privateDoc(owner)).get());
 await ok('owner-private-chapters-query',privateDoc(owner).collection('chapters').get());
 await ok('owner-list-own-book',collection(owner).where('ownerUid','==','owner-a').get());
 await no('other-admin-private-book',privateDoc(other).get());
 await no('other-admin-private-chapter',child(privateDoc(other)).get());
 await no('other-admin-unfiltered-list',collection(other).get());
 await no('reviewer-claims-cannot-bypass-owner',privateDoc(reviewer).get());
 await no('reviewer-claims-cannot-bypass-child',child(privateDoc(reviewer)).get());
 await no('reader-reviewer-claims-private',privateDoc(readerSpoof).get());
 await ok('other-admin-can-read-own',collection(other).doc('epub-g2m-other-private').get());
 await ok('other-admin-published-is-public',publicDoc(other).get());

 // Auth claim and owner cannot be forged by document fields.
 await no('guest-cannot-create',collection(guest).doc('epub-g2m-guest').set(book('epub-g2m-guest')));
 await no('nonadmin-cannot-create',collection(reader).doc('epub-g2m-nonadmin').set(book('epub-g2m-nonadmin','reader')));
 await no('foreign-owner-impersonation',collection(other).doc('epub-g2m-impersonate').set(book('epub-g2m-impersonate','owner-a')));
 await no('author-cannot-create-published',collection(owner).doc('epub-g2m-direct-public').set(book('epub-g2m-direct-public','owner-a','published')));
 await no('author-cannot-create-draft',collection(owner).doc('epub-g2m-direct-draft').set(book('epub-g2m-direct-draft','owner-a','draft')));
 await no('author-cannot-pollute-create',collection(owner).doc('epub-g2m-extra').set({...book('epub-g2m-extra'),serverRole:'operator'}));
 await no('missing-field-on-create',collection(owner).doc('epub-g2m-missing').set(
  (({chapterCount,...rest})=>rest)(book('epub-g2m-missing'))));
 await no('bad-type-on-create',collection(owner).doc('epub-g2m-type').set({...book('epub-g2m-type'),chapterCount:'1'}));
 await no('long-title-on-create',collection(owner).doc('epub-g2m-title').set({...book('epub-g2m-title'),title:'X'.repeat(25000)}));
 await no('huge-chapter-index',collection(owner).doc('epub-g2m-index').set({...book('epub-g2m-index'),chapterIndex:Array.from({length:161},(_,i)=>({...index[0],order:i}))}));
 await no('spoofed-schema-version',collection(owner).doc('epub-g2m-schema').set({...book('epub-g2m-schema'),importSchema:999}));
 await no('cover-image-resource-exhaustion',collection(owner).doc('epub-g2m-cover').set({...book('epub-g2m-cover'),coverImage:'x'.repeat(50000)}));
 await no('bad-index-boundary',collection(owner).doc('epub-g2m-invalid-index').set({...book('epub-g2m-invalid-index'),chapterIndex:[{...index[0],bogusPrivilege:true}]}));
 await no('author-can-not-delete-book',privateDoc(owner).delete());
 await no('owner-cannot-change-another-book',collection(owner).doc('epub-g2m-other-private').update({status:'published'}));
 await no('foreign-admin-cannot-change',privateDoc(other).update({status:'published',publishedAt:stamp}));

 const working=collection(owner).doc('epub-g2m-author-flow');
 await ok('V49-create-importing',working.set(book('epub-g2m-author-flow')));
 await no('chapter-extra-field',child(working).set({...content,role:'admin'}));
 await no('chapter-title-mismatch',child(working).set({...content,title:'other'}));
 await no('chapter-order-mismatch',child(working).set({...content,order:1}));
 await no('chapter-wordcount-negative',child(working).set({...content,wordCount:-1}));
 await no('chapter-oversize',child(working).set({...content,content:'x'.repeat(220001)}));
 await no('chapter-foreign-admin-create',child(collection(other).doc('epub-g2m-author-flow')).set(content));
 await no('orphan-chapter-create',child(collection(owner).doc('epub-g2m-no-parent')).set(content));
 await no('orphan-chapter-read',child(collection(owner).doc('epub-g2m-no-parent')).get());
 await ok('V49-create-chapter',child(working).set(content));
 await no('chapter-update-is-immutable',child(working).update({content:'corrupted'}));
 await no('chapter-delete',child(working).delete());
 await no('chapter-nonadmin-get',child(collection(reader).doc('epub-g2m-author-flow')).get());
 await no('chapter-other-admin-get',child(collection(other).doc('epub-g2m-author-flow')).get());

 // Transition validator is re-run on full post-update document.
 await no('update-title-pollution',working.update({status:'draft',title:'Z'.repeat(25000)}));
 await no('update-added-permission-field',working.update({status:'draft',privilege:'elevated'}));
 await no('update-ownership-hijack',working.update({status:'draft',ownerUid:'owner-b'}));
 await no('update-immutable-author',working.update({status:'draft',author:'different'}));
 await no('update-immutable-creation-time',working.update({status:'draft',createdAt:'2039-01-01T00:00:00.000Z'}));
 await no('update-malformed-required-fields',working.update({status:'draft',chapterIndex:[]}));
 await no('update-invalid-status-jump',working.update({status:'published',publishedAt:stamp}));
 await no('update-bad-status',working.update({status:'approved'}));
 await ok('V49-importing-to-draft',working.update({status:'draft',updatedAt:stamp}));
 await no('cannot-create-chapter-after-draft',working.collection('chapters').doc('chapter-0002').set({...content,id:'chapter-0002',order:1}));
 await no('cannot-revert-draft-to-importing',working.update({status:'importing'}));
 await no('cannot-publish-with-extra-field',working.update({status:'published',publishedAt:stamp,clientPublisher:true}));
 await ok('V49-draft-to-published',working.update({status:'published',publishedAt:stamp,updatedAt:stamp}));
 await ok('guest-newly-published-get',collection(guest).doc('epub-g2m-author-flow').get());
 await ok('guest-newly-published-chapter',child(collection(guest).doc('epub-g2m-author-flow')).get());
 await no('published-immutable-update',working.update({title:'tampered'}));
 await no('published-book-delete',working.delete());
 await no('other-path-default-deny',owner.collection('profiles_v2').doc('other').get());

 // Finding #3 from G2L remains open. Published parent returns ALL fields.
 const published=await publicDoc(guest).get();
 assert.equal(published.data().importFingerprint,fingerprint);
 console.log(JSON.stringify({g2m:'isolated-owner-only-rules-candidate',functionalChecks:'pass',
  passed,blocked,publicParentMetadataStillExposed:true,
  reviewerAccess:'denied-until-separate-server-assignment',productionChanged:false}));
} finally {
 await env.cleanup();
}
