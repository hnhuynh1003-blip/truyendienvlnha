const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const model=require('../js/personal-r2-chapter-loot-p3.js');
const ctx={uid:'reader-a',storyId:'book-1',chapterId:'chapter-1',revision:'r-0123456789abcdef'};
test('same normalized R2 content across revisions and reimports gets same claim identity',async()=>{
 const a=await model.prepare({...ctx,content:'Một  đoạn\ntruyện.',cryptoApi:webcrypto});
 const b=await model.prepare({...ctx,storyId:'book-2',chapterId:'chapter-2',revision:'r-fedcba9876543210',content:'Một đoạn truyện.',cryptoApi:webcrypto});
 assert.equal(a.digest,b.digest);assert.equal(model.source(a).chapterId,model.source(b).chapterId);
 assert.notEqual((await model.prepare({...ctx,content:'Khác.',cryptoApi:webcrypto})).digest,a.digest);
 assert.equal(model.ENABLED,true);
});
test('R2 eligibility requires matching account, content/revision, media, active visible reading and 30 seconds',async()=>{
 const identity=await model.prepare({...ctx,content:'Nội dung chương.',cryptoApi:webcrypto});
 const observation={context:{...ctx,mode:'EPUB_R2'},chapterMs:30000,active:true};
 const input={...ctx,identity,observation,mediaReady:true,visible:true,online:true};
 assert.equal(model.eligible(input),true);
 for(const patch of [{uid:'other'},{revision:'r-fedcba9876543210'},{mediaReady:false},{visible:false},{online:false},
 {observation:{...observation,chapterMs:29999}},{observation:{...observation,active:false}},
 {observation:{...observation,context:{...observation.context,mode:'WEB'}}}])assert.equal(model.eligible({...input,...patch}),false);
});

test('CP013 A-08 manifest and loot preparation agree at identifier boundary without changing digest',async()=>{
 const manifest=require('../js/library-epub-r2-manifest-l6p2a.js');
 for(const n of [4,119,120,121]){
  const storyId='b'+'a'.repeat(n-1),chapterId='c'+'z'.repeat(n-1),sha256='f'.repeat(64);
  const m=manifest.validate({schema:1,bookId:storyId,revisionId:ctx.revision,source:{name:'fixture.epub',bytes:100,sha256},
   chapters:[{id:chapterId,title:'Fixture',order:0,wordCount:10,bytes:100,sha256}],assets:[]});
  const identity=await model.prepare({...ctx,storyId:m.bookId,chapterId:m.chapters[0].id,content:'same fixture',cryptoApi:webcrypto});
  const baseline=await model.prepare({...ctx,content:'same fixture',cryptoApi:webcrypto});
  assert.equal(identity.digest,baseline.digest);
  assert.deepEqual(model.source(identity).r2Origin,{storyId,chapterId,revision:ctx.revision});
 }
 for(const id of ['a'.repeat(122),'a'.repeat(120)+'/', 'abc']){
  assert.equal(model.validSource({...ctx,chapterId:id}),false);
  await assert.rejects(model.prepare({...ctx,chapterId:id,content:'fixture',cryptoApi:webcrypto}),/r2-loot-identity/);
 }
});
