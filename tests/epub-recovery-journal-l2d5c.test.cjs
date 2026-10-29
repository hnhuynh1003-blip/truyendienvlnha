'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const journalApi=require('../js/epub-recovery-journal-l2d5c.js');
const editor=require('../js/epub-chapter-editor-l2d3.js');
const bulk=require('../js/epub-bulk-replace-l2d4.js');
const coordinator=require('../js/epub-bulk-save-l2d5b.js');
const bookId='epub-sample';
const owner={currentUser:{uid:'owner',getIdTokenResult:async()=>({claims:{admin:true}})}};
const other={currentUser:{uid:'other',getIdTokenResult:async()=>({claims:{admin:true}})}};

function memoryStorage(){
 const map=new Map();
 return {map,getItem:key=>map.get(key)??null,
  setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
}
function fixture(){
 const docs=new Map(),writes=[];let offline=false;
 const clone=value=>structuredClone(value);
 const ref=path=>({path,id:path.split('/').at(-1),
  collection:name=>collection(path+'/'+name),
  get:async()=>{
   if(offline)throw Error('Mất kết nối');
   return docs.has(path)?{exists:true,data:()=>clone(docs.get(path))}:{exists:false};
  }});
 const collection=path=>({doc:id=>ref(path+'/'+id)});
 const root='epub_stories_v49/'+bookId;
 const originals=['kỳ an đi đến thượng hải. Một câu chuyện mở đầu.',
  'Buổi sáng kỳ an thức giấc ở thượng hải.','Địa điểm cuối cùng là thượng hải.'];
 const chapters=originals.map((content,i)=>({id:'chapter-000'+(i+1),title:'Chương '+(i+1),
  content,editVersion:0}));
 docs.set(root,{ownerUid:'owner',status:'published',chapterIndex:chapters.map(({id})=>({id}))});
 chapters.forEach(ch=>docs.set(root+'/chapters/'+ch.id,ch));
 const db={collection:()=>collection('epub_stories_v49'),setOffline:value=>{offline=value;},
  runTransaction:async fn=>{
   const queued=[];
   const result=await fn({get:ref=>ref.get(),
    set:(ref,value)=>queued.push(['set',ref,value]),
    update:(ref,value)=>queued.push(['update',ref,value])});
   for(const [type,ref,value] of queued){
    if(type==='set')docs.set(ref.path,clone(value));
    else Object.assign(docs.get(ref.path),clone(value));
    writes.push(type+':'+ref.path);
   }
   return result;
  }};
 const plan=bulk.prepare(chapters,[{from:'kỳ an',to:'Kỳ An'},
  {from:'thượng hải',to:'Thượng Hải'}]);
 const selected=bulk.selectedPatches(plan,plan.hits.map(hit=>hit.id));
 const chapter=i=>docs.get(root+'/chapters/chapter-000'+i);
 return {docs,db,writes,selected,chapter,storage:memoryStorage()};
}

test('Crash manifest stores compact edits, not any complete chapter text',()=>{
 const f=fixture(),journal=journalApi.create({storage:f.storage});
 const record=journal.begin(bookId,'owner',f.selected.patches);
 assert.equal(record.entries.length,3);
 const text=[...f.storage.map.values()][0];
 assert.equal(text.includes(f.chapter(1).content),false);
 assert.equal(text.includes('"expectedContent"'),false);
 assert.equal(text.includes('"content"'),false);
 assert.equal(journal.read('owner',bookId).entries[0].edits.length,2);
 assert.throws(()=>journal.begin(bookId,'owner',f.selected.patches),/Đã có lượt/);
 assert.equal(f.writes.length,0);
});
test('After tab reload, classify committed and untouched chapters, then resume safely',async()=>{
 const f=fixture(),first=journalApi.create({storage:f.storage});
 first.begin(bookId,'owner',f.selected.patches);
 await editor.saveChapter(bookId,f.selected.patches[0].chapterId,{
  db:f.db,auth:owner,content:f.selected.patches[0].content,
  expectedVersion:0,expectedContent:f.selected.patches[0].expectedContent});
 const afterReload=journalApi.create({storage:f.storage});
 const state=await afterReload.hydrate('owner',bookId,{db:f.db,auth:owner});
 assert.equal(state.phase,'partial');
 assert.equal(state.done.length,1);assert.equal(state.pending.length,2);
 assert.equal(state.unknown.length,0);
 const result=await coordinator.resume(state,{db:f.db,auth:owner,chapterApi:editor});
 assert.equal(result.phase,'complete');
 const complete=await afterReload.hydrate('owner',bookId,{db:f.db,auth:owner});
 assert.equal(complete.phase,'complete');
 assert.deepEqual([1,2,3].map(i=>f.chapter(i).editVersion),[1,1,1]);
 afterReload.clear('owner',bookId);
 assert.equal(afterReload.read('owner',bookId),null);
});
test('Interrupted undo survives reload without restoring the same chapter twice',async()=>{
 const f=fixture(),journal=journalApi.create({storage:f.storage});
 journal.begin(bookId,'owner',f.selected.patches);
 await coordinator.apply(bookId,f.selected.patches,{db:f.db,auth:owner,
  chapterApi:editor,confirmed:true});
 journal.markUndo('owner',bookId);
 const third=f.selected.patches[2];
 await editor.restoreChapter(bookId,third.chapterId,'rev-000001',{
  db:f.db,auth:owner,expectedVersion:1});
 const afterReload=journalApi.create({storage:f.storage});
 const state=await afterReload.hydrate('owner',bookId,{db:f.db,auth:owner});
 assert.equal(state.phase,'restoring');
 assert.equal(state.restored.length,1);
 assert.equal(state.done.length,2);
 assert.equal(state.pending.length,0);
 await coordinator.undo(state,{db:f.db,auth:owner,chapterApi:editor});
 const final=await afterReload.hydrate('owner',bookId,{db:f.db,auth:owner});
 assert.equal(final.phase,'restored');
 assert.equal(final.done.length,0);
 assert.equal(final.restored.length,3);
 assert.deepEqual([1,2,3].map(i=>f.chapter(i).editVersion),[2,2,2]);
});
test('No storage, quota failure, wrong owner, corruption and offline reads fail closed',async()=>{
 const f=fixture();
 assert.throws(()=>journalApi.create({storage:null}).begin(bookId,'owner',f.selected.patches),/bộ nhớ/);
 const unavailable=journalApi.create({storage:{...f.storage,setItem:()=>{throw Error('Quota');}}});
 assert.throws(()=>unavailable.begin(bookId,'owner',f.selected.patches),/Không lưu được nhật ký/);
 const journal=journalApi.create({storage:f.storage});journal.begin(bookId,'owner',f.selected.patches);
 await assert.rejects(journal.hydrate('owner',bookId,{db:f.db,auth:other}),/quyền/);
 f.db.setOffline(true);
 await assert.rejects(journal.hydrate('owner',bookId,{db:f.db,auth:owner}),/Mất kết nối/);
 f.db.setOffline(false);
 const chapter=f.chapter(1);chapter.content='Dữ liệu đổi ở tab khác';
 const uncertain=await journal.hydrate('owner',bookId,{db:f.db,auth:owner});
 assert.equal(uncertain.phase,'uncertain');
 assert.equal(uncertain.unknown.length,1);
 assert.equal(f.writes.length,0);
 const slot=[...f.storage.map.keys()][0];
 f.storage.map.set(slot,'{not valid');
 assert.throws(()=>journal.read('owner',bookId),/bị hỏng/);
 assert.throws(()=>journal.begin(bookId,'owner',f.selected.patches),/bị hỏng/);
});
