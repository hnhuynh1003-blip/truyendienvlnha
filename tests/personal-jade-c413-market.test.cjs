'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const TIME=1793360000000;
const play=(s,action,roll=.42)=>arcade.act(s,action,TIME,roll);

test('C4.13 old Jade saves migrate without losing active stone or changing Arcade wallet',()=>{
 let s=arcade.fresh(TIME);s.coins=12345;
 s=play(s,'jade-buy-0').state;
 const specimen=structuredClone(s.jade.active);delete s.jade.stash;
 const again=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(again.coins,12345);
 assert.deepEqual(again.jade.active,specimen);
 assert.deepEqual(again.jade.stash,[]);
 assert.equal(again.version,1);
});

test('C4.13 handpicked market samples keep their true hidden stone across save/reload',()=>{
 let s=arcade.fresh(TIME);
 const preview=jade.marketOffer(s.jade,0,2);
 const repeats=jade.marketOffer(s.jade,0,2);
 assert.deepEqual(preview,repeats);
 assert.match(preview.size,/Cỡ/);
 assert.ok(preview.marks.length>2);
 const picked=play(s,'jade-pick-0-2');assert.equal(picked.ok,true);s=picked.state;
 assert.equal(s.jade.bought,1);
 assert.equal(s.jade.active,null,'Market purchases go into the bag, not directly to the saw');
 assert.equal(s.jade.stash.length,1);
 assert.deepEqual(s.jade.stash[0],preview.stone);
 assert.equal(s.coins,0,'The first market sample remains free');
 s=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.deepEqual(s.jade.stash[0],preview.stone,'No reroll after reload');
 s=play(s,'jade-select-0').state;
 assert.equal(s.jade.stash.length,0);
 assert.equal(s.jade.active.id,1);
});

test('C4.13 packs of 1, 3 or 5 charge atomically and never overfill a twelve-stone bag',()=>{
 let s=arcade.fresh(TIME);s.coins=4000;
 const bought=play(s,'jade-buy-pack-0-5',.65);
 assert.equal(bought.ok,true);s=bought.state;
 assert.equal(s.jade.bought,5);
 assert.equal(s.jade.stash.length,5);
 assert.equal(s.coins,3800,'One free + four at 5.0 Arcade Xu each');
 assert.equal(s.jade.invested,200);
 assert.deepEqual(s.jade.stash.map(x=>x.id),[1,2,3,4,5]);
 assert.equal(new Set(s.jade.stash.map(x=>x.seed)).size,5);
 s=play(s,'jade-buy-pack-0-5').state;
 assert.equal(s.jade.stash.length,10);
 const before=JSON.stringify(s);
 assert.equal(play(s,'jade-buy-pack-0-3').ok,false,'Capacity is all-or-nothing');
 assert.equal(JSON.stringify(s),before);
 s=play(s,'jade-buy-pack-0-1').state;
 s=play(s,'jade-buy-pack-0-1').state;
 assert.equal(s.jade.stash.length,12);
 assert.equal(play(s,'jade-pick-0-1').ok,false);
 assert.equal(s.jade.bought,12);
});

test('C4.13 not enough funds cannot partially buy a bundle, including when already inspecting a stone',()=>{
 let s=arcade.fresh(TIME);
 const before=JSON.stringify(s);
 assert.equal(play(s,'jade-buy-pack-0-3').ok,false);
 assert.equal(JSON.stringify(s),before);
 s=play(s,'jade-buy-pack-0-1').state;
 s=play(s,'jade-select-0').state;
 const after=JSON.stringify(s);
 assert.equal(play(s,'jade-buy-pack-0-3').ok,false);
 assert.equal(JSON.stringify(s),after);
});

test('C4.13 inspect, store, select another, sell and return to waiting stock without a market visit',()=>{
 let s=arcade.fresh(TIME);s.coins=1500;
 s=play(s,'jade-buy-pack-0-3',.77).state;
 s=play(s,'jade-select-1').state;
 const secondId=s.jade.active.id;
 s=play(s,'jade-scan-0').state;
 s=play(s,'jade-store').state;
 assert.equal(s.jade.active,null);
 assert.equal(s.jade.stash[0].id,secondId);
 assert.equal(s.jade.stash[0].scans[0],true);
 s=play(s,'jade-select-1').state;
 s=play(s,'jade-cut').state;
 s=play(s,'jade-sell').state;
 assert.equal(s.jade.sold,1);
 assert.equal(s.jade.active,null);
 assert.equal(s.jade.stash.length,2);
 s=play(s,'jade-select-0').state;
 const sold=s.jade.sold,coins=s.coins;
 assert.equal(play(s,'jade-sell').ok,false,'No double sale');
 assert.equal(s.jade.sold,sold);assert.equal(s.coins,coins);
});

test('C4.13 rescue stone is not granted while unprocessed rocks remain, and saved stock is validated',()=>{
 let s=arcade.fresh(TIME);s.coins=10;
 s=play(s,'jade-buy-pack-0-1').state;
 assert.equal(play(s,'jade-rescue').ok,false);
 const saved=structuredClone(s);
 saved.jade.stash.push({...saved.jade.stash[0]});
 saved.jade.stash.push({...saved.jade.stash[0],id:999,grade:999});
 const again=arcade.norm(saved,TIME);
 assert.equal(again.jade.stash.length,1,'Duplicates and invalid content must not survive normalization');
 assert.ok(again.jade.stash.every(x=>['raw','window'].includes(x.phase)));
});

test('C4.13 Ngọc Phường panel offers quick packs, handpicked stones and a compact waiting bag',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 let s=arcade.fresh(TIME);
 let html=window.DuduPersonalJadeUIV1.panel(s);
 for(const action of ['jade-buy-0','jade-buy-pack-0-1','jade-buy-pack-0-3',
  'jade-buy-pack-0-5','jade-pick-0-0','jade-pick-0-1','jade-pick-0-2'])
  assert.ok(html.includes('data-arcade-action="'+action+'"'),action);
 assert.match(html,/Mở sạp · So bì đá và thử đèn/);
 s.coins=200;
 s=play(s,'jade-buy-pack-0-3',.32).state;
 html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/jade-stock-rail/);
 assert.match(html,/data-arcade-action="jade-select-0"/);
 assert.match(html,/3\/12 chỗ/);
 s=play(s,'jade-select-0').state;
 html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/data-arcade-action="jade-store"/);
 assert.match(html,/data-arcade-action="jade-cut"/);
 const css=readFileSync(join(__dirname,'../css/personal-arcade-v1.css'),'utf8');
 assert.match(css,/\.jade-market-bundles/);
 assert.match(css,/\.jade-market-samples/);
 assert.match(css,/\.jade-stock-rail/);
 assert.match(css,/overflow-x:auto/);
});
