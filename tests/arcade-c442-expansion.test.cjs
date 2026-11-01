'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const game=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const fish=require('../js/personal-arcade-fishing-c425f.js');
const T=1793520000000;
const copy=value=>JSON.parse(JSON.stringify(value));
const use=(state,action,t=T,roll=.5)=>game.act(state,action,t,roll);

test('C4.42 unrestricted manual mining, paid tiers and old depth access survive reload',()=>{
 let s=game.fresh(T);s.coins=10000;s.mine.dug=160;s.mine.lantern=3;
 assert.equal(use(s,'mine-zone-1').ok,false,'New players must invest');
 s.mine.ores.coal=12;s.mine.ores.iron=30;s.mine.ores.copper=6;s.mine.ores.silver=4;
 const before=s.coins;
 s=use(s,'mine-permit-1').state;
 assert.equal(s.coins,before-1200);
 assert.equal(s.mine.ores.coal,0);
 assert.equal(use(s,'mine-permit-1').ok,false,'No second fee or duplicate permit');
 s=use(s,'mine-zone-1').state;
 s=use(s,'mine-permit-2').state;
 assert.equal(s.coins,before-1200-4800);
 s=use(s,'mine-zone-2').state;
 const first=use(s,'mine',T,.98);
 const second=use(first.state,'mine',T,.98);
 assert.equal(second.ok,true);
 assert.equal(second.state.mine.dug,162);
 assert.equal(second.state.mine.durability,98);
 const legacy=copy(s);delete legacy.mine.depthPermit;
 const old=game.norm(legacy,T);
 assert.equal(old.mine.depthPermit,2);
 assert.equal(old.mine.zone,2);
 assert.deepEqual(game.norm(copy(old),T),old);
});

test('C4.42 garden harvests physical produce and mixed orders only once',()=>{
 let s=game.fresh(T);s.garden.harvests=30;
 s.garden.beds[0]={status:'growing',readyAt:T-1,crop:'moon'};
 const harvested=use(s,'harvest-0');assert.equal(harvested.ok,true);s=harvested.state;
 assert.equal(s.garden.cropStock.moon,1);
 assert.equal(s.garden.seeds,4);
 assert.equal(use(s,'garden-order-0').ok,false);
 s.garden.cropStock.bloom=4;s.garden.cropStock.mint=2;
 s=use(s,'garden-order-0').state;
 assert.equal(s.garden.cropStock.bloom,0);
 assert.equal(s.garden.cropStock.mint,0);
 assert.equal(s.garden.bait,2);
 assert.deepEqual(s.garden.cropOrdersDone,[0]);
 assert.equal(use(s,'garden-order-0').ok,false);
 assert.equal(use(s,'garden-order-1').ok,false);
 assert.deepEqual(game.norm(copy(s),T).garden.cropOrdersDone,[0]);
});

test('C4.42 pond tier gates only ordinary species, event fish bypass tiers, display is historical',()=>{
 const threshold=.9;
 assert.equal(game.choosePondFish(.99,threshold,T,1),'moonfish');
 assert.equal(game.choosePondFish(.99,threshold,T,3),'crystal');
 assert.equal(game.choosePondFish(.999,threshold,T,4),'dragon');
 assert.equal(game.choosePondFish(.999,threshold,T,1),'moonfish');
 assert.equal(game.choosePondFish(.958,threshold,0,1),'fogveil','Mist fish stays available as a weather event');
 let s=game.fresh(T);s.garden.fishAlbum.dragon=1;
 s=use(s,'garden-display-dragon').state;
 assert.deepEqual(s.garden.pondDisplay,['dragon']);
 assert.equal(s.garden.fishAlbum.dragon,1,'Displaying does not consume past catches');
 assert.deepEqual(game.norm(copy(s),T).garden.pondDisplay,['dragon']);
 s=use(s,'garden-display-dragon').state;
 assert.deepEqual(s.garden.pondDisplay,[]);
 assert.equal(use(s,'garden-display-phoenix').ok,false);
});

test('C4.42 jade new discovery is separate from owned pieces, crafting capped at three per minute',()=>{
 const s=game.fresh(T);s.coins=100000;
 const stone=id=>({...jade.generate(0,id,.12),grade:2,color:3,size:6,flaw:'perfect',phase:'cut',cutValue:2500});
 for(let i=0;i<3;i++){
  s.jade.active=stone(i+1);
  const result=jade.act(s,'jade-craft-pendant',.5,T+i*1000);
  assert.equal(result.ok,true);
 }
 assert.equal(s.jade.craftUsed,3);
 s.jade.active=stone(4);
 const previous=s.coins;
 assert.equal(jade.act(s,'jade-craft-pendant',.5,T+3000).ok,false);
 assert.equal(s.coins,previous,'No fee taken on cooldown');
 assert.equal(jade.act(s,'jade-craft-pendant',.5,T+60000).ok,true);
 assert.equal(s.jade.craftUsed,1);
 s.jade.active={...stone(5),phase:'raw'};
 const cut=jade.act(s,'jade-cut',.5,T+60001);
 assert.equal(cut.ok,true);
 assert.match(cut.label,/MỚI VÀO SỔ/);
 assert.equal(s.jade.lastDiscoveryKey,'2-3');
 assert.equal(s.jade.album['2-3'],1);
 assert.deepEqual(jade.norm(copy(s.jade)).lastDiscoveryKey,'2-3');
 s.jade.active=null;
 assert.equal(s.jade.album['2-3'],1,'Album persists without the stone in hand');
 s.jade.active={...stone(6),phase:'raw'};
 const duplicate=jade.act(s,'jade-cut',.5,T+60002);
 assert.match(duplicate.label,/ĐÃ CÓ TRONG SỔ/);
 assert.equal(s.jade.album['2-3'],2);
});

test('C4.42 compact UI and mine buttons do not depend on tap cooldown',()=>{
 const path=join(__dirname,'..');
 const ui=readFileSync(join(path,'js/personal-arcade-ui-v1.js'),'utf8');
 const css=readFileSync(join(path,'css/arcade-c442-gameplay.css'),'utf8');
 const html=readFileSync(join(path,'index.html'),'utf8');
 assert.match(ui,/const canDig=!repairing&&m\.durability>0;/);
 assert.doesNotMatch(ui,/LẤY NHỊP CUỐC/);
 assert.match(ui,/garden-crop-stock/);
 assert.match(ui,/garden-display-/);
 assert.match(css,/\.neon-order-game\{order:-1/);
 assert.match(css,/\.mine-ore-button:active:not\(:disabled\)\{transform:translateX\(-50%\)/);
 assert.match(html,/arcade-c442-gameplay\.css\?v=c442-1/);
 const mythic=fish.rules({rod:1,size:72},game.FISH_SPECIES.dragon);
 assert.equal(mythic.required,7);
 assert.equal(mythic.maxMisses,2);
});
