'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const fishing=require('../js/personal-arcade-fishing-c425f.js');
const arcade=require('../js/personal-arcade-core-v1.js');
const T=1793520000000;
const code=name=>readFileSync(join(__dirname,'..',name),'utf8');
const line={fishId:'dragon',biteAt:T+3000,escapeAt:T+28000,size:86,rod:1,lure:'regular'};
const fish=arcade.FISH_SPECIES.dragon;

test('C4.51 center precision is visible inside every existing phase, rarity and rod width',()=>{
 for(const id of ['reed','koi','moonfish','crystal','dragon']){
  for(const rod of [1,3,5]){
   const specimen={...line,fishId:id,rod};
   const target=arcade.FISH_SPECIES[id];
   const steps=fishing.rules(specimen,target);
   for(let hits=0;hits<steps.required;hits++){
    const rule=fishing.rules(specimen,target,hits);
    assert.ok(rule.perfectWidth>=5&&rule.perfectWidth<rule.width,id+' '+rod+' '+hits);
    assert.ok(rule.perfectLeft>=rule.left,id+' '+rod+' '+hits);
    assert.ok(rule.perfectLeft+rule.perfectWidth<=rule.left+rule.width,id+' '+rod+' '+hits);
    assert.ok(rule.left>=4&&rule.left+rule.width<=96);
   }
  }
 }
 assert.ok(fishing.rules({...line,rod:5},fish).perfectWidth>
  fishing.rules(line,fish).perfectWidth,'Advanced rods expand the perfection target, too');
});

test('C4.51 two consecutive perfect center taps recover exactly one tension strike',()=>{
 let fight=fishing.begin(line);
 const first=fishing.pulse(fight,'miss',line,fish,T+3100);
 assert.equal(first.result,'miss');fight=first.fight;
 assert.equal(fight.misses,1);
 const recovered1=fishing.pulse(fight,'perfect',line,fish,T+3600);
 assert.equal(recovered1.result,'perfect');fight=recovered1.fight;
 assert.equal(fight.chain,1);assert.equal(fight.misses,1);
 assert.equal(fight.perfects,1);
 const recovered2=fishing.pulse(fight,'perfect',line,fish,T+4100);
 assert.equal(recovered2.result,'perfect');fight=recovered2.fight;
 assert.equal(fight.misses,0,'Two accurate center hits restore one mistake');
 assert.equal(fight.recovered,1);
 assert.equal(fight.chain,0,'Recovery spends the streak once');
 assert.equal(fight.lastRecovery,true);
 assert.equal(fight.perfects,2);
 const other=fishing.pulse(fight,'perfect',line,fish,T+4600).fight;
 assert.equal(other.misses,0,'Cannot farm negative tension');
 assert.equal(other.recovered,1);
});

test('C4.51 edge hits and misses break the streak; double taps do not refill line tension',()=>{
 let fight=fishing.begin(line);
 const step=(grade,time)=>{const out=fishing.pulse(fight,grade,line,fish,time);
  assert.equal(out.ok,true);fight=out.fight;return out;};
 step('miss',T+3100);
 step('perfect',T+3600);
 step('hit',T+4100);
 assert.equal(fight.chain,0);
 step('perfect',T+4600);
 assert.equal(fight.misses,1,'An edge hit breaks the double-center recovery');
 const spam=fishing.pulse(fight,'perfect',line,fish,T+4620);
 assert.equal(spam.ok,false);assert.equal(spam.reason,'cooldown');
 assert.equal(fight.misses,1);assert.equal(fight.hits,3);
 step('miss',T+5100);
 assert.equal(fight.misses,2);
 assert.equal(fight.done,true,'An early mistake still snaps a beginner line');
});

test('C4.51 high-tier rods absorb one more mistake on difficult fish, with no free rarity',()=>{
 const easy=arcade.FISH_SPECIES.reed,hard=arcade.FISH_SPECIES.phoenix;
 assert.equal(fishing.rules({...line,rod:1},easy).maxMisses,2);
 assert.equal(fishing.rules({...line,rod:5},easy).maxMisses,2);
 assert.equal(fishing.rules({...line,rod:3},hard).maxMisses,2);
 assert.equal(fishing.rules({...line,rod:4},hard).maxMisses,3);
 assert.equal(fishing.rules({...line,rod:5,lure:'moon'},hard).maxMisses,4);
 assert.equal(fishing.rules({...line,rod:5},hard).required,7);
 assert.ok(fishing.rules({...line,rod:5},hard).width>fishing.rules(line,hard).width);
 for(const roll of [.81,.92,.99]){
  assert.equal(arcade.FISH_SPECIES[arcade.choosePondFish(roll,.76,T,1)].rare,false);
 }
});

test('C4.51 perfect fights still award a fish and Xu only through the original core action',()=>{
 const s=arcade.fresh(T);s.neon.running=false;s.garden.pondTier=5;
 s.garden.line={...line,biteAt:T-1000,escapeAt:T+24000};
 s.garden.fishAlbum.reed=3;s.garden.fishBest.reed=28;
 const money=s.coins;
 let fight=fishing.begin(s.garden.line);
 for(let beat=0;beat<7;beat++){
  const out=fishing.pulse(fight,'perfect',s.garden.line,fish,T+500+beat*500);
  assert.equal(out.ok,true);fight=out.fight;
  assert.equal(out.result,beat===6?'caught':'perfect');
 }
 assert.equal(s.coins,money);
 assert.equal(s.garden.fishAlbum.dragon,0);
 const completed=arcade.act(s,'reel-line',T+4000,.5);
 assert.equal(completed.ok,true);
 assert.equal(completed.state.garden.fishAlbum.dragon,1);
 assert.equal(completed.state.garden.fishAlbum.reed,3);
 assert.equal(completed.state.garden.fishBest.reed,28);
 assert.equal(completed.state.garden.fishEssence,0,'Perfect pulls do not mint resources');
 assert.equal(arcade.act(completed.state,'reel-line',T+4001,.5).ok,false);
 const restored=arcade.norm(JSON.parse(JSON.stringify(completed.state)),T+4002);
 assert.equal(restored.garden.fishAlbum.dragon,1);
 assert.equal(restored.version,1,'Saved format stays unchanged');
});

test('C4.51 browser assets ship with precision markup, thumb target and cache busting',()=>{
 const html=code('index.html'),ui=code('js/personal-arcade-ui-v1.js');
 const css=code('css/arcade-c425f-fishing.css');
 assert.match(html,/arcade-c425f-fishing\.css\?[^"\n]+precision=c451-1/);
 assert.match(html,/personal-arcade-fishing-c425f\.js\?[^"\n]+precision=c451-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?[^"\n]+precision=c451-1/);
 assert.match(ui,/garden-reel-perfect/);
 assert.match(ui,/perfect\.getBoundingClientRect/);
 assert.match(ui,/2 luống|1 lần chịu lỗi/);
 assert.match(css,/\.garden-reel-perfect/);
 assert.match(css,/\.garden-reel-pull/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.doesNotMatch(css,/background-image:\s*url\(/,
  'The precision target is vector-like CSS, not a new overlay on the AI pond');
});
