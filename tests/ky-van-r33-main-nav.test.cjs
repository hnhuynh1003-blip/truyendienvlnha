'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const source=path=>readFileSync(join(__dirname,'..',path),'utf8');

test('R3.3 main phone labels are Bách Hí and Kỳ Vận while stable routes survive',()=>{
 const html=source('index.html');
 const home=html.slice(html.indexOf('id="dudu-fun-launch-v43"'),html.indexOf('<!-- Archived mailbox launcher'));
 assert.match(home,/onclick="openPhoneApp\('fun'\)" aria-label="Mở Kỳ Vận"/);
 assert.match(home,/<div class="app-label">Kỳ Vận<\/div>/);
 assert.match(home,/onclick="openPhoneApp\('arcade'\)" aria-label="Mở Bách Hí"/);
 assert.match(home,/<div class="app-label">Bách Hí<\/div>/);
 assert.doesNotMatch(home,/<div class="app-label">(?:DUDU FUN|Arcade)<\/div>/);
 assert.match(html,/id="phone-app-fun"/);
 assert.match(html,/id="phone-app-arcade"/);
 assert.match(html,/<span>✦ Kỳ Vận<\/span>/);
 assert.match(html,/css\/ky-van-r33-compact\.css\?v=r33-1/);
 assert.match(html,/dudu-fun-ui-v43\.js\?v=f39-1&amp;ky-van=r33-1/);
});
test('R3.3 Kỳ Vận always renders three navigation tabs; no Trò khác dropdown',()=>{
 const js=source('js/dudu-fun-ui-v43.js');
 assert.match(js,/const tabs=el\('nav','dudu-fun-tabs ky-van-game-tabs'\)/);
 assert.match(js,/\['box','🎁 Vạn Bảo'\],\['ticket','🎟️ Vé Cào'\]/);
 assert.match(js,/\['slot','🎰 Vạn Tượng'\]/);
 assert.match(js,/tabs\.setAttribute\('aria-label','Ba trò chơi Kỳ Vận'\)/);
 assert.match(js,/button\.setAttribute\('aria-pressed',String\(open===type\)\)/);
 assert.match(js,/host\.append\(tabs\)/);
 assert.doesNotMatch(js,/el\('details','f44-other-games'\)|el\('summary','','Trò khác'\)/);
 assert.match(js,/open==='box'&&host\.querySelector\?\.\('\.f44-vanbao'\)/,
  'keep Vạn Bảo resume and pending-reward UI');
 assert.match(js,/root\.DuduVanBaoUIF44\.mount|root\.DuduVanBaoUIF44\)root\.DuduVanBaoUIF44\.mount/);
 assert.match(js,/open='slot';hint=true/,'Vạn Tượng shortcut stays functional');
});
test('R3.3 compresses only Kỳ Vận shell; leave chess grid and shared Xu rules alone',()=>{
 const css=source('css/ky-van-r33-compact.css');
 assert.match(css,/#phone-app-fun/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/\.f41-cosmos/);
 assert.doesNotMatch(css,/\.f44-(?:board|cell)|profiles_v2|currency\s*:/);
 const html=source('index.html');
 assert.match(html,/if\(!window\.DuduVanBaoUIF44\?\.back\?\.\(\)\)phoneHome\(\)/);
});
