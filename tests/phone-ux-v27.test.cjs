const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/npc-portrait-viewer-v15.css'),'utf8');
const avatar=fs.readFileSync(path.resolve(__dirname,'../js/player-avatar-ui-v16.js'),'utf8');

test('V27 phone Liên Lạc portrait is native button, same image viewer, no duplicate Xem ảnh button',()=>{
  const match=html.match(/<button[^>]*id="npc-portrait-v1"[\s\S]*?<\/button>/);
  assert.ok(match,'NPC chat portrait must be a native button');
  assert.match(match[0],/aria-haspopup="dialog"/);
  assert.match(match[0],/onclick="openChatNpcPortraitViewer\(\)"/);
  assert.doesNotMatch(html,/id="npc-v15-chat-view"/);
  assert.doesNotMatch(html,/>Xem ảnh<\/button>/);
  assert.match(html,/return openNpcPortraitViewer\(npc,storyId,document.getElementById\('npc-portrait-v1'\)\)/);
});
test('V27 Codex card portrait has single action, preserves unlock and author-only access',()=>{
  assert.match(html,/class="dudu-npc-v12-portrait" data-npc-portrait="1"/);
  assert.match(html,/aria-haspopup="dialog" aria-label="Xem chân dung/);
  assert.doesNotMatch(html,/npc-v15-view-button|>✦ Xem chân dung<\/button>/);
  assert.match(html,/preview.disabled=!canViewPortrait/);
  assert.match(html,/const canViewPortrait=canEditStories\(\)\|\|unlocked/);
  assert.match(html,/openNpcPortraitViewer\(c,novel.id,preview\)/);
  assert.match(html,/if\(!IS_SANDBOX_MODE\|\|!npc\|\|!storyId\)return false/);
  assert.match(html,/\(!canEditStories\(\)&&!isNpcUnlocked\(storyId,npc.id\)\)/);
});
test('V27 disabled portraits and keyboard focus are visible and accessible',()=>{
  assert.match(html,/portrait.disabled=!canViewPortrait/);
  assert.match(html,/portrait.classList.toggle\('is-locked',!canViewPortrait\)/);
  assert.match(css,/\.dudu-npc-v27-chat-portrait:focus-visible/);
  assert.match(css,/\.dudu-npc-v12-portrait:focus-visible/);
  assert.match(css,/\.dudu-npc-v27-chat-portrait:disabled/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test('V27 single tap avatar in profile: redundant edit button removed; account data not mutated',()=>{
  assert.match(html,/id="player-avatar-v1"[^>]*onclick="openPlayerAvatarEditorV16\(\)"/);
  assert.doesNotMatch(html,/id="player-avatar-edit-v16"/);
  assert.doesNotMatch(avatar,/player-avatar-edit-v16/);
  assert.match(html,/id="player-avatar-v16-modal"/);
});
