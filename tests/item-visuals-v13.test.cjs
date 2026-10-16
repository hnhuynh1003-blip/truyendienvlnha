const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const art=require('../js/item-visuals-v13.js');
const catalog=require('../js/item-catalog-v2.js');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/item-visuals-v13.css'),'utf8');

test('nine distinct rarity palettes are deterministic with valid SVG art',()=>{
 assert.deepEqual(Object.keys(art.RANKS),['F','E','D','C','B','A','S','SS','SSS']);
 for(const rank of Object.keys(art.RANKS)){
  const a=art.visual({id:'f1',rank,type:'FOOD'});
  assert.equal(a.rank,rank);
  assert.match(a.src,/^data:image\/svg\+xml;charset=utf-8,/);
  const svg=decodeURIComponent(a.src.split(',')[1]);
  assert.match(svg,/<svg /);
  assert.match(svg,/viewBox="0 0 76 76"/);
  assert.ok(svg.includes(art.RANKS[rank][0]));
  assert.equal(art.visual({id:'f1',rank,type:'FOOD'}).src,a.src);
 }
});
test('catalog items have visible defined art with safe unknown fallback',()=>{
 assert.equal(art.visual(null),null);
 for(const item of catalog.items){
  const v=art.visual(item);
  assert.ok(v&&art.SHAPES[v.shape],item.id);
  assert.ok(v.src.length>300,item.id);
 }
 assert.equal(art.visual({id:'custom',rank:'__proto__',type:'ITEM'}).rank,'F');
});
test('frequency cell has dedicated battery illustration, never fallback parcel',()=>{
 const tool={
  id:'dudu-tool-frequency-cell-v43',rank:'D',type:'ITEM',scope:'FUNCTIONAL'
 };
 const artCell=art.visual(tool);
 assert.equal(artCell.shape,'frequencyCell');
 assert.notEqual(artCell.src,art.visual({id:'unlisted-common',rank:'D',type:'ITEM'}).src);
 const svg=decodeURIComponent(artCell.src.slice(artCell.src.indexOf(',')+1));
 assert.match(svg,/M40 25L29 41/,'has its own lightning bolt artwork');
 assert.match(svg,/stroke="#a5efff"/,'bright casing differentiates power tool');
 assert.equal(art.visual({...tool,icon:'📦'}).shape,'frequencyCell');
 assert.equal(art.visual({id:'future-tool',rank:'D',type:'ITEM',
   scope:'FUNCTIONAL'}).shape,'device','other future functional items also avoid generic parcel');
});
test('SVG cannot interpolate unsafe item-provided HTML',()=>{
 const fake={id:'<svg onload=alert(1)>',name:'<img src=x onerror=alert(2)>',
  rank:'F',type:'ITEM',desc:'<script>alert(1)</script>'};
 const svg=decodeURIComponent(art.visual(fake).src.split(',')[1]);
 assert.doesNotMatch(svg,/onload|onerror|alert|<script|src=x/);
});
test('item art is Sandbox-only and preserves original inventory controls',()=>{
 assert.match(html,/src="js\/item-visuals-v13.js(?:\?v=[\w-]+)?"/);
 assert.match(html,/href="css\/item-visuals-v13.css"/);
 assert.match(html,/function renderSandboxItemArt\(element,item\)\{\s*if\(!IS_SANDBOX_MODE/);
 assert.match(html,/renderSandboxItemArt\(artwork,item\)/);
 assert.match(html,/renderSandboxItemArt\(icon,item\)/);
 const from=html.indexOf('function renderSandboxItemArt(');
 const to=html.indexOf('function renderInventoryDetail()',from);
 const portion=html.slice(from,to);
 assert.doesNotMatch(portion,/saveCurrentAccount|inventory\.splice|fetch\(/);
 assert.match(css,/body\.dudu-phone-v11 #cyber-phone/);
});
