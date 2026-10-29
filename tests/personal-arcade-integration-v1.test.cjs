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
 assert.match(html,/personal-arcade-core-v1\.js\?v=arcade-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=arcade-1/);
 const ui=src('js/personal-arcade-ui-v1.js');
 for(const name of ['Trạm Neon','Địa Tầng 07','Vườn Sương'])
  assert.match(ui,new RegExp(name));
});
test('Arcade V1 is a local playground, not an unprotected server reward grant',()=>{
 const ui=src('js/personal-arcade-ui-v1.js');
 const core=src('js/personal-arcade-core-v1.js');
 assert.match(ui,/root\.localStorage\.setItem/);
 assert.match(ui,/button\('Chuyển vào ví Xu hệ thống · chờ Rules','transfer','gold',true\)/);
 assert.match(ui,/Chưa chuyển vào ví Xu chính/);
 for(const forbidden of ['.collection(','firebase.firestore','userProfile.currency',
  'DuduEconomyLiveV52','grantCoins','setDoc(']){
  assert.equal(ui.includes(forbidden),false);
  assert.equal(core.includes(forbidden),false);
 }
});
