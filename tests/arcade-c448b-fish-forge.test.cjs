'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const core=require('../js/personal-arcade-core-v1.js');
const fishing=require('../js/personal-arcade-fishing-c425f.js');
const T=1793440000000;
const copy=value=>JSON.parse(JSON.stringify(value));
const action=(s,id,roll=.5,t=T)=>core.act(s,id,t,roll);

test('C4.48b exact essence yield by fish tier and no catch history erasure',()=>{
 const expected={reed:1,carp:1,silver:1,koi:2,blue:2,glassfin:2,
  moonfish:3,lantern:3,fogveil:3,crystal:5,nightlamp:5,dragon:8,phoenix:8};
 assert.deepEqual(Object.fromEntries(Object.keys(expected).map(id=>[id,core.fishEssenceValue(id)])),expected);
 let s=core.fresh(T);s.garden.fishAlbum.reed=4;s.garden.fishAlbum.dragon=2;
 s.garden.fishBest.dragon=98;s.garden.pondDisplay=['dragon'];
 s=action(s,'garden-fish-trade-reed').state;
 s=action(s,'garden-fish-trade-dragon').state;
 assert.equal(s.garden.fishEssence,9);
 assert.equal(s.garden.fishAlbum.dragon,2);
 assert.equal(s.garden.fishBest.dragon,98);
 assert.deepEqual(s.garden.pondDisplay,['dragon']);
 assert.equal(core.fishAvailable(s.garden,'dragon'),0);
 assert.equal(action(s,'garden-fish-trade-dragon').ok,false);
 assert.deepEqual(core.norm(copy(s),T),s);
});

test('C4.48b forging gives permanent but bounded fishing assistance',()=>{
 let s=core.fresh(T);s.garden.fishEssence=100;
 let spent=0;
 for(let level=1;level<=3;level++){
  const cost=core.fishEssenceUpgradeCost(s.garden);
  assert.equal(cost,[8,20,40][level-1]);
  const result=action(s,'garden-fish-essence-upgrade');
  assert.equal(result.ok,true);s=result.state;spent+=cost;
  assert.equal(s.garden.fishEssence,100-spent);
  assert.equal(s.garden.fishEssenceLevel,level);
 }
 assert.equal(core.fishEssenceUpgradeCost(s.garden),null);
 assert.equal(action(s,'garden-fish-essence-upgrade').ok,false);
 assert.equal(s.coins,0,'Forging does not mint or spend Arcade Xu');
 const line={fishId:'dragon',size:92,rod:3,lure:'regular',biteAt:T,escapeAt:T+25000};
 const normal=fishing.rules(line,core.FISH_SPECIES.dragon);
 const enhanced=fishing.rules({...line,essenceLevel:3},core.FISH_SPECIES.dragon);
 assert.equal(enhanced.width,normal.width+6);
 assert.equal(enhanced.required,7,'Legendary skill challenge still requires all seven beats');
 assert.equal(enhanced.maxMisses,2);
 assert.deepEqual(core.norm(copy(s),T),s);
});

test('C4.48b a record charm helps size on the next valid cast, not rarity or Xu',()=>{
 let s=core.fresh(T);s.garden.fishEssence=6;s.garden.bait=1;s.garden.pondTier=1;
 s=action(s,'garden-fish-record-charm').state;
 assert.equal(s.garden.fishEssence,0);assert.equal(s.garden.recordCharms,1);
 assert.equal(action(s,'cast-line',1).ok,false,'Invalid roll cannot waste the charm');
 assert.equal(s.garden.recordCharms,1);
 const cast=action(s,'cast-line',.09);
 assert.equal(cast.ok,true);s=cast.state;
 assert.equal(s.garden.recordCharms,0);
 const fish=core.FISH_SPECIES[s.garden.line.fishId];
 assert.ok(s.garden.line.size>=fish.min+Math.ceil((fish.max-fish.min)*.8));
 assert.equal(core.FISH_POND_LEVEL[s.garden.line.fishId],1,'Charm does not unlock high-tier fish');
 assert.equal(s.coins,0);
 assert.deepEqual(core.norm(copy(s),T),s);
});

test('C4.48b stock caps and malformed saves never mint essence or charms',()=>{
 let s=core.fresh(T);s.garden.fishEssence=200;s.garden.fishAlbum.reed=4;
 assert.equal(action(s,'garden-fish-trade-reed').ok,false);
 assert.equal(action(s,'garden-fish-record-charm').ok,true);
 s.garden.fishEssence=200;s.garden.recordCharms=10;
 assert.equal(action(s,'garden-fish-record-charm').ok,false);
 s.garden.fishEssence=999999;s.garden.fishEssenceLevel=99;s.garden.recordCharms=999;
 const safe=core.norm(s,T);
 assert.equal(safe.garden.fishEssence,0);
 assert.equal(safe.garden.fishEssenceLevel,0);
 assert.equal(safe.garden.recordCharms,0);
});

test('C4.48b popup offers instant forging instead of weekly bait, with cache-busted rules',()=>{
 const src=file=>readFileSync(join(__dirname,'..',file),'utf8');
 const ui=src('js/personal-arcade-ui-v1.js'),html=src('index.html');
 assert.match(ui,/Lò Tinh Hoa Hồ Sương/);
 assert.match(ui,/Dây Sương/);
 assert.match(ui,/Bùa Kỷ Lục/);
 assert.match(ui,/Không chờ tuần|không chờ tuần/);
 assert.doesNotMatch(ui,/lượt tuần này/);
 assert.match(html,/economy=c448b-1/);
});
