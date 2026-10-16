const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../js/inventory-model-v42.js');
const catalog=require('../js/item-catalog-v2.js');

const drop=(id,n,story,chapter)=>({
 ...catalog.byId(id),instanceId:'stack-'+n,
 obtainedFrom:{kind:'CHAPTER',storyId:story,chapterId:chapter}
});

test('V42.4: shared common drops stack across different stories without rewriting saves',()=>{
 const inventory=[
  drop('f1',1,'novel-A','ch-1'),
  drop('f1',2,'novel-A','ch-2'),
  drop('f1',3,'novel-B','ch-7'),
  drop('f2',4,'novel-B','ch-7')
 ];
 const saved=JSON.stringify(inventory);
 const display=model.displayList(inventory);
 assert.equal(display.total,2);
 assert.equal(display.inventoryTotal,4);
 assert.equal(display.visibleCopies,4);
 assert.deepEqual(display.entries.map(x=>x.count),[3,1]);
 const first=display.entries[0];
 assert.deepEqual(first.indices,[0,1,2]);
 assert.deepEqual(first.items,inventory.slice(0,3));
 assert.equal(first.detail.storyId,null);
 assert.equal(first.detail.chapterId,null);
 assert.equal(first.detail.worldLabel,'Dùng chung mọi truyện');
 assert.equal(model.list(inventory).total,4);
 assert.equal(JSON.stringify(inventory),saved);
 assert.equal(inventory[2].obtainedFrom.storyId,'novel-B');
});
test('V42.4: realm drops stack within a realm, but world origin stays distinct',()=>{
 const a=drop('cult-spirit-fragment',1,'story-1','ch-1');
 const b=drop('cult-spirit-fragment',2,'story-2','ch-5');
 const c=drop('scifi-quantum-chip',3,'story-3','ch-2');
 const result=model.displayList([a,b,c]);
 assert.equal(result.total,2);
 assert.equal(result.entries[0].count,2);
 assert.equal(result.entries[0].detail.realm,'CULTIVATION');
 assert.equal(result.entries[0].detail.storyId,null);
 assert.match(result.entries[0].detail.worldLabel,/Chung theo thế giới/);
 assert.equal(model.displayList([a,b,c],{realm:'CULTIVATION'}).total,1);
 assert.equal(model.displayList([a,b,c],{realm:'SCIFI'}).total,1);
});
test('V42.4: author, unique, memorabilia, expired or modified items never stack',()=>{
 const e=drop('f1',1,'a','1');
 const modified={...drop('f1',2,'b','2'),durability:1};
 const reclassified={...drop('f1',3,'b','3'),name:'Vật phẩm đã đổi tên'};
 const unique={...drop('f1',4,'a','5'),unique:true};
 const relic={...catalog.souvenirs[0],instanceId:'r1'};
 const relic2={...catalog.souvenirs[0],instanceId:'r2'};
 const custom={id:'author-item-1',itemId:'author-item-1',
   scope:'CHAPTER',storyId:'novel-X',chapterId:'c1',rank:'F',type:'ITEM',
   name:'Di vật riêng',instanceId:'author-a',unique:false};
 const old={...custom,instanceId:'author-b'};
 const inventory=[e,modified,reclassified,unique,relic,relic2,custom,old];
 const result=model.displayList(inventory);
 assert.equal(result.total,8);
 assert.ok(result.entries.every(x=>x.count===1));
 assert.equal(model.stackKey(modified),null);
 assert.equal(model.stackKey(unique),null);
 assert.equal(model.stackKey(relic),null);
 assert.equal(model.stackKey(custom),null);
 assert.equal(model.displayList(inventory,{storyId:'novel-X'}).total,2);
});
test('V42.4: old shop/legacy items stay separate and item variants are preserved',()=>{
 const v1={id:'e1',instanceId:'old-1',name:'Mì Tôm Cay Dung Thành'};
 const v2={id:'e1',instanceId:'old-2',name:'Mì Tôm Cay Dung Thành'};
 const shop1={id:'shop-food-1',instanceId:'shop1',name:'Cà phê máy'};
 const shop2={...shop1,instanceId:'shop2'};
 const result=model.displayList([v1,v2,shop1,shop2]);
 assert.equal(result.total,4);
 assert.equal(result.entries[0].detail.id,'e1');
 assert.deepEqual(result.entries.map(x=>x.count),[1,1,1,1]);
});
test('V42.4: paging is counted in visible slots, not hidden copies',()=>{
 const inv=Array.from({length:50},(_,i)=>drop('f1',i,'novel-'+i,'ch-'+i));
 inv.push(...Array.from({length:28},(_,i)=>({
  id:'author-item-'+i,scope:'STORY',storyId:'novel-'+i,
  name:'Nhẫn '+i,rank:'F',type:'ITEM',instanceId:'auth-'+i,unique:false
 })));
 const first=model.displayList(inv,{limit:24});
 assert.equal(first.total,29);
 assert.equal(first.inventoryTotal,78);
 assert.equal(first.entries.length,24);
 assert.equal(first.entries[0].count,50);
 assert.equal(first.entries[0].indices.length,50);
 assert.equal(first.nextOffset,24);
 assert.equal(first.hasMore,true);
 const second=model.displayList(inv,{limit:24,offset:24});
 assert.equal(second.entries.length,5);
 assert.equal(second.hasMore,false);
});
test('V42.4: origin filter does not divide COMMON loot by acquisition story',()=>{
 const inv=[
  drop('f1',1,'story-A','c1'),drop('f1',2,'story-B','c2'),
  {id:'author-item-abc',scope:'CHAPTER',storyId:'story-A',
   chapterId:'c1',rank:'D',type:'ITEM',name:'Mảnh khóa'},
  drop('cult-spirit-fragment',4,'story-B','c4')
 ];
 const all=model.displayList(inv);
 assert.equal(all.total,3);
 assert.equal(model.displayList(inv,{storyId:'GLOBAL'}).total,2);
 const story=model.displayList(inv,{storyId:'story-A'});
 assert.equal(story.total,1);
 assert.equal(story.entries[0].detail.id,'author-item-abc');
 assert.equal(all.inventoryTotal,4);
});

test('V42.4: scarce rank B–SSS items remain separate even when catalog says non-unique',()=>{
 const rareA=drop('b1',1,'story-A','ch-1');
 const rareB=drop('b1',2,'story-B','ch-2');
 const relic1=drop('cult-ancient-relic-shard',3,'story-A','ch-1');
 const relic2=drop('cult-ancient-relic-shard',4,'story-B','ch-4');
 const result=model.displayList([rareA,rareB,relic1,relic2]);
 assert.equal(result.total,4);
 assert.deepEqual(result.entries.map(e=>e.count),[1,1,1,1]);
 assert.equal(model.stackKey(rareA),null);
 assert.equal(model.stackKey(relic1),null);
});

test('V42.5: exact old init-1/init-2 starters display together with canonical f1/e3',()=>{
 const oldBread={id:'init-1',name:'Mẩu Bánh Mì Mốc',rank:'F',
  type:'FOOD',icon:'🍞',desc:'Khô khốc, chống đói lúc tuyệt vọng.'};
 const oldKnife={id:'init-2',name:'Dao Gọt Trái Cây Cũ',rank:'E',
  type:'WEAPON',icon:'🔪',desc:'Vũ khí thô sơ nhất để tự vệ.'};
 const owned=[oldBread,drop('f1',1,'story-B','chapter-7'),
  oldKnife,drop('e3',2,'story-C','chapter-5')];
 const before=JSON.stringify(owned);
 const grouped=model.displayList(owned);
 assert.equal(grouped.total,2);
 assert.deepEqual(grouped.entries.map(x=>({id:x.detail.id,count:x.count})),
  [{id:'f1',count:2},{id:'e3',count:2}]);
 assert.equal(grouped.entries[0].detail.originalId,'init-1');
 assert.equal(grouped.entries[1].detail.originalId,'init-2');
 assert.equal(model.starterAlias(oldBread),'f1');
 assert.equal(model.starterAlias(oldKnife),'e3');
 assert.equal(model.canonicalFor(oldBread),catalog.byId('f1'));
 assert.equal(JSON.stringify(owned),before);
});
test('V42.5: altered old items and user-defined init IDs are NOT auto-merged',()=>{
 const fake={id:'init-1',name:'Một món không phải bánh mì',
  rank:'F',type:'FOOD',icon:'🍞',desc:'Khô khốc, chống đói lúc tuyệt vọng.'};
 const changed={id:'init-1',name:'Mẩu Bánh Mì Mốc',rank:'F',
  type:'FOOD',icon:'🍞',desc:'Khô khốc, chống đói lúc tuyệt vọng.',
  effect:{attack:999}};
 assert.equal(model.starterAlias(fake),null);
 assert.equal(model.starterAlias(changed),null);
 assert.equal(model.stackKey(fake),null);
 assert.equal(model.stackKey(changed),null);
 const owned=[fake,changed,drop('f1',3,'story-B','ch1')];
 assert.equal(model.displayList(owned).total,3);
});
