'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const src=name=>readFileSync(join(__dirname,'..',name),'utf8');
const exchange=require('../js/personal-arcade-exchange-v1.js');

test('FUN-P1.1 uses bill/coin icons on compact counters without migrating old keys',()=>{
 const html=src('index.html');
 assert.match(html,/class="widget-currency dudu-money-display--gold" id="phone-currency-display"[^>]*>50/);
 assert.match(html,/id="dudu-wallet-system-amount"/);
 assert.match(html,/dudu-money-display--green" id="dudu-wallet-arcade-balance"/);
 assert.match(html,/dudu-money-icon--green[^>]*><\/i>10 →/);
 assert.match(html,/dudu-money-icon--gold[^>]*><\/i>1 · Chưa kích hoạt đổi/);
 assert.match(html,/css\/dudu-currency-icons-v1\.css/);
 assert.match(html,/userProfile\.currency\.toLocaleString\('vi-VN'\)/);
 const ui=src('js/personal-arcade-ui-v1.js');
 assert.match(ui,/const money=amount=>greenMark\+fmt\(amount\)/);
 assert.match(ui,/dudu-money-icon--green/);
 assert.match(ui,/dudu-money-icon--gold/);
 const style=src('css/dudu-currency-icons-v1.css');
 assert.match(style,/dudu-money-icon--green/);
 assert.match(style,/dudu-money-icon--gold/);
 assert.match(style,/border-radius:50%/);
 assert.doesNotMatch(html,/🟡 50|💚 —|XU VÀNG · DUDU STUDIO/);
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
 assert.match(src('js/dudu-fun-ui-v43.js'),/withGold\('button','dudu-fun-start lucky-buy'/);
 assert.match(src('js/market-ui-v43.js'),/dudu-money-display--gold/);
});
