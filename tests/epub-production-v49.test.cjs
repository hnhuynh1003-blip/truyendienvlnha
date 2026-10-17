const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../js/epub-production-v49.js');
const auth={currentUser:{uid:'real-author',getIdTokenResult:async()=>({claims:{admin:true}})}};
function db(){
 const stories=new Map(),chapters=new Map();
 const ref=id=>({
  id, get:async()=>stories.has(id)?{exists:true,data:()=>({...stories.get(id)})}:{exists:false},
  set:async data=>{stories.set(id,structuredClone(data))},
  update:async data=>{const value=stories.get(id);if(!value)throw Error('not found');Object.assign(value,data)},
  collection:p=>{
   assert.equal(p,'chapters');
   return {doc:cid=>({
    get:async()=>{const key=id+':'+cid;return chapters.has(key)?
     {exists:true,data:()=>chapters.get(key)}:{exists:false}},
    set:async value=>{chapters.set(id+':'+cid,value)}
   }),get:async()=>({docs:[...chapters.keys()].filter(k=>k.startsWith(id+':'))
    .map(k=>({id:k.slice(id.length+1),data:()=>chapters.get(k)}))})};
  }
 });
 const coll={
  doc:ref,where:(field,op,value)=>{assert.equal(field,'status');assert.equal(op,'==');return {
   limit:n=>({get:async()=>({docs:[...stories.entries()].filter(([id,x])=>x.status===value)
    .slice(0,n).map(([id,x])=>({id,data:()=>x}))})})
  }}
 };
 const batch=()=>{const records=[];return {set:(r,data)=>records.push([r,data]),
  commit:async()=>{for(const [r,d] of records)await r.set(d)}}};
 return {collection:(name)=>{assert.equal(name,api.COLLECTION);return coll},batch,stories,chapters};
}
const sample={title:'Bản chính thức',author:'Người viết',sourceName:'example.epub',
 chapters:[{title:'Chương 1',content:'Xin chào bạn.'},{title:'Chương 2',content:'Đây là chương thứ hai.'}]};
test('production EPUB import is private until explicit verified admin publish',async()=>{
 const store=db(),events=[];
 const newBook=await api.importDraft(sample,{db:store,auth,bookId:'epub-safe-demo',
  onProgress:p=>events.push(p)});
 assert.equal(newBook.status,'draft');assert.equal(newBook.chapterCount,2);
 assert.deepEqual(events,[100]);
 assert.equal((await api.publicBooks(store)).length,0);
 assert.equal(store.chapters.size,2);
 assert.equal(store.stories.get(newBook.id).status,'draft');
 await assert.rejects(api.readChapter(store,newBook.id,'chapter-0001'),/chưa được xuất bản/);
 const ready=await api.publishDraft(newBook.id,{db:store,auth,confirmRights:true});
 assert.equal(ready.status,'published');
 const published=await api.publicBooks(store);
 assert.equal(published[0].id,newBook.id);
 assert.equal(published[0].chapters[0].content,null);
 assert.equal((await api.readChapter(store,newBook.id,'chapter-0001')).content,'Xin chào bạn.');
});
test('admin claim, duplicate and copyright confirmation are required',async()=>{
 const store=db();const foreign={currentUser:{uid:'reader',getIdTokenResult:async()=>({claims:{}})}};
 await assert.rejects(api.importDraft(sample,{db:store,auth:foreign,bookId:'epub-x123'}),/admin claim/);
 assert.equal(store.stories.size,0);
 const created=await api.importDraft(sample,{db:store,auth,bookId:'epub-x123'});
 await assert.rejects(api.importDraft(sample,{db:store,auth,bookId:created.id}),/ghi đè/);
 await assert.rejects(api.publishDraft(created.id,{db:store,auth}),/Chưa xác nhận/);
 const wrong={currentUser:{uid:'other',getIdTokenResult:async()=>({claims:{admin:true}})}};
 await assert.rejects(api.publishDraft(created.id,{db:store,auth:wrong,confirmRights:true}),/chưa đủ điều kiện/);
 assert.equal(store.stories.get(created.id).status,'draft');
});
test('partial import errors never mark a public book',async()=>{
 const store=db();
 const original=store.batch;
 let attempts=0;
 store.batch=()=>{const value=original();const commit=value.commit;value.commit=async()=>{
  attempts++;if(attempts===2)throw Error('offline');
  return commit();
 };return value};
 const chapters=Array.from({length:5},(_,i)=>({title:'Chương '+i,content:'Văn bản '+i}));
 await assert.rejects(api.importDraft({...sample,chapters},{db:store,auth,bookId:'epub-fail-demo'}),/chưa công khai/);
 assert.equal(store.stories.get('epub-fail-demo').status,'importing');
 assert.equal((await api.publicBooks(store)).length,0);
});
test('oversized chapter UTF-8 content refused before any Firestore writes',async()=>{
 const store=db();
 await assert.rejects(api.importDraft({...sample,chapters:[{title:'Lớn',content:'ơ'.repeat(220000)}]},
  {db:store,auth,bookId:'epub-huge'}),/giới hạn/);
 assert.equal(store.stories.size,0);
});
