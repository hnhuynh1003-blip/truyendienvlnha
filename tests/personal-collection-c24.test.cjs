'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const collection=require('../js/personal-collection-c24.js');
const catalog=require('../js/item-catalog-v2.js');
const economy=require('../js/economy-core-v43.js');
const items=require('../js/personal-spark-items-v1.js');
const progress=require('../js/personal-progress-c23.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const copy=value=>structuredClone(value);
const at=Date.UTC(2026,9,30,9,0);
const shopId='shop-12345678-1234-1234-1234-123456789abc';
const sellId='sell-12345678-1234-1234-1234-123456789abd';
const useId='use-12345678-1234-1234-1234-123456789abe';
const globalId='global-00000000-0000-4000-8000-000000000001';
const owned=(id,instanceId='owned-1')=>({...catalog.byId(id),instanceId});

test('C2.4c recognizes only an unaltered live item and sanctioned functional tools',()=>{
 const item=owned('urban-keycard');
 assert.equal(collection.canonical(item).id,'urban-keycard');
 assert.equal(collection.canonical({...item,name:'Vật phẩm giả'}),null);
 assert.equal(collection.canonical({...item,realmTag:'SCIFI'}),null);
 assert.equal(collection.canonical({...item,itemId:'other'}),null);
 assert.equal(collection.canonical({id:'unknown',itemId:'unknown'}),null);
 assert.equal(collection.canonical(owned('e1')),null);
 assert.equal(collection.canonical(economy.instance(economy.FUNCTIONAL_TOOLS[0],shopId)).id,
  economy.TOOL_ID);
});

test('C2.4c stores a realm discovery through sale, prevents replays, and bounds history',()=>{
 const relic=owned('urban-keycard');
 let added=collection.append(null,{eventId:'find-1',kind:'CHAPTER',item:relic,at,
  inventory:[relic]});
 assert.equal(added.ok,true);
 assert.deepEqual(added.state.found.URBAN,['urban-keycard']);
 const replay=collection.append(added.state,{eventId:'find-1',kind:'CHAPTER',
  item:relic,at:at+1000});
 assert.equal(replay.duplicate,true);
 assert.equal(replay.state.events.length,1);
 const later=collection.append(replay.state,{eventId:'sell-1',kind:'SELL',item:relic,
  at:at+1000,price:10,inventory:[]});
 assert.equal(later.ok,true);
 assert.deepEqual(collection.snapshot({storyStates:{[collection.META]:later.state}})
  .found.URBAN,['urban-keycard']);
 assert.equal(collection.snapshot({storyStates:{[collection.META]:later.state}}).total,1);
 assert.equal(collection.append(later.state,{eventId:'fake',kind:'SHOP',
  item:{...relic,rank:'SSS'},at}).ok,false);
 let state=later.state;
 for(let n=0;n<collection.MAX_EVENTS+10;n++){
  const next=collection.append(state,{eventId:'event-'+n,kind:'USE',
   item:owned('common-biscuit'),at:at+n+1000});
  assert.equal(next.ok,true);state=next.state;
 }
 assert.equal(state.events.length,collection.MAX_EVENTS);
 assert.equal(state.events[0].id,'event-10');
 assert.deepEqual(state.found.URBAN,['urban-keycard']);
});

test('C2.4c previews old receipts without inventing dates for owned older goods',()=>{
 const storyStates={
  __duduPersonalItemsV1:{receipts:{[shopId]:{
   kind:'purchase',itemId:'common-biscuit',price:8,
   instanceId:'',at:'2026-10-30T09:00:00.000Z'}}},
  __duduPersonalProgressC23:{globalReceipts:{[globalId]:{
   itemId:'common-bottled-water',instanceId:'old-global',at:at-1000}}}
 };
 const result=collection.snapshot({storyStates,inventory:[owned('urban-keycard')]});
 assert.deepEqual(result.events.map(row=>row.kind),['SHOP','GLOBAL']);
 assert.equal(result.events[0].name,'Bánh Quy Khô');
 assert.equal(result.events[1].name,'Nước Uống Đóng Chai');
 assert.equal(result.events.some(row=>row.itemId==='urban-keycard'),false);
 assert.deepEqual(result.found.URBAN,['urban-keycard']);
 // Existing event wins an equal-ID receipt to avoid duplicated history rows.
 storyStates[collection.META]=collection.append(null,{eventId:shopId,
  kind:'SELL',item:owned('common-biscuit'),at:at+3000,price:3}).state;
 const current=collection.snapshot({storyStates});
 assert.equal(current.events.filter(row=>row.id===shopId).length,1);
 assert.equal(current.events[0].kind,'SELL');
});

function harness(){
 const accounts=new Map([
  ['reader-a',{currency:200,exp:0,level:1,inventory:[],storyStates:{},
   quests:[],readRewards:{},dailyReadLog:{day:'',chapters:[]},lootedChapters:{}}],
  ['reader-b',{currency:200,exp:0,level:1,inventory:[],storyStates:{},
   quests:[],readRewards:{},dailyReadLog:{day:'',chapters:[]},lootedChapters:{}}]
 ]);
 const auth={currentUser:{uid:'reader-a'}};
 const db={collection(name){assert.equal(name,'profiles_v2');return{
  doc(uid){return {uid};}};},async runTransaction(fn){
  const patches=[];
  const tx={async get(ref){return{exists:accounts.has(ref.uid),
   data:()=>copy(accounts.get(ref.uid))};},
   update(ref,patch){patches.push([ref.uid,copy(patch)]);}};
  const output=await fn(tx);
  for(const [uid,patch] of patches)Object.assign(accounts.get(uid),patch);
  return output;
 }};
 return {db,auth,accounts};
}

test('C2.4c shop, sale and global loot share one UID journal and wallet mutations',async()=>{
 const h=harness();
 const purchased=await items.run({db:h.db,auth:h.auth,uid:'reader-a',
  kind:'purchase',requestId:shopId,itemId:'common-biscuit',
  now:()=>new Date(at)});
 assert.equal(purchased.status,'applied');
 assert.equal(h.accounts.get('reader-a').currency,192);
 const again=await items.run({db:h.db,auth:h.auth,uid:'reader-a',
  kind:'purchase',requestId:shopId,itemId:'common-biscuit',
  now:()=>new Date(at)});
 assert.equal(again.status,'already-applied');
 await items.run({db:h.db,auth:h.auth,uid:'reader-a',kind:'sell',
  requestId:sellId,itemId:'common-biscuit',instanceId:shopId,
  now:()=>new Date(at+1000)});
 const a=h.accounts.get('reader-a');
 assert.equal(a.inventory.length,0);
 const before=a.currency;
 const drop=await progress.run({db:h.db,auth:h.auth,uid:'reader-a',
  kind:'global-loot',requestId:globalId,now:()=>at+2000});
 assert.equal(drop.status,'applied');
 assert.equal(a.currency,before+drop.award.coins);
 const journal=collection.snapshot({inventory:a.inventory,storyStates:a.storyStates});
 assert.deepEqual(journal.events.map(row=>row.kind),['GLOBAL','SELL','SHOP']);
 assert.equal(new Set(journal.events.map(row=>row.id)).size,3);
 assert.deepEqual(collection.snapshot({inventory:h.accounts.get('reader-b').inventory,
  storyStates:h.accounts.get('reader-b').storyStates}).events,[]);
 h.auth.currentUser={uid:'reader-b'};
 await assert.rejects(items.run({db:h.db,auth:h.auth,uid:'reader-a',
  kind:'purchase',requestId:useId,itemId:'common-biscuit'}),/tài khoản/i);
});

test('C2.4c supply opening records two issued items once, without phantom coins',async()=>{
 const h=harness();
 await items.run({db:h.db,auth:h.auth,uid:'reader-a',kind:'purchase',
  requestId:shopId,itemId:economy.SUPPLY_ID,now:()=>new Date(at)});
 const balance=h.accounts.get('reader-a').currency;
 await items.run({db:h.db,auth:h.auth,uid:'reader-a',kind:'use',
  requestId:useId,itemId:economy.SUPPLY_ID,instanceId:shopId,
  now:()=>new Date(at+2000)});
 const a=h.accounts.get('reader-a');
 assert.equal(a.currency,balance);
 assert.equal(a.inventory.length,2);
 let snapshot=collection.snapshot({storyStates:a.storyStates,inventory:a.inventory});
 assert.equal(snapshot.events.filter(row=>row.kind==='SUPPLY').length,2);
 assert.equal(snapshot.events.filter(row=>row.kind==='USE').length,1);
 await items.run({db:h.db,auth:h.auth,uid:'reader-a',kind:'use',
  requestId:useId,itemId:economy.SUPPLY_ID,instanceId:shopId,
  now:()=>new Date(at+3000)});
 snapshot=collection.snapshot({storyStates:a.storyStates,inventory:a.inventory});
 assert.equal(snapshot.events.length,4);
});

test('C2.4c a real story-quest item records its journal entry on the same claim',async()=>{
 const h=harness();
 for(let n=1;n<=6;n++){
  const result=await progress.run({db:h.db,auth:h.auth,uid:'reader-a',
   kind:'read',storyId:'novel-1',chapterId:'ch-'+n,now:()=>at+n*1000});
  assert.equal(result.status,'applied');
 }
 const done=await progress.run({db:h.db,auth:h.auth,uid:'reader-a',
  kind:'quest',questId:'q_story_reader',now:()=>at+7000});
 assert.equal(done.status,'applied');
 assert.equal(done.award.itemId,'common-bottled-water');
 const account=h.accounts.get('reader-a');
 assert.equal(account.inventory.length,1);
 const view=collection.snapshot({inventory:account.inventory,storyStates:account.storyStates});
 assert.equal(view.events.filter(row=>row.kind==='QUEST').length,1);
 assert.equal(view.events[0].instanceId,account.inventory[0].instanceId);
 await assert.rejects(progress.run({db:h.db,auth:h.auth,uid:'reader-a',
  kind:'quest',questId:'q_story_reader',now:()=>at+8000}),/not-ready/);
 assert.equal(collection.snapshot({storyStates:account.storyStates}).events.length,1);
});

test('C2.4c inventory notebook is available on main and stays a read-only view',()=>{
 assert.match(html,/src="js\/personal-collection-c24\.js\?v=c25-1"/);
 assert.ok(html.indexOf('personal-collection-c24.js')<
  html.indexOf('personal-spark-items-v1.js'));
 assert.match(html,/collectionToggle\.hidden=!IS_SANDBOX_MODE&&!personalItemsReady\(\)/);
 assert.match(html,/DuduPersonalCollectionC24\.snapshot\(\{/);
 assert.match(html,/personalMode:true\s*\}\)/);
 const render=fs.readFileSync(path.join(__dirname,'../js/world-collection-v44-1.js'),'utf8');
 assert.match(render,/personalMode\?\[\]:inventory/);
 assert.match(render,/DuduItemArtV13\?\.mount/);
 assert.doesNotMatch(render,/runTransaction|\.collection\('profiles_v2'/);
});
