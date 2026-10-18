const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const route=require('../js/npc-auto-model-v56-11.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'../js/ai-proxy.js'),'utf8');
const pick=q=>route.route([{role:'user',text:q}]);
test('V56.11 Auto defaults to a lightweight Gemini model on everyday chat',()=>{
 for(const q of ['Chào cô ạ','Alo','Cô đang làm gì?','Cảm ơn','Hôm nay vui không?']){
  assert.equal(pick(q),'gemini-3.5-flash-lite',q);
 }
});
test('V56.11 Auto uses deeper Flash only for complex roleplay or analysis',()=>{
 assert.equal(pick('Phân tích mâu thuẫn trong ký ức và quá khứ của nhân vật rồi so sánh các lựa chọn.'),'gemini-3.8-flash');
 assert.equal(pick('Tại sao cô lại lựa chọn như vậy khi nhớ đến phó bản cũ?'),'gemini-3.6-flash');
 assert.equal(pick('Tôi muốn nghe cô giải thích vì sao mọi chuyện lại thành ra thế này.'),'gemini-3.6-flash');
});
test('V56.11 client auto ID stays local and never becomes an invalid Gemini API model',()=>{
 assert.equal(route.AUTO,'auto');
 assert.match(client,/\['auto','✦ Tự động · phù hợp câu hỏi'\]/);
 assert.match(client,/const resolved=chosen===AUTO\?/);
 assert.match(client,/window\.DuduNpcAutoModelV5611\?\.route/);
 assert.match(client,/model:resolved/);
 assert.match(html,/src="js\/npc-auto-model-v56-11\.js\?v=56-11"/);
 assert.match(html,/src="js\/ai-proxy\.js\?v=56-11"/);
 assert.match(html,/DuduAI\.generate\('chat',instruction\.slice\(0,3000\),context,query\)/);
});
test('V56.11 manual selection preserved per UID with no hidden retries',()=>{
 assert.match(client,/MODELS\.some\(x=>x\.id===id\)/);
 assert.match(client,/encodeURIComponent\(uid\)\+':global:npc-model'/);
 assert.doesNotMatch(client,/retryFailedModel|Promise\.all\(MODELS|for\(const model of MODELS\)/);
});
