/* DUDU V45.1 R2 — Firebase UID Pilot client. Intentionally isolated:
 * named Firebase Auth app, SESSION persistence; no production DuduAuth,
 * Firestore, inventory, Xu or gift actions. API routes are fixed allowlist.
 * Pilot status is a signed-user preflight, not an author grant.
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
 const REASONS=Object.freeze(['SPAM','HARASSMENT','SPOILER','OTHER']);
 const ROUTES=Object.freeze({
  '/v1/pilot/status':'GET',
  '/v1/comments/list':'GET',
  '/v1/comments/create':'POST',
  '/v1/comments/report':'POST',
  '/v1/comments/inbox':'GET',
  '/v1/comments/inbox/read':'POST',
  '/v1/comments/admin/register':'POST',
  '/v1/comments/admin/reports':'GET',
  '/v1/comments/admin/moderate':'POST'
 });
 const reject=code=>({ok:false,code});
 const validId=x=>typeof x==='string'&&ID.test(x);
 const cleanScope=(storyId,chapterId)=>validId(storyId)&&
  (chapterId==null||chapterId===''||validId(chapterId))?
  {storyId,chapterId:chapterId||null}:null;
 const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const exact=(obj,keys)=>plain(obj)&&
  Object.keys(obj).every(k=>keys.includes(k));
 function create(deps={}){
  const sdk=()=>deps.firebase||(typeof firebase!=='undefined'?firebase:null);
  const transport=()=>deps.fetch||(typeof fetch!=='undefined'?fetch:null);
  let auth=null,approvedUid='',approved=null,epoch=0;
  function getAuth(){
   if(auth)return auth;
   const fb=sdk();
   if(!fb||typeof fb.auth!=='function'||
    typeof fb.initializeApp!=='function'||typeof fb.app!=='function')
    throw Error('firebase-unavailable');
   const app=fb.apps?.find(x=>x.name===APP_NAME)||
    fb.initializeApp(fb.app().options,APP_NAME);
   auth=fb.auth(app);
   return auth;
  }
  function current(){return auth?.currentUser||null}
  function clear(){approvedUid='';approved=null;epoch++}
  function session(){
   const user=current();
   const allowed=!!user&&approvedUid===user.uid&&approved?.ok===true;
   return {signed:!!user,uidHint:user?String(user.uid).slice(0,6)+'…':null,
    approved:allowed,role:allowed?approved.role:null,
    canManagePilot:allowed&&approved.canManagePilot===true,
    sessionRevision:epoch};
  }
  async function login(){
   const fb=sdk();
   if(!fb)return reject('firebase-unavailable');
   clear();
   try{
    const service=getAuth();
    await service.setPersistence(fb.auth.Auth.Persistence.SESSION);
    await service.signInWithPopup(new fb.auth.GoogleAuthProvider());
    clear();
    return {ok:!!service.currentUser,session:session()};
   }catch(e){return reject(e?.code||'login-failed')}
  }
  // V47: Firebase Authentication email/password; credentials are handed directly
  // to Firebase SDK and never cached in localStorage, logs or Worker requests.
  async function loginEmail(email,password){
   if(typeof email!=='string'||typeof password!=='string'||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||
      password.length<6||password.length>1024)return reject('invalid-credentials');
   const fb=sdk();
   if(!fb)return reject('firebase-unavailable');
   clear();
   try{
    const service=getAuth();
    await service.setPersistence(fb.auth.Auth.Persistence.SESSION);
    await service.signInWithEmailAndPassword(email.trim(),password);
    clear();
    return {ok:!!service.currentUser,session:session()};
   }catch(e){return reject(e?.code||'login-failed')}
  }
  async function logout(){
   clear();
   try{await getAuth().signOut();return {ok:true}}
   catch(_){return reject('logout-failed')}
  }
  // V47.1 explicit unauthenticated diagnostic. Read-only, fixed staging origin.
  // It never initializes Firebase, sends a token, or changes a Worker gate.
  async function probe(){
   const call=transport();
   if(typeof call!=='function')return reject('network-unavailable');
   try{
    const response=await call(ORIGIN+'/v1/status',{
     method:'GET',cache:'no-store',
     ...(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?
      {signal:AbortSignal.timeout(10000)}:{})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.service!=='dudu-ai')
     return reject('worker-unexpected-response');
    return {ok:true,service:data.service,aiEnabled:data.enabled===true};
   }catch(e){
    return reject(e?.name==='TimeoutError'?'timeout':'network-unavailable');
   }
  }
  async function request(path,{method='GET',body=null}={}){
   const user=current();
   if(!user)return reject('pilot-login-required');
   const route=path.split('?')[0];
   if(!Object.hasOwn(ROUTES,route)||ROUTES[route]!==method)
    return reject('endpoint-denied');
   if(route!=='/v1/pilot/status'&&
    (approvedUid!==user.uid||approved?.ok!==true))
    return reject('pilot-check-required');
   if(route.startsWith('/v1/comments/admin/')&&
    approved?.canManagePilot!==true)return reject('pilot-admin-required');
   const call=transport();
   if(typeof call!=='function')return reject('network-unavailable');
   const requestEpoch=epoch;
   try{
    let token;
    try{token=await user.getIdToken()}
    catch(_){return reject('firebase-token-unavailable')}
    if(current()?.uid!==user.uid||epoch!==requestEpoch)
     return reject('session-changed');
    const response=await call(ORIGIN+path,{
     method,headers:{Authorization:'Bearer '+token,
      ...(method==='POST'?{'Content-Type':'application/json'}:{})},
     ...(method==='POST'?{body:JSON.stringify(body)}:{}),
     cache:'no-store',
     ...(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?
      {signal:AbortSignal.timeout(15000)}:{})
    });
    // A logout/account swap during fetch must not deliver data to the new user.
    if(current()?.uid!==user.uid||epoch!==requestEpoch)
     return reject('session-changed');
    const data=await response.json().catch(()=>null);
    if(current()?.uid!==user.uid||epoch!==requestEpoch)
     return reject('session-changed');
    if(!response.ok||data?.error){
     const code=data?.error?.code||('http-'+response.status);
     if(response.status===401||response.status===403)clear();
     return reject(code);
    }
    return plain(data)?{...data,ok:data.ok===true}:
     reject('bad-response');
   }catch(e){
    if(current()?.uid!==user.uid||epoch!==requestEpoch)
     return reject('session-changed');
    return reject(e?.name==='TimeoutError'?'timeout':'network-unavailable');
   }
  }
  async function status(){
   clear();
   const user=current();
   if(!user)return reject('pilot-login-required');
   const currentEpoch=epoch;
   const result=await request('/v1/pilot/status');
   if(result.ok&&['READER_A','READER_B','AUTHOR'].includes(result.role)&&
    result.preflightOnly===true&&current()?.uid===user.uid&&
    epoch===currentEpoch){
    approvedUid=user.uid;approved=result;
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
  async function post(input={}){
   if(!exact(input,['storyId','chapterId','text','requestId',
      'parentId','displayName']))return reject('invalid-comment');
   const s=cleanScope(input.storyId,input.chapterId);
   const text=input.text;
   if(!s||typeof text!=='string'||text.trim().length<2||
    text.trim().length>600||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)||
    !validId(input.requestId)||
    !(input.parentId==null||validId(input.parentId))||
    (input.displayName!==undefined&&
     (typeof input.displayName!=='string'||input.displayName.length>50)))
    return reject('invalid-comment');
   return request('/v1/comments/create',{method:'POST',body:{
    ...s,text:text.trim(),requestId:input.requestId,
    parentId:input.parentId||null,
    ...(input.displayName!==undefined?{displayName:input.displayName}:{})
   }});
  }
  async function report(commentId,reason){
   if(!validId(commentId)||!REASONS.includes(reason))
    return reject('invalid-report');
   return request('/v1/comments/report',{method:'POST',
    body:{commentId,reason}});
  }
  async function inbox(){return request('/v1/comments/inbox')}
  async function markInboxRead(){return request('/v1/comments/inbox/read',{
   method:'POST',body:{}
  })}
  async function register(storyId,chapterIds){
   if(!validId(storyId)||!Array.isArray(chapterIds)||
    chapterIds.length>500||chapterIds.some(x=>!validId(x))||
    new Set(chapterIds).size!==chapterIds.length)return reject('invalid-register');
   return request('/v1/comments/admin/register',{method:'POST',
    body:{storyId,chapterIds}});
  }
  async function reports(){return request('/v1/comments/admin/reports')}
  async function moderate(commentId,hidden){
   if(!validId(commentId)||typeof hidden!=='boolean')
    return reject('invalid-moderation');
   return request('/v1/comments/admin/moderate',{method:'POST',
    body:{commentId,hidden}});
  }
  return Object.freeze({APP_NAME,ORIGIN,session,login,loginEmail,logout,probe,status,
   list,post,report,inbox,markInboxRead,register,reports,moderate});
 }
 // One secondary Firebase Auth session shared by the phone QA and story UI.
 // Never instantiates Firebase or calls a network API merely by requesting it.
 let shared=null;
 function getShared(){if(!shared)shared=create();return shared}
 return Object.freeze({APP_NAME,ORIGIN,cleanScope,create,getShared});
});
