const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../js/economy-core-v43.js');
const quest=require('../js/quest-engine-v43-7.js');
const day='2026-10-17';
const get=(rows,id)=>rows.find(q=>q.id===id);
function event(quests,state,ledger,type,id,date=day){
 const record=core.recordEvent(ledger,{type,eventId:id,day:date});
 if(!record.ok)return {ok:false,quests,state,ledger,reason:record.reason};
 const baseline=core.applyQuestProgress(quests,record.questId);
 const plan=quest.progress(baseline,state,{type,eventId:id,day:date});
 return {ok:true,quests:plan.quests,state:plan.state,ledger:record.state};
}
test('V43.7 preserves old quest IDs and adds nine differentiated tasks exactly once',()=>{
 const old=[{id:'q_main_write',type:'MAIN',target:1,current:1,claimed:false},
  ...core.EXTRA_DAILY_QUESTS.map(q=>({...q}))];
 const quests=quest.ensure(core.ensureQuests(old));
 assert.equal(quests.length,old.length+9);
 assert.equal(get(quests,'q_main_write').current,1);
 assert.equal(quest.ensure(quests),quests);
 assert.deepEqual(quest.DEFINITIONS.map(q=>q.type).reduce((o,t)=>
  ({...o,[t]:(o[t]||0)+1}),{}),
  {DAILY:1,WEEKLY:4,STORY:1,NPC:2,EVENT:1});
 assert.equal(new Set(quests.map(q=>q.id)).size,quests.length);
});
test('V43.7 week begins on Monday and resets only weekly; event resets daily',()=>{
 assert.equal(quest.weekStart('2026-10-18'),'2026-10-12');
 assert.equal(quest.weekStart('2026-10-19'),'2026-10-19');
 let quests=quest.ensure([{id:'q_daily_loot',type:'DAILY',target:2,current:2,claimed:true},
  {id:'q_main_intro',type:'MAIN',target:1,current:1,claimed:true}]);
 quests=quests.map(q=>q.type==='WEEKLY'||q.type==='EVENT'?{...q,current:q.target,claimed:true}:q);
 const prev=quest.state(null,'2026-10-18');
 const moved=quest.rotate(quests,prev,{day:'2026-10-19',previousDay:'2026-10-18'});
 assert.equal(moved.changed,true);
 assert.ok(moved.quests.filter(q=>q.type==='WEEKLY').every(q=>q.current===0&&!q.claimed));
 assert.ok(moved.quests.filter(q=>q.type==='EVENT').every(q=>q.current===0&&!q.claimed));
 assert.equal(get(moved.quests,'q_main_intro').claimed,true);
 assert.equal(get(moved.quests,'q_daily_loot').claimed,true,
   'core.rolloverQuests, not weekly quest engine, owns daily reset');
 const legacy=core.rolloverQuests(moved.quests,'2026-10-18','2026-10-19');
 assert.equal(get(legacy.quests,'q_daily_loot').claimed,false);
 const next=quest.rotate(moved.quests,moved.state,{day:'2026-10-19',previousDay:'2026-10-19'});
 assert.equal(next.changed,false);
});
test('V43.7 records a chapter once daily, but story quest only once EVER',()=>{
 let qs=quest.ensure(core.ensureQuests([])),state,ledger;
 const first=event(qs,state,ledger,'READ_CHAPTER','story1_chapter1');
 assert.equal(first.ok,true);qs=first.quests;state=first.state;ledger=first.ledger;
 assert.equal(get(qs,'q_week_read').current,1);
 assert.equal(get(qs,'q_story_reader').current,1);
 assert.equal(get(qs,'q_daily_read').current,1);
 const duplicate=event(qs,state,ledger,'READ_CHAPTER','story1_chapter1');
 assert.equal(duplicate.reason,'duplicate');
 const newDay=event(qs,state,undefined,'READ_CHAPTER','story1_chapter1','2026-10-18');
 assert.equal(newDay.ok,true);
 assert.equal(get(newDay.quests,'q_week_read').current,2);
 assert.equal(get(newDay.quests,'q_story_reader').current,1);
 const another=event(newDay.quests,newDay.state,newDay.ledger,
  'READ_CHAPTER','story2_chapter1','2026-10-18');
 assert.equal(get(another.quests,'q_story_reader').current,2);
 assert.equal(get(another.quests,'q_week_read').current,3);
});
test('V43.7 integrates MARKET, FUN, NPC and DUDU checkin with one event each',()=>{
 let qs=quest.ensure(core.ensureQuests([])),state,ledger;
 const types=[
  ['MARKET_PURCHASE','shop-A','q_week_shop',1],
  ['FUN_CLAIM','box-'+day,'q_week_fun',1],
  ['FUN_CLAIM','ticket-'+day,'q_event_fun',2],
  ['NPC_GIFT','gift-A','q_npc_gifts',1],
  ['NPC_CHECKIN','story:npc:'+day,'q_npc_visits',1],
  ['DUDU_CHECKIN',day,'q_daily_dudu',1],
  ['LOOT_SUCCESS','loot-A','q_week_loot',1]
 ];
 for(const [type,id,which,count] of types){
  const a=event(qs,state,ledger,type,id);
  assert.equal(a.ok,true,type);
  assert.equal(get(a.quests,which).current,count,type);
  qs=a.quests;state=a.state;ledger=a.ledger;
  const replay=event(qs,state,ledger,type,id);
  assert.equal(replay.ok,false,'event must be idempotent: '+type);
 }
 assert.equal(get(qs,'q_daily_fun').current,1);
 assert.equal(get(qs,'q_daily_npc').current,1);
 assert.equal(get(qs,'q_event_fun').current,2);
 assert.equal(core.recordEvent(ledger,{type:'SHOP_PURCHASE',eventId:'x',day}).ok,false,
  'unknown purchase method must stay blocked');
});
test('V43.7 reward commits exact XP, Xu, item and history only once',()=>{
 const qs=quest.ensure([]).map(q=>q.id==='q_story_reader'?
  {...q,current:q.target}:q);
 const original=JSON.stringify(qs);
 const prize=quest.reward({quests:qs,id:'q_story_reader',coins:80,
  exp:95,level:1,inventory:[],day});
 assert.equal(prize.ok,true);
 assert.equal(prize.level,2);
 assert.equal(prize.exp,40,'95+45 XP becomes 40 at next level');
 assert.equal(prize.coins,140,'80+30 quest coins+30 level bonus');
 assert.equal(prize.inventory.length,1);
 assert.equal(prize.inventory[0].id,'common-bottled-water');
 assert.equal(prize.inventory[0].obtainedFrom.source,'DUDU_QUEST');
 assert.equal(prize.state.history.length,1);
 assert.equal(prize.quests.find(q=>q.id==='q_story_reader').claimed,true);
 assert.equal(quest.reward({quests:prize.quests,questState:prize.state,
  id:'q_story_reader',coins:prize.coins,exp:prize.exp,level:prize.level,
  inventory:prize.inventory,day}).reason,'not-ready');
 assert.equal(JSON.stringify(qs),original,'pure engine cannot mutate existing profile');
});
test('V43.7 rejects overflowing wallets, full inventory, invalid profile and repeats',()=>{
 const qs=quest.ensure([]).map(q=>q.id==='q_story_reader'?
  {...q,current:q.target}:q);
 const sample={quests:qs,id:'q_story_reader',exp:0,level:1,day};
 assert.equal(quest.reward({...sample,coins:1e9,inventory:[]}).reason,'wallet-cap');
 assert.equal(quest.reward({...sample,coins:50,inventory:Array(500).fill({id:'f1'})}).reason,
  'inventory-full');
 assert.equal(quest.reward({...sample,coins:-10,inventory:[]}).reason,'invalid-profile');
 assert.equal(quest.reward({...sample,coins:50,inventory:[],level:0}).reason,'invalid-profile');
});
test('V43.7 client setup and UI must not write verified collectibles',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const html=read('index.html'),ui=read('js/quest-ui-v43-7.js');
 const runtime=read('js/economy-runtime-v43.js');
 const fun=read('js/dudu-fun-ui-v43.js');
 assert.match(html,/quest-engine-v43-7\.js/);
 assert.match(html,/quest-ui-v43-7\.js/);
 assert.match(html,/quests-v43-7\.css/);
 assert.match(html,/prepareQuestEvent\('NPC_CHECKIN'/);
 assert.match(runtime,/MARKET_PURCHASE/);
 assert.match(runtime,/questsV437\.reward/);
 assert.match(fun,/userProfile\.questV437=event\.questState/);
 assert.match(ui,/dudu-v437-cards/);
 assert.doesNotMatch(runtime,/DuduCollectiblesClient\.grant|db\.collection\(/);
 assert.doesNotMatch(ui,/DuduCollectiblesClient\.grant|db\.collection\(/);
});
