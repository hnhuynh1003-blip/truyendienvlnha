'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const fishing=require('../js/personal-arcade-fishing-c425f.js');
const source=file=>readFileSync(join(__dirname,'..',file),'utf8');
const T=1793440000000;
const act=(s,name,roll=.2,at=T)=>core.act(s,name,at,roll);

test('C4.27 extends the album without resetting old progress or the existing rod',()=>{
 assert.equal(Object.keys(core.FISH_SPECIES).length,14);
 const old=core.fresh(T);old.coins=913;old.garden.rod=4;
 old.garden.fish=15;old.garden.bait=7;old.garden.fishAlbum.reed=3;
 delete old.garden.moonBait;delete old.garden.fishAlbum.glassfin;
 delete old.garden.fishAlbum.lantern;delete old.garden.fishAlbum.phoenix;
 delete old.garden.fishBest.glassfin;
 const restored=core.norm(JSON.parse(JSON.stringify(old)),T);
 assert.equal(restored.garden.moonBait,0);
 assert.equal(restored.garden.rod,4);
 assert.equal(restored.garden.fish,15);
 assert.equal(restored.garden.fishAlbum.reed,3);
 assert.equal(restored.garden.fishAlbum.glassfin,0);
 assert.equal(restored.garden.fishBest.glassfin,0);
 assert.equal(restored.coins,913);
});

test('Tackle shop sells finite Arcade bait packs, never grants earned Xu',()=>{
 const s=core.fresh(T);s.coins=129;s.earned=101;
 const normal=act(s,'buy-bait-pack');
 assert.equal(normal.ok,true);
 assert.equal(normal.state.coins,59);
 assert.equal(normal.state.earned,101);
 assert.equal(normal.state.garden.bait,5);
 assert.equal(act(normal.state,'buy-moon-bait').ok,false,'cannot afford 6 Xu');
 const more=core.fresh(T);more.coins=100;
 const premium=act(more,'buy-moon-bait');
 assert.equal(premium.ok,true);
 assert.equal(premium.state.coins,40);
 assert.equal(premium.state.garden.moonBait,2);
 assert.equal(premium.state.earned,0);
 assert.equal(act(premium.state,'buy-moon-bait').ok,false,'cannot buy again for free');
 const loaded=core.norm(JSON.parse(JSON.stringify(premium.state)),T);
 assert.equal(loaded.garden.moonBait,2);
 const full=core.fresh(T);full.coins=900;full.garden.moonBait=10000;
 assert.equal(act(full,'buy-moon-bait').ok,false,'bait inventory has a cap');
});

test('Moon bait changes actual bite rarity, is consumed once, and remains a skill catch',()=>{
 const s=core.fresh(T);s.garden.bait=1;s.garden.moonBait=2;
 const common=act(s,'cast-line',.79);
 const premium=act(s,'cast-premium-line',.79);
 assert.equal(common.ok,true);assert.equal(premium.ok,true);
 assert.equal(core.FISH_SPECIES[common.state.garden.line.fishId].rare,false);
 assert.equal(core.FISH_SPECIES[premium.state.garden.line.fishId].rare,true);
 assert.equal(premium.state.garden.moonBait,1);
 assert.equal(premium.state.garden.bait,1,'premium cast must not spend regular bait');
 assert.equal(premium.state.garden.line.lure,'moon');
 assert.equal(act(premium.state,'cast-premium-line',.9).ok,false,'only one line at a time');
 const restored=core.norm(JSON.parse(JSON.stringify(premium.state)),T);
 assert.equal(restored.garden.line.lure,'moon');
 const line=restored.garden.line;
 assert.equal(fishing.rules(line,core.FISH_SPECIES[line.fishId]).required,3);
 assert.equal(restored.garden.fish,0);
 const caught=act(restored,'reel-line',.01,line.biteAt+1);
 assert.equal(caught.ok,true);
 assert.equal(caught.state.garden.fish,1);
 assert.equal(caught.state.garden.rareFish,1);
 assert.equal(caught.state.garden.fishAlbum[line.fishId],1);
 assert.equal(caught.state.coins,100,'old Arcade fish payout is unchanged');
 assert.equal(act(caught.state,'reel-line',.2,line.biteAt+2).ok,false);
});

test('All three new fish can be encountered without a premium paywall',()=>{
 const samples=[['glassfin',.91],['lantern',.976],['phoenix',.998]];
 for(const [expected,roll] of samples){
  const s=core.fresh(T);s.garden.bait=1;
  const result=act(s,'cast-line',roll);
  assert.equal(result.state.garden.line.fishId,expected);
  assert.equal(result.state.garden.line.lure,'regular');
 }
});

test('The mobile shop uses the existing rod upgrade and three optimized painted portraits',()=>{
 const html=source('index.html'),ui=source('js/personal-arcade-ui-v1.js');
 const css=source('css/arcade-c427-tackle.css');
 assert.match(html,/arcade-c427-tackle\.css\?v=c427-2/);
 assert.match(html,/personal-arcade-core-v1\.js\?v=c423-1&amp;fishing=c425f-1&amp;tackle=c427-1/);
 assert.match(html,/progression=c425g-1&amp;tackle=c427-1/);
 for(const action of ['buy-bait-pack','buy-moon-bait','cast-premium-line','rod'])
  assert.match(ui,new RegExp(`'${action}'`));
 assert.equal((ui.match(/,'rod','upgrade'/g)||[]).length,1,'one rod upgrade, relocated to shop');
 assert.match(ui,/garden-has-premium/);
 assert.match(ui,/garden-fish-species-\$\{pondResidents\[i\]\}/);
 assert.match(css,/@media\(max-width:355px\)/);
 for(const fish of ['glassfin','lantern','phoenix']){
  const asset=`assets/arcade-c427/fish-${fish}.webp`;
  const b=readFileSync(join(__dirname,'..',asset));
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(join(__dirname,'..',asset)).size<150000);
  assert.match(css,new RegExp(`fish-${fish}\\.webp`));
  assert.match(css,new RegExp(`\\.garden-fish-portrait\\.fish-${fish}`),
   'New fish art must stay inside actual discovered fish portraits');
 }
});
