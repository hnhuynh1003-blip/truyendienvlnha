'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dictionary=require('../js/reader-name-dictionary-l53.js');

function storage(){
 const data=new Map();
 return {data,getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
}
test('L5.3 edits alternate Vietnamese names in one pass without touching ordinary words',()=>{
 const aliases=[{from:'trần sao',to:'Trần An'},
  {from:'trần an',to:'Trần An'},{from:'Trần An Bình',to:'Trần An Bình'}];
 const text='trần sao và TRẦN SAO gặp trần an. Sao trên trời. Trần SaoBình. Trần An Bình.';
 assert.equal(dictionary.replace(text,aliases),
  'Trần An và Trần An gặp Trần An. Sao trên trời. Trần SaoBình. Trần An Bình.');
 assert.equal(dictionary.replace('Trần Sao Trần Sao',aliases),'Trần An Trần An');
 assert.equal(dictionary.replace('Trần Sao,Trần Sao',aliases),'Trần An,Trần An');
});
test('L5.3 uses longest aliases first and never cascades replacements',()=>{
 assert.equal(dictionary.replace('Trần Sao gặp Trần An.',[
  {from:'Trần Sao',to:'Trần An'},{from:'Trần An',to:'Trần Bình'}
 ]),'Trần An gặp Trần Bình.');
 assert.equal(dictionary.replace('Trần An Bình đến.',[
  {from:'Trần An',to:'Tên Ngắn'},{from:'Trần An Bình',to:'Tên Dài'}
 ]),'Tên Dài đến.');
});
test('L5.3 keeps aliases per story and survives a simulated reload without Firestore writes',()=>{
 const device=storage(),first=dictionary.create({storage:device});
 const input='Trần Sao đến gặp Trần An.';
 first.add('epub:story-1','Trần Sao','Trần An');
 assert.equal(first.render('epub:story-1',input),'Trần An đến gặp Trần An.');
 assert.equal(first.render('web:story-1',input),input,'Different book type must not share a dictionary');
 assert.equal(first.render('epub:story-2',input),input,'Different story remains untouched');
 const again=dictionary.create({storage:device});
 assert.equal(again.render('epub:story-1',input),'Trần An đến gặp Trần An.');
 assert.equal(again.remove('epub:story-1','trần sao'),true);
 assert.equal(again.render('epub:story-1',input),input);
 assert.equal(input,'Trần Sao đến gặp Trần An.','Original chapter is immutable');
 assert.equal(device.data.size,1,'Only a local device key is written');
});
test('L5.3 does not silently overwrite the same alias or accept unsafe names',()=>{
 const device=storage(),book=dictionary.create({storage:device});
 book.add('epub:story-1','trần sao','Trần An');
 book.add('epub:story-1','TRẦN SAO','Trần Bình');
 assert.equal(book.read('epub:story-1').length,1);
 assert.equal(book.render('epub:story-1','Trần Sao'),'Trần Bình');
 for(const [from,to] of [['','Trần An'],['<img>','Trần An'],
  ['Trần Sao',''],['a'.repeat(91),'Tên Quá Dài']])
  assert.throws(()=>dictionary.clean(from,to));
 const noStorage=dictionary.create({storage:null});
 assert.equal(noStorage.render('epub:x','Trần Sao'),'Trần Sao');
 assert.throws(()=>noStorage.add('epub:x','Trần Sao','Trần An'),/Không thể lưu/);
});
test('L5.3 caps dictionary size and tolerates corrupted local records',()=>{
 const device=storage(),book=dictionary.create({storage:device});
 for(let i=0;i<dictionary.MAX_ENTRIES;i++)
  book.add('epub:many','Tên '+i,'Nhân Vật '+i);
 assert.equal(dictionary.MAX_ENTRIES,300);
 assert.throws(()=>book.add('epub:many','Tên 301','Nhân Vật 301'),/300/);
 const restored=dictionary.create({storage:device});
 assert.equal(restored.read('epub:many').length,300);
 assert.equal(restored.render('epub:many','Tên 1 gặp Tên 299.'),
  'Nhân Vật 1 gặp Nhân Vật 299.');
 // A previously saved 80-name dictionary can grow without losing any aliases.
 const oldDevice=storage(),oldVersion=dictionary.create({storage:oldDevice});
 for(let i=0;i<80;i++)oldVersion.add('epub:legacy','Tên '+i,'Danh Xưng '+i);
 const upgraded=dictionary.create({storage:oldDevice});
 assert.equal(upgraded.read('epub:legacy').length,80);
 upgraded.add('epub:legacy','Tên 80','Danh Xưng 80');
 assert.equal(upgraded.read('epub:legacy').length,81);
 device.data.set('dudu-reader-names-l53:epub%3Abroken','not-json');
 assert.deepEqual(dictionary.create({storage:device}).read('epub:broken'),[]);
});

function browserFixture(){
 const elements=new Map(),device=storage();
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.style={};
   this.dataset={};this.value='';this.textContent='';this.hidden=true;this.nodeType=1;}
  addEventListener(type,callback){this.listeners[type]=callback;}
  append(...children){this.children.push(...children);}
  replaceChildren(){this.children=[];}
  focus(){}
  querySelectorAll(){return this.children.filter(ch=>ch.tag==='p');}
 }
 const document={readyState:'complete',getElementById:id=>{
  if(!elements.has(id))elements.set(id,new Element());
  return elements.get(id);
 },createElement:tag=>new Element(tag),addEventListener(){}};
 const window={document,localStorage:device,confirm:()=>true,
  addEventListener(){},getSelection:()=>null,clearTimeout(){},setTimeout(){}};
 const source=file=>fs.readFileSync(path.join(__dirname,'../js/',file),'utf8');
 vm.runInNewContext(source('reader-name-dictionary-l53.js'),{window});
 vm.runInNewContext(source('reader-name-ui-l53.js'),{window});
 return {api:window.DuduReaderNamesL53,elements,device,Element};
}
test('L5.3 UI saves, applies, edits and removes names while preserving the source paragraph',()=>{
 const {api,elements,Element}=browserFixture();
 assert.ok(api,'Reader UI must initialize without Firestore');
 api.setStory('epub:story-1');
 const first=new Element('p');
 api.bindParagraph(first,'Trần Sao bước đến.');
 elements.get('reader-content').append(first);
 assert.equal(first.textContent,'Trần Sao bước đến.');
 assert.equal(api.openManager('Trần Sao'),true);
 elements.get('reader-name-to-l53').value='Trần An';
 assert.equal(api.save(),true);
 assert.equal(first.textContent,'Trần An bước đến.');
 const second=new Element('p');
 api.bindParagraph(second,'trần sao rời đi.');
 assert.equal(second.textContent,'Trần An rời đi.','New chapters use the saved alias');
 assert.equal(elements.get('reader-name-list-l53').children.length,1);
 const row=elements.get('reader-name-list-l53').children[0];
 row.children[1].listeners.click();
 assert.equal(elements.get('reader-name-from-l53').value,'Trần Sao');
 elements.get('reader-name-to-l53').value='Trần Bình';
 assert.equal(api.save(),true);
 assert.equal(first.textContent,'Trần Bình bước đến.');
 elements.get('reader-name-list-l53').children[0].children[2].listeners.click();
 assert.equal(first.textContent,'Trần Sao bước đến.','Removing restores the unmodified display');
 api.setStory('web:other');
 const unrelated=new Element('p');api.bindParagraph(unrelated,'Trần Sao bước đến.');
 assert.equal(unrelated.textContent,'Trần Sao bước đến.');
});
test('L5.3 reader integration includes contextual selection, manual manager and responsive CSS',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../css/reader-names-l53.css'),'utf8');
 for(const id of ['reader-name-modal-l53','reader-name-hint-l53',
  'reader-name-from-l53','reader-name-to-l53','reader-name-list-l53'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/DuduReaderNamesL53\?\.setStory\(\(novel\._cloudV49\?'epub:':'web:'\)\+novel\.id\)/);
 assert.match(html,/DuduReaderNamesL53\.bindParagraph\(pTag,p\.trim\(\)\)/);
 assert.match(html,/css\/reader-names-l53\.css\?v=l5-3b/);
 assert.doesNotMatch(html,/Gặp tên bị dịch sai\? Bôi đen/);
 assert.doesNotMatch(html,/reader-name-foot-l53/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(fs.readFileSync(path.join(__dirname,'../js/reader-name-ui-l53.js'),'utf8'),
  /selectionchange/);
});
