const {test}=require('node:test');
const assert=require('node:assert/strict');
const batch=require('../js/epub-batch-import-c421.js');

const file=(name,folder='',size=1024)=>({name,size,lastModified:1,
 webkitRelativePath:folder?folder+'/'+name:''});
const importer={validFile:f=>/\.epub$/i.test(f.name)&&f.size>0&&f.size<=30*1048576,
 async parse(f){
  if(f.name==='broken.epub')throw Error('EPUB lỗi định dạng');
  return {title:f.name.replace(/\.epub$/i,''),author:'DUDU',sourceName:f.name,
   chapters:[{title:'Chương 1',content:f.name.startsWith('copy')?'same':'body:'+f.name}]};
 }};
const auth={currentUser:{uid:'owner'}};
const fingerprint=chapters=>chapters.map(c=>c.content).join('|');
const productionStub=()=>{
 const books=[],writes=[],published=[];
 const api={fingerprint,manifest:p=>p.chapters,
  ownedBooks:async()=>books.map(b=>({...b})),
  async importDraft(parsed,{resumeBookId,onCreated,onProgress}){
   const fp=fingerprint(parsed.chapters);
   const existing=books.find(b=>b.id===resumeBookId);
   const id=resumeBookId||'epub-'+(books.length+1);
   if(!existing)books.push({id,importFingerprint:fp,title:parsed.title,
    author:parsed.author,status:'importing'});
   onCreated(id);onProgress(50);onProgress(100);
   writes.push({id,resumeBookId:resumeBookId||'',title:parsed.title});
   books.find(b=>b.id===id).status='draft';
   return {id,status:'draft',chapterCount:parsed.chapters.length};
  },
  async publishDraft(id){published.push(id);books.find(b=>b.id===id).status='published'}
 };
 return {books,writes,published,api};
};

test('C4.21 scans nested folder EPUBs, ignores non-EPUBs, rejects oversize and repeated selections',()=>{
 const folder=[file('1.epub','All/Book A'),file('cover.jpg','All/Book A'),
  file('2.EPUB','All/Book B'),file('huge.epub','All/Book C',31*1048576)];
 const first=batch.select([],folder,importer.validFile);
 assert.equal(first.rows.length,3);
 assert.equal(first.ignored,1);
 assert.deepEqual(first.rows.map(r=>r.status),['waiting','waiting','invalid']);
 assert.equal(first.rows[0].path,'All/Book A/1.epub');
 const second=batch.select(first.rows,[folder[0],file('another.epub','All/Book A')],importer.validFile);
 assert.equal(second.repeat,1);
 assert.equal(second.rows.length,4);
});

test('C4.21 prioritizes exact content over title and holds legacy same-title books for review',()=>{
 const parsed={title:'Tập 1',author:'Người viết'};
 assert.equal(batch.findMatch([{id:'a',importFingerprint:'f',status:'published'}],parsed,'f').type,'exact');
 assert.equal(batch.findMatch([{id:'a',importFingerprint:'',title:' TẬP 1 ',author:'người viết'}],parsed,'f').type,'review');
 assert.equal(batch.findMatch([{id:'a',importFingerprint:'other',title:'Tập 1',author:'Người viết'}],parsed,'f'),null);
});

test('C4.21 imports sequentially, skips pre-existing and in-queue exact duplicates, publishes by consent',async()=>{
 const store=productionStub();
 store.books.push({id:'old',importFingerprint:'body:old.epub',status:'published'});
 const engine=batch.createEngine({importer,production:store.api,auth:()=>auth,
  firestore:()=>({}),onPublished:()=>{calls++}});
 let calls=0;
 engine.add([file('old.epub'),file('new.epub'),file('copy.epub'),file('copy2.epub')]);
 // The two copy files have different source names but identical chapter bodies.
 const result=await engine.run({publish:true,confirm:(count,wantsPublish)=>{
  assert.equal(count,4);assert.equal(wantsPublish,true);return true;
 }});
 assert.equal(result,true);
 assert.deepEqual(engine.getRows().map(r=>r.status),['duplicate','published','published','duplicate']);
 assert.equal(store.writes.length,2);
 assert.equal(store.published.length,2);
 assert.equal(calls,1);
});

test('C4.21 stops after current book and resumes without duplicating published records',async()=>{
 const store=productionStub();
 let engine;
 const original=store.api.importDraft;
 store.api.importDraft=async(...args)=>{
  const value=await original(...args);
  if(store.writes.length===1)engine.pause();
  return value;
 };
 engine=batch.createEngine({importer,production:store.api,auth:()=>auth,firestore:()=>({})});
 engine.add([file('first.epub'),file('second.epub')]);
 await engine.run({publish:false,confirm:()=>true});
 assert.deepEqual(engine.getRows().map(r=>r.status),['draft','waiting']);
 await engine.run({publish:false,confirm:()=>true});
 assert.deepEqual(engine.getRows().map(r=>r.status),['draft','draft']);
 assert.equal(store.books.length,2);
 await engine.run({publish:true,confirm:()=>true});
 assert.deepEqual(engine.getRows().map(r=>r.status),['published','published']);
 assert.equal(store.writes.length,2,'publishing saved drafts must not rewrite chapters');
});

test('C4.21 resumes a failed partially imported book and never starts writes if owner audit fails',async()=>{
 const store=productionStub(),checkpoints=new Map();
 const original=store.api.importDraft;
 let first=true;
 store.api.importDraft=async(...args)=>{
  const result=await original(...args);
  if(first){first=false;store.books[0].status='importing';throw Error('Mất mạng')}
  return result;
 };
 const engine=batch.createEngine({importer,production:store.api,auth:()=>auth,firestore:()=>({}),
  persist:(uid,fp,id)=>checkpoints.set(uid+fp,id),
  restore:(uid,fp)=>checkpoints.get(uid+fp),
  clear:(uid,fp)=>checkpoints.delete(uid+fp)});
 engine.add([file('resume.epub')]);
 await engine.run({publish:true,confirm:()=>true});
 assert.equal(engine.getRows()[0].status,'error');
 assert.equal(store.books.length,1);
 engine.retry(engine.getRows()[0]);
 await engine.run({publish:true,confirm:()=>true});
 assert.equal(engine.getRows()[0].status,'published');
 assert.equal(store.writes[1].resumeBookId,store.books[0].id);
 assert.equal(store.books.length,1);
 assert.equal(checkpoints.size,0);

 const blocked=productionStub();
 blocked.api.ownedBooks=async()=>{throw Error('permission-denied')};
 const noWrite=batch.createEngine({importer,production:blocked.api,auth:()=>auth,firestore:()=>({})});
 noWrite.add([file('safe.epub')]);
 await assert.rejects(noWrite.run({publish:true,confirm:()=>true}),/permission-denied/);
 assert.equal(blocked.writes.length,0);
 assert.equal(noWrite.getRows()[0].status,'waiting');
});
