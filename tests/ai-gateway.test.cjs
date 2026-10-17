const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');

test('browser never contains direct Gemini calls or asks end users for a Gemini key',()=>{
  const html=load('index.html');
  const proxy=load('js/ai-proxy.js');
  assert.doesNotMatch(html,/generativelanguage\.googleapis\.com|my_gemini_api_key|configureAIKeyPrompt|AI_FAILOVER_MODELS/);
  assert.match(html,/DuduAI\.generate\('chat'/);
  assert.match(html,/DuduAI\.generate\('assist'/);
  assert.doesNotMatch(proxy,/localStorage\.(?:getItem|setItem)\(['"]my_gemini_api_key/);
  assert.match(proxy,/localStorage\.removeItem\('my_gemini_api_key'\)/);
  assert.match(proxy,/getIdToken\(\)/,'Client must send Firebase ID token');
  assert.match(proxy,/Bearer /);
  assert.match(proxy,/const WORKER_URL = 'https:\/\/dudu-ai-staging\.dudu-studio-ai\.workers\.dev';/,'Only the confirmed public Cloudflare endpoint is embedded');
  assert.doesNotMatch(proxy,/httpsCallable|ReCaptchaEnterpriseProvider|gemini-api-key/i);
});

test('phone distinguishes shared library counts from player progress',()=>{
  const html=load('index.html');
  assert.match(html,/Thống kê thư viện/);
  assert.match(html,/Dùng chung/);
  assert.match(html,/id="stat-novels"/);
  assert.match(html,/id="stat-chapters"/);
  for(const id of ['stat-personal-reading','stat-personal-npcs','stat-personal-items','stat-personal-level','stat-personal-coins']) {
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.match(html,new RegExp("'"+id+"'"));
  }
  assert.match(html,/scopedLocalKey\('bookmark', novel\.id\)/);
});

test('server-side service is enforced with secret + App Check, and quota docs stay private',()=>{
  const code=load('functions/index.js');
  const rules=load('security/firestore.rules.review');
  assert.match(code,/defineSecret\('GEMINI_API_KEY'\)/);
  assert.match(code,/enforceAppCheck:true/);
  assert.match(code,/await db\.runTransaction\(/);
  assert.match(code,/ai_global_usage_v2/);
  assert.match(code,/ai_usage_v2/);
  assert.match(rules,/match \/\{document=\*\*\}[\s\S]*?allow read, write: if false;/);
});

test('Cloudflare gateway independently verifies Firebase JWT and limits cost',()=>{
  const worker=load('cloudflare/src/index.mjs');
  const auth=load('cloudflare/src/auth.mjs');
  const quota=load('cloudflare/src/quota.mjs');
  const config=load('cloudflare/wrangler.toml');
  const html=load('index.html');
  assert.match(auth,/jwtVerify\(/);
  assert.match(auth,/createRemoteJWKSet\(/);
  assert.match(auth,/algorithms:\['RS256'\]/);
  assert.match(auth,/securetoken\.google\.com/);
  assert.match(worker,/AI_ENABLED!=='true'/);
  assert.match(worker,/env\.GEMINI_API_KEY/);
  assert.match(worker,/DUDU_QUOTA\.getByName\('global-budget-v1'\)/);
  assert.match(quota,/transactionSync\(/);
  assert.match(quota,/global_usage/);
  assert.match(quota,/user_usage/);
  assert.match(config,/new_sqlite_classes/);
  assert.match(config,/AI_ENABLED = "true"/);
  assert.match(html,/const DUDU_NPC_AI_MODE = !IS_SANDBOX_MODE/);
  assert.match(worker,/if\(!env\.GEMINI_API_KEY\)return error\(\x27ai-disabled\x27/);
  assert.match(html,/firebase-functions-compat/,'V52 economy uses callable Functions independently of the AI gateway');
  assert.doesNotMatch(html,/firebase\.functions\(\)\.httpsCallable\(['"]duduAiGenerate/);
});
