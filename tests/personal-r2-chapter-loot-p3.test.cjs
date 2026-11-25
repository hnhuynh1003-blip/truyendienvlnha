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
