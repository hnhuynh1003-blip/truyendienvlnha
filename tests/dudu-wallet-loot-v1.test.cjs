'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=src('index.html');

test('Ví Xu is a first-class phone app, backed by existing profile Xu',()=>{
 assert.match(html,/onclick="openPhoneApp\('wallet'\)" aria-label="Mở Ví Xu mua sắm"/);
 assert.match(html,/id="phone-app-wallet"/);
 assert.match(html,/id="dudu-wallet-system-balance"/);
 assert.match(html,/id="dudu-wallet-arcade-balance"/);
 assert.match(html,/function renderWallet\(\)/);
 assert.match(html,/userProfile\.currency/);
 assert.match(html,/appName === 'wallet'/);
 assert.match(html,/if\(document\.getElementById\('phone-app-wallet'\)\?\.style\.display==='flex'\)renderWallet\(\)/);
 assert.match(html,/css\/dudu-wallet-v1\.css\?v=wallet-1/);
});

test('wallet navigation has working shopping and Arcade controls but cannot mint Xu',()=>{
 const wallet=html.slice(html.indexOf('id="phone-app-wallet"'),html.indexOf('<!-- APP: CỬA HÀNG -->'));
 assert.match(wallet,/onclick="openPhoneApp\('shop'\)"/);
 assert.match(wallet,/onclick="openPhoneApp\('arcade'\)"/);
 assert.doesNotMatch(wallet,/onclick="[^\"]*(transfer|claim|award|grant)/i);
 const arcade=src('js/personal-arcade-ui-v1.js');
 assert.match(arcade,/peekBalance/);
 assert.match(arcade,/data-arcade-exchange="wallet"/);
 assert.match(arcade,/Chuyển Xu · Chưa mở/);
 assert.doesNotMatch(arcade,/userProfile\.currency\s*[+\-]?=/);
});

test('loot cadence gates both chapter button and direct function',()=>{
 const cadence=require('../js/loot-cadence-v42.js');
 assert.equal(cadence.PHONE_COOLDOWN_MS,15*60*1000);
 assert.equal(cadence.CHAPTER_DAILY_LIMIT,3);
 assert.match(html,/DuduLootCadenceV42\.chapterDailyRemaining\(userProfile\.lootedChapters\)<=0/);
 assert.match(html,/DuduLootCadenceV42\.chapterDailyRemaining\(userProfile\.lootedChapters,now\)<=0/);
 assert.match(html,/Hết lượt hôm nay/);
});
