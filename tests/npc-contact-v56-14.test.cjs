const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/chat-contact-v56-14.css'),'utf8');
const contact=html.split('id="phone-app-chat"')[1]?.split('id="chat-messages-container"')[0]||'';
const switchFn=html.split('function switchChatCharacter() {')[1]?.split('function renderChatMessages(')[0]||'';
const preview=html.split('function renderNpcPortraitPreview(')[1]?.split('let npcPortraitViewerReturnFocus')[0]||'';
test('V56.14 real messenger displays exactly one NPC portrait and contact name in header',()=>{
 assert.equal((contact.match(/id="npc-portrait-v1"/g)||[]).length,1);
 assert.match(contact,/<strong id="dudu-v5614-npc-name"/);
 assert.match(contact,/<span id="dudu-v5614-inbox-title">Liên Lạc<\/span>/);
 const header=contact.split('</div>')[0];
 assert.match(header,/id="npc-portrait-v1"/);
 assert.match(header,/id="dudu-v5614-npc-name"/);
 assert.match(switchFn,/portrait\.style\.display=char\?'flex':'none'/);
 assert.doesNotMatch(switchFn,/portrait\.style\.display=IS_SANDBOX_MODE&&char/);
 assert.match(switchFn,/contactName\.textContent=char\?\.name/);
});
test('V56.14 live NPC preview requires unlock; uses original portrait assets',()=>{
 assert.match(preview,/isNpcUnlocked\(storyId,npc\.id\)/);
 assert.doesNotMatch(preview,/if\(!IS_SANDBOX_MODE/);
 assert.match(preview,/DuduNpcPortraitLibrary\.sourceFor/);
 assert.match(preview,/DuduNpcPremiumV40\?\.paint/);
 assert.match(preview,/portraitUploadId/);
 assert.match(css,/#npc-portrait-v1 img/);
});
test('V56.14 self identity A/B/C is hidden behind a menu, not replacing NPC in chat header',()=>{
 assert.match(contact,/id="dudu-v5614-self-menu"/);
 const indexSelf=contact.indexOf('id="dudu-v5614-self-menu"');
 const indexRole=contact.indexOf('id="dudu-v56-role-box"');
 assert.ok(indexSelf>=0&&indexRole>indexSelf);
 assert.match(contact,/<summary[^>]*>Tôi<\/summary>/);
 assert.match(contact,/id="dudu-v56-role-select"/);
 assert.match(contact,/id="dudu-v56-role-avatar"/);
 assert.match(contact,/id="dudu-v56-role-editor"/);
 assert.match(contact,/v56OpenRoleEditor\(false\)/);
 assert.match(contact,/v56OpenRoleEditor\(true\)/);
 assert.match(css,/#dudu-v5614-self-menu:not\(\[open\]\)>#dudu-v56-role-box/);
 assert.match(html,/if\(selfMenu\)selfMenu\.open=true/);
});
test('V56.14 messaging view does not show duplicate name/persona blocks',()=>{
 assert.match(css,/\.dudu-v27-chat-persona\{\s*display:none!important;/);
 assert.match(css,/dudu-v33-inbox #npc-portrait-v1/);
 assert.match(css,/dudu-v33-chat-open #dudu-v5614-npc-name/);
 assert.match(css,/#chat-messages-container/);
 assert.match(html,/css\/chat-contact-v56-14\.css\?v=56-14/);
 assert.match(html,/id="dudu-v5612-ai-settings"/);
 assert.match(html,/id="dudu-v33-chat-back"/u.test(html)?/id="phone-app-chat"/:/id="phone-app-chat"/);
});
test('V56.14 role switches still use original save/role-scoped logic',()=>{
 const select=html.split('function v56SelectRole(){')[1]?.split('function v56ImportLegacyChat(')[0]||'';
 assert.match(select,/DuduRoleplayV56\.select\(state,select\.value\)/);
 assert.match(select,/v56Commit\(next\)/);
 assert.match(select,/switchChatCharacter\(\)/);
 assert.match(select,/if\(selfMenu\)selfMenu\.open=false/);
});
