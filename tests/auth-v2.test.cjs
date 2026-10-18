// node --test tests/auth-v2.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '../js/auth-v2.js'), 'utf8');

function harness(options = {}) {
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
    setTimeout: options.setTimeout || setTimeout, clearTimeout,
    firebase: {
      auth: authFactory,
      firestore: () => ({ collection: () => ({ doc: uid => ({
        get: async () => options.profileGet ? options.profileGet(record,uid) : ({ exists: !!record, data: () => record })
      }) }) })
    },
    document: {
      createElement: () => ({style:{},addEventListener(){}}),
      getElementById: id => (elements[id] ||= {
        style: {}, textContent: '', value: '', disabled: false, focused: false,
        focus() { this.focused = true; }, insertAdjacentElement() {}
      })
    },
    localStorage: { getItem: key => options.storage?.get(key) ?? null },
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

test('private browsing: missing email and password show immediate, focused feedback', async () => {
  const h = harness();
  let calls = 0;
  h.account.signInWithEmailAndPassword = async () => { calls++; };
  await h.context.DuduAuth.email(false);
  assert.match(h.elements['auth-status-message'].textContent, /chưa nhập email/i);
  assert.equal(h.elements['auth-email'].focused, true);
  assert.equal(calls, 0);
  h.context.document.getElementById('auth-email').value = 'reader@example.test';
  await h.context.DuduAuth.email(false);
  assert.match(h.elements['auth-status-message'].textContent, /chưa nhập mật khẩu/i);
  assert.equal(h.elements['auth-password'].focused, true);
  assert.equal(calls, 0);
});

test('private browsing: explicit email credentials authenticate without prior saved session', async () => {
  const h = harness();
  const entries = [];
  h.account.signInWithEmailAndPassword = async (email, password) => {
    entries.push({ email, password, disabled: h.elements['auth-email-login-btn'].disabled });
    return {};
  };
  h.context.document.getElementById('auth-email').value = '  reader@example.test  ';
  h.context.document.getElementById('auth-password').value = 'six-char-password';
  await h.context.DuduAuth.email(false);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].email, 'reader@example.test');
  assert.equal(entries[0].password, 'six-char-password');
  assert.equal(entries[0].disabled, true);
  assert.match(h.elements['auth-status-message'].textContent, /Đã xác thực/i);
  assert.equal(h.elements['auth-email-login-btn'].disabled, false);
  assert.equal(h.elements['auth-password'].value, '');
});

test('private browsing: Firebase invalid credentials show an actionable message', async () => {
  const h = harness();
  h.account.signInWithEmailAndPassword = async () => {
    throw { code: 'auth/invalid-credential' };
  };
  h.context.document.getElementById('auth-email').value = 'reader@example.test';
  h.context.document.getElementById('auth-password').value = 'wrong-password';
  await h.context.DuduAuth.email(false);
  assert.match(h.elements['auth-status-message'].textContent, /Email hoặc mật khẩu chưa đúng/);
  assert.equal(h.elements['auth-email-login-btn'].disabled, false);
});

test('successful Google identity appears before slow Firestore read and is never shown as Guest', async () => {
  let resolveProfile;
  const pending = new Promise(resolve => { resolveProfile = resolve; });
  const h = harness({ profileGet: () => pending });
  const login = h.login('google-uid', {}, null);
  // Promise.all pauses on Firestore; authenticated account label must already be visible.
  await Promise.resolve();
  assert.match(h.elements['account-status-btn'].textContent, /google-uid.*Đang tải/);
  assert.match(h.elements['profile-account-id'].textContent, /Firebase UID/);
  assert.equal(h.context.DuduAuth.isReady(), false);
  resolveProfile({ exists: false });
  await login;
  assert.equal(h.context.DuduAuth.isReady(), true);
  assert.doesNotMatch(h.elements['account-status-btn'].textContent, /Khách|Lỗi hồ sơ/);
  assert.equal(h.elements['auth-status-message'].textContent.includes('Không thể'), false);
});

test('Firestore permission denied keeps Firebase identity, reports failure, and refuses author rights', async () => {
  const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
  const h = harness({ profileGet: async () => { throw denied; } });
  await h.login('owner-google', { admin: true }, null);
  assert.equal(h.context.DuduAuth.isReady(), false);
  assert.equal(h.context.DuduAuth.isAdmin(), false);
  assert.equal(h.context.currentUsername, 'owner-google');
  assert.match(h.elements['account-status-btn'].textContent, /owner-google.*Lỗi hồ sơ/);
  assert.match(h.elements['auth-status-message'].textContent, /Firestore từ chối/i);
  assert.equal(h.elements['auth-retry-profile-btn'].style.display, 'block');
});

test('a never-resolving profile cannot leave authenticated user displayed as Guest indefinitely', async () => {
  const h = harness({
    profileGet: () => new Promise(() => {}),
    setTimeout: (fn) => setTimeout(fn, 8)
  });
  await h.login('uid-stall', {}, null);
  assert.equal(h.context.currentUsername, 'uid-stall');
  assert.equal(h.context.DuduAuth.isReady(), false);
  assert.match(h.elements['account-status-btn'].textContent, /Lỗi hồ sơ/);
  assert.match(h.elements['auth-status-message'].textContent, /Quá thời gian/);
});

test('V56.5 missing Firestore profiles restore only each owner\'s legacy V55 local backup', async () => {
  const storage = new Map([
    ['profile_reader-a', JSON.stringify({username:'reader-a',name:'A Backup',currency:120})],
    ['profile_reader-b', JSON.stringify({username:'reader-b',name:'B Backup',currency:65})]
  ]);
  const h = harness({ storage });
  await h.login('reader-a', {}, null);
  assert.equal(h.context.userProfile.name, 'reader-a', 'Google display name remains authoritative');
  assert.equal(h.context.userProfile.currency, 120);
  await h.login('reader-b', {}, null);
  assert.equal(h.context.currentUsername,'reader-b');
  assert.equal(h.context.userProfile.currency,65);
  assert.equal(h.context.DuduAuth.isReady(),true);
  assert.equal(h.context.chatHistories.old,undefined);
});

test('V56.5 rejected backup from another UID cannot replace the current profile', async () => {
  const storage = new Map([
    ['profile_reader-b', JSON.stringify({username:'reader-a',currency:999999})]
  ]);
  const h = harness({ storage });
  await h.login('reader-b', {}, null);
  assert.equal(h.context.currentUsername,'reader-b');
  assert.notEqual(h.context.userProfile.currency,999999,
    'Rejected other-user backup must not inject private balances');
  assert.equal(h.context.DuduAuth.isReady(),true);
});

test('V56.5 delayed Firebase profile response from account A cannot override account B', async () => {
  let releaseA;
  const pendingA = new Promise(resolve => { releaseA=resolve; });
  const h = harness({profileGet:(_record,uid)=>uid==='reader-a'
    ? pendingA : Promise.resolve({exists:true,data:()=>({name:'B Name',currency:5})})});
  const loginA = h.login('reader-a', {}, null);
  await Promise.resolve();
  await h.login('reader-b', {}, null);
  releaseA({exists:true,data:()=>({name:'Old A',currency:900})});
  await loginA;
  assert.equal(h.context.currentUsername,'reader-b');
  assert.equal(h.context.userProfile.name,'B Name');
  assert.equal(h.context.userProfile.currency,5);
  assert.equal(h.context.DuduAuth.isReady(),true);
});

test('V56.5 two-account login errors explain credentials without auto-linking accounts', () => {
  const h=harness();
  h.context.DuduAuth.showStatus();
  // Guard the wording in code; never convert an auth collision into a merge.
  assert.match(src,/auth\/account-exists-with-different-credential/);
  assert.match(src,/không tự gộp tài khoản/);
  assert.match(src,/auth\/email-already-in-use/);
  assert.equal(typeof h.context.DuduAuth.google,'function');
});
