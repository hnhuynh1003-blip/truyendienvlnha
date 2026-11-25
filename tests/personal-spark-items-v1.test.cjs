'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const items=require('../js/personal-spark-items-v1.js');
const economy=require('../js/economy-core-v43.js');
const questEvents=require('../js/personal-quest-events-c45.js');

const SHOP='shop-12345678-1234-1234-1234-123456789abc';
const USE='use-12345678-1234-1234-1234-123456789abd';
const SELL='sell-12345678-1234-1234-1234-123456789abe';
function harness(){
 const data={currency:100,inventory:[],storyStates:{novel:{chapter:2}}};
 const ref={path:'profiles_v2/reader-1'};
 const db={collection:x=>{assert.equal(x,'profiles_v2');return{doc:id=>{
  assert.equal(id,'reader-1');return ref;}};},
  runTransaction:async fn=>fn({
   get:async r=>{assert.equal(r,ref);return {exists:true,data:()=>structuredClone(data)};},
   update:(r,patch)=>{assert.equal(r,ref);Object.assign(data,structuredClone(patch));}
  })};
 const user={uid:'reader-1'},auth={currentUser:user};
 const run=args=>items.run({db,auth,uid:'reader-1',...args});
 return {data,db,auth,run};
}
test('Personal purchase debits existing wallet once and persists canonical item',async()=>{
 const h=harness();
 const first=await h.run({kind:'purchase',requestId:SHOP,itemId:economy.SUPPLY_ID});
 assert.equal(first.status,'applied');
 assert.equal(h.data.currency,80);
 assert.equal(h.data.inventory.length,1);
 assert.equal(h.data.inventory[0].instanceId,SHOP);
 assert.equal(h.data.inventory[0].obtainedFrom.source,'DUDU_MARKET');
 assert.deepEqual(h.data.storyStates.novel,{chapter:2});
 assert.equal(h.data.quests.find(q=>q.id==='q_week_shop').current,1);
 assert.equal(h.data.storyStates[questEvents.META].events.length,1);
 const retry=await h.run({kind:'purchase',requestId:SHOP,itemId:economy.SUPPLY_ID});
 assert.equal(retry.status,'already-applied');
 assert.equal(h.data.currency,80);
 assert.equal(h.data.inventory.length,1);
 assert.equal(h.data.quests.find(q=>q.id==='q_week_shop').current,1);
 await assert.rejects(h.run({kind:'purchase',requestId:SHOP,itemId:economy.PULSE_ID}),/khác/);
});
test('Supply kit consumes one and grants exactly two common items, not rare items',async()=>{
 const h=harness();
 await h.run({kind:'purchase',requestId:SHOP,itemId:economy.SUPPLY_ID});
 const used=await h.run({kind:'use',requestId:USE,itemId:economy.SUPPLY_ID,instanceId:SHOP});
 assert.equal(used.effect,'open-supply');
 assert.equal(h.data.currency,80);
 assert.equal(h.data.inventory.length,2);
 assert.deepEqual(h.data.inventory.map(x=>x.id).sort(),['common-biscuit','common-bottled-water']);
 assert.equal(h.data.quests.find(q=>q.id==='q_daily_tool').current,1);
 const retry=await h.run({kind:'use',requestId:USE,itemId:economy.SUPPLY_ID,instanceId:SHOP});
 assert.equal(retry.status,'already-applied');
 assert.equal(h.data.inventory.length,2);
 assert.equal(h.data.quests.find(q=>q.id==='q_daily_tool').current,1);
});
test('Personal sale returns only the canonical common item buyback and cannot repeat',async()=>{
 const h=harness();
 await h.run({kind:'purchase',requestId:SHOP,itemId:'common-biscuit'});
 const price=items.sellPrice(h.data.inventory[0]);
 assert.ok(price>0);
 const before=h.data.currency;
 await h.run({kind:'sell',requestId:SELL,itemId:'common-biscuit',instanceId:SHOP});
 assert.equal(h.data.inventory.length,0);
 assert.equal(h.data.currency,before+price);
 assert.equal(h.data.quests.find(q=>q.id==='q_week_shop').current,1);
 const replay=await h.run({kind:'sell',requestId:SELL,itemId:'common-biscuit',instanceId:SHOP});
 assert.equal(replay.status,'already-applied');
 assert.equal(h.data.currency,before+price);
 await assert.rejects(h.run({kind:'sell',
  requestId:'sell-12345678-1234-1234-1234-123456789abf',
  itemId:'common-biscuit',instanceId:SHOP}),/không còn/);
});
test('Purchased functional tools can be resold once; forged ones cannot',async()=>{
 const h=harness();
 await h.run({kind:'purchase',requestId:SHOP,itemId:economy.SUPPLY_ID});
 const kit=h.data.inventory[0];
 const buyback=items.sellPrice(kit);
 const listPrice=economy.FUNCTIONAL_TOOLS.find(x=>x.id===economy.SUPPLY_ID).price;
 assert.equal(buyback,Math.floor(listPrice*.35));
 assert.equal(items.sellPrice({...kit,name:'Món giả'}),0);
 assert.equal(items.sellPrice({...kit,obtainedFrom:{kind:'CHAPTER',source:'DUDU_MARKET'}}),0);
 assert.equal(items.sellPrice({...kit,instanceId:'fake'}),0);
 const balance=h.data.currency;
 const sold=await h.run({kind:'sell',requestId:SELL,itemId:economy.SUPPLY_ID,instanceId:SHOP});
 assert.equal(sold.price,buyback);
 assert.equal(h.data.currency,balance+buyback);
 assert.equal(h.data.inventory.length,0);
 const replay=await h.run({kind:'sell',requestId:SELL,itemId:economy.SUPPLY_ID,instanceId:SHOP});
 assert.equal(replay.status,'already-applied');
 assert.equal(h.data.currency,balance+buyback);
});
test('Cooldown tool is spent only during active cooldown',async()=>{
 const h=harness();
 await h.run({kind:'purchase',requestId:SHOP,itemId:economy.TOOL_ID});
 await assert.rejects(h.run({kind:'use',requestId:USE,
  itemId:economy.TOOL_ID,instanceId:SHOP,cooldownRemainingMs:0}),/đã hồi chiêu/);
 assert.equal(h.data.inventory.length,1);
 const first=await h.run({kind:'use',requestId:USE,itemId:economy.TOOL_ID,
  instanceId:SHOP,cooldownRemainingMs:50000});
 assert.equal(first.effect,'reset-cooldown');
 assert.equal(h.data.inventory.length,0);
});
test('Personal whitelist has 15 enabled SKUs; hidden coupon is rejected before writes',async()=>{
 const expected=[...economy.SHOP_IDS,economy.SUPPLY_ID,economy.TOOL_ID,economy.PULSE_ID];
 assert.deepEqual(economy.PERSONAL_SALE_IDS,expected);
 assert.equal(new Set(economy.PERSONAL_SALE_IDS).size,15);
 assert.ok(!economy.PERSONAL_SALE_IDS.includes(economy.COUPON_ID));
 const rejected=harness(),before=structuredClone(rejected.data);
 await assert.rejects(rejected.run({kind:'purchase',requestId:SHOP,itemId:economy.COUPON_ID}),/không bán/);
 assert.deepEqual(rejected.data,before,'hidden product must not touch wallet, inventory, receipts');
 for(const id of expected){
  const h=harness(),balance=h.data.currency;
  const first=await h.run({kind:'purchase',requestId:SHOP,itemId:id});
  assert.equal(first.status,'applied',id);
  assert.equal(h.data.inventory[0].id,id);
  assert.ok(h.data.currency<balance,id);
  assert.equal((await h.run({kind:'purchase',requestId:SHOP,itemId:id})).status,'already-applied');
  assert.equal(h.data.inventory.length,1,id);
 }
});
test('Direct coupon purchase refuses BEFORE Firestore transaction and never credits EXP or Tu Vi',async()=>{
 const h=harness();
 let reads=0;
 const original=h.db.runTransaction;
 h.db.runTransaction=async callback=>{reads++;return original(callback);};
 h.data.exp=240;h.data.level=7;h.data.tuVi=96;
 const before=structuredClone(h.data);
 for(const forbidden of [economy.COUPON_ID,'unknown-staged-sku',null,'']){
  await assert.rejects(h.run({kind:'purchase',requestId:SHOP,itemId:forbidden}),/không bán/);
  assert.equal(reads,0,'refused SKU must never open Firestore transaction');
  assert.deepEqual(h.data,before,'refused SKU must never mutate profile');
 }
 const purchased=await h.run({kind:'purchase',requestId:SHOP,itemId:'common-biscuit'});
 assert.equal(purchased.status,'applied');
 assert.equal(reads,1);
 assert.equal(h.data.currency,before.currency-economy.PRICES['common-biscuit']);
 assert.equal(h.data.exp,before.exp,'Shop purchase is not reading EXP');
 assert.equal(h.data.level,before.level);
 assert.equal(h.data.tuVi,before.tuVi,'Shopping cannot mint cultivation');
 assert.equal(purchased.awardExp,undefined);
 assert.equal(purchased.awardTuVi,undefined);
});

test('Legacy canonical coupon stays resellable without reopening its purchase',async()=>{
 const coupon=economy.instance(economy.FUNCTIONAL_TOOLS.find(x=>x.id===economy.COUPON_ID),SHOP);
 const h=harness(),price=items.sellPrice(coupon);
 assert.ok(price>0);
 h.data.inventory=[coupon];
 const balance=h.data.currency;
 const sold=await h.run({kind:'sell',requestId:SELL,itemId:economy.COUPON_ID,instanceId:SHOP});
 assert.equal(sold.status,'applied');
 assert.equal(h.data.currency,balance+price);
 assert.equal(h.data.inventory.length,0);
});
test('Foreign account, unsupported product, bad request id, and empty balance fail',async()=>{
 const h=harness();
 h.auth.currentUser={uid:'reader-2'};
 await assert.rejects(h.run({kind:'purchase',requestId:SHOP,itemId:economy.SUPPLY_ID}),/tài khoản/);
 h.auth.currentUser={uid:'reader-1'};
 await assert.rejects(h.run({kind:'purchase',requestId:SHOP,itemId:'shop-sss'}),/không bán/);
 await assert.rejects(h.run({kind:'purchase',requestId:'shop-fake',
  itemId:economy.SUPPLY_ID}),/tài khoản/);
 h.data.currency=0;
 await assert.rejects(h.run({kind:'purchase',requestId:SHOP,itemId:economy.SUPPLY_ID}),/Không đủ Xu/);
 assert.equal(h.data.inventory.length,0);
});
test('IDs use unique native UUIDs for shop/use/sell actions',()=>{
 const uuid='01234567-89ab-4cde-8f01-23456789abcd';
 assert.equal(items.requestId('shop',{randomUUID:()=>uuid}),'shop-'+uuid);
 assert.equal(items.requestId('use',{randomUUID:()=>uuid}),'use-'+uuid);
 assert.equal(items.requestId('sell',{randomUUID:()=>uuid}),'sell-'+uuid);
});
