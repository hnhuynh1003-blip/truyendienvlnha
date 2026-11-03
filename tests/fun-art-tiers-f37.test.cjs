const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const art=require('../js/item-visuals-v13.js');
const catalog=require('../js/item-catalog-v2.js');

const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');

test('F3.7 individually painted B items retain original IDs/ranks and alpha WebP art',()=>{
 const ids=['f32-anime-guardian','f32b-anime-witch','f32-cult-fan'];
 const paths=new Set();
 for(const id of ids){
  const item=catalog.byId(id);
  assert.equal(item.rank,'B');
  assert.equal(item.collectionSet,'VAN_VAT');
  const visual=art.visual(item);
  assert.equal(visual.src,`assets/van-tuong/f37/${id}.webp`);
  assert.ok(visual.fallbackSrc?.startsWith('data:image/svg+xml'));
  const file=fs.readFileSync(path.resolve(__dirname,'..',visual.src));
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(file.toString('ascii',8,12),'WEBP');
  assert.ok(file.length>10000&&file.length<150000);
  paths.add(visual.src);
 }
 assert.equal(paths.size,3);
 assert.match(art.visual(catalog.byId('f32-fossil-fern')).src,/^data:image\/svg/);
});

test('F3.7 Vạn Tượng result, museum, and zoom carry original rarity classes',()=>{
 const ui=read('js/dudu-fun-ui-v43.js');
 assert.match(ui,/f33-vantvat-zoom-panel f37-tier-/);
 assert.match(ui,/f36-vantvat-reward f37-tier-/);
 assert.match(ui,/f33-vantvat-card f37-tier-/);
 const html=read('index.html');
 for(const file of ['css/dudu-fun-v43.css','css/item-visuals-v13.css',
  'js/item-visuals-v13.js','js/dudu-fun-ui-v43.js']){
  assert.ok(html.includes(file+'?v=f37-1'),file);
 }
});

test('F3.7 lower tiers have no animation; S, SS, SSS each have distinct glow',()=>{
 const css=read('css/dudu-fun-v43.css');
 const itemCss=read('css/item-visuals-v13.css');
 assert.match(css,/f37-tier-f,\.f37-tier-e,\.f37-tier-d/);
 for(const rank of ['s','ss','sss']){
  assert.match(css,new RegExp('keyframes f37-legendary-'+rank+'\\{'));
  assert.match(css,new RegExp('f37-tier-'+rank+'\\{'));
 }
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(itemCss,/f37-mini-legendary/);
 assert.match(itemCss,/\[data-rarity="SSS"\]/);
 assert.match(itemCss,/animation:none !important/);
});
