const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pack=require('../js/world-items-v44-1.js');
const catalog=require('../js/item-catalog-v2.js');
const loot=require('../js/loot-rules-v2.js');
const model=require('../js/inventory-model-v42.js');
const collection=require('../js/world-collection-v44-1.js');
test('V44.1: precisely 90 new item IDs, 15 per realm, with unique lore and metadata',()=>{
 assert.equal(pack.items.length,90);
 assert.equal(new Set(pack.items.map(x=>x.id)).size,90);
 assert.equal(new Set(catalog.items.map(x=>x.id)).size,179);
 assert.equal(catalog.legacyItemCount,70);
 assert.equal(catalog.worldExpansionCount,90);
 assert.equal(catalog.validate().length,0);
 assert.equal(model.validateCatalog().length,0);
 for(const tag of catalog.REALM_TAGS){
  const set=pack.items.filter(x=>x.realmTag===tag);
  assert.equal(set.length,15);
  assert.deepEqual(set.reduce((acc,x)=>{acc[x.rank]=(acc[x.rank]||0)+1;return acc},{}),
   {F:4,E:4,D:3,C:2,B:1,A:1});
  assert.equal(set.filter(x=>x.method==='CHAPTER_EVENT').length,2);
  assert.equal(catalog.list({scope:'REALM',realmTag:tag}).length,20);
  for(const x of set){
   const approved=catalog.byId(x.id);
   assert.equal(approved.worldPack,'V44.1');
   assert.equal(approved.acquisition.method,x.method);
   assert.equal(approved.scope,'REALM');
   assert.equal(approved.realmTag,tag);
   assert.equal(model.inspect(approved).category==='OTHER',false);
   assert.equal(model.inspect(approved).usageStatus,'NOT_IMPLEMENTED');
   assert.equal(Object.isFrozen(approved),true);
  }
 }
});
test('V44.1: chapter-gated B/A expansion never enters random pick for any realm',()=>{
 for(const tag of catalog.REALM_TAGS){
  const pool=catalog.previewDropPool({realmTag:tag});
  assert.equal(pool.length,43); // existing common 25 + existing realm 5 + new random 13
  for(const x of pool)assert.notEqual(x.acquisition.method,'CHAPTER_EVENT');
  for(const rare of pack.items.filter(x=>x.realmTag===tag&&['B','A'].includes(x.rank))){
   assert.ok(catalog.byId(rare.id));
   assert.equal(pool.some(x=>x.id===rare.id),false);
  }
 }
 assert.equal(catalog.previewDropPool().length,25);
 assert.equal(catalog.previewDropPool({realmTag:'WRONG'}).length,0);
});
test('V44.1: world selection preserves rank but improves realm variety',()=>{
 assert.equal(loot.WORLD_CHANCE,0.65);
 const tag='CULTIVATION';
 // Ranking picks F at 0, source roll under threshold selects realm F.
 const realm=loot.pick({realmTag:tag,random:()=>0});
 assert.equal(realm.rank,'F');
 assert.equal(realm.item.scope,'REALM');
 // Same rarity F, source roll above threshold chooses common.
 let n=0;const common=loot.pick({realmTag:tag,random:()=>++n===1?0:.99});
 assert.equal(common.rank,'F');
 assert.equal(common.item.scope,'COMMON');
 // Seen records become less likely but are not absolutely excluded.
 const pool=catalog.previewDropPool({realmTag:tag,rank:'F'})
  .filter(x=>x.scope==='REALM');
 const oldFirst=pool[0].id;
 assert.equal(loot.pick({realmTag:tag,random:()=>0,seenIds:[oldFirst]}).rank,'F');
 for(let i=0;i<500;i++){
  const out=loot.pick({realmTag:tag,random:()=>i/500});
  assert.ok(out);
  assert.equal(out.item.acquisition.method,'RANDOM');
 }
 assert.equal(loot.pick({realmTag:tag,random:()=>NaN}),null);
 assert.equal(loot.pick({realmTag:'INVALID',random:()=>0}),null);
});
test('V44.1: collected world types survive sale, gift and full inventory removal locally',()=>{
 const item=catalog.byId('cult-v441-01');
 const record={...item,instanceId:'one',obtainedFrom:{kind:'CHAPTER',
  storyId:'story-A',chapterId:'ch-1'}};
 const initial=collection.record(null,[record]);
 assert.equal(initial.found.CULTIVATION.length,1);
 assert.equal(initial.found.CULTIVATION[0],item.id);
 const afterSale=collection.record(initial,[]);
 assert.equal(afterSale.found.CULTIVATION.length,1);
 const duplicate=collection.record(afterSale,[record,record]);
 assert.equal(duplicate.found.CULTIVATION.length,1);
 assert.equal(collection.stats(duplicate,[]).total,120);
 assert.equal(collection.stats(duplicate,[]).seen,1);
 const old=catalog.byId('cult-spirit-fragment');
 assert.equal(collection.record(duplicate,[old]).found.CULTIVATION.length,2);
 assert.equal(collection.record(null,[catalog.byId('f1')]).found.CULTIVATION.length,0);
 const invalid=collection.normalize({version:1,found:{
  CULTIVATION:['made-up-id',item.id,item.id,'dudu-founders-badge'],
  SCIFI:['cult-v441-01']
 }});
 assert.deepEqual(invalid.found.CULTIVATION,[item.id]);
 assert.deepEqual(invalid.found.SCIFI,[]);
});
test('V44.1: release wiring supports expandable world book without bloating default grid',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../css/world-collection-v44-1.css'),'utf8');
 const book=fs.readFileSync(path.join(__dirname,'../js/world-collection-v44-1.js'),'utf8');
 assert.ok(html.indexOf('js/world-items-v44-1.js')<html.indexOf('js/item-catalog-v2.js'));
 assert.ok(html.indexOf('js/item-catalog-v2.js')<html.indexOf('js/world-collection-v44-1.js'));
 assert.match(html,/id="inventory-v441-collection".*hidden/);
 assert.match(html,/DuduWorldCollectionV441\.toggle\(\)/);
 assert.match(html,/userProfile\.collectionV441/);
 assert.match(html,/DuduLootRules\.pick\(\{realmTag,seenIds\}\)/);
 assert.match(book,/host\.hidden=!opened/);
 assert.match(css,/#inventory-v441-collection\[hidden\]/);
});
