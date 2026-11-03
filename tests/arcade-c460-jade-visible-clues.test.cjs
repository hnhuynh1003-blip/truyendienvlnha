'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const T=1793710000000;
const act=(s,a)=>arcade.act(s,a,T,.37);
const clone=s=>JSON.parse(JSON.stringify(s));
const ui=readFileSync(join(__dirname,'../js/personal-jade-ui-v1.js'),'utf8');
const context={window:{DuduPersonalArcadeCoreV1:arcade}};
vm.runInNewContext(ui,context);
const render=s=>context.window.DuduPersonalJadeUIV1.panel(s);

function testStone(flaw='perfect',grade=5){
 let s=arcade.fresh(T);s.coins=20000;s=act(s,'jade-buy-0').state;
 s.jade.active.grade=grade;s.jade.active.color=3;s.jade.active.flaw=flaw;
 return s;
}

test('C4.60 the raw photographic specimen exposes three interactive scan points, not hidden clues',()=>{
 let s=testStone('fracture');
 const before=render(s);
 assert.match(before,/jade-inspection-overlay/);
 assert.match(before,/jade-item-rough/);
 for(let i=0;i<3;i++){
  assert.match(before,new RegExp('data-jade-scan-point="'+i+'"'));
  assert.equal((before.match(new RegExp('data-arcade-action="jade-scan-'+i+'"','g'))||[]).length,1,
   'The legacy scanner keeps one unique action for browser automation');
 }
 assert.doesNotMatch(before,/<ellipse cx=/);
 assert.doesNotMatch(before,/stroke="#eedac0"/);
 s=act(s,'jade-scan-0').state;
 assert.match(render(s),/<ellipse cx=/,'Light scattering is drawn directly onto the rough stone');
 s=act(s,'jade-scan-1').state;
 assert.match(render(s),/stroke="#68cda8"/,'The vein is physically revealed');
 s=act(s,'jade-scan-2').state;
 assert.match(render(s),/stroke="#eedac0"/,'Fracture has a visible marked line');
 const reloaded=arcade.norm(clone(s),T);
 assert.match(render(reloaded),/stroke="#eedac0"/,'Previously seen clues survive reload');
 s=act(s,'jade-cut').state;
 assert.doesNotMatch(render(s),/jade-inspection-overlay/,'Inspection hotspots disappear after cutting');
});

test('C4.60 safe, standard and bold cutting have visible risk-reward on an intact core',()=>{
 const seed=testStone();
 const payouts=[];
 for(const mode of [0,1,2]){
  let s=clone(seed);
  const changed=act(s,'jade-cut-mode-'+mode);
  assert.equal(changed.ok,true);
  s=changed.state;
  assert.equal(s.jade.active.cutMode,mode);
  const saved=arcade.norm(clone(s),T);
  assert.equal(saved.jade.active.cutMode,mode);
  const fixedSeed=s.jade.active.seed;
  const cut=act(saved,'jade-cut');
  assert.equal(cut.ok,true);
  s=cut.state;
  assert.equal(s.jade.active.seed,fixedSeed,'Cut choice cannot reroll stone composition');
  assert.equal(s.jade.active.cutMode,mode);
  assert.equal(s.jade.active.phase,'cut');
  assert.equal(act(s,'jade-cut-mode-1').ok,false,'Cannot rechoose after seeing the core');
  assert.equal(act(s,'jade-cut').ok,false,'Only one cut charge and result per stone');
  payouts.push(s.jade.active.cutValue);
 }
 assert.ok(payouts[0]<payouts[1]);
 assert.ok(payouts[1]<payouts[2]);
});

test('C4.60 safe cut protects fractured material, risky cut cannot beat the same standard fracture',()=>{
 const seed=testStone('fracture');
 seed.jade.active.seed=999;seed.jade.saw=1;
 const payouts=[];
 for(const mode of [0,1,2]){
  let s=clone(seed);s=act(s,'jade-cut-mode-'+mode).state;
  s=act(s,'jade-cut').state;
  payouts.push(s.jade.active.cutValue);
 }
 assert.ok(payouts[0]>payouts[1],'Preservation protects the fracture downside');
 assert.ok(payouts[1]>payouts[2],'Bold cutting punishes a cracked core');
});

test('C4.60 choosing a saw does not mint coins; practice/waste cannot turn into a payout exploit',()=>{
 let s=testStone('skin',0);
 const wallet=s.coins;
 s=act(s,'jade-cut-mode-2').state;
 assert.equal(s.coins,wallet);
 s=act(s,'jade-cut').state;
 assert.equal(s.coins,wallet,'Free practice does not award Tiền Xanh');
 assert.equal(s.jade.active.cutValue,Math.round(jade.MARKETS[0].price*.05));
 const old=arcade.fresh(T);
 old.jade.active={...s.jade.active,phase:'raw'};
 delete old.jade.active.cutMode;
 assert.equal(arcade.norm(old,T).jade.active.cutMode,undefined,'Old stones default to classic cutting');
});

test('C4.60 compact cutting selector and CSS are wired into the published page',()=>{
 const html=render(testStone());
 assert.match(html,/jade-saw-choices/);
 for(let i=0;i<3;i++)assert.match(html,new RegExp('data-arcade-action="jade-cut-mode-'+i+'"'));
 assert.match(html,/aria-pressed="true"/);
 const index=readFileSync(join(__dirname,'../index.html'),'utf8');
 const css=readFileSync(join(__dirname,'../css/arcade-jade-c460.css'),'utf8');
 assert.match(index,/arcade-jade-c460\.css/);
 assert.match(index,/c460=1/);
 const mainUI=readFileSync(join(__dirname,'../js/personal-arcade-ui-v1.js'),'utf8');
 assert.match(mainUI,/control\.dataset\.jadeScanPoint/);
 assert.match(css,/\.jade-evidence-point/);
 assert.match(css,/\.jade-saw-choices/);
});
