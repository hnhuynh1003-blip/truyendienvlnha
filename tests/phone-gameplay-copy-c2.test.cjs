const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html');

test('NPC chat and envelope sheet use gameplay copy, not backend instructions',()=>{
 const chat=html.slice(html.indexOf('id="phone-app-chat"'),
  html.indexOf('<!-- Ví Xu hệ thống'));
 assert.doesNotMatch(chat,/Hội thoại NPC dùng Gemini qua Cloudflare/);
 assert.doesNotMatch(chat,/Xu ảo trong Sandbox|chờ Rules|Chờ Rules/);
 assert.match(chat,/Mỗi người tối đa 3 phong bao\/ngày, cách nhau 5 phút/);
 const social=read('js/chat-social-v32.js');
 assert.match(social,/Đã gửi phong bao/);
 assert.match(social,/Chưa có hồi âm/);
 assert.doesNotMatch(social,/Đang xác nhận Xu trên Firebase|Đã gửi .* Xu ảo và lưu/);
});

test('NPC and inventory feedback hides sync mechanics without changing guards',()=>{
 const start=html.indexOf('async function personalNpcActionV1(');
 const end=html.indexOf('function v43RecordNpcBond(',start);
 const feedback=html.slice(start,end);
 assert.match(feedback,/Lời hỏi thăm chưa được gửi/);
 assert.doesNotMatch(feedback,/Tiến độ đã lưu vào tài khoản Firebase/);
 const gift=html.slice(html.indexOf('async function commitPersonalNpcExchangeV1('),
  html.indexOf('async function executeGiftItem('));
 assert.match(gift,/envelope-insufficient/);
 assert.doesNotMatch(gift,/Không xác nhận được giao dịch Firebase/);
 const inventory=html.slice(html.indexOf('async function personalInventoryAction('),
  html.indexOf('function renderInventory()'));
 assert.match(inventory,/Hãy thử lại với món đồ này/);
 assert.doesNotMatch(inventory,/cần xác thực máy chủ/);
});

test('AI model metadata is opt-in; Arcade exchange remains disabled by the same gate',()=>{
 assert.match(html,/document\.getElementById\('dudu-v5612-ai-settings'\)\?\.open&&/);
 assert.match(html,/meta\.textContent=source\?/);
 const arcade=read('js/personal-arcade-ui-v1.js');
 assert.match(arcade,/Chuyển Xu · Sắp mở/);
 assert.match(arcade,/!exchangeEnabled\(\)\|\|exchangeBusy\|\|!quoteForExchange\(\)\.ok/);
 assert.doesNotMatch(arcade,/Chuyển Xu · Chờ Rules/);
});
