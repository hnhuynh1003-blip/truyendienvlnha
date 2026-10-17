/* V44.0 server-only preflight gateway.
 * Reads its evidence from trusted server adapters, not submitted browser item
 * data, story owner fields, UI roles, Firebase profile inventory or proofs.
 * Does not consume or grant anything. No public route is installed yet.
 */
import {quoteGift,DESTINATIONS} from './gift-contract-v44.mjs';
const KEY=/^[A-Za-z0-9][A-Za-z0-9_:-]{0,159}$/;
const ALLOWED=new Set(['destination','storyId','chapterId','itemInstanceId','note']);
const fail=reason=>({ok:false,reason});
export function parseGiftRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).some(k=>!ALLOWED.has(k)))return null;
 const {storyId,itemInstanceId,destination,chapterId=null,note=''}=input;
 if(typeof storyId!=='string'||!KEY.test(storyId)||
  typeof itemInstanceId!=='string'||!KEY.test(itemInstanceId)||
  !Object.values(DESTINATIONS).includes(destination)||
  (chapterId!==null&&(typeof chapterId!=='string'||!KEY.test(chapterId)))||
  typeof note!=='string'||note.trim().length>160)return null;
 return {storyId,itemInstanceId,destination,chapterId,note};
}
export async function previewGift({identity,request,source,now=Date.now()}={}){
 if(!identity||typeof identity.uid!=='string'||!identity.uid)
  return fail('unauthenticated');
 const params=parseGiftRequest(request);
 if(!params)return fail('invalid-request');
 if(!source||typeof source.getStory!=='function'||
  typeof source.getAuthorBinding!=='function'||
  typeof source.getOwnedItem!=='function'||
  typeof source.getChapter!=='function')
  return fail('trusted-source-unavailable');
 try{
  const [story,item,binding,chapter]=await Promise.all([
   source.getStory(params.storyId),
   source.getOwnedItem({uid:identity.uid,instanceId:params.itemInstanceId}),
   source.getAuthorBinding(params.storyId),
   params.chapterId?source.getChapter(params.storyId,params.chapterId):Promise.resolve(null)
  ]);
  // Protect source identity. A missing or stale trusted DB record fails closed.
  if(!story||story.id!==params.storyId)return fail('story-unavailable');
  if(!item||item.instanceId!==params.itemInstanceId)return fail('item-unavailable');
  const plan=quoteGift({senderUid:identity.uid,item,story,chapter,binding,
   destination:params.destination,note:params.note,now});
  if(!plan.ok)return plan;
  const q=plan.quote;
  // This public-safe output is a QUOTE only. It does not include UID, prove
  // ownership transfer, reserve item, escrow, mint reward or send any mail.
  return {ok:true,previewOnly:true,canTransferNow:false,
   destination:q.destination,recipientType:q.recipientType,
   storyId:q.storyId,chapterId:q.chapterId||null,
   itemId:q.itemId,instanceId:q.itemInstanceId,
   note:q.note,authorVerified:q.recipientType==='AUTHOR_UID'};
 }catch(_){return fail('trusted-source-unavailable');}
}
