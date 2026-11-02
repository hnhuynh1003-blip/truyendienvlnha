'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const src=name=>readFileSync(join(__dirname,'..',name),'utf8');
const exchange=require('../js/personal-arcade-exchange-v1.js');

test('FUN-P1 clearly distinguishes the currencies without migrating old keys',()=>{
 const html=src('index.html');
 assert.match(html,/id="phone-currency-display"[^>]*>🟡 50/);
 assert.match(html,/id="dudu-wallet-system-amount"/);
 assert.match(html,/💚 Tiền Xanh · Arcade/);
 assert.match(html,/🟡 XU VÀNG · DUDU STUDIO/);
 assert.match(html,/💚 10 → 🟡 1/);
 assert.match(html,/userProfile\.currency\.toLocaleString\('vi-VN'\)/);
 const ui=src('js/personal-arcade-ui-v1.js');
 assert.match(ui,/const money=amount=>'💚 '/);
 assert.match(ui,/💚 10 Tiền Xanh/);
 assert.match(ui,/🟡 1 Xu Vàng/);
 assert.match(ui,/DUDU_SPARK_EXCHANGE_V1_READY===true/);
});

test('FUN-P1 quote is read-only, precise and has no daily cap',()=>{
 assert.deepEqual({rate:exchange.GAME_XU_PER_WALLET_XU,
  minimum:exchange.MIN_GAME_XU},{rate:10,minimum:10});
 const preview=exchange.quote({availableTenths:1029,requestedGameXu:100});
 assert.equal(preview.previewOnly,true);
 assert.equal(preview.walletXu,10);
 assert.equal(preview.maxGameXu,100);
 assert.equal('DAILY_WALLET_XU_CAP' in exchange,false);
 assert.doesNotMatch(src('js/personal-arcade-exchange-v1.js'),/runTransaction|setItem|\.update\(/);
});

test('FUN-P1 does not enable Arcade transfer or touch Firebase data policy',()=>{
 const html=src('index.html');
 assert.doesNotMatch(html,/DUDU_SPARK_EXCHANGE_V1_READY\s*=\s*true/);
 const rules=src('firestore.rules');
 assert.match(rules,/match \/arcade_receipts_v1\/\{receiptId\} \{[\s\S]*?allow read, write: if false/);
 assert.match(src('js/dudu-fun-ui-v43.js'),/10 Xu Vàng\/vé/);
 assert.match(src('js/market-ui-v43.js'),/Xu Vàng/);
});
