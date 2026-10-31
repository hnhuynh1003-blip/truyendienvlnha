'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const core=require('../js/personal-arcade-core-v1.js');
const root=join(__dirname,'..');
const source=path=>readFileSync(join(root,path),'utf8');
const TIME=1793440000000;

test('C4.25C has illustrated, transparent WebP growth and cut-state atlases',()=>{
 const names=['garden-growth-atlas.webp','jade-reveal-atlas.webp'];
 let total=0;
 for(const name of names){
  const bytes=readFileSync(join(root,'assets/arcade-c425b',name));
  assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
  assert.ok(bytes.length>100000,`${name} must be painted artwork`);
  total+=bytes.length;
 }
 assert.ok(total<700000,'Both new materials must remain mobile-sized');
 const css=source('css/arcade-c425c-materiality.css');
 const html=source('index.html');
 for(const name of names)assert.ok(css.includes(name));
 assert.match(css,/garden-plot\.mature/);
 assert.match(css,/garden-crop-sprite/);
 assert.match(css,/jade-item-art\.jade-item-window/);
 assert.match(css,/jade-item-art\.jade-item-split\.is-waste/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.ok(html.indexOf('arcade-c425c-materiality.css')>html.indexOf('arcade-c425b-worlds.css'));
 assert.match(html,/materials=c425c-1/);
});

test('Existing jade actions display genuinely different rock artwork for raw, window, and cut',()=>{
 const ctx={window:{DuduPersonalArcadeCoreV1:core}};
 vm.runInNewContext(source('js/personal-jade-ui-v1.js'),ctx);
 const panel=ctx.window.DuduPersonalJadeUIV1.panel;
 let s=core.fresh(TIME);
 s.coins=5000;
 const buy=core.act(s,'jade-buy-0',TIME,.42);
 assert.equal(buy.ok,true);
 s=buy.state;
 assert.equal(s.jade.active.phase,'raw');
 assert.match(panel(s),/jade-item-rough/);
 assert.doesNotMatch(panel(s),/jade-item-window/);
 const opened=core.act(s,'jade-window',TIME,.42);
 assert.equal(opened.ok,true);
 s=opened.state;
 assert.equal(s.jade.active.phase,'window');
 assert.match(panel(s),/jade-item-window/);
 assert.match(panel(s),/ĐÃ KHAI SONG/);
 assert.doesNotMatch(panel(s),/jade-item-rough/);
 const cut=core.act(s,'jade-cut',TIME,.42);
 assert.equal(cut.ok,true);
 s=cut.state;
 assert.equal(s.jade.active.phase,'cut');
 assert.match(panel(s),/jade-item-split/);
 assert.doesNotMatch(panel(s),/jade-item-window/);
 const restored=core.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(restored.jade.active.phase,'cut');
 assert.equal(restored.coins,s.coins);
});

test('Garden stages are tied to original beds and remain non-transactional artwork',()=>{
 const ui=source('js/personal-arcade-ui-v1.js');
 assert.match(ui,/garden-crop-sprite/);
 assert.match(ui,/growth-stage-\$\{growthStage\}/);
 assert.match(ui,/b\.status==='empty'\?'plant-'/);
 assert.match(ui,/b\.status==='dry'\?'water-'/);
 assert.match(ui,/\:'harvest-'\+index/);
 assert.match(ui,/activeFeedback\('jade-window',time\)/);
 assert.match(ui,/action==='jade-cut'\|\|action==='jade-window'/);
 assert.doesNotMatch(ui,/localStorage\.clear\(/);
});
