/* DUDU Auth v2 — review-only branch. Firestore Rules must be deployed separately.
 * Does not claim that a client-side admin toggle is authorization.
 */
(function () {
  'use strict';
  let client = null;
  let ready = false;
  let admin = false;
  let generation = 0;
  let defaultProfile = null;

  function status(message) {
    const el = document.getElementById('auth-status-message');
    if (el) el.textContent = message || '';
  }
  function fail(error) {
    console.warn('Firebase auth:', error);
    status('Lỗi đăng nhập: ' + (error.code || 'Vui lòng kiểm tra Firebase Authentication.'));
  }
  function showControls() {
    document.getElementById('auth-sandbox-controls').style.display = IS_SANDBOX_MODE ? 'block' : 'none';
    document.getElementById('auth-secure-controls').style.display = IS_SANDBOX_MODE ? 'none' : 'block';
  }
  function resetSession() {
    ready = false;
    admin = false;
    currentUsername = '';
    userProfile = JSON.parse(defaultProfile);
    chatHistories = {};
    activeChatNovelId = null;
  }
  async function applySession(account) {
    const ticket = ++generation;
    resetSession();
    if (!account) {
      applyUserRole();
      renderHome();
      updatePhoneUI();
      const btn = document.getElementById('account-status-btn');
      if (btn) btn.textContent = '👤 Đăng nhập';
      openAuthModal();
      return;
    }

    try {
      const [token, snapshot] = await Promise.all([
        account.getIdTokenResult(),
        firebase.firestore().collection('profiles_v2').doc(account.uid).get()
      ]);
      if (ticket !== generation || client.currentUser?.uid !== account.uid) return;

      currentUsername = account.uid; // Never use an editable display name as the account key.
      const cloudData = snapshot.exists ? snapshot.data() : null;
      if (cloudData) userProfile = { ...JSON.parse(defaultProfile), ...cloudData };
      else {
        const backup = localStorage.getItem(scopedLocalKey('profile'));
        if (backup) {
          try { userProfile = { ...JSON.parse(defaultProfile), ...JSON.parse(backup) }; }
          catch (err) { console.warn('Local profile backup unreadable', err); }
        }
      }
      userProfile.username = account.uid;
      userProfile.name = cloudData?.name || account.displayName || account.email || 'Độc giả';
      admin = token.claims.admin === true;
      userProfile.role = admin ? 'admin' : 'reader'; // The cached profile never grants admin.
      userProfile.storyStates ||= {};
      userProfile.collectedCharacters ||= {};
      loadScopedInteractionState();
      ready = true;

      const btn = document.getElementById('account-status-btn');
      if (btn) btn.textContent = '👤 ' + (account.displayName || account.email || 'Độc giả');
      const prof = document.getElementById('profile-account-id');
      if (prof) prof.textContent = 'Firebase UID: ' + account.uid.slice(0, 8) + '…';
      closeModals();
      applyUserRole();
      renderHome();
      updatePhoneUI();
      updateActiveModelInfo();
    } catch (error) {
      if (ticket !== generation) return;
      admin = false;
      ready = false;
      userProfile.role = 'reader';
      applyUserRole();
      renderHome();
      openAuthModal();
      fail(error);
    }
  }
  function init() {
    if (IS_SANDBOX_MODE || client) return;
    defaultProfile = JSON.stringify(userProfile);
    client = firebase.auth();
    showControls();
    client.onAuthStateChanged(applySession, fail);
  }
  async function google() {
    if (!client) return;
    try {
      await client.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        try { await client.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); }
        catch (redirectError) { fail(redirectError); }
      } else if (error.code !== 'auth/popup-closed-by-user') fail(error);
    }
  }
  async function email(register) {
    if (!client) return;
    const address = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!address || password.length < 6) {
      status('Hãy nhập email và mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    try {
      if (register) await client.createUserWithEmailAndPassword(address, password);
      else await client.signInWithEmailAndPassword(address, password);
      document.getElementById('auth-password').value = '';
    } catch (error) { fail(error); }
  }
  async function signout() {
    if (!client) return;
    try { await client.signOut(); } catch (error) { fail(error); }
  }
  function showStatus() {
    showControls();
    const account = client?.currentUser;
    status(account ? 'Đang đăng nhập: ' + (account.email || account.displayName || 'Firebase') : 'Đăng nhập để lưu tiến trình độc lập.');
  }
  function canAuthor() {
    return !!client?.currentUser && ready && admin;
  }
  window.DuduAuth = {
    init, google, email, signout, showStatus,
    isReady: () => ready && !!client?.currentUser,
    isAdmin: canAuthor,
    uid: () => client?.currentUser?.uid || null
  };
})();
