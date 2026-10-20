/* DUDU V70 — AU-only DeepSeek Core planning link (NO tools/side effects).
 * Worker additionally verifies Firebase admin claim, allowed UID, quota and
 * two explicit paid-provider switches. Browser never knows the Hive key.
 */
(function(root){
 'use strict';
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
 function endpoint(){
  try{return typeof WORKER_URL==='string'&&/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(WORKER_URL)?
    WORKER_URL:'';}
  catch(_){return '';}
 }
 async function ask(prompt){
  if(sandbox()||typeof prompt!=='string'||prompt.trim().length<5||
     prompt.length>1400||!endpoint())
   return {ok:false,message:'Chỉ thị không hợp lệ hoặc kênh DeepSeek chưa được cấu hình.'};
  const auth=root.DuduAuth,session=root.firebase?.auth?.()?.currentUser;
  if(!session||auth?.isReady?.()!==true||auth?.isAdmin?.()!==true||
     auth?.uid?.()!==session.uid)
   return {ok:false,message:'Yêu cầu tài khoản AU Firebase đã xác minh.'};
  const uid=session.uid;
  let token;
  try{token=await session.getIdToken();}
  catch(_){return {ok:false,message:'Không lấy được token phiên AU.'};}
  if(auth?.uid?.()!==uid||auth?.isAdmin?.()!==true)
   return {ok:false,message:'Phiên AU đã thay đổi.'};
  try{
   const common={Authorization:'Bearer '+token};
   const status=await fetch(endpoint()+'/v1/dudu-ai/status',{
    headers:common,cache:'no-store',signal:AbortSignal.timeout(12000)
   });
   const state=await status.json().catch(()=>null);
   if(!status.ok||!state?.enabled)return {ok:false,
    message:'Hive/DeepSeek chưa được kích hoạt cho tài khoản AU này, hoặc đã hết ngân sách thử.'};
   const answer=await fetch(endpoint()+'/v1/dudu-ai/chat',{
    method:'POST',headers:{...common,'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({agentId:'core',messages:[{role:'user',text:prompt.trim()}]}),
    signal:AbortSignal.timeout(30000)
   });
   const json=await answer.json().catch(()=>null);
   if(auth?.uid?.()!==uid||auth?.isAdmin?.()!==true)
    return {ok:false,message:'Phiên AU đã đổi, không hiển thị phản hồi.'};
   if(!answer.ok||!json?.text)return {ok:false,
    message:json?.error?.message||'AI chưa có phản hồi; không có luật nào được thực thi.'};
   return {ok:true,text:String(json.text).slice(0,1600),remaining:json.remaining};
  }catch(_){return {ok:false,message:'Không kết nối được DeepSeek; không có tác động đến người chơi.'};}
 }
 root.DuduCoreAIV70=Object.freeze({version:1,ask});
})(typeof window!=='undefined'?window:{});
