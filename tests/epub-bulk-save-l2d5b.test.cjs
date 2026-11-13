'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const coordinator=require('../js/epub-bulk-save-l2d5b.js');
const editor=require('../js/epub-chapter-editor-l2d3.js');
const owner={currentUser:{uid:'owner',getIdTokenResult:async()=>({claims:{admin:true}})}};
const reader={currentUser:{uid:'reader',getIdTokenResult:async()=>({claims:{}})}};
const stranger={currentUser:{uid:'other',getIdTokenResult:async()=>({claims:{admin:true}})}};
const bookId='epub-fixture';

function fixture(){
 const docs=new Map(),ops=[];let unavailable=false;
 const clone=v=>structuredClone(v);
 const ref=path=>({id:path.split('/').at(-1),path,
  get:async()=>{
   if(unavailable)throw Error('Mất kết nối thử nghiệm');
   return docs.has(path)?{exists:true,data:()=>clone(docs.get(path))}:{exists:false};
  },collection:name=>collection(path+'/'+name)});
 const collection=prefix=>({doc:id=>ref(prefix+'/'+id)});
 docs.set('epub_stories_v49/'+bookId,{ownerUid:'owner',status:'published',
  chapterIndex:[{id:'chapter-0001'},{id:'chapter-0002'},{id:'chapter-0003'}]});
 for(let i=1;i<=3;i++)docs.set('epub_stories_v49/'+bookId+'/chapters/chapter-000'+i,{
  id:'chapter-000'+i,title:'Chương '+i,order:i-1,content:'kỳ an ở chương '+i,wordCount:5
 });
 const db={docs,ops,collection:()=>collection('epub_stories_v49'),
  setUnavailable:value=>{unavailable=value;},
  runTransaction:async action=>{
   const writes=[];
   const result=await action({get:r=>r.get(),set:(r,data)=>writes.push(['set',r,data]),
    update:(r,data)=>writes.push(['update',r,data])});
   for(const [kind,target,data] of writes){
    if(kind==='set'){assert.equal(docs.has(target.path),false);docs.set(target.path,clone(data));}
    else Object.assign(docs.get(target.path),clone(data));
    ops.push(kind+':'+target.path);
   }
   return result;
  }};
 const patches=[1,2,3].map(i=>({chapterId:'chapter-000'+i,
  expectedContent:'kỳ an ở chương '+i,content:'Kỳ An ở chương '+i,expectedVersion:0}));
 const chapter=i=>docs.get('epub_stories_v49/'+bookId+'/chapters/chapter-000'+i);
 return {db,patches,chapter};
}

test('Bulk save explicitly requires confirmation and owner admin identity',async()=>{
 const {db,patches}=fixture();
 await assert.rejects(coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:editor}),/Chưa xác nhận/);
 await assert.rejects(coordinator.apply(bookId,patches,{db,auth:reader,chapterApi:editor,confirmed:true}),/quyền/);
 await assert.rejects(coordinator.apply(bookId,patches,{db,auth:stranger,chapterApi:editor,confirmed:true}),/quyền|phiên|chủ sở hữu/);
 assert.equal(db.ops.length,0);
});
test('Save all chapters one by one with independent immutable revisions',async()=>{
 const {db,patches,chapter}=fixture(),events=[];
 const result=await coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:editor,
  confirmed:true,onProgress:e=>events.push(e)});
 assert.equal(result.phase,'complete');assert.equal(result.done.length,3);
 assert.equal(result.pending.length,0);assert.equal(result.unknown.length,0);
 assert.deepEqual([1,2,3].map(i=>chapter(i).editVersion),[1,1,1]);
 assert.deepEqual([1,2,3].map(i=>chapter(i).content.startsWith('Kỳ An')),[true,true,true]);
 assert.equal(db.ops.filter(s=>s.startsWith('set:')).length,3);
 assert.equal(events.filter(e=>e.phase==='saved').length,3);
});
test('Failure before chapter two commit stops safely and resume only runs pending patches',async()=>{
 const {db,patches,chapter}=fixture();
 const failSecond={...editor,saveChapter:async(id,cid,opts)=>{
  if(cid==='chapter-0002')throw Error('Mô phỏng đứt mạng');
  return editor.saveChapter(id,cid,opts);
 }};
 const partial=await coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:failSecond,confirmed:true});
 assert.equal(partial.phase,'partial');
 assert.deepEqual(partial.done.map(d=>d.patch.chapterId),['chapter-0001']);
 assert.deepEqual(partial.pending.map(p=>p.chapterId),['chapter-0002','chapter-0003']);
 assert.equal(chapter(1).editVersion,1);
 assert.equal(chapter(2).editVersion,undefined);
 const resumed=await coordinator.resume(partial,{db,auth:owner,chapterApi:editor});
 assert.equal(resumed.phase,'complete');assert.equal(resumed.done.length,3);
 assert.deepEqual([1,2,3].map(i=>chapter(i).editVersion),[1,1,1]);
});
test('Lost network acknowledgment after commit is detected without double-saving',async()=>{
 const {db,patches,chapter}=fixture();
 const afterCommit={...editor,saveChapter:async(id,cid,opts)=>{
  const committed=await editor.saveChapter(id,cid,opts);
  if(cid==='chapter-0002')throw Error('Không nhận được ACK');
  return committed;
 }};
 const result=await coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:afterCommit,confirmed:true});
 assert.equal(result.phase,'complete');
 assert.equal(result.done.length,3);
 assert.equal(chapter(2).editVersion,1);
 assert.equal(db.ops.filter(s=>s.includes('chapters/chapter-0002/revisions')).length,1);
});
test('Unverifiable chapter is marked uncertain until explicitly reconciled',async()=>{
 const {db,patches}=fixture();
 const broken={...editor,saveChapter:async(id,cid,opts)=>{
  if(cid==='chapter-0002'){
   db.setUnavailable(true);throw Error('Ngoại tuyến');
  }
  return editor.saveChapter(id,cid,opts);
 }};
 const result=await coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:broken,confirmed:true});
 assert.equal(result.phase,'uncertain');
 assert.equal(result.unknown[0].chapterId,'chapter-0002');
 await assert.rejects(coordinator.resume(result,{db,auth:owner,chapterApi:editor}),/Chưa thể tiếp tục/);
 await assert.rejects(coordinator.undo(result,{db,auth:owner,chapterApi:editor}),/Chưa có chương/);
 db.setUnavailable(false);
 const reconciled=await coordinator.reconcile(result,{db,auth:owner});
 assert.equal(reconciled.phase,'partial');assert.equal(reconciled.unknown.length,0);
 assert.deepEqual(reconciled.pending.map(p=>p.chapterId),['chapter-0002','chapter-0003']);
 const resumed=await coordinator.resume(reconciled,{db,auth:owner,chapterApi:editor});
 assert.equal(resumed.phase,'complete');
});
test('Undo only successful chapters, in reverse order, preserving every revision',async()=>{
 const {db,patches,chapter}=fixture();
 const done=await coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:editor,confirmed:true});
 const reverted=await coordinator.undo(done,{db,auth:owner,chapterApi:editor});
 assert.equal(reverted.phase,'restored');assert.equal(reverted.restored.length,3);
 assert.deepEqual(reverted.restored.map(x=>x.patch.chapterId),
  ['chapter-0003','chapter-0002','chapter-0001']);
 assert.deepEqual([1,2,3].map(i=>chapter(i).content.startsWith('kỳ an')),[true,true,true]);
 assert.deepEqual([1,2,3].map(i=>chapter(i).editVersion),[2,2,2]);
 assert.equal(db.ops.filter(s=>s.includes('/revisions/')).length,6);
});
test('Undo preflight refuses changes made after save and writes nothing',async()=>{
 const {db,patches,chapter}=fixture();
 const done=await coordinator.apply(bookId,patches,{db,auth:owner,chapterApi:editor,confirmed:true});
 chapter(2).content='Một sửa đổi từ phiên khác';
 const ops=db.ops.length;
 await assert.rejects(coordinator.undo(done,{db,auth:owner,chapterApi:editor}),/Dữ liệu đã thay đổi/);
 assert.equal(db.ops.length,ops);
});
