/* DUDU V44.0 — server-side gift/author ownership contract.
 * Pure reviewable rules. No public endpoint, item minting, Firebase writes,
 * client-provided recipient UID, settlement or storage mutations.
 * Transaction adapter and trusted issuer are prerequisites to activation.
 */
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const KEY=/^[A-Za-z0-9][A-Za-z0-9_:-]{0,159}$/;
const REALMS=new Set(['URBAN','APOCALYPSE','CULTIVATION','FANTASY','SCIFI','HORROR']);
export const DESTINATIONS=Object.freeze({
 AUTHOR:'AUTHOR',STORY:'STORY',CHAPTER:'CHAPTER',NPC:'NPC'
});
export const STAGES=Object.freeze({
 PENDING:'PENDING',ACCEPTED:'ACCEPTED',DECLINED:'DECLINED',
 RETURNED:'RETURNED',CANCELLED:'CANCELLED',EXPIRED:'EXPIRED'
});
const reject=(reason)=>Object.freeze({ok:false,reason});
const id=x=>typeof x==='string'&&KEY.test(x);
const uid=x=>typeof x==='string'&&UID.test(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const cleanNote=x=>typeof x==='string'&&x.trim().length<=160&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
function trustedBinding(story,binding){
 return plain(story)&&story.status==='PUBLISHED'&&id(story.id)&&
  plain(binding)&&binding.source==='SERVER_AUTHOR_REGISTRY'&&
  binding.status==='VERIFIED'&&binding.storyId===story.id&&
  uid(binding.ownerUid)&&integer(binding.revision)&&binding.revision>0;
}
function recipient({destination,story,chapter,binding,npc}={}){
 if(!Object.values(DESTINATIONS).includes(destination))
  return reject('invalid-destination');
 if(!plain(story)||!id(story.id)||story.status!=='PUBLISHED')
  return reject('story-unavailable');
 if(destination===DESTINATIONS.AUTHOR){
  if(!trustedBinding(story,binding))return reject('author-unverified');
  return Object.freeze({ok:true,destination,recipientType:'AUTHOR_UID',
   recipientKey:binding.ownerUid,storyId:story.id,authorBindingRevision:binding.revision});
 }
 if(destination===DESTINATIONS.NPC)
  return reject('npc-gift-separate-workflow');
 if(destination===DESTINATIONS.CHAPTER){
  if(!plain(chapter)||!id(chapter.id)||chapter.storyId!==story.id||
   chapter.status!=='PUBLISHED')return reject('chapter-unavailable');
  return Object.freeze({ok:true,destination,recipientType:'CHAPTER_VAULT',
   recipientKey:story.id+'::'+chapter.id,storyId:story.id,chapterId:chapter.id});
 }
 return Object.freeze({ok:true,destination,recipientType:'STORY_VAULT',
  recipientKey:story.id,storyId:story.id});
}
export function quoteGift({senderUid,item,story,chapter,binding,destination,
  note='',now=Date.now()}={}){
 if(!uid(senderUid))return reject('sender-unauthenticated');
 if(!Number.isSafeInteger(now)||now<=0||!cleanNote(note))return reject('invalid-request');
 // item MUST come from a trusted server instance registry. Browser inventory,
 // quest rewards, localStorage, asset names and self-supplied "ownerUid" fail.
 if(!plain(item)||item.source!=='SERVER_ITEM_LEDGER'||
  !id(item.instanceId)||!id(item.id)||!uid(item.ownerUid)||
  item.ownerUid!==senderUid||item.status!=='OWNED')
  return reject('not-server-owned');
 if(item.locked===true||item.giftable!==true||item.transferable!==true||
  item.unique===true||item.scope==='DUDU'||item.scope==='FUNCTIONAL')
  return reject('non-transferable');
 if(!['COMMON','REALM','STORY','CHAPTER'].includes(item.scope))
  return reject('unknown-scope');
 const target=recipient({destination,story,chapter,binding});
 if(!target.ok)return target;
 if(target.recipientType==='AUTHOR_UID'&&target.recipientKey===senderUid)
  return reject('self-gift');
 if(item.scope==='REALM'){
  if(!REALMS.has(item.realmTag)||!id(item.originStoryId)||
   item.originStoryId!==story.id||!id(item.originChapterId)||
   !plain(chapter)||chapter.id!==item.originChapterId||
   chapter.storyId!==story.id||chapter.status!=='PUBLISHED'||
   (chapter.realmTag||story.realmTag)!==item.realmTag)
   return reject('realm-source-mismatch');
 }
 if(item.scope==='STORY'){
  if(!id(item.originStoryId)||item.originStoryId!==story.id)
   return reject('story-source-mismatch');
 }
 if(item.scope==='CHAPTER'){
  if(!id(item.originStoryId)||item.originStoryId!==story.id||
   !id(item.originChapterId)||destination!==DESTINATIONS.CHAPTER||
   !plain(chapter)||chapter.id!==item.originChapterId||
   chapter.storyId!==story.id||chapter.status!=='PUBLISHED'||
   item.authorTransferApproval!==true)
   return reject('chapter-transfer-locked');
 }
 return Object.freeze({ok:true,quote:Object.freeze({
   senderUid,itemInstanceId:item.instanceId,itemId:item.id,
   originalScope:item.scope,originStoryId:item.originStoryId||null,
   originChapterId:item.originChapterId||null,
   ...target,recipientKey:target.recipientKey,
   note:note.trim(),createdAt:now,status:STAGES.PENDING
 })});
}
export function transition({receipt,action,actorUid,now=Date.now()}={}){
 if(!plain(receipt)||!id(receipt.transferId)||!uid(receipt.senderUid)||
  !Object.values(DESTINATIONS).includes(receipt.destination)||
  !Object.values(STAGES).includes(receipt.status)||
  !Number.isSafeInteger(now)||now<=0)return reject('invalid-receipt');
 if(!['ACCEPT','DECLINE','RETURN','CANCEL','EXPIRE'].includes(action))
  return reject('invalid-action');
 if(!uid(actorUid)&&action!=='EXPIRE')return reject('actor-unauthenticated');
 if(receipt.status!==STAGES.PENDING){
  const completed={
   ACCEPT:STAGES.ACCEPTED,DECLINE:STAGES.DECLINED,
   RETURN:STAGES.RETURNED,CANCEL:STAGES.CANCELLED,EXPIRE:STAGES.EXPIRED
  }[action];
  if(receipt.status===completed)return {ok:true,alreadyApplied:true,receipt};
  return reject('finalized');
 }
 if(action==='CANCEL'&&actorUid!==receipt.senderUid)
  return reject('not-sender');
 if(['ACCEPT','DECLINE'].includes(action)){
  if(receipt.destination!==DESTINATIONS.AUTHOR||
   receipt.recipientType!=='AUTHOR_UID'||!uid(receipt.recipientKey)||
   actorUid!==receipt.recipientKey)return reject('not-recipient');
 }
 if(action==='RETURN')return reject('return-requires-server-worker');
 if(action==='EXPIRE')return reject('expiry-requires-server-worker');
 const status={ACCEPT:STAGES.ACCEPTED,DECLINE:STAGES.DECLINED,
  CANCEL:STAGES.CANCELLED}[action];
 return Object.freeze({ok:true,alreadyApplied:false,
  receipt:Object.freeze({...receipt,status,updatedAt:now})});
}
export function authorBindingStatus({story,binding}={}){
 return Object.freeze({verified:trustedBinding(story,binding),
  storyId:id(story?.id)?story.id:null,
  // Deliberately never return UID for public UI.
  label:trustedBinding(story,binding)?'Tác giả đã xác minh':
   'Tác giả chưa xác minh – không thể gửi quà thật'});
}
