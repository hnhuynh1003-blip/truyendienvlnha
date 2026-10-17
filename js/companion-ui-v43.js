/* V43.0–V43.2 companion: Sandbox-only UI and local, testable progress.
 * Production server rewards intentionally not granted by this code.
 */
(function(root){
 'use strict';
 const rules=root.DuduCompanionRulesV43;
 const el=id=>document.getElementById(id);
 const canUse=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE&&
  typeof currentUsername==='string'&&!!currentUsername&&!!rules;
 let shown=false,owner='';
 const create=(tag,cls,text)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);return e;
 };
 function state(){return rules.norm(userProfile?.duduCompanionV43);}
 function store(next){
  if(!canUse())return false;
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
  list.replaceChildren();
  for(const msg of s.messages.slice(-40)){
   const b=create('div','dudu-v43-bubble '+(msg.role==='user'?'is-user':'is-dudu'),msg.text);
   list.append(b);
  }
  list.scrollTop=list.scrollHeight;
  const dayCount=el('dudu-v43-day-count');
  if(dayCount)dayCount.textContent='🔥 '+s.login.count+' ngày điểm danh';
  const chatCount=el('dudu-v43-chat-count');
  if(chatCount)chatCount.textContent='💬 '+s.chat.count+' ngày trò chuyện';
  const button=el('dudu-v43-checkin'),info=el('dudu-v43-reward-info');
  if(button){
   const received=s.login.day===today;
   button.disabled=received;
   button.textContent=received?'✓ Đã nhận quà hôm nay':'Nhận quà điểm danh';
  }
  const nextDay=s.login.day===today?s.login.count:s.login.count+1;
  if(info)info.textContent=s.login.day===today?
   'Đã điểm danh hôm nay · quay lại ngày mai':
   'Quà dự kiến: '+rules.COIN_DAYS[(Math.max(1,nextDay)-1)%7]+' Xu thử nghiệm';
  const badge=el('dudu-v43-milestones');
  if(badge){
   badge.replaceChildren();
   for(const milestone of rules.MILESTONES){
    const won=s.milestones.includes(milestone.id);
    const cell=create('div','dudu-v43-milestone'+(won?' is-earned':''));
    const icon=create('span','',milestone.icon);
    const text=create('span','',milestone.name+' · '+milestone.day+' ngày');
    const stateText=create('small','',won?'Đã ghi nhận (Sandbox)':'Chưa đạt');
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
  render();
  el('dudu-v43-message-input')?.focus({preventScroll:true});
 }
 function hide(){
  shown=false;
  el('phone-app-chat')?.classList.remove('dudu-v43-companion-open');
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
  addMessage(s,'model',rules.reply(message,(novels||[]).map(n=>n.title)));
  const result=rules.chat(s,message);
  if(result.ok){
   // In-memory mutation to same s: only milestone/run fields are updated.
   s.chat=result.state.chat;
   s.milestones=result.state.milestones;
  }
  if(store(s)){
   input.value='';render();
   root.duduV33Render?.();
  }
 }
 function checkin(){
  if(!canUse()||!shown||owner!==currentUsername)return;
  const previous=state(),plan=rules.checkin(previous);
  if(!plan.ok)return;
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
  htxt.append(create('strong','','DUDU · Người bạn đầu tiên'),
   create('small','','Trợ lý đồng hành · Tin nhắn hướng dẫn'));
  head.append(backBtn,avatar,htxt);
  const streak=create('div','dudu-v43-streak');
  const login=create('span','','');login.id='dudu-v43-day-count';
  const chat=create('span','','');chat.id='dudu-v43-chat-count';
  streak.append(login,chat);
  const diary=create('details','dudu-v43-diary');
  const summary=create('summary','','🎁 Nhật ký điểm danh & kỷ niệm');
  const claim=create('button','dudu-v43-checkin','Nhận quà điểm danh');
  claim.id='dudu-v43-checkin';claim.type='button';claim.addEventListener('click',checkin);
  const note=create('small','dudu-v43-note','Xu và mốc kỷ niệm chỉ lưu ở Sandbox; chưa phải kỷ vật Bảo Tàng được xác nhận.');
  const reward=create('small','dudu-v43-reward-info','');reward.id='dudu-v43-reward-info';
  const badges=create('div','dudu-v43-milestones','');badges.id='dudu-v43-milestones';
  diary.append(summary,claim,reward,note,badges);
  const messages=create('div','dudu-v43-messages');messages.id='dudu-v43-messages';
  messages.setAttribute('role','log');messages.setAttribute('aria-label','Lịch sử trò chuyện DUDU');
  const shortcuts=create('div','dudu-v43-shortcuts');
  for(const label of ['Gợi ý truyện','Hướng dẫn nhặt đồ','Kết nối linh hồn']){
   const b=create('button','',label);b.type='button';
   b.addEventListener('click',()=>{
    el('dudu-v43-message-input').value=label;send();
   });
   shortcuts.append(b);
  }
  const form=create('form','dudu-v43-composer');
  const text=create('input','','');text.id='dudu-v43-message-input';
  text.type='text';text.maxLength=500;text.autocomplete='off';
  text.placeholder='Nói chuyện với DUDU...';
  text.setAttribute('aria-label','Nhắn tin cho DUDU');
  const submit=create('button','','Gửi');submit.type='submit';
  form.append(text,submit);form.addEventListener('submit',event=>{event.preventDefault();send();});
  panel.append(head,streak,diary,messages,shortcuts,form);
  app.append(panel);
  if(canUse())accountReady();
 }
 root.DuduCompanionV43=Object.freeze({open,hide,back,accountReady,inboxSummary,render});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:{});
