// R1.2 review-only checks. These DO NOT replace Firebase Rules Emulator tests.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const previous=read('security/firestore-r11-invite-approved.rules.review');
const candidate=read('security/firestore-r12-grandfathered-profiles.rules.review');

test('R1.2 allows only existing self-owned profiles as an approval fallback',()=>{
 assert.match(candidate,/function existingProfilePath\(uid\)\s*\{\s*return \/databases\/\$\(database\)\/documents\/profiles_v2\/\$\(uid\);/);
 assert.match(candidate,/function approvedPlayer\(uid\)\s*\{[\s\S]*?return admin\(\) \|\| \(\s*exists\(approvedPath\(uid\)\)\s*\? get\(approvedPath\(uid\)\)\.data\.enabled == true\s*: \(self\(uid\) && exists\(existingProfilePath\(uid\)\)\)\s*\);/);
 assert.match(candidate,/match \/profiles_v2\/\{uid\} \{\s*allow get: if self\(uid\) && approvedPlayer\(uid\);/);
 assert.match(candidate,/allow create: if self\(uid\) && approvedPlayer\(uid\)/);
 assert.match(candidate,/allow update: if self\(uid\) && approvedPlayer\(uid\)/);
 assert.match(candidate,/match \/approved_accounts_v1\/\{uid\} \{\s*allow get: if self\(uid\) \|\| admin\(\);/);
 assert.match(candidate,/allow delete: if false;/);
});

test('R1.2 changes no rules for invites, shared Web, EPUB, economy, other modules',()=>{
 const boundary='    function invitePath(code) {';
 assert.ok(previous.includes(boundary));
 assert.equal(candidate.slice(candidate.indexOf(boundary)),
  previous.slice(previous.indexOf(boundary)));
 assert.match(candidate,/match \/studio_data\/main_library \{\s*allow get, list: if true;/);
 assert.match(candidate,/match \/epub_stories_v49\/\{storyId\}/);
 assert.match(candidate,/deletingOwnedBook\(storyId\)/);
 assert.match(candidate,/match \/user_profiles\/\{username\} \{\s*allow read, write: if false;/);
 assert.match(candidate,/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

test('R1.2 remains strictly a review candidate, without deploying or toggling access',()=>{
 assert.match(candidate,/REVIEW ONLY, NEVER AUTO-DEPLOY/);
 assert.match(candidate,/rules_version = '2';/);
 const config=JSON.parse(read('firebase.r12-grandfathered-review.json'));
 assert.equal(config.firestore.rules,'security/firestore-r12-grandfathered-profiles.rules.review');
 assert.equal(config.emulators.firestore.host,'127.0.0.1');
 const index=read('index.html');
 assert.match(index,/DUDU_ACCOUNT_APPROVAL_V1_READY\s*=\s*false/);
 assert.match(index,/DUDU_ACCOUNT_INVITES_R11_READY\s*=\s*false/);
 assert.doesNotMatch(read('firebase.json'),/"firestore"\s*:/);
 assert.doesNotMatch(read('firestore.rules'),/function existingProfilePath\(/);
});
