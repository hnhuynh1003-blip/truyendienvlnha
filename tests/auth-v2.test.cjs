// node --test tests/auth-v2.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '../js/auth-v2.js'), 'utf8');

function harness() {
  let onChange, record;
  const account = {
    currentUser: null,
    onAuthStateChanged(cb) { onChange = cb; },
    signOut: async function() { this.currentUser = null; await onChange(null); }
  };
  const authFactory = Object.assign(() => account, { GoogleAuthProvider: class {} });
  const elements = {};
  const logs = [];
  const context = {
    IS_SANDBOX_MODE: false,
    firebase: {
      auth: authFactory,
      firestore: () => ({ collection: () => ({ doc: uid => ({
        get: async () => ({ exists: !!record, data: () => record })
      }) }) })
    },
    document: { getElementById: id => (elements[id] ||= { style: {}, textContent: '', value: '' }) },
    localStorage: { getItem: () => null },
    currentUsername: 'legacy-user',
    userProfile: { username: 'guest', role: 'reader', name: 'Guest', storyStates: {}, collectedCharacters: {} },
    chatHistories: { old: [] },
    activeChatNovelId: 'previous',
    scopedLocalKey: k => k,
    loadScopedInteractionState: () => {},
    applyUserRole: () => logs.push('apply'),
    renderHome: () => logs.push('home'),
    updatePhoneUI: () => {},
    updateActiveModelInfo: () => {},
    openAuthModal: () => {},
    closeModals: () => {},
    console, JSON
  };
  context.window = context;
  vm.runInNewContext(src, context);
  context.DuduAuth.init();
  return {
    context, account, elements,
    login: async (uid, claims, profile = null) => {
      record = profile;
      const user = {
        uid, email: uid + '@example.test', displayName: uid,
        getIdTokenResult: async () => ({ claims })
      };
      account.currentUser = user;
      await onChange(user);
    },
    logout: async () => { await account.signOut(); }
  };
}

test('a profile-supplied admin role cannot grant author access', async () => {
  const h = harness();
  await h.login('reader-1', {}, { role: 'admin', name: 'Reader', currency: 1 });
  assert.equal(h.context.currentUsername, 'reader-1');
  assert.equal(h.context.userProfile.role, 'reader');
  assert.equal(h.context.DuduAuth.isAdmin(), false);
  assert.equal(h.context.DuduAuth.isReady(), true);
});

test('admin requires an authenticated verified custom claim', async () => {
  const h = harness();
  await h.login('author-1', { admin: true }, { role: 'reader', name: 'Author' });
  assert.equal(h.context.DuduAuth.isAdmin(), true);
  assert.equal(h.context.userProfile.role, 'admin');
  await h.logout();
  assert.equal(h.context.DuduAuth.isAdmin(), false);
  assert.equal(h.context.DuduAuth.isReady(), false);
  assert.equal(h.context.currentUsername, '');
});

test('switching accounts resets chat state instead of reusing a previous profile', async () => {
  const h = harness();
  await h.login('reader-a', {}, { name: 'A', storyStates: { one: {} } });
  h.context.chatHistories = { 'one::npc': [{ text: 'private message' }] };
  await h.login('reader-b', {}, { name: 'B', storyStates: {} });
  assert.equal(h.context.userProfile.name, 'B');
  assert.equal(h.context.chatHistories['one::npc'], undefined);
  assert.equal(h.context.currentUsername, 'reader-b');
});
