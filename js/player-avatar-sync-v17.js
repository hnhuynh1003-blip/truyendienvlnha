/* DUDU V17 player appearance sync client — dormant by default.
 * NO account UID is submitted. Only getIdToken() from live Firebase Auth.
 * Avatar photos are NEVER transmitted: binary sync awaits an audited R2 flow.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPlayerAvatarSyncV17=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ENDPOINT='https://dudu-ai-staging.dudu-studio-ai.workers.dev';
 function createClient({enabled=false,getIdToken,fetchImpl,endpoint=ENDPOINT}={}){
   if(endpoint!==ENDPOINT)
     throw Error('untrusted-endpoint');
   const transport=fetchImpl||(typeof fetch==='function'?fetch.bind(undefined):null);
   async function request(method,path,payload){
     if(enabled!==true)return {ok:false,code:'disabled'};
     if(typeof getIdToken!=='function'||typeof transport!=='function')
       return {ok:false,code:'not-configured'};
     let token;
     try{token=await getIdToken();}
     catch(_){return {ok:false,code:'unauthenticated'};}
     if(typeof token!=='string'||!token||token.length>12000)
       return {ok:false,code:'unauthenticated'};
     const headers={'Authorization':'Bearer '+token,'Cache-Control':'no-store'};
     if(method==='POST')headers['Content-Type']='application/json';
     try {
       const response=await transport(endpoint+path,{
         method,headers,cache:'no-store',
         ...(payload?{body:JSON.stringify(payload)}:{})
       });
       if(!response||typeof response.json!=='function')
         return {ok:false,code:'invalid-response'};
       const data=await response.json();
       if(!response.ok)
         return {ok:false,code:data?.error?.code||'server-error',
           revision:Number.isSafeInteger(data?.revision)?data.revision:null};
       if(!Number.isSafeInteger(data?.revision)||!data?.avatar||
         !Array.isArray(data.availableFrames)||data.uploadsEnabled!==false)
         return {ok:false,code:'invalid-response'};
       return {ok:true,revision:data.revision,avatar:data.avatar,
         availableFrames:data.availableFrames,lockedFrames:data.lockedFrames};
     }catch(_){return {ok:false,code:'unavailable'};}
   }
   return Object.freeze({
     read:()=>request('GET','/v1/player-avatar/mine'),
     save:(avatar,expectedRevision)=>{
       if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)
         return Promise.resolve({ok:false,code:'invalid-revision'});
       if(!avatar||typeof avatar!=='object'||
         !['anime','vector','initials'].includes(avatar.kind)||
         'uploadId' in avatar||'uid' in avatar||'ownerUid' in avatar)
         return Promise.resolve({ok:false,code:'unsupported-avatar'});
       return request('POST','/v1/player-avatar/save',{
         expectedRevision,avatar:{
           kind:avatar.kind,presetId:avatar.presetId||'',
           frameId:avatar.frameId||'none'
         }
       });
     }
   });
 }
 return Object.freeze({ENDPOINT,createClient});
});
