const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const src=fs.readFileSync(path.resolve(__dirname,'../js/personal-npc-social-v1.js'),'utf8');

test('real account loads NPC owner-transaction adapter after relationship engines',()=>{
 const relationship=html.indexOf('src="js/npc-relationship-v2-r1.js"');
 const bond=html.indexOf('src="js/npc-bond-v43.js?');
 const bridge=html.indexOf('src="js/personal-npc-social-v1.js?');
 assert.ok(relationship>=0&&bond>relationship&&bridge>bond);
 assert.match(src,/profiles_v2/);
 assert.match(src,/runTransaction/);
 assert.match(src,/tx\.set\(ref,\{storyStates:/);
 assert.doesNotMatch(src,/currency\s*:|inventory\s*:|exp\s*:|quests\s*:/);
});
test('real Codex NPC actions are no longer sandbox-only; save only committed fields',()=>{
 assert.match(html,/void personalNpcActionV1\('favorite',storyId,npcId\)/);
 assert.match(html,/void personalNpcActionV1\('checkin',storyId,npcId,choiceId\)/);
 assert.match(html,/DuduAuth\.uid\(\)===currentUsername/);
 assert.match(html,/button\.addEventListener\('click',\(\)=>v43ChooseFavoriteNpc/);
 assert.match(html,/actionBar&&unlocked&&!c\.archived&&/);
 const handler=html.slice(html.indexOf('async function personalNpcActionV1('),
  html.indexOf('// V43.4: confirmed interactions only;',html.indexOf('async function personalNpcActionV1(')));
 assert.ok(handler.includes('DuduPersonalNpcSocialV1.run'));
 assert.ok(handler.includes("localStorage.setItem('profile_'+uid"));
 assert.ok(!handler.includes('saveCurrentAccount()'),'Do not issue a stale full-profile cloud write');
});
test('NPC portrait viewer remains read-only and requires unlock or author permission',()=>{
 const viewer=html.slice(html.indexOf('function openNpcPortraitViewer('),
  html.indexOf('function closeNpcPortraitViewer()'));
 assert.match(viewer,/!isNpcUnlocked\(storyId,npc\.id\)/);
 assert.match(viewer,/DuduAuth\.uid\(\)!==currentUsername/);
 assert.match(html,/function openChatNpcPortraitViewer\(\)/);
});
