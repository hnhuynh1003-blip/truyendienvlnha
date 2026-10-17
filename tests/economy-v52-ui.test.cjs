'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=file('index.html');
const client=file('js/economy-live-v52.js');
const market=file('js/market-ui-v43.js');
const backend=file('functions/index.js');
test('V52 client SDK and App Check are explicitly configured but site key is empty by default',()=>{
 assert.match(html,/firebase-functions-compat\.js/);
 assert.match(html,/firebase-app-check-compat\.js/);
 assert.match(html,/js\/appcheck-sitekey-v52\.js\?v=52-2/);
 assert.match(html,/new firebase\.appCheck\.ReCaptchaEnterpriseProvider\(/);
 assert.match(html,/DUDU_RECAPTCHA_ENTERPRISE_SITE_KEY\.trim\(\)/);
 assert.match(file('js/appcheck-sitekey-v52.js'),/DUDU_RECAPTCHA_ENTERPRISE_SITE_KEY = ''/);
 assert.match(backend,/enforceAppCheck:true/);
});
test('V52 buttons call only verified Firebase callable endpoints',()=>{
 assert.match(html,/js\/economy-live-v52\.js\?v=52-1/);
 for(const app of ['shop','quests','inventory']){
  assert.match(html,new RegExp('window\\.DuduEconomyLiveV52\\?\\.open'+app[0].toUpperCase()+app.slice(1)+'\\(\\)'));
 }
 assert.match(client,/duduEconomyPurchase/);
 assert.match(client,/duduEconomyDailyCheckIn/);
 assert.match(client,/duduEconomyStatus/);
 assert.match(client,/const account=uid\(\)/);
 assert.match(client,/functions\('asia-southeast1'\)\.httpsCallable/);
 assert.doesNotMatch(client,/userProfile\.currency\s*[+\-=]/);
 assert.doesNotMatch(client,/userProfile\.inventory\s*=/);
 assert.doesNotMatch(client,/userProfile\.exp\s*=/);
 assert.doesNotMatch(client,/\.collection\('economy_accounts_v52'\)/);
});
test('V52 purchasing cannot trust local prices, discounts or inventory',()=>{
 assert.match(client,/saleIds:state\.enabled\?state\.saleIds:\[\]/);
 assert.match(client,/functionalState:state\.enabled\?null:userProfile\?\.functionalV438/);
 assert.match(market,/saleIds=null/);
 assert.match(market,/!saleIds\.includes\(item\.id\)/);
 assert.match(client,/sessionStorage\.setItem\(pendingKey\(account\)/);
 assert.match(backend,/price=EconomyV52\.PRICES\[itemId\]/);
 assert.doesNotMatch(backend,/request\.data\.price|request\.data\.coins|request\.data\.exp/);
});
test('V52 trusted storage review denies client writes to wallet, receipts and gate',()=>{
 const rules=file('security/firestore-economy-v52.rules.review');
 assert.match(rules,/match \/economy_accounts_v52\/\{uid\}/);
 assert.match(rules,/match \/system_config\/economy_v52/);
 assert.ok((rules.match(/allow read, write: if false/g)||[]).length>=4);
 assert.match(file('docs/DUDU-V52-TRUSTED-ECONOMY-RELEASE.md'),/No migration of legacy balances/);
});
