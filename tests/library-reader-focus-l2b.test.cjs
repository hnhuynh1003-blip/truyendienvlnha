'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const root=join(__dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'css/library-reader-focus-l2b.css'),'utf8');
const source=readFileSync(join(root,'js/library-reader-focus-l2b.js'),'utf8');
const focus=require('../js/library-reader-focus-l2b.js');

test('L2B progress follows the chapter paper, not comments or the entire page',()=>{
  assert.equal(focus.chapterProgress(0,120,2800,800),0);
  assert.equal(focus.chapterProgress(1120,120,2800,800),50);
  assert.equal(focus.chapterProgress(2120,120,2800,800),100);
  assert.equal(focus.chapterProgress(3000,120,2800,800),100);
  assert.equal(focus.chapterProgress(-100,120,2800,800),0);
  assert.equal(focus.chapterProgress(NaN,120,2800,800),0);
});

test('L2B uses existing chapters, settings and Phone without changing protected persistence',()=>{
  for(const id of ['reader-quick-prev','reader-quick-next','reader-quick-settings','reader-quick-progress'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/aria-label="Mở mục lục"/);
  assert.match(html,/DuduReaderFocusL2B\?\.reset\(chIdx,novel\.chapters\.length\)/);
  assert.match(html,/DuduReaderFocusL2B\.onScroll\(winScroll,revealToc\)/);
  assert.match(html,/window\.scrollTo\(\{ top: scrollPos, behavior: 'auto' \}\)/);
  assert.match(readFileSync(join(root,'js/library-reader-preferences-l2c.js'),'utf8'),
    /focus\(\{preventScroll:true\}\)/);
  assert.match(css,/max-width:calc\(100vw - 94px\)/);
  assert.match(css,/reader-mobile-only \{display:inline-flex\}/);
  assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,''),
    /firestore|firebase|localStorage|sessionStorage|updateDoc|setDoc|bookmarks|coin|reward/i);
});

test('L2B tapping prose toggles a brief dock; scroll down hides it and settings reuse L2A',()=>{
  function element(){return {style:{},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};}
  const nodes=Object.fromEntries(['reader-view','reader-paper','floating-reading-bar',
    'reader-quick-prev','reader-quick-next','reader-quick-settings',
    'reading-bar','reader-quick-progress'].map(id=>[id,element()]));
  nodes['reader-view'].style.display='block';
  nodes['reader-paper'].getBoundingClientRect=()=>({top:-300,height:1800});
  const classes=new Set(['dudu-reading-active']);
  const document={readyState:'complete',body:{classList:{
    contains:name=>classes.has(name),add:name=>classes.add(name),remove:name=>classes.delete(name)
  }},getElementById:id=>nodes[id],addEventListener() {}};
  let settingsOpened=0,selection='';
  const win={document,scrollY:500,innerHeight:800,getSelection:()=>selection,
    DuduReaderPreferencesL2C:{toggle:()=>settingsOpened++}};
  const timers=new Map();let timerId=0;
  runInNewContext(source,{window:win,document,console,
    setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},
    clearTimeout:id=>timers.delete(id)});
  const api=win.DuduReaderFocusL2B;
  api.reset(0,2);
  assert.equal(nodes['reader-quick-prev'].disabled,true);
  assert.equal(nodes['reader-quick-next'].disabled,false);
  const target={closest:()=>false};
  nodes['reader-paper'].listeners.click({target});
  assert.equal(api.visible(),true);
  assert.equal(classes.has('dudu-reader-tools-visible'),true);
  assert.equal(api.onScroll(500,false),30);
  assert.equal(nodes['reader-quick-progress'].textContent,'30%');
  assert.equal(nodes['reading-bar'].style.width,'30%');
  api.onScroll(650,false);
  assert.equal(api.visible(),false);
  api.onScroll(550,true);
  assert.equal(api.visible(),true);
  nodes['reader-quick-settings'].listeners.click();
  assert.equal(settingsOpened,1);
  assert.equal(api.visible(),false);
  selection='Đang chọn chữ';
  nodes['reader-paper'].listeners.click({target});
  assert.equal(api.visible(),false,'selecting text cannot pop up controls');
});
