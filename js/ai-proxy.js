/* DUDU Studio Gemini client: only talks to authenticated callable Functions.
 * Never store or send a Gemini API key from the browser.
 */
(function () {
  'use strict';
  const REGION = 'asia-southeast1';
  // Public site key (NOT a Gemini API key). Register it in Firebase App Check first.
  // Keep empty to disable AI safely until rollout is approved.
  const RECAPTCHA_ENTERPRISE_SITE_KEY = '';
  let initialized = false;

  function explain(error) {
    const code = (error && error.code || '').replace(/^functions\//, '');
    if (code === 'unauthenticated') return 'Hãy đăng nhập DUDU Studio để dùng AI.';
    if (code === 'resource-exhausted' || code === 'invalid-argument') return error.message || 'Đã đạt giới hạn AI.';
    if (code === 'failed-precondition') return 'Máy chủ AI chưa được cấu hình đầy đủ.';
    if (code === 'unavailable' || code === 'deadline-exceeded') return 'AI tạm thời không khả dụng. Hãy thử lại sau.';
    if (code === 'not-found') return 'Chưa triển khai máy chủ AI trên Firebase.';
    if (code === 'permission-denied') return 'Kết nối AI bị từ chối. Hãy kiểm tra Firebase App Check.';
    return 'Không kết nối được AI. Hãy kiểm tra cấu hình Firebase và đường truyền.';
  }

  function init(sandbox) {
    if (sandbox) return;
    // Legacy versions stored private API keys in localStorage, which is unsafe.
    // This branch never reads or uses the old key.
    try { localStorage.removeItem('my_gemini_api_key'); } catch (_) {}
    if (!RECAPTCHA_ENTERPRISE_SITE_KEY) return; // fail closed; no unprotected requests
    try {
      firebase.appCheck().activate(
        new firebase.appCheck.ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
        true
      );
      initialized = true;
    } catch (error) {
      console.warn('App Check startup failed:', error?.code || 'unknown');
    }
  }
  function isConfigured() { return initialized; }
  function available() {
    if (!initialized) return 'Máy chủ AI chưa kích hoạt. Tác giả cần cấu hình App Check và triển khai Cloud Functions.';
    if (!firebase.auth().currentUser) return 'Hãy đăng nhập DUDU Studio để trò chuyện với NPC bằng AI.';
    return null;
  }
  async function call(name,data) {
    const error=available();
    if (error) return {error};
    try {
      const callable=firebase.app().functions ? firebase.app().functions(REGION).httpsCallable(name) : firebase.functions(REGION).httpsCallable(name);
      const response=await callable(data);
      return response.data || {error:'Máy chủ AI trả về dữ liệu trống.'};
    } catch (failure) {
      return {error:explain(failure)};
    }
  }
  function generate(purpose,instruction,messages) {
    return call('duduAiGenerate',{purpose,instruction,messages});
  }
  function status() { return call('duduAiStatus',{}); }
  window.DuduAI={init,isConfigured,generate,status};
})();
