/* READER-BG R1 — pure entitlement and presentation regression checks. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const readFile=file=>fs.readFileSync(path.join(root,file),'utf8');
const adapter=require('../js/reader-background-r1.js');
const catalog=require('../js/phone-wallpaper-v38-catalog.js');

function memoryStore(){
  const values=new Map();
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>{values.set(key,String(value));},
    entries:()=>[...values.entries()]
  };
}
test('R1 remains opt-in and preserves four existing Reader themes',()=>{
  const prefs=require('../js/library-reader-preferences-l2c.js');
  const html=readFile('index.html');
  assert.deepEqual(adapter.DEFAULT,{enabled:false,id:'v38-moon',opacity:72});
  assert.match(html,/data-reader-theme="light"/);
  assert.match(html,/data-reader-theme="sepia"/);
  assert.match(html,/data-reader-theme="dark"/);
  assert.match(html,/data-reader-theme="soft"/);
  assert.equal(prefs.DEFAULT.theme,'dark');
  assert.match(html,/css\/reader-background-r1\.css\?v=r1-1/);
  assert.match(html,/js\/reader-background-r1\.js\?v=r1-1/);
  assert.ok(html.indexOf('js/library-reader-preferences-l2c.js')<
    html.indexOf('js/reader-background-r1.js'));
});
test('R1 keeps per-account device storage separate without Phone preference writes',()=>{
  const store=memoryStore();
  const a='live-accountA',b='live-accountB';
  assert.equal(adapter.keyFor(''),null);
  assert.equal(adapter.keyFor('a:b'),null);
  assert.equal(adapter.keyFor(a),'dudu-reader-bg-r1:'+a);
  assert.equal(adapter.save(store,a,{enabled:true,id:'v38-moon',opacity:80},catalog),true);
  assert.deepEqual(adapter.read(store,a,catalog),{enabled:true,id:'v38-moon',opacity:80});
  assert.deepEqual(adapter.read(store,b,catalog),adapter.DEFAULT);
  assert.deepEqual(adapter.read(store,'guest',catalog),adapter.DEFAULT);
  assert.equal(store.entries().length,1);
  assert.equal(store.entries()[0][0],adapter.keyFor(a));
});
test('R1 uses the Phone catalogue entitlement; premium cannot be selected by spoofing local state',()=>{
  const store=memoryStore(),owner='live-accountA';
  assert.equal(adapter.canUse('v38-moon',catalog,store,owner),true);
  assert.equal(adapter.canUse('v38-neon',catalog,store,owner),true);
  assert.equal(adapter.canUse('v38-jade',catalog,store,owner),false);
  assert.equal(adapter.canUse('v39-swordsman',catalog,store,owner),false);
  assert.equal(adapter.canUse('v38-lantern',catalog,store,owner),false);
  assert.equal(adapter.canUse('v38-fox',catalog,store,owner),false);
  assert.equal(adapter.canUse('v39-whitefox',catalog,store,owner),false);
  assert.equal(catalog.claimGift(store,owner,'v38-jade'),true);
  assert.equal(adapter.canUse('v38-jade',catalog,store,owner),true);
  assert.equal(adapter.canUse('v38-jade',catalog,store,'live-accountB'),false);
  assert.equal(adapter.canUse('v39-whitefox',catalog,store,owner),false);
});
test('R1 sanitizes image IDs, asset paths, opacity and broken storage',()=>{
  const store=memoryStore();
  assert.deepEqual(adapter.sanitize({enabled:true,id:'../../secret',opacity:0},catalog),
    {enabled:true,id:'v38-moon',opacity:72});
  assert.deepEqual(adapter.sanitize({enabled:true,id:'v39-mage',opacity:90},catalog),
    {enabled:true,id:'v39-mage',opacity:90});
  assert.equal(adapter.assetPath(catalog.ITEMS.find(item=>item.id==='v39-mage')),
    'assets/wallpapers/v39/moon-mage.webp');
  assert.equal(adapter.assetPath({folder:'../../',asset:'test.webp'}),null);
  assert.equal(adapter.assetPath({folder:'v38',asset:'x.svg'}),null);
  store.setItem(adapter.keyFor('guest'),'{broken json');
  assert.deepEqual(adapter.read(store,'guest',catalog),adapter.DEFAULT);
});
test('R1 is a CSS reading layer only, not a reader transport or wallet change',()=>{
  const css=readFile('css/reader-background-r1.css');
  const js=readFile('js/reader-background-r1.js');
  const html=readFile('index.html');
  assert.match(css,/#reader-view \.reader-paper\[data-reader-bg\]/);
  assert.match(css,/--reader-r1-shade/);
  assert.match(css,/background-repeat:no-repeat,repeat-y/);
  assert.match(js,/catalog\.allowed|source\.allowed/);
  assert.doesNotMatch(js,/fetch\(|firestore|firebase|transaction|v568SavePhoneAppearance\(/i);
  assert.match(html,/id="reader-paper"/);
  assert.match(html,/js\/epub-production-v49\.js/);
});
