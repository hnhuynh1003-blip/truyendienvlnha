'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const root=join(__dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const shell=readFileSync(join(root,'js/site-shell-v60.js'),'utf8');
const css=readFileSync(join(root,'css/library-discovery-l2b.css'),'utf8');
const shellCss=readFileSync(join(root,'css/site-shell-v60.css'),'utf8');
const begin=html.indexOf('function renderHome() {');
const end=html.indexOf('function resetAllFilters()',begin);
const renderSource=html.slice(begin,end);

class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.textContent='';this.className='';this.attributes={};}
 set innerHTML(value){assert.equal(value,'');this.children=[];}
 append(...items){this.children.push(...items);}
 appendChild(item){this.children.push(item);return item;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 setAttribute(name,value){this.attributes[name]=value;}
}
const allNodes=node=>[node,...node.children.flatMap(allNodes)];
function runRender(books,opts={}){
 const grid=new Element('div'),count=new Element('span'),label=new Element('span'),calls=[];
 const document={createElement:t=>new Element(t),getElementById:id=>({
  'novel-grid-container':grid,'search-result-count':count,'archive-filter-label':label
 }[id]||null)};
 const context={document,novels:books,selectedTag:opts.tag||'ALL',
  currentFilterStatus:opts.status||'ALL',searchQuery:opts.query||'',
  sortMode:'NEWEST_UPDATE',renderTagCloud:()=>{},
  getNovelLatestDate:()=>0,getNovelTotalWords:()=>0,
  DuduStoryDates:{ordering:()=>1,display:()=> '29/10/2026'},
  v568ReadBookmarkForNovel:n=>opts.bookmarks?.[n.id]||null,
  openCover:i=>calls.push(['cover',i]),smartReadAction:i=>calls.push(['read',i]),
  resetAllFilters:()=>calls.push(['reset']),applyUserRole:()=>{},updatePhoneUI:()=>{}
 };
 vm.runInNewContext(renderSource+'\nrenderHome();',context);
 return {grid,count,label,calls};
}

test('L2B builds one opening folio and compact catalog rows without fake books',()=>{
 const books=[
  {id:'a',title:'Tác phẩm A',author:'A',chapters:[{id:'a1'}]},
  {id:'b',title:'Tác phẩm B',author:'B',chapters:[{id:'b1'}]},
  {id:'c',title:'Tác phẩm C',author:'C',chapters:[]}
 ];
 const {grid,count,calls}=runRender(books,{bookmarks:{b:{chIdx:0}}});
 assert.equal(count.textContent,'3 / 3 tác phẩm');
 assert.equal(grid.children.length,3);
 assert.match(grid.children[0].className,/archive-featured/);
 assert.ok(grid.children.slice(1).every(c=>c.className.includes('archive-shelf-item')));
 const nodes=allNodes(grid);
 const resume=nodes.find(n=>n.tagName==='button'&&n.textContent==='Đọc tiếp · Ch.1');
 assert.ok(resume);resume.listeners.click({stopPropagation:()=>{}});
 const emptyBook=nodes.find(n=>n.tagName==='button'&&n.textContent==='Xem tác phẩm');
 assert.ok(emptyBook);emptyBook.listeners.click({stopPropagation:()=>{}});
 assert.deepEqual(calls,[['read',1],['cover',2]]);
});

test('L2B shows real empty and filter states with working reset action',()=>{
 const {grid,count,label,calls}=runRender([{id:'a',title:'Khác',chapters:[]}],
  {tag:'Bách Hợp',query:'không khớp'});
 assert.equal(count.textContent,'0 / 1 tác phẩm');
 assert.equal(label.textContent,'Bách Hợp');
 const nodes=allNodes(grid);
 assert.ok(nodes.some(n=>n.textContent==='Chưa tìm thấy câu chuyện phù hợp'));
 const reset=nodes.find(n=>n.tagName==='button'&&n.textContent==='Xem tất cả tác phẩm');
 assert.ok(reset);reset.listeners.click();assert.deepEqual(calls,[['reset']]);
});

test('L2B removes permanent filter walls while preserving real search/sort/status controls',()=>{
 assert.match(html,/<details class="archive-filter-details" id="archive-filter-details">/);
 assert.match(html,/id="search-novel-input"[^>]+oninput="onSearchChange\(\)"/);
 assert.match(html,/id="sort-select-ctrl"[^>]+onchange="onSortChange\(\)"/);
 assert.match(html,/onclick="filterStatus\('Hoàn thành', this\)"/);
 assert.match(html,/onclick="resetAllFilters\(\)"/);
 assert.match(html,/const span = document\.createElement\('button'\);/);
 assert.match(html,/span\.setAttribute\('aria-pressed'/);
 assert.match(html,/button\.classList\.toggle\('active', active\)/);
});

test('L2B visual identity and mobile treatment stay inside the Library route',()=>{
 assert.match(shell,/THE STORY ARCHIVE/);
 assert.match(shell,/contextHeading\('Thư viện','THE STORY ARCHIVE'/);
 assert.match(shell,/classList\.toggle\('dudu-library-browsing',current==='library'\)/);
 assert.match(css,/\.archive-featured/);
 assert.match(css,/\.archive-shelf-item/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:370px\)/);
 assert.doesNotMatch(css,/body\.dudu-library-browsing #phone-fab \{display:none!important\}/);
 assert.match(css,/body\.dudu-phone-v11\.dudu-library-browsing #phone-fab/);
 assert.match(css,/left:12px;right:auto;bottom:calc\(79px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(shellCss,/body\.dudu-reading-active #phone-fab \{display:none!important\}/);
 assert.match(html,/class="header-create-short"/);
 assert.match(html,/canEditStories\(\) && \(window\.DuduLibraryIntakeV1\?\.open\?\.\(\) \|\| openStoryModal\(\)\)/);
 assert.ok(!/\.set\(|firebase\.firestore\(|fetch\(/.test(css));
});

test('L2B route headings use one compact contextual rail without repeating navigation titles',()=>{
 assert.match(shell,/function contextHeading\(pageTitle,kicker,description\)/);
 assert.match(shell,/element\('h1','d60-visually-hidden',pageTitle\)/);
 assert.match(shell,/contextHeading\('Thế giới','WORLD ATLAS'/);
 assert.match(shell,/contextHeading\('Tủ sách','DẤU TRANG'/);
 assert.match(shell,/contextHeading\('Góc tác giả','BÀN VIẾT'/);
 assert.doesNotMatch(shell,/element\('h1','d60-page-title','Vạn giới'\)/);
 assert.doesNotMatch(shell,/element\('h1','d60-page-title','Tủ sách của tôi'\)/);
 assert.doesNotMatch(shell,/element\('h1','d60-page-title','Góc tác giả'\)/);
 assert.doesNotMatch(shell,/archive-crest|archive-heading/);
 assert.match(html,/css\/site-shell-v60\.css\?v=lib-l2b-3/);
 assert.match(html,/css\/library-discovery-l2b\.css\?v=l2b-3/);
 assert.match(html,/js\/site-shell-v60\.js\?v=lib-l2b-3/);
});

test('L2B.2 home is a literary opening without duplicate DUDU wordmarks or NPC-only shortcut',()=>{
 assert.match(shell,/Có những thế giới bắt đầu từ một dòng chữ/);
 assert.match(shell,/BÊN KIA TRANG SÁCH/);
 assert.match(shell,/d61-folio-page d61-folio-left/);
 assert.match(shell,/d61-folio-page d61-folio-right/);
 assert.doesNotMatch(shell,/DUDU \/ SYSTEM GATE|DUDU \/ THE STORY ARCHIVE/);
 assert.doesNotMatch(shell,/Liên lạc NPC  ↗/);
 assert.match(shellCss,/\.d61-folio-page/);
});

test('L2B book dossier hides empty EPUB synopsis without changing metadata',()=>{
 assert.match(html,/const introText = String\(intro\.text \|\| novel\.intro \|\| ''\)\.trim\(\)/);
 assert.match(html,/if \(introBox\) introBox\.hidden = !introText/);
 assert.match(html,/book-chapter-count'\)\.textContent = String\(novel\.chapters\.length\)/);
 assert.match(html,/mainReadBtn\.disabled = !novel\.chapters\.length/);
 assert.match(css,/\.intro-terminal-box\[hidden\] \{display:none!important\}/);
});

test('L2B bookmark marker derives from existing chapter index and preserves chapter order',()=>{
 const start=html.indexOf('function renderChapterIndex() {');
 const end=html.indexOf('function toggleChapterOrder()',start);
 assert.ok(start>0&&end>start);
 const items=[];
 const document={getElementById:()=>({set innerHTML(v){assert.equal(v,'');},appendChild:x=>items.push(x)}),
  createElement:()=>({className:'',innerHTML:''})};
 const novel={id:'same-id',chapters:[{id:'ch1',title:'Chương một',content:'Đầu'},
  {id:'ch2',title:'Chương hai',content:'Sau'}]};
 vm.runInNewContext(html.slice(start,end)+'\nrenderChapterIndex();',{
  document,novels:[novel],selectedNovelIndex:0,isReversedOrder:false,
  v568ReadBookmarkForNovel:()=>({chIdx:1}),
  escapeHtml:x=>x,countWords:()=>1,applyUserRole:()=>{}
 });
 assert.equal(items.length,2);
 assert.ok(!items[0].className.includes('is-bookmarked'));
 assert.ok(items[1].className.includes('is-bookmarked'));
 assert.match(items[1].innerHTML,/aria-current="location"/);
 assert.match(items[1].innerHTML,/readChapter\(1\)/);
 assert.match(items[1].innerHTML,/Đang đọc/);
 assert.equal(novel.chapters[1].id,'ch2');
});
