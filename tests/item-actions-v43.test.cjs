const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/economy-core-v43.js');
const actions=require('../js/item-actions-v43.js');
const DATE=2026, OCT=9, DAY=17;
const now=new Date(DATE,OCT,DAY,12,0,0).getTime();
function item(id='shop-cell-1'){
 const p=core.quotePurchase({itemId:core.TOOL_ID,coins:200,
   day:core.localDay(now),inventoryCount:0});
 assert.equal(p.ok,true);
 return {product:p.product,instance:core.instance(p.product,id),state:p.state};
}
test('V43.5.3: real cell is a functional shop item and excludes rare/quest items',()=>{
 const cell=item();
 assert.equal(cell.product.price,30);
 assert.equal(cell.instance.id,core.TOOL_ID);
 assert.equal(cell.instance.giftable,false);
 assert.equal(cell.instance.scope,'FUNCTIONAL');
 assert.equal(cell.instance.obtainedFrom.kind,'SHOP');
 assert.equal(core.shopCatalog().length,12,'existing 12 common items preserved');
 assert.equal(core.preview({tab:'TOOLS'}).length,1);
 assert.equal(core.preview({tab:'COMMON'}).some(i=>i.id===core.TOOL_ID),false);
 assert.equal(core.preview({tab:'DUDU'}).some(i=>i.id===core.TOOL_ID),false);
 assert.equal(core.quotePurchase({itemId:'sss1',coins:100000,day:core.localDay(now)}).ok,false);
 const second=core.quotePurchase({itemId:core.TOOL_ID,coins:170,
  day:core.localDay(now),state:cell.state});
 assert.equal(second.ok,true);
 const third=core.quotePurchase({itemId:core.TOOL_ID,coins:140,
  day:core.localDay(now),state:second.state});
 assert.equal(third.ok,false);
 assert.equal(third.reason,'daily-limit');
});
test('V43.5.3: consume one exact instance and clear ONLY phone cooldown',()=>{
 const {instance}=item();
 const keep={id:'f1',instanceId:'starter-f1'};
 const inventory=[instance,keep];
 const plan=actions.quote({inventory,itemInstanceId:instance.instanceId,
  lastLootTimestamp:now-1000,now});
 assert.equal(plan.ok,true);
 assert.equal(plan.remaining,119000);
 assert.equal(plan.lastLootTimestamp,0);
 assert.deepEqual(plan.inventory,[keep]);
 assert.equal(inventory.length,2,'pure plan cannot mutate save');
 assert.equal(plan.state.used,1);
 assert.equal(plan.state.eventIds.length,1);
 assert.equal(plan.currency,undefined);
 assert.equal(plan.exp,undefined);
 assert.equal(plan.lootedChapters,undefined);
 assert.equal(actions.quote({inventory:plan.inventory,itemInstanceId:instance.instanceId,
  state:plan.state,lastLootTimestamp:now-1000,now}).ok,false);
 assert.equal(actions.availability({inventory,itemInstanceId:instance.instanceId,
  state:plan.state,lastLootTimestamp:0,now}).reason,'already-used');
 const stillOwned={...instance,instanceId:'shop-cell-not-used'};
 assert.equal(actions.availability({inventory:[stillOwned],
  itemInstanceId:stillOwned.instanceId,state:plan.state,
  lastLootTimestamp:0,now}).reason,'no-cooldown');
});
test('V43.5.3: reject no active timer, fake tool, double use and daily cap',()=>{
 const {instance}=item();
 assert.equal(actions.quote({inventory:[instance],itemInstanceId:instance.instanceId,
  lastLootTimestamp:now-200000,now}).reason,'no-cooldown');
 assert.equal(actions.quote({inventory:[instance],itemInstanceId:instance.instanceId,
  lastLootTimestamp:now-1000,now,state:{version:1,day:core.localDay(now),used:2,eventIds:[]}}).reason,'daily-limit');
 const fake={...instance,obtainedFrom:{kind:'CHAPTER'}};
 assert.equal(actions.quote({inventory:[fake],itemInstanceId:fake.instanceId,
  lastLootTimestamp:now-1000,now}).reason,'unowned-or-invalid');
 const double=[instance,{...instance}];
 assert.equal(actions.quote({inventory:double,itemInstanceId:instance.instanceId,
  lastLootTimestamp:now-1000,now}).reason,'unowned-or-invalid');
 const other={...instance,instanceId:'shop-cell-2'};
 const first=actions.quote({inventory:[instance,other],itemInstanceId:instance.instanceId,
  lastLootTimestamp:now-1000,now});
 const later=actions.quote({inventory:first.inventory,state:first.state,
  itemInstanceId:other.instanceId,lastLootTimestamp:now-1000,now});
 assert.equal(later.ok,true);
 assert.equal(later.state.used,2);
 assert.equal(actions.quote({inventory:[instance],state:later.state,
  itemInstanceId:instance.instanceId,lastLootTimestamp:now-1000,now}).reason,'already-used');
 assert.equal(actions.norm(later.state,core.localDay(now+86400000)).used,0);
});
test('V43.5.3: invalid and future/rollback dates fail safely',()=>{
 const cell=item();
 assert.equal(actions.quote({inventory:[cell.instance],itemInstanceId:cell.instance.instanceId,
  now,lastLootTimestamp:now-1000,day:'2000-01-01'}).reason,'invalid-time');
 assert.equal(actions.validCell({...cell.instance,id:'shop-sss'}),false);
 assert.equal(actions.validCell({...cell.instance,instanceId:'fake'}),false);
 assert.equal(actions.norm(undefined,core.localDay(now)).used,0);
});
