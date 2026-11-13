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

test('V57 resume interrupted private import without overwriting prior chapters',async()=>{
 const store=db();
 const original=store.batch;
 let batchNo=0;
 store.batch=()=>{const b=original(),commit=b.commit;
  b.commit=async()=>{batchNo++;if(batchNo===2)throw Error('offline');return commit();};
  return b;
 };
 const long={...sample,chapters:Array.from({length:9},(_,i)=>({
  title:'Chương '+(i+1),content:'Dòng 1\\nDòng 2 — '+i
 }))};
 const seen=[];
 let failed;
 try{
  await api.importDraft(long,{db:store,auth,bookId:'epub-v57-recovery',onCreated:id=>seen.push(id)});
 }catch(err){failed=err}
 assert.ok(failed);
 assert.equal(failed.draftId,'epub-v57-recovery');
 assert.equal(store.stories.get('epub-v57-recovery').status,'importing');
 assert.equal(store.chapters.size,4);
 const preserved=store.chapters.get('epub-v57-recovery:chapter-0001');
 store.batch=original;
 const result=await api.importDraft(long,{db:store,auth,resumeBookId:failed.draftId,
  onCreated:id=>seen.push(id)});
 assert.equal(result.status,'draft');
 assert.equal(result.resumed,true);
 assert.equal(store.chapters.size,9);
 assert.deepEqual(store.chapters.get('epub-v57-recovery:chapter-0001'),preserved);
 assert.deepEqual(seen,['epub-v57-recovery','epub-v57-recovery']);
 const recovered=await api.importDraft(long,{db:store,auth,resumeBookId:'epub-v57-recovery'});
 assert.equal(recovered.status,'draft');
 assert.equal(recovered.resumed,true);
});
test('V57 refuses wrong source, wrong owner or existing published story on resume',async()=>{
 const store=db();
 const original=store.batch;store.batch=()=>{const b=original();b.commit=async()=>{throw Error('interrupted')};return b};
 const parsed={...sample,chapters:[{title:'Một',content:'Nguyên tác\n\nĐoạn 1'}]};
 await assert.rejects(api.importDraft(parsed,{db:store,auth,bookId:'epub-v57-original'}));
 store.batch=original;
 await assert.rejects(api.importDraft({...parsed,chapters:[{title:'Một',content:'ĐÃ ĐỔI'}]},
  {db:store,auth,resumeBookId:'epub-v57-original'}),/không trùng/);
 const foreign={currentUser:{uid:'another-author',getIdTokenResult:async()=>({claims:{admin:true}})}};
 await assert.rejects(api.importDraft(parsed,{db:store,auth:foreign,resumeBookId:'epub-v57-original'}),/không trùng/);
 const result=await api.importDraft(parsed,{db:store,auth,resumeBookId:'epub-v57-original'});
 await api.publishDraft(result.id,{db:store,auth,confirmRights:true});
 await assert.rejects(api.importDraft(parsed,{db:store,auth,resumeBookId:'epub-v57-original'}),/không trùng/);
});
test('V57 bounded cover thumbnail is public only after explicit publish',async()=>{
 const store=db(),img='data:image/jpeg;base64,AQIDBA==';
 const draft=await api.importDraft({...sample,coverImage:img},{db:store,auth,bookId:'epub-v57-cover'});
 assert.equal(store.stories.get(draft.id).coverImage,img);
 assert.equal((await api.publicBooks(store)).length,0);
 await api.publishDraft(draft.id,{db:store,auth,confirmRights:true});
 assert.equal((await api.publicBooks(store))[0].coverImage,img);
 const huge='data:image/jpeg;base64,'+'a'.repeat(40000);
 const other=await api.importDraft({...sample,coverImage:huge},{db:store,auth,bookId:'epub-v57-large-cover'});
 assert.equal(store.stories.get(other.id).coverImage,'');
 assert.equal(api.validCover('https://example.com/unsafe.jpg'),false);
});

test('L2B.4 preserves editable EPUB synopsis and genres as book metadata, not format badges',async()=>{
 const store=db();
 const manuscript={...sample,genre:'Hệ thống, Kỳ ảo',publicationState:'Hoàn thành',
  desc:'Một thế giới nơi mỗi trang sách có một cánh cửa.'};
 const draft=await api.importDraft(manuscript,{db:store,auth,bookId:'epub-metadata-l2b4'});
 assert.equal(store.stories.get(draft.id).genre,'Hệ thống, Kỳ ảo');
 assert.equal(store.stories.get(draft.id).desc,manuscript.desc);
 assert.equal((await api.publicBooks(store)).length,0);
 await api.publishDraft(draft.id,{db:store,auth,confirmRights:true});
 const [book]=await api.publicBooks(store);
 assert.equal(book.genre,manuscript.genre);
 assert.equal(book.desc,manuscript.desc);
 assert.equal(book.status,'Hoàn thành');
 assert.equal(book.introData.text,manuscript.desc);
 assert.equal(book._cloudV49,true);
 assert.equal(book.chapters[0].id,'chapter-0001');
});

test('L2B.4 safely hides old EPUB import labels without inventing missing genre data',async()=>{
 const store=db();
 const draft=await api.importDraft(sample,{db:store,auth,bookId:'epub-old-l2b4'});
 await api.publishDraft(draft.id,{db:store,auth,confirmRights:true});
 const [book]=await api.publicBooks(store);
 assert.equal(book.genre,'');
 assert.equal(book.desc,'');
 assert.equal(book.introData.text,'');
 store.stories.get(draft.id).genre='Nhập EPUB';
 assert.equal((await api.publicBooks(store))[0].genre,'');
});
