const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const reply=require('../js/npc-reply-style-v56-12.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/chat-messenger-v56-12.css'),'utf8');
const originalChatIds=['dudu-v56-role-box','dudu-v56-role-select','dudu-v56-role-editor',
 'dudu-v56-import-legacy','chat-character-selector','chat-messages-container',
 'dudu-v55-model-bar','dudu-v55-model-select','dudu-v55-quota',
 'chat-connection-status','chat-retry-btn','dudu-v56-send'];
test('V56.12 greeting is one short in-character sentence',()=>{
 for(const greeting of ['xin chào','Chào!','hello','alo','cảm ơn','ngủ ngon']){
  assert.equal(reply.greeting(greeting),true,greeting);
  assert.match(reply.guidance(greeting),/1 câu ngắn/);
  const text=reply.format('[Hệ thống: Kết nối thành công, xin chào.] Ừ, cô đây. Có chuyện gì sao? Kể cô nghe cả ngày hôm nay đi nhé!',greeting);
  assert.equal(text,'Ừ, cô đây. Có chuyện gì sao?');
 }
});
test('V56.12 removes system prefaces without modifying normal historical messages',()=>{
 const original='[Hệ thống: trạng thái tạm thời.] Ôn Tri Hành nhìn lên. Cô vẫn đang nghe đây. Để tôi kể hết cả chuyện này.';
 assert.equal(reply.format(original,'xin chào'),'Ôn Tri Hành nhìn lên.');
 assert.match(reply.guidance('Cô hôm nay thế nào?'),/1–2 câu/);
 assert.equal(reply.format('Tôi đang đây.','Cô hôm nay thế nào?'),'Tôi đang đây.');
});
test('V56.12 explicitly detailed questions are allowed longer replies',()=>{
 const long='Câu một. Câu hai. Câu ba. Câu bốn.';
 assert.equal(reply.wantsDetail('Phân tích sâu từng bước cho tôi'),true);
 assert.equal(reply.format(long,'Phân tích sâu từng bước cho tôi'),long);
});
test('V56.12 controls are compact but preserve chat and roleplay IDs',()=>{
 for(const id of originalChatIds)assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/id="dudu-v5612-role-tools"/);
 assert.match(html,/id="dudu-v5612-ai-settings"/);
 assert.match(html,/src="js\/npc-reply-style-v56-12\.js\?v=56-12"/);
 assert.match(html,/css\/chat-messenger-v56-12\.css\?v=56-12/);
 assert.match(html,/DuduNpcReplyStyleV5612\?\.guidance/);
 assert.match(html,/DuduNpcReplyStyleV5612\?\.format/);
 assert.match(css,/#dudu-spark-chat-tip/);
 assert.match(css,/#dudu-v55-model-bar/);
 assert.match(css,/#chat-messages-container/);
});
test('V56.12 AI and role settings remain operable, with compact view by default',()=>{
 const chat=html.slice(html.indexOf('id="phone-app-chat"'),html.indexOf('id="dudu-v32-envelope-overlay"'));
 assert.match(chat,/onclick="[^"]*v56OpenRoleEditor\(false\)"/);
 assert.match(chat,/onclick="[^"]*v56OpenRoleEditor\(true\)"/);
 assert.ok(chat.includes('onchange="chooseNpcModelV55()"'));
 assert.ok(chat.includes('onclick="refreshNpcQuotaV55()"'));
 assert.ok(chat.includes('onclick="sendChatMessage()"'));
 assert.ok(chat.includes('onclick="retryLastNpcReply()"'));
 assert.ok(chat.includes('onclick="clearCurrentChat()"'));
 assert.ok(chat.indexOf('id="dudu-v55-model-bar"')<chat.indexOf('id="chat-messages-container"'));
 assert.match(css,/dudu-v5612-role-active #dudu-v56-role-note/);
 assert.match(css,/\.dudu-v5612-ai-settings:not\(\[open\]\)/);
});
