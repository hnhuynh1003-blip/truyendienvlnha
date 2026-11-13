'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const source=path=>readFileSync(join(root,path),'utf8');

test('C4.43A selling all ore is a bag action, not another primary control',()=>{
 const ui=source('js/personal-arcade-ui-v1.js');
 const sell=ui.match(/<div class="arcade-mine-sell"[^>]*>[^\n]*sell-ores[^\n]*/g)||[];
 assert.equal(sell.length,1,'One sale control stays in the ore bag');
 assert.match(sell[0],/data-arcade-panel="mine-bag"/);
 assert.match(sell[0],/Bán tất cả/);
 const quick=ui.indexOf('drawerButton(\'Túi quặng\'');
 const sale=ui.indexOf('class="arcade-mine-sell"');
 assert.ok(quick<sale,'Sell button appears inside the bag section after opening the drawer');
});

test('C4.44 upgrades the same AI garden painting across five real pond tiers',()=>{
 const css=source('css/arcade-c443-pond-ai.css');
 const html=source('index.html');
 const ui=source('js/personal-arcade-ui-v1.js');
 assert.match(html,/arcade-c443-pond-ai\.css\?v=c444-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c445-1/);
 assert.doesNotMatch(css,/moon-garden-wide\.webp/);
 assert.doesNotMatch(css,/pond-ornaments\.webp/);
 assert.match(css,/garden-pond\{[\s\S]*?left:3%;right:3%;/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/\.garden-water-surface/);
 assert.doesNotMatch(ui,/garden-pond-lotus-bridge|garden-pond-moon-gate|garden-pond-falls/);
 assert.doesNotMatch(ui,/garden-water-ripples|garden-shore-mist|garden-moon-reflection/,
  'Tier changes use the background painting, not scenery overlay elements');
 const sizes=[];
 for(let tier=1;tier<=5;tier++){
  const path=`assets/arcade-c444-pond/pond-level-${tier}.webp`;
  assert.match(css,new RegExp(`pond-level-${tier}\\.webp`));
  const file=readFileSync(join(root,path));
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(file.toString('ascii',8,12),'WEBP');
  const size=statSync(join(root,path)).size;sizes.push(size);
  assert.ok(size>100000&&size<350000,'Keep each AI landscape crisp but light on phones');
 }
 assert.equal(new Set(sizes).size,5,'Each pond tier has its own painted scene');
});
