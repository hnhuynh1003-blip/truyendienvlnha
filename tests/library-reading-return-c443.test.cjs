'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const api=require('../js/library-reading-return-c443.js');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
function memory(){const data=new Map();return {
  getItem:key=>data.get(key)||null,
  setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key)
};}
const story={id:'novel-1',chapters:[{id:'c1'},{id:'c2'}]};

test('C4.43 remembers this tab only and restores exact chapter and scroll after refresh',()=>{
 const storage=memory(),now=Date.now();
 assert.equal(api.remember(storage,'sandbox:AnDu',story,1,723,now),true);
 assert.deepEqual(api.resolve(storage,'sandbox:AnDu',[story],now+100),
  {novelIndex:0,chapterIndex:1,scrollTop:723});
 assert.equal(api.resolve(storage,'sandbox:Other',[story],now+100),null,
  'a different account cannot inherit the reading position');
 assert.equal(api.resolve(storage,'live:AnDu',[story],now+100),null,
  'Sandbox and live users are separate');
 assert.equal(api.resolve(storage,'sandbox:AnDu',[{...story,chapters:[story.chapters[1],story.chapters[0]]}],now+100).chapterIndex,0,
  'chapter ID wins if chapters were reordered');
 assert.equal(api.resolve(storage,'sandbox:AnDu',[{...story,chapters:[{id:'other'}]}],now+100),null,
  'do not resume a different chapter when its ID was removed');
 assert.equal(api.clear(storage),true);
 assert.equal(api.resolve(storage,'sandbox:AnDu',[story],now+100),null);
});

test('C4.43 tolerates corrupt, unavailable, expired and invalid tab positions',()=>{
 const storage=memory(),now=Date.now();
 storage.setItem(api.KEY,'not json');
 assert.equal(api.resolve(storage,'sandbox:A',[story],now),null);
 assert.equal(api.remember(storage,'sandbox:A',story,0,-100,now),true);
 assert.equal(api.resolve(storage,'sandbox:A',[story],now).scrollTop,0);
 assert.equal(api.resolve(storage,'sandbox:A',[story],now+8*86400000),null);
 assert.equal(api.remember(storage,'sandbox:A',story,9,200,now),false);
 assert.equal(api.remember({setItem(){throw Error('blocked');}},'sandbox:A',story,0,25,now),false);
 assert.equal(api.resolve({getItem(){throw Error('blocked');}},'sandbox:A',[story],now),null);
});

test('C4.43 browser Back returns to TOC once; manual TOC unwinds without repeating',()=>{
 const listeners={};let pops=0,pushes=0,backs=0;
 const win={location:{href:'https://studio.example/#/library'},
  document:{body:{classList:{contains:()=>true}}},
  addEventListener:(event,fn)=>{listeners[event]=fn;},
  history:{state:null,pushState(state){pushes++;this.state=state;},
   replaceState(state){this.state=state;},back(){backs++;this.state=null;listeners.popstate?.();}}};
 api.handleBack(win,()=>pops++);
 api.enterHistory(win);
 api.enterHistory(win);
 assert.equal(pushes,1,'entering another chapter must not add another history step');
 win.history.back();
 assert.equal(pops,1,'Android/Browser Back returns to the open book contents');
 api.enterHistory(win);
 api.exitHistory(win,true);
 assert.equal(backs,2);
 assert.equal(pops,1,'tapping the TOC button cannot trigger a second back action');
});

test('L2F mobile reader reveals a compact TOC only after intentional upward scrolling',()=>{
 const index=read('index.html'),css=read('css/library-reading-return-c443.css');
 assert.match(index,/floating-reading-bar[\s\S]*?onclick="goCover\(\)">‹ Mục lục/);
 assert.match(index,/floatBar\.style\.display = revealToc\?'flex':'none'/);
 assert.match(index,/DuduReaderShortcutL2F\?\.update\(winScroll\)/);
 assert.match(index,/DuduReaderShortcutL2F\?\.reset\(window\.scrollY\)/);
 assert.match(css,/#floating-reading-bar\{\s*display:none/);
 assert.match(css,/#floating-reading-bar\{[\s\S]*?right:auto/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(index,/DuduReadingReturnC443\?\.enterHistory\(window\)/);
 assert.match(index,/handleBack\(window,\(\)=>goCover\(\)\)/);
 assert.match(index,/c443RestoreOnReload\(\)/);
 assert.doesNotMatch(read('js/library-reading-return-c443.js').replace(/\/\*[\s\S]*?\*\//g,''),
  /firestore|profile_|grant|currency/i);
});
