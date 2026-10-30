'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Arcade V1 joins the phone as one app with three named games',()=>{
 const html=src('index.html');
 assert.match(html,/id="personal-arcade-launch-v1"/);
 assert.match(html,/onclick="openPhoneApp\('arcade'\)"/);
 assert.match(html,/id="phone-app-arcade"/);
 assert.match(html,/DuduPersonalArcadeUIV1\?\.render\(\)/);
 assert.match(html,/personal-arcade-core-v1\.js\?v=c42-tycoon-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c42-tycoon-1/);
 assert.match(html,/personal-arcade-v1\.css\?v=c42-tycoon-1/);
 const ui=src('js/personal-arcade-ui-v1.js');
 for(const name of ['Trạm Neon','Địa Tầng 07','Vườn Sương'])
  assert.match(ui,new RegExp(name));
});
test('Arcade V1 is local-playable and only wires its Spark transfer behind a disabled-by-default gate',()=>{
 const ui=src('js/personal-arcade-ui-v1.js');
 const core=src('js/personal-arcade-core-v1.js');
 assert.match(ui,/root\.localStorage\.setItem/);
 assert.match(ui,/DUDU_SPARK_EXCHANGE_V1_READY===true/);
 assert.match(ui,/sparkBridge\.transfer/);
 assert.match(ui,/Chuyển Xu · Sắp mở/);
 assert.equal(ui.includes('.collection('),false,'Wallet mutations must go through the tested bridge');
 assert.equal(core.includes('.collection('),false);
 assert.equal(core.includes('userProfile.currency'),false);
});
