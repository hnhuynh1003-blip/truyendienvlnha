import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const snippet=read('../../security/firestore-epub-v49.rules.review');
const manual=read('./manual/vangioi-g2l-v49-rules-emulator.mjs');
const app=read('../../js/epub-production-v49.js');

test('G2L assesses the original V49 review snippet without changing deployed firebase.json',()=>{
 assert.match(snippet,/FIRESTORE RULE SNIPPET FOR REVIEW/);
 assert.match(snippet,/match \/epub_stories_v49\/\{storyId\}/);
 assert.match(snippet,/match \/chapters\/\{chapterId\}/);
 const config=JSON.parse(read('../../firebase.json'));
 assert.equal('firestore' in config,false);
});

test('G2L V49 app public list query explicitly filters published before list',()=>{
 assert.match(app,/collection\(COLLECTION\)\.where\('status','==','published'\)/);
 assert.match(snippet,/resource\.data\.status == 'published'/);
});

test('G2L confirms reviewed policy ties admin privilege to Auth token, never book ownerUid alone',()=>{
 assert.match(snippet,/request\.auth\.token\.admin == true/);
 assert.match(snippet,/request\.resource\.data\.ownerUid == request\.auth\.uid/);
 assert.match(snippet,/allow update, delete: if false/);
});

test('G2L audit must retain negative coverage and never treat expected findings as secure',()=>{
 for(const code of ['assertFails','cross-admin-draft-read','metadata-update-schema-bypass',
  'published-document-exposes-extra-metadata','reviewRequired:true'])assert.ok(manual.includes(code),code);
 assert.match(manual,/withSecurityRulesDisabled/);
 assert.match(manual,/initializeTestEnvironment/);
});

test('G2L manual audit is only for fixed demo project and localhost:18082',()=>{
 const config=JSON.parse(read('../../tools/vangioi/firebase-emulator-g2l.json'));
 assert.deepEqual(config,{emulators:{firestore:{host:'127.0.0.1',port:18082}}});
 assert.match(manual,/demo-vangioi-g2l/);
 assert.match(manual,/FIRESTORE_EMULATOR_HOST!==HOST/);
 assert.match(manual,/GOOGLE_APPLICATION_CREDENTIALS/);
 assert.doesNotMatch(manual,/firebase deploy|https:\/\/firestore\.googleapis\.com/);
});

test('G2L has no public Worker/authoring HTTP imports and does not grant Vạn Giới authoring rights',()=>{
 for(const entry of ['../src/index.mjs','../src/vangioi-authoring-http.mjs']){
  const source=read(entry);
  assert.equal(source.includes('vangioi-g2l'),false);
 }
 assert.doesNotMatch(manual,/issueAdaptationPermit|setSourceGrant|publishWorld/);
});
