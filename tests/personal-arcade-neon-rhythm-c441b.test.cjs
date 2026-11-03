'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const arcade=require('../js/personal-arcade-core-v1.js');
const TIME=1793510000000;
const act=(s,key,t=TIME)=>arcade.act(s,key,t);
const copy=s=>JSON.parse(JSON.stringify(s));

function play(state,at){
 const started=act(state,'neon-beat-start',at);
 assert.equal(started.ok,true);
 state=started.state;
 const sequence=arcade.neonBeatPattern(state.neon);
 for(let i=0;i<sequence.length;i++){
  const result=act(state,'neon-beat-'+sequence[i],at+(i+1)*600);
  assert.equal(result.ok,true,'beat '+i);
  state=result.state;
 }
 return state;
}

test('C4.41B rhythm uses 4 directions, 3/4/5 prompts by room tier and a shrinking timer',()=>{
 for(let tier=1;tier<=3;tier++){
  let state=arcade.fresh(TIME);state.neon.roomTier=tier;
  state=arcade.norm(state,TIME);
  assert.equal(arcade.neonBeatPattern(state.neon).length,tier+2);
  assert.equal(arcade.neonBeatWindow(state.neon),14000-2000*tier);
  const started=act(state,'neon-beat-start',TIME);
  assert.equal(started.ok,true);
  assert.equal(started.state.neon.beatUntil,TIME+arcade.neonBeatWindow(state.neon));
  assert.equal(act(started.state,'neon-beat-start',TIME+50).ok,false);
  assert.equal(act(started.state,'neon-order-0',TIME+50).ok,false,
   'Legacy ticket cannot skip a running rhythm sequence');
 }
});

test('C4.41B correct arrows within deadline complete one real manual order, no idle credit',()=>{
 let state=arcade.fresh(TIME),sequence=arcade.neonBeatPattern(state.neon);
 state=act(state,'neon-beat-start',TIME).state;
 assert.equal(act(state,'neon-beat-'+sequence[1],TIME+500).label.includes('Lệch'),true);
 state=arcade.fresh(TIME);
 state=act(state,'neon-beat-start',TIME).state;
 state=act(state,'neon-beat-'+sequence[0],TIME+500).state;
 assert.equal(state.neon.orderWon,0);
 state=arcade.norm(copy(state),TIME+1000);
 assert.equal(state.neon.beatStep,1,'Ongoing rhythm saves safely');
 for(let i=1;i<sequence.length;i++)state=act(state,'neon-beat-'+sequence[i],TIME+(i+1)*600).state;
 assert.equal(state.neon.orderWon,1);
 assert.equal(state.neon.orderStreak,1);
 assert.equal(state.neon.beatUntil,0);
 const reward=arcade.neonBeatReward({...state.neon,orderRound:state.neon.orderRound-1});
 assert.equal(state.coins,reward,'Only a complete ticket pays the improved default reward');
 assert.ok(reward>=30);
 assert.equal(act(state,'neon-beat-start',TIME+3500).ok,false,'90s cooldown');
 assert.equal(arcade.advance(state,TIME+3600000,0).coins,reward,'No offline earnings');
});

test('C4.41B a wrong direction or expired timer resets event combo and requires a new guest',()=>{
 let state=arcade.fresh(TIME);state.neon.roomTier=3;
 const t=arcade.neonBeatWindow(state.neon);
 state=play(state,TIME);
 assert.equal(state.neon.orderWon,1);
 const nextTime=state.neon.orderReadyAt;
 state=act(state,'neon-beat-start',nextTime).state;
 const first=arcade.neonBeatPattern(state.neon)[0];
 const wrong=act(state,'neon-beat-'+((first+1)%4),nextTime+1000);
 assert.equal(wrong.ok,true);
 state=wrong.state;
 assert.equal(state.neon.orderStreak,0);
 assert.equal(state.neon.orderWon,1);
 assert.equal(state.neon.orderReadyAt,nextTime+1000+30000);
 const thirdTime=state.neon.orderReadyAt;
 state=act(state,'neon-beat-start',thirdTime).state;
 const expired=arcade.advance(state,thirdTime+t+1,0);
 assert.equal(expired.neon.beatUntil,0);
 assert.equal(expired.neon.beatStep,0);
 assert.equal(expired.neon.orderStreak,0);
 assert.equal(expired.neon.orderWon,1);
 assert.ok(expired.neon.orderReadyAt>thirdTime+t);
});

test('C4.41B owning an LED unlocks any hex color, but an unbought LED remains locked',()=>{
 const locked=arcade.fresh(TIME);locked.coins=9999;
 assert.equal(act(locked,'neon-led-aabbcc').ok,false);
 const bought=act(locked,'skin');
 assert.equal(bought.ok,true);
 assert.equal(bought.state.neon.skin,1);
 assert.equal(bought.state.neon.ledColor,'#ad75ff');
 const changed=act(bought.state,'neon-led-04FfB9');
 assert.equal(changed.ok,true);
 assert.equal(changed.state.neon.ledColor,'#04ffb9');
 assert.equal(changed.state.coins,bought.state.coins,'Color changes are free once owned');
 assert.equal(arcade.norm(copy(changed.state),TIME).neon.ledColor,'#04ffb9');
 assert.equal(act(changed.state,'neon-led-zzzzzz').ok,false);
 const old=copy(changed.state);delete old.neon.ledColor;
 assert.equal(arcade.norm(old,TIME).neon.ledColor,null,'Prior owned LED saves still load');
});

test('C4.41B render includes custom LED palette, timed buttons, symmetrical seven-pod scene',()=>{
 const root=join(__dirname,'..');
 const index=readFileSync(join(root,'index.html'),'utf8');
 const ui=readFileSync(join(root,'js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(root,'css/arcade-c441b-feedback.css'),'utf8');
 assert.match(index,/arcade-c441b-feedback\.css\?v=c441b-1/);
 assert.match(index,/personal-arcade-core-v1\.js\?[^"\n]*beat=c441b-1/);
 assert.match(ui,/data-neon-led-picker/);
 assert.match(ui,/data-arcade-action="neon-beat-\$\{i\}"/);
 assert.match(ui,/data-arcade-until="\$\{n\.beatUntil\}"/);
 assert.match(css,/\.neon-floor-capacity-7\{[\s\S]*?grid-template-columns:repeat\(8/);
 assert.match(css,/nth-child\(7\)\{grid-column:6\/span 2\}/);
});
