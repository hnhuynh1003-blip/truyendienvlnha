'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const src=name=>readFileSync(join(__dirname,'..',name),'utf8');
const TIME=1793440000000;

test('C4.47 all 14 fish unlock at exactly one of five pond tiers',()=>{
 const all=Object.keys(core.FISH_SPECIES);
 assert.deepEqual(Object.keys(core.FISH_POND_LEVEL).sort(),all.sort());
 const levels=[
  ['reed','carp','silver'],
  ['koi','blue','moonfish','rainpetal'],
  ['glassfin','lantern','fogveil'],
  ['crystal','nightlamp'],
  ['dragon','phoenix']
 ];
 for(let tier=1;tier<=5;tier++){
  assert.deepEqual(core.pondUnlocks(tier).sort(),levels[tier-1].sort());
  for(const id of all)assert.equal(core.pondCanHost(id,tier),core.FISH_POND_LEVEL[id]<=tier);
 }
 assert.equal(levels.flat().length,14);
});

test('C4.47 no weather, premium bait or unlucky rare roll bypasses a pond gate',()=>{
 const weatherTimes=[TIME,TIME+20*60000,TIME+40*60000,new Date(2026,9,31,21).getTime()];
 const thresholds=[.94,.76,.75,.57];
 for(let tier=1;tier<=5;tier++)for(const at of weatherTimes)for(const threshold of thresholds){
  for(let i=0;i<1000;i++){
   const fishId=core.choosePondFish(i/1000,threshold,at,tier);
   assert.ok(core.pondCanHost(fishId,tier),`Tier ${tier} caught locked ${fishId}`);
   if(tier<5)assert.ok(!['dragon','phoenix'].includes(fishId));
  }
 }
 assert.notEqual(core.choosePondFish(.96,.9,0,2),'fogveil');
 assert.equal(core.choosePondFish(.96,.9,0,3),'fogveil');
 const night=new Date(2026,9,31,21).getTime();
 assert.notEqual(core.choosePondFish(.947,.9,night,3),'nightlamp');
 assert.equal(core.choosePondFish(.947,.9,night,4),'nightlamp');
 const weatherCycle=core.GARDEN_WEATHER_INTERVAL;
 const rain=Math.floor(TIME/(weatherCycle*3))*weatherCycle*3+weatherCycle+1000;
 assert.notEqual(core.choosePondFish(.81,.9,rain,1),'rainpetal');
 assert.equal(core.choosePondFish(.81,.9,rain,2),'rainpetal');
});

test('C4.47 legendary fish stay rare even after fully upgrading the pond',()=>{
 let mythic=0,rare=0;
 for(let i=0;i<10000;i++){
  const roll=(i+.5)/10000;
  if(roll<.86)continue;
  rare++;
  if(['dragon','phoenix'].includes(core.choosePondFish(roll,.86,TIME,5)))mythic++;
 }
 assert.equal(rare,1400);
 assert.ok(mythic>=20&&mythic<=35,`Only ~2% of rare bites should be legendary, got ${mythic}/${rare}`);
 // Special bait cannot force a legendary fish at level 1, even on an ideal roll.
 const starter=core.fresh(TIME);starter.garden.moonBait=1;
 const cast=core.act(starter,'cast-premium-line',TIME,.99999);
 assert.equal(cast.ok,true);
 assert.equal(core.FISH_POND_LEVEL[cast.state.garden.line.fishId],1);
});

test('C4.47 upgrades cost Arcade Xu, improve bubbles, and preserve historical fish data',()=>{
 let state=core.fresh(TIME);state.coins=35000;
 state.garden.fish=17;state.garden.rareFish=2;
 state.garden.fishAlbum.dragon=1;state.garden.fishBest.dragon=88;
 state.garden.pondDisplay=['dragon'];
 let saved=core.norm(copy(state),TIME);
 assert.equal(saved.garden.pondTier,1);
 assert.equal(saved.garden.fishAlbum.dragon,1);
 const baseline=core.bubbleInterval(saved.garden);
 let spent=0;
 for(let tier=2;tier<=5;tier++){
  const cost=core.upgradeCost(saved,'pond-tier');
  const result=core.act(saved,'pond-tier',TIME,.5);
  assert.equal(result.ok,true);
  saved=result.state;
  spent+=cost;
  assert.equal(saved.garden.pondTier,tier);
  assert.equal(core.bubbleInterval(saved.garden),baseline-(tier-1)*10000);
  assert.equal(saved.coins,35000-spent);
  assert.equal(saved.garden.fishBest.dragon,88);
  assert.equal(saved.garden.fishAlbum.dragon,1);
  assert.deepEqual(saved.garden.pondDisplay,['dragon']);
 }
 assert.equal(core.act(saved,'pond-tier',TIME,.5).ok,false);
 assert.deepEqual(core.norm(copy(saved),TIME),saved);
});

test('C4.47 journal reveals unlock clues and upgrade benefits without touching AI scenery',()=>{
 const ui=src('js/personal-arcade-ui-v1.js');
 const css=src('css/arcade-c447-pond-progression.css');
 const html=src('index.html');
 assert.match(ui,/core\.pondUnlocks\(nextPondTier\)/);
 assert.match(ui,/core\.pondCanHost\(id,g\.pondTier\)/);
 assert.match(ui,/garden-pond-path/);
 assert.match(ui,/Mở ở hồ cấp/);
 assert.match(ui,/bọt hồi nhanh hơn|Bọt sương hồi nhanh hơn/);
 assert.match(ui,/g\.pondDisplay\.filter\(id=>g\.fishAlbum\[id\]>0&&canSwim\(id\)\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/background-image:|position:absolute/,'No added decorations over lake');
 assert.match(html,/arcade-c447-pond-progression\.css\?v=c447-1/);
 for(let tier=1;tier<=5;tier++){
  const file=join(__dirname,'..',`assets/arcade-c444-pond/pond-level-${tier}.webp`);
  assert.ok(statSync(file).size>10000,`Level ${tier} retains its AI painting`);
 }
});
