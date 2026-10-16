/* V22 opt-in staging synchronizer. No automatic upload or migration.
 * Every operation checks actual authenticated Firebase UID, and owner
 * changes invalidate results. The UI must request explicit confirmation.
 */
(function(root,factory){
 const plan=typeof module==='object'&&module.exports?
   require('./player-avatar-sync-plan-v20.js'):root?.DuduPlayerAvatarSyncPlanV20;
 const api=factory(plan);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduAvatarStagingV22=api;
})(typeof window!=='undefined'?window:null,function(planner){
 'use strict';
 function create({enabled=false,identity,localOwner,localProfile,vectorIds,
   createClient,applyLocal}={}){
   let generation=0,last=null;
   const invalidate=()=>{generation++;last=null;};
   function owner(){
     const auth=typeof identity==='function'?identity():null;
     const local=typeof localOwner==='function'?localOwner():null;
     if(!auth||typeof auth.uid!=='string'||!auth.uid||
        auth.uid!==local||typeof auth.getIdToken!=='function')return null;
     return auth;
   }
   function current(ticket,uid){
     return ticket===generation&&owner()?.uid===uid;
   }
   function clientFor(auth){
     return typeof createClient==='function'?
       createClient({getIdToken:()=>auth.getIdToken()}):null;
   }
   async function inspect(){
     invalidate();
     if(!enabled)return {ok:false,code:'disabled'};
     const auth=owner();
     if(!auth)return {ok:false,code:'owner-mismatch'};
     const ticket=generation,uid=auth.uid;
     const client=clientFor(auth);
     if(!client)return {ok:false,code:'not-configured'};
     const result=await client.read();
     if(!current(ticket,uid))return {ok:false,code:'stale-account'};
     if(!result.ok)return {ok:false,code:result.code||'unavailable'};
     const local=typeof localProfile==='function'?localProfile():null;
     const options={vectorIds:typeof vectorIds==='function'?vectorIds():[]};
     const review=planner.review(local,result,options);
     if(review.status==='unavailable')return {ok:false,code:'invalid-snapshot'};
     last={uid,ticket,review,client,
       fingerprint:JSON.stringify(local?.playerAvatar||null)};
     return {ok:true,review};
   }
   async function resolve(choice){
     if(!enabled)return {ok:false,code:'disabled'};
     const saved=last;
     const auth=owner();
     if(!saved||!auth||saved.uid!==auth.uid||
       !current(saved.ticket,saved.uid))return {ok:false,code:'stale-account'};
     if(JSON.stringify(localProfile()?.playerAvatar||null)!==saved.fingerprint){
       invalidate();return {ok:false,code:'local-changed'};
     }
     const action=planner.explicitChoice(saved.review,choice);
     if(!action.ok)return {ok:false,code:action.code};
     const {uid,ticket,client}=saved;
     if(action.kind==='server-save'){
       const response=await client.save(action.avatar,action.expectedRevision);
       if(!current(ticket,uid))return {ok:false,code:'stale-account'};
       invalidate(); // A 409 always requires a fresh explicit user choice.
       return response.ok?
         {ok:true,kind:'saved-server',revision:response.revision}:
         {ok:false,code:response.code||'save-failed',
          revision:response.revision??null};
     }
     // A validated local write is allowed ONLY by explicit use-server action.
     // Upload selections are never replaced, even when a request races.
     if(!current(ticket,uid))return {ok:false,code:'stale-account'};
     if(typeof applyLocal!=='function')return {ok:false,code:'not-configured'};
     const applied=applyLocal(action.avatar,uid);
     invalidate();
     return applied===true?{ok:true,kind:'saved-device'}:
       {ok:false,code:'local-write-refused'};
   }
   return Object.freeze({inspect,resolve,invalidate});
 }
 return Object.freeze({create});
});
