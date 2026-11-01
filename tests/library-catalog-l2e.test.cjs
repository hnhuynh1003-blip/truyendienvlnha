'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {PAGE_SIZE,KEY,createPager}=require('../js/library-catalog-l2e.js');
const read=p=>readFileSync(join(__dirname,'..',p),'utf8');
function storage(){const values=new Map();return {
  getItem:key=>values.get(key)||null,
  setItem:(key,value)=>values.set(key,String(value))};}

test('L2E paginates 47 stories by 20 with stable absolute ordering and bounds',()=>{
 const store=storage(),pager=createPager(store);
 const all=Array.from({length:47},(_,i)=>({id:'story-'+i}));
 assert.equal(PAGE_SIZE,20);
 assert.deepEqual(pager.paginate(all).items.map(x=>x.id),all.slice(0,20).map(x=>x.id));
 pager.setPage(2);
 const second=pager.paginate(all);
 assert.deepEqual([second.page,second.pages,second.offset,second.from,second.to],
  [2,3,20,21,40]);
 assert.deepEqual(second.items.map(x=>x.id),all.slice(20,40).map(x=>x.id));
 assert.equal(store.getItem(KEY),'2');
 assert.equal(createPager(store).page,2,'reopening the same tab remembers its page');
 pager.setPage(3);
 assert.equal(pager.paginate(all).items.length,7);
 pager.setPage(5);
 assert.deepEqual([pager.paginate(all).page,pager.page],[3,3],
  'a changed or smaller catalog clamps to the last available page');
 pager.resetPage();
 assert.equal(pager.paginate(all.slice(0,8)).pages,1);
 assert.equal(pager.paginate([]).items.length,0);
});

test('L2E restores the exact catalog scroll only when returning from its book',()=>{
 const pager=createPager(storage());const raf=[];const scrolls=[];
 const win={scrollY:812,document:{getElementById:()=>({style:{display:'block'}})},
  requestAnimationFrame:fn=>raf.push(fn),scrollTo:pos=>scrolls.push(pos)};
 assert.equal(pager.rememberScroll(win),true);
 assert.equal(pager.restoreScroll(win),true);
 assert.equal(pager.restoreScroll(win),false,'return is consumed once');
 raf.shift()();raf.shift()();
 assert.deepEqual(scrolls,[{top:812,behavior:'instant'}]);
 win.document.getElementById=()=>({style:{display:'none'}});
 assert.equal(pager.rememberScroll(win),false,'home/other tabs cannot replace the catalog position');
});

test('L2E page controls and labels provide a jump-to-page without a long list',()=>{
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.attributes={};}
  replaceChildren(){this.children=[];}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);}
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this.attributes[name]=value;}
 }
 const hosts={
  'library-catalog-pager-top':new Element('nav'),
  'library-catalog-pager-bottom':new Element('nav')
 };
 const doc={getElementById:id=>hosts[id],createElement:tag=>new Element(tag)};
 const pager=createPager(storage());const selections=[];
 pager.setPage(2);
 pager.renderControls(doc,pager.paginate(Array(47).fill({})),page=>selections.push(page));
 for(const host of Object.values(hosts)){
  assert.equal(host.hidden,false);
  assert.equal(host.children.length,4);
  assert.equal(host.children[1].value,'2');
  assert.equal(host.children[1].children.length,3);
  assert.equal(host.children[3].textContent,'21–40 / 47 truyện');
 }
 hosts['library-catalog-pager-top'].children[2].handlers.click();
 hosts['library-catalog-pager-bottom'].children[1].value='1';
 hosts['library-catalog-pager-bottom'].children[1].handlers.change();
 assert.deepEqual(selections,[3,1]);
 pager.renderControls(doc,pager.paginate(Array(10).fill({})),()=>{});
 assert.ok(Object.values(hosts).every(host=>host.hidden));
});

test('L2E is wired to the existing Library route and resets after search/filter/sort',()=>{
 const html=read('index.html'),shell=read('js/site-shell-v60.js'),css=read('css/library-catalog-l2e.css');
 assert.match(html,/id="library-catalog-pager-top"/);
 assert.match(html,/id="library-catalog-pager-bottom"/);
 assert.match(html,/catalogPager\?\.paginate\(filtered\)/);
 assert.match(html,/catalogPage\.items\.forEach/);
 assert.match(html,/catalogPage\.offset \+ displayIndex \+ 1/);
 assert.match(html,/searchQuery = document\.getElementById\('search-novel-input'\)\.value\.trim\(\);\s*window\.DuduLibraryCatalogL2E\?\.resetPage\(\)/);
 assert.match(html,/sortMode = document\.getElementById\('sort-select-ctrl'\)\.value;\s*window\.DuduLibraryCatalogL2E\?\.resetPage\(\)/);
 assert.match(shell,/returningToCatalog/);
 assert.match(shell,/DuduLibraryCatalogL2E\?\.rememberScroll\(window\)/);
 assert.match(shell,/DuduLibraryCatalogL2E\?\.restoreScroll\(window\)/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.doesNotMatch(read('js/library-catalog-l2e.js'),/firestore|profiles_v2|addExp|grantReward/i);
});
