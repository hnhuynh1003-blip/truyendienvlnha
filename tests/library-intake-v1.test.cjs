'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const rootPath=join(__dirname,'..');
const intakeSource=readFileSync(join(rootPath,'js/library-intake-v1.js'),'utf8');
const index=readFileSync(join(rootPath,'index.html'),'utf8');
const siteShell=readFileSync(join(rootPath,'js/site-shell-v60.js'),'utf8');

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.dataset={};
  this.open=false;this.isConnected=true;this.attributes={};this.textContent='';}
 append(...items){this.children.push(...items);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(name,handler){this.listeners[name]=handler;}
 remove(){this.isConnected=false;}
 close(){this.open=false;}
 showModal(){this.open=true;}
 focus(){this.focused=true;}
}
const setup=(authorized=true)=>{
 const calls=[];
 const focus=new Element('button');
 const document={body:new Element('body'),activeElement:focus,
  createElement:tag=>new Element(tag)};
 const window={document,canEditStories:()=>authorized,
  openStoryModal:()=>calls.push('manual'),
  openEpubImportV48:()=>calls.push('epub'),
  };
 vm.runInNewContext(intakeSource,{window});
 const buttons=()=>{
  const found=[];
  const walk=n=>{if(n.dataset?.intake)found.push(n);
   (n.children||[]).forEach(walk);};
  document.body.children.forEach(walk);return found;
 };
 return {window,document,calls,buttons,focus,setAuthorized:x=>authorized=x};
};

test('Library hub is a local navigation layer, not a new publisher',()=>{
 const a=setup();
 assert.equal(a.window.DuduLibraryIntakeV1.backendConnected,false);
 assert.deepEqual(Array.from(a.window.DuduLibraryIntakeV1.formats),['manual','epub']);
 assert.deepEqual(Array.from(a.window.DuduLibraryIntakeV1.sourceKinds),
  ['original','library','manuscript']);
 assert.ok(!/\.set\(|\.update\(|fetch\(|firebase\.firestore\(/.test(intakeSource));
});
test('Unauthorized readers cannot open Library author intake',()=>{
 const a=setup(false);
 assert.equal(a.window.DuduLibraryIntakeV1.open(),false);
 assert.equal(a.document.body.children.length,0);
});
test('Author sees exactly the two supported upload routes, without redundant navigation',()=>{
 const a=setup();
 assert.equal(a.window.DuduLibraryIntakeV1.open(),true);
 assert.deepEqual(a.buttons().map(n=>n.dataset.intake),
  ['manual','epub']);
 assert.equal(a.document.body.children[0].open,true);
 assert.ok(!intakeSource.includes('DuduSiteV60.navigate'));
 assert.ok(!intakeSource.includes('DuduWorldCreator?.open'));
 assert.ok(!siteShell.includes("button('📚 Quản lý trong Thư viện'"));
 assert.ok(siteShell.includes("const createWorld=button('✎ Tạo / nhập thế giới'"));
});
test('Opening twice reuses one dialog rather than spawning duplicates',()=>{
 const a=setup();a.window.DuduLibraryIntakeV1.open();
 a.window.DuduLibraryIntakeV1.open();
 assert.equal(a.document.body.children.length,1);
});
for(const [route,expect] of [['manual','manual'],['epub','epub']]){
 test('Library hub '+route+' uses the existing, permission-gated route',()=>{
  const a=setup();a.window.DuduLibraryIntakeV1.open();
  const dialog=a.document.body.children[0];
  a.buttons().find(n=>n.dataset.intake===route).listeners.click();
  assert.deepEqual(a.calls,[expect]);
  assert.equal(dialog.isConnected,false);
  assert.equal(a.focus.focused,true);
 });
}
test('Permission revoked while dialog is open prevents every upload action',()=>{
 const a=setup();a.window.DuduLibraryIntakeV1.open();
 a.setAuthorized(false);
 a.buttons().find(n=>n.dataset.intake==='epub').listeners.click();
 assert.deepEqual(a.calls,[]);
});
test('Library author buttons use the hub and keep legacy fallback',()=>{
 assert.ok(siteShell.includes('window.DuduLibraryIntakeV1?.open?.()'));
 assert.ok(siteShell.includes('openStoryModal()'));
 assert.ok(index.includes('canEditStories() && (window.DuduLibraryIntakeV1?.open?.() || openStoryModal())'));
 assert.ok(siteShell.includes('if(!isAuthor())return;'));
});
test('Library hub assets load after creator and do not remove EPUB V57',()=>{
 const site=index.indexOf('js/site-shell-v60.js');
 const world=index.indexOf('js/vangioi-creator.js');
 const hub=index.indexOf('js/library-intake-v1.js');
 assert.ok(site>=0&&world>site&&hub>world);
 assert.ok(index.includes('css/library-intake-v1.css'));
 assert.ok(index.includes('js/library-intake-v1.js?v=lib1-ui2'));
 assert.ok(index.includes('js/site-shell-v60.js?v=lib-l2b-5'));
 assert.ok(index.includes('js/epub-import-v48.js'));
 assert.ok(index.includes('js/epub-production-v49.js'));
});
test('Unsupported file types are described honestly, not made upload options',()=>{
 assert.ok(intakeSource.includes('TXT, DOCX hoặc PDF'));
 assert.ok(!intakeSource.includes("input.type='file'"));
  assert.ok(intakeSource.includes('không cần tải lại'));
  assert.ok(intakeSource.includes('Chưa hỗ trợ nhập TXT, DOCX hoặc PDF'));
});
