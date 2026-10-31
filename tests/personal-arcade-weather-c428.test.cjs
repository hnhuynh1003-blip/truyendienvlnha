'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const fishing=require('../js/personal-arcade-fishing-c425f.js');
const src=file=>readFileSync(join(__dirname,'..',file),'utf8');
const STEP=core.GARDEN_WEATHER_INTERVAL,BASE=Math.floor(1793440000000/(STEP*3))*STEP*3;
const slot=i=>BASE+i*STEP+1000;
const cast=(time,roll,premium=false)=>{
 const s=core.fresh(time);s.garden.bait=1;s.garden.moonBait=1;
 return core.act(s,premium?'cast-premium-line':'cast-line',time,roll);
};

test('C4.28 weather rotates predictably without changing saved state',()=>{
 assert.equal(STEP,20*60*1000);
 assert.equal(core.gardenWeather(slot(0)).id,'mist');
 assert.equal(core.gardenWeather(slot(1)).id,'rain');
 assert.equal(core.gardenWeather(slot(2)).id,'clear');
 assert.equal(core.gardenWeather(slot(3)).id,'mist');
 assert.equal(core.gardenWeather(BASE+STEP-1).until,BASE+STEP);
 const s=core.fresh(slot(0));s.garden.fish=8;s.garden.rod=3;s.garden.moonBait=4;
 const restored=core.norm(JSON.parse(JSON.stringify(s)),slot(2));
 assert.equal(restored.garden.fish,8);
 assert.equal(restored.garden.rod,3);
 assert.equal(restored.garden.moonBait,4);
 assert.equal(Object.hasOwn(restored.garden,'weather'),false);
 assert.equal(Object.keys(restored.garden.fishAlbum).length,14);
 for(const id of ['fogveil','rainpetal','nightlamp']){
  assert.equal(restored.garden.fishAlbum[id],0);
  assert.equal(restored.garden.fishBest[id],0);
 }
});

test('Rain and mist fish appear only in their conditions with existing rarity odds',()=>{
 const rareRoll=.94+.6*.06,commonRoll=.94*.9;
 const mist=cast(slot(0),rareRoll),rain=cast(slot(1),rareRoll);
 assert.equal(mist.state.garden.line.fishId,'fogveil');
 assert.equal(rain.state.garden.line.fishId,'lantern');
 assert.equal(core.FISH_SPECIES[mist.state.garden.line.fishId].rare,true);
 const rainFish=cast(slot(1),commonRoll),clear=cast(slot(2),commonRoll);
 assert.equal(rainFish.state.garden.line.fishId,'rainpetal');
 assert.equal(clear.state.garden.line.fishId,'blue');
 assert.equal(core.FISH_SPECIES.rainpetal.rare,false);
});

test('Night-only fish depends on local evening, not buying a special lure',()=>{
 const evening=new Date(2026,9,31,21,0).getTime();
 const day=new Date(2026,9,31,13,0).getTime();
 const rareRoll=.94+.47*.06;
 assert.equal(core.gardenWeather(evening).night,true);
 assert.equal(core.gardenWeather(day).night,false);
 assert.equal(cast(evening,rareRoll).state.garden.line.fishId,'nightlamp');
 assert.equal(cast(day,rareRoll).state.garden.line.fishId,'moonfish');
});

test('Premium bait increases rarity as before; weather fish still need skill and pay old Arcade rewards',()=>{
 const time=slot(0),premiumRareRoll=.76+.6*.24;
 const premium=cast(time,premiumRareRoll,true);
 assert.equal(premium.ok,true);
 assert.equal(premium.state.garden.line.fishId,'fogveil');
 assert.equal(premium.state.garden.moonBait,0);
 assert.equal(premium.state.garden.bait,1);
 const line=premium.state.garden.line;
 assert.equal(fishing.rules(line,core.FISH_SPECIES.fogveil).required,3);
 assert.equal(premium.state.garden.fishAlbum.fogveil,0,'casting cannot reveal a fish');
 const caught=core.act(premium.state,'reel-line',line.biteAt+100,.2);
 assert.equal(caught.ok,true);
 assert.equal(caught.state.garden.rareFish,1);
 assert.equal(caught.state.garden.fishAlbum.fogveil,1);
 assert.equal(caught.state.coins,100,'same 10 Arcade Xu rare payout');
 const restored=core.norm(JSON.parse(JSON.stringify(caught.state)),line.biteAt+101);
 assert.equal(restored.garden.fishAlbum.fogveil,1);
 assert.equal(restored.garden.fishBest.fogveil,line.size);
 assert.equal(core.act(restored,'reel-line',line.biteAt+102,.2).ok,false);
});

test('Weather visuals and collectible artwork are linked to the mobile garden, not extra buttons',()=>{
 const html=src('index.html'),ui=src('js/personal-arcade-ui-v1.js'),css=src('css/arcade-c428-weather.css');
 assert.match(html,/arcade-c428-weather\.css\?v=c428-1/);
 assert.match(html,/tackle=c427-1&amp;weather=c428-1/);
 assert.match(ui,/garden-weather-\$\{weather\.id\}/);
 assert.match(ui,/weatherShifted\)render\(\)/);
 assert.match(ui,/data-arcade-until="\$\{weather\.until\}"/);
 assert.match(css,/c428-rainfall/);
 assert.match(css,/garden-weather-mist/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const id of ['fogveil','rainpetal','nightlamp']){
  const asset=`assets/arcade-c428/fish-${id}.webp`;
  const data=readFileSync(join(__dirname,'..',asset));
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.ok(statSync(join(__dirname,'..',asset)).size<160000,'mobile fish artwork is compressed');
  assert.match(css,new RegExp(`\\.garden-fish-portrait\\.fish-${id}`));
 }
});
