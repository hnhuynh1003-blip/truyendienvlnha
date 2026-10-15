/* DUDU AI client — Cloudflare Workers gateway for Firebase Spark projects.
 * Gemini key is a Cloudflare Secret, NEVER sent to browser or stored in localStorage.
 * Keep WORKER_URL empty until Worker deployment and review have completed.
 */
(function () {
  'use strict';
  const WORKER_URL = ''; // Example after review: https://dudu-ai-staging.<account>.workers.dev
  let sandbox = false;
  function base() {return typeof WORKER_URL==='string'?WORKER_URL.trim().replace(/\/+$/,''):'';}
  function init(isSandbox) {
    sandbox = !!isSandbox;
    try{localStorage.removeItem('my_gemini_api_key');}catch(_){}
  }
  function isConfigured(){return !sandbox && /^https:\/\/[^\s/]+$/.test(base());}
  function available(){
    if(sandbox) return 'Chế độ thử nghiệm không gọi API AI thật.';
    if(!isConfigured())return 'Tần số liên lạc NPC chưa được kích hoạt.';
    if(!firebase.auth()?.currentUser)return 'Bạn cần đăng nhập để kết nối NPC.';
    return null;
  }
  function explain(data,status){
    const error=data?.error;
    const code=error?.code;
    if(code==='unauthenticated'||status===401)return 'Hãy đăng nhập DUDU Studio trước khi trò chuyện.';
    if(code==='daily-user'||code==='daily-global'||code==='cooldown'||code==='in-flight')
      return error.message||'Vui lòng đợi trước khi tiếp tục trò chuyện.';
    if(code==='ai-disabled'||status===503)return 'Tần số NPC AI chưa sẵn sàng.';
    if(code==='ai-busy'||status===429)return error?.message||'Tần số NPC đang bận.';
    if(status===400)return 'Tin nhắn quá dài hoặc không phù hợp giới hạn AI.';
    return error?.message||'Kết nối NPC tạm thời gián đoạn. Hãy thử lại sau.';
  }
  async function call(method,path,data){
    const error=available();
    if(error)return {error};
    try{
      const idToken=await firebase.auth().currentUser.getIdToken();
      if(sandbox)return {error:'Chế độ thử nghiệm không gọi API AI thật.'};
      const response=await fetch(base()+path,{
        method,
        headers:{'Authorization':'Bearer '+idToken,
          ...(method==='POST'?{'Content-Type':'application/json'}:{})},
        ...(method==='POST'?{body:JSON.stringify(data)}:{}),
        cache:'no-store',
        signal:AbortSignal.timeout(32000)
      });
      const body=await response.json().catch(()=>null);
      if(!response.ok||body?.error)return {error:explain(body,response.status)};
      return body || {error:'Máy chủ không trả lời.'};
    }catch(e){
      console.warn('DUDU AI gateway unavailable:',e?.name||'network');
      return {error:'Tần số NPC tạm thời gián đoạn.'};
    }
  }
  function generate(purpose,instruction,messages){
    return call('POST','/v1/generate',{purpose,instruction,messages});
  }
  function status(){
    return call('GET','/v1/status');
  }
  window.DuduAI={init,isConfigured,generate,status};
})();
