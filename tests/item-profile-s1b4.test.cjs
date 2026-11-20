/* S1-B4 P0/P1: no grants, receipts or avatar selections from view-models. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../js/item-catalog-v2.js');
const economy=require('../js/economy-core-v43.js');
const model=require('../js/inventory-model-v42.js');
const avatar=require('../js/player-avatar-v16.js');
const view=require('../js/item-profile-s1b4.js');
const root=path.resolve(__dirname,'..');
test('P0: 15 live saleIds stay untouched; view-model reads canonical catalog',()=>{
  const saleIds=[...economy.SHOP_IDS,economy.TOOL_ID,economy.SUPPLY_ID,economy.PULSE_ID];
  assert.equal(saleIds.length,15);
  assert.equal(economy.preview({tab:'COMMON'}).length,economy.SHOP_IDS.length);
  const sku=economy.preview({tab:'COMMON'})[0];
  const raw={...sku};
  const profile=view.profile(sku,{catalog,economy,inventory:[],saleIds,readOnly:false});
  assert.equal(profile.id,sku.id);
  assert.equal(profile.name,catalog.byId(sku.id).name);
  assert.equal(profile.saleListed,true);
  assert.equal(profile.ownershipVerified,false);
  assert.equal(profile.instanceId,null);
  assert.deepEqual(sku,raw);
  assert.equal(view.profile(sku,{catalog,economy,saleIds,readOnly:true}).saleListed,false);
});
test('P0: receipt remains read-only; preserving instanceId and lock flags',()=>{
  const fixture={...catalog.byId('common-biscuit'),instanceId:'inst-existing-004',
    obtainedFrom:{kind:'CHAPTER',source:'CHAPTER_LOOT',storyId:'s1',chapterId:'c1'},locked:true};
  const before=JSON.stringify(fixture);
  const p=view.profile(fixture,{catalog,economy,model,inventory:[fixture],record:fixture});
  assert.equal(p.instanceId,'inst-existing-004');
  assert.equal(p.locked,true);
  assert.equal(p.ownershipVerified,false);
  assert.equal(p.ownerStatus.includes('chưa'),true);
  assert.equal(p.receiptSource.includes('bản ghi chưa đối soát'),true);
  assert.equal(p.catalogSource.includes('theo danh mục'),true);
  assert.equal(JSON.stringify(fixture),before);
});
test('P0: existing functional tool has grounded use label, no synthetic entitlement',()=>{
  const tool=economy.FUNCTIONAL_TOOLS.find(x=>x.id===economy.TOOL_ID);
  const instance=economy.instance(tool,'existing-instance');
  assert.ok(instance);
  const p=view.profile(instance,{catalog,economy,model,record:instance,inventory:[instance]});
  assert.equal(p.usableInInventory,true);
  assert.match(p.conditions,/Kho/);
  assert.equal(p.ownershipVerified,false);
  const noReceipt={...instance,obtainedFrom:null};
  assert.equal(view.profile(noReceipt,{catalog,economy,model,record:noReceipt}).usableInInventory,false);
});
test('P0: unknown items fail closed, no invented item IDs or default use',()=>{
  assert.equal(view.profile(null),null);
  assert.equal(view.profile({name:'Bảo vật không ID'}),null);
  const row=view.profile({id:'old-foreign-id',name:'Kỷ vật cũ'},{catalog,economy});
  assert.equal(row.id,'old-foreign-id');
  assert.equal(row.usableInInventory,false);
  assert.equal(row.ownershipVerified,false);
  assert.equal(row.saleListed,false);
});
test('P1: appearance cards are preview only, no avatar mutation or new asset',()=>{
  assert.deepEqual(view.APPEARANCES.map(x=>x.visualStatus),
    ['PLACEHOLDER','EXISTING','ART_PENDING']);
  assert.ok(view.APPEARANCES.every(x=>x.selectable===false));
  assert.ok(view.APPEARANCES.every(x=>x.appearanceId));
  assert.equal(view.APPEARANCES[1].assetSrc,'assets/shop-r3/thanh-van.webp');
  assert.ok(fs.existsSync(path.join(root,view.APPEARANCES[1].assetSrc)));
  assert.ok(avatar.safeState(null).kind==='initials');
  assert.equal(avatar.canChooseFrame('author'),false);
  assert.equal(avatar.canChooseFrame('moon'),true);
});
test('S1-B4: wiring preserves market callback and inventory action handlers',()=>{
  const market=fs.readFileSync(path.join(root,'js/market-ui-v43.js'),'utf8');
  const inventory=fs.readFileSync(path.join(root,'js/inventory-view-v42.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'js/item-profile-s1b4.js'),'utf8');
  assert.match(market,/saleIds\.includes\(item\.id\)/);
  assert.match(market,/await onBuy\(item\.id\)/);
  assert.match(market,/Ngoại Hình/);
  assert.match(market,/DuduItemProfileS1B4\?\.APPEARANCES/);
  assert.match(inventory,/args\.onSellMany/);
  assert.match(inventory,/args\.onToggleLock/);
  assert.match(inventory,/args\.onDiscard/);
  assert.match(inventory,/DuduItemProfileS1B4\?\.profile/);
  assert.match(html,/js\/item-profile-s1b4\.js/);
  assert.match(html,/css\/item-profile-s1b4\.css/);
  assert.doesNotMatch(js,/\b(?:localStorage|firebase|firestore|runTransaction)\b/);
  assert.match(fs.readFileSync(path.join(root,'js/tutien-integ-t0.js'),'utf8'),/MOCK ONLY/);
});
