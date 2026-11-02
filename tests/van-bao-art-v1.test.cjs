const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const catalog=require('../js/item-catalog-v2.js');
const blind=require('../js/personal-blind-box-c29.js');
const art=require('../js/item-visuals-v13.js');
const css=fs.readFileSync(path.join(root,'css/van-bao-art-v1.css'),'utf8');
const funUI=fs.readFileSync(path.join(root,'js/dudu-fun-ui-v43.js'),'utf8');
const marketUI=fs.readFileSync(path.join(root,'js/market-ui-v43.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('Vạn Bảo uses 19 individual transparent WebP collectibles without changing IDs or draw odds',()=>{
 assert.equal(catalog.funCollectibles.length,19);
 assert.equal(blind.POOL.length,19);
 assert.equal(blind.TOTAL,1000000);
 assert.equal(blind.PRICE,20);
 assert.equal(blind.DUPLICATE_RETURN,4);
 for(const item of catalog.funCollectibles){
  const filepath=path.join(root,'assets/van-bao/v1',item.id+'.webp');
  const buf=fs.readFileSync(filepath);
  assert.equal(buf.toString('ascii',0,4),'RIFF',item.id);
  assert.equal(buf.toString('ascii',8,12),'WEBP',item.id);
  assert.ok(buf.length>7000&&buf.length<180000,item.id+' is optimized for phone');
  assert.equal(art.visual(item).src,'assets/van-bao/v1/'+item.id+'.webp');
  assert.ok(art.visual(item).fallbackSrc.startsWith('data:image/svg+xml'));
 }
});

test('Vạn Bảo features S, SS and SSS visually, keeping unopened prizes sealed and purchases unchanged',()=>{
 assert.match(funUI,/blind-treasure-showcase/);
 for(const id of ['fun-celestial-harp','fun-eternal-crown','fun-universe-egg'])
  assert.ok(funUI.includes("'"+id+"'"));
 assert.match(funUI,/if\(!root\.DuduItemArtV13\?\.mount\?\.\(picture,item\)\)/);
 assert.match(css,/\.blind-treasure-featured/);
 assert.match(css,/\.blind-treasure-feature\.rank-sss/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(marketUI,/funEntry\.hidden=tab!==\'DUDU\'/);
 assert.match(marketUI,/root\.openPhoneApp\?\.\('fun'\)/);
 assert.match(html,/href="css\/van-bao-art-v1\.css\?v=vanbao-1"/);
 assert.match(html,/src="js\/item-visuals-v13\.js\?v=vanbao-1"/);
 assert.match(html,/src="js\/dudu-fun-ui-v43\.js\?v=fun-tower1"/);
});

test('Avatar artwork moves out of the face while keeping original and restricted unlock rules',()=>{
 const css=fs.readFileSync(path.join(root,'css/phone-identity-art-v1.css'),'utf8');
 assert.match(css,/inset:-12%/);
 assert.match(css,/border-radius:24%;overflow:visible/);
 assert.match(css,/\.dudu-avatar-v16-preview\{/);
 assert.match(html,/phone-identity-art-v1\.css\?v=identity-6/);
});
