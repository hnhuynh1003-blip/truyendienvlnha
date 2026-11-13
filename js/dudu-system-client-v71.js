/* DUDU V71 — same production Worker, Firebase-bound authoritative System.
 * No Sandbox admissions, browser-minted passports or owner-provided server stats.
 */
(function(root){
 'use strict';
 const ROUTES=new Set(['/v1/system/me','/v1/system/redeem',
 '/v1/system/register-name','/v1/system/consent-pact',
 '/v1/system/owner/issue-test-pass']);
 const uid=()=>root.DuduAuth?.isReady?.()===true?root.DuduAuth?.uid?.():null;
 async function send(path,body){
  if(!ROUTES.has(path))return {ok:false,error:'Đường dẫn không hợp lệ.'};
  const account=root.firebase?.auth?.()?.currentUser;
  const original=uid();
  const base=root.DuduAI?.workerBase;
  if(!original||!account||original!==account.uid||
     typeof base!=='string'||!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base))
   return {ok:false,error:'Hãy đăng nhập Firebase và kiểm tra kết nối máy chủ Hệ Thống.'};
  try{
   const token=await account.getIdToken();
   if(uid()!==original)return {ok:false,error:'Phiên đăng nhập đã thay đổi.'};
   const response=await fetch(base+path,{method:body?'POST':'GET',
    headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',
    signal:AbortSignal.timeout(16000)});
   const data=await response.json().catch(()=>null);
   if(uid()!==original)return {ok:false,error:'Phiên đăng nhập đã thay đổi.'};
   if(!response.ok||!data||data.error){
    const code=data?.error?.code||'http-'+response.status;
    let message=data?.error?.message||'Máy chủ từ chối yêu cầu ('+response.status+').';
    if(response.status===404)
     message='Worker đang chạy chưa có tuyến Hệ Thống V71 (HTTP 404). Cần cập nhật Worker Cloudflare.';
    else if(code==='system-not-configured'||response.status===503)
     message='Registry V71 chưa được kích hoạt hoặc chưa có Durable Object (HTTP 503).';
    else if(response.status===401)
     message='Phiên xác thực Firebase chưa hợp lệ. Hãy đăng nhập lại.';
    return {ok:false,code,error:message};
   }
   return {ok:true,data};
  }catch(error){
   if(error?.name==='TimeoutError'||error?.name==='AbortError')
    return {ok:false,code:'system-timeout',
     error:'Máy chủ Hệ Thống phản hồi quá lâu. Kiểm tra kết nối và thử lại.'};
   return {ok:false,code:'system-network-unavailable',
    error:'Chưa liên lạc được Worker Hệ Thống. Có thể do mạng, DNS, CORS hoặc Worker V71 chưa cập nhật.'};
  }
 }
 root.DuduSystemClientV71=Object.freeze({
  me:()=>send('/v1/system/me'),
  redeem:code=>send('/v1/system/redeem',{code}),
  registerName:name=>send('/v1/system/register-name',{name}),
  acceptPact:()=>send('/v1/system/consent-pact',{accept:true,termsVersion:'v71-pilot-1'}),
  issueOwnerTestPass:()=>send('/v1/system/owner/issue-test-pass',{confirm:'ISSUE_MY_TEST_PASS'})
 });
})(typeof window!=='undefined'?window:{});
