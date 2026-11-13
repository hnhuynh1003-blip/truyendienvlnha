'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const T=1793440000000;
const copy=value=>JSON.parse(JSON.stringify(value));
const use=(state,action,at=T)=>core.act(state,action,at,.5);

test('C4.49 legacy greenhouse saves preserve crop state and receive seals for old fulfilled orders',()=>{
 const old=core.fresh(T);old.coins=8593;old.earned=17000;
 old.garden.harvests=41;old.garden.cropStock.moon=9;old.garden.cropStock.mint=12;
 old.garden.cropOrdersDone=[0,1,2];old.garden.plots=4;
 old.garden.beds=[
  {status:'growing',crop:'moon',readyAt:T+60000},
  {status:'growing',crop:'mint',readyAt:T+120000},
  {status:'dry',crop:'bloom',readyAt:0},
  {status:'empty',crop:'bloom',readyAt:0}
 ];
 delete old.garden.cropHarvested;delete old.garden.gardenSeals;delete old.garden.gardenSoilLevel;
 const s=core.norm(copy(old),T);
 assert.equal(s.coins,8593);assert.equal(s.earned,17000);
 assert.equal(s.garden.harvests,41);assert.equal(s.garden.cropStock.moon,9);
 assert.equal(s.garden.plots,4);assert.deepEqual(s.garden.beds,old.garden.beds);
 assert.deepEqual(s.garden.cropOrdersDone,[0,1,2]);
 assert.deepEqual(s.garden.cropHarvested,{bloom:0,mint:0,moon:0});
 assert.equal(s.garden.gardenSeals,12,'Old completed orders receive 2+4+6 seals');
 assert.deepEqual(core.norm(copy(s),T),s,'Migration only awards the seals once');
});

test('C4.49 variety milestones unlock mint and moonflowers without 30 short-crop harvests',()=>{
 let s=core.fresh(T);s.garden.water=7;s.garden.waterCap=7;
 for(let i=0;i<4;i++){
  s.garden.beds[0]={status:'growing',crop:'bloom',readyAt:T-1};
  const harvested=use(s,'harvest-0');assert.equal(harvested.ok,true);s=harvested.state;
 }
 assert.equal(s.garden.harvests,4);
 assert.equal(s.garden.cropHarvested.bloom,4);
 assert.equal(core.cropUnlocked(s.garden,'mint'),true);
 s=use(s,'crop-mint').state;
 assert.equal(s.garden.crop,'mint');
 for(let i=0;i<4;i++){
  s.garden.beds[0]={status:'growing',crop:'mint',readyAt:T-1};
  s=use(s,'harvest-0').state;
 }
 assert.equal(s.garden.harvests,8);
 assert.equal(s.garden.cropHarvested.mint,4);
 assert.equal(core.cropUnlocked(s.garden,'moon'),true);
 assert.equal(use(s,'crop-moon').ok,true);
 assert.deepEqual(core.norm(copy(s),T),s);
 const old=core.fresh(T);old.garden.harvests=30;
 assert.equal(core.cropUnlocked(old.garden,'moon'),true,'Legacy unlocks are still valid');
});

test('C4.49 five mixed orders cost stored produce, reward finite seals and work after reload',()=>{
 let s=core.fresh(T);s.garden.harvests=30;
 for(const id of Object.keys(core.CROPS))s.garden.cropStock[id]=80;
 assert.equal(core.GARDEN_ORDERS.length,5);
 assert.equal(use(s,'garden-order-4').ok,false,'Future orders must not be skipped');
 for(let i=0;i<5;i++){
  const order=core.GARDEN_ORDERS[i];
  const before={...s.garden.cropStock},coins=s.coins;
  const done=use(s,'garden-order-'+i);assert.equal(done.ok,true);s=done.state;
  for(const [id,quantity] of Object.entries(order.need))
   assert.equal(s.garden.cropStock[id],before[id]-quantity);
  assert.equal(s.coins,coins,'Orders cannot repeatedly mint Xu');
  assert.equal(s.garden.gardenSeals,core.GARDEN_ORDERS.slice(0,i+1).reduce((n,x)=>n+x.seals,0));
  assert.equal(use(s,'garden-order-'+i).ok,false);
  s=core.norm(copy(s),T);
 }
 assert.equal(s.garden.gardenSeals,24);
 assert.deepEqual(s.garden.cropOrdersDone,[0,1,2,3,4]);
 for(let i=0;i<5;i++)assert.equal(use(s,'garden-order-'+i).ok,false);
});

test('C4.49 permanent soil upgrade costs earned seals and reduces grow time, not crop payouts',()=>{
 let s=core.fresh(T);s.garden.gardenSeals=24;
 assert.equal(core.cropGrowTime(s.garden,'bloom'),3*60*1000);
 assert.equal(core.cropGrowTime(s.garden,'mint'),6*60*1000);
 assert.equal(core.cropGrowTime(s.garden,'moon'),9*60*1000);
 let spent=0;
 for(let level=1;level<=3;level++){
  const cost=core.gardenSoilCost(s.garden);
  assert.equal(cost,[4,8,12][level-1]);
  const result=use(s,'garden-soil-upgrade');assert.equal(result.ok,true);s=result.state;
  spent+=cost;
  assert.equal(s.garden.gardenSeals,24-spent);
  assert.equal(s.garden.gardenSoilLevel,level);
  assert.equal(core.cropGrowTime(s.garden,'moon'),Math.floor(9*60*1000*(1-.08*level)));
 }
 assert.equal(core.gardenSoilCost(s.garden),null);
 assert.equal(use(s,'garden-soil-upgrade').ok,false);
 assert.equal(s.coins,0);
 assert.equal(core.CROPS.moon.value,200,'Soil upgrade changes speed but not Xu payout');
 s.garden.sprinkler=2;
 assert.equal(core.cropGrowTime(s.garden,'moon'),Math.floor(9*60*1000*.8*.76));
});

test('C4.49 soil affects watering and mature crops harvest once after reload on all four beds',()=>{
 let s=core.fresh(T);s.garden.gardenSoilLevel=2;s.garden.plots=4;
 s.garden.waterCap=7;s.garden.water=4;s.garden.sprinkler=1;
 s.garden.beds=Array.from({length:4},(_,i)=>({status:'dry',crop:['bloom','mint','moon','moon'][i],readyAt:0}));
 const watered=use(s,'water-all');assert.equal(watered.ok,true);s=watered.state;
 assert.equal(s.garden.water,0);
 for(const bed of s.garden.beds)assert.equal(bed.readyAt,T+core.cropGrowTime(s.garden,bed.crop));
 s=core.norm(copy(s),T);
 const finish=T+core.cropGrowTime(s.garden,'moon');
 const ready=core.advance(s,finish,0);
 const first=use(ready,'harvest-all',finish);
 assert.equal(first.ok,true);
 assert.equal(first.state.garden.harvests,4);
 assert.deepEqual(first.state.garden.cropStock,{bloom:1,mint:1,moon:2});
 assert.deepEqual(first.state.garden.cropHarvested,{bloom:1,mint:1,moon:2});
 assert.equal(first.state.garden.seeds,7);
 assert.equal(first.state.coins,50+100+200*2);
 assert.equal(use(first.state,'harvest-all',finish).ok,false);
 assert.deepEqual(core.norm(copy(first.state),finish),first.state);
});

test('C4.49 upgrading soil immediately helps growing plants, without moving ready ones backwards',()=>{
 let s=core.fresh(T);s.garden.gardenSeals=24;
 s.garden.beds[0]={status:'growing',crop:'moon',readyAt:T+9*60000};
 s.garden.beds[1]={status:'growing',crop:'bloom',readyAt:T-10};
 const next=use(s,'garden-soil-upgrade');assert.equal(next.ok,true);s=next.state;
 assert.equal(s.garden.beds[0].readyAt,T+Math.ceil(9*60000*.92));
 assert.equal(s.garden.beds[1].readyAt,T-10);
 assert.equal(s.garden.gardenSoilLevel,1);
 assert.deepEqual(core.norm(copy(s),T),s);
});

test('C4.49 greenhouse UI keeps mobile seed cards and painted lake unchanged',()=>{
 const src=file=>readFileSync(join(__dirname,'..',file),'utf8');
 const ui=src('js/personal-arcade-ui-v1.js'),css=src('css/arcade-c449-garden-progression.css');
 const html=src('index.html');
 assert.match(ui,/garden-soil-workshop/);
 assert.match(ui,/garden-soil-upgrade/);
 assert.match(ui,/core\.cropGrowTime/);
 assert.match(ui,/GARDEN_ORDERS\.length/);
 assert.match(css,/\.garden-soil-workshop/);
 assert.doesNotMatch(css,/position:absolute|background-image:/,'No images or trees overlay the lake');
 assert.match(html,/arcade-c449-garden-progression\.css\?v=c449-1/);
 assert.match(html,/economy=c448b-1&amp;garden=c449-1/);
});
