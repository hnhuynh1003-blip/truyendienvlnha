'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const trade=fs.readFileSync(path.join(__dirname,'../js/inventory-trade-v43-9.js'),'utf8');

test('C2.6 seasonal reset is disabled in settings and rejected inside the handler',()=>{
 const section=html.match(/<section class="dudu-v54-reset-settings"([\s\S]*?)<\/section>/);
 assert.ok(section);
 assert.match(section[1],/id="dudu-v26-backup-action" onclick="duduBackupPlayerV26\(\)"/);
 assert.match(section[1],/id="dudu-v54-reset-action" disabled/);
 assert.doesNotMatch(section[1],/onclick="duduResetPlayerV54\(\)"/);
 assert.match(html,/const DUDU_SEASON_RESET_READY_C26=false/);
 const handler=html.slice(html.indexOf('async function duduResetPlayerV54(){'),
  html.indexOf('function openAuthModal()'));
 assert.ok(handler.indexOf('if(!DUDU_SEASON_RESET_READY_C26)')>=0);
 assert.ok(handler.indexOf('if(!DUDU_SEASON_RESET_READY_C26)')<
  handler.indexOf('await ref.set(fresh)'));
});

test('C2.6 separate backup reads the signed-in server profile without deleting anything',()=>{
 const backup=html.slice(html.indexOf('async function duduBackupPlayerV26(){'),
  html.indexOf('// V54: owner-confirmed one-time reset'));
 assert.match(backup,/if\(IS_SANDBOX_MODE\)/);
 assert.match(backup,/DuduAuth\.uid\(\)!==currentUsername/);
 assert.match(backup,/await Promise\.allSettled\(\[\.\.\.pendingLiveProfileWrites\]\)/);
 assert.match(backup,/DuduPersonalResetV54\.safetyCheck\(uid,auth\)/);
 assert.match(backup,/\.get\(\{source:'server'\}\)/);
 assert.match(backup,/DuduPersonalResetV54\.backup\(uid,snap\.data\(\),localStorage\)/);
 assert.match(backup,/a\.download='DUDU-progress-backup-'/);
 assert.match(backup,/Hãy kiểm tra tệp trong thư mục Tải xuống/);
 assert.doesNotMatch(backup,/ref\.set\(|\.update\(|\.delete\(|removeItem\(|resetProfile/);
});

test('C2.6 Sandbox auction remains a draft, not a fake main-market sale',()=>{
 assert.match(trade,/ESCROW DRAFTS/);
 assert.match(trade,/status:'AWAITING_SERVER'/);
 assert.match(html,/if\(IS_SANDBOX_MODE&&window\.DuduInventoryViewV42\)/);
 const personal=html.slice(html.indexOf('if(personalItemsReady()&&window.DuduInventoryViewV42)'),
  html.indexOf('if(IS_SANDBOX_MODE&&window.DuduInventoryViewV42)'));
 assert.match(personal,/auction:false/);
 assert.doesNotMatch(personal,/onAuction\(/);
});
