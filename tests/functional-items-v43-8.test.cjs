const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../js/economy-core-v43.js');
const catalog=require('../js/item-catalog-v2.js');
const rules=require('../js/functional-items-v43-8.js');
const quests=require('../js/quest-engine-v43-7.js');
const day='2026-10-17',now=new Date(2026,9,17,12,0,0).getTime();
const mk=(id,uuid='a')=>{
 const product=core.preview({tab:'TOOLS'}).find(x=>x.id===id);
 assert.ok(product);
 return core.instance(product,'shop-'+uuid);
};
const supply=()=>mk(core.SUPPLY_ID,'kit');
const pulse=()=>mk(core.PULSE_ID,'pulse');
const coupon=()=>mk(core.COUPON_ID,'coupon');
const quote=(item,params={})=>rules.quoteUse({inventory:[item],itemInstanceId:item.instanceId,
 day,now,lastLootTimestamp:now-1000,...params});
test('V44.1 retains 70 legacy plus 90 realm items, shop limits and 4 function tools',()=>{
 assert.equal(catalog.items.length,179);
 assert.equal(catalog.validate().length,0);
 assert.deepEqual(core.preview({tab:'TOOLS'}).map(x=>x.id),
  [core.TOOL_ID,core.SUPPLY_ID,core.PULSE_ID,core.COUPON_ID]);
 assert.equal(core.shopCatalog().length,12);
 assert.equal(core.quotePurchase({itemId:core.SUPPLY_ID,coins:20,day}).charged,20);
 assert.equal(core.quotePurchase({itemId:core.PULSE_ID,coins:16,day}).charged,16);
 const bought=core.quotePurchase({itemId:core.COUPON_ID,coins:100,day});
 assert.equal(bought.ok,true);
 const second=core.quotePurchase({itemId:core.COUPON_ID,coins:100,day,state:bought.state});
 assert.equal(second.reason,'daily-limit');
 assert.equal(core.quotePurchase({itemId:'sss1',coins:999,day}).ok,false);
 assert.equal(core.preview({tab:'DUDU'}).length,15);
 assert.equal(core.quotePurchase({itemId:'common-biscuit',coins:100,day,discount:20}).ok,false);
});
test('V43.8 supply kit consumes one exact item and grants only two fixed common items',()=>{
 const kit=supply(),other=mk(core.TOOL_ID,'cell'),inventory=[kit,other];
 const a=rules.quoteUse({inventory,itemInstanceId:kit.instanceId,now,day});
 assert.equal(a.ok,true);
 assert.equal(inventory.length,2,'immutable plan');
 assert.equal(a.inventory.length,3);
 assert.deepEqual(a.added.map(x=>x.id),['common-bottled-water','common-biscuit']);
 assert.equal(a.inventory.filter(x=>x===other).length,1);
 assert.ok(a.added.every(x=>x.scope==='COMMON'&&
  x.obtainedFrom.source==='DUDU_SUPPLY_V438'));
 assert.equal(a.state.counts[core.SUPPLY_ID],1);
 assert.equal(quote(supply(),{inventory:Array(500).fill(other).concat([kit])}).reason,
  'inventory-full');
 const stuffed=[kit,...Array(499).fill(other)];
 assert.equal(quote(kit,{inventory:stuffed}).reason,'inventory-full');
 const edge=[kit,...Array(498).fill(other)];
 assert.equal(quote(kit,{inventory:edge}).inventory.length,500);
 assert.equal(quote(kit,{state:a.state}).reason,'already-used');
});
test('V43.8 pulse shortens only phone cooldown by 60 seconds',()=>{
 const p=pulse();
 const a=quote(p,{lastLootTimestamp:now-1000});
 assert.equal(a.ok,true);
 assert.equal(a.lastLootTimestamp,now-61000);
 assert.equal(a.inventory.length,0);
 assert.equal(a.added.length,0);
 assert.equal(quote(p,{lastLootTimestamp:now-850000}).lastLootTimestamp,0);
 assert.equal(quote(p,{lastLootTimestamp:now-920000}).reason,'no-cooldown');
 assert.equal(a.lootedChapters,undefined);
});
test('V43.8 coupon activates once, discounts common goods, never tools or future days',()=>{
 const c=coupon();
 const activation=quote(c);
 assert.equal(activation.ok,true);
 assert.equal(activation.state.pending.instanceId,c.instanceId);
 assert.equal(quote(mk(core.COUPON_ID,'second'),
  {state:activation.state}).reason,'daily-limit');
 const d=rules.discount(activation.state,{itemId:'common-signal-device',price:48,day});
 assert.equal(d.amount,12);
 assert.equal(rules.discount(activation.state,{itemId:core.SUPPLY_ID,price:20,day}).amount,0);
 assert.equal(rules.discount(activation.state,{itemId:'sss1',price:300,day}).amount,0);
 const purchase=core.quotePurchase({itemId:'common-signal-device',coins:38,
  day,discount:d.amount});
 assert.equal(purchase.ok,true);
 assert.equal(purchase.charged,36);
 assert.equal(purchase.coins,2);
 const redeemed=rules.redeem(activation.state,{itemId:'common-signal-device',price:48,day});
 assert.equal(redeemed.ok,true);
 assert.equal(redeemed.state.pending,null);
 assert.equal(rules.redeem(redeemed.state,{itemId:'common-signal-device',price:48,day}).ok,false);
 assert.equal(rules.discount(activation.state,{itemId:'common-signal-device',price:48,
  day:'2026-10-18'}).amount,0);
});
test('V43.8 rejects fabricated, duplicate, legacy, protected and foreign items',()=>{
 const a=supply();
 for(const invalid of [
  {...a,instanceId:'user-123'},
  {...a,itemId:'sss1'},
  {...a,obtainedFrom:{kind:'CHAPTER'}},
  {...a,scope:'DUDU'},
  {...a,name:'Mảnh Vỡ Hệ Thống'},
  {...a,giftable:true},
  {...a,unique:true}
 ])assert.equal(rules.trusted(invalid),false);
 assert.equal(quote(a,{inventory:[a,{...a}]}).reason,'unowned-or-invalid');
 assert.equal(quote(a,{day:'2026-10-16'}).reason,'invalid-time');
 assert.equal(quote(a,{inventory:[]}).reason,'unowned-or-invalid');
 assert.equal(rules.availability({inventory:[a],itemInstanceId:a.instanceId,
  day,now}).canUse,true);
});
test('V43.8 daily limits, distinct tickets, rotation and receipt history',()=>{
 let s=null;
 for(const id of ['A','B']){
  const item=mk(core.SUPPLY_ID,id);
  const use=quote(item,{state:s});assert.equal(use.ok,true);s=use.state;
 }
 assert.equal(quote(mk(core.SUPPLY_ID,'C'),{state:s}).reason,'daily-limit');
 assert.equal(s.history.length,2);
 const tomorrow=rules.norm(s,'2026-10-18');
 assert.equal(tomorrow.counts[core.SUPPLY_ID]||0,0);
 assert.equal(tomorrow.history.length,2);
 const q=quests.ensure([]);
 assert.ok(q.some(x=>x.id==='q_daily_tool'));
 const evt=core.recordEvent(undefined,{type:'ITEM_USE',eventId:'shop-example',day});
 assert.equal(evt.ok,true);
 const next=quests.progress(q,undefined,{type:'ITEM_USE',eventId:'shop-example',day});
 assert.equal(next.quests.find(x=>x.id==='q_daily_tool').current,1);
});
test('V43.8 wiring only Sandbox, no direct Firebase/verified collectible writes',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const html=read('index.html');
 const view=read('js/inventory-view-v42.js');
 const runtime=read('js/economy-runtime-v43.js');
 assert.match(html,/functional-items-v43-8\.js/);
 assert.match(html,/inventory-v43-8\.css/);
 assert.match(html,/function useFunctionItemV438\(item\)/);
 assert.match(html,/prepareQuestEvent\('ITEM_USE'/);
 assert.match(runtime,/functionalV438\.redeem|functionalV438\?\.redeem/);
 assert.match(view,/dudu-v43-use-item/);
 assert.doesNotMatch(read('js/functional-items-v43-8.js'),/db\.collection|grantCollectible|fetch\(/);
});


test('V44.8: supply kit cannot duplicate a pre-existing output instance',()=>{
 const kit=supply();
 const outputId='supply-'+kit.instanceId+'-0';
 const oldWater={...catalog.byId('common-bottled-water'),instanceId:outputId,
  obtainedFrom:{kind:'EVENT',source:'DUDU_SUPPLY_V438',eventId:kit.instanceId}};
 const result=quote(kit,{inventory:[kit,oldWater]});
 assert.equal(result.ok,false);
 assert.equal(result.reason,'duplicate-output-instance');
 assert.equal(oldWater.instanceId,outputId);
});
