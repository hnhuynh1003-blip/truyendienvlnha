const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../js/npc-relationship-v2-r1.js');
const catalog=require('../js/item-catalog-v2.js');
test('V44.1 preserves old NPC gift tags and maps all 179 canonical IDs',()=>{
  assert.equal(catalog.items.length,179);
  assert.deepEqual(Object.keys(rules.CATALOG_TAGS).sort(),catalog.items.map(x=>x.id).sort());
  for(const x of catalog.items)assert.ok(rules.itemTags(x)?.length>0,x.id);
  assert.equal(catalog.validate().length,0);
});
test('collectibles stay nongiftable and R1 never grants ownership',()=>{
  for(const item of catalog.souvenirs)assert.equal(rules.canBeGifted(item),false);
  assert.equal(rules.canBeGifted({...catalog.common[0],giftable:true}),true);
  assert.equal(rules.canBeGifted({id:'x',scope:'STORY',unique:true,giftable:true}),false);
  assert.equal(rules.CONFIG.refusedGiftConsumesItem,false);
});
test('NPC preference validation is optional but never accepts conflicting or unknown tags',()=>{
  assert.equal(rules.normalizePreferences(null).reactionStyle,'default');
  assert.deepEqual(rules.normalizePreferences({
    likedTags:['PRACTICAL'],dislikedTags:['DANGEROUS'],
    reactionStyle:'reserved'}).likedTags,['PRACTICAL']);
  assert.equal(rules.normalizePreferences({likedTags:['PRACTICAL'],refusedTags:['PRACTICAL']}),null);
  assert.equal(rules.normalizePreferences({likedTags:['SECRET_LORE']}),null);
  assert.equal(rules.normalizePreferences({reactionStyle:'evil'}),null);
  assert.equal(rules.itemTags({id:'author-item-secret'}),null);
  assert.deepEqual(rules.itemTags({id:'author-item-secret',giftTags:['PRACTICAL']}),['PRACTICAL']);
});
test('legacy NPC affinity 0 20 50 100 remains stable without any writes',()=>{
  for(const score of [0,20,50,100]){
    const old={affinity:score,role:'friend',notes:'legacy',chatHistory:[{text:'hello'}]};
    const before=JSON.stringify(old);
    const read=rules.previewRelationship(old,'uid1','story1','npc1');
    assert.equal(read.affinity,score);
    assert.equal(read.relationshipV2.trust,0);
    assert.equal(read.relationshipV2.stage,'ACQUAINTED');
    assert.equal(JSON.stringify(old),before);
    assert.equal(Object.hasOwn(old,'relationshipV2'),false);
  }
});
test('preexisting trust/history preserved, invalid scope fails closed',()=>{
  const old={affinity:75,relationshipV2:{trust:33,stage:'TRUSTED',
    milestones:['event1'],acceptedInstanceIds:['inst1'],giftDayUtc:'2026-10-15',
    acceptedGiftCountUtc:2}};
  const read=rules.previewRelationship(old,'uid1','story1','npc1');
  assert.equal(read.relationshipV2.trust,33);
  assert.deepEqual(read.relationshipV2.milestones,['event1']);
  assert.equal(read.relationshipV2.acceptedGiftCountUtc,2);
  assert.equal(rules.previewRelationship(old,'uid1','../other','npc1'),null);
  assert.equal(rules.CONFIG.maxAffinityGainPerGift,8);
  assert.equal(rules.CONFIG.scoredGiftsPerNpcUtcDay,3);
  assert.equal(rules.CONFIG.giftCooldownMs,300000);
});
