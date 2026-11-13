'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const root=join(__dirname,'..');
const script=readFileSync(join(root,'js/library-reader-status-l2a.js'),'utf8');
const index=readFileSync(join(root,'index.html'),'utf8');
const shell=readFileSync(join(root,'js/site-shell-v60.js'),'utf8');

class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.hidden=true;this.listeners={};this.textContent='';}
 replaceChildren(...items){this.children=items;}
 appendChild(child){this.children.push(child);}
 addEventListener(event,callback){this.listeners[event]=callback;}
}
function setup(){
 const region=new Element('div');
 const document={getElementById:id=>id==='library-read-feedback'?region:null,
  createElement:tag=>new Element(tag)};
 const window={document};vm.runInNewContext(script,{window});
 return {region,api:window.DuduLibraryReaderStatusL2A};
}

test('EPUB load status is visible while fetching and clears on success',()=>{
 const {region,api}=setup();
 const ticket=api.begin('<img onerror=1>');
 assert.equal(region.hidden,false);
 assert.equal(region.children[0].textContent,'Đang tải <img onerror=1>…');
 assert.equal(region.children[0].tagName,'p');
 assert.equal(api.success(ticket),true);
 assert.equal(region.hidden,true);
});

test('Canceled and superseded cloud reads cannot reopen stale chapters',()=>{
 const {region,api}=setup();
 const a=api.begin('Chương A'),b=api.begin('Chương B');
 assert.equal(api.success(a),false);
 assert.equal(api.fail(a,()=>{}),false);
 assert.equal(region.children[0].textContent,'Đang tải Chương B…');
 api.cancel();
 assert.equal(api.success(b),false);
 assert.equal(region.hidden,true);
});

test('Network failure presents a real retry action without automatic write',()=>{
 const {region,api}=setup();let retries=0;
 const ticket=api.begin('Chương 1');
 assert.equal(api.fail(ticket,()=>retries++),true);
 assert.equal(region.hidden,false);
 assert.match(region.children[0].textContent,/Kiểm tra kết nối/);
 assert.equal(region.children[1].textContent,'Tải lại chương');
 region.children[1].listeners.click();
 assert.equal(retries,1);
 assert.ok(!/firebase|fetch\(|\.set\(|\.add\(/i.test(script));
});

test('The Library shell cancels pending reads when navigating and only the EPUB path starts loading',()=>{
 assert.ok(index.indexOf('js/library-reader-status-l2a.js')<index.indexOf('js/site-shell-v60.js'));
 assert.match(shell,/function navigate\(page,updateHash=true\)\{\s*window\.DuduLibraryReaderStatusL2A\?\.cancel\(\)/);
 assert.match(index,/DuduEpubProductionV49\.readChapter\(db,bookId,chapterId\)/);
 assert.match(index,/feedback\?\.begin\(pendingChapter\.title\)/);
 assert.match(index,/if\(feedback&&!feedback\.success\(ticket\)\)return/);
});
