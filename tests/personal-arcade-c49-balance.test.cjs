'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const TIME=1793360000000;
const take=(s,action,roll=.53,time=TIME)=>arcade.act(s,action,time,roll);
const clone=s=>arcade.norm(JSON.parse(JSON.stringify(s)),TIME);

test('C4.9 jade market expected payout remains risky without exponential guaranteed upgrades',()=>{
 const trials=6000;
 const results=jade.MARKETS.map((market,site)=>{
  let total=0,winning=0,duds=0,top=0;
  for(let n=1;n<=trials;n++){
   const stone=jade.generate(site,n,(n*.61803398875)%1);
   const value=jade.cutValue(stone,1);
   total+=value;top=Math.max(top,value);
   if(value>market.price+jade.cuttingFee(site))winning++;
   if(stone.grade===0)duds++;
  }
  return {ratio:total/trials/market.price,winning:winning/trials,duds:duds/trials,top};
 });
 assert.ok(results[0].duds>.65&&results[0].duds<.75,'starter market keeps ~70% waste');
 assert.ok(results[0].ratio<1,'starter stones keep their high-risk identity');
 for(let i=1;i<5;i++){
  assert.ok(results[i].ratio>1.35&&results[i].ratio<2.6,
   'market '+i+' average gross return stays within tycoon progression range');
  assert.ok(results[i].winning<.65,'market '+i+' cannot guarantee a profitable cut');
 }
 assert.ok(results[4].top>jade.MARKETS[4].price*20,'mythic jackpots still exist');
});

test('C4.9 legacy purchased stones preserve original valuations on reload',()=>{
 let s=arcade.fresh(TIME);s.coins=100000;s.jade.sold=12;s.jade.saw=2;
 let r=take(s,'jade-buy-2',.17);assert.equal(r.ok,true);s=r.state;
 const v2=jade.baseValue(s.jade.active);
 const old=JSON.parse(JSON.stringify(s));delete old.jade.active.payoutV;
 const migrated=clone(old);
 assert.equal(migrated.jade.active.payoutV,1);
 assert.ok(jade.baseValue(migrated.jade.active)>v2*2);
 assert.equal(clone(s).jade.active.payoutV,2);
 assert.equal(clone(s).coins,s.coins);
 assert.equal(clone(s).jade.sold,12);
});

test('C4.9 unsawn paid stone can be liquidated once at a loss, never counting toward market unlocks',()=>{
 let s=arcade.fresh(TIME);s.coins=jade.MARKETS[0].price;
 s=take(s,'jade-buy-0').state;
 assert.equal(take(s,'jade-sell-raw').ok,false,'first free gift cannot be sold raw');
 s=take(s,'jade-cut').state;s=take(s,'jade-sell').state;
 s.coins=jade.MARKETS[0].price;
 s=take(s,'jade-buy-0').state;
 assert.equal(s.coins,0);
 const soldBefore=s.jade.sold;
 const salvage=jade.rawSalvageValue(s.jade.active);
 assert.equal(salvage,Math.floor(jade.MARKETS[0].price*.25));
 const settled=take(s,'jade-sell-raw');assert.equal(settled.ok,true);
 assert.equal(settled.state.coins,salvage);
 assert.equal(settled.state.jade.sold,soldBefore);
 assert.equal(settled.state.jade.active,null);
 assert.equal(take(settled.state,'jade-sell-raw').ok,false,'never double-sell');
});

test('C4.9 bankruptcy rescue is fee-free, saved and time-gated without minting Xu on click',()=>{
 let s=arcade.fresh(TIME);
 s=take(s,'jade-buy-0').state;
 s=take(s,'jade-cut').state;
 s=take(s,'jade-sell').state;
 s.coins=0;
 const earned=s.earned;
 const rescue=take(s,'jade-rescue');assert.equal(rescue.ok,true);
 s=rescue.state;
 assert.equal(s.earned,earned,'getting a rescue stone never pays coins by itself');
 assert.equal(s.coins,0);
 assert.equal(s.jade.active.practice,true);
 assert.equal(jade.actionFee(s.jade.active,'cut'),0);
 assert.equal(jade.actionFee(s.jade.active,'window'),0);
 assert.equal(jade.rawSalvageValue(s.jade.active),0);
 const ready=s.jade.rescueReadyAt;
 const copy=clone(s);
 assert.equal(copy.jade.rescueReadyAt,ready);
 assert.equal(copy.jade.active.practice,true);
 s=take(copy,'jade-cut').state;
 s=take(s,'jade-sell').state;
 s.coins=0;
 assert.equal(take(s,'jade-rescue',.53,TIME+jade.RESCUE_INTERVAL-1).ok,false);
 assert.equal(take(s,'jade-rescue',.53,TIME+jade.RESCUE_INTERVAL).ok,true);
 s.coins=jade.MARKETS[0].price;
 assert.equal(take(s,'jade-rescue').ok,false,'cannot request rescue while stone on table');
});

test('C4.9 high balance cannot farm rescue; other three games retain base earning mechanics',()=>{
 let s=arcade.fresh(TIME);s=take(s,'jade-buy-0').state;
 s=take(s,'jade-cut').state;s=take(s,'jade-sell').state;
 s.coins=50;
 assert.match(take(s,'jade-rescue').reason,/Xu Arcade/);
 const idle=arcade.advance(arcade.fresh(TIME),TIME+3600000,3600000);
 assert.equal(idle.coins,600,'Neon 60 Xu per active hour is unchanged');
 assert.equal(take(arcade.fresh(TIME),'mine',.99).ok,true);
 let garden=arcade.fresh(TIME);
 garden=take(garden,'plant-0').state;
 assert.ok(garden.garden.beds.some(b=>b.status!=='empty'),'garden can plant without purchase');
});

test('C4.9 controls clearly expose recovery and keep all four game tabs',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 const jadeUI=window.DuduPersonalJadeUIV1;
 let s=arcade.fresh(TIME);s=take(s,'jade-buy-0').state;
 s=take(s,'jade-cut').state;s=take(s,'jade-sell').state;s.coins=0;
 assert.match(jadeUI.panel(s),/data-arcade-action="jade-rescue"/);
 s=take(s,'jade-rescue').state;
 assert.match(jadeUI.panel(s),/đá tập cứu vốn|Bàn giám ngọc/);
 s=take(s,'jade-cut').state;s=take(s,'jade-sell').state;s.coins=0;
 assert.match(jadeUI.panel(s),/Đá cứu vốn/);
});
