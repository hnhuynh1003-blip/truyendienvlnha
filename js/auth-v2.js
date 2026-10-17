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
  function showRetry(show) {
    const el = document.getElementById('auth-retry-profile-btn');
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function readableProfileError(error) {
    if (error?.code === 'permission-denied') {
      return 'Firestore từ chối đọc profiles_v2 của tài khoản. Cần kiểm tra Rules đang triển khai; không sửa quyền hay xóa dữ liệu.';
    }
    if (error?.code === 'profile/timeout') {
      return error?.stage === 'Firebase token'
        ? 'Quá thời gian xác minh token Firebase (15 giây). Bạn vẫn đăng nhập Google; thử tải lại hồ sơ.'
        : 'Quá thời gian đọc hồ sơ Firestore (15 giây). Bạn vẫn đăng nhập Google; thử tải lại hồ sơ.';
    }
    if (error?.code === 'unavailable' || error?.code === 'auth/network-request-failed') {
      return 'Firestore hoặc Firebase Auth hiện không khả dụng. Kiểm tra mạng rồi thử tải lại hồ sơ.';
    }
    return 'Không thể tải hồ sơ: ' + (error?.code || error?.message || 'lỗi chưa xác định') + '.';
  }
  function withTimeout(promise, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(label + ' timed out');
        error.code = 'profile/timeout';
        error.stage = label;
        reject(error);
      }, 15000);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
  function refreshSessionUI() {
    // A phone/widget render error must never invalidate Firebase authentication.
    for (const fn of [applyUserRole, renderHome, updatePhoneUI, updateActiveModelInfo]) {
      try { fn(); } catch (error) { console.warn('DUDU session UI:', error); }
    }
  }
  let profileError = '';
  async function applySession(account) {
    const ticket = ++generation;
    resetSession();
    profileError = '';
    showRetry(false);
    if (!account) {
      const btn = document.getElementById('account-status-btn');
      if (btn) btn.textContent = '👤 Khách · Đăng nhập';
      const prof = document.getElementById('profile-account-id');
      if (prof) prof.textContent = 'Khách (không đồng bộ)';
      refreshSessionUI();
      return;
    }

    // Firebase authentication is already confirmed at this point.
    // Display the authenticated identity immediately, instead of showing Guest
    // while waiting for a slow/blocked Firestore profile read.
    currentUsername = account.uid;
    userProfile.username = account.uid;
    userProfile.name = account.displayName || account.email || 'Độc giả';
    userProfile.role = 'reader';
    const label = account.displayName || account.email || 'Độc giả';
    const btn = document.getElementById('account-status-btn');
    const prof = document.getElementById('profile-account-id');
    if (btn) btn.textContent = '👤 ' + label + ' · Đang tải';
    if (prof) prof.textContent = 'Firebase UID: ' + account.uid.slice(0, 8) + '… (đang tải)';
    status('Đã xác thực Firebase. Đang tải hồ sơ người chơi…');
    refreshSessionUI();

    try {
      const [token, snapshot] = await Promise.all([
        withTimeout(account.getIdTokenResult(), 'Firebase token'),
        withTimeout(firebase.firestore().collection('profiles_v2').doc(account.uid).get(), 'Firestore profile')
      ]);
      if (ticket !== generation || client.currentUser?.uid !== account.uid) return;

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
      admin = token.claims?.admin === true;
      userProfile.role = admin ? 'admin' : 'reader'; // Never trust a cached profile for permissions.
      userProfile.storyStates ||= {};
      userProfile.collectedCharacters ||= {};
      loadScopedInteractionState();
      ready = true;
      profileError = '';
      if (btn) btn.textContent = '👤 ' + label;
      if (prof) prof.textContent = 'Firebase UID: ' + account.uid.slice(0, 8) + '…';
      showRetry(false);
      closeModals();
      refreshSessionUI();
    } catch (error) {
      if (ticket !== generation || client.currentUser?.uid !== account.uid) return;
      // Authentication succeeded, but the profile could not be read.
      // Keep the authenticated identity and deny edits/cloud profile writes
      // until the server-side check succeeds; do NOT present this as Guest.
      ready = false;
      admin = false;
      userProfile.role = 'reader';
      profileError = 'Đã đăng nhập Firebase (' + label + '), nhưng ' + readableProfileError(error);
      if (btn) btn.textContent = '👤 ' + label + ' · Lỗi hồ sơ';
      if (prof) prof.textContent = 'Firebase UID: ' + account.uid.slice(0, 8) + '… (chưa đồng bộ)';
      console.warn('DUDU Firebase profile loading:', error);
      refreshSessionUI();
      openAuthModal();
      status(profileError);
      showRetry(true);
    }
  }
  function retry() {
    if (client?.currentUser) return applySession(client.currentUser);
    status('Chưa có tài khoản Firebase đăng nhập.');
  }
  function init() {
    if (IS_SANDBOX_MODE || client) return;
    defaultProfile = JSON.stringify(userProfile);
    client = firebase.auth();
    showControls();
    const message = document.getElementById('auth-status-message');
    if (message && !document.getElementById('auth-retry-profile-btn')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'auth-retry-profile-btn';
      button.className = 'btn';
      button.textContent = '↻ Thử tải lại hồ sơ Firebase';
      button.style.cssText = 'display:none;width:100%;margin:6px 0;';
      button.addEventListener('click', retry);
      message.insertAdjacentElement('afterend', button);
    }
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
      if (!ready && !profileError) status('Đã xác thực. Đang tải hồ sơ người chơi…');
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
    status(!account
      ? 'Nhập email và mật khẩu Firebase bạn đã tạo. Chế độ ẩn danh thường không tự điền mật khẩu.'
      : profileError || (ready
        ? 'Đã đăng nhập Firebase: ' + (account.email || account.displayName || 'Firebase')
        : 'Đã xác thực Firebase. Đang tải hồ sơ người chơi…'));
    showRetry(!!account && !!profileError);
  }
  function canAuthor() {
    return !!client?.currentUser && ready && admin;
  }
  window.DuduAuth = {
    init, google, email, signout, showStatus, retry,
    isReady: () => ready && !!client?.currentUser,
    isAdmin: canAuthor,
    uid: () => client?.currentUser?.uid || null
  };
})();
