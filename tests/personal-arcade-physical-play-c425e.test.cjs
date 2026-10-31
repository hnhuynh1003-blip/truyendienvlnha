'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const root=join(__dirname,'..');
const source=file=>readFileSync(join(root,file),'utf8');
const TIME=1793440000000;

test('C4.25E adds a WebP twelve-frame mining face for the three existing strata',()=>{
 const asset=readFileSync(join(root,'assets/arcade-c425e/mine-break-atlas.webp'));
 assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert.ok(asset.length>100000,'Painted broken rock must be a real illustrated asset');
 assert.ok(asset.length<650000,'Keep the responsive rock atlas economical');
 const css=source('css/arcade-c425e-interaction.css');
 const html=source('index.html');
 assert.match(css,/mine-break-atlas\.webp/);
 for(const phase of [1,2,3])assert.match(css,new RegExp(`mine-dig-phase-${phase}`));
 for(const zone of [1,2])assert.match(css,new RegExp(`mine-zone-scene-${zone}`));
 assert.match(css,/mine-damage-sprite/);
 assert.match(css,/400% 300%/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/arcade-c425e-interaction\.css\?v=c425e-1/);
 assert.match(html,/interaction=c425e-1/);
});

test('Digging changes a painted face phase and leaves the persisted mine core untouched',()=>{
 const ui=source('js/personal-arcade-ui-v1.js');
 assert.match(ui,/mine-dig-phase-\$\{m\.dug%4\}/);
 assert.match(ui,/mine-damage-sprite/);
 let s=core.fresh(TIME);
 const durability=s.mine.durability;
 for(let i=0;i<4;i++){
  const result=core.act(s,'mine',TIME+i+1,.25);
  assert.equal(result.ok,true);
  s=result.state;
  assert.equal(s.mine.dug%4,(i+1)%4);
 }
 assert.equal(s.mine.durability,durability-4);
 const saved=core.norm(JSON.parse(JSON.stringify(s)),TIME+8);
 assert.equal(saved.mine.dug,s.mine.dug);
 assert.equal(saved.mine.durability,s.mine.durability);
});

test('Garden collects bait only on the pond, then casts and records a real fish',()=>{
 const ui=source('js/personal-arcade-ui-v1.js');
 assert.equal((ui.match(/data-arcade-action="catch-bubble"/g)||[]).length,1,
  'No second duplicate bait button under the fishing area');
 assert.match(ui,/garden-bubble-harvest/);
 assert.match(ui,/activeFeedback\('garden-bubble',time\)/);
 assert.match(ui,/action==='catch-bubble'\?\{type:'garden-bubble'/);
 let s=core.advance(core.fresh(TIME),TIME+core.WATER_INTERVAL,0);
 assert.equal(s.garden.bubbleReady,true);
 const claimed=core.act(s,'catch-bubble',TIME+core.WATER_INTERVAL,.3);
 assert.equal(claimed.ok,true);
 s=claimed.state;
 assert.equal(s.garden.bubbleReady,false);
 assert.equal(s.garden.bait,1);
 assert.equal(core.act(s,'catch-bubble',TIME+core.WATER_INTERVAL,.3).ok,false);
 const cast=core.act(s,'cast-line',TIME+core.WATER_INTERVAL+1,.3);
 assert.equal(cast.ok,true);
 assert.equal(cast.state.garden.bait,0);
 const caught=core.act(cast.state,'reel-line',cast.state.garden.line.biteAt+1,.3);
 assert.equal(caught.ok,true);
 assert.equal(caught.state.garden.fish,1);
 const after=core.norm(JSON.parse(JSON.stringify(caught.state)),TIME+core.WATER_INTERVAL+10000);
 assert.equal(after.garden.fish,1);
});
