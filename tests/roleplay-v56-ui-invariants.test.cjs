const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const role=require('../js/roleplay-identity-v56.js');

test('V56.5 production affinity comes from active role and not V55 shared unlock state',()=>{
 const switchFn=html.split('function switchChatCharacter() {')[1]?.split('function renderChatMessages(')[0];
 assert.ok(switchFn);
 assert.match(switchFn,/const activeRole=v56CurrentRole\(storyId\)/);
 assert.match(switchFn,/DuduRoleplayV56\.relationship\(/);
 assert.match(switchFn,/v56State\(storyId\),activeRole\.id,charId/);
 assert.match(switchFn,/if\(!IS_SANDBOX_MODE\)/);
 assert.match(switchFn,/Thiện cảm nhập vai/);
});

test('V56.5 gift response is scoped by role and never indexed under null',()=>{
 const gift=html.split("if (document.getElementById('phone-app-chat').style.display === 'flex'&&")[1]?.split('function npcClearAnimeVisual()')[0];
 assert.ok(gift);
 assert.match(gift,/activeChatNovelId===giftStory/);
 const rolePos=gift.indexOf('const giftRole=v56CurrentRole(giftStory)');
 const guardPos=gift.indexOf('if(!giftRole||!giftChatKey)return;');
 const writePos=gift.indexOf('chatHistories[giftChatKey].push');
 assert.ok(rolePos>=0&&guardPos>rolePos&&writePos>guardPos);
 assert.doesNotMatch(gift,/chatHistories\[chatKey\(char\.id\)\]/);
 assert.match(gift,/saveChatHistories\(\);/);
 assert.match(gift,/v56CurrentRole\(giftStory\)\?\.id!==giftRole\.id/);
 assert.match(gift,/res\?\.text/);
});

test('V56 never reuses V55 chat keys and retains role-specific memory IDs',()=>{
 assert.notEqual(role.chatKey('story','role1','npc'),role.legacyChatKey('story','npc'));
 assert.notEqual(role.chatKey('story','role1','npc'),role.chatKey('story','role2','npc'));
 assert.notEqual(role.memoryNpcId('role1','npc'),role.memoryNpcId('role2','npc'));
 assert.match(html,/v56ImportLegacyChat/);
});
