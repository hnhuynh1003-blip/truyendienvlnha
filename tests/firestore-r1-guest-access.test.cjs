'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');

const read=path=>readFileSync(join(__dirname,'..',path),'utf8');
const rules=read('security/firestore-r1-web-public-epub-approved.rules.review');
const prior=read('security/firestore-auth-approval-a1.rules.review');

// Source-contract regression checks. These do NOT execute Firestore's Rules
// evaluator: an Emulator suite must pass before owner authorizes Publish.
function between(source,from,to){
  const start=source.indexOf(from);
  const end=source.indexOf(to,start+from.length);
  assert.notEqual(start,-1,`Missing section: ${from}`);
  assert.notEqual(end,-1,`Missing end: ${to}`);
  return source.slice(start,end);
}

test('R1 is review-only and the production Rules/autodeploy config stay untouched',()=>{
  assert.match(rules,/R1 GUEST WEB \/ APPROVED EPUB — REVIEW ONLY/);
  assert.match(rules,/NOT DEPLOYED/);
  assert.match(read('index.html'),/window\.DUDU_ACCOUNT_APPROVAL_V1_READY\s*=\s*false/);
  assert.doesNotMatch(read('firebase.json'),/"firestore"\s*:/);
  const config=JSON.parse(read('firebase.r1-guest-review.json'));
  assert.equal(config.firestore.rules,'security/firestore-r1-web-public-epub-approved.rules.review');
  assert.equal(config.emulators.firestore.host,'127.0.0.1');
});

test('Guests can read all existing Web library data without authentication',()=>{
  const section=between(rules,'match /studio_data/main_library {','function honorAchievementIdsC463()');
  assert.match(section,/allow get, list:\s*if true;/);
  assert.match(section,/allow create, update:\s*if admin\(\)/);
  assert.match(section,/allow delete:\s*if admin\(\)/);
});

test('An Auth identity alone cannot list/read published EPUB metadata or chapters',()=>{
  const books=between(rules,'match /epub_stories_v49/{storyId} {','function validChapter(data, chapterId)');
  const chapters=between(rules,'match /chapters/{chapterId} {','match /revisions/{revId} {');
  assert.match(rules,/function approvedReader\(\)\s*\{[\s\S]*?signedIn\(\) && approvedPlayer\(request\.auth\.uid\)/);
  assert.match(rules,/function approvedPlayer\(uid\)\s*\{[\s\S]*?exists\(approvedPath\(uid\)\)[\s\S]*?\.data\.enabled == true/);
  assert.match(books,/allow get:\s*if \(approvedReader\(\) && resource != null\s*&& resource\.data\.status == 'published'\)/);
  assert.match(books,/allow list:\s*if request\.query\.limit != null && request\.query\.limit <= 60\s*&& \(\(approvedReader\(\) && resource\.data\.status == 'published'\)/);
  assert.match(chapters,/allow get, list:\s*if ownerOfBook\(storyId\)\s*\|\| \(approvedReader\(\) && exists\(bookPath\(storyId\)\)/);
  assert.match(chapters,/get\(bookPath\(storyId\)\)\.data\.status == 'published'/);
  assert.doesNotMatch(books,/allow (?:get|list|read):\s*if true/);
});

test('Unapproved users have no profile or economy access and cannot self-approve',()=>{
  const profiles=between(rules,'match /profiles_v2/{uid} {','match /user_profiles/{username} {');
  const approvals=between(rules,'match /approved_accounts_v1/{uid} {','function bookPath(storyId)');
  const economy=rules.slice(rules.indexOf('match /economy_accounts_v52/{uid} {'));
  assert.match(profiles,/allow get: if self\(uid\) && approvedPlayer\(uid\)/);
  assert.match(profiles,/allow create: if self\(uid\) && approvedPlayer\(uid\)/);
  assert.match(profiles,/allow update: if self\(uid\) && approvedPlayer\(uid\)/);
  assert.match(approvals,/allow create:\s*if admin\(\)/);
  assert.match(approvals,/allow update:\s*if admin\(\)/);
  assert.match(approvals,/allow delete:\s*if false/);
  assert.match(economy,/allow get: if self\(uid\) && approvedPlayer\(uid\)/);
  assert.match(rules,/match \/\{document=\*\*\}\s*\{\s*allow read, write: if false/);
});

test('EPUB administration, chapter revision and permanent delete guards are preserved verbatim',()=>{
  const stableStart='allow create: if admin()\n        && validImportCreate(request.resource.data, storyId);';
  const candidate=rules.slice(rules.indexOf(stableStart));
  const baseline=prior.slice(prior.indexOf(stableStart));
  assert.notEqual(rules.indexOf(stableStart),-1);
  assert.equal(candidate.replace(
    '|| (approvedReader() && exists(bookPath(storyId))',
    '|| (exists(bookPath(storyId))'
  ),baseline);
  assert.match(candidate,/allow delete: if admin\(\) && resource\.data\.ownerUid == request\.auth\.uid\s*&& resource\.data\.status == 'deleting'/);
  assert.match(candidate,/match \/revisions\/\{revId\}/);
  assert.match(candidate,/getAfter\(revisionPath\(storyId, chapterId, after\.lastRevisionId\)\)/);
});
