import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const candidate=read('./fixtures/vangioi-g2m-v49-owner-only.rules');
const manual=read('./manual/vangioi-g2m-owner-rules-emulator.mjs');
const original=read('../../security/firestore-epub-v49.rules.review');
const app=read('../../js/epub-production-v49.js');

test('G2M rules are a complete standalone LOCAL fixture with default deny, not Firebase live config',()=>{
 assert.match(candidate,/rules_version = '2';/);
 assert.match(candidate,/ISOLATED FIRESTORE EMULATOR CANDIDATE/);
 assert.match(candidate,/match \/\{everythingElse=\*\*\} \{ allow read, write: if false; \}/);
 assert.equal('firestore' in JSON.parse(read('../../firebase.json')),false);
 assert.match(original,/FIRESTORE RULE SNIPPET FOR REVIEW/);
 assert.doesNotMatch(original,/validBookV49|validChapterV49|validIndexBoundary/);
});

test('G2M never grants foreign admin or client-asserted reviewer access to private drafts',()=>{
 assert.match(candidate,/data\.status == 'published' \|\| isVerifiedOwner\(data\.ownerUid\)/);
 assert.match(candidate,/request\.auth\.token\.admin == true/);
 assert.match(candidate,/uidUnchanged\(request\.resource\.data\)/);
 assert.match(candidate,/uidNotModified\(resource\.data, request\.resource\.data\)/);
 assert.doesNotMatch(candidate,/request\.auth\.token\.reviewer|assignedStoryIds/);
 assert.match(manual,/reviewer-claims-cannot-bypass-owner/);
 assert.match(manual,/other-admin-private-chapter/);
});

test('G2M candidate preserves actual V49 writer fields and public query',()=>{
 for(const field of ['id','title','author','genre','status','ownerUid','chapterCount',
  'chapterIndex','createdAt','updatedAt','sourceName','importSchema',
  'importFingerprint','coverImage','publishedAt'])assert.ok(candidate.includes(`'${field}'`),field);
 assert.match(app,/collection\(COLLECTION\)\.where\('status','==','published'\)/);
 assert.match(candidate,/request\.resource\.data\.status == 'importing'/);
 assert.match(candidate,/before\.status == 'importing' && after\.status == 'draft'/);
 assert.match(candidate,/before\.status == 'draft' && after\.status == 'published'/);
 assert.match(candidate,/parent\.chapterIndex\[data\.order\]\.id == chapterId/);
 assert.match(candidate,/data\.content\.toUtf8\(\)\.size\(\) <= 420000/);
 assert.match(manual,/guest-published-query/);
 assert.match(manual,/V49-draft-to-published/);
});

test('G2M revalidates schema on both create and update, forbids unwanted mutation',()=>{
 assert.match(candidate,/allow create: if isVerifiedV49Author\(\) && uidUnchanged\(request\.resource\.data\) &&\s*validBookV49/);
 assert.match(candidate,/allow update: if isVerifiedOwner\(resource\.data\.ownerUid\) &&\s*uidNotModified\([\s\S]*?validBookV49/);
 assert.match(candidate,/changes\.hasOnly\(\['status','updatedAt'\]\)/);
 assert.match(candidate,/changes\.hasOnly\(\['status','updatedAt','publishedAt'\]\)/);
 assert.match(candidate,/allow update, delete: if false/);
 for(const label of ['update-title-pollution','update-added-permission-field',
  'update-ownership-hijack','update-immutable-creation-time','update-invalid-status-jump',
  'orphan-chapter-create','chapter-oversize','guest-unfiltered-list'])assert.ok(manual.includes(label),label);
});

test('G2M Emulator is locked to localhost demo and explicitly documents unresolved metadata',()=>{
 assert.deepEqual(JSON.parse(read('../../tools/vangioi/firebase-emulator-g2m.json')),
  {emulators:{firestore:{host:'127.0.0.1',port:18083}}});
 assert.match(manual,/demo-vangioi-g2m/);
 assert.match(manual,/FIRESTORE_EMULATOR_HOST!==HOST/);
 assert.match(manual,/GOOGLE_APPLICATION_CREDENTIALS/);
 assert.match(manual,/publicParentMetadataStillExposed:true/);
 assert.match(candidate,/no bounded map\/list every\(\) operator/);
 assert.doesNotMatch(manual,/firebase deploy|https:\/\/firestore\.googleapis\.com/);
 for(const entry of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
  assert.equal(read(entry).includes('vangioi-g2m'),false);
});
