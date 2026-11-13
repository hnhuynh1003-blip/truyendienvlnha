'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const NOW=1793520000000;
const use=(s,key,time=NOW,roll=.66)=>arcade.act(s,key,time,roll);
const restored=s=>arcade.norm(JSON.parse(JSON.stringify(s)),NOW);
const src=file=>readFileSync(join(__dirname,'..',file),'utf8');

function completeTicket(state,at){
 state=use(state,'neon-beat-start',at).state;
 const pattern=arcade.neonBeatPattern(state.neon);
 for(let i=0;i<pattern.length;i++){
  const result=use(state,'neon-beat-'+pattern[i],at+(i+1)*450);
  assert.equal(result.ok,true);
  state=result.state;
 }
 return state;
}

test('C4.52 network upgrades help Neon rhythm and bring next customers sooner, without free Xu',()=>{
 const basic=arcade.fresh(NOW),router5=arcade.fresh(NOW);
 router5.neon.router=5;
 assert.equal(arcade.neonBeatWindow(basic.neon),12000);
 assert.equal(arcade.neonBeatWindow(router5.neon),13600);
 assert.equal(arcade.neonOrderCooldown(basic.neon),90000);
 assert.equal(arcade.neonOrderCooldown(router5.neon),66000);
 assert.equal(arcade.neonOrderCooldown({...router5.neon,router:10}),36000);
 basic.neon.roomTier=3;router5.neon.roomTier=3;
 assert.equal(arcade.neonBeatWindow(basic.neon),8000);
 assert.equal(arcade.neonBeatWindow(router5.neon),9600);
 basic.neon.roomTier=1;router5.neon.roomTier=1;
 const old=completeTicket(basic,NOW),newer=completeTicket(router5,NOW);
 assert.equal(old.neon.orderWon,1);
 assert.equal(newer.neon.orderWon,1);
 assert.equal(old.coins,newer.coins,'Networking does not mint additional manual rewards');
 assert.equal(newer.neon.orderReadyAt,NOW+3*450+66000);
 assert.ok(newer.neon.orderReadyAt<old.neon.orderReadyAt);
 assert.equal(restored(newer).neon.orderReadyAt,newer.neon.orderReadyAt);
 assert.equal(use(newer,'neon-beat-start',newer.neon.orderReadyAt-1).ok,false);
 assert.equal(use(newer,'neon-beat-start',newer.neon.orderReadyAt).ok,true);
});

test('C4.52 network upgrades never shorten a customer already waiting in a legacy save',()=>{
 let s=arcade.fresh(NOW);s.coins=100000;s.neon.orderReadyAt=NOW+90000;
 s=use(s,'router').state;
 assert.equal(s.neon.router,2);
 assert.equal(s.neon.orderReadyAt,NOW+90000);
 assert.equal(restored(s).neon.orderReadyAt,NOW+90000);
 assert.equal(arcade.neonBeatWindow(s.neon),12400);
});

test('C4.52 scanner level 2/3 adds bounded material only to a correctly probed vein',()=>{
 const expectedExtra=[1,1,2,3];
 for(let scanner=0;scanner<=3;scanner++){
  let s=arcade.fresh(NOW);s.neon.running=false;s.mine.scanner=scanner;s.mine.charge=5;
  const branch=arcade.mineProbeTarget(s.mine);
  const hit=use(s,'mine-probe-'+branch,NOW,.85);
  assert.equal(hit.ok,true);assert.equal(hit.hit,true);
  assert.equal(arcade.mineProbeBonus(s.mine),expectedExtra[scanner]);
  assert.equal(hit.quantity,1+expectedExtra[scanner]);
  assert.equal(hit.state.mine.ores.iron,hit.quantity);
  assert.equal(hit.state.mine.found.iron,hit.quantity);
  assert.equal(hit.state.mine.charge,0);
  assert.equal(restored(hit.state).mine.ores.iron,hit.quantity);
  s=arcade.fresh(NOW);s.neon.running=false;s.mine.scanner=scanner;s.mine.charge=5;
  const wrong=use(s,'mine-probe-'+((branch+1)%3));
  assert.equal(wrong.ok,true);assert.equal(wrong.hit,false);
  assert.equal(wrong.state.mine.ores.stone,1);
  assert.equal(wrong.state.mine.ores.iron,0,'No bonus for an incorrect seam');
 }
});

test('C4.52 old ore, cart sale and scanner upgrade recipe retain their historical rules',()=>{
 let s=arcade.fresh(NOW);s.neon.running=false;s.mine.ores.iron=18;
 s.mine.ores.crystal=4;s.mine.cart=3;
 const before=restored(s);
 assert.deepEqual(before.mine.ores,s.mine.ores);
 const scanner=use(s,'mine-scanner');
 assert.equal(scanner.ok,true);s=scanner.state;
 assert.equal(s.mine.scanner,1);
 assert.equal(s.mine.ores.iron,10);
 assert.equal(s.mine.ores.crystal,1);
 assert.equal(arcade.mineProbeBonus(s.mine),1,'First scanner already improves ore quality');
 const sold=use(s,'sell-ores');
 assert.equal(sold.ok,true);
 assert.equal(sold.state.coins,Math.floor((10*arcade.ORE_VALUES.iron+
  arcade.ORE_VALUES.crystal)*1.2));
});

test('C4.52 appraiser lamp unlocks additional distinct stall clues without a new save field',()=>{
 const targets=[[1,1],[2,1],[3,2],[4,3]];
 for(const [lamp,count] of targets){
  const j=jade.fresh();j.lamp=lamp;
  const spots=jade.marketScanSpots(j,1);
  assert.equal(spots.length,count);
  assert.equal(new Set(spots).size,count,'Each ray inspects a different spot');
  assert.deepEqual(spots,[2,0,1].slice(0,count));
 }
 let s=arcade.fresh(NOW);s.coins=10000;s.jade.lamp=4;
 const fee=jade.inspectFee(0),before=s.coins;
 const looked=use(s,'jade-inspect-0-1');
 assert.equal(looked.ok,true);s=looked.state;
 assert.equal(before-s.coins,fee,'Only one original inspection fee is charged');
 assert.deepEqual(s.jade.inspected,[jade.inspectionKey(s.jade,0,1)]);
 assert.deepEqual(restored(s).jade.inspected,s.jade.inspected);
 assert.equal(use(s,'jade-inspect-0-1').ok,false,'No paid duplicate inspection');
});

test('C4.52 selected jade stall reveals all upgraded clues; three-card compare stays compact',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(src('js/personal-jade-ui-v1.js'),{window});
 const ui=window.DuduPersonalJadeUIV1;
 const s=arcade.fresh(NOW);s.coins=10000;s.jade.lamp=4;
 s.jade.inspected=[jade.inspectionKey(s.jade,0,1)];
 const offer=jade.marketOffer(s.jade,0,1);
 const clues=jade.marketScanSpots(s.jade,1).map(spot=>jade.scanHint(offer.stone,spot,4));
 let html=ui.panel(s);
 assert.match(html,/\+2 dấu · chọn phôi để xem/);
 ui.chooseMarketSample(0,1);
 html=ui.panel(s);
 for(const clue of clues)assert.ok(html.includes(clue),'Selected stone has clue: '+clue);
 assert.equal((html.match(/class="jade-clue-line"/g)||[]).length,3);
 assert.match(html,/data-selected-slot="1"/);
 assert.match(html,/Đèn cấp cao giảm phí quầy/);
 assert.equal(s.coins,10000,'Opening previews never changes Arcade Xu');
});

test('C4.52 versioned assets and compact tool hints ship without touching other world systems',()=>{
 const index=src('index.html'),ui=src('js/personal-arcade-ui-v1.js');
 const jadeUI=src('js/personal-jade-ui-v1.js');
 const css=src('css/arcade-playfield-c418.css');
 for(const script of ['personal-arcade-core-v1','personal-jade-core-v1',
  'personal-arcade-ui-v1','personal-jade-ui-v1'])
  assert.match(index,new RegExp(script+'\\.js[^"\\n]+c452=1'));
 assert.match(index,/arcade-playfield-c418\.css\?[^"\n]+c452=1/);
 assert.match(ui,/khách -/);
 assert.match(ui,/mineProbeBonus/);
 assert.match(jadeUI,/marketScanSpots/);
 assert.match(css,/\.jade-clue-line/);
 const clueStyle=css.match(/#personal-arcade-v1 \.jade-clue-line\{[^}]+\}/)?.[0]||'';
 assert.doesNotMatch(clueStyle,/background-image/,
  'The new clues are code-native and do not cover AI scenery');
 const now=arcade.fresh(NOW);
 assert.equal(restored(now).version,1);
 assert.equal(restored(now).garden.fishEssence,0);
 assert.equal(restored(now).jade.bought,0);
});
