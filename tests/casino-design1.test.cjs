'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const casino=require('../js/dudu-casino-design-v1.js');
const text=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('CASINO-DESIGN1 symbol weights and baseline payout are transparent and below 100%',()=>{
 const check=casino.validate();
 assert.equal(check.ok,true);
 assert.equal(check.symbolSum,100);
 assert.equal(casino.SYMBOLS.length,7);
 assert.ok(Math.abs(casino.slotRtp()-.920784)<1e-10);
 assert.ok(casino.slotRtp()<1&&casino.slotRtp()>.9);
 assert.deepEqual(casino.BETS,[10,20,50]);
});

test('CASINO-DESIGN1 slots pay only the three horizontal lines, never a hidden diagonal',()=>{
 const rows=[['star','star','star'],['bell','bell','peach'],
  ['dragon','phoenix','crown']];
 const result=casino.slotQuote({bet:10,rows});
 assert.equal(result.ok,true);
 assert.deepEqual(result.lines.map(line=>[line.kind,line.payout]),
  [['triple',50],['pair',1],['none',0]]);
 assert.equal(result.payout,51);
 assert.equal(result.net,41);
 assert.equal(result.outcome,'win');
 const diagonal=casino.slotQuote({bet:10,rows:[
  ['star','peach','bell'],['dragon','star','crown'],['jade','bell','star']]});
 assert.equal(diagonal.payout,0);
 assert.equal(diagonal.outcome,'loss');
});

test('CASINO-DESIGN1 picks precommitted reel values and never rerolls on evaluation',()=>{
 assert.equal(casino.pick(0),'star');
 assert.equal(casino.pick(259999),'star');
 assert.equal(casino.pick(260000),'bell');
 assert.equal(casino.pick(999999),'crown');
 assert.equal(casino.pick(-1),null);
 assert.equal(casino.pick(1000000),null);
 const rolls=[0,0,0,260000,260000,480000,700000,800000,900000];
 const image=casino.grid(rolls);
 assert.deepEqual(image,[['star','star','star'],['bell','bell','peach'],
  ['jade','dragon','phoenix']]);
 assert.equal(casino.grid([0]),null);
 assert.equal(casino.slotQuote({bet:9,rows:image}).ok,false);
 assert.equal(casino.slotQuote({bet:10,rows:[['star','star','invalid']]}).ok,false);
});

test('CASINO-DESIGN1 tower cash-out amounts and survival rates are bounded',()=>{
 const odds=casino.towerRtp();
 assert.equal(odds.length,5);
 assert.ok(odds.every(x=>x.rtp>.8&&x.rtp<1));
 assert.ok(Math.abs(odds[4].reach-1/27)<1e-12);
 assert.deepEqual(casino.TOWER.map(t=>[t.safe,t.gates,t.multiplierTenths]),
  [[2,3,13],[2,3,20],[1,2,40],[1,2,80],[1,3,240]]);
 assert.equal(casino.towerQuote({bet:10,floor:1}).payout,13);
 assert.equal(casino.towerQuote({bet:50,floor:5}).payout,1200);
 assert.equal(casino.towerQuote({bet:1,floor:5}).ok,false);
 assert.equal(casino.towerQuote({bet:10,floor:6}).ok,false);
});

test('CASINO-DESIGN1 shop is a proposal, never an open-ended money multiplier',()=>{
 const ids=casino.SHOP.map(item=>item.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(casino.SHOP.length,8);
 assert.equal(casino.SHOP.filter(item=>item.category==='consumable').length,4);
 assert.equal(casino.SHOP.filter(item=>item.category==='decor').length,4);
 assert.ok(casino.SHOP.filter(item=>item.category==='decor')
  .every(item=>item.effect==='visual-only'&&item.limit==='permanent'));
 assert.ok(casino.SHOP.filter(item=>item.category==='consumable')
  .every(item=>item.limit==='one-per-spin'||item.limit==='one-per-run'));
 assert.equal(casino.item('casino-lens').game,'tower');
 assert.equal(casino.item('missing'),null);
});

test('CASINO-DESIGN1 is inert; leaves all existing games, account and Firestore rules alone',()=>{
 const html=text('index.html'),source=text('js/dudu-casino-design-v1.js');
 assert.doesNotMatch(html,/src="js\/dudu-casino-design-v1\.js/);
 assert.doesNotMatch(source,/\.currency\s*=|runTransaction\(|\.update\(|\.set\(/);
 assert.match(html,/js\/dudu-fate-tower-ui-v1\.js\?v=fun-tower1/);
 assert.match(html,/js\/personal-scratch-c28\.js/);
 assert.match(html,/js\/personal-blind-box-c29\.js/);
 assert.match(html,/DUDU_ACCOUNT_APPROVAL_V1_READY\s*=\s*false/);
 assert.doesNotMatch(text('firestore.rules'),/match \/approved_accounts_v1\/\{uid\}/);
 assert.match(text('firestore.rules'),/deletingOwnedBook\(storyId\)/);
 assert.match(text('docs/dudu-casino-fantasy-v1-plan.md'),/KHÔNG kích hoạt cược Xu/);
});
