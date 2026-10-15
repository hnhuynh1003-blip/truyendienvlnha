/* V22 staging-only avatar sync panel. NEVER run on live reader pages.
 * Explicit click + Firebase JWT + exact UID match; no auto-migrate.
 */
let avatarV22Session=null;
let avatarV22LastReview=null;
const avatarV22Enabled=IS_SANDBOX_MODE&&
  new URLSearchParams(location.search).get('avatarSync')==='staging';
function avatarV22Status(message){
 const e=document.getElementById('player-avatar-v22-status');
 if(e)e.textContent=message;
}
function avatarV22Identity(){
 try{
   const account=firebase.auth()?.currentUser;
   return account?.uid&&typeof account.getIdToken==='function'?
     {uid:account.uid,getIdToken:()=>account.getIdToken()}:null;
 }catch(_){return null;}
}
function avatarV22Instance(){
 if(!avatarV22Enabled)return null;
 if(!avatarV22Session){
   avatarV22Session=DuduAvatarStagingV22.create({
     enabled:true,identity:avatarV22Identity,
     localOwner:()=>currentUsername,
     localProfile:()=>userProfile,
     vectorIds:()=>playerAvatarOptionsV16().vectorIds,
     createClient:({getIdToken})=>DuduPlayerAvatarSyncV17.createClient({
       enabled:true,getIdToken
     }),
     applyLocal:(selection,uid)=>{
       if(!IS_SANDBOX_MODE||currentUsername!==uid||
          avatarV22Identity()?.uid!==uid||
          userProfile.playerAvatar?.kind==='upload')return false;
       // Validate against local allowlist; privileged frames cannot be
       // trusted unless V23 explicitly supports a signed award read.
       const normalized=DuduPlayerAvatarV16.validate(
         selection,playerAvatarOptionsV16());
       if(!normalized)return false;
       userProfile.playerAvatar={...normalized};
       saveCurrentAccount();renderPlayerAvatarPlacesV16();
       const chat=document.getElementById('chat-character-selector')?.value;
       if(chat)renderChatMessages(chat);
       return true;
     }
   });
 }
 return avatarV22Session;
}
function avatarV22Reset(){
 avatarV22Session?.invalidate();
 avatarV22LastReview=null;
 const root=document.getElementById('player-avatar-v22-review');
 if(root)root.hidden=true;
}
async function avatarV22SignIn(){
 if(!avatarV22Enabled)return;
 try{
   const auth=firebase.auth();
   if(!auth?.currentUser){
     avatarV22Status('Đang mở xác thực Google qua Firebase...');
     await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
   }
   avatarV22Status(avatarV22Identity()?.uid===currentUsername?
     'Đã xác thực Firebase và UID khớp. Bấm Đọc staging để đối chiếu.':
     'UID Firebase không trùng tài khoản Sandbox đang chọn. Hãy chọn hồ sơ Sandbox theo đúng Firebase UID trước khi tiếp tục.');
 }catch(_){
   avatarV22Status('Chưa xác thực Firebase. Không có bản lưu nào bị thay đổi.');
 }
}
async function avatarV22Inspect(){
 if(!avatarV22Enabled)return;
 avatarV22Reset();
 avatarV22Status('Đang xác minh UID và đọc lựa chọn avatar từ staging...');
 const action=avatarV22Instance();
 const result=await action.inspect();
 if(!avatarV22Enabled||document.getElementById('player-avatar-v16-modal')?.style.display!=='flex')
   return;
 if(!result.ok){
   const messages={
     'owner-mismatch':'Tài khoản thử và UID Firebase chưa trùng. Không thể đồng bộ.',
     disabled:'Đồng bộ chưa được bật.',
     'stale-account':'Đã đổi tài khoản khi đọc. Hãy thử lại.',
     'avatar-sync-disabled':'Worker staging hiện tắt đồng bộ; chưa có dữ liệu thật.',
     'unavailable':'Không kết nối được staging; ảnh cục bộ được giữ nguyên.',
     'invalid-snapshot':'Dữ liệu staging không hợp lệ; chưa áp dụng gì.'
   };
   avatarV22Status(messages[result.code]||'Không thể đọc staging: '+result.code);
   return;
 }
 avatarV22LastReview=result.review;
 const review=result.review;
 const modal=document.getElementById('player-avatar-v22-review');
 modal.hidden=false;
 document.getElementById('player-avatar-v22-local').textContent=
   avatarDescriptionV21(review.local);
 document.getElementById('player-avatar-v22-remote').textContent=
   avatarDescriptionV21(review.remote)+' · revision '+review.revision;
 const notes={
   'local-photo':'Ảnh tự tải hiện chỉ lưu cục bộ. Không thể đồng bộ hoặc ghi đè ảnh.',
   'conflict':'Hai phiên bản khác nhau. Chỉ bấm khi bạn muốn áp dụng lựa chọn.',
   'identical':'Hai bản giống nhau; không cần thực hiện thao tác.',
   'unsupported-remote-frame':'Khung máy chủ chưa được trình duyệt hỗ trợ.',
   'unavailable':'Chưa có dữ liệu máy chủ hợp lệ.'
 };
 avatarV22Status(notes[review.status]||'Đã đọc trạng thái từ staging.');
 document.getElementById('player-avatar-v22-keep').disabled=
   !review.canKeepDevice||review.status==='identical';
 document.getElementById('player-avatar-v22-server').disabled=
   !review.canUseServer||review.status==='identical';
}
async function avatarV22Choose(choice){
 if(!avatarV22Enabled||!avatarV22LastReview)return;
 const owner=avatarV22Identity()?.uid;
 if(!owner||owner!==currentUsername){
   avatarV22Reset();avatarV22Status('Đã thay đổi tài khoản. Không áp dụng.');
   return;
 }
 const btns=['player-avatar-v22-keep','player-avatar-v22-server'];
 const buttons=btns.map(id=>document.getElementById(id));
 if(buttons.some(b=>b.disabled)) {
   // Buttons are disabled during a running request, not evidence of ownership.
   return;
 }
 buttons.forEach(b=>b.disabled=true);
 avatarV22Status('Đang xử lý lựa chọn đã xác nhận...');
 const outcome=await avatarV22Instance().resolve(choice);
 avatarV22LastReview=null;
 if(outcome.ok){
   avatarV22Status(outcome.kind==='saved-server'?
     'Đã lưu lựa chọn vào staging (revision '+outcome.revision+'). Avatar cục bộ không đổi.':
     'Đã lưu bản staging được chọn vào hồ sơ cục bộ của Firebase UID này.');
 }else if(outcome.code==='revision-conflict'){
   avatarV22Status('Staging đã thay đổi từ thiết bị khác (409). Bấm Đọc staging lần nữa để chọn lại.');
 }else{
   avatarV22Status('Chưa áp dụng: '+outcome.code+'. Avatar hiện tại vẫn được bảo vệ.');
 }
 avatarV22Reset();
}
function avatarV22InitPanel(){
 const box=document.getElementById('player-avatar-v22-panel');
 if(!box)return;
 box.hidden=!avatarV22Enabled;
}
avatarV22InitPanel();
