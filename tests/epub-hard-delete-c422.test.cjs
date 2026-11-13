'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const api=require('../js/epub-production-v49.js');

const author={currentUser:{uid:'du',getIdTokenResult:async()=>({claims:{admin:true}})}};
const other={currentUser:{uid:'other',getIdTokenResult:async()=>({claims:{admin:true}})}};
const reader={currentUser:{uid:'du',getIdTokenResult:async()=>({claims:{admin:false}})}};

function fixture({chapterCount=3,revisionsPerChapter=1,status='archived',ownerUid='du',failBatch=0}={}){
 const book={id:'epub-delete-test',title:'Tên truyện của Du',status,ownerUid,chapterCount};
 const chapters=new Map(),history=new Map(),ops=[];
 for(let i=0;i<chapterCount;i++){
  const id='ch-'+i;chapters.set(id,{id});
  const revs=new Map();for(let j=0;j<revisionsPerChapter;j++)revs.set('rev-'+j,{id:'rev-'+j});
  history.set(id,revs);
 }
 const snap=(id,ref,data)=>({id,ref,exists:!!data,data:()=>structuredClone(data)});
 let failed=false;
 const chapterRef=id=>({id,
  collection:kind=>{
   assert.equal(kind,'revisions');
   const revisionRef=rid=>({id:rid,delete:async()=>{
    history.get(id)?.delete(rid);ops.push('rev:'+id+':'+rid);
   }});
   return {doc:revisionRef,limit:n=>({get:async()=>({docs:[...(history.get(id)||new Map()).entries()]
    .slice(0,n).map(([rid,r])=>snap(rid,revisionRef(rid),r))})})};
  },
  delete:async()=>{
   assert.equal(history.get(id)?.size||0,0,'revisions must be removed before chapter');
   chapters.delete(id);history.delete(id);ops.push('chapter:'+id);
  }
 });
 const chapterCollection={doc:chapterRef,limit:n=>({get:async()=>({docs:[...chapters.entries()]
  .slice(0,n).map(([id,ch])=>snap(id,chapterRef(id),ch))})})};
 const bookRef={id:book.id,
  get:async()=>snap(book.id,bookRef,book.status==='removed'?null:book),
  update:async patch=>{Object.assign(book,patch);ops.push('mark:'+book.status);},
  delete:async()=>{
   assert.equal(chapters.size,0,'all chapters must be removed before parent');
   book.status='removed';ops.push('book:delete');
  },
  collection:kind=>{assert.equal(kind,'chapters');return chapterCollection;}
 };
 const db={
  collection:kind=>{assert.equal(kind,'epub_stories_v49');return {doc:()=>bookRef};},
  batch:()=>{
   const targets=[];
   return {delete:ref=>targets.push(ref),commit:async()=>{
    if(failBatch&&!failed&&targets.some(ref=>ref.id.startsWith('ch-'))){
     failed=true;throw Error('network interruption');
    }
    for(const target of targets)await target.delete();
   }};
  }
 };
 return {db,book,chapters,history,ops};
}

test('C4.22 rejects unconfirmed, unauthorized, public and draft purge before any write',async()=>{
 for(const [opts,auth,regex] of [
  [{status:'draft'},author,/đã gỡ/],
  [{status:'published'},author,/đã gỡ/],
  [{ownerUid:'other'},author,/chính tác giả/],
  [{},other,/chính tác giả/],
  [{},reader,/admin claim/]
 ]){
  const f=fixture(opts);
  await assert.rejects(api.purgeArchived(f.book.id,{db:f.db,auth,confirmed:true}),regex);
  assert.equal(f.ops.length,0);
 }
 const f=fixture();
 await assert.rejects(api.purgeArchived(f.book.id,{db:f.db,auth:author}),/xác nhận/);
 assert.equal(f.ops.length,0);
});

test('C4.22 removes every revision, then all chapters, then parent in bounded batches',async()=>{
 const f=fixture({chapterCount:85,revisionsPerChapter:3}),progress=[];
 const result=await api.purgeArchived(f.book.id,{db:f.db,auth:author,confirmed:true,
  onProgress:p=>progress.push(p)});
 assert.deepEqual(result,{id:f.book.id,chapters:85,revisions:255,deleted:true});
 assert.equal(f.book.status,'removed');
 assert.equal(f.chapters.size,0);
 assert.equal(f.history.size,0);
 assert.equal(f.ops[0],'mark:deleting');
 assert.equal(f.ops[f.ops.length-1],'book:delete');
 assert.equal(f.ops.filter(x=>x.startsWith('chapter:')).length,85);
 assert.equal(f.ops.filter(x=>x.startsWith('rev:')).length,255);
 assert.equal(progress.at(-1).phase,'done');
});

test('C4.22 interrupted deletion remains private and can resume safely',async()=>{
 const f=fixture({chapterCount:43,revisionsPerChapter:2,failBatch:1});
 await assert.rejects(api.purgeArchived(f.book.id,{db:f.db,auth:author,confirmed:true}),/network interruption/);
 assert.equal(f.book.status,'deleting');
 assert.equal(f.chapters.size,43);
 assert.equal([...f.history.values()].slice(0,40).every(x=>x.size===0),true);
 assert.equal(f.ops.includes('book:delete'),false);
 const result=await api.purgeArchived(f.book.id,{db:f.db,auth:author,confirmed:true});
 assert.equal(result.chapters,43);
 assert.equal(result.revisions,6,'only not-yet-deleted revisions are processed');
 assert.equal(f.book.status,'removed');
});

test('C4.22 Rules restrict destruction to owner-admin and archived -> deleting',()=>{
 const rules=fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8');
 const src=fs.readFileSync(path.join(__dirname,'../js/library-epub-manage-l2d2.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(rules,/before\.status == 'archived' && after\.status == 'deleting'/);
 assert.match(rules,/after\.diff\(before\)\.affectedKeys\(\)\.hasOnly\(\['status','updatedAt'\]\)/);
 assert.match(rules,/allow delete: if admin\(\) && resource\.data\.ownerUid == request\.auth\.uid\s*&& resource\.data\.status == 'deleting'/);
 assert.equal((rules.match(/allow delete: if deletingOwnedBook\(storyId\)/g)||[]).length,2);
 assert.match(rules,/return ownerOfBook\(storyId\)\s*&& get\(bookPath\(storyId\)\)\.data\.status == 'deleting'/);
 assert.match(rules,/allow update: if false;\s*allow delete: if deletingOwnedBook\(storyId\)/);
 assert.match(src,/cloudApi\.purgeArchived\(book\.id/);
 assert.match(src,/typed!==book\.title/);
 assert.match(src,/Tiếp tục xóa dở/);
 assert.match(html,/css\/library-epub-manage-l2d2\.css\?v=c422-1/);
});

test('C4.22 archive UI refuses mismatched typed title and requires final consent',async()=>{
 class Element{
  constructor(){this.children=[];this.style={};this.dataset={};this.listeners={};
   this.textContent='';this.disabled=false;}
  append(...children){this.children.push(...children);}
  replaceChildren(){this.children=[];}
  addEventListener(name,fn){this.listeners[name]=fn;}
  remove(){this.removed=true;}
 }
 const dom=new Map();const document={getElementById:id=>{
  if(!dom.has(id))dom.set(id,new Element());return dom.get(id);
 },createElement:()=>new Element()};
 let entered='sai tên',allowed=true,purges=0,confirms=0;
 const root={document,prompt:()=>entered,confirm:()=>{confirms++;return allowed;},alert:()=>{}};
 const src=fs.readFileSync(path.join(__dirname,'../js/library-epub-manage-l2d2.js'),'utf8');
 vm.runInNewContext(src,{window:root});
 const manager=root.DuduLibraryEpubManageL2D2.create({enabled:true,
  cloudApi:{archivedBooks:async()=>[{id:'epub-test',title:'Tên của Du',status:'archived',
   chapterCount:3,publicationState:'Hoàn thành'}],purgeArchived:async()=>{
   purges++;return {chapters:3,revisions:0};}},
  db:()=>({}),auth:()=>author,uid:()=>author.currentUser.uid,
  canEdit:()=>true,refresh:async()=>{}});
 await manager.showArchive();
 const row=document.getElementById('epub-archive-list').children[0];
 const del=row.children[1].children[1];
 await del.listeners.click();
 assert.equal(purges,0);
 assert.equal(confirms,0);
 entered='Tên của Du';allowed=false;
 await del.listeners.click();
 assert.equal(purges,0);
 assert.equal(confirms,1);
 allowed=true;
 await del.listeners.click();
 assert.equal(purges,1);
 assert.equal(row.removed,true);
});
