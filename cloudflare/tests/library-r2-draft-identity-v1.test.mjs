import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {issueDraftIds,prepareCreateOnlyDraft} from '../src/library-r2-draft-identity-v1.mjs';
const HASH='a'.repeat(64),identity={uid:'author',admin:true};
function sample(){
 const issued=issueDraftIds({identity,cryptoApi:webcrypto});
 return {identity,issued,
  manifest:{schema:1,bookId:issued.bookId,revisionId:issued.revisionId,
   source:{name:'test.epub',bytes:20,sha256:HASH},
   chapters:[{id:'chapter-0001',title:'Chương 1',order:0,wordCount:5,bytes:60,sha256:HASH}],assets:[]},
  layouts:[{chapterId:'chapter-0001',bytes:40,sha256:HASH}],
  metadata:{title:'Tên truyện',author:'Tác giả',description:''}};
}
test('trusted server allocates opaque distinct book/revision IDs bound to verified UID',()=>{
 const a=sample().issued,b=sample().issued;
 assert.match(a.bookId,/^epub-[a-f0-9]{32}$/);assert.match(a.revisionId,/^r-[a-f0-9]{32}$/);
 assert.notEqual(a.bookId,b.bookId);assert.equal(a.ownerUid,'author');
});
test('catalog descriptor is importing, create-if-absent, never publishable or deletable',()=>{
 const a=prepareCreateOnlyDraft(sample());
 assert.equal(a.collection,'epub_catalog_r2_v1');assert.deepEqual(a.precondition,{exists:false});
 assert.equal(a.fields.status.stringValue,'importing');assert.equal(a.fields.ownerUid.stringValue,'author');
 assert.equal(a.clientMayWrite,false);assert.equal(a.publishable,false);assert.equal(a.eligibleForDeletion,false);
});
test('non-admin or unverified UID cannot allocate or prepare a draft',()=>{
 assert.throws(()=>issueDraftIds({identity:{uid:'reader',admin:false},cryptoApi:webcrypto}),/admin/);
 assert.throws(()=>prepareCreateOnlyDraft({...sample(),identity:{uid:'reader',admin:false}}),/admin/);
});
test('refuse forged IDs, revision, owner and cross-account draft sessions',()=>{
 for(const mutate of [f=>f.manifest.bookId='epub-evil',f=>f.manifest.revisionId='r-00000000000000000000000000000000',
  f=>f.issued={...f.issued,ownerUid:'someone'},f=>f.identity={uid:'someone',admin:true}]){
  const a=sample();mutate(a);assert.throws(()=>prepareCreateOnlyDraft(a),/IDs must match/);
 }
});
test('descriptor has no credentials, EPUB text, remote URL or permission to overwrite',()=>{
 const a=prepareCreateOnlyDraft(sample()),s=JSON.stringify(a);
 assert.equal(a.precondition.exists,false);
 assert.ok(!s.includes('Authorization'));assert.ok(!s.includes('r2.dev'));
 assert.ok(!s.includes('"content"'));
});
