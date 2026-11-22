/* C13-B6D: browser-origin, owner-only GET diagnostic. No Worker deployment or R2 writes. */
(function () {
  'use strict';
  const OWNER = 'B2yP6xL5rZPcj1GjHUJ5cINx1eT2';
  // Client-only tolerance; Worker still verifies JWT signature, claims and expiry.
  const ISSUED_SKEW_MS = 5000;
  const PROJECT = 'truyendienvl';
  const SITE_ORIGIN = 'https://hnhuynh1003-blip.github.io';
  const WORKER_ORIGIN = 'https://dudu-library-l6-development.dudu-studio-ai.workers.dev';
  // Verified in worker-approved.js, SHA256 97eb54d37579b705de38e9943cff8c48b17bc869fc5e13fc3493519500d7d39d.
  // Owner-pilot JWT gate -> catalog list -> Firestore runQuery only; no book-content or write route.
  const APPROVED_GET_PATH = '/v1/library/r2/catalog/books';

  const panel = document.getElementById('firebase-owner-check');
  if (!panel || document.getElementById('firebase-worker-get-probe-c13b6d') || typeof firebase === 'undefined' ||
      (typeof IS_SANDBOX_MODE !== 'undefined' && IS_SANDBOX_MODE) ||
      location.origin !== SITE_ORIGIN) return;
  let auth;
  try { auth = firebase.auth(); } catch { return; }

  function approvedEndpoint() {
    if (APPROVED_GET_PATH !== '/v1/library/r2/catalog/books') return null;
    const url = new URL(APPROVED_GET_PATH, WORKER_ORIGIN);
    return url.origin === WORKER_ORIGIN && url.protocol === 'https:' &&
      url.pathname === APPROVED_GET_PATH && !url.search && !url.hash
      ? url.href : null;
  }
  const endpoint = approvedEndpoint();
  const host = document.createElement('div');
  host.id = 'firebase-worker-get-probe-c13b6d';
  host.style.marginTop = '8px';
  const button = document.createElement('button');
  button.id = 'firebase-worker-get-probe-button';
  button.type = 'button';
  button.className = 'btn';
  button.style.width = '100%';
  button.textContent = 'Kiểm tra GET Worker';
  const output = document.createElement('div');
  output.id = 'firebase-worker-get-probe-result';
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');
  output.style.marginTop = '6px';
  output.style.fontSize = '12px';
  output.hidden = true;
  host.appendChild(button);
  host.appendChild(output);
  panel.appendChild(host);

  let generation = 0;
  let busy = false;
  let activeAbort = null;
  const owner = () => auth.currentUser?.uid === OWNER;
  function display(a, b, code) {
    output.textContent = `Ẩn danh: ${a === 401 ? 'PASS' : 'FAIL'} · HTTP ${a || 'N/A'} | ` +
      `Tác giả: ${b === 200 ? 'PASS' : 'FAIL'} · HTTP ${b || 'N/A'}` +
      (code ? ` | ${code}` : '');
    output.hidden = false;
  }
  function sync() {
    generation++;
    activeAbort?.abort();
    activeAbort = null;
    busy = false;
    host.hidden = !owner();
    button.disabled = !endpoint || !owner();
    button.removeAttribute('aria-busy');
    output.textContent = '';
    output.hidden = true;
  }
  // Only approved diagnostic enums may be shown. Never expose raw JSON/error text.
  const known503 = new Set([
    'owner-pilot-not-configured', 'library-r2-disabled',
    'reader-authorization-unavailable', 'server-auth-unavailable',
    'catalog-list-unavailable'
  ]);
  const knownAuthStages = new Set(['AUTH_MODE','AUTH_CONFIG','PEM_FORMAT','CLOCK','KEY_IMPORT','JWT_BUILD','JWT_SIGN','OAUTH_FETCH','OAUTH_HTTP','OAUTH_BODY','TOKEN_TYPE','TOKEN_VALUE','TOKEN_LIFETIME','CACHE_EPOCH','AUTH_UNKNOWN']);
  async function readKnown503Code(response) {
    const empty = () => ({ code: '', stage: '' });
    if (response.status !== 503 ||
        !/^application\/json(?:\s*;|\s*$)/i.test(response.headers?.get('Content-Type') || '') ||
        !response.body?.getReader) return empty();
    let reader;
    const chunks = [];
    let total = 0;
    try {
      reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array) || (total += value.byteLength) > 2048) return empty();
        chunks.push(value);
      }
      const raw = new Uint8Array(total);
      let at = 0;
      for (const chunk of chunks) { raw.set(chunk, at); at += chunk.byteLength; }
      const json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
      if (!json || typeof json !== 'object' || Array.isArray(json) ||
          typeof json.code !== 'string' || !known503.has(json.code)) return empty();
      return { code: json.code, stage: json.code === 'server-auth-unavailable' &&
        typeof json.stage === 'string' && knownAuthStages.has(json.stage) ? json.stage : '' };
    } catch {
      return empty();
    } finally {
      try { await reader?.cancel(); } catch { /* No raw server data is retained. */ }
      try { reader?.releaseLock(); } catch { /* No raw server data is retained. */ }
    }
  }
  async function getStatus(authorization, signal) {
    const headers = { Accept: 'application/json' };
    if (authorization) headers.Authorization = `Bearer ${authorization}`;
    try {
      const response = await fetch(endpoint, {
        method: 'GET', mode: 'cors', credentials: 'omit',
        redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store',
        headers, signal
      });
      // Only an authenticated 503 is eligible for bounded error-code parsing.
      // Never consume HTTP 200 catalog metadata or any anonymous response body.
      const diagnostic = authorization && response.status === 503
        ? await readKnown503Code(response) : { code: '', stage: '' };
      if (!authorization || response.status !== 503 || !diagnostic.code) {
        try { await response.body?.cancel(); } catch { /* Status remains authoritative. */ }
      }
      return { status: response.status, code: diagnostic.code, stage: diagnostic.stage };
    } catch {
      // CORS/network failures cannot be treated as a server-side HTTP 401/403.
      return { status: null, code: '' };
    }
  }
  button.addEventListener('click', async () => {
    if (!endpoint || busy || !owner() || location.origin !== SITE_ORIGIN) return;
    const user = auth.currentUser;
    const request = ++generation;
    busy = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    output.hidden = true;
    output.textContent = '';
    const abort = new AbortController();
    activeAbort = abort;
    let rejectWait;
    const interrupted = new Promise((_, reject) => { rejectWait = reject; });
    const onAbort = () => rejectWait(new Error('probe-interrupted'));
    abort.signal.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(() => abort.abort(), 15000);
    let anonymousStatus = null;
    const sameSession = () => request === generation && auth.currentUser === user &&
      owner() && location.origin === SITE_ORIGIN;
    try {
      // Firebase refreshes the existing session. Token is used only as an
      // HTTPS Authorization header to the exact pinned Worker endpoint.
      const proof = await Promise.race([user.getIdTokenResult(true), interrupted]);
      if (!sameSession()) return;
      const claims = proof.claims || {};
      const now = Date.now();
      const expText = claims.exp;
      const exp = (typeof expText === 'number' ||
        (typeof expText === 'string' && /^[0-9]+$/.test(expText)))
        ? Number(expText) : NaN;
      const issued = Date.parse(proof.issuedAtTime);
      const expiry = Date.parse(proof.expirationTime);
      const authorized = user.uid === OWNER && claims.sub === OWNER &&
        claims.admin === true && auth.app?.options?.projectId === PROJECT &&
        claims.aud === PROJECT &&
        claims.iss === `https://securetoken.google.com/${PROJECT}` &&
        Number.isSafeInteger(exp) && exp > 0 &&
        Number.isSafeInteger(exp * 1000) && exp * 1000 > now &&
        Number.isFinite(issued) && issued <= now + ISSUED_SKEW_MS &&
        Number.isFinite(expiry) && expiry > now && issued < expiry;
      if (!authorized) {
        display(null, null, 'SESSION_CHECK_FAIL');
        return;
      }
      const anonymousResult = await Promise.race([getStatus(null, abort.signal), interrupted]);
      anonymousStatus = anonymousResult.status;
      if (!sameSession()) return;
      if (anonymousStatus !== 401) {
        display(anonymousStatus, null, anonymousStatus === null ? 'CORS_OR_NETWORK' : 'ANONYMOUS_HTTP_FAIL');
        return;
      }
      const token = proof.token;
      if (typeof token !== 'string' || !/^[A-Za-z0-9_.-]{100,12000}$/.test(token) ||
          exp * 1000 <= Date.now() || expiry <= Date.now() || abort.signal.aborted) {
        display(anonymousStatus, null, 'SESSION_CHECK_FAIL');
        return;
      }
      const ownerResult = await Promise.race([getStatus(token, abort.signal), interrupted]);
      if (!sameSession()) return;
      const ownerStatus = ownerResult.status;
      const detail = ownerStatus === 503
        ? (ownerResult.code ? `BACKEND_${ownerResult.code}` +
          (ownerResult.stage ? ` · STAGE_${ownerResult.stage}` : '') : 'HTTP_503_UNCLASSIFIED')
        : ownerStatus === null ? 'CORS_OR_NETWORK' :
          ownerStatus === 200 ? '' : 'OWNER_HTTP_FAIL';
      display(anonymousStatus, ownerStatus, detail);
    } catch {
      if (sameSession()) display(anonymousStatus, null, abort.signal.aborted ? 'TIMEOUT' : 'SESSION_REFRESH_FAIL');
    } finally {
      clearTimeout(timeout);
      abort.signal.removeEventListener('abort', onAbort);
      if (activeAbort === abort) activeAbort = null;
      if (request === generation) {
        busy = false;
        button.disabled = !endpoint || !owner();
        button.removeAttribute('aria-busy');
      }
    }
  });
  sync();
  auth.onAuthStateChanged(sync, sync);
  window.addEventListener('pagehide', sync);
})();
