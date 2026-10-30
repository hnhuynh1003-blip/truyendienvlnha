'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const START=1761730000000;
const act=(state,action,roll=.5,now=START)=>arcade.act(state,action,now,roll);

test('C2.7 upgrades a pre-release save without losing mined ores, crops or money',()=>{
 const old=arcade.fresh(START);old.coins=1234;old.earned=4567;
 old.mine.ores.iron=7;old.mine.dug=35;old.garden.beds[0]={status:'growing',readyAt:START+180000};
 delete old.neon.cooling;delete old.neon.turboReadyAt;
 for(const key of ['lantern','cart','scanner','charge','zone'])delete old.mine[key];
 for(const key of ['plots','crop','rod','sprinkler','fish'])delete old.garden[key];
 const next=arcade.norm(old,START);
 assert.equal(next.coins,1234);assert.equal(next.earned,4567);
 assert.equal(next.mine.dug,35);assert.equal(next.mine.ores.iron,7);
 assert.equal(next.garden.beds[0].status,'growing');
 assert.equal(next.garden.beds[0].crop,'bloom');
 assert.equal(next.neon.cooling,1);assert.equal(next.mine.lantern,1);
 assert.equal(next.garden.plots,2);assert.equal(next.garden.rod,1);
 assert.deepEqual(arcade.norm(next,START),next,'migration is idempotent');
});

test('Mine progression unlocks real depths, rewards 3 ores on charged burst and spends ore on crafted scanner',()=>{
 let state=arcade.fresh(START);state.coins=10000;
 assert.equal(act(state,'mine-zone-1').ok,false,'cannot skip 40 digs and lantern');
 state=act(state,'lantern').state;
 for(let i=0;i<40;i++){
  const result=act(state,'mine',.8);
  assert.equal(result.ok,true);state=result.state;
 }
 assert.equal(state.mine.charge,12,'charge does not overflow default capacitor');
 state=act(state,'mine-zone-1').state;
 assert.equal(state.mine.zone,1);
 const oresBefore=Object.values(state.mine.ores).reduce((a,b)=>a+b,0);
 const burst=act(state,'mine-burst',.97);
 assert.equal(burst.ok,true);state=burst.state;
 assert.equal(state.mine.charge,7);
 assert.equal(state.mine.durability,57);
 assert.equal(Object.values(state.mine.ores).reduce((a,b)=>a+b,0),oresBefore+3);
 state.mine.ores.iron=9;state.mine.ores.crystal=3;
 const scanner=act(state,'mine-scanner');
 assert.equal(scanner.ok,true);assert.equal(scanner.state.mine.scanner,1);
 assert.equal(scanner.state.mine.ores.iron,1);assert.equal(scanner.state.mine.ores.crystal,0);
 const upgraded=act(scanner.state,'cart');assert.equal(upgraded.ok,true);
 assert.equal(arcade.maxCharge(upgraded.state.mine),16);
 assert.equal(act(upgraded.state,'mine-zone-2').ok,false,'depth 2 still requires 160 digs and lantern 3');
});

test('Mine layer odds are improved by lantern-enabled depth and scanner, not just cosmetic',()=>{
 const state=arcade.fresh(START);state.mine.dug=160;state.mine.lantern=3;
 const upper=act(state,'mine',.92);
 assert.equal(upper.label,'iron');
 const deep=act(act(state,'mine-zone-2').state,'mine',.92);
 assert.equal(deep.label,'crystal');
 const bought=arcade.fresh(START);bought.mine.ores.iron=9;bought.mine.ores.crystal=3;
 const scanner=act(bought,'mine-scanner').state;
 assert.equal(act(scanner,'mine',.94).label,'crystal');
});

test('Cart boosts mineral sale only in Arcade, spending cannot mint real-wallet coins',()=>{
 let state=arcade.fresh(START);state.coins=2000;
 state=act(state,'cart').state;
 const afterUpgrade=state.coins;
 state.mine.ores.crystal=10;
 const sale=act(state,'sell-ores');
 assert.equal(sale.state.coins-afterUpgrade,220,'10% cart bonus is floor-rounded');
 assert.equal(sale.state.mine.ores.crystal,0);
 assert.equal('currency' in sale.state,false);
 assert.equal('walletXu' in sale.state,false);
});

test('Garden seed selection, extra beds, irrigation and two-stage crop timers affect harvest',()=>{
 let state=arcade.fresh(START);state.coins=8000;state.garden.harvests=10;
 state=act(state,'crop-mint').state;
 assert.equal(state.garden.crop,'mint');
 state=act(state,'plots').state;
 assert.equal(state.garden.beds.length,3);
 state=act(state,'sprinkler').state;
 state.garden.water=3;
 state=act(state,'plant-0').state;
 state=act(state,'plant-2').state;
 assert.equal(state.garden.beds[2].crop,'mint');
 state=act(state,'water-all').state;
 assert.equal(state.garden.water,1);
 assert.equal(state.garden.beds[0].readyAt,START+arcade.GROW_INTERVAL*2);
 assert.equal(state.garden.beds[2].status,'growing');
 assert.equal(act(state,'harvest-all').ok,false);
 const later=arcade.advance(state,START+arcade.GROW_INTERVAL*2,0);
 const coins=later.coins;
 const harvest=act(later,'harvest-all',.5,START+arcade.GROW_INTERVAL*2);
 assert.equal(harvest.ok,true);
 assert.equal(harvest.state.coins,coins+200);
 assert.equal(harvest.state.garden.harvests,12);
 assert.equal(harvest.state.garden.seeds,3);
 assert.equal(harvest.state.garden.beds[2].status,'empty');
});

test('Garden fishing consumes actual bait, rod upgrades change yield and rare-fish stats',()=>{
 let state=arcade.fresh(START);state.coins=8000;
 assert.equal(act(state,'cast-line').ok,false);
 state=arcade.advance(state,START+arcade.BUBBLE_INTERVAL,0);
 state=act(state,'catch-bubble',.5,START+arcade.BUBBLE_INTERVAL).state;
 assert.equal(state.garden.bait,1);
 state=act(state,'rod',.5,START+arcade.BUBBLE_INTERVAL).state;
 const coins=state.coins;
 const catchFish=act(state,'cast-line',.99,START+arcade.BUBBLE_INTERVAL);
 assert.equal(catchFish.ok,true);
 assert.equal(catchFish.state.garden.bait,0);
 assert.equal(catchFish.state.garden.fish,1);
 assert.equal(catchFish.state.garden.rareFish,1);
 assert.equal(catchFish.state.coins-coins,120);
 assert.equal(act(catchFish.state,'cast-line').ok,false,'cannot double-spend bait');
});

test('Neon turbo counts measured active playtime only, cooldown and contracts are one-time',()=>{
 let state=arcade.fresh(START);state.coins=4000;state.neon.cpu=2;
 const first=act(state,'neon-contract-0');
 assert.equal(first.ok,true);state=first.state;
 assert.equal(act(state,'neon-contract-0').ok,false);
 state=act(state,'neon-turbo').state;
 assert.equal(act(state,'neon-turbo').ok,false);
 const reopened=arcade.advance(state,START+120000,0);
 assert.equal(reopened.coins,state.coins,'no payout for time while browser was closed');
 const played=arcade.advance(state,START+120000,120000);
 assert.equal(played.coins-state.coins,31,'CPU 2 rate 0.013 Xu/s doubled for 120 seconds');
 const ended=arcade.advance(state,START+900000,900000);
 assert.ok(ended.coins-state.coins<235,'boost ends and cannot be extended by offline time');
 const next=act(ended,'neon-turbo',.5,START+900000);
 assert.equal(next.ok,true);
});

test('UI displays real workshop actions for all three worlds, and mobile selects remain buttons',()=>{
 const ui=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/personal-arcade-v1.css'),'utf8');
 const saved=new Map();const events={};const host={innerHTML:'',scrollTop:0,
  addEventListener(name,fn){events[name]=fn;},querySelector:()=>({textContent:''})};
 const root={DuduPersonalArcadeCoreV1:arcade,document:{getElementById:id=>id==='personal-arcade-v1'?host:
  id==='phone-app-arcade'?{style:{display:'flex'}}:null},
  DuduAuth:{uid:()=> 'reader',isReady:()=>true},
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
  setInterval(){},addEventListener(){}};
 vm.runInNewContext(ui,{window:root});
 const arcadeUI=root.DuduPersonalArcadeUIV1;
 const show=(name)=>{arcadeUI.render();assert.match(host.innerHTML,new RegExp('arcade-active-'+name));};
 show('neon');
 assert.match(host.innerHTML,/data-arcade-action="neon-turbo"/);
 assert.match(host.innerHTML,/data-arcade-action="cooling"/);
 assert.match(host.innerHTML,/data-arcade-action="neon-contract-0"/);
 const select=name=>events.click({target:{closest:selector=>selector==='button'?{
  disabled:false,dataset:{arcadeTab:name}}:null}});
 select('mine');show('mine');
 assert.match(host.innerHTML,/data-arcade-action="mine-burst"/);
 assert.match(host.innerHTML,/data-arcade-action="mine-scanner"/);
 select('garden');show('garden');
 assert.match(host.innerHTML,/data-arcade-action="cast-line"/);
 assert.match(host.innerHTML,/data-arcade-action="harvest-all"/);
 assert.match(host.innerHTML,/data-arcade-action="crop-mint"/);
 assert.match(css,/garden-expanded/);
 assert.match(css,/:focus-visible/);
});
