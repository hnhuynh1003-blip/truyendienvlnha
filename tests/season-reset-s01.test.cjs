'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const S01=require('../js/season-reset-s01.js');

function storageFrom(entries){
 const data=new Map(Object.entries(entries));
 return {
  get length(){return data.size;},
  key:i=>[...data.keys()][i]??null,
  getItem:k=>data.has(k)?data.get(k):null,
  setItem(){throw Error('Preview MUST NOT write localStorage');},
  removeItem(){throw Error('Preview MUST NOT delete localStorage');}
 };
}

test('S01 remains preview-only with no apply API',()=>{
 assert.equal(S01.ENABLE_APPLY,false);
 assert.equal(S01.SEASON,'S01');
 assert.equal(typeof S01.apply,'undefined');
 assert.equal(typeof S01.reset,'undefined');
});

test('live S01 UI reads server data, leaves the old destructive reset disabled',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/src="js\/season-reset-s01\.js\?v=/);
 assert.match(html,/id="dudu-s01-preview-action"/);
 assert.match(html,/const DUDU_SEASON_RESET_READY_C26=false;/);
 assert.match(html,/id="dudu-v54-reset-action" disabled/);
 const previewSource=html.split('async function duduPreviewSeasonS01(){')[1]
   .split('async function duduBackupPlayerV26(){')[0];
 assert.match(previewSource,/get\(\{source:'server'\}\)/);
 assert.doesNotMatch(previewSource,/\.set\(|\.delete\(|\.update\(|removeItem\(/);
});

test('author identity, bookmarks, appearance, avatar and dedupe receipt survive',()=>{
 const uid='author-uid';
 const old={username:uid,name:'An Du',role:'admin',title:'Huyền thoại',
  level:28,exp:930,currency:9130,
  inventory:[{id:'dragon'}],quests:[{id:'quest',current:9,claimed:true}],
  readingBookmarksV568:{storyA:{chapter:10,offset:300}},
  phoneAppearanceV568:{wallpaper:'ai-01'},playerAvatar:{frame:'epic'},
  arcadeLastReceiptV1:'ex-12345678-1234-1234-1234-123456789012',
  storyStates:{storyA:{affinity:100}},lootedChapters:{storyA:12},
  honorV1:{earned:['one']}};
 const snapshot=JSON.stringify(old);
 const plan=S01.createPlan(uid,old);
 assert.equal(JSON.stringify(old),snapshot,'The existing profile must remain immutable');
 assert.equal(plan.nextProfile.role,'admin');
 assert.equal(plan.nextProfile.name,'An Du');
 assert.deepEqual(plan.nextProfile.readingBookmarksV568,old.readingBookmarksV568);
 assert.notEqual(plan.nextProfile.readingBookmarksV568,old.readingBookmarksV568);
 assert.deepEqual(plan.nextProfile.phoneAppearanceV568,old.phoneAppearanceV568);
 assert.deepEqual(plan.nextProfile.playerAvatar,old.playerAvatar);
 assert.equal(plan.nextProfile.arcadeLastReceiptV1,old.arcadeLastReceiptV1);
 assert.equal(plan.nextProfile.level,1);
 assert.equal(plan.nextProfile.exp,0);
 assert.equal(plan.nextProfile.currency,50);
 assert.deepEqual(plan.nextProfile.inventory,[]);
 assert.deepEqual(plan.nextProfile.storyStates,{});
 assert.deepEqual(plan.nextProfile.lootedChapters,{});
 assert.deepEqual(plan.nextProfile.quests,[{id:'quest',current:0,claimed:false}]);
 assert.equal('honorV1' in plan.nextProfile,false);
 assert.equal('questV437' in plan.nextProfile,false);
});

test('resets quest counters using new-season definitions, without mutating them',()=>{
 const defaults=[{id:'s01-quest',current:15,claimed:true,target:25}];
 const p=S01.createPlan('reader',{username:'reader',quests:[{id:'old'}]},defaults);
 assert.deepEqual(p.nextProfile.quests,[{id:'s01-quest',current:0,claimed:false,target:25}]);
 assert.equal(defaults[0].current,15);
});

test('unknown or mismatched profile fields require explicit review',()=>{
 const p=S01.createPlan('uid1',{username:'uid1',someNewGameProgress:{level:5}});
 assert.deepEqual(p.unknownFields,['someNewGameProgress']);
 assert.equal('someNewGameProgress' in p.nextProfile,false);
 assert.equal(p.needsOwnerApproval,true);
 assert.throws(()=>S01.createPlan('uid1',{username:'someoneElse'}),/UID/);
});

test('only game keys belonging to this account are proposed for local clearing',()=>{
 const uid='user+A',encoded=encodeURIComponent(uid);
 const keys={
  ['dudu-personal-arcade:v1:'+encoded]:'game',
  ['dudu-arcade-showcase:v1:'+encoded]:'showcase',
  ['dudu-arcade-journey-c437:v1:'+encodeURIComponent('uid:'+uid)]:'journey',
  ['dudu-honor-device-v1:'+encoded]:'badge',
  ['dudu-v2:'+encoded+':global:chats']:'npc chat',
  ['dudu-v2:'+encoded+':global:loot-cooldown']:'loot',
  ['dudu-v3:npc-memory:'+encoded+':story:character']:'memory',
  ['profile_'+uid]:'profile',
  ['dudu-v2:'+encoded+':story-1:bookmark']:'READING POSITION',
  ['dudu-v2:'+encoded+':story-1:draft']:'AUTHOR DRAFT',
  ['dudu-epub-batch-c421:'+encoded]:'EPUB IMPORT QUEUE',
  ['dudu-personal-arcade:exchange-settled-v1:'+encoded]:'EXCHANGE RECEIPT',
  ['dudu-personal-arcade:exchange-pending-v1:'+encoded]:'PENDING EXCHANGE',
  ['dudu-personal-arcade:v1:other']:'OTHER USER',
  ['dudu-sandbox-v2:'+encoded+':global:chats']:'SANDBOX',
  my_novels_library_db:'WEB STORIES',
  my_chat_roleplay_histories:'UNSCOPED CHAT'
 };
 const game=S01.localGameKeys(storageFrom(keys),uid);
 assert.equal(game.length,7);
 for(const suffix of ['bookmark','draft','epub-batch','exchange-settled','exchange-pending','sandbox']){
  assert.equal(game.some(k=>k.includes(suffix)),false,suffix+' must be preserved');
 }
 assert.equal(game.some(k=>k.includes('other')),false);
 const result=S01.preview(uid,{username:uid,currency:100,readingBookmarksV568:{a:{}}},storageFrom(keys));
 assert.equal(result.mode,'PREVIEW_ONLY');
 assert.equal(result.cloud.bookmarkCount,1);
 assert.equal(result.device.gameKeys.length,7);
 assert.equal(result.device.protectedLocalKeys.length,4);
 assert.ok(result.blockers.length>=3);
});

test('three existing accounts can be previewed independently',()=>{
 const ids=['author','reader','test-reader'];
 const preview=ids.map(uid=>S01.preview(uid,{username:uid,level:12},storageFrom({})));
 assert.deepEqual(preview.map(item=>item.uid),ids);
 assert.ok(preview.every(item=>item.device.gameKeys.length===0));
 assert.ok(preview.every(item=>item.cloud.starterXu===50));
});
