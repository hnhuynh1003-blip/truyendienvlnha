'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const fishing=require('../js/personal-arcade-fishing-c425f.js');
const source=name=>readFileSync(join(__dirname,'..',name),'utf8');
const T=1793440000000;

function loadedBait(){
 let s=core.advance(core.fresh(T),T+core.BUBBLE_INTERVAL,0);
 assert.equal(s.garden.bubbleReady,true);
 return core.act(s,'catch-bubble',T+core.BUBBLE_INTERVAL,.2).state;
}

test('C4.40A timing rules grow with rod upgrades and challenge rarer fish',()=>{
 const line={fishId:'reed',biteAt:T+3000,escapeAt:T+28000,size:31,rod:1};
 const basic=fishing.rules(line,core.FISH_SPECIES.reed);
 const rare=fishing.rules({...line,fishId:'moonfish'},core.FISH_SPECIES.moonfish);
 const upgraded=fishing.rules({...line,rod:5},core.FISH_SPECIES.reed);
 assert.equal(basic.required,2);
 assert.equal(rare.required,4);
 assert.ok(rare.width<basic.width);
 assert.ok(upgraded.width>basic.width,'The existing rod upgrade makes timing easier');
 for(const rules of [basic,rare,upgraded]){
  assert.ok(rules.left>=0&&rules.left+rules.width<=100);
 }
 const started=fishing.begin(line);
 assert.equal(started.hits,0);
 assert.equal(started.misses,0);
 assert.equal(fishing.pulse(started,true,{...line,size:32},core.FISH_SPECIES.reed).ok,false,
  'An older fish cannot reuse a timing challenge');
});

test('C4.40A five distinct skill tiers preserve the catch table and provide an attainable challenge',()=>{
 const species=['reed','koi','moonfish','crystal','dragon'];
 const expected=[2,3,4,5,7];
 const widths=species.map(id=>fishing.rules({fishId:id,biteAt:T+3000,
  escapeAt:T+28000,size:60,rod:1},core.FISH_SPECIES[id]));
 assert.deepEqual(widths.map(x=>x.required),expected);
 assert.deepEqual(widths.map(x=>x.tier),['common','rare','uncommon','epic','mythic']);
 for(let i=1;i<widths.length;i++)assert.ok(widths[i].width<widths[i-1].width);
 const legendary=widths[4];
 assert.ok(legendary.width>=15,'On-screen target remains visible on narrow phones');
 assert.ok(legendary.travelSeconds>=1.1,'The float should not move impossibly fast');
 const upgraded=fishing.rules({fishId:'dragon',biteAt:T+3000,
  escapeAt:T+28000,size:60,rod:5},core.FISH_SPECIES.dragon);
 assert.equal(upgraded.required,7,'Upgrading a rod helps, but does not erase the challenge');
 assert.ok(upgraded.width>legendary.width);
 const s=core.fresh(T);
 assert.equal(s.garden.fish,0);
 assert.equal(s.coins,0);
});

test('C4.40A one quick double-tap cannot count as multiple successful reel beats',()=>{
 const line={fishId:'dragon',biteAt:T+3000,escapeAt:T+28000,size:66,rod:1};
 let challenge=fishing.begin(line);
 const first=fishing.pulse(challenge,true,line,core.FISH_SPECIES.dragon,T+3100);
 assert.equal(first.ok,true);challenge=first.fight;
 const tooFast=fishing.pulse(challenge,true,line,core.FISH_SPECIES.dragon,T+3120);
 assert.equal(tooFast.ok,false);
 assert.equal(tooFast.reason,'cooldown');
 assert.equal(challenge.hits,1);
 for(let beat=1;beat<7;beat++){
  const result=fishing.pulse(challenge,true,line,core.FISH_SPECIES.dragon,
   T+3100+beat*fishing.PULSE_COOLDOWN_MS);
  assert.equal(result.ok,true);challenge=result.fight;
  assert.equal(result.result,beat===6?'caught':'hit');
 }
 assert.equal(challenge.hits,7);
});

test('Real success still requires core reel-line; the timing helper never awards Xu',()=>{
 const cast=core.act(loadedBait(),'cast-line',T+core.BUBBLE_INTERVAL+1,.35);
 assert.equal(cast.ok,true);
 const line=cast.state.garden.line;
 const beforeCoins=cast.state.coins;
 let challenge=fishing.begin(line);
 const a=fishing.pulse(challenge,true,line,core.FISH_SPECIES[line.fishId],T+3000);
 assert.equal(a.result,'hit');challenge=a.fight;
 const b=fishing.pulse(challenge,true,line,core.FISH_SPECIES[line.fishId],T+3500);
 assert.equal(b.result,'caught');
 assert.equal(cast.state.garden.fish,0);
 assert.equal(cast.state.coins,beforeCoins);
 const caught=core.act(cast.state,'reel-line',line.biteAt+1,.3);
 assert.equal(caught.ok,true);
 assert.equal(caught.state.garden.fish,1);
 assert.equal(caught.state.garden.line,null);
 assert.equal(core.act(caught.state,'reel-line',line.biteAt+2,.2).ok,false);
 const loaded=core.norm(JSON.parse(JSON.stringify(caught.state)),line.biteAt+3);
 assert.equal(loaded.garden.fish,1);
});

test('Three missed timing pulls snap only the active line without fish or reward',()=>{
 const cast=core.act(loadedBait(),'cast-line',T+core.BUBBLE_INTERVAL+1,.99);
 assert.equal(cast.ok,true);
 const before=cast.state;
 const line=before.garden.line;
 assert.equal(core.act(before,'snap-line',line.biteAt-1,.2).ok,false);
 let challenge=fishing.begin(line),out;
 for(let i=0;i<3;i++){
  out=fishing.pulse(challenge,false,line,core.FISH_SPECIES[line.fishId],T+3000+i*500);
  challenge=out.fight;
 }
 assert.equal(out.result,'escaped');
 const snap=core.act(before,'snap-line',line.biteAt+1,.2);
 assert.equal(snap.ok,true);
 assert.equal(snap.state.garden.line,null);
 assert.equal(snap.state.garden.fish,0);
 assert.equal(snap.state.garden.bait,0);
 assert.equal(snap.state.coins,before.coins);
 assert.equal(core.act(snap.state,'snap-line',line.biteAt+2,.2).ok,false);
 const restored=core.norm(JSON.parse(JSON.stringify(snap.state)),line.biteAt+3);
 assert.equal(restored.garden.line,null);
 assert.equal(restored.garden.fish,0);
});

test('C4.25F is an actual animated and tappable game surface on top of the painted pond',()=>{
 const html=source('index.html'),ui=source('js/personal-arcade-ui-v1.js');
 const css=source('css/arcade-c425f-fishing.css');
 assert.match(html,/arcade-c425f-fishing\.css\?v=c440a-1/);
 assert.match(html,/personal-arcade-fishing-c425f\.js\?v=c442-1/);
 assert.match(html,/personal-arcade-core-v1\.js\?v=c442-1&amp;fishing=c425f-1/);
 assert.match(html,/fishing=c440a-1/);
 assert.match(ui,/data-arcade-action="reel-pulse"|reel\?'reel-pulse'/);
 assert.match(ui,/function pulseReel\(\)/);
 assert.match(ui,/getBoundingClientRect\(\)/);
 assert.match(ui,/interact\('reel-line'\)/);
 assert.match(ui,/interact\('snap-line'\)/);
 assert.match(css,/garden-reel-safe/);
 assert.match(css,/garden-reel-marker/);
 assert.match(css,/reel-tier-mythic/);
 assert.match(css,/@keyframes c425f-reel-travel/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(ui,/onpointerdown|onpointerup/,'Button taps must remain accessible to keyboard');
});
