'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const arcade=require('../js/personal-arcade-core-v1.js');
const T=1793710000000;
const act=(s,a,t)=>arcade.act(s,a,t);
const clone=s=>JSON.parse(JSON.stringify(s));
function clearRound(state,at){
 let s=state;
 const seq=arcade.neonBeatPattern(s.neon);
 for(let i=0;i<seq.length;i++){
  const result=act(s,'neon-beat-'+seq[i],at+100*(i+1));
  assert.equal(result.ok,true);
  s=result.state;
 }
 if(s.neon.beatMode>0){
  const zone=arcade.neonBeatZone(s.neon),window=arcade.neonBeatWindow(s.neon);
  const finishAt=s.neon.beatUntil-window+Math.round(window*(zone.start+zone.end)/2);
  const result=act(s,'neon-beat-finish',finishAt);
  assert.equal(result.ok,true);
  s=result.state;
 }
 return s;
}

test('C4.59 mode 0: three successive harder guests, escrow until a single final reward',()=>{
 let s=arcade.fresh(T);
 s=act(s,'neon-rush-open',T).state;
 assert.equal(s.neon.rushActive,true);
 assert.equal(arcade.neonBeatPattern(s.neon).length,4);
 assert.equal(act(s,'neon-style-1',T+10).ok,false);
 assert.equal(act(s,'neon-beat-start',T+10).ok,false);
 s=clearRound(s,T);
 assert.equal(s.coins,0);
 assert.equal(s.neon.rushClears,1);
 assert.ok(s.neon.rushPot>0);
 assert.equal(act(s,'neon-beat-start',T+1000).ok,false);
 s=act(s,'neon-rush-next',T+1000).state;
 assert.equal(arcade.neonBeatPattern(s.neon).length,5);
 s=clearRound(s,T+1000);
 assert.equal(s.coins,0);
 assert.equal(s.neon.rushClears,2);
 s=act(s,'neon-rush-next',T+2000).state;
 assert.equal(arcade.neonBeatPattern(s.neon).length,6);
 const pending=s.neon.rushPot;
 s=clearRound(s,T+2000);
 assert.equal(s.neon.rushActive,false);
 assert.equal(s.neon.rushBest,3);
 assert.equal(s.neon.rushCompleted,1);
 assert.ok(s.coins>pending*2);
 assert.equal(s.neon.rushPot,0);
 assert.equal(act(s,'neon-rush-bank',T+3000).ok,false,'No double bank');
 assert.equal(act(s,'neon-rush-open',T+3000).ok,false,'Cooldown enforced');
 assert.equal(arcade.norm(clone(s),T+3001).coins,s.coins,'Reload cannot double payout');
});

test('C4.59 cash out after 1 or 2 guests; never credit unbanked coins',()=>{
 let s=act(arcade.fresh(T),'neon-rush-open',T).state;
 s=clearRound(s,T);
 const value=s.neon.rushPot;
 assert.equal(s.coins,0);
 const cached=arcade.norm(clone(s),T+600);
 assert.equal(cached.neon.rushPot,value);
 assert.equal(cached.neon.rushActive,true);
 const bank=act(cached,'neon-rush-bank',T+900);
 assert.equal(bank.ok,true);
 assert.equal(bank.state.coins,value);
 assert.equal(act(bank.state,'neon-rush-bank',T+901).ok,false);
});

test('C4.59 wrong arrow or timed-out customer loses the entire unbanked pot',()=>{
 let s=act(arcade.fresh(T),'neon-rush-open',T).state;
 s=clearRound(s,T);
 s=act(s,'neon-rush-next',T+1000).state;
 const wrong=(arcade.neonBeatPattern(s.neon)[0]+1)%4;
 s=act(s,'neon-beat-'+wrong,T+1100).state;
 assert.equal(s.neon.rushActive,false);
 assert.equal(s.neon.rushPot,0);
 assert.equal(s.coins,0);
 assert.equal(act(s,'neon-rush-open',T+1200).ok,false);
 s=act(s,'neon-rush-open',T+22000).state;
 s=arcade.advance(s,s.neon.beatUntil+1,0);
 assert.equal(s.neon.rushActive,false);
 assert.equal(s.neon.rushPot,0);
 assert.equal(s.coins,0);
});

test('C4.59 fast mode still requires correctly timed SPACE at every rush stage',()=>{
 let s=act(arcade.fresh(T),'neon-style-1',T).state;
 s=act(s,'neon-rush-open',T).state;
 const window=arcade.neonBeatWindow(s.neon);
 assert.equal(arcade.neonBeatPattern(s.neon).length,5);
 s=clearRound(s,T);
 assert.equal(s.neon.rushClears,1);
 assert.equal(s.coins,0);
 s=act(s,'neon-rush-next',T+window+1000).state;
 const wrong=arcade.neonBeatPattern(s.neon);
 for(let i=0;i<wrong.length;i++)s=act(s,'neon-beat-'+wrong[i],T+window+1100+i*100).state;
 s=act(s,'neon-beat-finish',T+window+2100).state;
 assert.equal(s.neon.rushActive,false);
 assert.equal(s.coins,0);
});

test('C4.59 compact Rush controls are linked, and old Neon mode keeps its default loop',()=>{
 const ui=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/arcade-neon-c459.css'),'utf8');
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 assert.match(ui,/neon-rush-open/);
 assert.match(ui,/neon-rush-next/);
 assert.match(ui,/neon-rush-bank/);
 assert.match(ui,/nextOrder\|\|missedBeat\|\|rushReady/);
 assert.match(css,/\.neon-rush-strip/);
 assert.match(html,/arcade-neon-c459\.css/);
 assert.match(html,/c459=1/);
 let s=arcade.fresh(T);
 assert.equal(arcade.neonBeatPattern(s.neon).length,3);
 s=act(s,'neon-beat-start',T).state;
 s=clearRound(s,T);
 assert.ok(s.coins>0);
 assert.equal(s.neon.orderReadyAt,T+90000+300);
});
