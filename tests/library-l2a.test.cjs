'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const synopsisSearch=require('../js/library-synopsis-search-l2d.js');

const root=join(__dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'css/site-shell-v60.css'),'utf8');
const readerCss=readFileSync(join(root,'css/library-reader-l2c.css'),'utf8');
const begin=html.indexOf('function renderHome() {');
const end=html.indexOf('function resetAllFilters()',begin);
assert.ok(begin>0&&end>begin,'L2A expects the legacy Library list renderer');
const renderer=html.slice(begin,end);

test('The full Library page inline JavaScript still parses after L2A changes',()=>{
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match=>match[1]).filter(Boolean);
 assert.ok(inline.length>0);
 inline.forEach((code,i)=>assert.doesNotThrow(()=>new vm.Script(code),`inline script ${i}`));
});

class FakeElement {
 constructor(tag){
  this.tagName=tag;this.children=[];this.listeners={};this.attributes={};
  this.className='';this.textContent='';this.style={};
 }
 set innerHTML(value){
  // The list renderer may clear a container, but must not parse story data as HTML.
  assert.equal(value,'','Library cards must use textContent/DOM nodes');
  this.children=[];
 }
 append(...nodes){this.children.push(...nodes);}
 appendChild(node){this.children.push(node);return node;}
 addEventListener(event,handler){this.listeners[event]=handler;}
 setAttribute(name,value){this.attributes[name]=value;}
}
const walk=(node)=>[node,...node.children.flatMap(walk)];
function render(books,bookmarks=()=>null){
 const grid=new FakeElement('div'),count=new FakeElement('span');
 const document={
  getElementById:id=>id==='novel-grid-container'?grid:
   id==='search-result-count'?count:null,
  createElement:tag=>new FakeElement(tag)
 };
 const calls=[];
 const context={document,novels:books,selectedTag:'ALL',searchQuery:'',
  currentFilterStatus:'ALL',sortMode:'NEWEST_UPDATE',renderTagCloud:()=>{},
  v568ReadBookmarkForNovel:bookmarks,
  DuduStoryDates:{ordering:()=>1,display:()=> '29/10/2026'},
  getNovelLatestDate:()=>0,getNovelTotalWords:()=>0,
  openCover:idx=>calls.push(['cover',idx]),
  smartReadAction:idx=>calls.push(['read',idx]),
  applyUserRole:()=>{},updatePhoneUI:()=>{},
  DuduLibrarySynopsisSearchL2D:synopsisSearch,
  librarySynopsisIndexL2D:{getSynopsis:()=>'',isFailed:()=>false},
  missingSearchSynopsesL2D:()=>[]
 };
 vm.runInNewContext(renderer+'\nrenderHome();',context);
 return {grid,count,calls};
}

test('L2A cards render untrusted story fields as inert text, with accessible actions',()=>{
 const title='<img src=x onerror=alert(1)>',description='<svg onload=alert(2)>';
 const {grid,count,calls}=render([{id:'legacy',title,desc:description,
  author:'<b>Author</b>',genre:'<script>evil</script>',status:'Đang ra',
  coverImage:"https://example.test/cover');onerror='bad",chapters:[{title:'Một'}]}]);
 assert.equal(count.textContent,'1 / 1 tác phẩm');
 const nodes=walk(grid);
 assert.equal(nodes.filter(node=>node.tagName==='img').length,1);
 assert.ok(nodes.some(node=>node.tagName==='button'&&node.textContent===title));
 assert.ok(nodes.some(node=>node.textContent===description));
 assert.ok(nodes.some(node=>node.textContent==='<b>Author</b> · 1 chương'));
 const open=nodes.find(node=>node.tagName==='button'&&node.textContent===title);
 open.listeners.click();
 assert.deepEqual(calls,[['cover',0]]);
});

test('L2A shows one real read action for either legacy or EPUB with bookmarks',()=>{
 const books=[{id:'legacy',title:'Truyện chương',chapters:[{id:'a'}],coverImage:'javascript:alert(1)'},
  {id:'cloud',title:'Truyện EPUB',_cloudV49:true,chapters:[{id:'b'},{id:'c'}]}];
 const {grid,calls}=render(books,n=>n._cloudV49?{chIdx:1}:null);
 const nodes=walk(grid);
 assert.equal(nodes.filter(node=>node.tagName==='article').length,2);
 assert.ok(nodes.some(node=>node.textContent==='T'));
 const action=nodes.find(node=>node.tagName==='button'&&node.textContent==='Đọc tiếp · Ch.2');
 assert.ok(action);
 action.listeners.click({stopPropagation:()=>{}});
 assert.deepEqual(calls,[['read',1]]);
});

test('L2A reading focus is confined to the reader and leaves author permissions untouched',()=>{
 assert.match(html,/function openCover\(idx\)\s*\{\s*window\.DuduLibraryReaderStatusL2A\?\.cancel\(\);\s*document\.body\.classList\.remove\('dudu-reading-active'\)/);
 assert.match(html,/function goHome\(\)\s*\{\s*window\.DuduLibraryReaderStatusL2A\?\.cancel\(\);\s*document\.body\.classList\.remove\('dudu-reading-active'\)/);
 assert.match(html,/document\.getElementById\('reader-view'\)\.style\.display = 'block';\s*document\.body\.classList\.add\('dudu-reading-active'\)/);
 assert.match(css,/body\.dudu-reading-active \.d60-bottomnav/);
 assert.match(readerCss,/body\.dudu-site-v60\.dudu-reading-active #phone-fab/);
 assert.match(html,/winScroll > 180 && winScroll < lastReaderScrollY - 3/);
 assert.match(html,/canEditStories\(\)/);
 assert.match(html,/DuduEpubProductionV49\.readChapter\(db,bookId,chapterId\)/);
 assert.match(html,/<button type="button" class="chapter-name-click" \$\{isCurrent \?/);
});
