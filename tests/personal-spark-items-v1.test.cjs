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
