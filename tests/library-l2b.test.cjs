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
const bookCss=readFileSync(join(root,'css/library-cards-l2b4.css'),'utf8');
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

test('L2B.5 keeps all catalog cards equal regardless of source or sort position',()=>{
 const books=[
  {id:'a',title:'Tác phẩm A',author:'A',chapters:[{id:'a1'}]},
  {id:'b',title:'Tác phẩm B',author:'B',chapters:[{id:'b1'}]},
  {id:'c',title:'Tác phẩm C',author:'C',chapters:[]}
 ];
 const {grid,count,calls}=runRender(books,{bookmarks:{b:{chIdx:0}}});
 assert.equal(count.textContent,'3 / 3 tác phẩm');
 assert.equal(grid.children.length,3);
 assert.ok(grid.children.every(c=>c.className==='novel-card archive-shelf-item'));
 const nodes=allNodes(grid);
 assert.ok(nodes.some(n=>n.className==='archive-card-index'&&n.textContent==='ARCHIVE  /  01'));
 assert.ok(nodes.some(n=>n.className==='archive-card-index'&&n.textContent==='ARCHIVE  /  03'));
 assert.ok(!nodes.some(n=>typeof n.textContent==='string'&&n.textContent.includes('DUDU ARCHIVE')));
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

test('L2B.4 searches by author and genre while concealing EPUB import taxonomy',()=>{
 const titles=[{id:'e',title:'Vùng im lặng',author:'Kẻ lữ hành',genre:'Huyền bí, Điều tra',
  desc:'Một cuốn sách bị quên',chapters:[{id:'1'}]}];
 for(const term of ['điều tra','kẻ lữ hành']){
  const {grid,count}=runRender(titles,{query:term});
  assert.equal(count.textContent,'1 / 1 tác phẩm');
  assert.equal(grid.children.length,1);
 }
 const old=runRender([{id:'old',title:'Tên truyện',genre:'Nhập EPUB',
  chapters:[{id:'one'}]}]);
 const badges=allNodes(old.grid).filter(n=>n.className==='tag');
 assert.equal(badges.length,0);
 assert.ok(!allNodes(old.grid).some(n=>n.textContent==='Nhập EPUB'));
});

test('L2B.4 book jackets remain edition-neutral across homepage, library and shelf',()=>{
 assert.match(shell,/d60-book d62-book/);
 assert.match(shell,/d62-cover-action/);
 assert.match(shell,/d62-in-shelf/);
 assert.match(bookCss,/#d60-home \.d60-grid/);
 assert.match(bookCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(bookCss,/counter-reset:edition/);
 assert.match(bookCss,/height:214px;min-height:214px;max-height:214px/);
 assert.doesNotMatch(bookCss,/d62-book:first-child|\.archive-featured/);
 assert.match(bookCss,/#d60-shelf \.d60-grid/);
 assert.match(bookCss,/@media\(max-width:760px\)/);
 assert.match(html,/css\/library-cards-l2b4\.css\?v=[^"']+/);
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
 assert.doesNotMatch(shellCss,/body\.dudu-reading-active #phone-fab \{display:none!important\}/);
 assert.match(html,/class="header-create-short"/);
 assert.match(html,/canEditStories\(\) && \(window\.DuduLibraryIntakeV1\?\.open\?\.\(\) \|\| openStoryModal\(\)\)/);
 assert.ok(!/\.set\(|firebase\.firestore\(|fetch\(/.test(css));
});

test('L2B route headings use one compact contextual rail without repeating navigation titles',()=>{
 assert.match(shell,/function contextHeading\(pageTitle,kicker\)/);
 assert.match(shell,/element\('h1','d60-visually-hidden',pageTitle\)/);
 assert.match(shell,/contextHeading\('Thế giới','WORLD ATLAS'/);
 assert.match(shell,/contextHeading\('Tủ sách','DẤU TRANG'/);
 assert.match(shell,/contextHeading\('Góc tác giả','BÀN VIẾT'/);
 assert.doesNotMatch(shell,/element\('h1','d60-page-title','Vạn giới'\)/);
 assert.doesNotMatch(shell,/element\('h1','d60-page-title','Tủ sách của tôi'\)/);
 assert.doesNotMatch(shell,/element\('h1','d60-page-title','Góc tác giả'\)/);
 assert.doesNotMatch(shell,/archive-crest|archive-heading/);
 assert.doesNotMatch(shell,/element\('p','d60-context-note'/);
 assert.match(html,/css\/site-shell-v60\.css\?v=[^"']+/);
 assert.match(html,/css\/library-discovery-l2b\.css\?v=l2b-4/);
 assert.match(html,/js\/site-shell-v60\.js\?v=[^"']+/);
});

test('L2B.3 home uses accessible short headline and code artwork rather than long copy or fake buttons',()=>{
 assert.match(shell,/Từ chữ thành thế giới\./);
 assert.match(shell,/SYS \/\/ STORY ARCHIVE/);
 assert.match(shell,/const codeArt=element\('div','d61-code-art'\)/);
 assert.match(shell,/codeArt\.setAttribute\('aria-hidden','true'\)/);
 assert.match(shell,/story\.open\(\)/);
 assert.doesNotMatch(shell,/DUDU \/ SYSTEM GATE|DUDU \/ THE STORY ARCHIVE/);
 assert.doesNotMatch(shell,/Liên lạc NPC  ↗/);
 assert.doesNotMatch(shell,/element\('p','d61-tagline'/);
 assert.match(shellCss,/\.d61-code-art/);
 assert.match(shellCss,/\.d61-hero h1[\s\S]*?system-ui/);
 assert.match(shellCss,/#d60-home \.d60-sectionhead h2[^\n]*system-ui/);
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
