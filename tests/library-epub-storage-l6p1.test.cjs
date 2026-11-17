'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const storage = require('../js/library-epub-storage-l6p1.js');
const sample = Object.freeze({title:'Chương 1',content:'Tu vi tăng.\n\nĐến cảnh giới mới.'});
const bookId='epub-f6fbb7ed', chapterId='chapter-0001';
test('L6-P1 defaults to Firestore without other reads/writes',async()=>{
 const calls=[];
 const adapter=storage.create({firestoreReader:async(b,c)=>{calls.push([b,c]);return sample;},r2Reader:async()=>{throw Error('R2 must not be called');}});
 const v=await adapter.readChapter(bookId,chapterId);
 assert.deepEqual(v,sample);assert.notStrictEqual(v,sample);assert.equal(Object.isFrozen(v),true);
 assert.deepEqual(calls,[[bookId,chapterId]]);
});
test('L6-P1 blocks disabled R2 with zero provider calls and no fallback',async()=>{
 let fs=0,r2=0;
 const adapter=storage.create({firestoreReader:async()=>{fs++;return sample;},r2Reader:async()=>{r2++;return sample;}});
 await assert.rejects(()=>adapter.readChapter(bookId,chapterId,{backend:'r2'}),/chưa được kích hoạt/);
 assert.equal(fs,0);assert.equal(r2,0);
});
test('L6-P1 cannot start R2 without an injected provider',async()=>{
 const adapter=storage.create({firestoreReader:async()=>sample,r2Enabled:true});
 await assert.rejects(()=>adapter.readChapter(bookId,chapterId,{backend:'r2'}),/chưa được kích hoạt/);
});
test('L6-P1 injected R2 mock works only with explicit opt-in',async()=>{
 let calls=0;
 const adapter=storage.create({firestoreReader:async()=>{throw Error('Unexpected Firestore');},r2Reader:async(b,c)=>{calls++;assert.equal(b,bookId);assert.equal(c,chapterId);return sample;},r2Enabled:true});
 assert.deepEqual(await adapter.readChapter(bookId,chapterId,{backend:'r2'}),sample);assert.equal(calls,1);
});
test('L6-P1 rejects invalid IDs and unknown backend before provider access',async()=>{
 let calls=0;const adapter=storage.create({firestoreReader:async()=>{calls++;return sample;}});
 for(const [b,c] of [['../chapter',chapterId],[bookId,'../../etc'],[bookId,'ch/one'],['x',chapterId]])
  await assert.rejects(()=>adapter.readChapter(b,c),/không hợp lệ/);
 await assert.rejects(()=>adapter.readChapter(bookId,chapterId,{backend:'web'}),/không được hỗ trợ/);
 assert.equal(calls,0);
});
test('L6-P1 rejects malformed/oversized chapter payloads',async()=>{
 const invalid=[{title:'Chương 1',content:''},{title:'',content:'Một chữ'},
 {title:'Chương 1',content:'x'.repeat(220001)},
 {title:'Chương 1',content:'\u0000không hợp lệ'},
 {title:'Chương 1',content:'🙂'.repeat(110000)}];
 for(const payload of invalid){
  const adapter=storage.create({firestoreReader:async()=>payload});
  await assert.rejects(()=>adapter.readChapter(bookId,chapterId),/Phản hồi chương EPUB không hợp lệ/);
 }
 assert.deepEqual(invalid[0],{title:'Chương 1',content:''});
});
test('L6-P1 preserves NFD Vietnamese and line breaks verbatim',async()=>{
 const sampleNfd={title:'Tiếng Việt',content:'NFD: '+'điện'.normalize('NFD')+'\n\nĐọc tiếp.'};
 const adapter=storage.create({firestoreReader:async()=>sampleNfd});
 assert.equal((await adapter.readChapter(bookId,chapterId)).content,sampleNfd.content);
});
test('L6-P1 R2 mock failure does not fallback to Firestore',async()=>{
 let fs=0;
 const adapter=storage.create({firestoreReader:async()=>{fs++;return sample;},r2Reader:async()=>{throw Error('denied by server');},r2Enabled:true});
 await assert.rejects(()=>adapter.readChapter(bookId,chapterId,{backend:'r2'}),/denied by server/);
 assert.equal(fs,0);
});
test('L6-P1 rejects missing Firestore reader and nonboolean R2 gate',()=>{
 assert.throws(()=>storage.create(),/Thiếu nguồn/);
 assert.throws(()=>storage.create({firestoreReader:async()=>sample,r2Enabled:'true'}),/[Cc]ờ thử nghiệm/);
});
