/* DUDU V21 — visual sync-conflict rehearsal in the existing V16 editor.
 * DEMONSTRATION ONLY. No fetch, Firebase, local writes or server activation.
 * Server snapshot below is explicitly fake; do not describe it as synced data.
 */
let playerAvatarReviewV21=null;
function avatarDescriptionV21(value){
  if(!value)return 'Chưa xác định';
  const kind={
    initials:'Avatar chữ',anime:'Chân dung anime',
    vector:'Hình đại diện mẫu',upload:'Ảnh tự tải (chỉ trên máy này)'
  }[value.kind]||'Không rõ';
  const frame=DuduPlayerAvatarV16.frame(value.frameId);
  return kind+' · Khung '+(frame?.name||'chưa hỗ trợ');
}
function renderPlayerAvatarSyncReviewV21(mode='compare'){
  if(!IS_SANDBOX_MODE)return;
  const panel=document.getElementById('player-avatar-sync-review-v21');
  const modal=document.getElementById('player-avatar-v16-modal');
  if(!panel||modal?.style.display!=='flex')return;
  const local=mode==='local-photo'?
    {...userProfile,playerAvatar:{kind:'upload',uploadId:'own-v21-demo',frameId:'moon'}}:
    userProfile;
  const fakeRemote={
    ok:true,revision:7,
    avatar:{kind:'anime',presetId:'anime-moon-violet',frameId:'violet'},
    availableFrames:DuduPlayerAvatarV16.FREE.map(frame=>frame.id),
    lockedFrames:['legend','soulbond','author'],uploadsEnabled:false
  };
  const plan=DuduPlayerAvatarSyncPlanV20.review(local,fakeRemote,
    playerAvatarOptionsV16());
  playerAvatarReviewV21=plan;
  panel.hidden=false;
  panel.dataset.status=plan.status;
  const title=document.getElementById('player-avatar-sync-review-status-v21');
  const statuses={
    'conflict':'Hai phiên bản khác nhau — cần chọn rõ.',
    'identical':'Hai phiên bản giống nhau.',
    'local-photo':'Ảnh tự tải chỉ nằm trên thiết bị, không thể đồng bộ an toàn.',
    'unsupported-remote-frame':'Khung máy chủ chưa được thiết bị hỗ trợ.',
    'unavailable':'Chưa có dữ liệu đối chiếu hợp lệ.'
  };
  title.textContent=statuses[plan.status]||statuses.unavailable;
  document.getElementById('player-avatar-sync-local-v21').textContent=
    avatarDescriptionV21(plan.local);
  document.getElementById('player-avatar-sync-remote-v21').textContent=
    avatarDescriptionV21(plan.remote)+' · phiên bản mẫu #7';
  const keep=document.getElementById('player-avatar-sync-keep-v21');
  const use=document.getElementById('player-avatar-sync-use-v21');
  keep.disabled=!plan.canKeepDevice;
  use.disabled=!plan.canUseServer;
  document.getElementById('player-avatar-sync-outcome-v21').textContent=
    'Chưa áp dụng thao tác nào. Đây chỉ là dữ liệu minh họa; đồng bộ thật vẫn tắt.';
}
function choosePlayerAvatarSyncReviewV21(choice){
  if(!IS_SANDBOX_MODE||!playerAvatarReviewV21)return;
  const panel=document.getElementById('player-avatar-sync-review-v21');
  if(!panel||panel.hidden)return;
  const result=DuduPlayerAvatarSyncPlanV20.explicitChoice(
    playerAvatarReviewV21,choice);
  const dest=document.getElementById('player-avatar-sync-outcome-v21');
  if(!result.ok){
    dest.textContent=playerAvatarReviewV21.status==='local-photo'?
      'Không thể ghi đè ảnh riêng: hãy giữ ảnh tại thiết bị này. Không gửi ảnh lên mạng.':
      'Lựa chọn này chưa được hỗ trợ và không thay đổi hồ sơ.';
    return;
  }
  dest.textContent=result.kind==='server-save'?
    'Mô phỏng: gửi yêu cầu giữ avatar thiết bị kèm revision #'+
      result.expectedRevision+'. Chưa gửi, chưa lưu.':
    'Mô phỏng: nhận avatar mẫu từ máy chủ. Chưa ghi vào máy này hay tài khoản.';
}
function closePlayerAvatarSyncReviewV21(){
  const panel=document.getElementById('player-avatar-sync-review-v21');
  if(panel)panel.hidden=true;
  playerAvatarReviewV21=null;
}
