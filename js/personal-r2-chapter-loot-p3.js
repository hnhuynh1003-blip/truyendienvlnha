/* P3: personal reader loot eligibility (not server attestation).
 * Personal rollout for all authenticated accounts; live account check pending.
 * No dependence on EXP rate or a new wallet. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalR2ChapterLootP3=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ENABLED=true,MIN_ACTIVE_MS=30000,STORY='r2-content-v1';
 const validId=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,119}$/.test(x);
 const validRevision=x=>typeof x==='string'&&/^r-[a-f0-9]{16,32}$/.test(x);
 const validDigest=x=>typeof x==='string'&&/^sha256-[a-f0-9]{64}$/.test(x);
 const validSource=x=>!!x&&validId(x.storyId)&&validId(x.chapterId)&&validRevision(x.revision);
 async function prepare({uid,storyId,chapterId,revision,content,cryptoApi=globalThis.crypto}={}){
  if(typeof uid!=='string'||!uid||!validSource({storyId,chapterId,revision})||
   typeof content!=='string'||content.length>420000||!cryptoApi?.subtle)throw Error('r2-loot-identity');
  const normalized=content.normalize('NFC').replace(/\s+/gu,' ').trim();
  if(!normalized)throw Error('r2-loot-identity');
  const bytes=await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(normalized));
  const digest='sha256-'+Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  if(!validDigest(digest))throw Error('r2-loot-identity');
  return Object.freeze({uid,storyId,chapterId,revision,digest});
 }
 function eligible({identity,observation,uid,storyId,chapterId,revision,mediaReady,visible,online}={}){
  const ctx=observation?.context;
  return !!(identity&&validDigest(identity.digest)&&uid===identity.uid&&
   storyId===identity.storyId&&chapterId===identity.chapterId&&revision===identity.revision&&
   ctx?.uid===uid&&ctx.storyId===storyId&&ctx.chapterId===chapterId&&
   ctx.mode==='EPUB_R2'&&ctx.revision===revision&&Number.isFinite(observation.chapterMs)&&
   observation.chapterMs>=MIN_ACTIVE_MS&&observation.active===true&&
   mediaReady===true&&visible===true&&online===true);
 }
 function source(identity){
  if(!validSource(identity)||!validDigest(identity.digest))throw Error('r2-loot-identity');
  return Object.freeze({storyId:STORY,chapterId:identity.digest,
   r2Origin:Object.freeze({storyId:identity.storyId,chapterId:identity.chapterId,revision:identity.revision})});
 }
 return Object.freeze({ENABLED,MIN_ACTIVE_MS,STORY,prepare,eligible,source,validSource,validDigest});
});
