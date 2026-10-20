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
   if(!response.ok||!data||data.error)
    return {ok:false,code:data?.error?.code||'http-'+response.status,
     error:data?.error?.message||'Máy chủ Hệ Thống chưa sẵn sàng ('+response.status+').'};
   return {ok:true,data};
  }catch(_){return {ok:false,error:'Không kết nối được registry Hệ Thống. Hãy thử lại sau.'};}
 }
 root.DuduSystemClientV71=Object.freeze({
  me:()=>send('/v1/system/me'),
  redeem:code=>send('/v1/system/redeem',{code}),
  registerName:name=>send('/v1/system/register-name',{name}),
  acceptPact:()=>send('/v1/system/consent-pact',{accept:true,termsVersion:'v71-pilot-1'}),
  issueOwnerTestPass:()=>send('/v1/system/owner/issue-test-pass',{confirm:'ISSUE_MY_TEST_PASS'})
 });
})(typeof window!=='undefined'?window:{});
