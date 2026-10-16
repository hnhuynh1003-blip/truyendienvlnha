const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/economy-core-v43.js');
const catalog=require('../js/item-catalog-v2.js');
const day='2026-10-17';
test('DUDU market offers canonical COMMON items only: never SSS, DUDU, author items',()=>{
 const products=core.shopCatalog();
 assert.equal(products.length,12);
 assert.equal(new Set(products.map(i=>i.id)).size,12);
 assert.ok(products.every(i=>catalog.byId(i.id)===null||i.scope==='COMMON'));
 assert.ok(products.every(i=>Number.isSafeInteger(i.price)&&i.price>0));
 assert.equal(core.preview({tab:'COMMON'}).some(x=>x.id==='sss1'),false);
 assert.equal(core.quotePurchase({itemId:'sss1',coins:1000,day}).ok,false);
 assert.equal(core.quotePurchase({itemId:'shop-sss',coins:1000,day}).ok,false);
 assert.equal(core.quotePurchase({itemId:'author-item-123',coins:1000,day}).ok,false);
 const realms=core.preview({tab:'REALM',realmTag:'CULTIVATION'});
 assert.equal(realms.length,5);
 assert.ok(realms.every(i=>i.scope==='REALM'&&i.realmTag==='CULTIVATION'));
 assert.deepEqual(core.preview({tab:'REALM',realmTag:'INVALID'}),[]);
 assert.equal(core.preview({tab:'DUDU'}).length,15);
});
test('DUDU market quotes purchases immutably and limits daily spending',()=>{
 const first=core.quotePurchase({itemId:'common-biscuit',coins:100,day,inventoryCount:0});
 assert.equal(first.ok,true);
 assert.equal(first.coins,92);
 assert.equal(first.state.total,1);
 const second=core.quotePurchase({itemId:'common-biscuit',coins:first.coins,
   day,inventoryCount:1,state:first.state});
 const third=core.quotePurchase({itemId:'common-biscuit',coins:second.coins,
   day,inventoryCount:2,state:second.state});
 assert.equal(third.ok,true);
 assert.equal(core.quotePurchase({itemId:'common-biscuit',coins:100,day,
   state:third.state}).reason,'daily-limit');
 assert.equal(first.state.counts['common-biscuit'],1);
 assert.equal(core.quotePurchase({itemId:'common-compass',coins:1,day}).reason,'not-enough-coins');
 assert.equal(core.quotePurchase({itemId:'common-compass',coins:-1,day}).ok,false);
 assert.equal(core.quotePurchase({itemId:'common-compass',coins:100,day,inventoryCount:500}).ok,false);
 assert.equal(core.norm({version:1,day:'2026-10-16',counts:{'common-biscuit':3},total:3},day).total,0);
 const item=core.instance(first.product,'shop-instance-1');
 assert.equal(item.id,'common-biscuit');
 assert.deepEqual(item.obtainedFrom,{kind:'SHOP',source:'DUDU_MARKET'});
 assert.equal(item.price,undefined);
});
test('chapter read events are deduplicated per day and never become item grants',()=>{
 const one=core.recordEvent(null,{type:'READ_CHAPTER',eventId:'story-a_ch-1',day});
 assert.equal(one.ok,true);
 assert.equal(one.questId,'q_daily_read');
 assert.equal(core.recordEvent(one.state,{type:'READ_CHAPTER',
   eventId:'story-a_ch-1',day}).reason,'duplicate');
 const other=core.recordEvent(one.state,{type:'READ_CHAPTER',
   eventId:'story-b_ch-1',day});
 assert.equal(other.ok,true,'IDs are story scoped');
 assert.equal(core.recordEvent(one.state,{type:'READ_CHAPTER',
   eventId:'story-a_ch-1',day:'2026-10-18'}).ok,true);
 assert.equal(core.recordEvent(null,{type:'READ_CHAPTER',eventId:'',day}).ok,false);
});
test('duplicate gameplay events do not increase quests or coin payouts',()=>{
 const quest=[{id:'q_daily_loot',type:'DAILY',current:0,target:2,claimed:false}];
 const first=core.recordEvent(null,{type:'LOOT_SUCCESS',eventId:'drop-01',day});
 assert.equal(first.ok,true);
 const advanced=core.applyQuestProgress(quest,first.questId);
 assert.equal(advanced[0].current,1);
 assert.equal(quest[0].current,0);
 assert.equal(core.recordEvent(first.state,{type:'LOOT_SUCCESS',eventId:'drop-01',day}).reason,'duplicate');
 assert.equal(core.recordEvent(first.state,{type:'SHOP_PURCHASE',eventId:'drop-02',day}).ok,false);
 const second=core.recordEvent(first.state,{type:'LOOT_SUCCESS',eventId:'drop-02',day});
 assert.equal(core.applyQuestProgress(advanced,second.questId)[0].current,2);
});
test('daily quest rotation preserves legacy saves on first contact and protects same day claims',()=>{
 const quests=[
 {id:'q_daily_read',type:'DAILY',current:2,target:2,claimed:true},
 {id:'q_main',type:'MAIN',current:1,target:3,claimed:false}
 ];
 const first=core.rolloverQuests(quests,undefined,day);
 assert.equal(first.changed,false);
 assert.equal(first.quests[0].claimed,true);
 const repeat=core.rolloverQuests(first.quests,day,day);
 assert.equal(repeat.changed,false);
 const next=core.rolloverQuests(quests,day,'2026-10-18');
 assert.equal(next.changed,true);
 assert.equal(next.quests[0].current,0);
 assert.equal(next.quests[0].claimed,false);
 assert.deepEqual(next.quests[1],quests[1]);
 assert.equal(quests[0].claimed,true);
 assert.equal(core.rolloverQuests(quests,'2026-10-18',day).changed,false);
});
