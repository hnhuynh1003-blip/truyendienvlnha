'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const f=require('../js/library-smart-filter-l3.js');
const html=readFileSync(join(__dirname,'../index.html'),'utf8');
const css=readFileSync(join(__dirname,'../css/library-smart-filter-l3.css'),'utf8');
const books=[
 {id:'web-a',title:'Đạo lộ',genre:'Huyền Huyễn, Tu Tiên, Hệ thống',status:'Đang ra',chapters:[{},{}]},
 {id:'web-b',title:'Vườn Mộng',genre:'huyền huyễn; Hậu Cung / Ngược',status:'Hoàn thành',chapters:[{}]},
 {id:'web-c',title:'Xưa',genre:'Tu tiên, Tình cảm',status:'Đang ra',chapters:[]},
 {id:'epub-a',title:'EPUB',genre:'HUYEN HUYEN| Tu tiên | EPUB',_cloudV49:true,status:'Hoàn thành',chapters:[{}, {}, {}]},
 {id:'epub-b',title:'Khác',genre:'  hỖN Hợp, Nhập EPUB ',_cloudV49:true,status:'Đang ra',chapters:[{}]}
];
const ids=state=>books.filter(book=>f.matches(book,state)).map(book=>book.id);

test('L3 normalizes case, accents and format-only labels without editing originals',()=>{
 const before=JSON.stringify(books);
 assert.equal(f.normalize('  HUYỀN   HUYỄN '),'huyen huyen');
 assert.deepEqual(f.genres(books[3]),['HUYEN HUYEN','Tu tiên']);
 const catalog=f.catalogGenres(books);
 assert.equal(catalog.find(item=>item.key==='huyen huyen').count,3);
 assert.equal(catalog.find(item=>item.key==='tu tien').count,3);
 assert.ok(!catalog.some(item=>item.key==='epub'||item.key==='nhap epub'));
 assert.equal(JSON.stringify(books),before,'metadata remains unchanged');
});

test('L3 applies AND/OR to includes and always excludes disallowed genres',()=>{
 const s={include:['HUYỀN HUYỄN','Tu Tiên'],exclude:['Hậu cung','Ngược']};
 assert.deepEqual(ids({...s,mode:'AND'}),['web-a','epub-a']);
 assert.deepEqual(ids({...s,mode:'OR'}),['web-a','web-c','epub-a']);
 assert.deepEqual(ids({exclude:['Hậu Cung']}),['web-a','web-c','epub-a','epub-b']);
 assert.deepEqual(ids({include:['Tu Tiên'],exclude:['TU TIEN']}),
  ['web-b','epub-b'],
  'an explicit exclusion takes precedence for duplicate conflicting selection');
});

test('L3 cycles tri-state tags and removes just one condition',()=>{
 let s=f.state();
 s=f.cycle(s,'Huyền huyễn');assert.deepEqual(s.include,['huyen huyen']);
 s=f.cycle(s,'hUYEN HUYEN');assert.deepEqual(s.exclude,['huyen huyen']);
 s=f.cycle(s,'Huyền Huyễn');assert.deepEqual(s.exclude,[]);
 s=f.cycle(s,'Tu tiên');s=f.cycle(s,'Hậu cung');s=f.cycle(s,'Hậu cung');
 s=f.remove(s,'exclude','hậu cung');
 assert.deepEqual(s.include,['tu tien']);assert.deepEqual(s.exclude,[]);
});

test('L3 combines source, completion and minimum chapters without touching text search',()=>{
 assert.deepEqual(ids({source:'EPUB',status:'Hoàn thành',minChapters:2}),['epub-a']);
 assert.deepEqual(ids({source:'WEB',minChapters:2}),['web-a']);
 assert.deepEqual(ids({status:'Hoàn thành',include:['Huyền huyễn']}),['web-b','epub-a']);
 assert.equal(f.state({minChapters:-4}).minChapters,0);
 assert.equal(f.state({minChapters:200000}).minChapters,100000);
});

test('L3 remains an isolated read-only Library UI without changes to auth or EPUB ownership',()=>{
 assert.match(html,/js\/library-smart-filter-l3\.js\?v=l3-/);
 assert.match(html,/css\/library-smart-filter-l3\.css\?v=l3-/);
 assert.match(html,/onclick="applyLibraryFiltersL3\(\)"/);
 assert.match(html,/id="archive-active-filters"/);
 assert.match(html,/id="archive-min-chapters"/);
 assert.match(css,/#home-view \.search-row/);
 assert.match(css,/@media\(max-width:760px\)/);
 const src=readFileSync(join(__dirname,'../js/library-smart-filter-l3.js'),'utf8');
 assert.doesNotMatch(src,/\.collection\(|\.doc\(|\.update\(|deleteDoc|firebase|localStorage|sessionStorage|fetch\(/);
});
