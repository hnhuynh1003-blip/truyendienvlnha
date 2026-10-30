'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Arcade conversion is accessible at the wallet but still requires verified release gate',()=>{
 const ui=src('js/personal-arcade-ui-v1.js');
 assert.match(ui,/data-arcade-exchange="open"/);
 assert.match(ui,/role="dialog"/);
 assert.match(ui,/DUDU_SPARK_EXCHANGE_V1_READY===true/);
 assert.match(ui,/!exchangeEnabled\(\)\?'Chuyển Xu · Sắp mở'/);
 assert.match(ui,/!exchangeEnabled\(\)\|\|exchangeBusy\|\|!quoteForExchange\(\)\.ok/);
 assert.match(ui,/userProfile\.currency=result\.balance/);
 assert.doesNotMatch(ui,/userProfile\.currency\s*\+=/);
 assert.doesNotMatch(ui,/firebase\.firestore\(/);
});
test('Production DUDU FUN is explicitly local practice, not a minting endpoint',()=>{
 const fun=src('js/dudu-fun-ui-v43.js');
 assert.match(fun,/dudu-fun:practice:v51:/);
 assert.match(fun,/if\(!sandbox\(\)\)\s*\{/);
 assert.match(fun,/không cộng Xu hay vật phẩm/);
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
