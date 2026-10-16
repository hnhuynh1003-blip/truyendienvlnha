/* V20: explicit, offline-first avatar sync conflict planning.
 * NEVER automatically overwrite local avatars or upload photo bytes.
 * A future owner-approved UI may present this read-only plan after a
 * verified V17 server read. This module does NOT enable network sync.
 */
(function(root,factory){
 const api=factory(
   typeof module==='object'&&module.exports?
     require('./player-avatar-v16.js'):root?.DuduPlayerAvatarV16
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPlayerAvatarSyncPlanV20=api;
})(typeof window!=='undefined'?window:null,function(avatar){
 'use strict';
 const FREE=new Set(avatar.FREE.map(x=>x.id));
 const VALID_KINDS=new Set(['initials','anime','vector']);
 function normalizeRemote(remote,vectorIds){
   if(!remote||remote.ok!==true||
      !Number.isSafeInteger(remote.revision)||remote.revision<0||
      !Array.isArray(remote.availableFrames)||!remote.avatar||
      remote.uploadsEnabled===true)return null;
   const allowed=new Set(remote.availableFrames);
   const v=remote.avatar;
   if(!v||typeof v!=='object'||Array.isArray(v)||
      !VALID_KINDS.has(v.kind)||
      typeof v.frameId!=='string'||!allowed.has(v.frameId)||
      (v.kind==='anime'&&!avatar.ANIME.includes(v.presetId))||
      (v.kind==='vector'&&!vectorIds.includes(v.presetId))||
      (v.kind==='initials'&&v.presetId!==''))return null;
   return {revision:remote.revision,
     avatar:{kind:v.kind,presetId:v.presetId||'',uploadId:'',frameId:v.frameId},
     frameSupported:FREE.has(v.frameId)};
 }
 function same(a,b){
   return a.kind===b.kind&&a.frameId===b.frameId&&
     a.presetId===b.presetId&&a.uploadId===b.uploadId;
 }
 function review(localProfile,remote,{vectorIds=[]}={}){
   const current=avatar.safeState(localProfile,{vectorIds});
   const incoming=normalizeRemote(remote,vectorIds);
   if(!incoming)return Object.freeze({status:'unavailable',
     canUseServer:false,canKeepDevice:false,local:current,revision:null});
   const protectedLocal=current.kind==='upload';
   const identical=same(current,incoming.avatar);
   const status=protectedLocal?'local-photo':!incoming.frameSupported?
     'unsupported-remote-frame':identical?'identical':'conflict';
   return Object.freeze({status,revision:incoming.revision,local:current,
     remote:incoming.avatar,
     canUseServer:!protectedLocal&&incoming.frameSupported,
     canKeepDevice:!protectedLocal});
 }
 function explicitChoice(plan,choice){
   if(!plan||!Number.isSafeInteger(plan.revision))
     return Object.freeze({ok:false,code:'no-server-snapshot'});
   if(choice==='use-device'&&plan.canKeepDevice){
     const {kind,frameId,presetId}=plan.local;
     if(!VALID_KINDS.has(kind))
       return Object.freeze({ok:false,code:'photo-unsyncable'});
     return Object.freeze({ok:true,kind:'server-save',
       expectedRevision:plan.revision,
       avatar:Object.freeze({kind,frameId,presetId})});
   }
   if(choice==='use-server'&&plan.canUseServer)
     return Object.freeze({ok:true,kind:'local-write',
       avatar:Object.freeze({...plan.remote})});
   return Object.freeze({ok:false,code:'requires-explicit-compatible-choice'});
 }
 return Object.freeze({review,explicitChoice});
});
