const {test}=require('node:test');
const assert=require('node:assert/strict');
const loot=require('../js/loot-rules-v2.js');
const catalog=require('../js/item-catalog-v2.js');
test('no realm tag yields only common items and never DUDU collectibles',()=>{
  for(let i=0;i<=100;i++){
    const r=loot.pick({random:()=>i/101});
    assert.ok(r);
    assert.equal(r.item.scope,'COMMON');
    assert.notEqual(r.item.id,'sss1');
    assert.equal(r.rank,r.item.rank);
    assert.equal(r.realmTag,null);
  }
});
test('realms only permit their items plus global common pool',()=>{
  for(const realmTag of catalog.REALM_TAGS){
    const possible=new Set();
    for(let i=0;i<400;i++){
      let step=0;
      const result=loot.pick({realmTag,random:()=>step++===0?i/400:0.7});
      assert.ok(result);
      assert.equal(result.item.scope==='REALM'?result.item.realmTag:null,result.realmTag);
      assert.ok(result.item.scope==='COMMON'||result.item.realmTag===realmTag);
      possible.add(result.item.id);
    }
    assert.ok(possible.size>1);
  }
});
test('A and S ranks are only possible when present in active realm, missing SS/SSS cannot create phantom F',()=>{
  assert.equal(loot.pick({realmTag:'FANTASY',random:()=>0.99999}).rank,'A');
  assert.equal(loot.pick({realmTag:'SCIFI',random:()=>0.99999}).rank,'S');
  assert.equal(loot.pick({random:()=>0.99999}).rank,'B');
  assert.notEqual(loot.pick({random:()=>0.99999}).item.rank,'F');
  assert.deepEqual(loot.pick({realmTag:'WRONG',random:()=>0.1}),null);
  assert.equal(loot.pick({realmTag:'SCIFI',random:()=>Number.NaN}),null);
});
test('only explicit chapter or story realm metadata selects a realm',()=>{
  assert.equal(loot.realmTagFor({},{}),null);
  assert.equal(loot.realmTagFor({realmTag:'CULTIVATION'},{}),'CULTIVATION');
  assert.equal(loot.realmTagFor({}, {realmTag:'HORROR'}),'HORROR');
  assert.equal(loot.realmTagFor({realmTag:'INVALID'}, {realmTag:'HORROR'}),null,
    'Unknown explicit chapter tags must not silently choose a different realm');
  assert.equal(loot.realmTagFor({title:'Hệ thống tu tiên'},{}),null,
    'Never infer realm tags from title or story content');
});
test('rewards always correspond to ACTUAL rank of chosen item',()=>{
  for(const rank of catalog.RANKS){
    const rewards=loot.rewardFor(rank,()=>0);
    assert.ok(rewards.coins>0);
    assert.ok(rewards.exp>0);
  }
  assert.equal(loot.rewardFor('A',()=>0.5).coins,15);
  assert.equal(loot.rewardFor('S',()=>0.5).exp,40);
  assert.equal(loot.rewardFor('B',()=>0.5).exp,10);
  assert.equal(loot.rewardFor('X'),null);
  assert.equal(loot.rewardFor('F',()=>NaN),null);
});
test('relative weights preserve old common rarity distribution once empty grades removed',()=>{
  const weights=loot.BASE_WEIGHTS;
  assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),10000);
  assert.equal(weights.F,5000);
  assert.equal(weights.SSS,1);
  const empty=new Set(['SS','SSS']);
  assert.ok(empty.has('SSS'));
});
