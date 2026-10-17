/* DUDU V44.5 — visually isolated three-actor Sandbox Laboratory.
 * Only writes to dedicated localStorage key. Never uses live Firebase accounts,
 * production userProfile inventory, real mail, real XP or network APIs.
 */
(function(root){
 'use strict';
 const KEY='dudu-v445-multi-actor-lab-v1';
 let current=null,pendingReset=false,replyTo=null,lastRequest=null;
 let notice='',corrupt=false,hostElement=null;
 const model=()=>root.DuduMultiActorLabV445;
 // V44.7: keep stable internal ledger codes but display reader-friendly states.
 const GIFT_STATUS=Object.freeze({
  PENDING:'Đang chờ nhận',
  ACCEPTED:'Đã nhận',
  DECLINED:'Đã từ chối · Quà đã hoàn trả',
  CANCELLED:'Đã hủy · Quà đã hoàn trả'
 });
 const giftStatus=status=>GIFT_STATUS[status]||'Trạng thái chưa xác định';
 const el=(tag,klass,text)=>{
  const n=document.createElement(tag);
  if(klass)n.className=klass;
  if(text!==undefined)n.textContent=String(text);
  return n;
 };
 const button=(label,cls,fn)=>{
  const n=el('button',cls,label);n.type='button';
  if(fn)n.addEventListener('click',fn);
  return n;
 };
 function load(){
  if(current)return;
  const engine=model();if(!engine)return;
  try{
   const raw=localStorage.getItem(KEY);
   const stored=raw?JSON.parse(raw):null;
   if(raw&&engine.audit(stored).length){
    corrupt=true;notice='Dữ liệu phòng thử không hợp lệ. Hãy đặt lại phòng thử; Kho thật không bị ảnh hưởng.';
    return;
   }
   current=stored||engine.initial();
  }catch(e){
   corrupt=true;notice='Không đọc được phòng thử. Chỉ đặt lại dữ liệu phòng thử để phục hồi.';
  }
 }
 function dispatch(action){
  if(!current||corrupt)return;
  const result=model().run(current,action);
  if(!result.ok){
   notice='Không thực hiện: '+({
    'simulated-offline':'đang mô phỏng mất mạng.',
    'item-not-owned':'bạn không sở hữu món quà này.',
    'already-final':'quà đã được xử lý trước đó.',
    'not-allowed':'tài khoản này không có quyền xử lý.',
    'invalid-recipient':'người nhận không hợp lệ.',
    'wrong-world':'vật phẩm không thuộc thế giới thử nghiệm.',
    'invalid-parent':'chỉ được trả lời bình luận gốc.',
    'idempotency-conflict':'mã yêu cầu đã dùng cho nội dung khác.',
    'invalid-comment':'nội dung phải dài 2–300 ký tự.'
   }[result.reason]||result.reason);
   render({host:hostElement,sandbox:true});return result;
  }
  if(result.state!==current){
   try{
    localStorage.setItem(KEY,JSON.stringify(result.state));
   }catch(e){
    notice='Lưu thất bại; giao dịch KHÔNG được áp dụng. Dữ liệu cũ được giữ nguyên.';
    render({host:hostElement,sandbox:true});return {ok:false,reason:'storage-failed'};
   }
   current=result.state;
  }
  notice=result.message||'Đã xử lý';
  pendingReset=false;
  render({host:hostElement,sandbox:true});
  return result;
 }
 function reset(){
  const fresh=model().initial();
  try{
   localStorage.setItem(KEY,JSON.stringify(fresh));
  }catch(e){
   notice='Không lưu được phòng thử mới. Vui lòng kiểm tra bộ nhớ trình duyệt.';
   render({host:hostElement,sandbox:true});return false;
  }
  current=fresh;corrupt=false;pendingReset=false;replyTo=null;
  lastRequest=null;notice='Đã đặt lại duy nhất phòng thử. Kho và Xu Sandbox giữ nguyên.';
  render({host:hostElement,sandbox:true});return true;
 }
 function render({host,sandbox=false}={}){
  if(!host)return false;
  hostElement=host;
  host.replaceChildren();
  if(!sandbox||!model()){
   host.hidden=true;return false;
  }
  host.hidden=false;
  load();
  const engine=model();
  const hero=el('section','dudu-v445-hero');
  hero.append(el('strong','','🧪 PHÒNG THỬ NGHIỆM'),
   el('p','','3 nhân vật giả lập · không phải tài khoản Firebase, không phải quà thật.'));
  host.append(hero);
  const head=el('div','dudu-v445-action-bar');
  const newStart=button(pendingReset?'Xác nhận đặt lại?':'↺ Đặt lại dữ liệu thử',
   'dudu-v445-reset',()=>{
    if(!pendingReset){pendingReset=true;render({host,sandbox});return}
    reset();
   });
  head.append(newStart);
  if(pendingReset)head.append(button('Giữ dữ liệu','dudu-v445-quiet',()=>{
   pendingReset=false;render({host,sandbox});
  }));
  host.append(head);
  const feedback=el('p','dudu-v445-notice',notice||'Chọn nhân vật để thử một phiên tương tác.');
  feedback.setAttribute('role','status');
  host.append(feedback);
  if(corrupt||!current){
   host.append(el('p','dudu-v445-empty',
    'Chỉ dữ liệu phòng thử bị lỗi. Hãy chọn Đặt lại dữ liệu thử để khởi tạo lại.'));
   return true;
  }
  const profile=el('section','dudu-v445-panel');
  profile.append(el('strong','dudu-v445-subtitle','Nhập vai'));
  const users=el('div','dudu-v445-actors');
  for(const actor of engine.ACTORS){
   const act=button(actor.icon+' '+actor.name,
    'dudu-v445-actor'+(current.active===actor.id?' active':''),()=>{
     // A retry belongs to the sender who created it, not the next role.
     replyTo=null;lastRequest=null;dispatch({type:'SWITCH',actor:actor.id});
    });
   act.dataset.actor=actor.id;
   act.setAttribute('aria-pressed',String(current.active===actor.id));
   users.append(act);
  }
  profile.append(users);
  const line=el('div','dudu-v445-connectivity');
  line.append(el('span','',current.offline?
   '🔴 Mất kết nối (mô phỏng)':'🟢 Kết nối bình thường (giả lập)'));
  const connection=button(current.offline?'Kết nối lại':'Ngắt mạng',
   'dudu-v445-quiet',()=>dispatch({
    type:'SET_OFFLINE',value:!current.offline
   }));
  connection.dataset.action='offline';
  line.append(connection);profile.append(line);
  const inv=engine.inventory(current,current.active);
  const held=current.items.filter(i=>i.holderType==='ESCROW');
  const metrics=el('div','dudu-v445-metrics');
  metrics.append(el('span','','🎒 '+inv.length+' món'),
   el('span','','🔒 '+held.length+' ký gửi'),
   el('span','','💬 '+current.comments.length+' bình luận'));
  profile.append(metrics);
  host.append(profile);

  const discussion=el('section','dudu-v445-panel');
  discussion.append(el('strong','dudu-v445-subtitle','💬 '+engine.STORY.title));
  const commentList=el('div','dudu-v445-comments');
  if(!current.comments.length)commentList.append(el('p','dudu-v445-empty',
   'Chưa có bình luận. Độc giả A có thể bắt đầu kèm quà.'));
  for(const c of current.comments){
   const card=el('article','dudu-v445-comment'+(c.parentId?' nested':''));
   card.append(el('strong','',engine.tagOf(c.authorId)),
    el('p','',c.text));
   const gift=current.transfers.find(t=>t.commentId===c.id);
   if(gift)card.append(el('small','',
    gift.itemIcon+' '+gift.itemName+' · '+giftStatus(gift.status)+' · '+engine.tagOf(gift.recipientId)));
   if(!c.parentId){
    const reply=button('↪ Trả lời','dudu-v445-reply',()=>{
     replyTo=c.id;render({host,sandbox});
    });
    reply.dataset.reply=c.id;card.append(reply);
   }
   commentList.append(card);
  }
  discussion.append(commentList);
  const form=el('form','dudu-v445-composer');
  const replying=current.comments.find(c=>c.id===replyTo);
  if(replying){
   const label=el('div','dudu-v445-replyto',
    '↪ Đang trả lời '+engine.tagOf(replying.authorId));
   label.append(button('×','dudu-v445-quiet',()=>{
    replyTo=null;render({host,sandbox});
   }));
   form.append(label);
  }
  const field=el('textarea','dudu-v445-input');
  field.rows=2;field.maxLength=300;
  field.placeholder='Viết bình luận để thử gửi giữa các nhân vật…';
  field.setAttribute('aria-label','Nội dung bình luận thử nghiệm');
  form.append(field);
  const sendOptions=el('div','dudu-v445-send-options');
  const selectGift=el('select','dudu-v445-select');
  selectGift.setAttribute('aria-label','Chọn quà thử nghiệm');
  const blank=el('option','','Không kèm quà');blank.value='';
  selectGift.append(blank);
  for(const item of inv){
   const opt=el('option','',item.icon+' '+item.name);
   opt.value=item.instanceId;selectGift.append(opt);
  }
  const selectRecipient=el('select','dudu-v445-select');
  selectRecipient.setAttribute('aria-label','Người nhận quà thử nghiệm');
  for(const actor of engine.ACTORS.filter(a=>a.id!==current.active)){
   const opt=el('option','',actor.name);opt.value=actor.id;
   if(actor.id==='AUTHOR')opt.selected=true;
   selectRecipient.append(opt);
  }
  sendOptions.append(selectGift,selectRecipient);form.append(sendOptions);
  const send=button('Gửi bình luận thử','dudu-v445-primary');
  send.type='submit';send.dataset.action='send';send.disabled=current.offline;
  form.append(send);
  form.addEventListener('submit',e=>{
   e.preventDefault();
   const request={type:'POST',requestId:'lab-request-'+(
    root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),
    text:field.value,parentId:replying?.id||null,
    instanceId:selectGift.value||null,recipientId:selectRecipient.value};
   const result=dispatch(request);
   if(result.ok){lastRequest=request;replyTo=null;render({host,sandbox});}
  });
  discussion.append(form);
  if(lastRequest){
   const retry=button('↺ Thử gửi lại cùng mã','dudu-v445-quiet',()=>{
    dispatch({...lastRequest});
   });
   retry.dataset.action='retry';
   discussion.append(retry);
  }
  host.append(discussion);

  const inbox=el('section','dudu-v445-panel');
  inbox.append(el('strong','dudu-v445-subtitle','💌 Thư đến · '+engine.tagOf(current.active)));
  const received=engine.inbox(current,current.active);
  if(!received.length)inbox.append(el('p','dudu-v445-empty','Chưa có quà gửi đến.'));
  for(const gift of received){
   const entry=el('article','dudu-v445-mail');
   entry.append(el('strong','',
    gift.itemIcon+' '+gift.itemName+' · '+giftStatus(gift.status)),
    el('small','','Từ '+engine.tagOf(gift.senderId)));
   if(gift.status==='PENDING'){
    const ops=el('div','dudu-v445-mail-actions');
    for(const [act,label] of [['ACCEPT','Nhận quà'],['DECLINE','Từ chối']]){
     const btn=button(label,act==='ACCEPT'?'dudu-v445-primary':'dudu-v445-quiet',
      ()=>dispatch({type:'DECIDE',decision:act,transferId:gift.id}));
     btn.dataset.decision=act;btn.disabled=current.offline;ops.append(btn);
    }
    entry.append(ops);
   }
   inbox.append(entry);
  }
  host.append(inbox);
  const sent=engine.outgoing(current,current.active);
  const out=el('section','dudu-v445-panel');
  out.append(el('strong','dudu-v445-subtitle','📤 Quà đã gửi · '+sent.length));
  if(!sent.length)out.append(el('p','dudu-v445-empty','Chưa có giao dịch gửi.'));
  for(const gift of sent){
   const card=el('article','dudu-v445-mail');
   card.append(el('strong','',gift.itemIcon+' '+gift.itemName+' · '+giftStatus(gift.status)),
    el('small','','Đến '+engine.tagOf(gift.recipientId)));
   if(gift.status==='PENDING'){
    const cancel=button('Hủy và nhận lại','dudu-v445-quiet',()=>dispatch({
     type:'DECIDE',decision:'CANCEL',transferId:gift.id
    }));
    cancel.dataset.decision='CANCEL';
    cancel.disabled=current.offline;card.append(cancel);
   }
   out.append(card);
  }
  host.append(out);

  const footer=el('section','dudu-v445-panel');
  const errors=engine.audit(current);
  const auditRow=el('div','dudu-v445-audit');
  auditRow.append(el('strong','',errors.length?'⚠ '+errors.length+' lỗi dữ liệu':
   '✓ Kiểm tra toàn vẹn: 0 lỗi'),
   el('small','','Đã lưu '+current.revision+' thao tác. Tải lại trang vẫn giữ phòng thử.'));
  footer.append(auditRow);
  const history=el('details','dudu-v445-history');
  history.append(el('summary','','Nhật ký mô phỏng ('+current.events.length+')'));
  for(const event of current.events.slice().reverse().slice(0,8)){
   history.append(el('p','',engine.tagOf(event.actor)+' · '+event.message));
  }
  footer.append(history,
   el('small','dudu-v445-caution',
    'Dữ liệu chỉ nằm trong dudu-v445-multi-actor-lab-v1. Không chuyển vào Kho, Xu, hồ sơ Firebase, bình luận thật hoặc Hộp thư tác giả.'));
  host.append(footer);
  return true;
 }
 root.DuduMultiActorLabUIV445=Object.freeze({render,reset,dispatch,key:KEY});
})(typeof window!=='undefined'?window:{});
