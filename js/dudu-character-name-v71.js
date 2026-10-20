/* V71: character/profile display name is mutable; System host name/ID aren't. */
(function(root){
 'use strict';
 const d=root.document;if(!d)return;
 const get=id=>d.getElementById(id);
 function available(){
  try{return typeof currentUsername==='string'&&!!currentUsername&&
   (typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true||
    root.DuduAuth?.isReady?.()===true&&root.DuduAuth?.uid?.()===currentUsername);}
  catch(_){return false;}
 }
 function init(){
  const toggle=get('dudu-v71-rename-character'),form=get('dudu-v71-rename-form');
  const input=get('dudu-v71-rename-input'),cancel=get('dudu-v71-rename-cancel');
  const result=get('dudu-v71-rename-result');
  if(!toggle||!form||!input||!result||!cancel)return;
  toggle.addEventListener('click',()=>{
   if(!available()){result.textContent='Đăng nhập để chỉnh tên nhân vật.';return;}
   form.hidden=false;
   input.value=String(userProfile?.name||'').slice(0,28);
   input.focus();
  });
  cancel.addEventListener('click',()=>{form.hidden=true;result.textContent='';});
  form.addEventListener('submit',e=>{
   e.preventDefault();
   if(!available()){result.textContent='Tài khoản chưa sẵn sàng.';return;}
   const next=input.value.normalize('NFC').trim().replace(/\s+/g,' ');
   if(next.length<2||next.length>28||/[\p{C}<>{}]/u.test(next)){
    result.textContent='Tên cần 2–28 ký tự hợp lệ.';return;
   }
   const owner=currentUsername;
   if(root.DuduAuth?.isReady?.()===true&&typeof IS_SANDBOX_MODE!=='undefined'&&
      IS_SANDBOX_MODE===false&&root.DuduAuth?.uid?.()!==owner)return;
   userProfile.name=next;root.saveCurrentAccount?.();
   if(owner!==currentUsername)return;
   form.hidden=true;
   get('profile-name').textContent=next;
   root.renderPlayerAvatarPlacesV16?.();
   result.textContent='Đã lưu tên nhân vật qua cơ chế hồ sơ hiện có.';
  });
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:{});
