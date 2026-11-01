'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const arcade=require('../js/personal-arcade-core-v1.js');
const sim=require('../tools/arcade-balance-c440b.cjs');
const TIME=1793510000000;
const act=(s,a,t=TIME,roll=.5)=>arcade.act(s,a,t,roll);
const copy=s=>JSON.parse(JSON.stringify(s));

test('C4.42 mining rewards one ore roll per tap, even for two rapid intentional taps',()=>{
 let state=arcade.fresh(TIME);
 const first=act(state,'mine',TIME,.88);
 assert.equal(first.ok,true);
 state=first.state;
 const second=act(state,'mine',TIME,.99);
 assert.equal(second.ok,true);
 assert.equal(second.state.mine.durability,state.mine.durability-1);
 assert.equal(second.state.mine.dug,2);
 assert.equal(second.state.mine.charge,2);
 const saved=arcade.norm(copy(state),TIME+400);
 assert.equal(saved.mine.nextDigAt,0,'Old tap cooldown is no longer armed');
 const next=act(saved,'mine',TIME+400,.88);
 assert.equal(next.ok,true);
 assert.equal(next.state.mine.dug,2);
 assert.equal(next.state.coins,0);
 assert.equal(arcade.advance(next.state,TIME+3600000,0).coins,0,
  'Mining does not mint money while the browser is closed');
});

test('C4.41B seam takes five charge, no automatic rare boost, and wrong choices cost durability',()=>{
 let state=arcade.fresh(TIME);
 state.mine.charge=3;
 const branch=arcade.mineProbeTarget(state.mine);
 assert.equal(act(state,'mine-probe-'+branch,TIME,.8).ok,false);
 state.mine.charge=5;
 const hit=act(state,'mine-probe-'+branch,TIME,.8);
 assert.equal(hit.ok,true);
 assert.equal(hit.hit,true);
 assert.equal(hit.state.mine.charge,0);
 assert.equal(hit.ore,'iron','No hidden +0.12 rare-roll bonus');
 assert.equal(hit.quantity,2);
 assert.equal(hit.state.mine.durability,99);
 state=hit.state;state.mine.charge=5;
 const wrong=act(state,'mine-probe-'+((arcade.mineProbeTarget(state.mine)+1)%3),
  TIME+arcade.MINE_DIG_INTERVAL,.9);
 assert.equal(wrong.ok,true);assert.equal(wrong.hit,false);
 assert.equal(wrong.state.mine.charge,0);
 assert.equal(wrong.state.mine.durability,98);
});

test('C4.41B repair demands new ingredients but keeps old inventory and an existing repair timer',()=>{
 let state=arcade.fresh(TIME);state.mine.durability=12;
 state.mine.ores.coal=12;state.mine.ores.iron=8;
 assert.equal(act(state,'repair-forge').ok,false,'Copper is now mandatory');
 state.mine.ores.copper=2;
 const forged=act(state,'repair-forge');
 assert.equal(forged.ok,true);
 assert.equal(forged.state.mine.durability,100);
 assert.equal(forged.state.mine.ores.coal,0);
 assert.equal(forged.state.mine.ores.iron,0);
 assert.equal(forged.state.mine.ores.copper,0);
 state=arcade.fresh(TIME);state.mine.repairUntil=TIME+240000;
 assert.equal(arcade.norm(copy(state),TIME).mine.repairUntil,TIME+240000,
  'A repair started before this update is not extended');
 const old=arcade.fresh(TIME);old.coins=12450;old.earned=30000;
 old.mine.ores.relic=1;old.mine.found.relic=1;delete old.mine.nextDigAt;
 const retained=arcade.norm(copy(old),TIME);
 assert.equal(retained.mine.ores.relic,1);
 assert.equal(retained.mine.found.relic,1);
 assert.equal(retained.coins,12450);
 assert.equal(retained.earned,30000);
 assert.equal(act(retained,'sell-ores').state.coins,12950,
  'Already mined rare items keep their original sale value');
});

test('C4.41B reproducible mine output is lower, with deeper zones still worthwhile',()=>{
 const starter=sim.mineSample(0);
 const deep=sim.mineSample(2);
 assert.equal(starter.digs,1000);
 assert.equal(deep.digs,1000);
 assert.ok(starter.grossXu<450,'Starter mining no longer yields ~725 Xu per 1000 rapid taps');
 assert.ok(deep.grossXu<2500,'Deep-zone ceiling is reduced from ~6782 Xu');
 assert.ok(deep.grossXu>starter.grossXu*5,'Investing in mine depth still matters');
 assert.equal(starter.per100DigsXu,+((starter.grossXu/10)).toFixed(2));
});

test('C4.41B mine reward sits below branches and market stones have no duplicate floating badge',()=>{
 const root=join(__dirname,'..');
 const index=readFileSync(join(root,'index.html'),'utf8');
 const ui=readFileSync(join(root,'js/personal-arcade-ui-v1.js'),'utf8');
 const jade=readFileSync(join(root,'js/personal-jade-ui-v1.js'),'utf8');
 const css=readFileSync(join(root,'css/arcade-c441b-feedback.css'),'utf8');
 assert.match(ui,/canProbe=canDig&&m\.charge>=5/);
 assert.match(ui,/Tự sửa · 6 phút/);
 assert.match(ui,/12 than \+ 8 sắt \+ 2 đồng/);
 assert.match(ui,/\/\^\(mine\|mine-burst\|mine-probe-\[012\]\)\$\//,
  'Success feedback should not duplicate an on-screen floating toast');
 assert.match(css,/\.mine-seam-game \.mine-seam-result\{[\s\S]*?position:relative;inset:auto/);
 assert.doesNotMatch(jade,/<span class="jade-stall-banner">/);
 assert.match(jade,/class="jade-market-copy"><b>\$\{m\.name\}<\/b>/);
 assert.match(index,/personal-jade-ui-v1\.js\?[^"\n]*market=c441b-1/);
});
