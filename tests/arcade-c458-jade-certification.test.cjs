'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const TIME=1793450000000;
const act=(state,action,time=TIME)=>arcade.act(state,action,time,.41);
const src=path=>readFileSync(join(__dirname,'..',path),'utf8');
const piece=(id,changes={})=>({...jade.generate(1,id,.63),id,phase:'crafted',
 grade:5,size:8,flaw:'perfect',craft:'ring',design:2,setting:1,
 craftValue:5500,...changes});

test('C4.58 craft quality is bounded and derived once from physical stone and workshop skill',()=>{
 assert.deepEqual(jade.QUALITY_NAMES,['Phổ phẩm','Tinh phẩm','Trân phẩm','Tuyệt phẩm']);
 assert.equal(jade.SPECIAL_ORDERS.length,6);
 const stone=piece(5,{grade:7,site:4,color:6,size:12,setting:2});
 const q=jade.jewelryQuality(stone,'ring',2,2,4);
 assert.ok(q>=2&&q<=3);
 assert.equal(jade.jewelryQuality(stone,'ring',2,2,4),q);
 assert.equal(jade.jewelryQuality({...stone},'ring',2,2,4),q);
 let s=arcade.fresh(TIME);s.coins=10000;s.jade.carver=4;
 s.jade.active={...stone,phase:'cut',cutValue:4000,craft:null,craftValue:0};
 s=act(s,'jade-craft-ring-2-2').state;
 assert.equal(s.jade.craftJob.quality,q);
 assert.ok(s.jade.craftJob.value>4000*jade.CRAFTS.ring.mult);
 const readyAt=s.jade.craftJob.readyAt;
 s=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(s.jade.craftJob.quality,q,'Quality is fixed before job is claimed');
 s=act(s,'jade-claim-craft',readyAt).state;
 assert.equal(s.jade.vault[0].quality,q);
 assert.equal(s.jade.vault[0].certified,undefined,'Quality is still sealed');
});

test('C4.58 appraisal costs money once, persists on reload and never mints money',()=>{
 let s=arcade.fresh(TIME);s.coins=1000;
 s.jade.vault=[piece(7,{quality:2})];
 const fee=jade.appraisalFee(s.jade.vault[0]),before=s.coins;
 const first=act(s,'jade-appraise-0');assert.equal(first.ok,true);
 s=first.state;
 assert.equal(s.coins,before-fee);
 assert.equal(s.jade.vault[0].quality,2);
 assert.equal(s.jade.vault[0].certified,true);
 assert.equal(act(s,'jade-appraise-0').ok,false);
 assert.equal(s.coins,before-fee);
 assert.equal(s.earned,0);
 const normalized=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.equal(normalized.jade.vault[0].quality,2);
 assert.equal(normalized.jade.vault[0].certified,true);
 const old={...piece(8)};delete old.quality;delete old.certified;
 normalized.jade.vault.push(old);
 const expected=jade.jewelryQuality(old);
 const second=act(normalized,'jade-appraise-1');assert.equal(second.ok,true);
 assert.equal(second.state.jade.vault[1].quality,expected,
  'Old crafted jewelry gets deterministic fallback, not a new roll');
});

test('C4.58 special orders require certified physical jewelry and pay only once',()=>{
 let s=arcade.fresh(TIME);s.coins=10000;s.jade.commissions.done=2;
 const order=jade.specialFor(s.jade);
 assert.equal(order.craft,'ring');
 const required={...piece(9),grade:order.minGrade,quality:order.minQuality};
 s.jade.vault=[required];
 assert.equal(jade.specialUnlocked(s.jade),true);
 assert.equal(jade.specialMatch(required,order),false,'Unsigned jewelry is not eligible');
 assert.equal(act(s,'jade-deliver-special').ok,false);
 s=act(s,'jade-appraise-0').state;
 assert.equal(jade.specialMatch(s.jade.vault[0],order),true);
 const expected=Math.round(jade.marketQuote(s.jade.vault[0],TIME).value*order.premium);
 const before=s.coins,first=act(s,'jade-deliver-special');assert.equal(first.ok,true);
 s=first.state;
 assert.equal(s.coins,before+expected);
 assert.equal(s.jade.vault.length,0);
 assert.equal(s.jade.commissions.specialDone,1);
 assert.equal(s.jade.commissions.done,2,'Ordinary orders remain independent');
 assert.equal(act(s,'jade-deliver-special').ok,false);
 assert.equal(s.coins,before+expected);
 assert.equal(act(s,'jade-change-special').ok,false,'Cooldown prevents instant reroll');
 assert.equal(act(s,'jade-change-special',TIME+240001).ok,true);
});

test('C4.58 rare contracts enforce grade, finish, quality and optional color',()=>{
 for(const contract of jade.SPECIAL_ORDERS){
  const right=piece(55,{craft:contract.craft,design:contract.design,setting:contract.setting,
   grade:contract.minGrade,quality:contract.minQuality,certified:true,
   color:contract.color??1});
  assert.equal(jade.specialMatch(right,contract),true,contract.name);
  assert.equal(jade.specialMatch({...right,certified:false},contract),false);
  if(contract.minQuality>0)assert.equal(jade.specialMatch({...right,quality:contract.minQuality-1},contract),false);
  if(contract.minGrade>1)assert.equal(jade.specialMatch({...right,grade:contract.minGrade-1},contract),false);
  if(contract.color!==undefined)assert.equal(jade.specialMatch({...right,color:(contract.color+1)%8},contract),false);
 }
 const j=jade.fresh();assert.equal(jade.specialUnlocked(j),false);
 j.sold=8;assert.equal(jade.specialUnlocked(j),true);
});

test('C4.58 certified exhibits keep their badges but old albums are unchanged',()=>{
 let s=arcade.fresh(TIME);
 s.jade.active=piece(19,{quality:3,certified:true});
 s=act(s,'jade-exhibit').state;
 assert.equal(s.jade.active,null);
 assert.equal(s.jade.exhibits.length,1);
 assert.equal(s.jade.exhibits[0].quality,3);
 assert.equal(s.jade.exhibits[0].certified,true);
 const normalized=arcade.norm(JSON.parse(JSON.stringify(s)),TIME);
 assert.deepEqual(normalized.jade.exhibits,s.jade.exhibits);
 const old={grade:2,color:1,size:5,craft:'ring',site:0};
 normalized.jade.exhibits.push(old);
 assert.deepEqual(arcade.norm(JSON.parse(JSON.stringify(normalized)),TIME).jade.exhibits[1],old);
});

test('C4.58 mobile workshop and gallery expose compact certification and special-order details',()=>{
 const window={DuduPersonalArcadeCoreV1:arcade};
 vm.runInNewContext(src('js/personal-jade-ui-v1.js'),{window});
 const ui=window.DuduPersonalJadeUIV1;
 let s=arcade.fresh(TIME);s.coins=1000;s.jade.commissions.done=2;
 s.jade.vault=[piece(7,{quality:2})];
 let html=ui.panel(s);
 assert.match(html,/jade-appraise-0/);
 assert.match(html,/jade-special-order is-unlocked/);
 assert.match(html,/jade-deliver-special/);
 assert.match(html,/jade-change-special/);
 s=act(s,'jade-appraise-0').state;
 s.jade.exhibits=[{...s.jade.vault[0]}];
 html=ui.panel(s);
 assert.match(html,/jade-certificate jade-quality-2/);
 assert.match(html,/jade-exhibit jade-quality-2/);
 assert.doesNotMatch(html,/data-arcade-action="jade-appraise-0"/);
 assert.match(src('css/arcade-jade-c458.css'),/prefers-reduced-motion/);
 const index=src('index.html');
 assert.match(index,/arcade-jade-c458\.css\?v=c458-1/);
 assert.match(index,/personal-jade-core-v1\.js[^"\n]*c458=1/);
 assert.match(index,/personal-jade-ui-v1\.js[^"\n]*c458=1/);
});
