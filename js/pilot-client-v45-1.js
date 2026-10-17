/* DUDU V45.1 — read/write of PILOT discussion only, in isolated Worker DO.
 * Deliberately separate Firebase Auth named app. No Firestore reads/writes;
 * never touches DuduAuth, userProfile, localStorage inventory, gifts or Xu.
 * No API is contacted without a user action, verified pilot session, and
 * successful read-only /v1/pilot/status preflight.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPilotClientV451=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const APP_NAME='dudu-v451-pilot-auth';
 const ORIGIN='https://dudu-ai-staging.dudu-studio-ai.workers.dev';
 const ID=/^[A-Za-z0-9][\w:-]{0,159}$/;
 const MAX_TEXT=600;
 const cleanScope=(storyId,chapterId)=>typeof storyId==='string'&&
  ID.test(storyId)&&(!chapterId||typeof chapterId==='string'&&
  ID.test(chapterId))?{storyId,chapterId:chapterId||null}:null;
 const reject=code=>({ok:false,code});
 function create(deps={}){
  const firebaseSdk=()=>deps.firebase||(
   typeof firebase!=='undefined'?firebase:null);
  const send=()=>deps.fetch||(
   typeof fetch!=='undefined'?fetch:null);
  let auth=null,verifiedUid='',lastStatus=null;
  function getAuth(){
   if(auth)return auth;
   const sdk=firebaseSdk();
   if(!sdk||typeof sdk.auth!=='function'||
    typeof sdk.initializeApp!=='function'||typeof sdk.app!=='function')
     throw Error('firebase-unavailable');
   const app=sdk.apps?.find(x=>x.name===APP_NAME)||
    sdk.initializeApp(sdk.app().options,APP_NAME);
   auth=sdk.auth(app);
   return auth;
  }
  function current(){
   // Rendering the Pilot panel must not even initialize Firebase Auth.
   // The isolated Auth app is created only by an explicit Login action.
   return auth?.currentUser||null;
  }
  function session(){
   const user=current();
   return {signed:!!user,
    // No other user identifier is exposed or stored by the Pilot UI.
    uidHint:user?String(user.uid).slice(0,6)+'…':null,
    approved:!!user&&verifiedUid===user.uid&&lastStatus?.ok===true,
    role:verifiedUid===user?.uid?lastStatus?.role||null:null};
  }
  async function login(){
   const sdk=firebaseSdk();
   if(!sdk)return reject('firebase-unavailable');
   try{
    const service=getAuth();
    await service.setPersistence(sdk.auth.Auth.Persistence.SESSION);
    await service.signInWithPopup(new sdk.auth.GoogleAuthProvider());
    verifiedUid='';lastStatus=null;
    return {ok:!!service.currentUser,session:session()};
   }catch(e){return reject(e?.code||'login-failed')}
  }
  async function logout(){
   try{
    await getAuth().signOut();
    verifiedUid='';lastStatus=null;
    return {ok:true};
   }catch(_){return reject('logout-failed')}
  }
  async function request(path,{method='GET',body=null}={}){
   const user=current();
   if(!user)return reject('pilot-login-required');
   if(![
    '/v1/pilot/status','/v1/comments/list',
    '/v1/comments/create'
   ].includes(path.split('?')[0]))return reject('endpoint-denied');
   if(path!=='/v1/pilot/status'&&
     (verifiedUid!==user.uid||lastStatus?.ok!==true))
     return reject('pilot-check-required');
   const client=send();
   if(typeof client!=='function')return reject('network-unavailable');
   try{
    const token=await user.getIdToken();
    // Login can switch account while awaiting token; avoid mixed-UID requests.
    if(current()?.uid!==user.uid)return reject('session-changed');
    const url=ORIGIN+path;
    const response=await client(url,{method,
     headers:{Authorization:'Bearer '+token,
      ...(method==='POST'?{'Content-Type':'application/json'}:{})},
     ...(method==='POST'?{body:JSON.stringify(body)}:{}),
     cache:'no-store',
     ...(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?
      {signal:AbortSignal.timeout(15000)}:{})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.error)return reject(
      data?.error?.code||('http-'+response.status));
    return data&&typeof data==='object'?{...data,ok:true}:reject('bad-response');
   }catch(e){return reject(e?.name==='TimeoutError'?'timeout':'network-unavailable')}
  }
  async function status(){
   verifiedUid='';lastStatus=null;
   const user=current();
   if(!user)return reject('pilot-login-required');
   const result=await request('/v1/pilot/status');
   if(result.ok&&['READER_A','READER_B','AUTHOR'].includes(result.role)&&
     result.preflightOnly===true&&current()?.uid===user.uid){
    verifiedUid=user.uid;lastStatus=result;
   }
   return result;
  }
  async function list(storyId,chapterId=null){
   const s=cleanScope(storyId,chapterId);
   if(!s)return reject('invalid-scope');
   const q=new URLSearchParams({storyId:s.storyId});
   if(s.chapterId)q.set('chapterId',s.chapterId);
   return request('/v1/comments/list?'+q.toString());
  }
  async function post({storyId,chapterId=null,text,requestId}={}){
   const s=cleanScope(storyId,chapterId);
   if(!s||typeof text!=='string'||text.trim().length<2||
    text.trim().length>MAX_TEXT||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)||
    typeof requestId!=='string'||!ID.test(requestId))
    return reject('invalid-comment');
   return request('/v1/comments/create',{method:'POST',
    body:{...s,text:text.trim(),requestId}});
  }
  return Object.freeze({APP_NAME,ORIGIN,session,login,logout,status,list,post});
 }
 return Object.freeze({APP_NAME,ORIGIN,cleanScope,create});
});
