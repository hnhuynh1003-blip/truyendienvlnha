/* REVIEW ONLY: isolated in-memory Auth, existing password account only. No default-app session changes. */
(function () {
  'use strict';
  const SITE = 'https://hnhuynh1003-blip.github.io';
  const ENDPOINT = 'https://dudu-library-l6-development.dudu-studio-ai.workers.dev/v1/library/r2/catalog/books';
  const OWNER = 'B2yP6xL5rZPcj1GjHUJ5cINx1eT2', PROJECT = 'truyendienvl';
  if (location.origin !== SITE || !['/truyendienvlnha/', '/truyendienvlnha/index.html'].includes(location.pathname) ||
      new URLSearchParams(location.search).get('c13b6d-auth-test') !== '1' || typeof firebase === 'undefined') return;
  const anchor = document.getElementById('firebase-owner-check');
  if (!anchor?.parentNode || document.getElementById('c13b6d-nonadmin-test')) return;
  let options;
  try { options = firebase.app().options; } catch { return; }
  if (options?.projectId !== PROJECT) return;
  const host = document.createElement('div'); host.id = 'c13b6d-nonadmin-test';
  const title = document.createElement('p'); title.textContent = 'Kiểm tra server non-admin — tài khoản email/mật khẩu đã có';
  const email = document.createElement('input'); email.type = 'email'; email.autocomplete = 'off'; email.placeholder = 'Email tài khoản test đã tồn tại'; email.setAttribute('aria-label', 'Email tài khoản test');
  const password = document.createElement('input'); password.type = 'password'; password.autocomplete = 'off'; password.placeholder = 'Mật khẩu (chỉ nhập tại đây)'; password.setAttribute('aria-label', 'Mật khẩu tài khoản test');
  const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = 'Chạy một GET non-admin';
  const output = document.createElement('div'); output.setAttribute('role', 'status'); output.setAttribute('aria-live', 'polite');
  for (const el of [title, email, password, button, output]) host.appendChild(el);
  // A sibling of the owner-only panel: non-admin UI is not hidden by Self-Check R3.
  anchor.parentNode.insertBefore(host, anchor.nextSibling);
  let attempted = false, generation = 0, activeAbort = null;
  const display = code => { output.textContent = code; };
  window.addEventListener('pagehide', () => { generation++; activeAbort?.abort(); email.value = ''; password.value = ''; });
  const codes = new Set(['owner-pilot-only', 'unauthenticated', 'origin-blocked', 'owner-pilot-not-configured', 'library-r2-disabled', 'server-auth-unavailable', 'reader-authorization-unavailable', 'catalog-list-unavailable']);
  async function errorCode(response) {
    let reader;
    try {
      if (!/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('Content-Type') || '') || !response.body?.getReader) return '';
      reader = response.body.getReader(); let bytes = 0, text = ''; const decoder = new TextDecoder();
      for (;;) { const part = await reader.read(); if (part.done) break;
        if (!(part.value instanceof Uint8Array) || (bytes += part.value.byteLength) > 2048) return 'RESPONSE_LIMIT';
        text += decoder.decode(part.value, { stream: true });
      }
      const data = JSON.parse(text + decoder.decode());
      if (Object.prototype.hasOwnProperty.call(data, 'stage')) return 'UNEXPECTED_STAGE_FIELD';
      return codes.has(data?.code) ? data.code : '';
    } catch { return ''; }
    finally { try { await reader?.cancel(); } catch {} try { reader?.releaseLock(); } catch {} }
  }
  button.addEventListener('click', async () => {
    if (attempted || !email.value.trim() || !password.value || location.origin !== SITE) return;
    attempted = true; button.disabled = true; const request = ++generation;
    const abort = new AbortController(); activeAbort = abort;
    const timer = setTimeout(() => { abort.abort(); if (request === generation) display('FAIL · HTTP N/A · TIMEOUT'); }, 15000);
    let app, auth, user, proof, headers, unsubscribe, secret = password.value;
    const account = email.value.trim(); email.value = ''; password.value = '';
    const current = () => request === generation && !abort.signal.aborted && location.origin === SITE && (!user || auth.currentUser === user);
    try {
      app = firebase.initializeApp(options, 'c13b6d-nonadmin-memory-' + Date.now());
      auth = firebase.auth(app);
      // MUST finish NONE before sign-in. No popup/Google sign-in or createUser call.
      await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
      if (!current()) return;
      try { user = (await auth.signInWithEmailAndPassword(account, secret)).user; } finally { secret = ''; }
      if (!current()) return;
      unsubscribe = auth.onAuthStateChanged(value => { if (value !== user) { generation++; abort.abort(); display('FAIL · HTTP N/A · SESSION_CHANGED'); } });
      proof = await user.getIdTokenResult(true);
      if (!current()) return;
      const c = proof.claims || {}, now = Date.now(), issued = Date.parse(proof.issuedAtTime), expiry = Date.parse(proof.expirationTime);
      if (!user.uid || user.uid === OWNER || c.sub !== user.uid || c.admin === true || c.aud !== PROJECT ||
          c.iss !== 'https://securetoken.google.com/' + PROJECT || !Number.isSafeInteger(c.exp) || !Number.isSafeInteger(c.exp * 1000) || c.exp * 1000 <= now ||
          !Number.isFinite(issued) || issued > now || !Number.isFinite(expiry) || expiry <= now || issued >= expiry ||
          typeof proof.token !== 'string' || !/^[A-Za-z0-9_.-]{100,12000}$/.test(proof.token)) {
        display('BLOCKED · HTTP N/A · NONADMIN_SESSION_REQUIRED'); return;
      }
      headers = { Accept: 'application/json', Authorization: 'Bearer ' + proof.token };
      const response = await fetch(ENDPOINT, { method: 'GET', mode: 'cors', credentials: 'omit', redirect: 'error',
        cache: 'no-store', referrerPolicy: 'no-referrer', headers, signal: abort.signal });
      headers = null; proof = null;
      if (!current()) { try { await response.body?.cancel(); } catch {} return; }
      if (response.status === 200) { try { await response.body?.cancel(); } catch {} display('FAIL · HTTP 200 · UNAUTHORIZED_HTTP_200'); return; }
      const code = await errorCode(response); try { await response.body?.cancel(); } catch {}
      if (!current()) return;
      display((response.status === 403 && code === 'owner-pilot-only' ? 'PASS' : 'FAIL') + ' · HTTP ' + response.status + (code ? ' · ' + code : ' · UNCLASSIFIED'));
    } catch {
      if (request === generation && !abort.signal.aborted) display('FAIL · HTTP N/A · SIGNIN_OR_CORS_OR_NETWORK');
    } finally {
      clearTimeout(timer); secret = ''; headers = null; proof = null; unsubscribe?.();
      try { await auth?.signOut(); } catch {} try { await app?.delete(); } catch {}
      user = null; auth = null; app = null; activeAbort = null;
    }
  });
})();
