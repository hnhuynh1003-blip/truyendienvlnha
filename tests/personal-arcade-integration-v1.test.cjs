'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('C4.4 joins the phone as one Arcade app with four named games',()=>{
 const html=src('index.html');
 assert.match(html,/id="personal-arcade-launch-v1"/);
 assert.match(html,/onclick="openPhoneApp\('arcade'\)"/);
 assert.match(html,/id="phone-app-arcade"/);
 assert.match(html,/DuduPersonalArcadeUIV1\?\.render\(\)/);
 assert.match(html,/personal-jade-core-v1\.js\?v=c414-1/);
 assert.match(html,/personal-jade-ui-v1\.js\?v=c414-1/);
 assert.match(html,/personal-arcade-core-v1\.js\?v=c49-1/);
 assert.match(html,/personal-arcade-ui-v1\.js\?v=c417-1/);
 assert.match(html,/personal-arcade-v1\.css\?v=c414-1/);
 assert.match(html,/arcade-immersive-c417\.css\?v=c417-1/);
 assert.match(html,/id="arcade-header-wallet-v1"/);
 assert.match(html,/ARCADE \/\/ 04/);
 const ui=src('js/personal-arcade-ui-v1.js');
 for(const name of ['Trạm Neon','Địa Tầng 07','Vườn Sương','Ngọc Phường'])
  assert.match(ui,new RegExp(name));
 const styles=src('css/personal-arcade-v1.css');
 const skin=src('css/arcade-immersive-c417.css');
 assert.match(skin,/\.arcade-world-heading\{\s*display:flex!important/,
  'All four game titleplates must be visible above the playable scene');
 for(const theme of ['neon','mine','garden','jade'])
  assert.match(skin,new RegExp('\\.arcade-world-'+theme+' \\.arcade-world-heading'),
   'Each game needs a distinctive titleplate');
 assert.match(styles,/\.arcade-tab\{min-width:0;min-height:34px/,
  'Four game tabs must keep a compact mobile height');
 assert.ok(ui.indexOf('class="neon-stage-actions"')>ui.indexOf('class="arcade-stage neon-stage'),
  'Neon power controls must be in the visible scene, not the hidden duplicate title');
 assert.match(styles,/\.mine-tap-prompt\{position:absolute;top:0/,
  'Mine tap prompt must not collide with durability at the bottom');
 assert.match(styles,/\.garden-plot-area\{position:absolute;left:6%;right:6%;top:45px/,
  'Garden plots should use the upper scene instead of leaving a large blank sky');
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
