'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('R3.2 Arcade uses the existing wallet, never exposes green money or client 10:1 conversion',()=>{
 const ui=src('js/personal-arcade-ui-v1.js'),html=src('index.html'),
  bridge=src('js/arcade-unified-xu-r32.js');
 const wallet=html.slice(html.indexOf('id="phone-app-wallet"'),html.indexOf('<!-- APP: CỬA HÀNG -->'));
 assert.match(html,/id="arcade-header-wallet-v1" class="arcade-header-wallet dudu-money-display--gold"/);
 assert.doesNotMatch(html,/data-arcade-exchange="open"/);
 assert.doesNotMatch(wallet,/dudu-wallet-arcade-balance|openExchange|dudu-bank-exchange/);
 assert.doesNotMatch(ui,/headerWallet\?\.addEventListener\('click'/);
 assert.match(ui,/DUDU_ARCADE_UNIFIED_XU_R32_READY===true/);
 assert.match(ui,/unifiedBridge\.run/);
 assert.match(bridge,/await db\.runTransaction/);
 assert.match(bridge,/currency:nextWallet,storyStates:/);
 assert.match(bridge,/No retroactive grant from localStorage Arcade coins/);
});
test('Production DUDU FUN claims run through owner-scoped transactions only',()=>{
 const fun=src('js/dudu-fun-ui-v43.js');
 const service=src('js/personal-fun-c25.js');
 assert.match(fun,/if\(!sandbox\(\)\)return liveAction\('claim'\)/);
 assert.match(fun,/bridge\(\)\.run\(opts\)/);
 assert.match(service,/await db\.runTransaction/);
 assert.match(service,/fun\.claim\(raw,\{type,day,coins:data\.currency,inventory:data\.inventory\}\)/);
 assert.doesNotMatch(fun,/dudu-fun:practice:v51:/);
});
test('One-shot Rules readiness tracks legacy quest and loot profile mutations',()=>{
 const main=src('index.html'),readiness=src('docs/DUDU-SPARK-ONE-SHOT-RULES-READINESS-2026-10-29.md');
 assert.match(main,/function claimQuestReward\(questId\)/);
 assert.match(main,/userProfile\.currency \+= q\.rewardCoin/);
 assert.match(main,/function rollLootDrop\(/);
 assert.match(main,/userProfile\.inventory\.unshift\(copy\)/);
 for(const source of ['ARCADE_TRANSFER','QUEST_CLAIM','FUN_CLAIM','LOOT_CLAIM'])
  assert.ok(readiness.includes(source));
 assert.match(readiness,/chưa bật quyền và chưa sửa\/deploy Firestore Rules/);
});
