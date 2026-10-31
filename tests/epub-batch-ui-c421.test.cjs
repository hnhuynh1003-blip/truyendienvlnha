const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};
  this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;
  this._text='';this.value='';}
 set textContent(value){this._text=String(value);this.children=[]}
 get textContent(){return this._text+this.children.map(x=>x.textContent||'').join('')}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=[...children]}
 setAttribute(name,value){this.attributes[name]=String(value)}
 addEventListener(event,callback){this.listeners[event]=callback}
 fire(name){return this.listeners[name]?.()}
 click(){return this.fire('click')}
}
const descendants=root=>[root,...root.children.flatMap(descendants)];

test('C4.21 UI offers directory selection and drives one compact queue into published state',async()=>{
 const modal=new Element('div'),host=new Element('div');
 const doc={getElementById:id=>({'epub-batch-modal':modal,'epub-batch-content':host})[id],
  createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text,children:[]})};
 const writes=[],window={document:doc,confirm:()=>true,localStorage:{
  items:new Map(),getItem(key){return this.items.get(key)||null},
  setItem(key,value){this.items.set(key,value)}}};
 const script=fs.readFileSync(path.join(__dirname,'../js/epub-batch-import-c421.js'),'utf8');
 vm.runInNewContext(script,{window});
 const importer={validFile:()=>true,parse:async file=>({title:file.name,author:'DUDU',
  chapters:[{title:'Chương 1',content:'Nội dung'}]})};
 const production={ownedBooks:async()=>[],fingerprint:()=> 'one-fingerprint',
  manifest:p=>p.chapters,importDraft:async(p,{onCreated,onProgress})=>{
   onCreated('epub-one');onProgress(100);writes.push(p.title);
   return {id:'epub-one',chapterCount:1,status:'draft'};
  },publishDraft:async()=>{writes.push('published')}};
 let refreshes=0;
 const opened=window.DuduEpubBatchC421.open({canEdit:()=>true,importer,production,
  firestore:()=>({}),auth:()=>({currentUser:{uid:'owner'}}),onPublished:()=>{refreshes++}});
 assert.equal(opened,true);
 assert.equal(modal.style.display,'flex');
 const inputs=descendants(host).filter(el=>el.tag==='input'&&el.type==='file');
 assert.equal(inputs.length,2);
 assert.equal(inputs[0].multiple,true);
 assert.equal(inputs[1].attributes.webkitdirectory,'');
 inputs[1].files=[{name:'Test.epub',size:1024,lastModified:1,
  webkitRelativePath:'Kho truyen/Test/Test.epub'}];
 inputs[1].fire('change');
 assert.match(host.textContent,/1 EPUB/);
 const publish=descendants(host).find(el=>el.tag==='input'&&el.type==='checkbox');
 publish.checked=true;publish.fire('change');
 const start=descendants(host).find(el=>el.tag==='button'&&el.textContent==='Bắt đầu nhập');
 await start.click();
 assert.deepEqual(writes,['Test.epub','published']);
 assert.equal(refreshes,1);
 assert.match(host.textContent,/Đã xuất bản/);
});
