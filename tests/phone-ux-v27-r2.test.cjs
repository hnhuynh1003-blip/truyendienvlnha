const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/phone-ux-v27-r2.css'),'utf8');
const block=(start,end)=>{
 const i=html.indexOf(start),j=html.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'expected page section '+start);
 return html.slice(i,j);
};
test('V27 R2 profile keeps all seven source-of-truth stat bindings, without repeated vertical boxes',()=>{
 const part=block('id="phone-app-profile"','<!-- APP: KHO ĐỒ -->');
 for(const id of ['profile-name','profile-title','profile-account-id','player-avatar-v1',
  'stat-personal-reading','stat-personal-npcs','stat-personal-items',
  'stat-personal-level','stat-personal-coins','stat-novels','stat-chapters','profile-guest-tip'])
  assert.ok(part.includes('id="'+id+'"'),id);
 assert.match(part,/class="dudu-v27-stats"/);
 assert.match(part,/<details class="dudu-v27-details dudu-v27-library">/);
 assert.match(part,/onclick="openAuthModal\(\)"/);
});
test('V32 chat restores gift button but NPC details remain in Nhân Vật',()=>{
 const part=block('id="phone-app-chat"','<!-- APP: CỬA HÀNG -->');
 assert.match(part,/id="chat-v27-more"/);
 assert.match(part,/class="dudu-v27-more-panel"/);
 assert.match(part,/onclick="clearCurrentChat\(\)"/);
 assert.match(part,/onclick="openGiftModalFromChat\(\)"/);
 assert.match(html,/onclick="openGiftModalForChar\('\$\{c\.id\}'\)"/);
 assert.match(html,/function npcCheckInFromCodexV31\(storyId,npcId\)/);
 assert.match(html,/confirm\("Xóa lịch sử trò chuyện VÀ các ký ức tương tác/);
 assert.match(part,/id="chat-character-selector"/);
 assert.match(part,/id="npc-portrait-v1"/);
 assert.match(part,/id="npc-v27-relation-details"/);
 assert.match(part,/id="npc-v27-relation-summary"/);
 assert.match(part,/id="npc-relationship-r4-values"/);
 assert.match(part,/id="npc-daily-checkin-btn"/);
 assert.match(part,/id="npc-relationship-r4-help"/);
});
test('V27 R2 character authors retain original permission-gated edit, archive and restore',()=>{
 const part=block('function renderCodexList()','function loadSampleCharactersToCurrentNovel()');
 assert.match(part,/class="dudu-v27-npc-admin admin-only"/);
 assert.match(part,/onclick="openEditCharacterModal\(\$\{idx\}\)"/);
 assert.match(part,/onclick="deleteCharacterFromCodex\(\$\{idx\}\)"/);
 assert.match(part,/onclick="restoreCharacterFromCodex\(\$\{idx\}\)"/);
 assert.match(part,/classList\.add\('dudu-npc-v12-actions'\)/);
 assert.doesNotMatch(part,/onclick="openEditCharacterModal\(\$\{idx\}\)">Sửa<\/button>/);
});
test('V27 R2 settings keep original actions, selected-state semantics and protected AI tools',()=>{
 const part=block('id="phone-app-settings"','class="phone-home-bar"');
 for(const size of [16,18,21]){
  assert.match(part,new RegExp('data-dudu-font-size="'+size+'"'));
  assert.match(part,new RegExp('setReadingFontSize\\('+size+'\\)'));
 }
 for(const theme of ['default','warm','oled']){
  assert.ok(part.includes('data-dudu-theme="'+theme+'"'));
  assert.ok(part.includes("setTheme('"+theme+"')"));
 }
 assert.match(part,/id="dudu-v27-tools"/);
 assert.match(part,/onclick="testGeminiAPIConnection\(\)"/);
 assert.match(part,/onclick="importLegacyChatsToCurrentStory\(\)"/);
 assert.match(part,/class="btn btn-primary admin-only"/);
 assert.match(html,/button\.setAttribute\('aria-pressed'/);
});
test('V27 R2 theme toggling keeps active Sandbox class and authorization states',()=>{
 const theme=block('function setTheme(theme) {','function escapeHtml(str) {');
 assert.doesNotMatch(theme,/document\.body\.className\s*=/);
 assert.match(theme,/document\.body\.classList\.remove\('theme-warm','theme-oled'\)/);
 assert.match(theme,/applyUserRole\(\)/);
 assert.match(theme,/syncPhoneDisplayOptionsV27\(\)/);
});
test('V27 R2 stylesheet is strictly Sandbox-scoped, mobile-responsive and keyboard-friendly',()=>{
 assert.match(html,/href="css\/phone-ux-v27-r2\.css"/);
 assert.ok(css.trim().startsWith('/* DUDU V27 R2'));
 assert.doesNotMatch(css,/(?:^|\n)\s*#cyber-phone\s*\{/);
 assert.match(css,/body\.dudu-phone-v11 #cyber-phone/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/summary:focus-visible/);
 assert.match(css,/aria-pressed="true"/);
});
