'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const season=require('../js/personal-arcade-season-c423.js');
const arcade=require('../js/personal-arcade-core-v1.js');
const TIME=1793437200000;

test('C4.23 Mùa 1 has four distinct non-spendable proofs and a launch gate',()=>{
 assert.equal(season.PHASE,'preview','No rewards before the pilot reset and Rules review');
 assert.equal(season.RELICS.length,4);
 assert.deepEqual(season.RELICS.map(x=>x.id),['neon','mine','garden','jade']);
 assert.equal(new Set(season.RELICS.map(x=>x.name)).size,4);
 assert.equal(arcade.fresh(TIME).season.records.s01.relics.length,0);
 let s=arcade.fresh(TIME);
 s=arcade.act(s,'neon-order-0',TIME).state;
 s=arcade.act(s,'neon-order-1',TIME).state;
 assert.deepEqual(s.season.records.s01.relics,[],
  'Even real game progress cannot claim Season 01 during the preview');
 assert.equal(s.neon.orderWon,1,'The new gate does not block existing gameplay');
});

test('C4.23 an action must complete its actual game milestone to claim its corresponding relic',()=>{
 let album=season.fresh();
 const base=arcade.fresh(TIME);
 const verify=(action,before,after,expected)=>{
  const won=season.record(album,action,before,after,TIME,true);
  assert.equal(won.award,expected);
  album=won.state;
  return won;
 };
 assert.equal(verify('neon-order-0',base,base,null).completed,false);
 const neonStart=arcade.fresh(TIME);neonStart.neon.orderRound=2;
 const served=arcade.fresh(TIME);served.neon.orderRound=3;served.neon.orderWon=1;
 verify('neon-order-1',base,served,null,'Normal orders cannot claim a rare season token');
 verify('neon-order-1',neonStart,served,'neon');
 verify('neon-order-1',neonStart,served,null);
 const mineStart=arcade.fresh(TIME);mineStart.mine.probes=2;
 const mined=arcade.fresh(TIME);mined.mine.probes=3;mined.mine.probeHits=1;
 verify('mine-probe-1',mineStart,mined,'mine');
 const grown=arcade.fresh(TIME);grown.garden.harvests=3;
 const gardenStart=arcade.fresh(TIME);gardenStart.garden.harvests=2;
 verify('harvest-0',gardenStart,grown,'garden');
 const jadeStart=arcade.fresh(TIME);jadeStart.jade.cut=2;
 const cut=arcade.fresh(TIME);cut.jade.cut=3;
 const completed=verify('jade-cut',jadeStart,cut,'jade');
 assert.equal(completed.completed,true);
 assert.equal(album.records.s01.completedAt,TIME);
 assert.deepEqual(album.records.s01.relics,['neon','mine','garden','jade']);
 assert.equal(season.record(album,'jade-cut',jadeStart,cut,TIME+1,true).award,null,
  'An earned relic cannot be received twice');
});

test('C4.23 seasonal archive sanitizes tampered and stale records',()=>{
 const raw={version:1,records:{s01:{relics:['mine','mine','bad','neon'],
  firstAt:TIME+100000,completedAt:TIME+100000}}};
 const clean=season.norm(raw,TIME);
 assert.deepEqual(clean.records.s01.relics,['neon','mine']);
 assert.equal(clean.records.s01.completedAt,0,'No completed seal with an incomplete collection');
 assert.equal(clean.records.s01.firstAt,TIME);
 const state=arcade.fresh(TIME);
 state.season=clean;
 assert.deepEqual(arcade.norm(state,TIME).season,clean,'The account-local album survives reload');
});

test('C4.23 passport fits existing Arcade without changing EPUB/Rules or main wallet',()=>{
 const dir=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const ui=fs.readFileSync(path.join(dir,'js/personal-arcade-ui-v1.js'),'utf8');
 const css=fs.readFileSync(path.join(dir,'css/arcade-season-c423.css'),'utf8');
 assert.match(html,/personal-arcade-season-c423\.js\?v=c423-1/);
 assert.match(html,/personal-arcade-core-v1\.js\?v=c423-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c423-1/);
 assert.match(html,/arcade-season-c423\.css\?v=c423-1/);
 assert.match(html,/id="arcade-season-portal-c423"/);
 assert.match(ui,/data-arcade-season-go/);
 assert.match(ui,/HỘ CHIẾU MÙA 01/);
 assert.match(ui,/seasonOpen\?seasonPanel\(s\)/);
 assert.match(css,/\.arcade-season-book-scroll\{/);
 assert.match(css,/\.arcade-season-relic-grid\{/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.doesNotMatch(ui,/profile\.currency\s*[+\-]=/);
});
