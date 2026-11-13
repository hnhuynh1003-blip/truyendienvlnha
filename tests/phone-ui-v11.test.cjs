const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/phone-ui-v11.css'),'utf8');

test('V49.8 phone visuals apply to live Firebase accounts while sandbox remains separate',()=>{
  assert.match(html,/rel="stylesheet" href="css\/phone-ui-v11\.css(?:\?v=[\w-]+)?"/);
  assert.match(html,/document\.body\.classList\.add\('dudu-phone-v11'\)/);
  assert.match(html,/document\.body\.classList\.add\(IS_SANDBOX_MODE \? 'dudu-sandbox-mode' : 'dudu-live-mode'\)/);
  assert.match(html,/document\.body\.classList\.toggle\('dudu-phone-open', opened\)/);
  assert.match(css,/body\.dudu-phone-v11 #cyber-phone/);
  assert.match(html,/role="dialog" aria-label="Cyber Phone DUDU"/);
  assert.ok(!/(^|\n)\s*#cyber-phone\s*\{/.test(css),
    'V11 may style the live phone only through the Sandbox body class');
  assert.ok(!/(^|\n)\s*\.btn\s*\{/.test(css),
    'V11 must not override global buttons outside the phone');
});
test('home shortcuts and floating phone are native keyboard accessible buttons',()=>{
  const shortcuts=[...html.matchAll(/<button type="button" class="app-icon" onclick="openPhoneApp\('([a-z]+)'\)" aria-label="Mở ([^"]+)"/g)];
  assert.equal(shortcuts.length,10);
  assert.deepEqual(shortcuts.map(x=>x[1]).sort(),
    ['chat','codex','inventory','museum','quests','settings','shop','stories','system','wallet']);
  assert.match(html,/<button type="button" id="phone-fab"[^>]*aria-controls="cyber-phone"[^>]*aria-expanded="false"/);
  assert.match(html,/class="phone-close-btn" onclick="togglePhone\(\)"/);
  assert.match(html,/class="phone-home-bar" onclick="phoneHome\(\)" aria-label=/);
  assert.match(html,/document\.addEventListener\('keydown', event =>/);
});
test('V11 is responsive, has visible button states, and respects reduced motion',()=>{
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/@media\(max-width:330px\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.app-icon:focus-visible/);
  assert.match(css, /\.app-icon:active/);
  assert.match(css, /\.btn:hover:not\(:disabled\)/);
  assert.match(css, /\.phone-sub-app/);
  assert.match(css, /#phone-app-chat/);
});
