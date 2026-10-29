'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const editor=require('../js/epub-chapter-editor-l2d3.js');
const owner={currentUser:{uid:'dudu-owner',getIdTokenResult:async()=>({claims:{admin:true}})}};
const other={currentUser:{uid:'other-owner',getIdTokenResult:async()=>({claims:{admin:true}})}};
const reader={currentUser:{uid:'reader',getIdTokenResult:async()=>({claims:{}})}};
const bookId='epub-sample',chapterId='chapter-0001';

function makeDB(){
 const docs=new Map(),operations=[];
 const path=id=>({id:id.split('/').at(-1),path:id,
  collection:name=>collection(id+'/'+name),
  get:async()=>docs.has(id)?{exists:true,data:()=>structuredClone(docs.get(id))}:{exists:false},
  });
 const collection=prefix=>({doc:id=>path(prefix+'/'+id)});
 const book={ownerUid:'dudu-owner',status:'published',chapterIndex:[{id:chapterId,title:'Chương 1'}]};
 const chapter={id:chapterId,title:'Chương 1',content:'kỳ an đến thượng hải.\nCâu kế tiếp.',wordCount:8,order:0};
 docs.set('epub_stories_v49/'+bookId,book);
 docs.set('epub_stories_v49/'+bookId+'/chapters/'+chapterId,chapter);
 return {docs,operations,collection,runTransaction:async fn=>{
  const writes=[];
  const tx={get:ref=>ref.get(),set:(ref,data)=>writes.push({kind:'set',ref,data}),
   update:(ref,data)=>writes.push({kind:'update',ref,data})};
  const result=await fn(tx);
  for(const {kind,ref,data} of writes){
   if(kind==='set'){assert.equal(docs.has(ref.path),false);docs.set(ref.path,structuredClone(data));}
   else Object.assign(docs.get(ref.path),structuredClone(data));
   operations.push(kind+':'+ref.path);
  }
  return result;
 }};
}
const getChapter=db=>db.docs.get('epub_stories_v49/'+bookId+'/chapters/'+chapterId);
const getRev=(db,v)=>db.docs.get('epub_stories_v49/'+bookId+'/chapters/'+chapterId+
 '/revisions/rev-'+String(v).padStart(6,'0'));

test('Preview compares text without writing and reports changed lines',()=>{
 const result=editor.previewContent('kỳ an\nở đó','Kỳ An\nở đó');
 assert.deepEqual(result.changedLines,[1]);
 assert.equal(result.changedLineCount,1);
 assert.equal(result.beforeWords,result.afterWords);
 assert.equal(result.changed,true);
});
test('Editing one published EPUB chapter saves immutable previous text atomically',async()=>{
 const db=makeDB(),old=getChapter(db).content;
 const result=await editor.saveChapter(bookId,chapterId,{db,auth:owner,
  content:'Kỳ An đến Thượng Hải.\nCâu kế tiếp.',expectedVersion:0,expectedContent:old});
 assert.equal(result.changed,true);
 assert.equal(result.version,1);
 assert.equal(result.backupId,'rev-000001');
 assert.equal(getRev(db,1).content,old);
 assert.equal(getRev(db,1).ownerUid,'dudu-owner');
 assert.equal(getChapter(db).content,'Kỳ An đến Thượng Hải.\nCâu kế tiếp.');
 assert.equal(getChapter(db).editVersion,1);
 assert.equal(db.docs.get('epub_stories_v49/'+bookId).chapterIndex[0].id,chapterId);
 assert.deepEqual(db.operations.map(x=>x.split(':')[0]),['set','update']);
});
test('A stale tab, a forbidden user, or a forged chapter never writes',async()=>{
 const db=makeDB(),old=getChapter(db).content;
 const input={db,auth:owner,content:'Bản mới',expectedVersion:0,expectedContent:old};
 await assert.rejects(editor.saveChapter(bookId,chapterId,{...input,auth:other}),/quyền/);
 await assert.rejects(editor.saveChapter(bookId,chapterId,{...input,auth:reader}),/quyền/);
 await assert.rejects(editor.saveChapter(bookId,'chapter-not-in-index',input),/Không tìm thấy|quyền/);
 assert.equal(db.operations.length,0);
 await editor.saveChapter(bookId,chapterId,input);
 const count=db.operations.length;
 await assert.rejects(editor.saveChapter(bookId,chapterId,input),/phiên khác/);
 assert.equal(db.operations.length,count);
 assert.equal(getRev(db,1).content,old);
});
test('No-op edit and unsafe content create no new revision',async()=>{
 const db=makeDB(),old=getChapter(db).content;
 const result=await editor.saveChapter(bookId,chapterId,{db,auth:owner,
  content:old,expectedVersion:0,expectedContent:old});
 assert.deepEqual(result,{changed:false,version:0});
 assert.equal(db.operations.length,0);
 for(const content of ['', '\u0001', 'a'.repeat(editor.MAX_CHARS+1)]){
  await assert.rejects(editor.saveChapter(bookId,chapterId,{db,auth:owner,
   content,expectedVersion:0,expectedContent:old}));
 }
 assert.equal(db.operations.length,0);
});
test('Restoring an old revision first backs up the current text and keeps version monotonic',async()=>{
 const db=makeDB(),old=getChapter(db).content;
 await editor.saveChapter(bookId,chapterId,{db,auth:owner,
  content:'Bản đã sửa',expectedVersion:0,expectedContent:old});
 const restored=await editor.restoreChapter(bookId,chapterId,'rev-000001',{
  db,auth:owner,expectedVersion:1});
 assert.equal(restored.version,2);
 assert.equal(getChapter(db).content,old);
 assert.equal(getRev(db,2).content,'Bản đã sửa');
 assert.equal(getRev(db,1).content,old);
 assert.equal(getRev(db,2).reason,'restore');
 assert.equal(db.operations.length,4);
 await assert.rejects(editor.restoreChapter(bookId,chapterId,'rev-000001',{
  db,auth:owner,expectedVersion:1}),/phiên khác/);
});
test('Archived EPUB can be edited but importing, draft and foreign owners cannot',async()=>{
 const db=makeDB(),old=getChapter(db).content;
 const book=db.docs.get('epub_stories_v49/'+bookId);
 for(const status of ['importing','draft']){
  book.status=status;
  await assert.rejects(editor.saveChapter(bookId,chapterId,{db,auth:owner,
   content:'Nội dung',expectedVersion:0,expectedContent:old}),/quyền/);
 }
 book.status='archived';
 const saved=await editor.saveChapter(bookId,chapterId,{db,auth:owner,
  content:'Nội dung',expectedVersion:0,expectedContent:old});
 assert.equal(saved.changed,true);
 assert.equal(book.status,'archived');
});
