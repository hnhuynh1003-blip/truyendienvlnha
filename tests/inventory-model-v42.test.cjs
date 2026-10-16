const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../js/inventory-model-v42.js');
const catalog=require('../js/item-catalog-v2.js');

test('V42: all 70 canonical IDs retain their ranks, scopes and explicit roles',()=>{
 assert.equal(model.validateCatalog().length,0);
 const groups={};
 for(const item of catalog.items){
  const card=model.inspect(item);
  assert.equal(card.id,item.id);
  assert.equal(card.rank,item.rank);
  assert.equal(card.scope,item.scope);
  assert.equal(card.usageStatus,'NOT_IMPLEMENTED');
  groups[card.category]=(groups[card.category]||0)+1;
 }
 assert.deepEqual(groups,{CONSUMABLE:8,MATERIAL:14,TOOL:19,EQUIPMENT:5,
  STORY_PROP:9,COLLECTIBLE:15});
 assert.deepEqual(model.REALMS,{
  URBAN:'Hiện đại',APOCALYPSE:'Tận thế',CULTIVATION:'Tu tiên',
  FANTASY:'Huyền huyễn',SCIFI:'Viễn tưởng',HORROR:'Kinh dị'});
});
test('V42: museum memorabilia never become browser-verifiable or giftable',()=>{
 const items=catalog.souvenirs.map(model.inspect);
 assert.equal(items.length,15);
 for(const item of items){
  assert.equal(item.protected,true);assert.equal(item.unique,true);
  assert.equal(item.giftable,false);assert.equal(item.verifiedCollectible,false);
 }
 const disguised=model.inspect({id:'shop-sss',name:'Mảnh Vỡ 0x000F89',
  rank:'SSS',type:'ITEM',instanceId:'old-shop'});
 assert.notEqual(disguised.id,'sss1');
 assert.equal(disguised.verifiedCollectible,false);
 assert.equal(disguised.category,'OTHER');
});
test('V42: never normalize saved IDs or merge duplicate item instances',()=>{
 const owned=[
  {id:'f1',instanceId:'a',name:'Bánh mì cũ'},
  {id:'f1',instanceId:'b',name:'Bánh mì cũ'},
  {id:'e1',instanceId:'legacy',name:'Mì Tôm Cay Dung Thành'},
  {id:'author-item-abc',scope:'CHAPTER',storyId:'story-A',
   chapterId:'ch1',name:'Nhật ký ký ức',type:'ITEM',rank:'SS',
   instanceId:'author-1',unique:true},
  {id:'shop-food-1',name:'Lon Cà Phê Phòng Net',
   rank:'E',type:'FOOD',instanceId:'shop1'}
 ];
 const before=JSON.stringify(owned);
 const all=model.list(owned);
 assert.equal(all.total,5);
 assert.deepEqual(all.entries.map(e=>e.index),[0,1,2,3,4]);
 assert.deepEqual(all.entries.map(e=>e.detail.instanceId),
  ['a','b','legacy','author-1','shop1']);
 assert.equal(model.inspect(owned[2]).archive,true);
 assert.equal(model.inspect(owned[3]).protected,true);
 assert.equal(model.inspect(owned[3]).storyId,'story-A');
 assert.equal(JSON.stringify(owned),before);
});
test('V42: full filtering by realm, rank, source story, category and Vietnamese query',()=>{
 const owned=[
  {...catalog.byId('f1'),instanceId:'a'},
  {...catalog.byId('cult-spirit-fragment'),instanceId:'b',
    obtainedFrom:{storyId:'novel-1',chapterId:'chapter-2',kind:'CHAPTER'}},
  {...catalog.byId('scifi-quantum-chip'),instanceId:'c',
    obtainedFrom:{storyId:'novel-2',kind:'CHAPTER'}},
  {...catalog.byId('dudu-first-chapter'),instanceId:'d'}
 ];
 assert.equal(model.list(owned,{realm:'CULTIVATION'}).total,1);
 assert.equal(model.list(owned,{realm:'BOGUS'}).total,4);
 assert.equal(model.list(owned,{storyId:'novel-1'}).entries[0].detail.id,'cult-spirit-fragment');
 assert.equal(model.list(owned,{storyId:'GLOBAL'}).total,2);
 assert.equal(model.list(owned,{category:'MATERIAL'}).total,2);
 assert.equal(model.list(owned,{rank:'F'}).total,2);
 assert.equal(model.list(owned,{query:'linh thạch'}).total,1);
 assert.equal(model.list(owned,{order:'rank_desc'}).entries[0].detail.id,'dudu-first-chapter');
});
test('V42: stable pagination respects original indexes and never fabricates ownership',()=>{
 const owned=Array.from({length:51},(_,i)=>({
  id:'f1',name:'Bánh mì '+i,instanceId:'unique-'+i,rank:'F',type:'FOOD'
 }));
 const one=model.list(owned,{limit:24});
 const two=model.list(owned,{limit:24,offset:one.nextOffset});
 const three=model.list(owned,{limit:24,offset:two.nextOffset});
 assert.equal(one.entries.length,24);assert.equal(two.entries.length,24);
 assert.equal(three.entries.length,3);assert.equal(three.hasMore,false);
 assert.equal(one.entries[0].index,0);assert.equal(three.entries[2].index,50);
 assert.equal(model.list(null).total,0);
 assert.equal(model.inspect(null),null);
});
