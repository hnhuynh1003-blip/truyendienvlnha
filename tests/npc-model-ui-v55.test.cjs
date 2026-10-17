const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'js/ai-proxy.js'),'utf8');
const config=fs.readFileSync(path.join(root,'cloudflare/wrangler.npc-ai-v54.toml'),'utf8');

test('V55 shows compact model picker and server-only usage counter in Contacts',()=>{
 for(const id of ['dudu-v55-model-select','dudu-v55-quota','dudu-v55-model-bar'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/function syncNpcModelV55\(\)/);
 assert.match(html,/function refreshNpcQuotaV55\(\)/);
 assert.match(html,/DuduAI\.status\(\)/);
 assert.match(html,/if\(!IS_SANDBOX_MODE\)void refreshNpcQuotaV55\(\)/);
 assert.match(html,/src="js\/ai-proxy\.js\?v=55-1"/);
});

test('V55 stores selected model per Firebase UID and labels each AI response',()=>{
 assert.match(client,/encodeURIComponent\(uid\)\+':global:npc-model'/);
 assert.match(client,/MODELS\.some\(x=>x\.id===id\)/);
 assert.match(client,/purpose==='chat'\?\{model:model\(\)\}:\{\}/);
 assert.match(html,/chatHistories\[requestChatKey\]\.push\(\{role:'model',text:res\.text,/);
 assert.match(html,/meta\.textContent='✦ '\+msg\.model/);
 assert.match(html,/res\.error\+' · Tin nhắn đã lưu trên thiết bị\.'/);
 assert.doesNotMatch(client,/GEMINI_API_KEY\s*=/);
});

test('V55 personal Worker config keeps non-AI production features closed',()=>{
 assert.match(config,/^AI_ENABLED = "true"$/m);
 for(const key of ['COLLECTIBLES_ENABLED','GIFTS_ENABLED','PILOT_ENABLED','COMMENTS_ENABLED','GIFT_SETTLEMENT_ENABLED'])
   assert.match(config,new RegExp('^'+key+' = "false"$','m'));
 assert.match(config,/name = "dudu-ai-staging"/);
});
