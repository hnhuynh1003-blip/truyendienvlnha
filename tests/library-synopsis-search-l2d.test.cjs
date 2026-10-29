'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const search=require('../js/library-synopsis-search-l2d.js');
const indexHtml=readFileSync(join(__dirname,'../index.html'),'utf8');

const epub=(id='epub-old')=>({id,_cloudV49:true,title:'Phượng Hoàng Hoa',
 author:'Fababaiji',desc:'',genre:'',updatedAt:'2026-10-18',
 introData:{text:''},chapters:[{id:'chapter-0001',title:'Văn án',content:null},
 {id:'chapter-0002',title:'Chương 1',content:null}]});

test('Search accepts fragments, multiple keywords and Vietnamese without accents',()=>{
 const book={title:'Phượng Hoàng Hoa - Tuyết Ca',author:'Fababaiji',
  genre:'Bách Hợp, Hiện đại',desc:'Câu chuyện của Kỳ An',
  characters:[{name:'Tiêu Ngân Phong'}]};
 assert.equal(search.matches(book,'phuong hoang'),true);
 assert.equal(search.matches(book,'bAcH hop'),true);
 assert.equal(search.matches(book,'ky an'),true);
 assert.equal(search.matches(book,'ngan phong'),true);
 assert.equal(search.matches(book,'fab tuyet'),true);
 assert.equal(search.matches(book,'khong co'),false);
});

test('Legacy synopsis and EPUB metadata description are searchable without chapter reads',()=>{
 assert.equal(search.matches({title:'Khác',introData:{text:'Mật mã sót lại dưới trời mưa'}},'mat ma'),true);
 assert.equal(search.matches({title:'Khác',desc:'Đêm mùa hạ'},'mua ha'),true);
 const pending=search.createIndex(()=>{throw Error('Should not load');});
 assert.equal(pending.isUnresolved({title:'Khác',desc:'Đêm mùa hạ'}),false);
 assert.equal(pending.isUnresolved({...epub(),desc:'Đã có văn án',introData:{text:'Đã có văn án'}}),false);
});

test('Old published EPUBs get only their explicit synopsis chapter, cached by identity',async()=>{
 const calls=[];
 const index=search.createIndex(async(id,chapterId)=>{
  calls.push({id,chapterId});
  return {content:'Văn án\n\nKỳ An gặp Tiêu Ngân Phong ở thư viện.'};
 });
 const book=epub();
 assert.equal(index.isUnresolved(book),true);
 const [a,b]=await Promise.all([index.ensure(book),index.ensure(book)]);
 assert.equal(a,b);
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0],{id:'epub-old',chapterId:'chapter-0001'});
 assert.equal(index.getSynopsis(book),'Kỳ An gặp Tiêu Ngân Phong ở thư viện.');
 assert.equal(search.matches(book,'tieu ngan phong',index.getSynopsis(book)),true);
 assert.equal(index.isUnresolved(book),false);
 await index.ensure(book);
 assert.equal(calls.length,1);
});

test('Lookup stays read-only, bounded in concurrency and shows partial failures',async()=>{
 let active=0,maxActive=0,reads=0;
 const index=search.createIndex(async(id)=>{
  active++;maxActive=Math.max(maxActive,active);reads++;
  await new Promise(resolve=>setTimeout(resolve,2));active--;
  if(id==='bad')throw Error('Network unavailable');
  return {content:'Nội dung văn án '+id};
 });
 const books=['a','b','bad','c','d','e','f'].map(id=>epub(id));
 let progress=0;
 await index.loadMissing(books,()=>{progress++;});
 assert.equal(maxActive<=3,true);
 assert.equal(progress,books.length);
 assert.equal(reads,books.length);
 assert.equal(index.isFailed(books[2]),true);
 assert.equal(index.getSynopsis(books[0]),'Nội dung văn án a');
 await index.loadMissing(books);
 assert.equal(reads,books.length,'No refetch on each keystroke or failed query');
});

test('A new EPUB revision invalidates only its synopsis cache entry',async()=>{
 let reads=0;
 const index=search.createIndex(async()=>({content:'Lần '+(++reads)}));
 const book=epub();
 assert.equal(await index.ensure(book),'Lần 1');
 assert.equal(await index.ensure({...book,updatedAt:'2026-10-19'}),'Lần 2');
});

test('Browser integration indexes on demand and never persists EPUB search data',()=>{
 assert.match(indexHtml,/js\/library-synopsis-search-l2d\.js\?v=l2d-1/);
 assert.match(indexHtml,/scheduleSynopsisSearchL2D\(\)/);
 assert.match(indexHtml,/DuduLibrarySynopsisSearchL2D\.matches\(n,\s*searchQuery,librarySynopsisIndexL2D\.getSynopsis\(n\)\)/);
 assert.match(indexHtml,/librarySynopsisIndexL2D\.loadMissing\(missing/);
 assert.match(indexHtml,/librarySynopsisIndexL2D\.ensure\(novel\)/);
 const moduleSource=readFileSync(join(__dirname,'../js/library-synopsis-search-l2d.js'),'utf8');
 assert.doesNotMatch(moduleSource,/\.collection\(|\.doc\(|\.update\(|localStorage|sessionStorage|fetch\(/);
});
