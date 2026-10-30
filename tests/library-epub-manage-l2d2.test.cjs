'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const api=require('../js/epub-production-v49.js');
const ui=require('../js/library-epub-manage-l2d2.js');

const owner={currentUser:{uid:'dudu-author',getIdTokenResult:async()=>({claims:{admin:true}})}};
const foreign={currentUser:{uid:'different-author',getIdTokenResult:async()=>({claims:{admin:true}})}};
const reader={currentUser:{uid:'reader',getIdTokenResult:async()=>({claims:{}})}};

function store(){
 const documents=new Map(),chapters=new Map(),ops=[];
 const ref=id=>({id,get:async()=>documents.has(id)?{exists:true,data:()=>structuredClone(documents.get(id))}:{exists:false},
  set:async doc=>{documents.set(id,structuredClone(doc));ops.push('create:'+id);},
  update:async patch=>{Object.assign(documents.get(id),patch);ops.push('update:'+id)},
  collection:kind=>{
   assert.equal(kind,'chapters');return {doc:cid=>({
    get:async()=>({exists:chapters.has(id+':'+cid),data:()=>chapters.get(id+':'+cid)}),
    set:async doc=>{chapters.set(id+':'+cid,structuredClone(doc));ops.push('chapter:'+id+':'+cid);}
   }),get:async()=>({docs:[...chapters.keys()].filter(k=>k.startsWith(id+':'))
    .map(k=>({id:k.slice(id.length+1)}))})};
  }
 });
 const collection={doc:ref,where:(field,cmp,value)=>{
  assert.equal(cmp,'==');assert.ok(['ownerUid','status'].includes(field));
  return {limit:limit=>({get:async()=>({docs:[...documents.entries()]
   .filter(([id,item])=>item[field]===value).slice(0,limit)
   .map(([id,item])=>({id,data:()=>structuredClone(item)}))})})};
 }};
 return {documents,chapters,ops,collection:()=>collection,
  batch:()=>{const records=[];return {set:(r,data)=>records.push([r,data]),
   commit:async()=>{for(const [r,d] of records)await r.set(d)}};},
  runTransaction:async action=>{
   const writes=[];
   const outcome=await action({get:r=>r.get(),update:(r,patch)=>writes.push([r,patch])});
   for(const [r,patch] of writes)await r.update(patch);
   return outcome;
  }};
}
async function published(db){
 const parsed={title:'Bản thử EPUB',author:'DUDU',genre:'Hệ thống',desc:'Văn án ban đầu',
  chapters:[{title:'Chương 1',content:'Một nội dung không được sửa'},
   {title:'Chương 2',content:'Đoạn thứ hai'}]};
 const draft=await api.importDraft(parsed,{db,auth:owner,bookId:'epub-l2d2-test'});
 await api.publishDraft(draft.id,{db,auth:owner,confirmRights:true});
 return draft.id;
}

test('Published EPUB editor changes only descriptive metadata, never chapters or owner',async()=>{
 const db=store(),id=await published(db);
 const originalChapters=structuredClone([...db.chapters.entries()]);
 const originalIndex=structuredClone(db.documents.get(id).chapterIndex);
 const response=await api.updatePublishedMetadata(id,{db,auth:owner,metadata:{
  title:'Bản thử đã sửa',author:'Tác giả mới',publicationState:'Hoàn thành',
  genre:'Bách Hợp, Hiện đại',desc:'Một văn án mới có thể tìm kiếm.'}});
 assert.equal(response.changed,true);
 const stored=db.documents.get(id);
 assert.equal(stored.publicationState,'Hoàn thành');
 assert.equal(stored.status,'published');
 assert.equal(stored.ownerUid,'dudu-author');
 assert.deepEqual(stored.chapterIndex,originalIndex);
 assert.deepEqual([...db.chapters.entries()],originalChapters);
 const listed=await api.publicBooks(db);
 assert.equal(listed[0].status,'Hoàn thành');
 assert.equal(listed[0].desc,'Một văn án mới có thể tìm kiếm.');
 assert.equal(listed[0]._ownerUidV49,'dudu-author');
});

test('Editor rejects changes to protected fields and forged or revoked identity',async()=>{
 const db=store(),id=await published(db),before=structuredClone(db.documents.get(id));
 const failures=[
  api.updatePublishedMetadata(id,{db,auth:foreign,metadata:{publicationState:'Hoàn thành'}}),
  api.updatePublishedMetadata(id,{db,auth:reader,metadata:{publicationState:'Hoàn thành'}}),
  api.updatePublishedMetadata(id,{db,auth:owner,metadata:{ownerUid:'reader'}}),
  api.updatePublishedMetadata(id,{db,auth:owner,metadata:{chapterIndex:[]}}),
  api.updatePublishedMetadata(id,{db,auth:owner,metadata:{status:'archived'}}),
  api.updatePublishedMetadata(id,{db,auth:owner,metadata:{publicationState:'Tạm dừng'}}),
  api.updatePublishedMetadata(id,{db,auth:owner,metadata:{desc:'x'.repeat(3001)}}),
  api.updatePublishedMetadata(id,{db,auth:owner,metadata:{coverImage:'https://unsafe.test/a.jpg'}})
 ];
 for(const action of failures)await assert.rejects(action);
 assert.deepEqual(db.documents.get(id),before);
});

test('Gỡ rồi khôi phục removes public listing but preserves all chapters and ID',async()=>{
 const db=store(),id=await published(db),chapters=structuredClone([...db.chapters.entries()]);
 const archive=await api.setArchived(id,true,{db,auth:owner});
 assert.equal(archive.status,'archived');
 assert.equal((await api.publicBooks(db)).length,0);
 await assert.rejects(api.readChapter(db,id,'chapter-0001'),/chưa được xuất bản/);
 const archived=await api.archivedBooks(db,owner);
 assert.equal(archived.length,1);
 assert.equal(archived[0].id,id);
 await assert.rejects(api.setArchived(id,false,{db,auth:foreign}));
 const restored=await api.setArchived(id,false,{db,auth:owner});
 assert.equal(restored.status,'published');
 assert.equal((await api.publicBooks(db))[0].id,id);
 assert.equal((await api.readChapter(db,id,'chapter-0001')).content,'Một nội dung không được sửa');
 assert.deepEqual([...db.chapters.entries()],chapters);
 assert.equal(db.ops.some(x=>x.startsWith('delete:')),false);
});

test('Published EPUB cannot be archived twice or restored without being archived',async()=>{
 const db=store(),id=await published(db);
 await assert.rejects(api.setArchived(id,false,{db,auth:owner}));
 await api.setArchived(id,true,{db,auth:owner});
 await assert.rejects(api.setArchived(id,true,{db,auth:owner}));
 await assert.rejects(api.archivedBooks(db,reader),/admin claim/);
});

test('C3.1 enables owner-scoped EPUB editor once Rules are published',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const source=readFileSync(join(__dirname,'../js/library-epub-manage-l2d2.js'),'utf8');
 const rules=readFileSync(join(__dirname,'../security/firestore-epub-l2d2.rules.review'),'utf8');
 assert.match(html,/const EPUB_MANAGEMENT_L2D2_ENABLED=true/);
 assert.match(html,/epubManagementL2D2\.owns\(novel\)/);
 assert.match(html,/epubManagementL2D2\.openEditor\(novels\[selectedNovelIndex\]\)/);
 assert.match(html,/epubManagementL2D2\.unlist\(novels\[selectedNovelIndex\]\)/);
 assert.match(source,/enabled=false/);
 assert.doesNotMatch(source,/\.delete\(|deleteDoc|removeDoc|localStorage\.setItem/);
 assert.match(rules,/NOT DEPLOYED/);
 assert.match(rules,/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly/);
 assert.match(rules,/request\.auth\.token\.admin == true/);
 const manager=ui.create({enabled:false,canEdit:()=>true,
  auth:()=>owner,uid:()=>owner.currentUser.uid,cloudApi:api,db:()=>store()});
 assert.equal(manager.owns({_cloudV49:true,_ownerUidV49:owner.currentUser.uid}),false);
 assert.equal(manager.openEditor({_cloudV49:true,_ownerUidV49:owner.currentUser.uid}),false);
});

test('L2D.2 editor and archive UI bind only to real owner-scoped API operations',async()=>{
 class Element{
  constructor(){this.value='';this.children=[];this.style={};this.dataset={};
   this.files=[];this.checked=false;this.disabled=false;this.listeners={};}
  focus(){this.focused=true;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  remove(){this.removed=true;}
  addEventListener(event,handler){this.listeners[event]=handler;}
 }
 const elements=new Map();
 const doc={getElementById:key=>{
  if(!elements.has(key))elements.set(key,new Element());
  return elements.get(key);
 },createElement:()=>new Element()};
 let confirmCount=0,refreshCount=0;
 const window={document:doc,confirm:()=>{confirmCount++;return true;},alert:()=>assert.fail('No UI error expected')};
 const source=readFileSync(join(__dirname,'../js/library-epub-manage-l2d2.js'),'utf8');
 vm.runInNewContext(source,{window});
 const calls=[];
 const mockApi={
  updatePublishedMetadata:async(id,options)=>{calls.push(['edit',id,options.metadata]);return {changed:true};},
  setArchived:async(id,archived)=>{calls.push(['archive',id,archived]);return {status:archived?'archived':'published'};},
  archivedBooks:async()=>[{id:'epub-owned',title:'Đã gỡ',chapterCount:90,publicationState:'Hoàn thành'}]
 };
 const manager=window.DuduLibraryEpubManageL2D2.create({enabled:true,cloudApi:mockApi,
  db:()=>({}),auth:()=>owner,canEdit:()=>true,uid:()=>owner.currentUser.uid,
  refresh:async()=>{refreshCount++;}});
 const book={id:'epub-owned',_cloudV49:true,_ownerUidV49:owner.currentUser.uid,
  title:'Bản EPUB',author:'Tác giả',genre:'Hệ thống',desc:'',status:'Đang ra'};
 assert.equal(manager.owns(book),true);
 assert.equal(manager.owns({...book,_ownerUidV49:'other'}),false);
 assert.equal(manager.openEditor(book),true);
 doc.getElementById('epub-manage-status').value='Hoàn thành';
 assert.equal(await manager.save(),true);
 assert.deepEqual(calls[0].slice(0,2),['edit','epub-owned']);
 assert.equal(calls[0][2].publicationState,'Hoàn thành');
 assert.equal('desc' in calls[0][2],false,'Do not erase old chapter-only synopsis');
 assert.equal(refreshCount,1);
 assert.equal(await manager.unlist(book),true);
 assert.equal(confirmCount,1);
 assert.deepEqual(calls[1],['archive','epub-owned',true]);
 assert.equal(await manager.showArchive(),true);
 const list=doc.getElementById('epub-archive-list');
 assert.equal(list.children.length,1);
 const restoreButton=list.children[0].children[1];
 await restoreButton.listeners.click();
 assert.deepEqual(calls[2],['archive','epub-owned',false]);
 assert.equal(list.children[0].removed,true);
 assert.equal(refreshCount,3);
});
