'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const START=Date.now()+10000;
const sample=id=>({...jade.generate(0,id,.421),phase:'cut',grade:5,color:3,
 size:8,flaw:'perfect',cutValue:3500});
const copy=value=>JSON.parse(JSON.stringify(value));

test('C4.53 real craft durations scale with product and jade tier, upgraded carver still needs 60s',()=>{
 const low={grade:1},rare={grade:7};
 assert.equal(jade.craftDuration(low,'ring',1),60000);
 assert.ok(jade.craftDuration(rare,'ring',1)>jade.craftDuration(low,'ring',1));
 assert.ok(jade.craftDuration(rare,'bangle',1)>jade.craftDuration(rare,'pendant',1));
 assert.ok(jade.craftDuration(rare,'ring',4)>=60000);
 assert.ok(jade.craftDuration(rare,'ring',4)<jade.craftDuration(rare,'ring',1));
});

test('C4.53 crafting is paid once, persists through other Arcade games and reload, then claims once',()=>{
 let s=arcade.fresh(START);s.coins=10000;s.jade.active=sample(101);
 const fee=jade.craftFee(s.jade.active,'ring');
 const base=s.coins,begin=arcade.act(s,'jade-craft-ring',START);
 assert.equal(begin.ok,true);s=begin.state;
 const job=copy(s.jade.craftJob);
 assert.equal(s.coins,base-fee);
 assert.equal(s.jade.active,null);
 assert.equal(s.jade.vault.length,0);
 assert.equal(arcade.act(s,'jade-claim-craft',START+1000).ok,false);
 assert.equal(s.jade.craftJob.readyAt,job.readyAt);
 s=arcade.act(s,'toggle-neon',START+2000).state;
 s=arcade.norm(copy(s),START+3000);
 assert.deepEqual(s.jade.craftJob,job,'Workshop clock and stone are still saved');
 const wallet=s.coins;
 const receive=arcade.act(s,'jade-claim-craft',job.readyAt);
 assert.equal(receive.ok,true);s=receive.state;
 assert.equal(s.coins,wallet,'Receiving is not another charge or free payout');
 assert.equal(s.jade.craftJob,null);
 assert.equal(s.jade.vault.length,1);
 assert.equal(s.jade.vault[0].phase,'crafted');
 assert.equal(s.jade.vault[0].id,101);
 assert.equal(arcade.act(s,'jade-claim-craft',job.readyAt+1).ok,false);
 assert.equal(s.jade.vault.length,1,'Cannot duplicate completed craft');
});

test('C4.53 occupied bench rejects second order and a full vault holds the finished job',()=>{
 let s=arcade.fresh(START);s.coins=100000;s.jade.active=sample(12);
 s=arcade.act(s,'jade-craft-bangle',START).state;
 const job=copy(s.jade.craftJob);
 s.jade.active=sample(13);
 const before=s.coins;
 assert.equal(arcade.act(s,'jade-craft-ring',START+1000).ok,false);
 assert.equal(s.coins,before);
 s.jade.vault=Array.from({length:jade.MAX_VAULT},(_,i)=>sample(100+i));
 assert.equal(arcade.act(s,'jade-claim-craft',job.readyAt).ok,false);
 assert.equal(s.jade.craftJob.stone.id,job.stone.id);
 s.jade.vault.pop();
 const completed=arcade.act(s,'jade-claim-craft',job.readyAt+1);
 assert.equal(completed.ok,true);s=completed.state;
 assert.equal(s.jade.vault.length,jade.MAX_VAULT);
});

test('C4.53 old crafted saves remain valid, invalid or duplicate pending jobs cannot multiply stones',()=>{
 const s=jade.fresh(),crafted={...sample(42),phase:'crafted',craft:'ring',craftValue:4500};
 s.vault=[crafted];s.craftJob={stone:sample(42),type:'ring',startedAt:START,
  readyAt:START+60000,value:4200};
 const fixed=jade.norm(s);
 assert.equal(fixed.vault.length,0,'A held job ID cannot also occupy the vault');
 assert.equal(fixed.craftJob.stone.id,42);
 s.craftJob={...s.craftJob,readyAt:START+3600000};
 const rejected=jade.norm(s);
 assert.equal(rejected.craftJob,null,'Implausible unfinished jobs are discarded');
 assert.equal(rejected.vault[0].phase,'crafted','Legacy finished pieces are preserved');
});

test('C4.53 Ngọc Phường renders a live workshop timer and a clear claim path',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 let s=arcade.fresh(START);s.coins=10000;s.jade.active=sample(51);
 s=arcade.act(s,'jade-craft-pendant',START).state;
 const html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/jade-work-order/);
 assert.match(html,/data-arcade-until=/);
 assert.match(html,/jade-claim-craft/);
 assert.match(html,/chơi game khác vẫn tính giờ/);
 assert.match(html,/Đang chế tác/);
});
