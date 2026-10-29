'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const bulk=require('../js/epub-bulk-replace-l2d4.js');
const single=require('../js/epub-chapter-editor-l2d3.js');

function mockDom(){
 const elements=new Map();
 class Element {
  constructor(tag='div'){
   this.tagName=tag;this.children=[];this.listeners={};this.attributes={};
   this.style={};this.dataset={};this.textContent='';this.value='';
   this.hidden=false;this.checked=false;
  }
  append(...items){
   if(this.tagName==='select'&&!this.children.length&&items[0]?.value)
    this.value=items[0].value;
   this.children.push(...items);
  }
  replaceChildren(){this.children=[];this.value='';}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(key,fn){this.listeners[key]=fn;}
  remove(){this.removed=true;}
 }
 const document={getElementById:id=>{
  if(!elements.has(id))elements.set(id,new Element(id.includes('filter')||id==='epub-edit-chapter'?'select':'div'));
  return elements.get(id);
 },createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
 const window={document,confirm:()=>true};
 const code=readFileSync(join(__dirname,'../js/library-epub-edit-ui-l2d5.js'),'utf8');
 vm.runInNewContext(code,{window});
 return {elements,document,window};
}
const author={currentUser:{uid:'owner',getIdTokenResult:async()=>({claims:{admin:true}})}};
const guest={currentUser:{uid:'guest',getIdTokenResult:async()=>({claims:{}})}};
const book={_cloudV49:true,_ownerUidV49:'owner',id:'epub-demo',title:'Kỳ An',
 chapters:[{id:'chapter-0001',title:'Chương 1'},{id:'chapter-0002',title:'Chương 2'}]};
const content={
 'chapter-0001':'kỳ an ở thượng hải.\nKỳ An vẫn ở đó.',
 'chapter-0002':'thượng hải là nơi kỳ an trở về.'
};
function manager({enabled=true,authorized=author,loadChapter:custom,
 chapterEditor=single,bulkSaver,journal,onChapterSaved=()=>{}}={}){
 const ui=mockDom(),loaded=[];
 const create=ui.window.DuduLibraryEpubEditL2D5.create;
 const instance=create({enabled,engine:bulk,chapterEditor,bulkSaver,journal,onChapterSaved,
  auth:()=>authorized,uid:()=>authorized.currentUser.uid,
  canEdit:()=>true,db:()=>({}),
  loadChapter:custom||(async(id,chapterId)=>{
   loaded.push(chapterId);
   return {id:chapterId,title:chapterId,content:content[chapterId],editVersion:0};
  })});
 return {...ui,loaded,instance};
}

test('L2D.5 UI is strictly dormant while Firebase Rules are pending',async()=>{
 const source=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(source,/const EPUB_MANAGEMENT_L2D2_ENABLED=false/);
 assert.match(source,/const EPUB_CHAPTER_TOOLS_L2D5_ENABLED=false/);
 assert.match(source,/id="epub-edit-tools-open" style="display:none"/);
 assert.match(source,/epubEditorL2D5\.owns\(novel\)\?'':'none'/);
 const {instance}=manager({enabled:false});
 assert.equal(instance.owns(book),false);
 assert.equal(instance.open(book),false);
 assert.equal(await instance.scan(),false);
});
test('Only the owning admin can enter the correction UI',()=>{
 const own=manager(),foreign=manager(),reader=manager({authorized:guest});
 assert.equal(own.instance.open(book),true);
 assert.equal(foreign.instance.open({...book,_ownerUidV49:'some-other-uid'}),false);
 assert.equal(reader.instance.open(book),false);
 assert.equal(own.elements.get('epub-edit-modal').style.display,'flex');
 assert.equal(own.instance.close(),true);
 assert.equal(own.elements.get('epub-edit-modal').style.display,'none');
});
test('Single-chapter preview uses original text but never writes to Firestore',async()=>{
 const {instance,elements,loaded}=manager();instance.open(book);
 assert.equal(await instance.loadSingle(),true);
 assert.deepEqual(loaded,['chapter-0001']);
 elements.get('epub-edit-chapter-content').value='Kỳ An ở Thượng Hải.';
 const summary=instance.previewSingle();
 assert.equal(summary.changed,true);
 assert.match(elements.get('epub-edit-preview').textContent,/chưa được lưu/i);
 assert.equal(elements.get('epub-edit-single-save').hidden,false);
 assert.equal(typeof instance.save,'undefined');
 assert.equal(typeof instance.restore,'undefined');
});
test('L2D.5B staged chapter save needs preview, confirmation and persists a revision through the chapter API',async()=>{
 let writes=0,last=null;const changes=[];
 const editor={...single,saveChapter:async(bookId,chapterId,options)=>{
  writes++;last={bookId,chapterId,options};
  return {changed:true,version:1,backupId:'rev-000001'};
 },listRevisions:async()=>[{id:'rev-000001',reason:'edit',createdAt:'2026-10-29'}]};
 const {instance,elements,window}=manager({chapterEditor:editor,
  onChapterSaved:(bookId,id,chapter)=>changes.push({bookId,id,chapter})});
 instance.open(book);await instance.loadSingle();
 assert.equal(await instance.saveSingle(),false,'No saving without preview');
 elements.get('epub-edit-chapter-content').value='Kỳ An ở Thượng Hải.';
 instance.previewSingle();
 window.confirm=()=>false;
 assert.equal(await instance.saveSingle(),false,'User can cancel the write');
 assert.equal(writes,0);
 window.confirm=()=>true;
 const saved=await instance.saveSingle();
 assert.equal(saved.version,1);
 assert.equal(writes,1);
 assert.equal(last.options.expectedContent,content['chapter-0001']);
 assert.equal(last.options.expectedVersion,0);
 assert.equal(changes.length,1);
 assert.equal(changes[0].chapter.content,'Kỳ An ở Thượng Hải.');
 const history=await instance.showHistory();
 assert.equal(history.length,1);
 assert.equal(elements.get('epub-edit-history').children.length,1);
 assert.equal(elements.get('epub-edit-history').children[0].children[1].textContent,'Khôi phục bản này');
});
test('L2D.5B refuses to save an edit changed after review and refreshes stale text from cloud',async()=>{
 let body='Văn bản từ đám mây';let writes=0;
 const {instance,elements}=manager({chapterEditor:{...single,
  saveChapter:async()=>{writes++;return {changed:true,version:1,backupId:'rev-000001'};}},
  loadChapter:async(id,chId)=>({id:chId,content:body,editVersion:0})});
 instance.open(book);await instance.loadSingle();
 elements.get('epub-edit-chapter-content').value='Dòng chỉnh sửa';
 instance.previewSingle();
 elements.get('epub-edit-chapter-content').value='Thay đổi sau khi duyệt';
 assert.equal(await instance.saveSingle(),false);
 assert.equal(writes,0);
 body='Phiên bản mới từ Firebase';
 assert.equal(await instance.loadSingle(),true);
 assert.equal(elements.get('epub-edit-chapter-content').value,body);
});
test('L2D.5B bulk save and recovery controls are available only after explicit review',async()=>{
 const calls=[];
 const patchRow={patch:{chapterId:'chapter-0001',expectedVersion:0,
  expectedContent:content['chapter-0001'],content:'Kỳ An ở thượng hải.\nKỳ An vẫn ở đó.'},
  version:1,backupId:'rev-000001'};
 const saver={apply:async(id,patches,opts)=>{
  calls.push({type:'apply',id,patches,opts});
  return {bookId:id,phase:'partial',total:2,done:[patchRow],
   pending:[{...patches[1]}],unknown:[],message:'retry'};
 },resume:async(prior)=>{
  calls.push({type:'resume',prior});
  return {...prior,phase:'complete',done:[...prior.done,
   {patch:prior.pending[0],version:1,backupId:'rev-000001'}],pending:[]};
 },undo:async(prior)=>{
  calls.push({type:'undo',prior});
  return {phase:'restored',restored:prior.done,remaining:[]};
 }};
 const saved=[];
 const {instance,elements}=manager({bulkSaver:saver,
  onChapterSaved:(...args)=>saved.push(args)});
 instance.open(book);instance.switchMode('bulk');
 const row=elements.get('epub-edit-rule-list').children[0];
 row.children[0].value='kỳ an';row.children[1].value='Kỳ An';
 await instance.scan();
 assert.equal(await instance.saveBulk(),false);
 instance.chooseAll(true);instance.previewBulk();
 assert.equal(elements.get('epub-edit-bulk-save').hidden,false);
 const first=await instance.saveBulk();
 assert.equal(first.phase,'partial');
 assert.equal(calls[0].opts.confirmed,true);
 assert.equal(elements.get('epub-edit-bulk-resume').hidden,false);
 assert.equal(instance.close(),false,'Do not discard a pending recovery session');
 assert.equal(await instance.scan(),false,'Partial state blocks a second scan');
 const complete=await instance.recoverBulk('resume');
 assert.equal(complete.phase,'complete');
 assert.equal(elements.get('epub-edit-bulk-undo').hidden,false);
 const restored=await instance.recoverBulk('undo');
 assert.equal(restored.phase,'restored');
 assert.equal(elements.get('epub-edit-bulk-undo').hidden,true);
 assert.equal(saved.length,4,'Save initial chapter, save resumed chapter, restore both');
});
test('L2D.5C preserves a recoverable job across a simulated browser reload',async()=>{
 let savedJob=null,cleared=0,hydrations=0;
 const pendingPatch={chapterId:'chapter-0002',expectedVersion:0,
  expectedContent:content['chapter-0002'],content:'thượng hải là nơi Kỳ An trở về.'};
 const state={bookId:book.id,phase:'partial',total:2,done:[],
  pending:[pendingPatch],unknown:[]};
 const journal={
  read:()=>savedJob,
  begin:(id,uid,patches)=>{savedJob={id,uid,patches};return savedJob;},
  hydrate:async()=>{hydrations++;return state;},
  clear:()=>{cleared++;savedJob=null;},markUndo:()=>true
 };
 const saver={apply:async()=>state,resume:async()=>({
  ...state,phase:'complete',pending:[],done:[{patch:pendingPatch,
   version:1,backupId:'rev-000001'}]})};
 const first=manager({journal,bulkSaver:saver});first.instance.open(book);
 first.instance.switchMode('bulk');
 const row=first.elements.get('epub-edit-rule-list').children[0];
 row.children[0].value='kỳ an';row.children[1].value='Kỳ An';
 await first.instance.scan();first.instance.chooseAll(true);first.instance.previewBulk();
 assert.equal((await first.instance.saveBulk()).phase,'partial');
 assert.equal(savedJob.id,book.id);
 assert.equal(first.instance.close(),true,'Durable job can be left for later');

 const reopened=manager({journal,bulkSaver:saver});
 assert.equal(reopened.instance.open(book),true);
 assert.equal(reopened.elements.get('epub-edit-bulk-reopen').hidden,false);
 assert.equal(await reopened.instance.scan(),false,'Existing job blocks new batches');
 assert.equal((await reopened.instance.reopenSavedJob()).phase,'partial');
 assert.equal(hydrations,1);
 assert.equal(reopened.elements.get('epub-edit-bulk-discard').hidden,false);
 assert.equal(await reopened.instance.recoverBulk('discard'),true);
 assert.equal(cleared,1);
 assert.equal(savedJob,null);
});
test('Batch scan displays raw-text context, supports explicit selection and per-chapter filter',async()=>{
 const {instance,elements}=manager();instance.open(book);
 instance.switchMode('bulk');
 const row=elements.get('epub-edit-rule-list').children[0];
 row.children[0].value='kỳ an';row.children[1].value='Kỳ An';
 const plan=await instance.scan();
 assert.equal(plan.total,2);
 assert.equal(elements.get('epub-edit-match-list').children.length,2);
 const first=elements.get('epub-edit-match-list').children[0];
 assert.equal(first.children[0].checked,false);
 assert.equal(first.children[1].children[1].children[1].textContent,'kỳ an');
 assert.equal(instance.previewBulk().chaptersChanged,0);
 instance.chooseAll(true);
 const patches=instance.previewBulk();
 assert.equal(patches.chaptersChanged,2);
 assert.equal(patches.occurrencesChanged,2);
 assert.equal(patches.patches[0].content.startsWith('Kỳ An'),true);
 assert.match(elements.get('epub-edit-preview').textContent,/Chưa lưu lên Firebase/);
 elements.get('epub-edit-chapter-filter').value='chapter-0001';
 instance.filterChapter();
 assert.equal(elements.get('epub-edit-match-list').children.length,1);
 instance.chooseAll(false);
 assert.equal(instance.previewBulk().occurrencesChanged,0);
 row.children[0].value='thượng hải';row.children[0].listeners.input();
 assert.equal(instance.previewBulk(),false,'Old preview is invalidated when the rule changes');
 assert.equal(elements.get('epub-edit-match-list').children.length,0);
});
test('Show-more preserves earlier results and selected checkboxes',async()=>{
 const lots=Array.from({length:85},()=> 'kỳ an').join('\n');
 const {instance,elements}=manager({loadChapter:async(id,chapterId)=>({
  id:chapterId,content:chapterId==='chapter-0001'?lots:'nội dung khác',editVersion:0
 })});
 instance.open(book);instance.switchMode('bulk');
 const rule=elements.get('epub-edit-rule-list').children[0];
 rule.children[0].value='kỳ an';rule.children[1].value='Kỳ An';
 assert.equal((await instance.scan()).total,85);
 assert.equal(elements.get('epub-edit-match-list').children.length,80);
 const first=elements.get('epub-edit-match-list').children[0];
 first.children[0].checked=true;first.children[0].listeners.change();
 instance.more();
 assert.equal(elements.get('epub-edit-match-list').children.length,85);
 assert.equal(elements.get('epub-edit-match-list').children[0].children[0].checked,true);
 assert.equal(instance.previewBulk().occurrencesChanged,1);
});
test('Closing during a network scan discards stale results rather than reopening the modal',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const {instance,elements}=manager({loadChapter:async(id,chapterId)=>{
  await pending;return {id:chapterId,content:content[chapterId],editVersion:0};
 }});
 instance.open(book);instance.switchMode('bulk');
 const row=elements.get('epub-edit-rule-list').children[0];
 row.children[0].value='kỳ an';row.children[1].value='Kỳ An';
 const running=instance.scan();
 assert.equal(instance.close(),true);
 release();assert.equal(await running,false);
 assert.equal(elements.get('epub-edit-modal').style.display,'none');
 assert.equal(elements.get('epub-edit-match-list').children.length,0);
});
