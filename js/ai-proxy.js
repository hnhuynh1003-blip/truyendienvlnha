/* DUDU AI client — Cloudflare Workers gateway for Firebase Spark projects.
 * Gemini key is a Cloudflare Secret, NEVER sent to browser or stored in localStorage.
 * Keep WORKER_URL empty until Worker deployment and review have completed.
 */
(function () {
  'use strict';
  const WORKER_URL = 'https://dudu-ai-staging.dudu-studio-ai.workers.dev'; // Public endpoint; GEMINI_API_KEY stays secret in Cloudflare.
  let sandbox = false;
  const DEFAULT_MODEL='gemini-3.5-flash-lite';
  const AUTO='auto'; // Browser-only routing option, never an API model ID.
  // Auto routes to one of the seven explicitly allowlisted Gemini models.
  const MODELS=Object.freeze([
    ['auto','✦ Tự động · phù hợp câu hỏi'],
    ['gemini-3.5-flash-lite','3.5 Flash-Lite · nhanh'],
    ['gemini-3.1-flash-lite','3.1 Flash-Lite · nhẹ'],
    ['gemini-3.6-flash','3.6 Flash · nhập vai'],
    ['gemini-3.8-flash','3.8 Flash · mới'],
    ['gemini-3-flash-preview','3 Flash Preview'],
    ['gemini-2.5-flash-lite','2.5 Flash-Lite · cũ'],
    ['gemini-2.5-flash','2.5 Flash · cũ']
  ].map(([id,label])=>Object.freeze({id,label})));
  function modelStorageKey(){
    const uid=firebase?.auth?.()?.currentUser?.uid;
    return uid&&!sandbox?'dudu-v2:'+encodeURIComponent(uid)+':global:npc-model':null;
  }
  function model(){
    const key=modelStorageKey();
    if(!key)return AUTO;
    try{
      const saved=localStorage.getItem(key);
      return MODELS.some(x=>x.id===saved)?saved:AUTO;
    }catch(_){return AUTO;}
  }
  function setModel(id){
    if(!MODELS.some(x=>x.id===id))return false;
    const key=modelStorageKey();
    if(!key)return false;
    try{localStorage.setItem(key,id);return true;}catch(_){return false;}
  }
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
    if(code==='invalid-request'||code==='invalid-content')
      return error?.message||'Yêu cầu NPC vượt giới hạn 12 tin hoặc 12.000 ký tự.';
    if(code==='invalid-upstream-request'||code==='gemini-turn-format')
      return error?.message||'Gemini từ chối định dạng hội thoại. Hãy thử lại sau khi cập nhật.';
    if(status===400)return error?.message||'Yêu cầu NPC không hợp lệ; tin nhắn vẫn được lưu.';
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
      if(!response.ok||body?.error)return {
        error:explain(body,response.status),
        // Diagnostic only: the exact allowlisted model attempted by this user.
        model:method==='POST'&&MODELS.some(x=>x.id===data?.model)?data.model:undefined,
        code:typeof body?.error?.code==='string'?body.error.code:'http-'+response.status
      };
      return body || {error:'Máy chủ không trả lời.'};
    }catch(e){
      console.warn('DUDU AI gateway unavailable:',e?.name||'network');
      return {error:'Tần số NPC tạm thời gián đoạn.'};
    }
  }
  function generate(purpose,instruction,messages,currentQuestion){
    const chosen=model();
    // No additional request is made to select a model. Manual choices take
    // precedence; Auto only routes among the existing server allowlist.
    const resolved=chosen===AUTO?
      (window.DuduNpcAutoModelV5611?.route(currentQuestion
        ?[{role:'user',text:currentQuestion}]:messages)||DEFAULT_MODEL):chosen;
    return call('POST','/v1/generate',{
      purpose,instruction,messages,...(purpose==='chat'?{model:resolved}:{})
    });
  }
  function status(){
    return call('GET','/v1/status');
  }
  window.DuduAI={init,isConfigured,generate,status,model,setModel,models:MODELS};
})();
