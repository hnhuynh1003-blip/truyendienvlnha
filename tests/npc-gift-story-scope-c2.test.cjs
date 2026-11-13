const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');

test('Codex gift carries its explicitly selected story and verifies NPC unlock',()=>{
 const codex=html.slice(html.indexOf('function renderCodexList()'),
  html.indexOf('function loadSampleCharactersToCurrentNovel()'));
 const gift=html.slice(html.indexOf('function openGiftModalForChar('),
  html.indexOf('async function executeGiftItem('));
 assert.match(codex,/openGiftModalForChar\(c\.id,novel\.id\)/);
 assert.match(codex,/data-dudu-gift-open="1"/);
 assert.match(gift,/novels\.find\(n=>n\.id===storyId\)/);
 assert.match(gift,/isNpcUnlocked\(storyId,c\.id\)/);
 assert.match(gift,/executeGiftItem\(char\.id,idx,storyId\)/);
 assert.match(gift,/openGiftModalForChar\(charId,storyId\)/);
});
test('gift execution uses its explicit story, not whichever chat was selected',()=>{
 const code=html.slice(html.indexOf('async function executeGiftItem('),
  html.indexOf('function npcClearAnimeVisual()'));
 assert.match(code,/const giftStory = giftStoryId\|\|activeChatNovelId/);
 assert.match(code,/novels\.find\(n=>n\.id===giftStory\)/);
 assert.match(code,/isNpcUnlocked\(giftStory, char\.id\)/);
 assert.match(code,/commitPersonalNpcExchangeV1\('gift',giftStory,char\.id/);
 assert.match(code,/activeChatNovelId===giftStory/);
 assert.doesNotMatch(code,/getCombinedCharactersList\(\)/);
});
