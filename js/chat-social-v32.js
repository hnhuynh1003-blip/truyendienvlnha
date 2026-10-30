/* DUDU V32 Chinese-inspired character messenger interactions.
 * Sandbox-only, virtual Xu red envelopes: no cash, no NPC balances or auto-affinity.
 * Depends on existing inline app bindings (userProfile / selected NPC / story).
 */
(function(root){
  'use strict';
  const rules=root.DuduRedPacketV32;
  let draft=null,busy=false,focusReturn=null;
  const el=id=>document.getElementById(id);
  function context(){
    if(!IS_SANDBOX_MODE||!currentUsername)return null;
    const id=el('chat-character-selector')?.value;
    const storyId=activeChatNovelId||(novels[selectedNovelIndex]||{}).id;
    const npc=novels.find(n=>n?.id===storyId)?.characters?.find(c=>c?.id===id&&!c.archived);
    return npc&&isNpcUnlocked(storyId,id)?{storyId,npcId:id,npc,owner:currentUsername}:null;
  }
  function record(storyId,id){
    const state=getStoryProgress(storyId);
    return state.redPacketsV32?.[id]||null;
  }
  function feedback(message){if(el('dudu-v32-contact-feedback'))el('dudu-v32-contact-feedback').textContent=message||'';}
  function sync(){
    // Live accounts have no trusted red-packet transfer yet. Preserve the
    // existing gift action and role-scoped relationship UI as they are.
    if(!IS_SANDBOX_MODE){
      const envelope=el('dudu-v32-envelope-button');
      if(envelope){
        envelope.disabled=true;
        envelope.textContent='🧧 Phong bao 🔒';
        envelope.title='Đang chờ kiểm thử Firestore Rules; chưa thể gửi Xu.';
        envelope.setAttribute('aria-label','Phong bao đang chờ Rules, chưa thể gửi Xu');
      }
      return;
    }
    const ctx=context();
    for(const id of ['dudu-v32-gift-button','dudu-v32-envelope-button']){
      const b=el(id);if(b){
        b.disabled=!ctx;b.title=ctx?'':'Cần đăng nhập Sandbox và mở khóa NPC';
        if(id==='dudu-v32-envelope-button'){
          b.textContent='🧧 Phong bao';
          b.setAttribute('aria-label','Gửi phong bao bằng xu trò chơi');
        }
      }
    }
    const chip=el('dudu-v32-mini-affinity');
    if(chip){
      const p=ctx&&getStoryProgress(ctx.storyId).collectedCharacters[ctx.npcId];
      chip.textContent=p?'❤️ '+Math.max(0,Math.min(100,Number(p.affinity)||0))+'%':'🔒 Chưa kết nối';
    }
    feedback('');
  }
  function close(){
    const modal=el('dudu-v32-envelope-overlay');
    if(modal){modal.style.display='none';modal.setAttribute('aria-hidden','true');}
    draft=null;const target=focusReturn;focusReturn=null;
    if(target?.isConnected)target.focus();
  }
  function choose(amount){
    if(!draft||!rules.DENOMINATIONS.includes(amount))return;
    draft.amount=amount;
    const balance=Number(userProfile.currency)||0;
    el('dudu-v32-envelope-balance').textContent='Số dư: '+balance.toLocaleString('vi-VN')+' Xu';
    document.querySelectorAll('#dudu-v32-envelope-overlay [data-dudu-v32-amount]').forEach(b=>{
      const value=Number(b.dataset.duduV32Amount);
      b.disabled=balance<value;
      b.setAttribute('aria-pressed',String(value===amount));
    });
    const plan=rules.evaluate({amount,balance,record:record(draft.storyId,draft.npcId),unlocked:!!context()});
    el('dudu-v32-envelope-confirm').disabled=!plan.ok;
    el('dudu-v32-envelope-result').textContent=plan.ok?'':plan.message;
  }
  function open(){
    if(!IS_SANDBOX_MODE){feedback('Phong bao tài khoản cá nhân đang chờ Rules; Xu chưa bị trừ.');return;}
    const ctx=context();
    if(!ctx){feedback('Hãy mở khóa NPC trước khi tặng phong bao.');return;}
    focusReturn=document.activeElement;draft={...ctx,amount:10};
    el('dudu-v32-envelope-note').value='';
    el('dudu-v32-envelope-result').textContent='';
    el('dudu-v32-envelope-recipient').textContent='Gửi cho '+ctx.npc.name;
    const modal=el('dudu-v32-envelope-overlay');
    modal.style.display='flex';modal.setAttribute('aria-hidden','false');
    choose(10);el('dudu-v32-envelope-note').focus();
  }
  function send(){
    if(busy||!draft||!IS_SANDBOX_MODE)return;
    const ctx=context();
    if(!ctx||ctx.owner!==draft.owner||ctx.storyId!==draft.storyId||ctx.npcId!==draft.npcId){close();return;}
    const now=Date.now(),balance=Number(userProfile.currency);
    const state=getStoryProgress(ctx.storyId);
    const current=state.redPacketsV32&&typeof state.redPacketsV32==='object'?state.redPacketsV32:{};
    const old=current[ctx.npcId];
    const plan=rules.evaluate({amount:draft.amount,balance,unlocked:isNpcUnlocked(ctx.storyId,ctx.npcId),record:old,now});
    if(!plan.ok){choose(draft.amount);return;}
    const next=rules.nextRecord(old,plan,{id:'rp-'+now+'-'+Math.random().toString(36).slice(2,10),at:now,
      note:rules.sanitizeNote(el('dudu-v32-envelope-note').value)});
    if(!next)return;
    busy=true;
    try{
      userProfile.currency=plan.balanceAfter;
      state.redPacketsV32={...current,[ctx.npcId]:next};
      saveCurrentAccount();
    }catch(err){
      userProfile.currency=balance;
      state.redPacketsV32={...current};
      el('dudu-v32-envelope-result').textContent='Không lưu được. Xu chưa bị trừ.';
      busy=false;return;
    }
    busy=false;close();
    feedback('🧧 Đã lưu phong bao '+plan.amount+' Xu trong Sandbox.');
    renderChatMessages(ctx.npcId);
  }
  function render(container,storyId,id){
    if(!IS_SANDBOX_MODE||!storyId||!id)return;
    const events=rules.normalizeRecord(record(storyId,id)).events.slice(-5);
    for(const item of events){
      const card=document.createElement('div');card.className='dudu-v32-red-packet-card';
      const emoji=document.createElement('span');emoji.textContent='🧧';emoji.className='dudu-v32-packet-emoji';
      const value=document.createElement('strong');value.textContent='Phong bao '+item.amount+' Xu';
      const note=document.createElement('small');note.textContent=item.note||'Tấm lòng gửi bạn';
      const info=document.createElement('small');info.className='dudu-v32-packet-info';info.textContent='Xu ảo · Chỉ lưu tại Sandbox';
      card.append(emoji,value,note,info);container.append(card);
    }
  }
  document.addEventListener('keydown',e=>{
    const modal=el('dudu-v32-envelope-overlay');
    if(!modal||modal.style.display!=='flex')return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
    if(e.key==='Tab'){
      const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
        .filter(x=>x.getClientRects().length);
      const a=focusable[0],z=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}
      else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}
    }
  },true);
  root.openRedPacketV32=open;
  root.closeRedPacketV32=close;
  root.pickRedPacketV32=choose;
  root.confirmRedPacketV32=send;
  root.syncRedPacketButtonsV32=sync;
  root.renderRedPacketEventsV32=render;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
})(typeof window!=='undefined'?window:{});
