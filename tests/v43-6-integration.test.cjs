/* V43.6: real cross-module Sandbox contract tests, no browser or backend required. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const economy=require('../js/economy-core-v43.js');
const inventory=require('../js/inventory-model-v42.js');
const actions=require('../js/item-actions-v43.js');
const fun=require('../js/dudu-fun-rules-v43.js');
const gift=require('../js/npc-gift-v2-r2.js');
const catalog=require('../js/item-catalog-v2.js');
const day='2026-10-17';
function questEvent(quests,ledger,type,id){
 const plan=economy.recordEvent(ledger,{type,eventId:id,day});
 return plan.ok?{ok:true,ledger:plan.state,quests:economy.applyQuestProgress(quests,plan.questId)}:
  {ok:false,ledger,quests,reason:plan.reason};
}
test('V43.6 keeps old quest progression, registers FUN and NPC quests once',()=>{
 const prior=[{id:'q_daily_loot',type:'DAILY',current:1,target:2,claimed:false},
  {id:'q_main',type:'MAIN',current:3,target:10,claimed:false}];
 const next=economy.ensureQuests(prior);
 assert.equal(next.length,4);
 assert.equal(next[0],prior[0]);
 assert.equal(next[1],prior[1]);
 assert.deepEqual(next.map(q=>q.id).slice(-2),['q_daily_fun','q_daily_npc']);
 assert.equal(economy.ensureQuests(next),next,'second migration is a no-op');
 const rotated=economy.rolloverQuests(next,day,'2026-10-18');
 assert.equal(rotated.changed,true);
 assert.equal(rotated.quests.find(x=>x.id==='q_main').current,3);
 assert.ok(rotated.quests.filter(x=>x.type==='DAILY').every(q=>q.current===0&&!q.claimed));
});
test('V43.6 purchase → inventory classification → cooldown consumption',()=>{
 const buy=economy.quotePurchase({itemId:economy.TOOL_ID,coins:100,
   inventoryCount:0,day});
 assert.equal(buy.ok,true);
 const cell=economy.instance(buy.product,'shop-v436-cell');
 assert.equal(buy.coins,70);
 assert.equal(inventory.inspect(cell).category,'TOOL');
 assert.equal(inventory.inspect(cell).usageStatus,'CLEAR_PHONE_COOLDOWN');
 assert.equal(inventory.inspect(cell).giftable,false);
 const now=Date.parse(day+'T09:00:00Z');
 const use=actions.quote({inventory:[cell],itemInstanceId:cell.instanceId,
   lastLootTimestamp:now-30000,now,day});
 assert.equal(use.ok,true);
 assert.equal(use.inventory.length,0);
 assert.equal(use.lastLootTimestamp,0);
 assert.equal(actions.quote({inventory:[cell],state:use.state,
   itemInstanceId:cell.instanceId,lastLootTimestamp:now-30000,now,day}).ok,false);
 assert.equal(economy.quotePurchase({itemId:'dudu-rose-7',coins:100,day}).ok,false);
});
test('V43.6 free FUN rewards once and advances a quest once across both games',()=>{
 let quests=economy.ensureQuests([]);
 const initial=fun.begin(null,{type:'box',theme:'star',roll:0,seed:0,day});
 assert.equal(initial.ok,true);
 let state=initial.state;
 for(const c of fun.sequence(0)){
  const plan=fun.advance(state,{type:'box',choice:c,day});
  assert.equal(plan.ok,true);state=plan.state;
 }
 let inventoryItems=[],coins=100;
 const claim=fun.claim(state,{type:'box',day,coins,inventory:inventoryItems});
 assert.equal(claim.ok,true);assert.equal(claim.coins,105);
 coins=claim.coins;state=claim.state;
 let e=questEvent(quests,null,'FUN_CLAIM','box-'+day);
 assert.equal(e.ok,true);quests=e.quests;
 assert.equal(quests.find(q=>q.id==='q_daily_fun').current,1);
 const double=questEvent(quests,e.ledger,'FUN_CLAIM','box-'+day);
 assert.equal(double.ok,false);assert.equal(double.reason,'duplicate');
 assert.equal(fun.claim(state,{type:'box',day,coins,inventory:inventoryItems}).ok,false);
 const ticket=fun.begin(state,{type:'ticket',roll:0,seed:13,day});
 assert.equal(ticket.ok,true);
 const ticketDone=[0,1,2].reduce((acc,c)=>
  fun.advance(acc,{type:'ticket',choice:c,day}).state,ticket.state);
 const ticketClaim=fun.claim(ticketDone,{type:'ticket',day,coins,inventory:inventoryItems});
 assert.equal(ticketClaim.ok,true);
 e=questEvent(quests,e.ledger,'FUN_CLAIM','ticket-'+day);
 assert.equal(e.ok,true);
 assert.equal(e.quests.find(q=>q.id==='q_daily_fun').current,1,'one target only');
 assert.equal(economy.recordEvent(e.ledger,{type:'FUN_CLAIM',eventId:'ticket-'+day,day}).reason,'duplicate');
});
test('V43.6 NPC gift event only on acceptance, never for rejected gifts',()=>{
 const item=catalog.common[0];
 const now=Date.parse(day+'T12:00:00Z');
 const base={npc:{giftPreferences:{likedTags:['COMMON_ITEM']}},
  item,relationship:{unlocked:true,affinity:20,relationshipV2:{
   trust:0,acceptedInstanceIds:[],acceptedGiftEventIds:[],
   acceptedGiftCountUtc:0,lastGiftAt:0}},now,
  instanceId:'shop-v436-gift',giftEventId:'gift-v436'};
 const denied=gift.evaluateGift({...base,npc:{giftPreferences:{refusedTags:['COMMON_ITEM']}}});
 assert.equal(denied.status,'REFUSE');assert.equal(denied.consumesItem,false);
 const ok=gift.evaluateGift(base);
 assert.equal(ok.status,'ACCEPT');assert.equal(ok.consumesItem,true);
 let quests=economy.ensureQuests([]);
 let event=questEvent(quests,null,'NPC_GIFT',base.giftEventId);
 assert.equal(event.ok,true);
 assert.equal(event.quests.find(q=>q.id==='q_daily_npc').current,1);
 assert.equal(questEvent(event.quests,event.ledger,'NPC_GIFT',base.giftEventId).ok,false);
 assert.equal(economy.recordEvent(event.ledger,{type:'NPC_GIFT',eventId:base.giftEventId,day:'2026-10-18'}).ok,true);
});
test('V43.6 stays Sandbox-only and never treats story/NPC previews as server grants',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const ui=read('js/dudu-fun-ui-v43.js');
 const runtime=read('js/economy-runtime-v43.js');
 const html=read('index.html');
 assert.match(ui,/prepareQuestEvent\(/);
 assert.match(html,/prepareQuestEvent\('NPC_GIFT'/);
 assert.match(html,/DuduEconomyCoreV43\.localDay\(\)/);
 assert.match(html,/inventory\.length>=500/);
 assert.match(runtime,/IS_SANDBOX_MODE/);
 assert.doesNotMatch(runtime,/db\.collection\(|DuduCollectiblesClient\.grant/);
 assert.doesNotMatch(ui,/db\.collection\(|DuduCollectiblesClient\.grant/);
});
