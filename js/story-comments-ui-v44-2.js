/* DUDU V44.2 · compact story/chapter discussion.
 * Sandbox-only view. Use textContent for all UGC (no HTML injection).
 */
(function(root){
 'use strict';
 const R=()=>root.DuduStoryCommentsV442;
 const el=(tag,klass,text)=>{
  const n=document.createElement(tag);
  if(klass)n.className=klass;
  if(text!==undefined)n.textContent=String(text);
  return n;
 };
 const date=t=>{try{return new Intl.DateTimeFormat('vi-VN',
  {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(t))}
  catch(_){return ''}};
 let inReply=null;
 function render({host,storyId,chapterId=null,storyTitle='',chapterTitle='',
  uid,name,state=null,onSave,isSandbox=false,giftChoices=[]}={}){
  if(!host||!R())return false;
  const rule=R(), old=host.querySelector('.dudu-v442-shell');
  const expanded=!!old?.open;
  host.replaceChildren();
  if(!storyId||!isSandbox){host.hidden=true;return false}
  host.hidden=false;
  const comments=rule.visible(state,storyId,chapterId,uid);
  const thread=$=>(comments.filter(x=>x.parentId===$));
  const rootComments=comments.filter(x=>!x.parentId);
  const shell=el('details','dudu-v442-shell');
  shell.open=expanded;
  const head=el('summary','dudu-v442-header');
  head.append(el('span','','🔒 '+(chapterId?'Nhật ký bình luận chương riêng':'Nhật ký bình luận truyện riêng')),
   el('small','',comments.length+' bình luận · Mở / đóng'));
  shell.append(head);
  const content=el('div','dudu-v442-content');
  const scope=el('div','dudu-v442-scope',
   chapterId?(chapterTitle||'Chương truyện'):(storyTitle||'Tác phẩm'));
  content.append(scope);
  const dev=el('p','dudu-v442-local-warning',
   'Đây là nhật ký bình luận riêng của tài khoản, không đồng bộ cho testA/testB. Hãy sử dụng mục “Bình luận chung Pilot” bên trên để cả hai tài khoản cùng xem.');
  content.append(dev);
  const notifications=rule.inbox(state,uid);
  if(notifications.length){
   const unread=notifications.filter(x=>!x.read).length;
   const inbox=el('details','dudu-v442-notices');
   inbox.append(el('summary','', '🔔 Phản hồi của bạn · '+unread+' mới'));
   for(const n of notifications.slice(0,8)){
    const text=rule.normalize(state).comments.find(c=>c.id===n.commentId)?.text;
    inbox.append(el('p','',text?'↪ '+text:'Một phản hồi đã bị ẩn'));
   }
   if(unread){
    const mark=el('button','dudu-v442-small','Đã xem');
    mark.type='button';mark.addEventListener('click',()=>{
     const result=rule.markRead({state,uid});
     if(result.ok)onSave?.(result.state);
    });inbox.append(mark);
   }
   content.append(inbox);
  }
  function send(parentId,textarea,button,attach=null){
   if(!uid){status.textContent='Đăng nhập Sandbox trước khi viết.';return}
   const id='comment-'+(root.crypto?.randomUUID?.()||
    Date.now()+'-'+Math.random().toString(36).slice(2));
   const result=rule.post({state,uid,name,storyId,chapterId,parentId,
    text:textarea.value,id,now:Date.now()});
   if(!result.ok){
    status.textContent=result.reason==='cooldown'?'Chờ 45 giây giữa hai bình luận.':
     result.reason==='daily-limit'?'Hôm nay bạn đã bình luận đủ 20 lần.':
     result.reason==='gift-transfer-disabled'?'Chưa mở tặng quà thật.':
     'Nội dung không hợp lệ (2–600 ký tự) hoặc bình luận đã đầy.';
    return;
   }
   const ok=onSave?.(result.state,attach?{
    commentId:result.comment.id,itemInstanceId:attach
   }:null);
   if(ok===false){
    status.textContent='Không thể ghi thiệp quà; bình luận chưa được lưu.';
    return;
   }
   textarea.value='';inReply=null;button.disabled=true;
  }
  const status=el('p','dudu-v442-status');status.setAttribute('role','status');
  const composer=el('form','dudu-v442-form');
  const field=el('textarea','dudu-v442-input');
  field.maxLength=rule.MAX_TEXT;field.rows=2;
  field.placeholder=uid?'Cảm nhận của bạn về '+(chapterId?'chương này':'truyện này')+'…':
   'Đăng nhập Sandbox để viết bình luận';
  field.disabled=!uid;
  const actions=el('div','dudu-v442-actions');
  // V44.3.1: one compact picker outside the reading layout. Never dump
  // hundreds of owned item names inside a native <select> or a full-height panel.
  let selectedGiftId=null;
  const gift=el('button','dudu-v442-gift','🎁 Đính kèm');
  gift.type='button';gift.disabled=!uid||!giftChoices.length;
  gift.title=giftChoices.length?
   'Mở cửa sổ tìm và chọn quà trong Kho Sandbox':
   'Không có vật phẩm phù hợp hoặc bạn chưa đăng nhập';
  const selectedCard=el('div','dudu-v4431-attached-chip');
  selectedCard.hidden=true;
  const selectedText=el('span','dudu-v4431-attached-name');
  const changeGift=el('button','dudu-v4431-chip-edit','Đổi');
  changeGift.type='button';
  const removeGift=el('button','dudu-v4431-chip-remove','×');
  removeGift.type='button';removeGift.setAttribute('aria-label','Bỏ vật phẩm đính kèm');
  const selectGift=()=>{
   if(!root.DuduGiftPickerV4431||!giftChoices.length)return;
   gift.setAttribute('aria-expanded','true');
   root.DuduGiftPickerV4431.open({choices:giftChoices,
    selectedInstanceId:selectedGiftId,
    onChoose(instanceId,row){
     selectedGiftId=instanceId;
     selectedText.textContent=row.icon+' '+row.name+' ×1 · Thiệp Sandbox';
     selectedCard.hidden=false;
     gift.textContent='🎁 Đã chọn quà';
     gift.setAttribute('aria-expanded','false');
    },
    onClose(){gift.setAttribute('aria-expanded','false')}
   });
  };
  gift.addEventListener('click',selectGift);
  changeGift.addEventListener('click',selectGift);
  removeGift.addEventListener('click',()=>{
   selectedGiftId=null;selectedCard.hidden=true;gift.textContent='🎁 Đính kèm';
  });
  selectedCard.append(selectedText,changeGift,removeGift);
  gift.setAttribute('aria-expanded','false');
  const publish=el('button','dudu-v442-publish','Lưu bình luận riêng');
  publish.type='submit';publish.disabled=!uid;
  actions.append(gift,publish);
  composer.append(field,actions,selectedCard,status);
  composer.addEventListener('submit',e=>{
   e.preventDefault();
   send(null,field,publish,selectedGiftId);
  });
  content.append(composer);
  const list=el('div','dudu-v442-list');
  if(!rootComments.length)list.append(el('p','dudu-v442-empty',
   'Chưa có bình luận trong mục này. Hãy để lại cảm nhận đầu tiên.'));
  function card(comment,nested=false){
   const item=el('article','dudu-v442-item'+(nested?' nested':''));
   item.dataset.commentId=comment.id;
   const meta=el('div','dudu-v442-meta');
   meta.append(el('strong','',comment.name),el('small','',date(comment.createdAt)));
   item.append(meta,el('p','dudu-v442-text',comment.text));
   if(comment.gift?.deliveryStatus==='LOCAL_JOURNAL_ONLY'){
    const badge=el('div','dudu-v443-attached-gift',
      (comment.gift.icon||'🎁')+' '+comment.gift.itemName+
      ' · Thiệp ủng hộ Sandbox');
    badge.title='Chưa giao đến tác giả; chỉ ghi trong nhật ký riêng.';
    item.append(badge);
   }
   const bar=el('div','dudu-v442-action-bar');
   if(!nested){
    const reply=el('button','dudu-v442-small','↪ Trả lời');
    reply.type='button';reply.addEventListener('click',()=>{
     inReply=inReply===comment.id?null:comment.id;
     render({host,storyId,chapterId,storyTitle,chapterTitle,uid,name,state,
      onSave,isSandbox,giftChoices});
    });bar.append(reply);
   }
   if(comment.uid===uid){
    const hide=el('button','dudu-v442-small','Ẩn của tôi');
    hide.type='button';hide.addEventListener('click',()=>{
     const x=rule.hide({state,uid,commentId:comment.id});
     if(x.ok)onSave?.(x.state);
    });bar.append(hide);
   }else if(uid){
    const reportBtn=el('button','dudu-v442-small','Báo cáo');
    reportBtn.type='button';
    reportBtn.addEventListener('click',()=>{
     const form=item.querySelector('.dudu-v442-report');
     if(form)form.hidden=!form.hidden;
    });
    bar.append(reportBtn);
    const reasonBox=el('div','dudu-v442-report');reasonBox.hidden=true;
    const choice=el('select','dudu-v442-reason');
    for(const [code,label] of [['SPAM','Spam'],['HARASSMENT','Quấy rối'],
     ['SPOILER','Tiết lộ nội dung'],['OTHER','Khác']]){
     const o=el('option','',label);o.value=code;choice.append(o);
    }
    const action=el('button','dudu-v442-small','Ghi báo cáo');
    action.type='button';action.addEventListener('click',()=>{
     const x=rule.report({state,uid,commentId:comment.id,reason:choice.value});
     if(x.ok)onSave?.(x.state);
     else status.textContent=x.reason==='already-reported'?
      'Bạn đã báo cáo bình luận này.':'Không thể ghi báo cáo thử.';
    });
    reasonBox.append(choice,action);item.append(reasonBox);
   }
   item.append(bar);
   if(inReply===comment.id){
    const replyForm=el('form','dudu-v442-reply-form');
    const response=el('textarea','dudu-v442-input');
    response.maxLength=rule.MAX_TEXT;response.rows=2;
    response.placeholder='Viết phản hồi…';response.disabled=!uid;
    const submit=el('button','dudu-v442-publish','Gửi phản hồi');
    submit.type='submit';submit.disabled=!uid;
    replyForm.append(response,submit);
    replyForm.addEventListener('submit',e=>{
     e.preventDefault();send(comment.id,response,submit);
    });
    item.append(replyForm);
   }
   return item;
  }
  for(const original of rootComments.slice(-40)){
   const c=card(original);
   for(const child of thread(original.id))c.append(card(child,true));
   list.append(c);
  }
  content.append(list);
  content.append(el('small','dudu-v442-footer',
   'Tối đa 20 bình luận/ngày · cách nhau 45 giây. Thiệp quà chỉ ở Sandbox, không phải quà gửi tác giả thật. Báo cáo chưa gửi quản trị viên.'));
  shell.append(content);
  host.append(shell);
  return true;
 }
 root.DuduStoryCommentsUIV442=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
