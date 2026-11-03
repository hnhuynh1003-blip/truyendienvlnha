'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const NOW=1793700000000;
const clone=value=>JSON.parse(JSON.stringify(value));
const state=()=>{const s=arcade.fresh(NOW);s.coins=50000;s.jade.bought=1;return s;};
const play=(s,action,roll=.53)=>arcade.act(s,action,NOW,roll);

test('C4.54: new players cannot forfeit their free first market stone by buying a sealed expedition',()=>{
 const s=arcade.fresh(NOW);s.coins=50000;
 const before=s.coins;
 assert.equal(play(s,'jade-blind-0').ok,false);
 assert.equal(s.coins,before);
 const gift=play(s,'jade-buy-0');
 assert.equal(gift.ok,true);
 assert.equal(gift.state.jade.active.id,1);
 assert.equal(gift.state.coins,before);
 assert.equal(jade.huntUnlocked(gift.state.jade,0),true);
});

test('C4.54: sealed hunt pays once and delivers exactly one persistent unrevealed rough stone',()=>{
 let s=state();const base=s.coins;
 const r=play(s,'jade-blind-0',.239);assert.equal(r.ok,true,r.reason);s=r.state;
 assert.equal(s.coins,base-jade.HUNTS[0].price);
 assert.equal(s.jade.invested,jade.HUNTS[0].price);
 assert.equal(s.jade.bought,2);
 assert.equal(s.jade.stash.length,1);
 assert.equal(s.jade.stash[0].hunt,0);
 assert.equal(s.jade.stash[0].phase,'raw');
 assert.equal(s.jade.stash[0].id,2);
 assert.equal(s.earned,0,'No direct Arcade money payout for buying a bag');
 const specimen=clone(s.jade.stash[0]);
 s=arcade.norm(clone(s),NOW+1000);
 assert.deepEqual(s.jade.stash[0],specimen,'Origin, gem grade and risk route never reroll on reload');
 s=play(s,'jade-select-0').state;
 assert.equal(s.jade.active.hunt,0);
 assert.equal(s.jade.stash.length,0);
 assert.equal(play(s,'jade-select-0').ok,false,'Cannot withdraw same sample again');
 s=play(s,'jade-cut').state;
 assert.equal(s.jade.active.phase,'cut');
 assert.equal(s.jade.active.hunt,0);
});

test('C4.54: middle and high routes respect workshop progression and price',()=>{
 let s=state();const original=s.coins;
 assert.equal(play(s,'jade-blind-1').ok,false);
 assert.equal(play(s,'jade-blind-2').ok,false);
 assert.equal(s.coins,original);
 s.jade.sold=5;s.jade.lamp=2;
 assert.equal(jade.huntUnlocked(s.jade,1),true);
 assert.equal(jade.huntUnlocked(s.jade,2),false);
 const middle=play(s,'jade-blind-1',.48);assert.equal(middle.ok,true);s=middle.state;
 assert.equal(s.coins,original-jade.HUNTS[1].price);
 assert.ok([1,2,3].includes(s.jade.stash[0].site));
 s.jade.sold=25;s.jade.lamp=3;s.jade.carver=2;
 const before=s.coins;
 const high=play(s,'jade-blind-2',.82);assert.equal(high.ok,true);s=high.state;
 assert.equal(s.coins,before-jade.HUNTS[2].price);
 assert.ok([2,3,4].includes(s.jade.stash[1].site));
});

test('C4.54: low funds, full inventory and max ID reject hunt without charging',()=>{
 let s=state();s.coins=jade.HUNTS[0].price-1;
 assert.equal(play(s,'jade-blind-0').ok,false);
 assert.equal(s.jade.bought,1);
 s=state();s.jade.stash=Array.from({length:jade.MAX_STONES},(_,i)=>jade.generate(0,i+10,.34));
 const before=s.coins;
 assert.equal(play(s,'jade-blind-0').ok,false);
 assert.equal(s.coins,before);
 s=state();s.jade.bought=1000000;
 assert.equal(play(s,'jade-blind-0').ok,false);
 assert.equal(s.coins,before);
});

test('C4.54: published origins are weighted by route; each route can reach its advertised sites',()=>{
 const counts=jade.HUNTS.map(()=>Array(5).fill(0));
 for(let route=0;route<3;route++){
  let s=state();s.jade.sold=50;s.jade.lamp=4;s.jade.carver=4;
  for(let i=0;i<12000;i++){
   // Deterministic, evenly spread roll inputs, with different IDs for each contract.
   s.jade.stash=[];s.jade.active=null;
   const roll=(i*.6180339887498949)%1;
   const next=play(s,'jade-blind-'+route,roll);assert.equal(next.ok,true);s=next.state;
   counts[route][s.jade.stash[0].site]++;
   s.coins=50000; // Test harness bankroll, not part of game rewards.
  }
  for(let site=0;site<5;site++){
   const expected=jade.HUNTS[route].weights[site]/100;
   const actual=counts[route][site]/12000;
   assert.ok(Math.abs(actual-expected)<.03,
    `route ${route}, site ${site}: expected ${expected}, got ${actual}`);
  }
 }
});

test('C4.54: hunt has an accessible separate drawer, real prices, odds and hidden origins',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 const s=state();s.jade.stash=[{...jade.generate(2,2,.26),hunt:1}];
 const html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/data-arcade-drawer="jade-hunt"/);
 assert.match(html,/data-arcade-panel="jade-hunt"/);
 assert.match(html,/data-arcade-action="jade-blind-0"/);
 assert.match(html,/65%/);
 assert.match(html,/30%/);
 assert.match(html,/5%/);
 assert.match(html,/🎒 Đá mù/);
 assert.match(html,/Tỷ lệ trên là/);
 assert.match(html,/Phí xẻ tính riêng/);
});
