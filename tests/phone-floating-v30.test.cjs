const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/phone-floating-v30.css'),'utf8');
test('V69 Home keeps the dock and adds one System shortcut and no duplicate personal shortcut',()=>{
 const home=html.slice(html.indexOf('<div id="phone-home-screen">'),
  html.indexOf('<!-- APP: HỒ SƠ -->'));
 const shortcuts=[...home.matchAll(/class="app-icon" onclick="openPhoneApp\('([a-z]+)'\)"/g)].map(m=>m[1]);
 assert.deepEqual(shortcuts,['inventory','quests','system','shop','museum','stories','codex','chat','settings']);
 assert.equal(shortcuts.filter(x=>x==='codex').length,1);
 assert.equal(shortcuts.filter(x=>x==='stories').length,1);
 assert.ok(!shortcuts.includes('profile'));
 assert.match(home,/id="player-avatar-home-v16".+onclick="openPhoneApp\('profile'\)"/);
 assert.match(home,/id="dudu-v30-account-meta"/);
 assert.match(home,/class="dudu-v30-dock"/);
 assert.match(html,/id="phone-app-profile"/);
 assert.match(html,/id="phone-app-codex"/);
 assert.match(html,/id="phone-app-stories"/);
 assert.doesNotMatch(home,/id="quests-container"/);
});
test('V30 wallpaper CSS overrides opaque old layers and shows full-screen artwork',()=>{
 assert.match(html,/href="css\/phone-floating-v30.css\?v=[\w-]+"/);
 assert.match(css,/body\.dudu-phone-v11\[data-dudu-phone-wallpaper\] #cyber-phone \.phone-screen/);
 assert.match(css,/body\.dudu-phone-v11\[data-dudu-phone-wallpaper\] #cyber-phone #phone-home-screen/);
 assert.match(css,/background-image:none !important/);
 assert.match(css,/--dudu-v30-art:url\("\.\.\/assets\/wallpapers\/worlds\/xianxia.webp"\)/);
 assert.match(css,/--dudu-v30-art:url\("\.\.\/assets\/wallpapers\/worlds\/gothic.webp"\)/);
 assert.match(css,/background-image:linear-gradient/);
 assert.match(css,/backdrop-filter:blur\(/);
 assert.match(css,/prefers-reduced-motion/);
});
test('V30 retains exp/coins update hooks, safely shows compact account meta',()=>{
 assert.match(html,/id="phone-level-display"/);
 assert.match(html,/id="phone-currency-display"/);
 assert.match(html,/id="phone-exp-fill"/);
 assert.match(html,/miniMeta\.textContent=/);
 assert.match(css,/body\.dudu-phone-v11\.dudu-live-mode[\s\S]*?clip-path:none !important/);
 assert.match(css,/body\.dudu-phone-v11\.dudu-sandbox-mode[\s\S]*?clip-path:inset\(50%\)/);
 assert.doesNotMatch(css,/(?:^|\n)\s*body\s*\{/);
});
