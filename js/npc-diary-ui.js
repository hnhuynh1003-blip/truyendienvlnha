/* DUDU NPC diary — compact, read-only Sandbox view of existing local memory.
 * Never grants rewards, writes account data, or interprets player claims as canon.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduNpcDiary=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const MAX_VISIBLE=8;
 function rows(store){
  let events=[];
  try {events=store&&typeof store.list==='function'?store.list():[];}catch(_){}
  if(!Array.isArray(events))return [];
  return events.filter(event=>event&&
    (event.type==='exchange'||event.type==='gift')).slice(-MAX_VISIBLE).reverse()
   .map(event=>{
    const gift=event.type==='gift';
    return Object.freeze({
      id:String(event.id||'').slice(0,70),
      kind:gift?'gift':'exchange',
      label:gift?'Quà đã tặng (thiết bị)':'Hội thoại đã ghi nhớ',
      primary:String(gift?event.itemName:event.userText||'').slice(0,240),
      secondary:gift?'Chưa xác minh trên máy chủ':
        String(event.replyText||'').slice(0,260),
      timestamp:Number.isFinite(Number(event.timestamp))?Number(event.timestamp):0
    });
   });
 }
 function init(){
  const app=document.getElementById('phone-app-chat');
  const menu=app?.querySelector('.dudu-v33-menu');
  if(!app||!menu||document.getElementById('dudu-npc-diary'))return;
  const button=document.createElement('button');
  button.type='button';button.id='dudu-npc-diary-open';
  button.className='dudu-npc-diary-menu-btn';
  button.textContent='🧠  Sổ ký ức';
  button.setAttribute('aria-label','Xem ký ức đã ghi của NPC đang trò chuyện');
  menu.prepend(button);
  const overlay=document.createElement('div');
  overlay.id='dudu-npc-diary';overlay.className='dudu-npc-diary';
  overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Sổ ký ức của nhân vật');
  const sheet=document.createElement('section');sheet.className='dudu-npc-diary-sheet';
  const head=document.createElement('header');head.className='dudu-npc-diary-head';
  const title=document.createElement('strong');title.id='dudu-npc-diary-title';
  title.textContent='Sổ ký ức';
  const closeBtn=document.createElement('button');closeBtn.type='button';
  closeBtn.className='dudu-npc-diary-close';closeBtn.textContent='×';
  closeBtn.setAttribute('aria-label','Đóng sổ ký ức');
  const note=document.createElement('p');note.className='dudu-npc-diary-note';
  note.textContent='Các ghi chép này chỉ lưu trên thiết bị. Lời kể của người chơi không phải tình tiết chính thức trong truyện.';
  const list=document.createElement('div');list.id='dudu-npc-diary-list';
  list.className='dudu-npc-diary-list';
  head.append(title,closeBtn);sheet.append(head,note,list);overlay.append(sheet);
  app.append(overlay);
  let owner='',story='',npc='',lastFocus=null;
  function close(){
   if(overlay.hidden)return;
   overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
   owner='';story='';npc='';
   if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
   lastFocus=null;
  }
  function safeSelection(){
   if(typeof IS_SANDBOX_MODE==='undefined'||!IS_SANDBOX_MODE||
      typeof currentUsername!=='string'||!currentUsername||
      !app.classList.contains('dudu-v33-chat-open')||
      app.classList.contains('dudu-v43-companion-open'))return null;
   const selected=document.getElementById('chat-character-selector')?.value;
   const storyId=activeChatNovelId||(novels[selectedNovelIndex]||{}).id;
   const char=(getCombinedCharactersList()||[]).find(c=>c.id===selected);
   if(!storyId||!char||!selected||!isNpcUnlocked(storyId,selected))return null;
   return {uid:currentUsername,storyId,npcId:selected,name:char.name||'Nhân vật'};
  }
  function open(){
   const scope=safeSelection();
   if(!scope){close();return false;}
   const store=npcMemoryStore(scope.storyId,scope.npcId,scope.uid);
   if(!store)return false;
   owner=scope.uid;story=scope.storyId;npc=scope.npcId;
   lastFocus=document.activeElement;
   title.textContent='Ký ức · '+scope.name;
   list.replaceChildren();
   const notes=rows(store);
   if(!notes.length){
    const empty=document.createElement('p');
    empty.className='dudu-npc-diary-empty';
    empty.textContent='Chưa có ký ức tương tác được lưu với nhân vật này.';
    list.append(empty);
   }
   for(const entry of notes){
    const card=document.createElement('article');
    card.className='dudu-npc-diary-entry';
    const label=document.createElement('small');
    label.className='dudu-npc-diary-kind';label.textContent=entry.label;
    const primary=document.createElement('p');primary.textContent=entry.primary;
    const secondary=document.createElement('p');
    secondary.className='dudu-npc-diary-secondary';
    secondary.textContent=entry.secondary;
    card.append(label,primary,secondary);
    list.append(card);
   }
   menu.closest('details')?.removeAttribute('open');
   overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
   closeBtn.focus({preventScroll:true});
   return true;
  }
  function checkScope(){
   if(overlay.hidden)return;
   const scope=safeSelection();
   if(!scope||scope.uid!==owner||scope.storyId!==story||scope.npcId!==npc||
      app.style.display==='none')close();
  }
  button.addEventListener('click',open);
  closeBtn.addEventListener('click',close);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  overlay.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){
    // The only focusable dialog control is Close.
    event.preventDefault();closeBtn.focus();
   }
  });
  document.getElementById('chat-character-selector')?.addEventListener('change',close);
  document.getElementById('dudu-v33-chat-back')?.addEventListener('click',close);
  app.addEventListener('click',event=>{
   if(event.target.closest('#dudu-v33-inbox-panel,.phone-back-btn'))close();
  },true);
  new MutationObserver(checkScope).observe(app,{attributes:true,attributeFilter:['style','class']});
  const accountLabel=document.getElementById('account-status-btn');
  if(accountLabel)new MutationObserver(checkScope).observe(accountLabel,{childList:true,subtree:true});
  root.DuduNpcDiary=Object.freeze({rows,open,close});
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
 return Object.freeze({rows});
});