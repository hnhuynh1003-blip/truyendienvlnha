'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const arcade=require('../js/personal-arcade-core-v1.js');
const START=1761730000000;
const apply=(state,action,now=START,roll=0.5)=>arcade.act(state,action,now,roll);

test('Arcade V1 starts with separate fictional Xu, three optional games and no cloud wallet',()=>{
 const state=arcade.fresh(START);
 assert.equal(state.coins,0);
 assert.equal(state.neon.running,true);
 assert.equal(state.mine.durability,100);
 assert.equal(state.garden.water,1);
 assert.equal('ownerUid' in state,false);
 assert.equal('systemWallet' in state,false);
});
test('Neon earns only measured open-tab time, not closed-app downtime',()=>{
 const initial=arcade.fresh(START);
 const reopened=arcade.advance(initial,START+60*60*1000,0);
 assert.equal(reopened.coins,0);
 const afterMinute=arcade.advance(reopened,START+61*60*1000,60*1000);
 assert.equal(afterMinute.coins,6,'One hundredth per second = 0.6 Xu per minute');
 assert.equal(arcade.formatXu(afterMinute.coins),'0,6');
 const twice=arcade.advance(afterMinute,START+61*60*1000,60*1000);
 assert.equal(twice.coins,6,'Same timestamp never pays twice');
 const afterHour=arcade.advance(initial,START+60*60*1000,60*60*1000);
 assert.equal(afterHour.coins,360,'Base idle yield is 36 Xu per active hour');
});
test('Neon can pause, upgrade using only game money and increase its rate',()=>{
 let state=arcade.fresh(START);state.coins=400;
 const upgrade=apply(state,'cpu');assert.equal(upgrade.ok,true);
 assert.equal(upgrade.state.coins,0);assert.equal(arcade.rate(upgrade.state),13);
 const next=arcade.advance(upgrade.state,START+10000,10000);
 assert.equal(next.coins,1);
 const pause=apply(next,'toggle-neon',START+10000);
 assert.equal(pause.state.neon.running,false);
 const idle=arcade.advance(pause.state,START+20000,10000);
 assert.equal(idle.coins,1);
 assert.equal(apply(idle,'cpu',START+20000).ok,false);
});
test('Neon Tycoon unlocks real stations, triples output and preserves old local saves',()=>{
 let state=arcade.fresh(START);state.coins=6000;
 assert.equal(state.neon.stations,1);
 const second=apply(state,'station');
 assert.equal(second.ok,true);assert.equal(second.state.neon.stations,2);
 assert.equal(arcade.rate(second.state),20);
 assert.equal(second.state.coins,5200);
 const third=apply(second.state,'station');
 assert.equal(third.ok,true);assert.equal(third.state.neon.stations,3);
 assert.equal(arcade.rate(third.state),30);
 assert.equal(apply(third.state,'station').ok,false);
 const old=arcade.fresh(START);delete old.neon.stations;
 assert.equal(arcade.norm(old,START).neon.stations,1,'Existing saves start with one working station');
});
test('Economy migration preserves prior Xu and converts partial idle income safely',()=>{
 const old=arcade.fresh(START);old.coins=1029;old.earned=1200;
 old.neon.remainder=500;delete old.neon.economyV;
 const migrated=arcade.norm(old,START);
 assert.equal(migrated.coins,1029);
 assert.equal(migrated.earned,1200);
 assert.equal(migrated.neon.remainder,50000);
 assert.equal(migrated.neon.economyV,2);
 assert.equal(arcade.norm(migrated,START).neon.remainder,50000,'No double migration');
});
test('Mining consumes one durability per click; ore sale credits only local game Xu',()=>{
 let state=arcade.fresh(START);
 const expected={stone:0.2,coal:0.6,iron:0.8,crystal:0.98};
 for(const [ore,roll] of Object.entries(expected)){
  const result=apply(state,'mine',START,roll);
  assert.equal(result.ok,true);assert.equal(result.label,ore);
  state=result.state;
 }
 assert.equal(state.mine.durability,96);
 assert.equal(state.coins,0);
 const sold=apply(state,'sell-ores');assert.equal(sold.ok,true);
 assert.equal(sold.state.coins,31);
 for(const count of Object.values(sold.state.mine.ores))assert.equal(count,0);
 assert.equal(apply(sold.state,'sell-ores').ok,false);
});
test('Pick self-repairs in four minutes or immediately from coal and iron',()=>{
 let state=arcade.fresh(START);state.mine.durability=0;
 assert.equal(apply(state,'mine').ok,false);
 const started=apply(state,'repair-wait');assert.equal(started.ok,true);
 assert.equal(apply(started.state,'mine',START+1000).ok,false);
 const premature=arcade.advance(started.state,START+arcade.REPAIR_INTERVAL-1,0);
 assert.equal(premature.mine.durability,0);
 const repaired=arcade.advance(premature,START+arcade.REPAIR_INTERVAL,0);
 assert.equal(repaired.mine.durability,100);
 assert.equal(repaired.mine.repairUntil,0);
 state=arcade.fresh(START);state.mine.durability=17;state.mine.ores.coal=5;state.mine.ores.iron=2;
 const forged=apply(state,'repair-forge');assert.equal(forged.ok,true);
 assert.equal(forged.state.mine.durability,100);
 assert.equal(forged.state.mine.ores.coal,0);
 assert.equal(forged.state.mine.ores.iron,0);
});
test('Mining tools can be bought with game earnings without waiting for reader missions',()=>{
 let state=arcade.fresh(START);state.coins=1000;state.mine.durability=40;
 const oil=apply(state,'buy-oil');assert.equal(oil.ok,true);
 assert.equal(oil.state.mine.durability,65);
 assert.equal(oil.state.coins,850);
 const pick=apply(oil.state,'buy-pick');assert.equal(pick.ok,true);
 assert.equal(pick.state.mine.durability,100);
 assert.equal(pick.state.coins,50);
 assert.equal(apply(pick.state,'buy-pick').ok,false);
});
test('Garden refills dew offline, grows only watered plants and fish offers bubbles',()=>{
 let state=arcade.fresh(START);
 assert.equal(apply(state,'harvest-0').ok,false);
 state=apply(state,'plant-0').state;
 assert.equal(state.garden.beds[0].status,'dry');
 state=apply(state,'water-0').state;
 assert.equal(state.garden.water,0);
 assert.equal(apply(state,'harvest-0',START+1000).ok,false);
 state=arcade.advance(state,START+arcade.GROW_INTERVAL,0);
 const harvested=apply(state,'harvest-0',START+arcade.GROW_INTERVAL);
 assert.equal(harvested.ok,true);assert.equal(harvested.state.coins,50);
 assert.equal(harvested.state.garden.seeds,3);
 state=arcade.advance(harvested.state,START+arcade.WATER_INTERVAL,0);
 assert.equal(state.garden.water,1);
 assert.equal(state.garden.bubbleReady,true);
 const bubble=apply(state,'catch-bubble',START+arcade.WATER_INTERVAL);
 assert.equal(bubble.ok,true);assert.equal(bubble.state.garden.bait,1);
 assert.equal(bubble.state.coins,55);
 assert.equal(apply(bubble.state,'catch-bubble',START+arcade.WATER_INTERVAL).ok,false);
});
test('Invalid/corrupt saved state cannot introduce non-finite counters or unlimited upgrades',()=>{
 const bad={...arcade.fresh(START),coins:Infinity,earned:-1,
  neon:{cpu:999,gpu:0,stations:999,running:true,remainder:999999},
  mine:{durability:-100,repairUntil:Infinity,ores:{stone:NaN}},
  garden:{water:1e6,waterAt:-12,seeds:-1,beds:[{status:'evil'}]}};
 const state=arcade.norm(bad,START);
 assert.equal(state.coins,0);assert.equal(state.earned,0);
 assert.equal(state.neon.cpu,1);assert.equal(state.neon.gpu,1);
 assert.equal(state.neon.stations,1);
 assert.equal(state.mine.durability,100);assert.equal(state.garden.water,1);
 assert.equal(apply(state,'unknown').ok,false);
});
