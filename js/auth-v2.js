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
  let loginPending = false;

  function status(message) {
    const el = document.getElementById('auth-status-message');
    if (el) el.textContent = message || '';
  }
  function readableAuthError(error) {
    switch (error?.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-login-credentials':
        return 'Email hoặc mật khẩu chưa đúng. Nếu bạn vừa tạo tài khoản bằng Email/Mật khẩu, hãy dùng mật khẩu Firebase đã đặt.';
      case 'auth/network-request-failed':
        return 'Không kết nối được máy chủ đăng nhập. Vui lòng kiểm tra mạng và thử lại.';
      case 'auth/too-many-requests':
        return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi đăng nhập lại.';
      case 'auth/operation-not-allowed':
        return 'Phương thức đăng nhập này chưa được bật trong Firebase Console.';
      case 'auth/unauthorized-domain':
        return 'Tên miền này chưa được cho phép đăng nhập trong Firebase Authentication.';
      default:
        return 'Không thể đăng nhập: ' + (error?.code || 'Vui lòng kiểm tra cấu hình Firebase.');
    }
  }
  function fail(error) {
    console.warn('Firebase auth:', error);
    status(readableAuthError(error));
  }
  function setLoginBusy(pending) {
    loginPending = pending;
    ['auth-email-login-btn', 'auth-email-register-btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = pending;
    });
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
      if (btn) btn.textContent = '👤 Khách · Đăng nhập';
      const prof = document.getElementById('profile-account-id');
      if (prof) prof.textContent = 'Khách (không đồng bộ)';
      // Public stories are readable without forcing an authentication dialog.
      // Account button, private save and AI actions still require Firebase login.
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
    if (!client) {
      status('Firebase Authentication chưa khởi tạo. Hãy tải lại trang và thử lại.');
      return;
    }
    if (loginPending) return;
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const address = emailInput.value.trim();
    const password = passwordInput.value;
    // Private browsing usually has no saved credentials/autofill.
    if (!address) {
      status('Bạn chưa nhập email. Trong cửa sổ ẩn danh, Chrome thường không tự điền tài khoản.');
      emailInput.focus();
      return;
    }
    if (!password) {
      status('Bạn chưa nhập mật khẩu Firebase. Đây là mật khẩu bạn đã tự đặt khi tạo người dùng.');
      passwordInput.focus();
      return;
    }
    if (password.length < 6) {
      status('Mật khẩu phải có ít nhất 6 ký tự.');
      passwordInput.focus();
      return;
    }
    setLoginBusy(true);
    status(register ? 'Đang tạo tài khoản Firebase…' : 'Đang xác thực email và mật khẩu…');
    try {
      if (register) await client.createUserWithEmailAndPassword(address, password);
      else await client.signInWithEmailAndPassword(address, password);
      // onAuthStateChanged loads the profile; completion of signIn alone
      // does not prove that the profile is synced with Firestore.
      status('Đã xác thực. Đang tải hồ sơ người chơi…');
      passwordInput.value = '';
    } catch (error) {
      fail(error);
    } finally {
      setLoginBusy(false);
    }
  }
  async function signout() {
    if (!client) return;
    try { await client.signOut(); } catch (error) { fail(error); }
  }
  function showStatus() {
    showControls();
    const account = client?.currentUser;
    status(account
      ? 'Đang đăng nhập: ' + (account.email || account.displayName || 'Firebase')
      : 'Nhập email và mật khẩu Firebase bạn đã tạo. Chế độ ẩn danh thường không tự điền mật khẩu.');
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
