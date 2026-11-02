const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../js/phone-wallpaper-v38-catalog.js');
const sync=require('../js/personal-sync-v56-8.js');
const typography=require('../js/phone-typography-v31.js');
const root=path.resolve(__dirname,'..');
const store=()=>{const values=new Map();return {
 getItem:key=>values.get(key)||null,
 setItem:(key,value)=>values.set(key,value),
 keys:()=>[...values.keys()]};};

test('six original and four character AI wallpapers are available as optimized WebP files',()=>{
 assert.equal(catalog.ITEMS.length,10);
 const categories=new Set(catalog.ITEMS.map(x=>x.category));
 assert.ok(categories.size>=6);
 assert.equal(catalog.ITEMS.filter(x=>x.category==='Chân dung').length,2);
 for(const item of catalog.ITEMS){
  const file=path.join(root,'assets/wallpapers',item.folder||'v38',item.asset);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length<350_000,`${item.id} should be phone friendly`);
  assert.equal(sync.cleanAppearance({wallpaper:item.id}).wallpaper,item.id);
 }
});
test('home wallpaper focus can hide app tiles and restore the home navigation',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'css/phone-wallpaper-v38-studio.css'),'utf8');
 const js=fs.readFileSync(path.join(root,'js/phone-wallpaper-v38-studio.js'),'utf8');
 assert.match(js,/dudu-v38-focus-toggle/);
 assert.match(js,/classList\.toggle\('is-wallpaper-focus'\)/);
 assert.match(css,/\.is-wallpaper-focus #phone-home-screen \.phone-app-grid/);
 assert.match(css,/\.is-wallpaper-focus #phone-home-screen \.dudu-v30-dock/);
 assert.match(css,/\.dudu-v38-inspect-time\{[\s\S]*?font-size:11px/);
 assert.match(js,/enabled\?'‹':'◉'/);
 assert.match(html,/id="phone-home-screen"/);
});
test('gift wallpapers/fonts unlock once per account, paid items never unlock through local storage',()=>{
 const storage=store();
 assert.equal(catalog.allowed('wallpaper','v38-moon',storage,'du'),true);
 assert.equal(catalog.allowed('wallpaper','v38-jade',storage,'du'),false);
 assert.equal(catalog.claimGift(storage,'du','v38-jade'),true);
 assert.equal(catalog.claimGift(storage,'du','v38-jade'),true);
 assert.deepEqual(catalog.readGifts(storage,'du'),['v38-jade']);
 assert.equal(catalog.allowed('wallpaper','v38-jade',storage,'du'),true);
 assert.equal(catalog.allowed('wallpaper','v38-jade',storage,'other'),false);
 assert.equal(catalog.claimGift(storage,'du','v38-fox'),false);
 assert.equal(catalog.allowed('wallpaper','v38-fox',storage,'du'),false);
 assert.equal(catalog.allowed('wallpaper','v39-whitefox',storage,'du'),false);
 assert.equal(catalog.allowed('wallpaper','v39-mage',storage,'du'),true);
 assert.equal(catalog.claimGift(storage,'du','v39-swordsman'),true);
 assert.equal(catalog.allowed('wallpaper','v39-swordsman',storage,'du'),true);
 assert.equal(catalog.claimGift(storage,'du','cormorant'),true);
 assert.equal(catalog.allowed('font','cormorant',storage,'du'),true);
 assert.equal(catalog.allowed('font','prata',storage,'du'),false);
 assert.equal(typography.fontById('cormorant').id,'cormorant');
 assert.equal(sync.cleanAppearance({font:'cormorant'}).font,'cormorant');
 assert.equal(catalog.claimGift(storage,'../../another','cormorant'),false);
});
test('signature is isolated, sanitized, and never touches wallet or legacy keys',()=>{
 const storage=store();
 assert.equal(catalog.writeSignature(storage,'du',{text:'<Du>\n',style:'royal',visible:true}),true);
 assert.deepEqual(catalog.readSignature(storage,'du'),{text:'Du',style:'royal',visible:true});
 assert.deepEqual(catalog.readSignature(storage,'other'),{text:'Du',style:'script',visible:false});
 assert.equal(catalog.writeSignature(storage,'../../other',{visible:true}),false);
 assert.deepEqual(storage.keys(),[catalog.keyFor('du','signature')]);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/phone-wallpaper-v38-catalog\.js/);
 assert.match(html,/phone-wallpaper-v38-studio\.js/);
 assert.match(html,/DuduWallpaperCatalogV38\?\.ITEMS\.some\(item=>item\.id===id\)/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'js/phone-wallpaper-v38-studio.js'),'utf8'),
  /(?:currency\s*[-+]=|\.runTransaction\(|tx\.update\()/);
});
