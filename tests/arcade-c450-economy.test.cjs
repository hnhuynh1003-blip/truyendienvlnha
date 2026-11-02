'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const sim=require('../tools/arcade-balance-c440b.cjs');
const NOW=1793510000000;
const take=(state,action,roll=.51)=>arcade.act(state,action,NOW,roll);
const reload=state=>arcade.norm(JSON.parse(JSON.stringify(state)),NOW);

function expert(){
 const state=arcade.fresh(NOW);state.neon.running=false;state.coins=100000;
 Object.assign(state.jade,{sold:40,lamp:3,saw:2,carver:2,permit:true});
 return state;
}

test('C4.50 only future stone purchases pay tier fees; lamp upgrades give a visible discount',()=>{
 const j=expert().jade;
 assert.equal(jade.purchasePrice(j,0),50,'Starter rescue and first purchase stay unchanged');
 assert.equal(jade.stallFee(j,4),720);
 assert.equal(jade.purchasePrice(j,4),4720);
 j.lamp=4;
 assert.equal(jade.purchasePrice(j,4),4680,'Max lamp saves 4 Xu per Tàn Tích stone');
 assert.equal(jade.MARKETS[4].price,4000,'Historical raw stone valuation remains stable');
 const old=jade.generate(4,8,.77);old.payoutV=2;
 const oldValue=jade.cutValue(old,1);
 const oldBase=jade.baseValue(old);
 j.lamp=1;
 assert.equal(jade.cutValue(old,1),oldValue);
 assert.equal(jade.baseValue(old),oldBase);
});

test('C4.50 buy-one, multi-buy and selected-sample actions all charge the same quoted prices',()=>{
 let s=expert();const perStone=jade.purchasePrice(s.jade,4);
 const before=s.coins;
 s=take(s,'jade-buy-4').state;
 assert.equal(s.coins,before-perStone);
 assert.equal(s.jade.active.payoutV,3);
 s=take(s,'jade-store').state;
 const afterFirst=s.coins;
 s=take(s,'jade-buy-pack-4-3').state;
 assert.equal(s.coins,afterFirst-3*perStone);
 assert.equal(s.jade.stash.length,4);
 const offer=jade.marketOffer(s.jade,4,1);
 const beforePick=s.coins;
 s=take(s,'jade-pick-4-1').state;
 assert.equal(s.coins,beforePick-offer.ask);
 assert.deepEqual(s.jade.stash.at(-1),offer.stone);
 assert.equal(reload(s).coins,s.coins);
 assert.equal(reload(s).jade.stash.length,5);

 const insufficient=expert();insufficient.coins=perStone-1;
 const snapshot=JSON.stringify(insufficient);
 assert.equal(take(insufficient,'jade-buy-pack-4-1').ok,false);
 assert.equal(JSON.stringify(insufficient),snapshot,'Denied purchase cannot half-charge or rewrite save');
});

test('C4.50 free first stone, old vault and prior collectibles retain their value after reload',()=>{
 let starter=arcade.fresh(NOW);
 starter=take(starter,'jade-buy-pack-0-1').state;
 assert.equal(starter.coins,0);
 const legacy=expert(),stone=jade.generate(4,27,.37);
 stone.phase='cut';stone.payoutV=1;stone.cutValue=12345;
 legacy.jade.vault=[stone];legacy.jade.album['7-6']=3;
 const oldQuote=jade.marketQuote(stone,NOW).value;
 const loaded=reload(legacy);
 assert.equal(loaded.jade.vault[0].cutValue,12345);
 assert.equal(loaded.jade.vault[0].payoutV,1);
 assert.equal(loaded.jade.album['7-6'],3);
 assert.equal(jade.marketQuote(loaded.jade.vault[0],NOW).value,oldQuote);
 assert.equal(loaded.coins,legacy.coins);
});

test('C4.50 level-2 sprinklers water two plots per bottle and preserve growing beds on reload',()=>{
 function farm(sprinkler){
  const s=arcade.fresh(NOW);s.neon.running=false;s.garden.plots=4;
  s.garden.beds=Array.from({length:4},()=>({status:'dry',crop:'moon',readyAt:0}));
  s.garden.water=2;s.garden.sprinkler=sprinkler;
  return take(s,'water-all');
 }
 const l1=farm(1),l2=farm(2);
 assert.equal(l1.ok,true);assert.equal(l2.ok,true);
 assert.equal(l1.state.garden.water,0);
 assert.equal(l1.state.garden.beds.filter(b=>b.status==='growing').length,2);
 assert.equal(l2.state.garden.water,0);
 assert.equal(l2.state.garden.beds.filter(b=>b.status==='growing').length,4);
 assert.deepEqual(reload(l2.state).garden.beds,l2.state.garden.beds);
 assert.match(l2.label,/4 luống · dùng 2 bình/);
 const dry=arcade.fresh(NOW);dry.garden.sprinkler=2;dry.garden.water=0;
 assert.equal(take(dry,'water-all').ok,false);
});

test('C4.50 measured income stays modest for blind jade buys, and starter premium bait never unlocks rares',()=>{
 const rows=jade.MARKETS.map((_,site)=>sim.jadeMarket(site));
 assert.ok(rows[4].legacyV2.netPerStoneXu>400);
 assert.ok(rows[4].newV3.netPerStoneXu>0&&rows[4].newV3.netPerStoneXu<10);
 assert.ok(rows[3].newV3.netPerStoneXu<10);
 assert.ok(rows[4].newV3.profitablePct<40);
 assert.equal(sim.fishCatchCeiling(1,1,true).rarePct,0);
 assert.ok(sim.fishCatchCeiling(1,1,true).netPerSuccessfulCastXu<0);
 for(const roll of [.8,.95,.9999]){
  const fish=arcade.choosePondFish(roll,.76,NOW,1);
  assert.equal(arcade.FISH_SPECIES[fish].rare,false);
 }
 const before=sim.cropWaterCeiling('moon',1,4,0);
 const after=sim.cropWaterCeiling('moon',2,4,3);
 assert.equal(before.xuPerActiveHour,80);
 assert.equal(after.xuPerActiveHour,160);
});

test('C4.50 market and garden text show true prices, discounts and unlocked bait',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 const ui=window.DuduPersonalJadeUIV1,s=expert();
 assert.equal(ui.chooseMarket(4,s.jade),true);
 const html=ui.panel(s);
 assert.match(html,/💚 472\/viên/);
 assert.match(html,/Gồm phí quầy 💚 72/);
 assert.match(html,/5 viên · 💚 2\.360/);
 assert.match(html,/Đèn cấp cao giảm phí quầy/);
 const src=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 assert.match(src,/cá hiếm từ hồ cấp 2/);
 assert.match(src,/1 bình \/ 2 luống/);
 const index=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(index,/personal-jade-core-v1\.js\?v=c442-1&amp;economy=c450-1/);
 assert.match(index,/personal-arcade-core-v1\.js[^"\n]+c450=1/);
});
