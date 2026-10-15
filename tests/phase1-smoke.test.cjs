// Run: node --test tests/phase1-smoke.test.cjs
// No dependencies or production Firebase credentials required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = (html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i) || [])[1];
assert.ok(script, 'Main inline JS is present');

function segment(from, until) {
  const start = script.indexOf(from);
  const end = script.indexOf(until, start);
  assert.ok(start >= 0 && end > start, 'Required function boundaries exist');
  return script.slice(start, end);
}

test('inline JavaScript parses', () => {
  assert.doesNotThrow(() => new vm.Script(script));
});

test('account, story and sandbox keys do not overlap', () => {
  const helpers = segment('function scopedLocalKey(', 'function loadScopedInteractionState()');
  const context = {
    IS_SANDBOX_MODE: false,
    currentUsername: 'alice',
    selectedNovelIndex: 0,
    activeChatNovelId: 'story-a',
    novels: [{ id: 'story-a' }],
    encodeURIComponent
  };
  const api = vm.runInNewContext(helpers + '\n({ scopedLocalKey, chatKey })', context);
  const aliceKey = api.scopedLocalKey('bookmark', 'story-a');
  assert.notEqual(aliceKey, api.scopedLocalKey('bookmark', 'story-b'));
  assert.equal(api.chatKey('same-npc'), 'story-a::same-npc');
  context.currentUsername = 'bob';
  assert.notEqual(aliceKey, api.scopedLocalKey('bookmark', 'story-a'));
  context.IS_SANDBOX_MODE = true;
  assert.match(api.scopedLocalKey('bookmark', 'story-a'), /^dudu-sandbox-v2:/);
});

test('legacy NPC unlocks are migrated only to an unambiguous story', () => {
  const helpers = segment('function getStoryProgress(', 'function isNpcUnlocked(');
  const context = {
    userProfile: {
      storyStates: {},
      collectedCharacters: {
        unique: { id: 'unique', novelTitle: 'Story A', affinity: 55 },
        shared: { id: 'shared', affinity: 99 }
      }
    },
    novels: [
      { id: 'a', title: 'Story A', characters: [{ id: 'unique' }, { id: 'shared' }] },
      { id: 'b', title: 'Story B', characters: [{ id: 'shared' }] }
    ]
  };
  const api = vm.runInNewContext(helpers + '\n({ getStoryProgress })', context);
  assert.equal(api.getStoryProgress('a').collectedCharacters.unique.affinity, 55);
  assert.equal(api.getStoryProgress('a').collectedCharacters.shared, undefined);
  assert.equal(api.getStoryProgress('b').collectedCharacters.shared, undefined);
});

test('admin creation does not grant chat access; chapter picker supports creating NPC', () => {
  const saveNpc = segment('function saveCharacterModal()', 'function deleteCharacterFromCodex(');
  assert.doesNotMatch(saveNpc, /userProfile\.collectedCharacters\[charId\]\s*=/);
  assert.match(html, /onclick="openAddCharacterModal\(true\)"/);
  assert.match(html, /renderChapterNpcPicker\(\[\.\.\.pendingChapterNpcSelection, charId\]\)/);
  assert.match(script, /function connectSoulAndChat\([\s\S]*?isNpcUnlocked\(storyId, charId\)/);
  assert.match(script, /function sendChatMessage\([\s\S]*?isNpcUnlocked\(storyId, charId\)/);
});

test('sandbox disables cloud reads, writes and live listeners', () => {
  assert.match(script, /if \(!IS_SANDBOX_MODE\) db\.collection\("user_profiles"\)/);
  assert.match(script, /if \(!IS_SANDBOX_MODE\) docRef\.onSnapshot/);
  assert.match(script, /if \(IS_SANDBOX_MODE\) \{ updatePhoneUI\(\); return; \}/);
  assert.match(script, /if \(IS_SANDBOX_MODE\) \{[\s\S]*?indicator\.textContent = '🧪 Sandbox';[\s\S]*?return;/);
});
