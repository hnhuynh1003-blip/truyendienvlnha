const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const api=require('../js/library-capacity-r1.js');
const src=file=>fs.readFileSync(path.join(root,file),'utf8');

test('R1 Web estimate uses UTF-8 and excludes cloud EPUB bodies',()=>{
 const web={id:'web-1',title:'Đường về',chapters:[{content:'Căn nhà bên sông'}]};
 const epub={id:'epub-1',title:'EPUB',_cloudV49:true,
  chapters:[{id:'chapter-0001',wordCount:110},{id:'chapter-0002',wordCount:130}]};
 const result=api.summarize([web,epub]);
 assert.equal(result.webCount,1);
 assert.equal(result.epubCount,1);
 assert.equal(result.epubChapters,2);
 assert.equal(result.epubBooks[0].wordCount,240);
 assert.equal(result.webBytes,api.jsonBytes({novels:[web],updatedAt:null}));
 assert.ok(api.bytesOf('Đường')>5,'Vietnamese UTF-8 is not one byte per character');
 assert.equal(api.summarize([epub]).webCount,0);
 assert.equal(api.summarize([epub]).webBytes,api.jsonBytes({novels:[],updatedAt:null}));
});

test('R1 displays largest Web items and largest EPUB by words first',()=>{
 const result=api.summarize([
  {id:'web-small',title:'Nhỏ',chapters:[]},
  {id:'web-large',title:'Lớn',chapters:[{content:'A'.repeat(900)}]},
  {id:'epub-small',_cloudV49:true,chapters:[{wordCount:1}]},
  {id:'epub-large',_cloudV49:true,chapters:[{wordCount:100}]}
 ]);
 assert.deepEqual(result.webBooks.map(x=>x.id),['web-large','web-small']);
 assert.deepEqual(result.epubBooks.map(x=>x.id),['epub-large','epub-small']);
 assert.match(api.formatBytes(1024),/KiB/);
});

test('R1 EPUB measurement is explicit and reads only requested chapters, never writes',async()=>{
 const reads=[];
 const db={collection(name){assert.equal(name,'epub_stories_v49');return {doc(id){
  assert.equal(id,'book1');return {collection(sub){assert.equal(sub,'chapters');return {
   doc(chapterId){return {get:async()=>{reads.push(chapterId);
    return {exists:true,data:()=>({title:'Chương',content:'Nội dung '+chapterId})};
   }};}
  };}};}};}};
 const book={id:'book1',chapters:[{id:'chapter-0001'},{id:'chapter-0002'}]};
 const result=await api.measureEpub(book,{db,isAllowed:()=>true});
 assert.equal(result.readCount,2);
 assert.equal(result.bytes,api.jsonBytes({title:'Chương',content:'Nội dung chapter-0001'})+
  api.jsonBytes({title:'Chương',content:'Nội dung chapter-0002'}));
 assert.deepEqual(reads,['chapter-0001','chapter-0002']);
});

test('R1 measurement refuses unauthorized, excessive or cancelled scans',async()=>{
 const book={id:'book1',chapters:[{id:'chapter-0001'}]};
 await assert.rejects(api.measureEpub(book,{isAllowed:()=>false}),/không có quyền/i);
 await assert.rejects(api.measureEpub({...book,chapters:Array(161).fill({id:'chapter-0001'})},
  {db:{collection:()=>{}},isAllowed:()=>true}),/ngoài giới hạn/i);
 let reads=0;
 const db={collection:()=>({doc:()=>({collection:()=>({doc:()=>({get:async()=>{
  reads++;return {exists:true,data:()=>({content:'a'})};
 }})})})})};
 await assert.rejects(api.measureEpub({...book,chapters:Array(6).fill({id:'chapter-0001'})},
  {db,isAllowed:()=>true,onProgress:()=>{reads=100;},cancelled:()=>reads===100}),/Đã dừng/);
});

test('R1 UI is owner-only and sends no data to Firestore on open',()=>{
 const html=src('index.html');
 assert.match(html,/id="library-capacity-r1" hidden/);
 assert.match(html,/libraryCapacityR1\?\.render\(\)/);
 assert.match(html,/canEdit:\(\)=>canEditStories\(\)/);
 assert.match(html,/js\/library-capacity-r1\.js\?v=r1-1/);
 assert.match(html,/css\/library-capacity-r1\.css\?v=r1-1/);
 const ui=src('js/library-capacity-r1.js');
 assert.match(ui,/if\(!permitted\|\|!panel.open\)/);
 assert.match(ui,/Firestore miễn phí: 1 GiB/);
 assert.match(ui,/chưa gồm index/);
 assert.doesNotMatch(ui,/\b(?:collection|ref|chapter|documentRef|tx)\.(?:set|update|delete|add)\(/);
 assert.match(src('css/library-capacity-r1.css'),/body\.is-reader .*\.library-capacity-r1\{display:none!important\}/);
});
