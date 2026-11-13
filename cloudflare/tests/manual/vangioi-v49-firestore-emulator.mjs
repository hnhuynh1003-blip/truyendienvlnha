// Manual G1T smoke. RUN ONLY against a loopback Firestore Emulator.
// npm install --no-save --no-package-lock --prefix cloudflare @google-cloud/firestore
// firebase emulators:exec --config tools/vangioi/firebase-emulator-g1t.json
//   --only firestore --project demo-vangioi-g1t 'node cloudflare/tests/manual/vangioi-v49-firestore-emulator.mjs'
import {Firestore} from '@google-cloud/firestore';
import assert from 'node:assert/strict';
import {createV49FirestoreTransactionReader} from '../../src/vangioi-v49-firestore-reader.mjs';

const host=process.env.FIRESTORE_EMULATOR_HOST||'';
if(!/^(?:127\.0\.0\.1|localhost):18080$/.test(host))
 throw Error('G1T emulator-only smoke refuses non-local Firestore');

const db=new Firestore({projectId:'demo-vangioi-g1t'});
const storyId='epub-g1t-'+crypto.randomUUID();
const book=db.collection('epub_stories_v49').doc(storyId);
try{
 await book.set({id:storyId,title:'Synthetic staging story',ownerUid:'fake-owner',status:'published',chapterCount:2,
  chapterIndex:[{id:'chapter-0010',title:'First',order:0,wordCount:1},
   {id:'chapter-0002',title:'Second',order:1,wordCount:1}],coverImage:'PRIVATE_FAKE_COVER'});
 await book.collection('chapters').doc('chapter-0010').set({id:'chapter-0010',title:'First',order:0,
  content:'PRIVATE_FIRST',wordCount:1});
 await book.collection('chapters').doc('chapter-0002').set({id:'chapter-0002',title:'Second',order:1,
  content:'PRIVATE_SECOND',wordCount:1});
 const reader=createV49FirestoreTransactionReader({firestore:db});
 const first=await reader({storyId});
 assert.deepEqual(first.chapters.map(ch=>ch.id),['chapter-0010','chapter-0002']);
 assert.deepEqual(first.chapters.map(ch=>ch.content),['PRIVATE_FIRST','PRIVATE_SECOND']);
 assert.equal(JSON.stringify(first).includes('PRIVATE_FAKE_COVER'),false);
 await book.collection('chapters').doc('chapter-0010').update({content:'VERSION_TWO'});
 const second=await reader({storyId});
 assert.equal(second.chapters[0].content,'VERSION_TWO');
 assert.equal(first.chapters[0].content,'PRIVATE_FIRST');
 console.log('PASS G1T: real Firestore Emulator read-only transaction, chapter order and version change');
}finally{
 await db.terminate();
}
