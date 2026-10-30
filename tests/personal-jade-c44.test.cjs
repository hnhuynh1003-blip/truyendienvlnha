'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const TIME=1793360000000;
const take=(state,action,roll=.52)=>arcade.act(state,action,TIME,roll);
const promising=(site=0)=>{
 for(let i=0;i<100000;i++){
  const r=i/100000,stone=jade.generate(site,1,r);
  if(stone.grade>=2&&stone.flaw!=='skin'&&stone.flaw!=='fracture'&&stone.size>=5)return r;
 }
 throw Error('No stone found');
};

test('C4.4 migrates old Arcade saves additively, preserving three existing games and currency',()=>{
 const before=arcade.fresh(TIME);before.coins=1877;before.neon.cpu=4;
 before.mine.ores.gold=9;before.garden.fishAlbum.reed=4;delete before.jade;
 const next=arcade.norm(before,TIME);
 assert.equal(next.coins,1877);assert.equal(next.neon.cpu,4);
 assert.equal(next.mine.ores.gold,9);assert.equal(next.garden.fishAlbum.reed,4);
 assert.equal(next.jade.bought,0);assert.equal(next.jade.lamp,1);
 assert.equal(next.version,1,'Storage format and key do not reset');
});

test('C4.4 first sample is free, stone attributes persist across reload, scans cannot be repeated',()=>{
 let s=arcade.fresh(TIME);
 const bought=take(s,'jade-buy-0',promising());assert.equal(bought.ok,true);
 s=bought.state;assert.equal(s.coins,0);assert.equal(s.jade.bought,1);
 assert.equal(take(s,'jade-buy-0').ok,false,'Only one stone is on the table');
 const original=JSON.stringify(s.jade.active);
 s=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(JSON.stringify(s.jade.active),original,'No hidden reroll on reload');
 const scanned=take(s,'jade-scan-0');assert.equal(scanned.ok,true);
 assert.equal(scanned.state.jade.active.scans[0],true);
 assert.equal(take(scanned.state,'jade-scan-0').ok,false);
 assert.match(jade.scanHint(scanned.state.jade.active,0,1),/thấu|sáng|Thủy|đục/i);
});

test('C4.4 free first sample can be appraised and cut even with zero balance',()=>{
 let s=arcade.fresh(TIME);s=take(s,'jade-buy-0',promising()).state;
 assert.equal(jade.actionFee(s.jade.active,'window'),0);
 assert.equal(jade.actionFee(s.jade.active,'cut'),0);
 s=take(s,'jade-window').state;assert.equal(s.coins,0);
 assert.equal(take(s,'jade-cut').ok,true);
});

test('C4.4 NPC quote is fixed, two choices are exclusive, and selling twice never duplicates Xu',()=>{
 let s=arcade.fresh(TIME);s.coins=1000;
 s=take(s,'jade-buy-0',promising()).state;
 s=take(s,'jade-window').state;
 const offer=s.jade.active.offer,coinBefore=s.coins;
 s=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(s.jade.active.offer,offer);
 const sale=take(s,'jade-sell-window');assert.equal(sale.ok,true);
 assert.equal(sale.state.coins,coinBefore+offer);
 assert.equal(sale.state.jade.sold,1);
 assert.equal(take(sale.state,'jade-sell-window').ok,false);
 assert.equal(take(sale.state,'jade-cut').ok,false);
});

test('C4.4 cutting, crafting and exhibition are one-shot; exhibits do not mint Arcade coins',()=>{
 let s=arcade.fresh(TIME);s.coins=2000;
 s=take(s,'jade-buy-0',promising()).state;
 const cut=take(s,'jade-cut');assert.equal(cut.ok,true);
 s=cut.state;assert.equal(s.jade.cut,1);
 assert.equal(s.jade.active.phase,'cut');
 assert.equal(Object.values(s.jade.album).reduce((a,b)=>a+b,0),1);
 assert.equal(take(s,'jade-cut').ok,false);
 const cost=jade.craftFee(s.jade.active,'pendant'),before=s.coins;
 const crafting=take(s,'jade-craft-pendant');assert.equal(crafting.ok,true);
 s=crafting.state;assert.equal(s.coins,before-cost);
 assert.equal(s.jade.active.phase,'crafted');
 assert.equal(take(s,'jade-craft-pendant').ok,false);
 const wallet=s.coins;
 const exhibit=take(s,'jade-exhibit');assert.equal(exhibit.ok,true);
 assert.equal(exhibit.state.coins,wallet);
 assert.equal(exhibit.state.jade.exhibits.length,1);
 assert.equal(exhibit.state.jade.active,null);
 assert.equal(take(exhibit.state,'jade-exhibit').ok,false);
 const again=arcade.norm(JSON.parse(JSON.stringify(exhibit.state)),TIME);
 assert.equal(again.jade.exhibits.length,1);
});

test('C4.4 progression locks all four advanced markets until genuine local milestones',()=>{
 let s=arcade.fresh(TIME);s.coins=999999;
 for(let site=1;site<=4;site++)assert.equal(take(s,'jade-buy-'+site).ok,false);
 s.jade.sold=3;assert.equal(jade.unlocked(s.jade,1),false);
 s.jade.lamp=2;assert.equal(jade.unlocked(s.jade,1),true);
 s.jade.sold=12;s.jade.saw=2;assert.equal(jade.unlocked(s.jade,2),true);
 s.jade.sold=25;s.jade.lamp=3;s.jade.carver=2;
 assert.equal(jade.unlocked(s.jade,3),true);
 assert.equal(jade.unlocked(s.jade,4),false);
 const permit=take(s,'jade-upgrade-permit');assert.equal(permit.ok,true);s=permit.state;
 s.jade.sold=40;assert.equal(jade.unlocked(s.jade,4),true);
});

test('C4.4 market odds retain ~70% dud rocks and grade x color taxonomy is stable',()=>{
 const rocks=Array.from({length:2000},(_,i)=>jade.generate(0,i+1,i/2000));
 const dud=rocks.filter(x=>x.grade===0).length;
 assert.ok(dud>1200&&dud<1600,'Beginner dud rock rate should be near 70%');
 assert.equal(jade.GRADES.length,8);assert.equal(jade.COLORS.length,8);
 assert.ok(rocks.every(x=>x.color!==6),'Imperial green is reserved for late-game sites');
 assert.ok(rocks.every(x=>x.seed>=0&&x.seed<=4294967295));
});

test('C4.4 jade mobile panel includes interactive scans, workshop and collector, with four-tab integration',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 let s=arcade.fresh(TIME);
 let html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/data-arcade-action="jade-buy-0"/);
 assert.match(html,/data-arcade-panel="jade-market"/);
 assert.match(html,/data-arcade-panel="jade-workshop"/);
 assert.match(html,/data-arcade-panel="jade-gallery"/);
 s=take(s,'jade-buy-0',promising()).state;
 html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/data-arcade-action="jade-scan-0"/);
 assert.match(html,/data-arcade-action="jade-window"/);
 assert.match(html,/data-arcade-action="jade-cut"/);
 assert.match(html,/jade-lantern-left/);
});
