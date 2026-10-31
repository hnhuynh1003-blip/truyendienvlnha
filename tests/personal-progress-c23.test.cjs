'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const progress=require('../js/personal-progress-c23.js');
const items=require('../js/personal-spark-items-v1.js');
const economyCore=require('../js/economy-core-v43.js');
const encounter=require('../js/chapter-loot-encounter-v1.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const economy=fs.readFileSync(path.join(__dirname,'../js/economy-runtime-v43.js'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const dateAt=s=>new Date(s).getTime();
const uuid='00000000-0000-4000-8000-000000000001';
function profile(){return {username:'reader-a',name:'An Du',currency:100,exp:0,level:1,
 inventory:[],storyStates:{},readRewards:{},lootedChapters:{},dailyReadLog:{day:'',chapters:[]},
 quests:[
  {id:'q_daily_read',type:'DAILY',title:'Đọc truyện',current:0,target:2,
   claimed:false,rewardCoin:25,rewardExp:30},
  {id:'q_daily_loot',type:'DAILY',title:'Nhặt đồ',current:0,target:2,
   claimed:false,rewardCoin:20,rewardExp:25},
  {id:'q_main_intro',type:'MAIN',title:'Mở đầu',current:0,target:1,
   claimed:false,rewardCoin:50,rewardExp:50}
 ]};}
function env(initial=profile()){
 let cloud=copy(initial),updates=0;
 const auth={currentUser:{uid:'reader-a'}};
 const db={collection(name){assert.equal(name,'profiles_v2');return{
  doc(uid){assert.equal(uid,'reader-a');return{uid};}
 };},async runTransaction(callback){
  const tx={async get(){return{exists:!!cloud,data:()=>copy(cloud)};},
   update(ref,patch){updates++;cloud={...cloud,...copy(patch)};}};
  return callback(tx);
 }};
 const call=(kind,opts={},time='2026-10-30T09:00:00Z')=>progress.run({
  db,auth,uid:'reader-a',kind,...opts,now:()=>dateAt(time)});
 return {auth,db,call,get data(){return cloud;},get updates(){return updates;}};
}

test('C2.3c reading grants first-ever EXP once and one daily chapter event',async()=>{
 const h=env(),id={storyId:'truyen-dien-vl',chapterId:'ch-1'};
 const first=await h.call('read',id);
 assert.equal(first.status,'applied');
 assert.equal(first.awardExp,5);
 assert.equal(h.data.exp,5);
 assert.equal(h.data.quests.find(q=>q.id==='q_main_intro').current,1);
 assert.equal(h.data.quests.find(q=>q.id==='q_daily_read').current,1);
 assert.equal(h.data.quests.find(q=>q.id==='q_story_reader').current,1);
 const second=await h.call('read',id);
 assert.equal(second.status,'already-read');
 assert.equal(h.updates,1);
 assert.equal(h.data.exp,5);
 const nextDay=await h.call('read',id, '2026-10-31T09:00:00Z');
 assert.equal(nextDay.firstEver,false);
 assert.equal(nextDay.firstToday,true);
 assert.equal(h.data.exp,5);
 assert.equal(h.data.quests.find(q=>q.id==='q_story_reader').current,1);
});

test('C2.3c opening any other first chapter cannot claim the canonical intro',async()=>{
 const h=env();
 await h.call('read',{storyId:'unrelated-story',chapterId:'ch-1'});
 assert.equal(h.data.quests.find(q=>q.id==='q_main_intro').current,0);
});

test('C2.3c quest reward is atomic, idempotent, and cannot trust inflated client values',async()=>{
 const h=env();
 await h.call('read',{storyId:'truyen-dien-vl',chapterId:'ch-1'});
 const before=h.data.currency;
 const receipt=await h.call('quest',{questId:'q_main_intro'});
 assert.equal(receipt.status,'applied');
 assert.equal(receipt.award.coins,50);
 assert.equal(receipt.award.exp,50);
 assert.equal(h.data.currency,before+50);
 assert.equal(h.data.quests.find(q=>q.id==='q_main_intro').claimed,true);
 await assert.rejects(h.call('quest',{questId:'q_main_intro'}),
  e=>e.reason==='not-ready');
 assert.equal(h.data.currency,before+50);
 await assert.rejects(h.call('quest',{questId:'admin-free-reward'}),
  e=>e.reason==='unknown-quest');
});

test('C4.5 unverified authoring quest cannot issue personal Xu or EXP',async()=>{
 const p=profile();p.quests.push({id:'q_main_write',type:'MAIN',title:'Sáng tác',current:1,
  target:1,claimed:false,rewardCoin:60,rewardExp:60});
 const h=env(p);
 await assert.rejects(h.call('quest',{questId:'q_main_write'}),
  e=>e.reason==='quest-not-open');
 assert.equal(h.updates,0);
 assert.equal(h.data.currency,100);
 assert.equal(h.data.exp,0);
 assert.equal(h.data.quests.find(q=>q.id==='q_main_write').current,1);
});

test('C2.3c global loot has one receipt per request and remote cooldown',async()=>{
 const h=env(),rid='global-'+uuid;
 const first=await h.call('global-loot',{requestId:rid});
 assert.equal(first.status,'applied');
 assert.equal(h.data.inventory.length,1);
 assert.equal(h.data.inventory[0].obtainedFrom.kind,'GLOBAL');
 const coins=h.data.currency;
 const retry=await h.call('global-loot',{requestId:rid});
 assert.equal(retry.status,'already-looted');
 assert.equal(h.data.currency,coins);
 assert.equal(h.data.inventory.length,1);
 await assert.rejects(h.call('global-loot',{
  requestId:'global-00000000-0000-4000-8000-000000000002'}),
  e=>e.reason==='cooldown');
 const next=await h.call('global-loot',{
  requestId:'global-00000000-0000-4000-8000-000000000002'},
  '2026-10-30T09:16:00Z');
 assert.equal(next.status,'applied');
 assert.equal(h.data.inventory.length,2);
});

test('C2.3c chapter find is one-shot even if it misses',async()=>{
 const storyId='story-1';let chapterId='';
 for(let i=0;i<3000;i++){
  const id='chapter-'+i;
  if(encounter.encounter({accountId:'reader-a',storyId,chapterId:id,
   paragraphCount:20}).visible){chapterId=id;break;}
 }
 assert.ok(chapterId);
 const h=env();
 const result=await h.call('chapter-loot',{storyId,chapterId,paragraphCount:20});
 assert.ok(['applied','miss'].includes(result.status));
 assert.ok(encounter.attempted(h.data.lootedChapters[storyId+'_'+chapterId]));
 const inventory=h.data.inventory.length,wallet=h.data.currency;
 assert.equal((await h.call('chapter-loot',{storyId,chapterId,paragraphCount:20})).status,
  'already-looted');
 assert.equal(h.data.inventory.length,inventory);
 assert.equal(h.data.currency,wallet);
});

test('C2.3c a purchased cooldown tool resets the stored global cooldown',async()=>{
 const owner=profile();owner.currency=500;
 const h=env(owner);
 await h.call('global-loot',{requestId:'global-'+uuid});
 assert.ok(h.data.storyStates[progress.META].lastGlobalLootAt>0);
 const shopId='shop-12345678-1234-1234-1234-123456789abc';
 const useId='use-12345678-1234-1234-1234-123456789abd';
 await items.run({db:h.db,auth:h.auth,uid:'reader-a',kind:'purchase',
  requestId:shopId,itemId:economyCore.TOOL_ID,
  now:()=>new Date('2026-10-30T09:01:00Z')});
 const reset=await items.run({db:h.db,auth:h.auth,uid:'reader-a',kind:'use',
  requestId:useId,itemId:economyCore.TOOL_ID,instanceId:shopId,
  cooldownRemainingMs:300000,lastLootTimestamp:dateAt('2026-10-30T09:00:00Z'),
  now:()=>new Date('2026-10-30T09:01:30Z')});
 assert.equal(reset.cooldownAt,0);
 assert.equal(h.data.storyStates[progress.META].lastGlobalLootAt,0);
 const next=await h.call('global-loot',{
  requestId:'global-00000000-0000-4000-8000-000000000002'},
 '2026-10-30T09:02:00Z');
 assert.equal(next.status,'applied');
});

test('C2.3c refuses cross-UID actions and incomplete accounts',async()=>{
 const h=env();
 await assert.rejects(progress.run({db:h.db,auth:h.auth,uid:'reader-b',
  kind:'read',storyId:'story',chapterId:'chapter'}),e=>e.reason==='invalid-account');
 assert.equal(h.updates,0);
});

test('C2.3c main uses transactional rewards and sandbox stays on old path',()=>{
 assert.match(html,/js\/personal-progress-c23\.js\?v=c24c-1/);
 assert.match(html,/personalProgressActionC23\('read'/);
 assert.match(html,/personalProgressActionC23\('chapter-loot'/);
 assert.match(html,/personalProgressActionC23\('global-loot'/);
 assert.match(economy,/return root\.personalClaimQuestC23\?\.\(id\)\|\|false/);
 assert.match(economy,/if\(!sandbox\(\)\)return false;\s*rotate\(\)/);
});
