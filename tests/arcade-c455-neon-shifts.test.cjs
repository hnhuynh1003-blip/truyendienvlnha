'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const T=1793710000000;
const clone=s=>JSON.parse(JSON.stringify(s));
const act=(s,a,t=T)=>arcade.act(s,a,t);
const playArrows=(s,start)=>{
 const pattern=arcade.neonBeatPattern(s.neon);
 for(let i=0;i<pattern.length;i++){
  const r=act(s,'neon-beat-'+pattern[i],start+200*(i+1));
  assert.equal(r.ok,true,'direction '+i);s=r.state;
 }
 return s;
};

test('C4.55 retains the C4.41B legacy mode and unlocks advanced shifts through upgrades',()=>{
 const s=arcade.fresh(T);
 assert.equal(s.neon.beatMode,0);
 assert.equal(arcade.neonBeatPattern(s.neon).length,3);
 assert.equal(arcade.neonBeatWindow(s.neon),12000);
 assert.ok(arcade.neonBeatReward({...s.neon,orderStreak:1})>=30,
  'The visible default shift pays at least 3 Tiền Xanh, not 0.3');
 assert.equal(arcade.neonStyleUnlocked(s.neon,1),true);
 assert.equal(arcade.neonStyleUnlocked(s.neon,2),false);
 assert.equal(act(s,'neon-style-2').ok,false);
 const chosen=act(s,'neon-style-1');assert.equal(chosen.ok,true);
 assert.equal(chosen.state.neon.beatMode,1);
 assert.equal(arcade.neonBeatPattern(chosen.state.neon).length,4);
 assert.equal(arcade.neonBeatWindow(chosen.state.neon),13300);
});

test('C4.55 Tốc chiến uses unique deterministic arrow patterns and requires final SPACE timing',()=>{
 let s=act(arcade.fresh(T),'neon-style-1').state;
 const first=arcade.neonBeatPattern(s.neon);
 assert.deepEqual(arcade.neonBeatPattern(s.neon),first);
 s=act(s,'neon-beat-start').state;
 assert.equal(act(s,'neon-style-0',T+1).ok,false,'Shift choice locked during a live ticket');
 s=playArrows(s,T);
 assert.equal(s.neon.orderWon,0,'Directions alone do not award coins');
 assert.equal(s.neon.beatStep,first.length);
 assert.equal(s.coins,0);
 s=arcade.norm(clone(s),T+2000);
 assert.equal(s.neon.beatStep,first.length,'Reload keeps the finish stage');
 assert.deepEqual(arcade.neonBeatPattern(s.neon),first,'The active ticket does not reroll');
 const zone=arcade.neonBeatZone(s.neon);
 const when=T+Math.round(arcade.neonBeatWindow(s.neon)*(zone.start+zone.end)/2);
 const expected=arcade.neonBeatReward({...s.neon,orderStreak:1},true);
 const final=act(s,'neon-beat-finish',when);
 assert.equal(final.ok,true);s=final.state;
 assert.match(final.label,/PERFECT/);
 assert.equal(s.coins,expected);
 assert.equal(s.neon.orderWon,1);
 assert.equal(s.neon.orderStreak,1);
 assert.equal(s.neon.beatUntil,0);
 assert.ok(s.neon.orderReadyAt-when<60000,'Next guest arrives sooner than old 90s idle');
 assert.notDeepEqual(arcade.neonBeatPattern(s.neon),first,'Next ticket changes its pattern');
 assert.equal(act(s,'neon-beat-finish',when+1).ok,false,'No double-claim by pressing SPACE again');
 assert.equal(arcade.norm(clone(s),when+2).coins,expected);
});

test('C4.55 failed final strike loses streak without payout and cannot be spammed',()=>{
 let s=act(arcade.fresh(T),'neon-style-1').state;
 s=act(s,'neon-beat-start').state;
 s=playArrows(s,T);
 const early=act(s,'neon-beat-finish',T+1800);
 assert.equal(early.ok,true);s=early.state;
 assert.match(early.label,/Lệch/);
 assert.equal(s.coins,0);assert.equal(s.neon.orderWon,0);
 assert.equal(s.neon.orderStreak,0);
 assert.equal(s.neon.beatUntil,0);
 assert.equal(act(s,'neon-beat-finish',T+2000).ok,false);
 assert.equal(act(s,'neon-beat-start',T+2000).ok,false);
});

test('C4.55 VIP shift has longer sequences, shorter timing zone, larger skill payout',()=>{
 const s=arcade.fresh(T);s.neon.roomTier=2;s.neon.router=2;
 let upgraded=arcade.norm(s,T);
 const chosen=act(upgraded,'neon-style-2');assert.equal(chosen.ok,true);
 upgraded=chosen.state;
 assert.equal(arcade.neonBeatPattern(upgraded.neon).length,6);
 assert.equal(arcade.neonBeatWindow(upgraded.neon),9500);
 const zone=arcade.neonBeatZone(upgraded.neon);
 assert.ok(zone.end-zone.start<.3);
 assert.ok(arcade.neonBeatReward({...upgraded.neon,orderStreak:1},true)>70);
 upgraded=act(upgraded,'neon-beat-start').state;
 upgraded=playArrows(upgraded,T);
 const finish=T+Math.round(arcade.neonBeatWindow(upgraded.neon)*(zone.start+zone.end)/2);
 const got=act(upgraded,'neon-beat-finish',finish);
 assert.equal(got.ok,true);assert.match(got.label,/PERFECT/);
 assert.ok(got.state.coins>70);
});

test('C4.55 mobile counter and compact Jade hunt controls are present without extra explanatory cards',()=>{
 const ui=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 const jadeUI=readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/personal-arcade-v1.css'),'utf8');
 assert.match(ui,/data-arcade-action="neon-style-\$\{i\}"/);
 assert.match(ui,/data-arcade-action="neon-beat-\$\{i\}"/);
 assert.match(ui,/data-neon-beat-meter/);
 assert.match(ui,/neon-beat-finish/);
 assert.match(jadeUI,/jade-hunt-footer/);
 assert.match(jadeUI,/jade-hunt-note/);
 assert.match(css,/\.neon-hit-target/);
 assert.match(css,/\.jade-hunt-card\{display:grid;gap:5px/);
 assert.doesNotMatch(jadeUI,/Ba tuyến thám ngọc\. Một túi niêm phong/);
 assert.doesNotMatch(jadeUI,/Mỗi viên đá ẩn một câu chuyện/);
 assert.match(jadeUI,/jade-welcome-compact/);
 assert.match(ui,/\['Tập',0\]/);
 assert.match(css,/height:26px;min-height:26px/);
});

test('C4.55b compact first-stone dock preserves separate free sample and market navigation',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8'),{window});
 const html=window.DuduPersonalJadeUIV1.panel(arcade.fresh(T));
 assert.match(html,/jade-welcome jade-welcome-compact/);
 assert.match(html,/data-arcade-action="jade-buy-0"/);
 assert.match(html,/data-arcade-action="jade-open-market"/);
 assert.match(html,/aria-label="Vào chợ đá"/);
 assert.doesNotMatch(html,/Mỗi viên đá ẩn một câu chuyện/);
});
