const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const view=fs.readFileSync(path.join(__dirname,'../js/inventory-view-v42.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/inventory-v42.css'),'utf8');
const model=require('../js/inventory-model-v42.js');
const core=require('../js/economy-core-v43.js');
const personal=require('../js/personal-spark-items-v1.js');

test('V42: category-aware inventory runs for Sandbox and authenticated personal accounts',()=>{
 assert.match(html,/src="js\/inventory-model-v42.js\?v=[\w-]+"/);
 assert.match(html,/src="js\/inventory-view-v42.js\?v=c24d-1"/);
 assert.ok(html.indexOf('src="js/inventory-model-v42.js')<
   html.indexOf('src="js/inventory-view-v42.js'));
 assert.match(html,/if\(IS_SANDBOX_MODE&&window\.DuduInventoryViewV42\)/);
 assert.match(html,/if\(personalItemsReady\(\)&&window\.DuduInventoryViewV42\)/);
 assert.match(html,/personalMode:true/);
 assert.match(html,/onUse\(item\)\{[\s\S]*?personalInventoryAction\('use',item\)/);
 assert.match(html,/onSell\(item\)\{[\s\S]*?personalInventoryAction\('sell',item\)/);
 assert.match(html,/buyback:price/);
 assert.match(html,/if\(ready\)return;/);
 assert.match(html,/css\/inventory-v42.css\?v=c24c-1/);
 assert.match(css,/body\.dudu-phone-v11 #cyber-phone #inventory-container\.dudu-v42-grid/);
});
test('V42: purchased supply, food and tent land in expected tabs with valid live actions',()=>{
 const product=id=>[...core.shopCatalog(),...core.FUNCTIONAL_TOOLS].find(x=>x.id===id);
 const item=id=>core.instance(product(id),'shop-12345678-1234-1234-1234-123456789abc');
 const supply=item(core.SUPPLY_ID),biscuit=item('common-biscuit'),tent=item('common-tent');
 assert.equal(model.inspect(supply).category,'TOOL');
 assert.equal(model.inspect(supply).usageStatus,'OPEN_SUPPLY');
 assert.equal(personal.canUse(supply),true);
 assert.ok(personal.sellPrice(supply)>0);
 assert.equal(model.inspect(biscuit).category,'CONSUMABLE');
 assert.ok(personal.sellPrice(biscuit)>0);
 assert.equal(model.inspect(tent).category,'TOOL');
 const inventory=[supply,biscuit,tent];
 assert.equal(model.displayList(inventory,{category:'CONSUMABLE'}).total,1);
 assert.equal(model.displayList(inventory,{category:'TOOL'}).total,2);
 assert.equal(model.displayList(inventory,{category:'ACTIVATABLE'}).total,1);
 assert.match(view,/args\.personalMode\?'Giá bán về ví'/);
 assert.match(view,/sell\.disabled=tradeStatus\.busy===true/);
 assert.match(html,/giftTargets:0,busy:personalItemBusy/);
 assert.doesNotMatch(css,/body\.dudu-spark-personal-mode #cyber-phone #phone-app-inventory \.dudu-v441-open/);
 assert.match(html,/DuduPersonalCollectionC24\.snapshot/);
 assert.match(view,/typeof args\.onDiscard==='function'/);
});
test('V42: eight stable role controls, world, story and rank filters in compact layout',()=>{
 for(const category of Object.keys(model.CATEGORIES)){
  assert.match(html,new RegExp('data-category="'+category+'"'));
 }
 for(const id of ['inventory-v42-categories','inventory-v42-realm',
  'inventory-v42-rank','inventory-v42-story','inventory-v42-sort',
  'inventory-v42-more','inventory-v12-detail','inventory-container']){
  assert.equal(html.split('id="'+id+'"').length-1,1,'unique element '+id);
 }
 assert.match(html,/Bộ lọc nâng cao/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(view,/pageSize=24/);
 assert.match(view,/model\.displayList\(args\.inventory,\{\.\.\.options/);
});
test('V42: inspector stays read-only for RPG and avoids unhandled discards',()=>{
 assert.match(view,/NOT_IMPLEMENTED|Chưa kích hoạt trong V42/);
 assert.match(view,/if\(!detail\.protected&&typeof args\.onDiscard==='function'\)/);
 assert.match(view,/args\.inventory\[entry\.index\]!==entry\.item/);
 assert.match(view,/if\(!confirm\(/);
 assert.match(view,/verifiedCollectible/);
 assert.doesNotMatch(view,/localStorage\.setItem|db\.collection\(|setDoc\(|grant\(/);
});
test('V42: saving real zero coins remains zero and existing array inventory untouched',()=>{
 assert.match(html,/Number\.isFinite\(Number\(userProfile\.currency\)\)/);
 assert.doesNotMatch(html,/currency: parseInt\(userProfile\.currency\) \|\| 50,/);
 assert.match(html,/inventory: Array\.isArray\(userProfile\.inventory\) \? userProfile\.inventory : \[\]/);
});

test('V42.3: item detail lives in an accessible independent phone modal',()=>{
 assert.match(view,/host\.append\(overlay\)/);
 assert.match(view,/overlay\.setAttribute\('aria-hidden','true'\)/);
 assert.match(view,/dialog\.setAttribute\('role','dialog'\)/);
 assert.match(view,/dialog\.setAttribute\('aria-modal','true'\)/);
 assert.match(view,/dialog\.setAttribute\('aria-labelledby','inventory-v42-modal-heading'\)/);
 assert.match(view,/dialog\.setAttribute\('aria-describedby','inventory-v42-modal-description'\)/);
 assert.match(view,/if\(event\.key==='Escape'\)/);
 assert.match(view,/if\(event\.key==='Tab'\)/);
 assert.match(view,/event\.target===overlay/);
 assert.match(view,/hideModal\(\)/);
 assert.match(view,/focusIndex=entry\.index/);
 assert.match(css,/#inventory-v42-modal\[hidden\]/);
 assert.match(css,/\.dudu-v42-dialog-scroll\{/);
 assert.match(css,/overflow-y:auto/);
 assert.doesNotMatch(css,/position:sticky;bottom:7px/);
});
test('V42.3: redundant counter is hidden and navigation closes the detail modal',()=>{
 assert.match(html,/id="inventory-v2-count" hidden aria-hidden="true"/);
 assert.match(view,/count\.textContent='';count\.hidden=true/);
 assert.match(css,/#inventory-v2-count\{\s*display:none!important/);
 assert.match(html,/inventoryDetailSelection=null;window\.DuduInventoryViewV42\?\.close\(\)/);
});

test('V42.4: only shareable loot shows ×N; story picker omits chapters of generic loot',()=>{
 assert.match(view,/const result=model\.displayList\(args\.inventory,\{\.\.\.options/);
 assert.match(view,/row\.items\.includes\(args\.selected\)/);
 assert.match(view,/entry\.count>1/);
 assert.match(view,/dudu-v42-slot-quantity/);
 assert.match(view,/Vứt 1 vật phẩm/);
 assert.match(view,/Chung toàn hệ thống/);
 assert.match(view,/Chung trong thế giới/);
 assert.match(view,/if\(\['COMMON','REALM'\]\.includes\(detail\?\.scope\)\)continue/);
 assert.doesNotMatch(view,/\.splice\(/);
});
