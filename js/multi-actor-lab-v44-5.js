/* DUDU V44.5 — strictly isolated multi-actor Sandbox Pilot Lab.
 * Three fictional actors, private localStorage ONLY in its UI module. No
 * Firebase UID, verified collectible, userProfile, currency or worker writes.
 * The domain is a deterministic single-writer simulation, not production auth.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduMultiActorLabV445=api;
})(typeof window!=='undefined'?window:null,function(catalog){
 'use strict';
 const VERSION=1,MAX_COMMENTS=100,MAX_TRANSFERS=100;
 const ACTORS=Object.freeze([
  Object.freeze({id:'A',name:'Độc giả A',icon:'👩'}),
  Object.freeze({id:'B',name:'Độc giả B',icon:'👨'}),
  Object.freeze({id:'AUTHOR',name:'Tác giả (giả lập)',icon:'✍️'})
 ]);
 const STORY=Object.freeze({id:'lab-story-445',chapterId:'lab-chapter-1',
  realmTag:'CULTIVATION',ownerId:'AUTHOR',title:'Chương thử nghiệm DUDU'});
 const recipients=['A','B','AUTHOR'];
 const knownActor=x=>recipients.includes(x);
 const safeString=x=>typeof x==='string'&&x.length>0&&x.length<=160;
 const tagOf=x=>ACTORS.find(a=>a.id===x)?.name||x;
 const normText=x=>typeof x==='string'?x.trim():'';
 const seed=[
  ['A','common-biscuit'],['A','common-biscuit'],
  ['A','common-bottled-water'],['A','cult-spirit-fragment'],
  ['B','common-biscuit'],['B','common-flashlight']
 ];
 function initial(){
  const items=seed.map(([holderId,itemId],i)=>{
   const item=catalog?.byId(itemId);
   if(!item)throw Error('V44.5 catalog seed unavailable: '+itemId);
   return {instanceId:'lab-item-'+(i+1),itemId:item.id,
    name:item.name,icon:item.icon,scope:item.scope,realmTag:item.realmTag,
    sourceStoryId:item.scope==='REALM'?STORY.id:null,
    holderType:'USER',holderId};
  });
  return {version:VERSION,revision:0,nextSeq:1,active:'A',
   offline:false,items,comments:[],transfers:[],events:[]};
 }
 const clone=x=>JSON.parse(JSON.stringify(x));
 function audit(raw){
  const errors=[];
  if(!raw||raw.version!==VERSION||!knownActor(raw.active)||
    !Number.isSafeInteger(raw.revision)||raw.revision<0||
    !Number.isSafeInteger(raw.nextSeq)||raw.nextSeq<1||
    typeof raw.offline!=='boolean'||!Array.isArray(raw.items)||
    !Array.isArray(raw.comments)||!Array.isArray(raw.transfers)||
    !Array.isArray(raw.events))return ['invalid-schema'];
  const all=new Set(),receiptIds=new Set(),requestIds=new Set(),
   commentIds=new Set(),commentRequestIds=new Set();
  for(const item of raw.items){
   if(!item||typeof item!=='object'){
    errors.push('invalid-item');continue;
   }
   if(!safeString(item?.instanceId)||all.has(item.instanceId)){
    errors.push('duplicate-or-invalid-instance');continue;
   }
   all.add(item.instanceId);
   // A laboratory item may change hands, but its issued identity and
   // source must never change. Catalog matches alone are insufficient.
   const issued=seed.findIndex((_,i)=>item.instanceId==='lab-item-'+(i+1));
   if(issued<0||seed[issued][1]!==item.itemId||
     item.sourceStoryId!==(item.scope==='REALM'?STORY.id:null))
    errors.push('invalid-seed-provenance');
   const canonical=catalog?.byId(item.itemId);
   if(!canonical||canonical.name!==item.name||canonical.icon!==item.icon||
    canonical.scope!==item.scope||canonical.realmTag!==item.realmTag)errors.push('invalid-item-definition');
   if(!['USER','ESCROW'].includes(item.holderType))errors.push('invalid-holder');
   if(item.holderType==='USER'&&!knownActor(item.holderId))
    errors.push('unknown-item-owner');
  }
  for(const comment of raw.comments){
   if(!comment||typeof comment!=='object'){
    errors.push('invalid-comment');continue;
   }
   if(!safeString(comment?.id)||commentIds.has(comment.id)||
    !knownActor(comment.authorId)||!safeString(comment.requestId)||
    commentRequestIds.has(comment.requestId)||
    comment.storyId!==STORY.id||comment.chapterId!==STORY.chapterId||
    typeof comment.text!=='string'||!comment.text.trim()||
    comment.text.length>300)errors.push('invalid-comment');
   commentIds.add(comment.id);
   commentRequestIds.add(comment.requestId);
  }
  for(const comment of raw.comments){
   if(!comment||typeof comment!=='object')continue;
   if(comment.parentId&&(!commentIds.has(comment.parentId)||
    raw.comments.find(x=>x?.id===comment.parentId)?.parentId))
    errors.push('invalid-reply');
  }
  for(const transfer of raw.transfers){
   if(!transfer||typeof transfer!=='object'){
    errors.push('invalid-receipt');continue;
   }
   if(!safeString(transfer?.id)||receiptIds.has(transfer.id)||
    !knownActor(transfer.senderId)||!knownActor(transfer.recipientId)||
    transfer.senderId===transfer.recipientId||
    !['PENDING','ACCEPTED','DECLINED','CANCELLED'].includes(transfer.status)||
    !safeString(transfer.requestId)||requestIds.has(transfer.requestId)||
    !commentIds.has(transfer.commentId))errors.push('invalid-receipt');
   receiptIds.add(transfer.id);requestIds.add(transfer.requestId);
   const comment=raw.comments.find(c=>c.id===transfer.commentId);
   if(!comment||comment.authorId!==transfer.senderId||
      comment.requestId!==transfer.requestId)
    errors.push('invalid-transfer-comment-link');
   const item=raw.items.find(x=>x?.instanceId===transfer.instanceId);
   if(!item){errors.push('receipt-item-missing');continue}
   if(transfer.status==='PENDING'&&
    (item.holderType!=='ESCROW'||item.holderId!==transfer.id))
    errors.push('pending-escrow-diverged');
   if(transfer.status==='ACCEPTED'&&item.holderType==='ESCROW'&&
    item.holderId===transfer.id)errors.push('accepted-still-in-escrow');
   if(['DECLINED','CANCELLED'].includes(transfer.status)&&
    item.holderType==='ESCROW'&&item.holderId===transfer.id)
    errors.push('returned-still-in-escrow');
  }
  for(const item of raw.items){
   if(!item||typeof item!=='object')continue;
   if(item.holderType==='ESCROW'&&!raw.transfers.some(t=>
    t?.id===item.holderId&&t.instanceId===item.instanceId&&t.status==='PENDING'))
    errors.push('orphaned-escrow');
  }
  if(raw.items.length!==seed.length)errors.push('unexpected-item-count');
  if(raw.comments.length>MAX_COMMENTS||raw.transfers.length>MAX_TRANSFERS||
     raw.events.length>20)
   errors.push('limit-exceeded');
  return [...new Set(errors)];
 }
 function inventory(raw,actor){return raw.items.filter(item=>
  item.holderType==='USER'&&item.holderId===actor)}
 function inbox(raw,actor){return raw.transfers.filter(t=>t.recipientId===actor)
  .slice().reverse()}
 function outgoing(raw,actor){return raw.transfers.filter(t=>t.senderId===actor)
  .slice().reverse()}
 function reject(reason,raw){return {ok:false,reason,state:raw}}
 function success(state,message,extra={}){
  if(audit(state).length)return {ok:false,reason:'invariant-violation'};
  return {ok:true,state,message,...extra}
 }
 function run(raw,action={}){
  if(audit(raw).length)return reject('corrupt-state',raw);
  if(!action||typeof action!=='object')return reject('invalid-action',raw);
  const old=raw;
  if(action.type==='SWITCH'){
   if(!knownActor(action.actor))return reject('unknown-actor',old);
   const next=clone(old);next.active=action.actor;next.revision++;
   return success(next,'Đã chuyển sang '+tagOf(action.actor));
  }
  if(action.type==='SET_OFFLINE'){
   if(typeof action.value!=='boolean')return reject('invalid-action',old);
   const next=clone(old);next.offline=action.value;next.revision++;
   return success(next,action.value?'Đã ngắt kết nối mô phỏng.':'Đã kết nối lại.');
  }
  if(old.offline)return reject('simulated-offline',old);
  const n=clone(old),actor=old.active;
  if(action.type==='POST'){
   const text=normText(action.text);
   if(text.length<2||text.length>300)return reject('invalid-comment',old);
   if(!safeString(action.requestId))return reject('invalid-request-id',old);
   const existing=n.comments.find(c=>c.requestId===action.requestId);
   if(existing){
    const attached=n.transfers.find(t=>t.commentId===existing.id);
    const currentItem=action.instanceId||null;
    if(existing.authorId!==actor||existing.text!==text||
     (existing.parentId||null)!==(action.parentId||null)||
     (attached?.instanceId||null)!==currentItem||
     (attached?.recipientId||null)!==(currentItem?(action.recipientId||'AUTHOR'):null))
      return reject('idempotency-conflict',old);
    return {ok:true,state:old,alreadyApplied:true,message:'Đã nhận yêu cầu này trước đó; không trừ thêm vật phẩm.'};
   }
   // A retry must be recognized even after the comment quota is exhausted.
   if(n.comments.length>=MAX_COMMENTS)return reject('comment-limit',old);
   const parent=action.parentId?
    n.comments.find(c=>c.id===action.parentId):null;
   if(action.parentId&&(!parent||parent.parentId))
    return reject('invalid-parent',old);
   const itemId=action.instanceId||null;
   let item=null,recipient=null;
   if(itemId){
    recipient=action.recipientId||'AUTHOR';
    if(!knownActor(recipient)||recipient===actor)
     return reject('invalid-recipient',old);
    item=n.items.find(x=>x.instanceId===itemId);
    if(!item||item.holderType!=='USER'||item.holderId!==actor)
     return reject('item-not-owned',old);
    const canonical=catalog.byId(item.itemId);
    if(!canonical||!['COMMON','REALM'].includes(canonical.scope)||
     canonical.unique||canonical.tradeable===false||
     canonical.giftable===false||canonical.acquisition?.method==='CHAPTER_EVENT')
     return reject('item-protected',old);
    if(item.scope==='REALM'&&
     (item.realmTag!==STORY.realmTag||item.sourceStoryId!==STORY.id))
     return reject('wrong-world',old);
    if(n.transfers.length>=MAX_TRANSFERS)return reject('transfer-limit',old);
   }
   const commentId='lab-comment-'+n.nextSeq++;
   const comment={id:commentId,requestId:action.requestId,
    authorId:actor,parentId:parent?.id||null,text,
    storyId:STORY.id,chapterId:STORY.chapterId,createdSeq:n.nextSeq};
   n.comments.push(comment);
   if(item){
    const transferId='lab-transfer-'+n.nextSeq++;
    item.holderType='ESCROW';item.holderId=transferId;
    n.transfers.push({id:transferId,requestId:action.requestId,commentId,
     senderId:actor,recipientId:recipient,instanceId:item.instanceId,
     itemName:item.name,itemIcon:item.icon,status:'PENDING'});
   }
   n.revision++;
   n.events=[...n.events,{
    id:'event-'+n.nextSeq++,actor,
    message:item?'Gửi thiệp kèm quà vào ký gửi':'Đăng bình luận thử nghiệm'
   }].slice(-20);
   return success(n,item?'Bình luận đã gửi, quà đang chờ nhận (mô phỏng).':
    'Đã đăng bình luận mô phỏng.',{commentId});
  }
  if(action.type==='DECIDE'){
   const t=n.transfers.find(x=>x.id===action.transferId);
   if(!t)return reject('unknown-transfer',old);
   if(!['ACCEPT','DECLINE','CANCEL'].includes(action.decision))
    return reject('invalid-decision',old);
   if(action.decision==='CANCEL'&&actor!==t.senderId||
      action.decision!=='CANCEL'&&actor!==t.recipientId)
    return reject('not-allowed',old);
   const desired={ACCEPT:'ACCEPTED',DECLINE:'DECLINED',CANCEL:'CANCELLED'}[action.decision];
   if(t.status===desired)return {ok:true,state:old,
    alreadyApplied:true,message:'Giao dịch đã ở trạng thái này.'};
   if(t.status!=='PENDING')return reject('already-final',old);
   const item=n.items.find(x=>x.instanceId===t.instanceId);
   if(item?.holderType!=='ESCROW'||item.holderId!==t.id)
    return reject('escrow-mismatch',old);
   item.holderType='USER';
   item.holderId=desired==='ACCEPTED'?t.recipientId:t.senderId;
   t.status=desired;
   n.revision++;
   n.events=[...n.events,{id:'event-'+n.nextSeq++,actor,
    message:desired==='ACCEPTED'?'Người nhận đã nhận quà':
     desired==='DECLINED'?'Người nhận từ chối; quà được trả lại':
     'Người gửi đã hủy; quà được trả lại'}].slice(-20);
   return success(n,desired==='ACCEPTED'?'Đã nhận quà mô phỏng.':
    'Đã hoàn trả đúng vật phẩm cho người gửi.');
  }
  return reject('unknown-action',old);
 }
 return Object.freeze({VERSION,ACTORS,STORY,initial,audit,inventory,inbox,
  outgoing,run,tagOf});
});
