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
  assert.match(proxy,/ReCaptchaEnterpriseProvider/);
  assert.match(proxy,/firebase\.functions\(REGION\)/);
});

test('phone distinguishes shared library counts from player progress',()=>{
  const html=load('index.html');
  assert.match(html,/THƯ VIỆN DUDU \(DÙNG CHUNG\)/);
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
