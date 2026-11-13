'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');

const read=path=>readFileSync(join(__dirname,'..',path),'utf8');
const source=read('security/firestore-epub-l2d2-merged.rules.review');

// Structural regression tests only. These do NOT replace the Firebase Rules
// Emulator or validate the live Firebase project's deployed configuration.
test('Merged candidate preserves current user-provided public and profile permissions',()=>{
 assert.match(source,/rules_version = '2'/);
 assert.match(source,/match \/studio_data\/main_library\s*\{\s*allow read: if true;/);
 assert.match(source,/allow write: if request\.auth != null\s*&& request\.auth\.token\.admin == true/);
 assert.match(source,/match \/profiles_v2\/\{uid\}\s*\{\s*allow read, write: if request\.auth != null\s*&& request\.auth\.uid == uid/);
 assert.match(source,/match \/user_profiles\/\{username\}\s*\{\s*allow read, write: if false;/);
 assert.match(source,/allow get, list: if epubIsAdminV49\(\)\s*\|\| resource\.data\.status == 'published'/);
 assert.match(source,/match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
});

test('Original EPUB importing, publishing and chapter protections remain intact',()=>{
 assert.match(source,/resource\.data\.status == 'importing'\s*&& request\.resource\.data\.status == 'draft'/);
 assert.match(source,/resource\.data\.status == 'draft'\s*&& request\.resource\.data\.status == 'published'/);
 assert.match(source,/match \/chapters\/\{chapterId\}/);
 assert.match(source,/request\.resource\.data\.content\.size\(\) <= 420000/);
 assert.match(source,/allow update, delete: if false/);
 assert.match(source,/allow delete: if false/);
 assert.equal((source.match(/allow update: if epubIsAdminV49\(\)/g)||[]).length,2);
 assert.doesNotMatch(source,/allow delete: if true|allow update, delete: if true/);
});

test('New rule only permits owner metadata edits or reversible published-archived transitions',()=>{
 const branch=source.slice(source.indexOf('// L2D.2: quyền CHỈ chủ EPUB'));
 assert.match(branch,/resource\.data\.ownerUid == request\.auth\.uid/);
 assert.match(branch,/request\.resource\.data\.ownerUid == resource\.data\.ownerUid/);
 assert.match(branch,/request\.resource\.data\.chapterIndex == resource\.data\.chapterIndex/);
 assert.match(branch,/request\.resource\.data\.chapterCount == resource\.data\.chapterCount/);
 assert.match(branch,/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\[\s*'title','author','genre','desc','publicationState','coverImage','updatedAt'/);
 assert.match(branch,/resource\.data\.status == 'published' && request\.resource\.data\.status == 'archived'/);
 assert.match(branch,/resource\.data\.status == 'archived' && request\.resource\.data\.status == 'published'/);
 assert.match(branch,/affectedKeys\(\)\.hasOnly\(\[\s*'status','updatedAt'/);
 assert.match(source,/request\.resource\.data\.get\('desc',''\)/);
 assert.match(source,/request\.resource\.data\.get\('coverImage',''\)/);
});

test('Frontend owner-management gate is enabled after C3.0 rules, no CLI deployment is configured',()=>{
 assert.match(read('index.html'),/const EPUB_MANAGEMENT_L2D2_ENABLED=true/);
 assert.doesNotMatch(read('firebase.json'),/"firestore"\s*:/);
 assert.match(source,/NOT DEPLOYED/);
});
