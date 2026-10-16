/* DUDU V33 — conversation-first mobile messenger; existing saves stay intact. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let filter='recent';
function story(){return activeChatNovelId||(novels[selectedNovelIndex]||{}).id;}
function preview(npc){
  try {
    const hist=chatHistories[chatKey(npc.id)]||[];
    const packet=getStoryProgress(story()).redPacketsV32?.[npc.id]?.events||[];
    const last=hist[hist.length-1];
    if(last)return {text:String(last.text||'').replace(/\s+/g,' ').slice(0,76),count:hist.length};
    if(packet.length)return {text:'🧧 Phong bao đã gửi',count:packet.length};
  }catch(_){}
  return {text:'Bắt đầu trò chuyện',count:0};
}
function show(mode){
 const app=$('phone-app-chat');if(!app)return;
 const inbox=mode!=='chat';
 app.classList.toggle('dudu-v33-inbox',inbox);
 app.classList.toggle('dudu-v33-chat-open',!inbox);
 const back=$('dudu-v33-chat-back');
 if(back)back.hidden=inbox;
 const home=app.querySelector('.phone-app-header .phone-back-btn');
 if(home)home.style.display=inbox?'':'none';
 if(inbox)render();
}
function render(){
 const root=$('dudu-v33-inbox-list');if(!root)return;
 root.replaceChildren();
 const query=($('dudu-v33-search')?.value||'').trim().toLocaleLowerCase('vi');
 const names=(getCombinedCharactersList()||[]).filter(n=>n&&!n.archived);
 const records=names.map(n=>({npc:n,info:preview(n)}))
   .filter(r=>(filter==='all'||r.info.count>0)&&(!query||String(r.npc.name||'').toLocaleLowerCase('vi').includes(query)||r.info.text.toLocaleLowerCase('vi').includes(query)))
   .sort((a,b)=>b.info.count-a.info.count);
 if(!records.length){const empty=document.createElement('p');empty.className='dudu-v33-empty';empty.textContent=filter==='recent'?'Chưa có hội thoại. Vào Danh bạ để chọn NPC và bắt đầu nhắn tin.':'Không tìm thấy NPC phù hợp.';root.append(empty);return;}
 for(const {npc,info} of records){
  const button=document.createElement('button');button.type='button';button.className='dudu-v33-thread';
  const avatar=document.createElement('span');avatar.className='dudu-v33-avatar';avatar.textContent=String(npc.name||'N').trim().charAt(0).toUpperCase();
  const infoBox=document.createElement('span');infoBox.className='dudu-v33-thread-copy';
  const title=document.createElement('strong');title.textContent=npc.name||'Nhân vật';
  const snippet=document.createElement('small');snippet.textContent=info.text;
  infoBox.append(title,snippet);
  const chevron=document.createElement('span');chevron.className='dudu-v33-chevron';chevron.textContent='›';
  button.append(avatar,infoBox,chevron);
  button.addEventListener('click',()=>{const sel=$('chat-character-selector');if(!sel)return;sel.value=npc.id;switchChatCharacter();show('chat');});
  root.append(button);
 }
}
function init(){
 const app=$('phone-app-chat');if(!app||$('dudu-v33-inbox-panel'))return;
 const panel=document.createElement('section');panel.id='dudu-v33-inbox-panel';panel.className='dudu-v33-inbox-panel';
 const tabs=document.createElement('div');tabs.className='dudu-v33-tabs';
 [['recent','Hội thoại'],['all','Danh bạ']].forEach(([id,label])=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.tab=id;
  b.setAttribute('aria-pressed',String(filter===id));b.addEventListener('click',()=>{
   filter=id;tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.tab===id)));render();
  });tabs.append(b);
 });
 const search=document.createElement('input');search.type='search';search.id='dudu-v33-search';search.placeholder='Tìm NPC hoặc tin nhắn…';search.setAttribute('aria-label','Tìm cuộc trò chuyện');search.addEventListener('input',render);
 const list=document.createElement('div');list.id='dudu-v33-inbox-list';list.className='dudu-v33-inbox-list';
 panel.append(tabs,search,list);
 const head=app.querySelector('.phone-app-header');head.after(panel);
 const back=document.createElement('button');back.type='button';back.id='dudu-v33-chat-back';back.textContent='‹';back.title='Về danh sách hội thoại';back.setAttribute('aria-label','Về danh sách hội thoại');back.hidden=true;back.addEventListener('click',()=>show('inbox'));
 head.querySelector('.phone-back-btn')?.after(back);
 const actions=$('dudu-v32-gift-button')?.parentElement;
 const moreHost=app.querySelector('.dudu-v27-chat-actions');
 const oldMore=$('chat-v27-more');
 if(actions&&moreHost){
  const details=document.createElement('details');details.className='dudu-v33-tools in-header';
  const summary=document.createElement('summary');
  summary.title='Tùy chọn cuộc trò chuyện';
  summary.setAttribute('aria-label','Mở tùy chọn tặng quà và phong bao');
  const plus=document.createElement('span');plus.className='dudu-v33-plus-icon';plus.setAttribute('aria-hidden','true');summary.append(plus);
  const menu=document.createElement('div');menu.className='dudu-v33-menu';
  if(oldMore){
   const clear=oldMore.querySelector('button');
   if(clear){clear.addEventListener('click',()=>details.open=false);menu.append(clear);}
   oldMore.remove();
  }
  details.append(summary,menu);menu.prepend(actions);moreHost.append(details);
  menu.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{details.open=false;}));
 }
 const original=window.openPhoneApp;
 if(typeof original==='function')window.openPhoneApp=function(name){const result=original.apply(this,arguments);if(name==='chat')show('inbox');return result;};
 // Codex → Chat remains a direct conversation; no extra navigation.
 const connect=window.connectSoulAndChat;
 if(typeof connect==='function')window.connectSoulAndChat=function(){const result=connect.apply(this,arguments);show('chat');return result;};
 show('inbox');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.duduV33ShowInbox=()=>show('inbox');
})();