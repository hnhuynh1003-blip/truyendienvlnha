'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const TIME=1793360000000;
const act=(state,action,time=TIME)=>arcade.act(state,action,time,.41);

test('C4.57b offers twelve specific motifs, three materials and bounded crafting fees and durations',()=>{
 assert.equal(Object.keys(jade.DESIGNS).length,4);
 assert.equal(new Set(Object.values(jade.DESIGNS).flat()).size,12);
 assert.equal(jade.SETTINGS.length,3);
 const sample=jade.generate(0,2,.7);
 assert.ok(jade.craftDuration(sample,'ring',1,2,2)>jade.craftDuration(sample,'ring',1,0,0));
 assert.ok(jade.craftFee(sample,'ring',2,2)>jade.craftFee(sample,'ring'));
 assert.ok(jade.craftDuration(sample,'ring',4,0,0)>=60000);
});

test('C4.57b a selected ring style survives the real-time bench, receipt and reload',()=>{
 let s=arcade.fresh(TIME);s.coins=10000;
 s=act(s,'jade-buy-0').state;
 s.jade.active.grade=3;s.jade.active.flaw='perfect';s.jade.active.size=7;
 s=act(s,'jade-cut').state;
 const initial=s.coins,fee=jade.craftFee(s.jade.active,'ring',2,1);
 const begin=act(s,'jade-craft-ring-2-1');assert.equal(begin.ok,true);
 s=begin.state;assert.equal(s.coins,initial-fee);
 assert.equal(s.jade.craftJob.design,2);assert.equal(s.jade.craftJob.setting,1);
 assert.equal(s.jade.craftJob.type,'ring');assert.equal(s.jade.active,null);
 assert.equal(act(s,'jade-claim-craft').ok,false);
 const ready=s.jade.craftJob.readyAt;
 s=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(s.jade.craftJob.design,2);
 s=act(s,'jade-claim-craft',ready).state;
 assert.equal(s.jade.vault[0].phase,'crafted');
 assert.equal(s.jade.vault[0].craft,'ring');
 assert.equal(s.jade.vault[0].design,2);
 assert.equal(s.jade.vault[0].setting,1);
 assert.equal(s.jade.craftJob,null);
 assert.equal(act(s,'jade-claim-craft',ready+1).ok,false);
 const reloaded=arcade.norm(JSON.parse(JSON.stringify(s)),ready+1);
 assert.equal(reloaded.jade.vault[0].design,2);
 assert.equal(reloaded.jade.vault[0].setting,1);
});

test('C4.57b legacy craft actions and existing exhibits do not change shape on normalization',()=>{
 let s=arcade.fresh(TIME);s.coins=10000;
 s=act(s,'jade-buy-0').state;s.jade.active.grade=2;s.jade.active.flaw='perfect';
 s=act(s,'jade-cut').state;
 const legacy=act(s,'jade-craft-ring');
 assert.equal(legacy.ok,true,'Legacy saves and buttons are still accepted');s=legacy.state;
 const oldExhibit={grade:2,color:1,size:5,craft:'ring',site:0};
 s.jade.exhibits=[oldExhibit];
 const normalized=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.deepEqual(normalized.jade.exhibits[0],oldExhibit);
 assert.equal(normalized.jade.craftJob.design,0);
 assert.equal(normalized.jade.craftJob.setting,0);
});

test('C4.57b fulfilled NPC commission consumes exactly one physical crafted item',()=>{
 let s=arcade.fresh(TIME);s.coins=100;
 const order=jade.commissionFor(s.jade);
 assert.equal(order.craft,'ring');assert.equal(order.design,0);
 const piece={...jade.generate(0,2,.45),phase:'crafted',grade:2,flaw:'perfect',
  craft:'ring',design:0,setting:0,cutValue:100,craftValue:180};
 const wrong={...piece,id:3,design:1};
 s.jade.vault=[wrong,piece];
 assert.equal(jade.commissionMatch(wrong,order),false);
 assert.equal(jade.commissionMatch(piece,order),true);
 const quote=jade.marketQuote(piece,TIME).value;
 const reward=Math.round(quote*order.premium),before=s.coins;
 s=act(s,'jade-deliver-commission').state;
 assert.equal(s.coins,before+reward);
 assert.equal(s.jade.vault.length,1);assert.equal(s.jade.vault[0].id,3);
 assert.equal(s.jade.commissions.done,1);assert.equal(s.jade.sold,1);
 assert.equal(s.jade.commissions.readyAt,TIME+120000);
 assert.equal(act(s,'jade-deliver-commission').ok,false,'No repeated reward for one removed artifact');
 s=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(s.jade.commissions.done,1);
 assert.equal(act(s,'jade-deliver-commission',TIME+120001).ok,false,
  'After cooldown the same sold specimen must still be unavailable');
});

test('C4.57b customers reject wrong craft or setting and order rerolls have real cooldown',()=>{
 let s=arcade.fresh(TIME);s.coins=1000;
 const order=jade.commissionFor(s.jade);
 s.jade.vault=[{...jade.generate(0,2,.4),phase:'crafted',grade:5,flaw:'perfect',
  craft:'pendant',design:order.design,setting:2,craftValue:900}];
 const old=s.coins;
 assert.equal(act(s,'jade-deliver-commission').ok,false);
 assert.equal(s.coins,old);assert.equal(s.jade.vault.length,1);
 s=act(s,'jade-change-commission').state;
 assert.equal(s.jade.commissions.offer,1);
 assert.equal(act(s,'jade-change-commission').ok,false);
 s=act(s,'jade-change-commission',TIME+60001).state;
 assert.equal(s.jade.commissions.offer,2);
 assert.equal(s.coins,old);
});

test('C4.57b compact workshop exposes motif, material, commission and cache-busted scripts',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 const ui=window.DuduPersonalJadeUIV1;
 let s=arcade.fresh(TIME),html=ui.panel(s);
 assert.match(html,/jade-commission/);
 assert.match(html,/data-jade-design="0"/);
 assert.match(html,/data-jade-setting="2"/);
 assert.match(html,/data-arcade-action="jade-change-commission"/);
 assert.equal(ui.chooseDesign(2),true);assert.equal(ui.chooseSetting(1),true);
 assert.equal(ui.chooseDesign(7),false);
 html=ui.panel(s);
 assert.match(html,/jade-craft-ring-2-1/);
 assert.match(html,/jade-picker-chip is-selected/);
 const shell=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 assert.match(shell,/control\.dataset\.jadeDesign/);
 assert.match(shell,/craftReady\|\|orderReady\|\|rerollReady/);
 const index=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(index,/c457b=1/);
});
