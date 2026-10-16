const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../js/npc-relationship-v2-r1.js');
const {evaluateGift}=require('../js/npc-gift-v2-r2.js');
const item=require('../js/item-catalog-v2.js').common[0];
const now=Date.parse('2026-10-15T12:00:00Z');
function gift(affinity,trust,liked=false){
 return evaluateGift({npc:{giftPreferences:liked?{likedTags:['COMMON_ITEM']}:{}},
 item,relationship:{unlocked:true,affinity,relationshipV2:{trust,acceptedGiftCountUtc:0,
 giftDayUtc:'2026-10-15',lastGiftAt:0,acceptedInstanceIds:[]}},
 now,instanceId:'inst-1',giftEventId:'event-1'});
}
test('trust cap is 40 below trust 20, 70 below 50, then 100',()=>{
 for(const [trust,cap] of [[0,40],[19,40],[20,70],[49,70],[50,100],[100,100]]){
  assert.equal(rules.affinityCeiling(trust),cap);
 }
});
test('gifts cannot pass ceiling and no-value neutral gifts are not consumed',()=>{
 assert.equal(gift(39,0).delta.affinity,1);
 const blocked=gift(40,0);
 assert.equal(blocked.status,'REFUSE');assert.equal(blocked.consumesItem,false);
 assert.equal(gift(69,20).delta.affinity,1);
 assert.equal(gift(99,50).delta.affinity,1);
});
test('old high-affinity saves remain untouched rather than clamped',()=>{
 for(const previous of [40,70,100]){
  const before={affinity:previous,relationshipV2:{trust:0}};
  const snapshot=JSON.stringify(before);
  const r=rules.previewRelationship(before,'uid','story','npc');
  assert.equal(r.affinity,previous);
  assert.equal(JSON.stringify(before),snapshot);
  const plan=gift(previous,0);
  assert.equal(plan.delta.affinity,0);
  assert.equal(plan.consumesItem,false);
 }
});
test('liked gift can increase trust without exceeding affinity ceiling',()=>{
 const plan=gift(40,0,true);
 assert.equal(plan.status,'ACCEPT');
 assert.equal(plan.delta.affinity,0);
 assert.equal(plan.delta.trust,1);
 assert.equal(plan.consumesItem,true);
});
