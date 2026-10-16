const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluateGift}=require('../js/npc-gift-v2-r2.js');
const catalog=require('../js/item-catalog-v2.js');
const now=Date.parse('2026-10-15T12:00:00Z');
const instance=(override={})=>({
  npc:{giftPreferences:{likedTags:['COMMON_ITEM']}},
  item:catalog.common[0],
  relationship:{unlocked:true,affinity:20,relationshipV2:{
    giftDayUtc:'2026-10-15',acceptedGiftCountUtc:0,acceptedInstanceIds:[],
    acceptedGiftEventIds:[],lastGiftAt:0}},
  now,instanceId:'instance-1',giftEventId:'event-1',...override
});
test('liked F-rank gift accepts with bounded affection and trust',()=>{
  const p=evaluateGift(instance());
  assert.equal(p.status,'ACCEPT');assert.equal(p.delta.affinity,4);
  assert.equal(p.delta.trust,1);assert.equal(p.consumesItem,true);
});
test('disliked and boundary gifts refuse without inventory consumption',()=>{
  for(const preferences of [{dislikedTags:['COMMON_ITEM']},{refusedTags:['COMMON_ITEM']}]){
    const p=evaluateGift(instance({npc:{giftPreferences:preferences}}));
    assert.equal(p.status,'REFUSE');assert.equal(p.consumesItem,false);
    assert.equal(p.delta.affinity,0);
  }
});
test('cooldown, daily limit, duplicate instance and event all fail closed',()=>{
  const old=instance().relationship.relationshipV2;
  for(const relationshipV2 of [
    {...old,lastGiftAt:now-1000},
    {...old,acceptedGiftCountUtc:3},
    {...old,acceptedInstanceIds:['instance-1']},
    {...old,acceptedGiftEventIds:['event-1']}
  ]){const p=evaluateGift(instance({relationship:{unlocked:true,affinity:20,relationshipV2}}));
    assert.equal(p.consumesItem,false);assert.notEqual(p.status,'ACCEPT');
  }
});
test('rank never yields more than 8; repeated gifts apply diminishing returns',()=>{
  const item={...catalog.common[0],rank:'SSS'};
  for(const count of [0,1,2]){
    const p=evaluateGift(instance({item,relationship:{unlocked:true,affinity:20,
      relationshipV2:{giftDayUtc:'2026-10-15',acceptedGiftCountUtc:count,lastGiftAt:0}}}));
    assert.equal(p.status,'ACCEPT');
    assert.ok(p.delta.affinity<=8);
    if(count>0)assert.equal(p.delta.trust,0);
  }
});
test('no mutation of NPC, inventory, existing relation, or collectible permissions',()=>{
  const params=instance();
  const snapshot=JSON.stringify(params);
  evaluateGift(params);
  assert.equal(JSON.stringify(params),snapshot);
  for(const item of catalog.souvenirs){
    const p=evaluateGift(instance({item}));
    assert.equal(p.status,'REFUSE');assert.equal(p.consumesItem,false);
  }
  assert.equal(evaluateGift(instance({relationship:{unlocked:false,affinity:20}})).reason,'npc-locked');
});
