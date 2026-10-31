'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const source=path=>readFileSync(join(root,path),'utf8');

test('C4.25B ships four distinct actual WebP paintings and sprite atlases',()=>{
 const images=['moon-garden.webp','fish-bestiary.webp','jade-market.webp','jade-collection.webp'];
 let bytes=0;
 for(const name of images){
  const path=join(root,'assets/arcade-c425b',name),body=readFileSync(path);
  assert.equal(body.toString('ascii',8,12),'WEBP',name);
  assert.ok(body.length>30000,`${name} should contain real illustrations`);
  bytes+=statSync(path).size;
 }
 assert.ok(bytes<1350000,'Android download budget for second-wave artwork');
 const css=source('css/arcade-c425b-worlds.css');
 for(const image of images)assert.ok(css.includes(image),`missing ${image} artwork`);
 for(const fish of ['reed','carp','silver','koi','blue','moonfish','crystal','dragon'])
  assert.ok(css.includes(`.fish-${fish}`),`${fish} has its own atlas location`);
 for(let index=0;index<5;index++)assert.ok(css.includes(`.jade-shell-${index}`));
 assert.match(css,/garden-harvest-spark/);
 assert.match(css,/jade-cut-reveal/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('C4.25B artwork remains tied to existing mechanics and is published in correct order',()=>{
 const html=source('index.html'),garden=source('js/personal-arcade-ui-v1.js');
 const jade=source('js/personal-jade-ui-v1.js');
 assert.ok(html.indexOf('arcade-c425b-worlds.css')>html.indexOf('arcade-c425a-worlds.css'));
 assert.match(html,/personal-jade-ui-v1\.js\?v=c420-1&amp;art=c425b-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c424-1&amp;art=c425a-2&amp;worlds=c425b-1/);
 for(const action of ["'plant-'+index","'water-'+index","'harvest-'+index",
  'cast-line','reel-line','catch-bubble','water-all','harvest-all','buy-seeds'])
  assert.ok(garden.includes(action),`${action} must remain playable`);
 assert.match(garden,/garden-pond-tier-\$\{g\.pondTier\}/);
 assert.match(garden,/garden-harvests-\$\{Math\.min/);
 assert.match(garden,/garden-fish-portrait fish-\$\{fishHit\.fishId/);
 for(const action of ['jade-pick-${i}-${slot}','jade-inspect-','jade-buy-pack-',
  'jade-cut','jade-window','jade-vault-store','jade-vault-sell-','jade-craft-',
  'jade-upgrade-','jade-market-switch']){
  const available=action==='jade-market-switch'?jade.includes('data-jade-market-switch'):jade.includes(action);
  assert.ok(available,`${action} should still be accessible`);
 }
 assert.match(jade,/i!==active\)return ''/);
 assert.match(jade,/jade-market-stop-list/);
 assert.match(jade,/jade-collectible-art/);
 assert.match(jade,/jade-cut-flash/);
 assert.doesNotMatch(garden+jade,/localStorage\.clear\(/);
});

test('C4.25B crop growth, fishing and saved balances continue using original core',()=>{
 const core=require('../js/personal-arcade-core-v1.js');
 const at=1793440000000;
 let s=core.fresh(at);
 const startCoins=s.coins,startSeeds=s.garden.seeds;
 for(const action of ['plant-0','water-0']){
  const r=core.act(s,action,at,.15);assert.equal(r.ok,true,action);s=r.state;
 }
 assert.equal(s.garden.seeds,startSeeds-1);
 assert.equal(s.garden.beds[0].status,'growing');
 const readyAt=s.garden.beds[0].readyAt;
 const harvest=core.act(s,'harvest-0',readyAt,.15);
 assert.equal(harvest.ok,true);s=harvest.state;
 assert.equal(s.garden.harvests,1);
 assert.equal(s.garden.beds[0].status,'empty');
 assert.equal(s.garden.seeds,startSeeds);
 assert.equal(s.coins,startCoins+core.CROPS.bloom.value);
 s.garden.bubbleReady=true;
 const bubble=core.act(s,'catch-bubble',readyAt+1000,.15);
 assert.equal(bubble.ok,true);s=bubble.state;
 const cast=core.act(s,'cast-line',readyAt+2000,.15);
 assert.equal(cast.ok,true);s=cast.state;
 const fishId=s.garden.line.fishId,biteAt=s.garden.line.biteAt;
 const reel=core.act(s,'reel-line',biteAt+100,.15);
 assert.equal(reel.ok,true);s=reel.state;
 assert.equal(s.garden.fish,1);
 assert.equal(s.garden.fishAlbum[fishId],1);
 const restored=core.norm(JSON.parse(JSON.stringify(s)),biteAt+100);
 assert.deepEqual(restored.garden.fishAlbum,s.garden.fishAlbum);
 assert.deepEqual(restored.garden.beds,s.garden.beds);
 assert.equal(restored.coins,s.coins);
});
