'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepareRules}=require('../scripts/l6p2c4-prepare-rules.cjs');
const owner="rules_version = '2';\nservice cloud.firestore {\n match /databases/{database}/documents {\n function admin(){return request.auth.token.admin == true;}\n function approvedPlayer(uid){return exists(existingProfilePath(uid)) && enabled == true;}\n function approvedReader(){return approvedPlayer(request.auth.uid);}\n match /epub_stories_v49/{storyId} {allow get: if approvedReader();}\n }}\n";
const fragment="// REVIEW FRAGMENT ONLY\nmatch /epub_catalog_r2_v1/{bookId} {\n allow get: if approvedReader() || admin();\n allow list: if false;\n allow create, update, delete: if false;\n}\n";
test('owner R1.2 catalog rules inserted inside match with current EPUB rules retained',()=>{
 const output=prepareRules(owner,fragment);
 assert.match(output,/match \/databases\/\{database\}\/documents \{\s*\/\/ L6-P2C4/);
 assert.ok(output.includes('match /epub_stories_v49/{storyId}'));
 assert.ok(output.includes('allow create, update, delete: if false;'));
});
test('fails if owner policy changed, grandfathering absent or duplicate catalog exists',()=>{
 assert.throws(()=>prepareRules(owner.replace('function approvedReader','function otherReader'),fragment),/Owner R1.2/);
 assert.throws(()=>prepareRules(owner.replace('enabled == true','enabled == false'),fragment),/Owner R1.2/);
 assert.throws(()=>prepareRules(owner+fragment,fragment),/already exists/);
});
test('refuses weaker catalog fragment that permits writing or listing',()=>{
 assert.throws(()=>prepareRules(owner,fragment.replace('allow create, update, delete: if false;','allow write: if true;')),/fragment/);
 assert.throws(()=>prepareRules(owner,fragment.replace('allow list: if false;','allow list: if true;')),/fragment/);
});
