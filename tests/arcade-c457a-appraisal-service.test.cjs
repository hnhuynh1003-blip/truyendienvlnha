'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const TIME=1793360000000;
const act=(state,action,roll=.37)=>arcade.act(state,action,TIME,roll);

test('C4.57a Neon really pays 1.2 green currency per first completed 45s service',()=>{
 const start=arcade.fresh(TIME),svc=arcade.neonService(start.neon);
 assert.equal(svc.profit,12,'Arcade amounts are stored in tenths: 12 means 1.2 Tiền Xanh');
 const next=arcade.advance(start,TIME+arcade.NEON_SERVICE_INTERVAL,
  arcade.NEON_SERVICE_INTERVAL);
 assert.equal(next.neon.guestsServed,1);
 assert.equal(next.neon.serviceRevenue,svc.revenue);
 assert.equal(next.neon.operatingExpense,svc.expense);
 assert.equal(next.coins,Math.floor(arcade.rate(start)*arcade.NEON_SERVICE_INTERVAL/100000)+svc.profit);
 const again=arcade.advance(next,TIME+arcade.NEON_SERVICE_INTERVAL,
  arcade.NEON_SERVICE_INTERVAL);
 assert.equal(again.coins,next.coins,'The same service cannot be paid twice');
 const better={...start.neon,snack:1,ambiance:2};
 assert.ok(arcade.neonService(better).profit>svc.profit);
});

test('C4.57a only two unique scans unlock one irrevocable forecast before cutting',()=>{
 let s=arcade.fresh(TIME);s=act(s,'jade-buy-0').state;
 assert.equal(act(s,'jade-forecast-0').ok,false);
 s=act(s,'jade-scan-0').state;
 assert.equal(act(s,'jade-forecast-0').ok,false);
 s=act(s,'jade-scan-1').state;
 assert.equal(act(s,'jade-forecast-1').ok,true);
 s=act(s,'jade-forecast-1').state;
 assert.equal(s.jade.active.forecast,1);
 assert.equal(act(s,'jade-forecast-0').ok,false);
 const restored=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(restored.jade.active.forecast,1);
 assert.equal(restored.jade.forecasts.total,0,'Predictions count only after a real reveal');
});

test('C4.57a correct prediction yields a one-shot capped paid bonus',()=>{
 let s=arcade.fresh(TIME);s.coins=1000;
 s=act(s,'jade-buy-0').state;s=act(s,'jade-cut').state;s=act(s,'jade-sell').state;
 s=act(s,'jade-buy-0').state;
 s.jade.active.grade=2;s.jade.active.flaw='perfect';
 s=act(s,'jade-scan-0').state;s=act(s,'jade-scan-1').state;
 s=act(s,'jade-forecast-1').state;
 const pre=s.coins,cut=act(s,'jade-cut');assert.equal(cut.ok,true);
 s=cut.state;const stone=s.jade.active;
 assert.equal(stone.forecastWon,true);
 assert.ok(stone.forecastBonus>0);
 assert.ok(stone.forecastBonus<=Math.round(jade.MARKETS[0].price*.15));
 assert.equal(s.coins,pre-jade.actionFee(stone,'cut')+stone.forecastBonus);
 assert.deepEqual(s.jade.forecasts,{total:1,correct:1,streak:1,best:1});
 assert.equal(act(s,'jade-cut').ok,false);
 const restored=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(restored.jade.active.forecastWon,true);
 assert.equal(restored.jade.active.forecastBonus,stone.forecastBonus);
 assert.equal(restored.jade.forecasts.correct,1);
});

test('C4.57a incorrect guess, free practice and old saves never create extra money',()=>{
 let s=arcade.fresh(TIME);s=act(s,'jade-buy-0').state;
 s.jade.active.grade=0;s.jade.active.flaw='perfect';
 s=act(s,'jade-scan-0').state;s=act(s,'jade-scan-1').state;
 s=act(s,'jade-forecast-2').state;
 const before=s.coins;
 s=act(s,'jade-cut').state;
 assert.equal(s.jade.active.forecastWon,false);
 assert.equal(s.jade.active.forecastBonus,0);
 assert.equal(s.coins,before);
 assert.deepEqual(s.jade.forecasts,{total:1,correct:0,streak:0,best:0});
 const legacy=arcade.fresh(TIME);delete legacy.jade.forecasts;
 const normalized=arcade.norm(legacy,TIME);
 assert.equal(normalized.jade.forecasts.total,0);
 assert.equal(normalized.jade.forecasts.correct,0);
});

test('C4.57a a correct guess on the free first stone scores skill, never currency',()=>{
 let s=arcade.fresh(TIME);s=act(s,'jade-buy-0').state;
 s.jade.active.grade=0;s.jade.active.flaw='perfect';
 s=act(s,'jade-scan-0').state;s=act(s,'jade-scan-1').state;
 s=act(s,'jade-forecast-0').state;
 const coins=s.coins;s=act(s,'jade-cut').state;
 assert.equal(s.jade.active.forecastWon,true);
 assert.equal(s.jade.active.forecastBonus,0);
 assert.equal(s.coins,coins);
 assert.equal(s.jade.forecasts.correct,1);
});

test('C4.60e forecast picker lives on the rock and opens only on demand; no duplicate drawer',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 let s=arcade.fresh(TIME);s=act(s,'jade-buy-0').state;
 assert.match(window.DuduPersonalJadeUIV1.panel(s),/data-jade-forecast-toggle/);
 assert.equal(window.DuduPersonalJadeUIV1.toggleForecast(s.jade.active),false);
 s=act(s,'jade-scan-0').state;s=act(s,'jade-scan-1').state;
 assert.doesNotMatch(window.DuduPersonalJadeUIV1.panel(s),/jade-forecast-popover/);
 assert.equal(window.DuduPersonalJadeUIV1.toggleForecast(s.jade.active),true);
 const html=window.DuduPersonalJadeUIV1.panel(s);
 assert.match(html,/jade-forecast-popover/);
 for(let i=0;i<3;i++)assert.match(html,new RegExp('data-arcade-action="jade-forecast-'+i+'"'));
 assert.doesNotMatch(html,/jade-scan-drawer|jade-forecast-console/);
 const index=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(index,/c457a=1/);
});
