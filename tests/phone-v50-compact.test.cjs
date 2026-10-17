const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'css/phone-compact-v50.css'),'utf8');
const home=html.slice(html.indexOf('<div id="phone-home-screen">'),
  html.indexOf('<div class="phone-app-grid" aria-label="Ứng dụng thường dùng">'));
test('V50 compact profile preserves every live data binding exactly once',()=>{
  for(const id of ['player-avatar-home-v16','phone-player-avatar-v16','phone-player-name-v16',
    'phone-level-display','phone-exp-text','phone-exp-track-v50','phone-exp-fill',
    'phone-currency-display','dudu-v30-account-meta']){
    assert.equal((home.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  const accountStart=home.indexOf('id="player-avatar-home-v16"');
  const accountEnd=home.indexOf('</button>',accountStart);
  assert.ok(accountStart>=0&&accountEnd>accountStart);
  for(const id of ['phone-level-display','phone-exp-text','phone-exp-fill','phone-currency-display']){
    const at=home.indexOf('id="'+id+'"');
    assert.ok(at>accountStart&&at<accountEnd,id+' belongs to the one profile card');
  }
  assert.match(home,/onclick="openPhoneApp\('profile'\)"/);
  assert.match(html,/phone-exp-track-v50[\s\S]*?aria-valuemax/);
  assert.match(html,/expTrack\.setAttribute\('aria-valuenow'/);
});
test('V50 renders a single production balance and preserves legacy sandbox display',()=>{
  assert.match(css,/dudu-live-mode[\s\S]*?#dudu-v30-account-meta\{\s*display:none !important/);
  assert.match(css,/dudu-sandbox-mode[\s\S]*?#dudu-v30-account-meta\{\s*display:block/);
  assert.match(css,/dudu-sandbox-mode[\s\S]*?\.widget-currency\s*\{\s*display:none !important/);
  assert.match(css,/dudu-v50-compact-profile \.phone-widgets/);
  assert.match(css,/height:4px !important/);
  assert.match(css,/#phone-player-name-v16[\s\S]*?text-overflow:ellipsis/);
});
test('V50 responsive header and phone stylesheet are loaded after legacy styles',()=>{
  assert.match(html,/href="css\/phone-compact-v50\.css\?v=50-1"/);
  assert.ok(html.indexOf('href="css/phone-compact-v50.css')>html.indexOf('</style>'));
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/#cloud-indicator\{display:none !important/);
  assert.match(css,/#account-status-btn\{max-width:68px/);
  assert.doesNotMatch(css,/(?:^|\n)\s*body\s*\{/);
  assert.doesNotMatch(css,/userProfile\.|\.collection\(|fetch\(/);
});
