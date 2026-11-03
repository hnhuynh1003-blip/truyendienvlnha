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

test('C4.60a glass notes reveal each scan beside the real stone, never paint over its artwork',()=>{
 let s=testStone('fracture');
 const before=render(s);
 assert.match(before,/jade-inspection-overlay/);
 assert.match(before,/jade-item-rough/);
 for(let i=0;i<3;i++){
  assert.match(before,new RegExp('data-jade-scan-point="'+i+'"'));
  assert.doesNotMatch(before,new RegExp('data-arcade-action="jade-scan-'+i+'"'),
   'There is no duplicate scan card below the stone');
 }
 assert.doesNotMatch(before,/jade-glass-note/);
 assert.doesNotMatch(before,/<svg/);
 assert.equal(context.window.DuduPersonalJadeUIV1.chooseClue(0,s.jade.active),true);
 s=act(s,'jade-scan-0').state;
 assert.match(render(s),/jade-glass-note/);
 assert.match(render(s),/THỦY ĐẦU/);
 assert.equal(context.window.DuduPersonalJadeUIV1.chooseClue(0,s.jade.active),false,
  'A scanned point can be tapped again without charging or rescanning');
 assert.doesNotMatch(render(s),/jade-glass-note/,'Second tap closes the glass note');
 assert.equal(context.window.DuduPersonalJadeUIV1.chooseClue(1,s.jade.active),true);
 s=act(s,'jade-scan-1').state;
 assert.match(render(s),/MÃNG ĐỚI/);
 assert.equal(context.window.DuduPersonalJadeUIV1.chooseClue(2,s.jade.active),true);
 s=act(s,'jade-scan-2').state;
 assert.match(render(s),/LIỆT VĂN/);
 assert.match(render(s),/Liệt văn giao nhau|đường rạn/);
 const reloaded=arcade.norm(clone(s),T);
 assert.match(render(reloaded),/Liệt văn giao nhau|đường rạn/,'Findings survive reload');
 s=act(s,'jade-cut').state;
 assert.doesNotMatch(render(s),/jade-inspection-overlay/,'Inspection hotspots disappear after cutting');
 assert.doesNotMatch(render(s),/jade-glass-note/);
});

test('C4.60b the compact three-choice forecast appears after two scans and locks a prediction',()=>{
 let s=testStone('perfect',5);
 assert.doesNotMatch(render(s),/jade-forecast-console/);
 s=act(s,'jade-scan-0').state;
 assert.doesNotMatch(render(s),/jade-forecast-console/);
 s=act(s,'jade-scan-1').state;
 const open=render(s);
 assert.match(open,/jade-forecast-console/);
 assert.match(open,/1 lần/);
 for(let i=0;i<3;i++){
  assert.match(open,new RegExp('jade-forecast-console-choice'));
  assert.equal((open.match(new RegExp('data-arcade-action="jade-forecast-'+i+'"','g'))||[]).length,1,
   'Exactly one forecast action is visible in the compact console');
 }
 s=act(s,'jade-forecast-2').state;
 assert.match(render(s),/✓ Đã ghi/);
 assert.match(render(s),/jade-forecast-console-choice is-selected/);
 assert.equal(act(s,'jade-forecast-0').ok,false,'No second prediction');
 const restored=arcade.norm(clone(s),T);
 assert.match(render(restored),/✓ Đã ghi/,'The sealed guess remains selected after reload');
 s=act(s,'jade-cut').state;
 assert.match(render(s),/jade-forecast-verdict/,'Cut still settles the saved prediction');
});

test('C4.60b the entire redundant scan drawer is removed, clues exist only on the photographed stone',()=>{
 let s=testStone();
 assert.doesNotMatch(render(s),/jade-scan-drawer|jade-scan-options|jade-forecast-panel/);
 context.window.DuduPersonalJadeUIV1.chooseClue(0,s.jade.active);
 s=act(s,'jade-scan-0').state;
 assert.doesNotMatch(render(s),/jade-scan-drawer|jade-scan-options/);
 assert.match(render(s),/jade-glass-note/,'The glass note is the sole scan explanation');
});

test('C4.60c window appraisal price floats over the stone, never stretches the action panel',()=>{
 let s=testStone('perfect',5);
 const result=act(s,'jade-window');
 assert.equal(result.ok,true);
 s=result.state;
 const html=render(s);
 const stage=html.indexOf('class="arcade-stage jade-stage');
 const price=html.indexOf('class="jade-window-quote');
 const controls=html.indexOf('class="arcade-control-panel jade-control-panel');
 assert.ok(stage>=0&&stage<price&&price<controls,'The floating price lives inside the stone stage');
 assert.doesNotMatch(html,/jade-trader-offer/,'No full-width price card remains below');
 assert.match(html,/THU MUA HÔM NAY/);
 assert.match(html,new RegExp(arcade.formatXu(jade.marketQuote(s.jade.active,s.lastAt).value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(html,/data-arcade-action="jade-sell-window"/,'The spot-sale action still uses the live quote');
 assert.match(html,/data-arcade-action="jade-cut"/);
 assert.match(context.window.DuduPersonalJadeUIV1.panel(s,{type:'jade-window'}),/jade-window-quote is-revealing/);
 context.window.DuduPersonalJadeUIV1.chooseClue(0,s.jade.active);
 s=act(s,'jade-scan-0').state;
 assert.match(render(s),/jade-glass-note is-left/,'Window clues use the opposite edge from the price');
 const css=readFileSync(join(__dirname,'../css/arcade-jade-c460.css'),'utf8');
 assert.match(css,/\.jade-window-quote\s*\{[\s\S]*?position:absolute/);
 assert.match(css,/backdrop-filter:blur\(5px\)/);
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
