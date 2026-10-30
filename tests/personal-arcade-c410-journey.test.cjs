'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const honor=require('../js/personal-honor-c46.js');
const TIME=1793360000000;
const doAct=(s,action,time=TIME,roll=.5)=>{
 const result=arcade.act(s,action,time,roll);
 assert.equal(result.ok,true,action+': '+result.reason);
 return result.state;
};
const achievement=(s,id)=>honor.view({},s).achievements.find(a=>a.id===id);
const title=(s,id)=>honor.view({},s).titles.find(t=>t.id===id);
const goodRoll=()=>{
 for(let n=0;n<100000;n++){
  const roll=n/100000,stone=jade.generate(0,1,roll);
  if(stone.grade>=2&&stone.flaw!=='skin'&&stone.flaw!=='fracture'&&stone.size>=5)
   return roll;
 }
 throw Error('Expected at least one workable stone');
};

test('C4.10 Neon journey: expand rooms, receive one-time contracts and unlock rare title',()=>{
 let s=arcade.fresh(TIME);s.coins=500000;
 for(const action of ['cpu','station','router','router','station'])s=doAct(s,action);
 for(let i=0;i<3;i++)s=doAct(s,'neon-contract-'+i);
 assert.equal(s.neon.contracts.length,3);
 assert.equal(achievement(s,'neon-all-contracts').unlocked,true);
 s=arcade.advance(s,TIME+25*45000,25*45000);
 s=doAct(s,'neon-milestone-0',TIME+25*45000);
 s=doAct(s,'room-tier',TIME+25*45000);
 for(const action of ['station','station'])s=doAct(s,action,TIME+25*45000);
 s=arcade.advance(s,TIME+100*45000,75*45000);
 for(const i of [1,2])s=doAct(s,'neon-milestone-'+i,TIME+100*45000);
 s=doAct(s,'room-tier',TIME+100*45000);
 s=doAct(s,'neon-milestone-3',TIME+100*45000);
 s=arcade.advance(s,TIME+250*45000,150*45000);
 assert.equal(achievement(s,'neon-crown').unlocked,true);
 assert.equal(title(s,'neon-emperor').unlocked,true);
 assert.equal(s.neon.roomTier,3);
 assert.equal(s.neon.milestones.length,4);
 assert.equal(arcade.act(s,'neon-milestone-3',TIME+250*45000).ok,false,
  'Already claimed rewards cannot be minted twice');
});

test('C4.10 Mine journey: digs survive repairs and unlocking the deep zone is not blocked',()=>{
 let s=arcade.fresh(TIME);s.coins=200000;let time=TIME;
 for(let i=0;i<160;i++){
  if(s.mine.durability===0){
   s=doAct(s,'repair-wait',time);
   time+=arcade.REPAIR_INTERVAL;
   s=arcade.advance(s,time,0);
  }
  if(i===40){
   s=doAct(s,'lantern',time);
   s=doAct(s,'mine-zone-1',time);
  }
  s=doAct(s,'mine',time,i%3===0?.99:i%3===1?.5:.05);
 }
 s=doAct(s,'lantern',time);
 s=doAct(s,'mine-zone-2',time);
 assert.equal(s.mine.dug,160);
 assert.equal(s.mine.zone,2);
 assert.equal(achievement(s,'mine-160').unlocked,true);
 assert.equal(achievement(s,'mine-deep-ready').unlocked,true);
 const before=s.coins;s=doAct(s,'sell-ores',time);
 assert.ok(s.coins>before,'Selling mined ores adds fictional Arcade Xu');
 assert.equal(arcade.act(s,'sell-ores',time).ok,false,'Cannot sell an emptied bag twice');
});

test('C4.10 Garden journey: plant, mature, fish, collect and unlock fish achievements',()=>{
 let s=arcade.fresh(TIME);
 s=doAct(s,'plant-0');s=doAct(s,'water-0');
 const mature=TIME+arcade.GROW_INTERVAL;
 s=arcade.advance(s,mature,0);
 s=doAct(s,'harvest-0',mature);
 assert.equal(s.garden.harvests,1);
 assert.equal(s.coins,50);
 s=doAct(s,'catch-bubble',mature);
 assert.equal(s.garden.bait,1);
 s=doAct(s,'cast-line',mature,.999);
 const before=s.garden.fish;
 assert.equal(arcade.act(s,'reel-line',mature).ok,false,'Cannot reel before bite');
 s=arcade.advance(s,mature+6500,0);
 s=doAct(s,'reel-line',mature+6500);
 assert.equal(s.garden.fish,before+1);
 assert.equal(achievement(s,'garden-one').unlocked,true);
 assert.equal(achievement(s,'garden-dragon').unlocked,true);
 assert.equal(title(s,'garden-legend').unlocked,true);
 assert.equal(s.garden.line,null,'Fishing line is cleared after a successful catch');
});

test('C4.10 Jade journey: first free rock, three clues, cut/sell and title on the same wallet',()=>{
 let s=arcade.fresh(TIME);s=doAct(s,'jade-buy-0',TIME,goodRoll());
 for(let i=0;i<3;i++)s=doAct(s,'jade-scan-'+i);
 assert.deepEqual(s.jade.active.scans,[true,true,true]);
 s=doAct(s,'jade-cut');
 assert.ok(s.jade.active.cutValue>0);
 const earned=s.earned;
 s=doAct(s,'jade-sell');
 assert.ok(s.earned>earned);
 assert.equal(achievement(s,'jade-first').unlocked,true);
 assert.equal(title(s,'jade-appraiser').unlocked,true);
 const wallet=s.coins;
 s=doAct(s,'plant-0');s=doAct(s,'water-0');
 s=arcade.advance(s,TIME+arcade.GROW_INTERVAL,0);
 s=doAct(s,'harvest-0',TIME+arcade.GROW_INTERVAL);
 assert.equal(s.coins,wallet+50,'Garden harvest feeds the same Arcade wallet');
 assert.equal(honor.view({},s).earned.includes('jade-first'),true);
 assert.equal(s.version,1,'Shared legacy save schema stays intact');
});
