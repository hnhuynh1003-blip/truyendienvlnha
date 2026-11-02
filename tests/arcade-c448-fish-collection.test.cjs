'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const TIME=1793440000000;
const clone=value=>JSON.parse(JSON.stringify(value));
const use=(s,action,t=TIME)=>core.act(s,action,t,.5);
const text=name=>readFileSync(join(__dirname,'..',name),'utf8');

test('C4.48 old Arcade saves gain spare-fish tracking without losing records or wallet',()=>{
 const old=core.fresh(TIME);old.coins=8539;old.earned=11987;
 old.garden.fish=31;old.garden.rareFish=8;old.garden.pondTier=5;
 old.garden.fishAlbum.dragon=2;old.garden.fishAlbum.reed=6;
 old.garden.fishBest.dragon=98;old.garden.pondDisplay=['dragon','reed'];
 for(const field of ['fishSpent','fishSetsClaimed','fishOrdersDone','fishTradeWeek','fishTradeUsed'])delete old.garden[field];
 const restored=core.norm(clone(old),TIME);
 assert.equal(restored.coins,8539);
 assert.equal(restored.earned,11987);
 assert.equal(restored.garden.fish,31);
 assert.equal(restored.garden.rareFish,8);
 assert.equal(restored.garden.pondTier,5);
 assert.equal(restored.garden.fishAlbum.dragon,2);
 assert.equal(restored.garden.fishBest.dragon,98);
 assert.deepEqual(restored.garden.pondDisplay,['dragon','reed']);
 assert.equal(core.fishAvailable(restored.garden,'dragon'),1);
 assert.equal(core.fishAvailable(restored.garden,'reed'),5);
 assert.deepEqual(restored.garden.fishSetsClaimed,[]);
 assert.deepEqual(restored.garden.fishOrdersDone,[]);
 assert.deepEqual(core.norm(clone(restored),TIME),restored);
});

test('C4.48 collection sets require each species and award exactly once, including old catches',()=>{
 let s=core.fresh(TIME);
 assert.equal(use(s,'garden-fish-set-0').ok,false);
 for(const fish of ['reed','carp','silver'])s.garden.fishAlbum[fish]=1;
 const first=use(s,'garden-fish-set-0');assert.equal(first.ok,true);s=first.state;
 assert.equal(s.coins,50);
 assert.equal(s.garden.bait,2);
 assert.deepEqual(s.garden.fishSetsClaimed,[0]);
 assert.equal(s.garden.fishAlbum.reed,1,'A museum reward never consumes a fish');
 assert.equal(use(s,'garden-fish-set-0').ok,false);
 s=core.norm(clone(s),TIME);
 assert.equal(use(s,'garden-fish-set-0').ok,false,'Reload cannot mint another reward');
 for(const id of Object.keys(core.FISH_SPECIES))s.garden.fishAlbum[id]=1;
 for(let i=1;i<core.FISH_COLLECTIONS.length;i++){
  const award=use(s,'garden-fish-set-'+i);assert.equal(award.ok,true);s=award.state;
 }
 assert.equal(s.coins,600,'All four fixed rewards total only 60 Xu');
 assert.equal(s.garden.moonBait,6);
 assert.deepEqual(s.garden.fishSetsClaimed,[0,1,2,3]);
 assert.equal(use(s,'garden-fish-set-3').ok,false);
});

test('C4.48 orders use only duplicate fish, preserving lifetime album and trophy sizes',()=>{
 let s=core.fresh(TIME);s.garden.fishAlbum.reed=3;s.garden.fishAlbum.carp=2;
 s.garden.fishBest.reed=28;
 const done=use(s,'garden-fish-order-0');assert.equal(done.ok,true);s=done.state;
 assert.equal(s.coins,40);assert.equal(s.garden.bait,2);
 assert.equal(s.garden.fishAlbum.reed,3);
 assert.equal(s.garden.fishAlbum.carp,2);
 assert.equal(s.garden.fishBest.reed,28);
 assert.equal(s.garden.fishSpent.reed,2);
 assert.equal(s.garden.fishSpent.carp,1);
 assert.equal(core.fishAvailable(s.garden,'reed'),0);
 assert.deepEqual(s.garden.fishOrdersDone,[0]);
 assert.equal(use(s,'garden-fish-order-0').ok,false);
 assert.equal(use(core.norm(clone(s),TIME),'garden-fish-order-0').ok,false);
 const again=use(s,'garden-fish-trade-reed');
 assert.equal(again.ok,false);
 assert.equal(again.state.coins,40);
 assert.equal(again.state.garden.fishSpent.reed,2);
});

test('C4.48 finite commissions can never pay unlimited Xu on repeated requests',()=>{
 let s=core.fresh(TIME);s.garden.pondTier=5;
 for(const id of Object.keys(core.FISH_SPECIES))s.garden.fishAlbum[id]=20;
 for(let i=0;i<core.FISH_COLLECTIONS.length;i++)s=use(s,'garden-fish-set-'+i).state;
 for(let i=0;i<core.FISH_ORDERS.length;i++){
  const result=use(s,'garden-fish-order-'+i);assert.equal(result.ok,true);s=result.state;
 }
 assert.equal(s.coins,1130,'Sets + one-time orders pay 113 Xu in total');
 for(let repeat=0;repeat<10;repeat++){
  for(let i=0;i<4;i++)assert.equal(use(s,'garden-fish-set-'+i).ok,false);
  for(let i=0;i<5;i++)assert.equal(use(s,'garden-fish-order-'+i).ok,false);
 }
 assert.equal(s.coins,1130);
 assert.equal(s.earned,1130);
 assert.equal(core.norm(clone(s),TIME).coins,1130);
});

test('C4.48 weekly trade gives bait, never Xu, at most twice per week',()=>{
 let s=core.fresh(TIME);s.garden.fishAlbum.reed=10;s.garden.fishAlbum.moonfish=3;
 const weekStart=Math.floor(TIME/(7*86400000))*7*86400000;
 assert.equal(core.fishTradeAllowance(s.garden,TIME),2);
 s=use(s,'garden-fish-trade-reed').state;
 assert.equal(s.garden.bait,1);assert.equal(s.garden.fishSpent.reed,2);
 assert.equal(s.garden.fishAlbum.reed,10);assert.equal(s.coins,0);
 assert.equal(core.fishTradeAllowance(s.garden,TIME),1);
 s=use(s,'garden-fish-trade-moonfish').state;
 assert.equal(s.garden.moonBait,1);assert.equal(s.garden.fishSpent.moonfish,1);
 assert.equal(core.fishTradeAllowance(s.garden,TIME),0);
 assert.equal(use(s,'garden-fish-trade-reed').ok,false);
 const reload=core.norm(clone(s),TIME);
 assert.equal(use(reload,'garden-fish-trade-reed').ok,false);
 assert.equal(use(reload,'garden-fish-trade-reed',weekStart-1000).ok,false,
  'Moving the clock backwards cannot replenish the same saved week');
 const nextWeek=use(reload,'garden-fish-trade-reed',weekStart+7*86400000+1000);
 assert.equal(nextWeek.ok,true);
 assert.equal(nextWeek.state.garden.fishTradeUsed,1);
 assert.equal(nextWeek.state.garden.bait,2);
 assert.equal(nextWeek.state.coins,0);
 assert.equal(nextWeek.state.garden.fishAlbum.reed,10);
});

test('C4.48 malformed spent-fish saves cannot erase the last fish of any species',()=>{
 const s=core.fresh(TIME);s.garden.fishAlbum.dragon=1;
 s.garden.fishAlbum.carp=3;s.garden.fishSpent.carp=9999;
 s.garden.fishSpent.dragon=999;s.garden.fishSpent.reed=50;
 s.garden.fishTradeWeek=999999999;
 s.garden.fishTradeUsed=999;
 s.garden.fishSetsClaimed=[0,0,99,-1];
 const restored=core.norm(s,TIME);
 assert.equal(core.fishAvailable(restored.garden,'dragon'),0);
 assert.equal(core.fishAvailable(restored.garden,'carp'),0);
 assert.equal(restored.garden.fishSpent.carp,2);
 assert.equal(restored.garden.fishSpent.dragon,0);
 assert.equal(restored.garden.fishSpent.reed,0);
 assert.deepEqual(restored.garden.fishSetsClaimed,[0]);
 assert.equal(restored.garden.fishTradeWeek,-1);
 assert.equal(restored.garden.fishTradeUsed,0);
});

test('C4.48 journal three tabs and ornate artwork remain inside popup, pond backgrounds untouched',()=>{
 const ui=text('js/personal-arcade-ui-v1.js'),css=text('css/arcade-c448-fish-collection.css');
 const html=text('index.html');
 for(const token of ['data-arcade-fish-tab','garden-fish-showcase','garden-fish-set-list',
  'garden-fish-orders','garden-fish-trade-grid','garden-fish-records'])assert.ok(ui.includes(token));
 for(const token of ['garden-fish-set-','garden-fish-order-','garden-fish-trade-'])assert.ok(ui.includes(token));
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/position:absolute|background-image:/,'No new artwork over pond scenery');
 assert.match(html,/arcade-c448-fish-collection\.css\?v=c448-1/);
 assert.match(html,/pond=c447-1&amp;album=c448-1/);
 assert.match(html,/layout=c446c-1&amp;pond=c447-1&amp;album=c448-1/);
});
