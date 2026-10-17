const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../js/inventory-model-v42.js');
const catalog=require('../js/item-catalog-v2.js');
const trade=require('../js/inventory-trade-v43-9.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('V44 compact: warehouse tab bar precedes search and item grid with no redundant metrics',()=>{
 const html=read('index.html');
 const hub=html.indexOf('id="inventory-v439-hub"');
 const toolbar=html.indexOf('id="inventory-v2-toolbar"');
 const grid=html.indexOf('id="inventory-container"');
 assert.ok(hub>0&&hub<toolbar&&toolbar<grid);
 assert.match(html,/inventory-compact-v44\.css\?v=\d+/);
 assert.match(html,/DuduInventoryHubV439\?\.reset\(\)/);
 assert.match(html,/DuduInventoryViewV42\.toggleAdvanced\(\)/);
 assert.equal(html.split('id="inventory-v439-hub"').length-1,1);
 const source=read('js/inventory-hub-v43-9.js');
 assert.doesNotMatch(source,/dudu-v439-metrics|KHO XUYÊN THẾ GIỚI/);
 assert.match(source,/if\(pane!=='overview'\)/);
 assert.match(source,/onModeChange\(id\)/);
});
test('V44 compact: every inventory tab filters actual physical entries without renumbering IDs',()=>{
 const t=(id,instance)=>({...catalog.byId(id),instanceId:instance,
  obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}});
 const story={id:'story-a',title:'Test',realmTag:'CULTIVATION',
  chapters:[{id:'ch-1',realmTag:'CULTIVATION'}]};
 const items=[t('common-biscuit','x1'),
  {...catalog.byId('cult-spirit-fragment'),instanceId:'x2',
   obtainedFrom:{kind:'CHAPTER',storyId:'story-a',chapterId:'ch-1'}},
  t('common-flashlight','x3')];
 const sale=model.displayList(items,{
  predicate:item=>trade.saleValue(item)>0
 });
 assert.equal(sale.total,2);
 assert.deepEqual(sale.entries.map(x=>x.index),[0,2]);
 const gifts=model.displayList(items,{
  predicate:item=>trade.storyTargets(item,[story]).length>0
 });
 assert.equal(gifts.total,3);
 const none=model.displayList(items,{predicate:()=>false});
 assert.equal(none.total,0);
 assert.equal(none.inventoryTotal,3);
 const paged=model.displayList(items,{
  predicate:item=>trade.saleValue(item)>0,limit:1
 });
 assert.equal(paged.total,2);
 assert.equal(paged.hasMore,true);
 assert.equal(paged.entries[0].index,0);
 const follow=model.displayList(items,{
  predicate:item=>trade.saleValue(item)>0,offset:1
 });
 assert.deepEqual(follow.entries.map(x=>x.index),[2]);
});
test('V44 compact: tools, shop, auction, gifting remain discoverable without always-on explanations',()=>{
 const source=read('js/inventory-hub-v43-9.js');
 const view=read('js/inventory-view-v42.js');
 const css=read('css/inventory-compact-v44.css');
 assert.match(source,/data\.mode=id/);
 assert.match(source,/dudu-v440-help/);
 assert.match(source,/dudu-v440-history/);
 assert.match(source,/s\.listings/);
 assert.match(source,/onCancel\?\./);
 assert.match(view,/args\.itemFilter/);
 assert.match(view,/toggleAdvanced/);
 assert.match(view,/\/500/);
 assert.match(css,/#inventory-v42-options:not\(\[open\]\)/);
 assert.match(css,/#inventory-container \.dudu-v42-slot/);
 assert.match(css,/@media\(max-width:365px\)/);
});
