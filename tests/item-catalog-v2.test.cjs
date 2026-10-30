const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../js/item-catalog-v2.js');

test('V44.1 base catalog stays intact and C2.9 adds 19 unique FUN collectibles',()=>{
  assert.equal(catalog.items.length,179);
  assert.equal(catalog.common.length,25);
  assert.equal(catalog.realms.length,120);
  assert.equal(catalog.souvenirs.length,15);
  assert.equal(catalog.funCollectibles.length,19);
  assert.ok(catalog.funCollectibles.every(x=>x.collectionSet==='VAN_BAO'&&
    x.scope==='DUDU'&&x.acquisition.method==='FUN_BOX'&&x.unique&&
    !x.tradeable&&!x.giftable&&!x.discardable));
  assert.equal(catalog.validate().length,0,catalog.validate().join('; '));
  for(const realmTag of catalog.REALM_TAGS) assert.equal(catalog.list({scope:'REALM',realmTag}).length,20);
});
test('permanent IDs and legacy objects are preserved without editing inventories',()=>{
  const oldIds=['f1','f2','e2','e3','d1','c1','b1','b2','s1','sss1'];
  for(const id of oldIds){
    const item=catalog.byId(id);
    assert.ok(item,id);
    assert.equal(item.itemId,id);
  }
  assert.equal(catalog.byId('e1').name,'Mì Tôm Cay Dung Thành');
  assert.equal(catalog.byId('e1').archived,true);
  assert.equal(catalog.byId('missing-item'),null);
  assert.equal(new Set(catalog.items.map(x=>x.id)).size,179);
  assert.ok(catalog.items.every(x=>x.id===x.itemId));
});
test('DUDU memorabilia are collectible by milestone/event, not random loot or gifts',()=>{
  assert.deepEqual(new Set(catalog.souvenirs.map(x=>x.scope)),new Set(['DUDU']));
  for(const item of catalog.souvenirs){
    assert.ok(['MILESTONE','EVENT'].includes(item.acquisition.method));
    assert.equal(item.unique,true);
    assert.equal(item.maxOwned,1);
    assert.equal(item.giftable,false);
    assert.equal(item.tradeable,false);
    assert.equal(item.discardable,false);
    assert.equal(catalog.previewDropPool({rank:item.rank}).some(x=>x.id===item.id),false);
  }
  assert.equal(catalog.byId('sss1').originStoryId,'truyen-dien-vl');
  assert.equal(catalog.byId('sss1').loreReviewRequired,true,'Do not finalize story canon without author approval');
});
test('preview drop pools do not leak relics between dimensions',()=>{
  const general=catalog.previewDropPool();
  assert.ok(general.every(x=>x.scope==='COMMON'));
  assert.equal(general.length,25);
  const scifi=catalog.previewDropPool({realmTag:'SCIFI'});
  assert.equal(scifi.length,43);
  assert.equal(scifi.filter(x=>x.scope==='REALM').length,18);
  assert.ok(scifi.some(x=>x.id==='s1'));
  assert.equal(scifi.some(x=>x.id==='fantasy-ruins-seal'),false);
  assert.ok(catalog.previewDropPool({realmTag:'SCIFI',rank:'S'}).some(x=>x.id==='s1'));
  assert.equal(catalog.previewDropPool({realmTag:'FANTASY',rank:'S'}).length,0);
  assert.equal(catalog.previewDropPool({realmTag:'SCIFI',rank:'SS'}).length,0);
  assert.deepEqual(catalog.previewDropPool({realmTag:'UNKNOWN_REALM'}),[]);
  assert.deepEqual(catalog.previewDropPool({rank:'X'}),[]);
});
test('catalog definitions stay immutable and random awards now use only the scoped v2 pool',()=>{
  assert.ok(Object.isFrozen(catalog.items));
  assert.ok(Object.isFrozen(catalog.byId('f1')));
  assert.ok(Object.isFrozen(catalog.byId('f1').acquisition));
  const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
  assert.match(html,/const MASTER_LOOT_TABLE = \[/,'Legacy data must remain for old owners');
  assert.match(html,/DuduLootRules\.pick\(\{realmTag,seenIds\}\)/);
  assert.doesNotMatch(html,/MASTER_LOOT_TABLE\.filter\(item => item\.rank === targetRank\)/);
});
