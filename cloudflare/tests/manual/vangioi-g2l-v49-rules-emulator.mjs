// G2L manual audit of the EXACT existing V49 review snippet, not new rules.
// The wrapper only makes the review fragment syntactically runnable in a
// dedicated demo emulator. Never load it into production or firebase.json.
// npm install --no-save --no-package-lock --prefix cloudflare @firebase/rules-unit-testing firebase
// npx firebase-tools@13.35.1 emulators:exec \
//   --config tools/vangioi/firebase-emulator-g2l.json --only firestore \
//   --project demo-vangioi-g2l \
//   'node cloudflare/tests/manual/vangioi-g2l-v49-rules-emulator.mjs'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';

const PROJECT='demo-vangioi-g2l',HOST='127.0.0.1:18082';
if(process.env.FIRESTORE_EMULATOR_HOST!==HOST||
 process.env.GOOGLE_APPLICATION_CREDENTIALS||
 [process.env.GCLOUD_PROJECT,process.env.GOOGLE_CLOUD_PROJECT,process.env.FIREBASE_PROJECT_ID]
  .some(id=>id&&id!==PROJECT))throw Error('G2L requires isolated local demo Emulator only');

const reviewed=readFileSync(new URL('../../../security/firestore-epub-v49.rules.review',import.meta.url),'utf8');
if(!reviewed.includes('FIRESTORE RULE SNIPPET FOR REVIEW')||
 !reviewed.includes('match /epub_stories_v49/{storyId}'))
 throw Error('G2L expected the unchanged review snippet, not deployed rules');
const rules=`rules_version = '2';\nservice cloud.firestore {\nmatch /databases/{database}/documents {\n${reviewed}\nmatch /{other=**} { allow read, write: if false; }\n}\n}`;
const env=await initializeTestEnvironment({projectId:PROJECT,firestore:{host:'127.0.0.1',port:18082,rules}});
const book='epub-g2l-synthetic',draft='epub-g2l-private',chapter='chapter-0001';
const findings=[];

try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const root=context.firestore().collection('epub_stories_v49');
  const sample={ownerUid:'owner-a',title:'Synthetic story',chapterCount:1,
   chapterIndex:[{id:chapter,title:'First',order:0}],importFingerprint:'synthetic-private-fingerprint'};
  await root.doc(book).set({...sample,status:'published'});
  await root.doc(book).collection('chapters').doc(chapter).set({id:chapter,title:'First',order:0,content:'PUBLIC_TEST_CONTENT'});
  await root.doc(draft).set({...sample,status:'draft'});
  await root.doc(draft).collection('chapters').doc(chapter).set({id:chapter,title:'Draft',order:0,content:'PRIVATE_DRAFT_CONTENT'});
 });

 const guest=env.unauthenticatedContext().firestore();
 const reader=env.authenticatedContext('ordinary-reader',{admin:false}).firestore();
 const owner=env.authenticatedContext('owner-a',{admin:true}).firestore();
 const foreign=env.authenticatedContext('different-admin',{admin:true}).firestore();
 const collection=db=>db.collection('epub_stories_v49');
 await assertSucceeds(collection(guest).doc(book).get());
 await assertSucceeds(collection(guest).doc(book).collection('chapters').doc(chapter).get());
 await assertFails(collection(guest).doc(draft).get());
 await assertFails(collection(reader).doc(draft).collection('chapters').doc(chapter).get());
 await assertSucceeds(collection(guest).where('status','==','published').limit(60).get());
 await assertFails(collection(guest).get());
 await assertFails(collection(guest).doc(book).set({ownerUid:'owner-a',status:'importing'}));
 await assertFails(collection(reader).doc('epub-g2l-forged').set({ownerUid:'ordinary-reader',
  status:'importing',chapterCount:1,chapterIndex:[{id:chapter,title:'First',order:0}]}));
 await assertFails(collection(foreign).doc('epub-g2l-forged').set({ownerUid:'owner-a',
  status:'importing',chapterCount:1,chapterIndex:[{id:chapter,title:'First',order:0}]}));

 const owned='epub-g2l-author-transition';
 await assertSucceeds(collection(owner).doc(owned).set({ownerUid:'owner-a',status:'importing',
  chapterCount:1,chapterIndex:[{id:chapter,title:'First',order:0}],title:'Valid initial'}));
 await assertSucceeds(collection(owner).doc(owned).collection('chapters').doc(chapter).set({
  id:chapter,title:'First',order:0,content:'SYNTHETIC_CONTENT'}));
 await assertFails(collection(foreign).doc(owned).update({status:'draft'}));

 // Audit probes (NOT desired behaviors): observe whether the unmodified review
 // snippet permits cross-author draft reads and schema-polluting transitions.
 const foreignDraft=await collection(foreign).doc(draft).get();
 if(foreignDraft.exists)findings.push({id:'cross-admin-draft-read',severity:'major'});
 const polluted={status:'draft',title:'x'.repeat(25000),arbitraryPrivilege:'UNTRUSTED_FIELD'};
 const transition=await collection(owner).doc(owned).update(polluted).then(()=>true,()=>false);
 if(transition)findings.push({id:'metadata-update-schema-bypass',severity:'moderate'});
 const published=await collection(guest).doc(book).get();
 if(published.data()?.importFingerprint==='synthetic-private-fingerprint')
  findings.push({id:'published-document-exposes-extra-metadata',severity:'moderate'});

 assert.deepEqual(findings.map(f=>f.id),[
  'cross-admin-draft-read','metadata-update-schema-bypass',
  'published-document-exposes-extra-metadata']);
 console.log(JSON.stringify({g2l:'review-only-emulator-audit',functionalChecks:'pass',
  reviewRequired:true,findings}));
}finally{
 await env.cleanup();
}
