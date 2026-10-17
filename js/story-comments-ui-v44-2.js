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
  uid,name,state=null,onSave,isSandbox=false}={}){
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
  head.append(el('span','','💬 '+(chapterId?'Bình luận chương':'Bình luận truyện')),
   el('small','',comments.length+' bình luận · Mở / đóng'));
  shell.append(head);
  const content=el('div','dudu-v442-content');
  const scope=el('div','dudu-v442-scope',
   chapterId?(chapterTitle||'Chương truyện'):(storyTitle||'Tác phẩm'));
  content.append(scope);
  const dev=el('p','dudu-v442-local-warning',
   'Bản thử nghiệm riêng tư trên thiết bị. Bình luận, báo cáo và thông báo chưa xuất hiện với tài khoản khác.');
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
  function send(parentId,textarea,button){
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
   textarea.value='';inReply=null;button.disabled=true;
   onSave?.(result.state);
  }
  const status=el('p','dudu-v442-status');status.setAttribute('role','status');
  const composer=el('form','dudu-v442-form');
  const field=el('textarea','dudu-v442-input');
  field.maxLength=rule.MAX_TEXT;field.rows=2;
  field.placeholder=uid?'Cảm nhận của bạn về '+(chapterId?'chương này':'truyện này')+'…':
   'Đăng nhập Sandbox để viết bình luận';
  field.disabled=!uid;
  const actions=el('div','dudu-v442-actions');
  const gift=el('button','dudu-v442-gift','🎁 Đính kèm quà');
  gift.type='button';gift.disabled=true;
  gift.title='V44.3: chỉ mở sau khi xác minh quyền sở hữu và hộp thư tác giả';
  const publish=el('button','dudu-v442-publish','Đăng thử');
  publish.type='submit';publish.disabled=!uid;
  actions.append(gift,publish);
  composer.append(field,actions,status);
  composer.addEventListener('submit',e=>{
   e.preventDefault();send(null,field,publish);
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
   const bar=el('div','dudu-v442-action-bar');
   if(!nested){
    const reply=el('button','dudu-v442-small','↪ Trả lời');
    reply.type='button';reply.addEventListener('click',()=>{
     inReply=inReply===comment.id?null:comment.id;
     render({host,storyId,chapterId,storyTitle,chapterTitle,uid,name,state,onSave,isSandbox});
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
   'Đăng tối đa 20 bình luận/ngày, cách nhau 45 giây; không kèm vật phẩm thật. Đã báo cáo chỉ là ghi chú Sandbox, chưa gửi quản trị viên.'));
  shell.append(content);
  host.append(shell);
  return true;
 }
 root.DuduStoryCommentsUIV442=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
