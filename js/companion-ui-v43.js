/* V67.2 messenger shell with V43 compatible data + rules.
 * Offline scripted replies, sandbox-only test rewards; production never grants real Xu.
 * Preserve owner-scoped history and existing controls while modernizing mobile chat.
 */
(function(root){
 'use strict';
 const rules=root.DuduCompanionRulesV43;
 const el=id=>document.getElementById(id);
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const canUse=()=>!!rules&&typeof currentUsername==='string'&&!!currentUsername&&
  (sandbox()||!!(root.DuduAuth?.isReady?.()&&root.DuduAuth.uid()===currentUsername));
 const localKey=()=>!sandbox()&&canUse()?'dudu:companion:local:v51:'+currentUsername:null;
 let shown=false,owner='';
 const create=(tag,cls,text)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);return e;
 };
 function state(){
  if(sandbox())return rules.norm(userProfile?.duduCompanionV43);
  const key=localKey();if(!key)return rules.norm(null);
  try{return rules.norm(JSON.parse(localStorage.getItem(key)||'null'));}
  catch(_){return rules.norm(null);}
 }
 function store(next){
  if(!canUse())return false;
  if(!sandbox()){
   try{localStorage.setItem(localKey(),JSON.stringify(rules.norm(next)));return true;}
   catch(_){return false;}
  }
  const before=userProfile.duduCompanionV43;
  try{
   userProfile.duduCompanionV43=rules.norm(next);
   saveCurrentAccount();return true;
  }catch(_){userProfile.duduCompanionV43=before;return false;}
 }
 function addMessage(s,role,text){
  s.messages.push({role,text:String(text).slice(0,550)});
  s.messages=s.messages.slice(-50);
 }
 function accountReady(){
  if(!canUse())return;
  const currentOwner=currentUsername;
  let s=state(),dirty=false;
  const today=rules.localDay();
  if(!s.welcomed){
   addMessage(s,'model','Chào cậu! Tớ là DUDU. Từ hôm nay tớ sẽ đồng hành cùng cậu khám phá những thế giới truyện nhé!');
   s.welcomed=true;dirty=true;
  }
  const gap=rules.distance(s.lastSeenDay,today);
  if(gap>=3&&s.lastGreetingDay!==today){
   addMessage(s,'model',gap>=7?
    'Lâu rồi cậu mới ghé. Dạo này cậu thế nào? Muốn tớ giới thiệu một truyện để đọc thư giãn không?':
    'Mấy hôm rồi không thấy cậu. Dạo này thế nào? Nếu muốn kể chuyện hoặc tìm truyện mới, tớ nghe đây.');
   s.lastGreetingDay=today;dirty=true;
  }
  if(s.lastSeenDay!==today){s.lastSeenDay=today;dirty=true;}
  if(dirty&&currentOwner===currentUsername)store(s);
  owner=currentUsername;
  if(shown)render();
  if(typeof root.duduV33Render==='function')root.duduV33Render();
 }
 function inboxSummary(){
  if(!canUse())return {text:'Hướng dẫn · Nhật ký đồng hành'};
  const s=state();
  return {text:s.messages[s.messages.length-1]?.text||'Tớ ở đây để hướng dẫn và trò chuyện với cậu.',
   count:s.messages.length};
 }
 function render(){
  const panel=el('dudu-v43-companion');if(!panel||!shown)return;
  if(!canUse()||owner!==currentUsername){hide();return;}
  const s=state(),today=rules.localDay(),list=el('dudu-v43-messages');
  if(!list)return;
  const previousScroll=list.scrollTop;
  const followBottom=list.scrollHeight-list.scrollTop-list.clientHeight<56;
  list.replaceChildren();
  const visibleMessages=s.messages.slice(-40);
  visibleMessages.forEach((msg,index)=>{
   const b=create('div','dudu-v43-bubble '+(msg.role==='user'?'is-user':'is-dudu'),msg.text);
   // Only the latest *system* answer offers a safe, explicit navigation button.
   // The chat model never chooses which app/actions execute.
   if(msg.role==='model'&&index===visibleMessages.length-1&&index>0&&
      visibleMessages[index-1]?.role==='user'){
     const action=root.DuduSystemStewardV673?.suggestedAction?.(visibleMessages[index-1].text);
     if(action){
       const go=create('button','dudu-v673-action',action.label+' ↗');
       go.type='button';go.addEventListener('click',()=>{
         root.DuduSystemStewardV673?.openSafeView?.(action.id);
       });
       b.append(go);
     }
   }
   list.append(b);
  });
  // Re-renders after check-in or system updates must not yank the reader
  // away from earlier messages unless they were already near the bottom.
  list.scrollTop=followBottom?list.scrollHeight:previousScroll;
  const dayCount=el('dudu-v43-day-count');
  if(dayCount)dayCount.textContent='🔥 '+s.login.count+' ngày điểm danh';
  const chatCount=el('dudu-v43-chat-count');
  if(chatCount)chatCount.textContent='💬 '+s.chat.count+' ngày trò chuyện';
  const button=el('dudu-v43-checkin'),info=el('dudu-v43-reward-info');
  if(button){
   const received=s.login.day===today;
   button.disabled=received;
   button.textContent=sandbox()?(received?'✓ Đã nhận quà hôm nay':'Nhận quà điểm danh'):
    (received?'✓ Đã điểm danh':'Điểm danh');
  }
  const nextDay=s.login.day===today?s.login.count:s.login.count+1;
  if(info)info.textContent=s.login.day===today?
   'Đã điểm danh hôm nay · quay lại ngày mai':
   sandbox()?'Quà dự kiến: '+rules.COIN_DAYS[(Math.max(1,nextDay)-1)%7]+' Xu thử nghiệm':'Ghi nhận kỷ niệm trên thiết bị · không phát Xu';
  const badge=el('dudu-v43-milestones');
  if(badge){
   badge.replaceChildren();
   for(const milestone of rules.MILESTONES){
    const won=s.milestones.includes(milestone.id);
    const cell=create('div','dudu-v43-milestone'+(won?' is-earned':''));
    const icon=create('span','',milestone.icon);
    const text=create('span','',milestone.name+' · '+milestone.day+' ngày');
    const stateText=create('small','',won?(sandbox()?'Đã ghi nhận (Sandbox)':'Đã ghi nhận trên thiết bị'):'Chưa đạt');
    cell.append(icon,text,stateText);badge.append(cell);
   }
  }
 }
 function open(){
  if(!canUse())return;
  accountReady();
  const app=el('phone-app-chat');if(!app||!el('dudu-v43-companion'))return;
  owner=currentUsername;shown=true;
  app.classList.add('dudu-v43-companion-open');
  document.body.classList.add('dudu-v672-chatting');
  render();
  root.DuduMessengerV672?.adjustViewport?.();
  el('dudu-v43-message-input')?.focus({preventScroll:true});
 }
 function hide(){
  shown=false;
  el('phone-app-chat')?.classList.remove('dudu-v43-companion-open');
  document.body.classList.remove('dudu-v672-chatting');
  const diary=el('dudu-v43-diary');if(diary)diary.open=false;
 }
 function back(){
  hide();
  if(typeof root.duduV33ShowInbox==='function')root.duduV33ShowInbox();
 }
 function send(){
  if(!canUse()||!shown||owner!==currentUsername)return;
  const input=el('dudu-v43-message-input');
  const message=String(input?.value||'').trim();
  if(message.length<1||message.length>500)return;
  const s=state();
  addMessage(s,'user',message);
  // V67.3: trusted read-only system topics go to DUDU Steward.
  // NPC prompts/AI and all reward/account mutations remain separate.
  const systemAnswer=root.DuduSystemStewardV673?.reply?.(message);
  const answer=typeof systemAnswer==='string'&&systemAnswer.trim()?
    systemAnswer:rules.reply(message,(novels||[]).map(n=>n.title));
  addMessage(s,'model',answer);
  const result=rules.chat(s,message);
  if(result.ok){
   // In-memory mutation to same s: only milestone/run fields are updated.
   s.chat=result.state.chat;
   s.milestones=result.state.milestones;
  }
  if(store(s)){
   input.value='';
   input.dispatchEvent(new Event('input',{bubbles:true}));
   render();
   const log=el('dudu-v43-messages');
   if(log)log.scrollTop=log.scrollHeight;
   root.duduV33Render?.();
   const status=el('dudu-v672-composer-status');
   if(status){status.textContent='Đã lưu tin nhắn trên thiết bị.';status.dataset.state='ok';}
  }else{
   const status=el('dudu-v672-composer-status');
   if(status){status.textContent='Chưa lưu được tin nhắn. Nội dung vẫn ở ô nhập.';status.dataset.state='error';}
  }
 }
 function checkin(){
  if(!canUse()||!shown||owner!==currentUsername)return;
  const previous=state(),plan=rules.checkin(previous);
  if(!plan.ok)return;
  if(!sandbox()){
   const next=plan.state;
   addMessage(next,'model','Điểm danh đã lưu trên thiết bị. Chúc cậu có một ngày đọc truyện vui vẻ!');
   if(store(next)){render();root.duduV33Render?.();}
   return;
  }
  const oldBalance=Number(userProfile.currency);
  if(!Number.isSafeInteger(oldBalance)||oldBalance<0||
     oldBalance+plan.coins>1e9)return;
  const oldState=userProfile.duduCompanionV43;
  const prev={quests:userProfile.quests,economy:userProfile.economyV43,
   questState:userProfile.questV437};
  const event=root.DuduEconomyRuntimeV43?.prepareQuestEvent(
   'DUDU_CHECKIN',rules.localDay());
  userProfile.currency=oldBalance+plan.coins;
  if(event){
   userProfile.quests=event.quests;
   userProfile.economyV43=event.ledger;
   userProfile.questV437=event.questState;
  }
  const next=plan.state;
  addMessage(next,'model','Cậu điểm danh thành công! Hôm nay nhận '+plan.coins+' Xu thử nghiệm. Hẹn cậu trong những trang truyện mới nhé.');
  if(!store(next)){
   userProfile.currency=oldBalance;userProfile.duduCompanionV43=oldState;
   userProfile.quests=prev.quests;
   if(prev.economy===undefined)delete userProfile.economyV43;
   else userProfile.economyV43=prev.economy;
   if(prev.questState===undefined)delete userProfile.questV437;
   else userProfile.questV437=prev.questState;
   return;
  }
  render();root.duduV33Render?.();
 }
 function init(){
  if(!rules||el('dudu-v43-companion'))return;
  const app=el('phone-app-chat');if(!app)return;
  const panel=create('section','dudu-v43-companion');
  panel.id='dudu-v43-companion';panel.setAttribute('aria-label','Trò chuyện với DUDU');
  const head=create('header','dudu-v43-head');
  const backBtn=create('button','dudu-v43-back','‹');backBtn.type='button';
  backBtn.title='Về danh bạ';backBtn.setAttribute('aria-label','Về danh bạ');backBtn.addEventListener('click',back);
  const avatar=create('span','dudu-v43-avatar','✦');
  const htxt=create('div','dudu-v43-identity');
  htxt.append(create('strong','','DUDU'),
   create('small','','Bạn đồng hành · Hệ thống đang kiến tạo'));
  head.append(backBtn,avatar,htxt);
  const streak=create('div','dudu-v43-streak');
  const login=create('span','','');login.id='dudu-v43-day-count';
  const chat=create('span','','');chat.id='dudu-v43-chat-count';
  streak.append(login,chat);
  const diary=create('details','dudu-v43-diary');
  diary.id='dudu-v43-diary';
  const summary=create('summary','','⋯');
  summary.setAttribute('aria-label','Mở nhật ký, điểm danh và công cụ DUDU');
  summary.title='Nhật ký & công cụ';
  summary.setAttribute('aria-haspopup','true');
  const claim=create('button','dudu-v43-checkin','Nhận quà điểm danh');
  claim.id='dudu-v43-checkin';claim.type='button';claim.addEventListener('click',checkin);
  const note=create('small','dudu-v43-note',sandbox()?'Xu và mốc kỷ niệm chỉ lưu ở Sandbox; chưa phải kỷ vật Bảo Tàng được xác nhận.':'Nhật ký DUDU chỉ lưu trên thiết bị; không cấp Xu hay kỷ vật thật.');
  const reward=create('small','dudu-v43-reward-info','');reward.id='dudu-v43-reward-info';
  const badges=create('div','dudu-v43-milestones','');badges.id='dudu-v43-milestones';
  const diaryContents=create('div','dudu-v672-diary-contents');
  const diaryTitle=create('strong','dudu-v672-diary-title','Nhật ký đồng hành');
  diaryContents.append(diaryTitle,streak,claim,reward,note,badges);
  diary.append(summary,diaryContents);
  head.append(diary);
  const messages=create('div','dudu-v43-messages');messages.id='dudu-v43-messages';
  messages.setAttribute('role','log');messages.setAttribute('aria-label','Lịch sử trò chuyện DUDU');
  messages.setAttribute('aria-live','off');
  const shortcuts=create('div','dudu-v43-shortcuts');
  for(const label of ['Kiểm tra hệ thống','Khế ước hệ thống','Nhiệm vụ F/E',
    'Gợi ý truyện','Hướng dẫn nhặt đồ','Kết nối linh hồn']){
   const b=create('button','',label);b.type='button';
   b.addEventListener('click',()=>{
    el('dudu-v43-message-input').value=label;send();
   });
   shortcuts.append(b);
  }
  diaryContents.append(shortcuts);
  const form=create('form','dudu-v43-composer');
  const text=create('textarea','dudu-v672-textarea');text.id='dudu-v43-message-input';
  text.rows=1;text.maxLength=500;text.autocomplete='off';
  text.placeholder='Nhắn tin cho DUDU...';
  text.setAttribute('aria-label','Nhắn tin cho DUDU');
  const submit=create('button','dudu-v672-send','↑');submit.type='submit';
  submit.setAttribute('aria-label','Gửi tin nhắn cho DUDU');
  submit.disabled=true;
  const status=create('span','dudu-v672-composer-status');
  status.id='dudu-v672-composer-status';status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const adjustInput=()=>{
   const filled=text.value.trim().length>0;
   submit.disabled=!filled;
   text.style.height='auto';
   const measuredHeight=text.scrollHeight;
   // Hidden panels report zero height before first open; keep CSS minimum.
   text.style.height=measuredHeight>0?Math.min(measuredHeight,104)+'px':'';
   if(status.dataset.state==='error'){status.textContent='';delete status.dataset.state;}
  };
  text.addEventListener('input',adjustInput);
  text.addEventListener('keydown',event=>{
   if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){
    event.preventDefault();
    if(text.value.trim()&&typeof form.requestSubmit==='function')form.requestSubmit();
   }
  });
  form.append(text,submit,status);
  form.addEventListener('submit',event=>{event.preventDefault();send();});
  panel.append(head,messages,form);
  adjustInput();
  app.append(panel);
  if(canUse())accountReady();
 }
 root.DuduCompanionV43=Object.freeze({open,hide,back,accountReady,inboxSummary,render});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:{});
