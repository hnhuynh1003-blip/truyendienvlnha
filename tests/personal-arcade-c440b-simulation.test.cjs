'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const sim=require('../tools/arcade-balance-c440b.cjs');
const NOW=1793510000000;

test('C4.40B repeatable scenarios quantify open-tab income without fabricating offline earnings',()=>{
 const baseline=sim.neonSession();
 assert.deepEqual(baseline,{sessions:1,minutesPerSession:30,stations:1,coinsXu:66,guests:40});
 assert.equal(sim.neonSession({days:7}).coinsXu,462);
 const unopened=arcade.advance(arcade.fresh(NOW),NOW+86400000,0);
 assert.equal(unopened.coins,0,'No Xu is minted for a closed browser');
 const elevated=sim.neonSession({stations:7,roomTier:3,seating:5,ambiance:3,snack:2,minutes:60});
 assert.ok(elevated.coinsXu>baseline.coinsXu*20,'Optimized passive economy is a priority');
});

test('C4.40B premium bait projection is explicitly an upper bound, not a promise of a catch',()=>{
 const starter=sim.fishCatchCeiling(1,1,true);
 const endgame=sim.fishCatchCeiling(5,5,true);
 assert.equal(starter.rarePct,0,'Tier-1 lake does not host rare fish even with premium bait');
 assert.equal(endgame.rarePct,43);
 assert.ok(endgame.netPerSuccessfulCastXu>starter.netPerSuccessfulCastXu);
 const sample=arcade.fresh(NOW);sample.coins=60;
 const purchased=arcade.act(sample,'buy-moon-bait',NOW);
 assert.equal(purchased.state.coins,0);
 assert.equal(purchased.state.garden.moonBait,2);
});

test('C4.40B all Jade markets retain jackpots but new stones no longer compound payouts so quickly',()=>{
 const rows=jade.MARKETS.map((_,site)=>sim.jadeMarket(site));
 assert.equal(rows.length,5);
 assert.equal(rows[0].legacyV2.netPerStoneXu,rows[0].newV3.netPerStoneXu,
  'Starter rescue and learning loop must not become more punishing');
 for(let site=1;site<5;site++){
  const old=rows[site].legacyV2,newer=rows[site].newV3;
  assert.ok(newer.netPerStoneXu<old.netPerStoneXu,'Profit decreases at '+site);
  assert.ok(newer.netPerStoneXu>-4&&newer.netPerStoneXu<9,
   'Blind bulk cutting is near breakeven, not a Xu faucet, at market '+site);
  assert.ok(newer.profitablePct<50,'Most new high-tier purchases do not guarantee profit');
 }
 assert.ok(rows[4].newV3.maxPayoutXu>rows[4].priceXu*10,
  'Very rare high-tier jackpots should still feel exceptional');
 assert.ok(rows[4].newV3.netPerStoneXu<rows[4].legacyV2.netPerStoneXu*.3,
  'Extreme late-game profitability should decrease substantially');
});

test('C4.40B newly purchased rocks are V3; V1/V2 stones survive normalization without repricing',()=>{
 let state=arcade.fresh(NOW);state.coins=10000;state.jade.sold=12;state.jade.saw=2;
 const fresh=arcade.act(state,'jade-buy-2',NOW,.34);
 assert.equal(fresh.ok,true);
 assert.equal(fresh.state.jade.active.payoutV,3);
 assert.equal(arcade.norm(fresh.state,NOW).jade.active.payoutV,3);

 const specimen=jade.generate(3,17,.234);
 specimen.payoutV=2;
 const oldValue=jade.baseValue(specimen);
 state=arcade.fresh(NOW);state.jade.active=specimen;
 const old=arcade.norm(JSON.parse(JSON.stringify(state)),NOW);
 assert.equal(old.jade.active.payoutV,2);
 assert.equal(jade.baseValue(old.jade.active),oldValue);
 const legacy=JSON.parse(JSON.stringify(state));delete legacy.jade.active.payoutV;
 const v1=arcade.norm(legacy,NOW);
 assert.equal(v1.jade.active.payoutV,1);
 assert.equal(jade.baseValue(v1.jade.active),jade.baseValue({...specimen,payoutV:1}));

 const cut=arcade.fresh(NOW);cut.jade.active={...specimen,phase:'cut',cutValue:12345};
 const saved=arcade.norm(JSON.parse(JSON.stringify(cut)),NOW);
 assert.equal(saved.jade.active.cutValue,12345,'Previously cut stones keep their sale value');
});

test('C4.40B mining yield ceiling remains measured and no inventory is changed by the simulator',()=>{
 const deep=sim.mineSample(2);
 const shallow=sim.mineSample(0);
 assert.equal(deep.digs,1000);
 assert.ok(deep.grossXu>shallow.grossXu*5);
 assert.ok(deep.relicsFound>shallow.relicsFound);
 const untouched=arcade.fresh(NOW);
 sim.report();
 assert.deepEqual(arcade.fresh(NOW),untouched,'Simulation cannot mutate a player save');
});
