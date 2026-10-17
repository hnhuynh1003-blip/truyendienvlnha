/* DUDU V44.2 · Sandbox story/chapter comments domain.
 * Account-local prototype. This is NEVER a shared comment backend or a
 * moderator authorization mechanism. No item references, escrow or rewards.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduStoryCommentsV442=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1,MAX_COMMENTS=220,MAX_TEXT=600,MIN_TEXT=2,
 COOLDOWN_MS=45*1000,MAX_DAILY=20,MAX_REPORTS=80;
 const VALID_ID=/^[\w:-]{1,160}$/;
 const REASONS=Object.freeze(['SPAM','HARASSMENT','SPOILER','OTHER']);
 const str=x=>typeof x==='string'?x:'';
 const valid=x=>typeof x==='string'&&VALID_ID.test(x);
 const day=now=>{const d=new Date(now);return Number.isFinite(d.getTime())?
  d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+
  String(d.getDate()).padStart(2,'0'):null};
 function normalize(raw){
  const state={version:VERSION,comments:[],reports:[],hidden:[],notices:[]};
  if(!raw||typeof raw!=='object'||raw.version!==VERSION)return state;
  const comments=Array.isArray(raw.comments)?raw.comments:[];
  const seen=new Set();
  for(const item of comments.slice(-MAX_COMMENTS)){
   if(!item||!valid(item.id)||seen.has(item.id)||!valid(item.storyId)||
     (item.chapterId!==null&&!valid(item.chapterId))||!valid(item.uid)||
     typeof item.text!=='string'||item.text.length>MAX_TEXT||
     item.text.trim().length<MIN_TEXT||!Number.isSafeInteger(item.createdAt)||
     item.createdAt<=0||typeof item.name!=='string')continue;
   seen.add(item.id);
   const gift=item.gift?.deliveryStatus==='LOCAL_JOURNAL_ONLY'&&
     item.gift?.recipientKind==='STORY_SANDBOX'&&valid(item.gift?.instanceId)&&
     typeof item.gift?.itemName==='string'&&item.gift.itemName.length<=80?
     {deliveryStatus:'LOCAL_JOURNAL_ONLY',recipientKind:'STORY_SANDBOX',
      instanceId:item.gift.instanceId,itemName:item.gift.itemName,
      icon:String(item.gift.icon||'🎁').slice(0,8)}:undefined;
   state.comments.push({id:item.id,storyId:item.storyId,chapterId:item.chapterId,
    parentId:valid(item.parentId)?item.parentId:null,uid:item.uid,
    name:item.name.slice(0,50),text:item.text,createdAt:item.createdAt,
    ...(gift?{gift}:{})});
  }
  state.reports=Array.isArray(raw.reports)?raw.reports.filter(x=>
   valid(x?.commentId)&&valid(x?.reporterUid)&&REASONS.includes(x?.reason)&&
   Number.isSafeInteger(x.createdAt)).slice(-MAX_REPORTS):[];
  state.hidden=Array.isArray(raw.hidden)?[...new Set(raw.hidden.filter(valid))].slice(-220):[];
  state.notices=Array.isArray(raw.notices)?raw.notices.filter(x=>
   valid(x?.id)&&valid(x?.recipientUid)&&valid(x?.commentId)&&
   valid(x?.storyId)&&Number.isSafeInteger(x.createdAt)).slice(-100):[];
  return state;
 }
 function scope(comment,storyId,chapterId){
  return comment.storyId===storyId&&comment.chapterId===chapterId;
 }
 function visible(raw,storyId,chapterId=null,uid=null){
  const state=normalize(raw);
  if(!valid(storyId)||(chapterId!==null&&!valid(chapterId)))return [];
  const allowed=state.comments.filter(x=>scope(x,storyId,chapterId)&&
   !(x.uid===uid&&state.hidden.includes(x.id)));
  return allowed.filter(x=>!x.parentId||allowed.some(p=>p.id===x.parentId))
   .sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
 }
 function post({state:raw,uid,name,storyId,chapterId=null,parentId=null,
  text,id,now=Date.now(),attachment=null}={}){
  const state=normalize(raw);
  if(!valid(uid)||!valid(id)||!valid(storyId)||
   (chapterId!==null&&!valid(chapterId))||
   !Number.isSafeInteger(now)||now<=0||typeof text!=='string'||
   text.trim().length<MIN_TEXT||text.trim().length>MAX_TEXT||
   /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
   return {ok:false,reason:'invalid-comment'};
  if(attachment!==null)return {ok:false,reason:'gift-transfer-disabled'};
  if(state.comments.some(c=>c.id===id))return {ok:false,reason:'duplicate'};
  if(state.comments.length>=MAX_COMMENTS)return {ok:false,reason:'storage-full'};
  if(state.comments.filter(x=>x.uid===uid&&day(x.createdAt)===day(now)).length>=MAX_DAILY)
   return {ok:false,reason:'daily-limit'};
  const previous=state.comments.filter(x=>x.uid===uid&&x.createdAt<=now)
   .sort((a,b)=>b.createdAt-a.createdAt)[0];
  if(previous&&now-previous.createdAt<COOLDOWN_MS)return {ok:false,reason:'cooldown'};
  let parent=null;
  if(parentId!==null){
   parent=state.comments.find(c=>c.id===parentId);
   if(!parent||!scope(parent,storyId,chapterId)||parent.parentId)
    return {ok:false,reason:'invalid-parent'};
  }
  const comment={id,storyId,chapterId,parentId,uid,
   name:str(name).trim().slice(0,50)||'Độc giả',
   text:text.trim(),createdAt:now};
  const notices=[...state.notices];
  if(parent&&parent.uid!==uid)notices.push({
   id:'reply-'+id,recipientUid:parent.uid,commentId:id,
   storyId,chapterId,createdAt:now,read:false
  });
  return {ok:true,comment,state:{...state,comments:[...state.comments,comment],
   notices:notices.slice(-100)}};
 }
 // Pure receipt link for local Sandbox journal only. Does NOT mean that a
 // message, item or notification reached another account or author.
 function attachLocalGift({state:raw,commentId,item}={}){
  const state=normalize(raw);
  const row=state.comments.find(x=>x.id===commentId);
  if(!row||row.gift||!item||!valid(item.instanceId)||
    typeof item.name!=='string'||item.name.length>80)
   return {ok:false,reason:'invalid-local-gift'};
  const gift={deliveryStatus:'LOCAL_JOURNAL_ONLY',
    recipientKind:'STORY_SANDBOX',instanceId:item.instanceId,
    itemName:item.name,icon:String(item.icon||'🎁').slice(0,8)};
  return {ok:true,state:{...state,comments:state.comments.map(x=>
    x.id===commentId?{...x,gift}:x)}};
 }
 function report({state:raw,uid,commentId,reason,now=Date.now()}={}){
  const state=normalize(raw);
  if(!valid(uid)||!valid(commentId)||!REASONS.includes(reason)||
   !Number.isSafeInteger(now)||now<=0)return {ok:false,reason:'invalid-report'};
  const comment=state.comments.find(x=>x.id===commentId);
  if(!comment)return {ok:false,reason:'not-found'};
  if(comment.uid===uid)return {ok:false,reason:'own-comment'};
  if(state.reports.some(x=>x.commentId===commentId&&x.reporterUid===uid))
   return {ok:false,reason:'already-reported'};
  if(state.reports.length>=MAX_REPORTS)return {ok:false,reason:'report-limit'};
  return {ok:true,state:{...state,reports:[...state.reports,
   {commentId,reporterUid:uid,reason,createdAt:now}]}};
 }
 function hide({state:raw,uid,commentId}={}){
  const state=normalize(raw),comment=state.comments.find(x=>x.id===commentId);
  if(!valid(uid)||!comment||comment.uid!==uid)return {ok:false,reason:'not-owner'};
  return {ok:true,state:{...state,hidden:[...new Set([...state.hidden,commentId])].slice(-220)}};
 }
 function inbox(raw,uid){
  const s=normalize(raw);
  return valid(uid)?s.notices.filter(x=>x.recipientUid===uid)
   .sort((a,b)=>b.createdAt-a.createdAt):[];
 }
 function markRead({state:raw,uid}={}){
  const s=normalize(raw);
  if(!valid(uid))return {ok:false,reason:'unauthenticated'};
  return {ok:true,state:{...s,notices:s.notices.map(n=>
   n.recipientUid===uid?{...n,read:true}:n)}};
 }
 return Object.freeze({VERSION,MAX_TEXT,MAX_DAILY,COOLDOWN_MS,REASONS,
  normalize,visible,post,attachLocalGift,report,hide,inbox,markRead});
});
