const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../js/npc-relationship-v2-r1.js');
const trust=require('../js/npc-trust-v2-r5.js');
const personas=require('../js/npc-persona-v2-r6.js');
const catalog=require('../js/item-catalog-v2.js');
const {evaluateGift}=require('../js/npc-gift-v2-r2.js');
const now=Date.parse('2026-10-15T09:00:00Z');
function relation(){return {affinity:39,relationshipV2:{trust:0,lastCheckinUtc:'',
  giftDayUtc:'',acceptedGiftCountUtc:0,acceptedGiftEventIds:['event-old']}};}
test('R5 daily checkin grants exactly once per NPC/day without rewriting previous affinity',()=>{
 const old=relation(),snapshot=JSON.stringify(old);
 const args={uid:'tester-a',storyId:'truyen-dien-vl',npcId:'c_otk',unlocked:true,
   relationship:old,now,eventId:'checkin-1'};
 const first=trust.evaluateCheckin(args);
 assert.equal(first.ok,true);assert.equal(first.gain,3);
 const next=trust.applyCheckin(old,first);
 assert.equal(next.trust,3);assert.equal(next.lastCheckinUtc,'2026-10-15');
 assert.equal(JSON.stringify(old),snapshot);
 const after={...old,relationshipV2:next};
 const same=trust.evaluateCheckin({...args,relationship:after,eventId:'checkin-2'});
 assert.equal(same.ok,false);assert.equal(same.reason,'daily-limit');
 assert.equal(trust.applyCheckin(after,first),null);
 assert.equal(trust.evaluateCheckin({...args,unlocked:false}).ok,false);
 assert.equal(trust.evaluateMilestone({trustedServerEvidence:true}).ok,false,
   'Story milestones cannot be minted from client evidence');
});
test('R5 next-day checkin independent per NPC and keeps trust under 100',()=>{
 const prev=relation();prev.relationshipV2.trust=99;
 const plan=trust.evaluateCheckin({uid:'tester-a',storyId:'truyen-dien-vl',npcId:'c_ttl',
  unlocked:true,relationship:prev,now,eventId:'once'});
 assert.equal(plan.gain,1);
 const next=trust.applyCheckin(prev,plan);
 assert.equal(next.trust,100);
 assert.equal(trust.evaluateCheckin({uid:'tester-a',storyId:'truyen-dien-vl',npcId:'c_tct',
  unlocked:true,relationship:relation(),now,eventId:'other'}).ok,true);
});
test('R6 persona fallbacks follow existing IDs only and author preferences override them',()=>{
 const npc={id:'c_otk',name:'Ôn Tri Hành'};
 const sample=personas.previewNpc(npc);
 assert.deepEqual(sample.giftPreferences.likedTags,['PRACTICAL']);
 assert.equal(sample.previewPersonaSource,'sandbox-default');
 const custom=personas.previewNpc({...npc,giftPreferences:{likedTags:['KEEPSAKE']}});
 assert.deepEqual(custom.giftPreferences.likedTags,['KEEPSAKE']);
 assert.equal(custom.previewPersonaSource,'author');
 assert.deepEqual(personas.previewNpc({...npc,name:'Khác'}).giftPreferences.likedTags,[]);
 assert.equal(personas.previewNpc({...npc,giftPreferences:{likedTags:['INVALID']}}),null);
});
test('R6 explicit item classification differentiates 3 tastes, doesn't mint souvenir',()=>{
 for(const [id,tag] of [['common-gauze','PRACTICAL'],['e2','DRINK_COFFEE'],
   ['urban-oneway-ticket','KEEPSAKE'],['b1','DANGEROUS']]){
  assert.ok(rules.itemTags(catalog.byId(id)).includes(tag),id);
 }
 const kinds=[
  {id:'c_otk',name:'Ôn Tri Hành',item:catalog.byId('common-gauze')},
  {id:'c_ttl',name:'Tô Thanh Lạc',item:catalog.byId('e2')},
  {id:'c_tct',name:'Thẩm Cẩm Thư',item:catalog.byId('urban-oneway-ticket')}
 ];
 for(const row of kinds){
  const p=evaluateGift({npc:personas.previewNpc(row),item:row.item,
   relationship:{...relation(),unlocked:true},now,instanceId:'inst-1',giftEventId:'event-1'});
  assert.equal(p.status,'ACCEPT',row.id);
  assert.equal(p.delta.trust,1,row.id);
  assert.ok(p.delta.affinity<=8);
 }
 for(const i of catalog.souvenirs)assert.equal(rules.canBeGifted(i),false);
});
