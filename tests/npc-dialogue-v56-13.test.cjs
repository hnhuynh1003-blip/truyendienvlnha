const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const speech=require('../js/npc-dialogue-v56-13.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const reserved={name:'Ôn Tri Hành',note:'Lạnh lùng, kiệm lời, nghiêm túc'};
test('V56.13 screenshot regression: stop first-person narration in short text bubbles',()=>{
 const raw='Ánh mắt tôi lạnh lùng nhìn cô, không một gợn sóng.';
 const cleaned=speech.clean(raw,'hello',reserved);
 assert.equal(cleaned,'Chào. Có chuyện gì?');
 assert.doesNotMatch(cleaned,/ánh mắt|lạnh lùng nhìn|gợn sóng/i);
});
test('V56.13 remove stage directions and retain quoted NPC speech',()=>{
 assert.equal(speech.clean('Ôn Tri Hành khẽ nhíu mày. “Có chuyện gì?”','xin chào',reserved),'Có chuyện gì?');
 assert.equal(speech.clean('*Ôn Tri Hành mỉm cười* Chào bạn.','hi',{name:'Ôn Tri Hành'}),'Chào bạn.');
 assert.equal(speech.clean('[Hệ thống: mở kênh] (Cô khẽ nhíu mày) Đừng làm phiền tôi.','alo',reserved),'Đừng làm phiền tôi.');
 assert.equal(speech.clean('Ôn Tri Hành: Ừ. Tôi nghe.','xin chào',reserved),'Ừ. Tôi nghe.');
});
test('V56.13 direct first-person messenger speech is not mistaken for scene narration',()=>{
 const utterances=['Tôi không thích đông người.','Tôi đã nhìn thấy chiếc hộp đó.','Ừ, tôi nghe đây.','Vì sao cô lại hỏi vậy?','Tôi muốn suy nghĩ thêm về chuyện đó.'];
 for(const utterance of utterances)assert.equal(speech.clean(utterance,'Cô nghĩ sao?',reserved),utterance);
});
test('V56.13 scene-only response to a real question is rejected rather than saved as NPC memory',()=>{
 assert.equal(speech.clean('Ánh mắt tôi lạnh lùng nhìn cô, không một gợn sóng.','Cô nghĩ sao về chuyện hôm qua?',reserved),'');
 assert.equal(speech.clean('Cô ấy gật đầu, đôi mắt bừng sáng.','Cô có nhớ tôi không?',reserved),'');
});
test('V56.13 strict dialogue instruction forbids gestures and reserves gameplay for later',()=>{
 const prompt=speech.instruction();
 assert.match(prompt,/CHẾ ĐỘ NHẮN TIN TRỰC TIẾP/);
 assert.match(prompt,/KHÔNG PHẢI GAME NHẬP VAI THEO CẢNH/);
 assert.match(prompt,/miêu tả ánh mắt\/cử chỉ/);
 assert.match(prompt,/CÁCH DÙNG TỪ/);
 const aiFn=html.split('async function callGeminiAIChat(')[1]?.split('async function callGeminiAI(')[0];
 assert.ok(aiFn);
 assert.match(aiFn,/DuduNpcProfileV5615\?\.compile\(/);
 assert.doesNotMatch(aiFn,/Bạn đang nhập vai hoàn toàn/);
 assert.match(aiFn,/KHÔNG dựng cảnh nhập vai/);
 assert.match(html,/src="js\/npc-dialogue-v56-13\.js\?v=56-13"/);
});
test('V56.13 postprocessing happens before chat and NPC memory persistence',()=>{
 const method=html.split('async function deliverNpcReply(')[1]?.split('async function retryLastNpcReply(')[0];
 assert.ok(method);
 const filter=method.indexOf('DuduNpcDialogueV5613?.clean');
 const save=method.indexOf("chatHistories[requestChatKey].push({role:'model'");
 const memory=method.indexOf('?.addExchange(lastUser.text,res.text,ref)');
 assert.ok(filter>=0&&save>filter&&memory>filter);
 assert.match(method,/if\(!spoken\)/);
 assert.match(method,/pendingNpcRetry/);
});
