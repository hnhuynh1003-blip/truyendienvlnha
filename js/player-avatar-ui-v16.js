/* DUDU V49.7: identity-isolated avatar editor for sandbox and verified live accounts.
 * Uses local sandbox profile fields and the existing per-user IndexedDB store.
 */
let playerAvatarDraftV16=null;
let playerAvatarEditOwnerV16=null;
let playerAvatarUploadGenerationV16=0;
let playerAvatarReturnFocusV16=null;
let playerAvatarVisibleCountV41=12;
function playerAvatarOwnerV16(){
  return DuduPlayerAvatarV16.uploadIdentity(currentUsername||(IS_SANDBOX_MODE?'sandbox-guest':''));
}
// Live mode requires verified Firebase ownership; images stay device-local.
function playerAvatarAllowedV497(){
  return IS_SANDBOX_MODE ||
    (!!window.DuduAuth?.isReady?.() && !!currentUsername &&
     window.DuduAuth.uid()===currentUsername);
}
function playerAvatarOptionsV16(){
  return {vectorIds:DuduNpcPortraitLibrary.CATALOG.map(p=>p.id)};
}
function playerAvatarCurrentV16(){
  return DuduPlayerAvatarV16.safeState(userProfile,playerAvatarOptionsV16());
}
function renderPlayerAvatarV16(element,selection=playerAvatarCurrentV16()){
  if(!playerAvatarAllowedV497()||!element)return;
  const safe=DuduPlayerAvatarV16.validate(selection,playerAvatarOptionsV16())||
    DuduPlayerAvatarV16.safeState(null,playerAvatarOptionsV16());
  const frame=DuduPlayerAvatarV16.frame(safe.frameId);
  const token=Date.now()+'-'+Math.random().toString(36).slice(2);
  const owner=playerAvatarOwnerV16();
  element.dataset.avatarToken=token;element.dataset.frame=safe.frameId;
  element.classList.add('dudu-player-avatar-v16');
  element.style.setProperty('--avatar-frame',frame.color);
  element.style.setProperty('--avatar-glow',frame.color+'66');
  element.replaceChildren();
  const initials=document.createElement('span');
  initials.className='dudu-avatar-initials';
  initials.textContent=DuduPlayerAvatarV16.initials(userProfile.name||currentUsername);
  element.append(initials);
  const valid=()=>element.isConnected&&element.dataset.avatarToken===token&&
    owner===playerAvatarOwnerV16();
  const setImage=(src,asBackground=false)=>{
    if(!src||!valid())return;
    if(asBackground){
      const item=document.createElement('span');
      item.className='dudu-avatar-image';
      item.style.backgroundImage=src.image;
      item.style.backgroundSize=src.size;
      item.style.backgroundPosition=src.position;
      element.replaceChildren(item);
    }else{
      const img=document.createElement('img');
      img.alt='';img.loading='lazy';img.decoding='async';
      img.onload=()=>{if(valid())element.replaceChildren(img);};
      img.src=src;
    }
  };
  if(safe.kind==='anime'){
    setImage(DuduNpcAnimeCandidatesV14.styleFor(safe.presetId),true);
    DuduNpcAnimeCandidatesV14.ensureHiRes().then(ok=>{
      if(ok)setImage(DuduNpcAnimeCandidatesV14.hiResStyleFor(safe.presetId),true);
    }).catch(()=>{});
  }else if(safe.kind==='vector'){
    // Older saves keep kind=vector, but the approved F/M IDs now use V40 anime
    // sheets consistently in every player/avatar and NPC portrait location.
    const premium=window.DuduNpcPremiumV40?.styleFor(safe.presetId);
    if(premium)setImage(premium,true);
    else {
      const oldAnime=DuduNpcPortraitLibrary.preset(safe.presetId)?.animeId;
      if(oldAnime){
        setImage(DuduNpcAnimeCandidatesV14.styleFor(oldAnime),true);
        DuduNpcAnimeCandidatesV14.ensureHiRes().then(ok=>{
          if(ok)setImage(DuduNpcAnimeCandidatesV14.hiResStyleFor(oldAnime),true);
        }).catch(()=>{});
      }else setImage(DuduNpcPortraitLibrary.sourceFor(safe.presetId));
    }
  }else if(safe.kind==='upload'&&owner){
    DuduNpcPortraitLibrary.readUpload(owner,DuduPlayerAvatarV16.SCOPE,safe.uploadId)
      .then(src=>{
        if(DuduPlayerAvatarV16.isValidImageDataURL(src))setImage(src);
      }).catch(()=>{});
  }
}
function renderPlayerAvatarPlacesV16(){
  if(!playerAvatarAllowedV497())return;
  for(const [id,display] of [
    ['player-avatar-v1','grid'],['phone-player-avatar-v16','grid'],
    ['player-avatar-header-v16','grid']
  ]){
    const target=document.getElementById(id);
    if(target){target.style.display=display;renderPlayerAvatarV16(target);}
  }
  const home=document.getElementById('player-avatar-home-v16');
  if(home)home.style.display='flex';
  const text=document.getElementById('phone-player-name-v16');
  if(text)text.textContent=userProfile.name||currentUsername||'Kẻ Lang Bạt';
}
function selectPlayerAvatarKindV16(kind){
  if(!playerAvatarDraftV16||!['initials','anime','vector','upload'].includes(kind))return;
  playerAvatarUploadGenerationV16++;
  playerAvatarVisibleCountV41=12;
  const old=playerAvatarDraftV16;
  playerAvatarDraftV16={kind,frameId:old.frameId,uploadId:kind==='upload'?old.uploadId:'',
    presetId:kind==='anime'?
      (DuduPlayerAvatarV16.ANIME.includes(old.presetId)?old.presetId:DuduPlayerAvatarV16.ANIME[0]):
      kind==='vector'?
        (DuduNpcPortraitLibrary.CATALOG.some(p=>p.id===old.presetId)?old.presetId:'portrait-f-01'):''};
  renderPlayerAvatarEditorV16();
}
function renderPlayerAvatarEditorV16(){
  if(!playerAvatarAllowedV497()||!playerAvatarDraftV16)return;
  const draft=playerAvatarDraftV16;
  renderPlayerAvatarV16(document.getElementById('player-avatar-preview-v16'),draft);
  document.getElementById('player-avatar-preview-name-v16').textContent=
    userProfile.name||currentUsername||'Kẻ Lang Bạt';
  document.getElementById('player-avatar-preview-frame-v16').textContent=
    'Khung: '+DuduPlayerAvatarV16.frame(draft.frameId).name;
  const tabs=document.getElementById('player-avatar-v16-kind');
  tabs.replaceChildren();
  for(const type of [
    ['initials','Chữ mặc định'],['vector','Anime 72'],
    ['anime','Anime bổ sung'],['upload','Ảnh của tôi']
  ]){
    const btn=document.createElement('button');btn.type='button';btn.textContent=type[1];
    btn.setAttribute('aria-pressed',String(draft.kind===type[0]));
    btn.addEventListener('click',()=>selectPlayerAvatarKindV16(type[0]));
    tabs.append(btn);
  }
  const grid=document.getElementById('player-avatar-v16-preset-grid');
  grid.replaceChildren();
  const extraControls=document.getElementById('player-avatar-v41-controls');
  if(extraControls)extraControls.hidden=draft.kind!=='vector';
  document.getElementById('player-avatar-v16-upload-panel').style.display=
    draft.kind==='upload'?'block':'none';
  const remove=document.getElementById('player-avatar-v23-delete-local');
  if(remove)remove.style.display=draft.kind==='upload'&&draft.uploadId?'inline-flex':'none';
  grid.style.display=['anime','vector'].includes(draft.kind)?'grid':'none';
  let items=draft.kind==='anime'?
    DuduNpcAnimeCandidatesV14.CANDIDATES.map(p=>({id:p.id,name:p.label,kind:'anime'})):
    draft.kind==='vector'?
      DuduNpcPortraitLibrary.CATALOG.filter(p=>/^portrait-[fm]-\d{2}$/.test(p.id))
        .map(p=>({id:p.id,name:p.id,kind:'vector',gender:p.gender})):[]; 
  if(draft.kind==='vector'){
    const gender=document.getElementById('player-avatar-v41-gender')?.value||'all';
    const search=(document.getElementById('player-avatar-v41-search')?.value||'')
      .trim().toLocaleLowerCase('vi');
    items=items.filter(item=>(gender==='all'||item.gender===gender)&&
      (!search||item.id.toLocaleLowerCase('vi').includes(search)));
  }
  const visible=draft.kind==='vector'?items.slice(0,playerAvatarVisibleCountV41):items;
  const summary=document.getElementById('player-avatar-v41-count');
  if(summary)summary.textContent=draft.kind==='vector'?
    'Đang hiển thị '+visible.length+'/'+items.length+' chân dung · gán theo ID, không gắn tính cách':'';
  const more=document.getElementById('player-avatar-v41-more');
  if(more){
    more.hidden=draft.kind!=='vector'||visible.length>=items.length;
    more.textContent='Xem thêm '+Math.min(12,items.length-visible.length)+' ảnh';
  }
  for(const item of visible){
    const btn=document.createElement('button');
    btn.type='button';btn.title=item.name;
    btn.setAttribute('aria-label','Chọn '+item.name);
    btn.setAttribute('aria-pressed',String(draft.presetId===item.id));
    const visual=document.createElement('span');
    visual.className='dudu-avatar-v16-thumb';
    if(item.kind==='anime'){
      const art=DuduNpcAnimeCandidatesV14.styleFor(item.id);
      if(art){
        visual.style.backgroundImage=art.image;
        visual.style.backgroundSize=art.size;
        visual.style.backgroundPosition=art.position;
      }
      DuduNpcAnimeCandidatesV14.ensureHiRes().then(ok=>{
        if(!ok||!visual.isConnected)return;
        const full=DuduNpcAnimeCandidatesV14.hiResStyleFor(item.id);
        if(full){
          visual.style.backgroundImage=full.image;
          visual.style.backgroundSize=full.size;
          visual.style.backgroundPosition=full.position;
        }
      }).catch(()=>{});
    }else{
      const premium=window.DuduNpcPremiumV40?.styleFor(item.id);
      if(premium){
        visual.style.backgroundImage=premium.image;
        visual.style.backgroundSize=premium.size;
        visual.style.backgroundPosition=premium.position;
      }else{
        const img=document.createElement('img');img.alt='';img.loading='lazy';
        img.src=DuduNpcPortraitLibrary.sourceFor(item.id);
        visual.append(img);
      }
    }
    const label=document.createElement('span');label.textContent=item.name;
    btn.append(visual,label);
    btn.addEventListener('click',()=>{
      if(playerAvatarDraftV16?.kind!==item.kind)return;
      playerAvatarDraftV16={...playerAvatarDraftV16,presetId:item.id,uploadId:''};
      renderPlayerAvatarEditorV16();
    });
    grid.append(btn);
  }
  const frames=document.getElementById('player-avatar-v16-frames');
  frames.replaceChildren();
  for(const frame of DuduPlayerAvatarV16.FRAMES){
    const btn=document.createElement('button');
    btn.type='button';btn.disabled=!DuduPlayerAvatarV16.canChooseFrame(frame.id);
    const lockReason={
      legend:'Chờ xác minh thành tựu truyện từ máy chủ',
      soulbond:'Chờ xác minh mốc quan hệ NPC từ máy chủ',
      author:'Chỉ mở khi tài khoản được máy chủ xác thực là Tác Giả'
    };
    btn.title=btn.disabled?(lockReason[frame.id]||'Chưa mở khóa'):frame.name;
    btn.setAttribute('aria-pressed',String(draft.frameId===frame.id));
    const dot=document.createElement('span');
    dot.className='dudu-avatar-v16-frame-dot';
    dot.style.setProperty('--frame-color',frame.color);
    const text=document.createElement('span');
    text.textContent=frame.name+(btn.disabled?' 🔒':'');
    if(btn.disabled){
      const reason=document.createElement('small');
      reason.className='dudu-avatar-v18-lock-reason';
      reason.textContent=lockReason[frame.id]||'Chưa mở khóa';
      text.append(reason);
    }
    btn.append(dot,text);
    btn.addEventListener('click',()=>{
      if(!DuduPlayerAvatarV16.canChooseFrame(frame.id))return;
      playerAvatarDraftV16={...playerAvatarDraftV16,frameId:frame.id};
      renderPlayerAvatarEditorV16();
    });
    frames.append(btn);
  }
}
function playerAvatarGalleryFilterV41(){
  playerAvatarVisibleCountV41=12;
  renderPlayerAvatarEditorV16();
}
function playerAvatarGalleryMoreV41(){
  playerAvatarVisibleCountV41+=12;
  renderPlayerAvatarEditorV16();
}
function openPlayerAvatarEditorV16(){
  if(!playerAvatarAllowedV497())return;
  const modal=document.getElementById('player-avatar-v16-modal');
  if(!modal)return;
  playerAvatarReturnFocusV16=document.activeElement;
  playerAvatarUploadGenerationV16++;
  playerAvatarEditOwnerV16=playerAvatarOwnerV16();
  playerAvatarDraftV16={...playerAvatarCurrentV16()};
  playerAvatarVisibleCountV41=12;
  const gender=document.getElementById('player-avatar-v41-gender');
  const search=document.getElementById('player-avatar-v41-search');
  if(gender)gender.value='all';
  if(search)search.value='';
  const feedback=document.getElementById('player-avatar-v23-feedback');
  if(feedback)feedback.textContent='';
  if(typeof closePlayerAvatarSyncReviewV21==='function')
    closePlayerAvatarSyncReviewV21();
  if(typeof avatarV22Reset==='function')avatarV22Reset();
  if(typeof avatarV22InitPanel==='function')avatarV22InitPanel();
  modal.style.display='flex';modal.setAttribute('aria-hidden','false');
  renderPlayerAvatarEditorV16();
  document.getElementById('player-avatar-v16-close').focus({preventScroll:true});
}
function closePlayerAvatarEditorV16(){
  const modal=document.getElementById('player-avatar-v16-modal');
  if(!modal||modal.style.display!=='flex')return;
  modal.style.display='none';modal.setAttribute('aria-hidden','true');
  playerAvatarUploadGenerationV16++;
  playerAvatarDraftV16=null;playerAvatarEditOwnerV16=null;
  if(typeof avatarV22Reset==='function')avatarV22Reset();
  if(typeof closePlayerAvatarSyncReviewV21==='function')
    closePlayerAvatarSyncReviewV21();
  const focus=playerAvatarReturnFocusV16;
  playerAvatarReturnFocusV16=null;
  if(focus?.isConnected)focus.focus({preventScroll:true});
}
function savePlayerAvatarV16(){
  if(!playerAvatarAllowedV497()||!playerAvatarDraftV16||
     playerAvatarEditOwnerV16!==playerAvatarOwnerV16())return;
  const valid=DuduPlayerAvatarV16.validate(playerAvatarDraftV16,playerAvatarOptionsV16());
  if(!valid){
    document.getElementById('player-avatar-v16-status').textContent=
      'Chọn ảnh hợp lệ hoặc quay về avatar mặc định.';
    return;
  }
  userProfile.playerAvatar={...valid};
  saveCurrentAccount();
  renderPlayerAvatarPlacesV16();
  const npcId=document.getElementById('chat-character-selector')?.value;
  if(npcId)renderChatMessages(npcId);
  closePlayerAvatarEditorV16();
}
async function deletePlayerAvatarLocalV23(){
  if(!playerAvatarAllowedV497()||!playerAvatarDraftV16||
     playerAvatarDraftV16.kind!=='upload')return false;
  const uid=playerAvatarOwnerV16();
  const id=playerAvatarDraftV16.uploadId;
  if(!uid||playerAvatarEditOwnerV16!==uid||
     !/^own-[a-zA-Z0-9-]{1,60}$/.test(id))return false;
  // Deletion is irreversible on this device; remote copies (if they exist)
  // are not touched by the Sandbox action.
  if(!window.confirm('Xóa ảnh avatar này trên thiết bị? Không thể khôi phục ảnh đã xóa.'))return false;
  const generation=++playerAvatarUploadGenerationV16;
  const active=()=>playerAvatarEditOwnerV16===uid&&
    playerAvatarOwnerV16()===uid&&
    generation===playerAvatarUploadGenerationV16&&
    document.getElementById('player-avatar-v16-modal')?.style.display==='flex';
  if(!active())return false;
  const status=document.getElementById('player-avatar-v16-status');
  const savedId=userProfile.playerAvatar?.kind==='upload'?
    userProfile.playerAvatar.uploadId:null;
  // Save fallback first. A failed IndexedDB delete can only orphan a local
  // image, not leave an active avatar pointing to missing bytes.
  if(savedId===id){
    userProfile.playerAvatar={kind:'initials',presetId:'',uploadId:'',frameId:
      DuduPlayerAvatarV16.canChooseFrame(userProfile.playerAvatar.frameId)?
        userProfile.playerAvatar.frameId:'none'};
    saveCurrentAccount();
  }
  playerAvatarDraftV16={kind:'initials',presetId:'',uploadId:'',
    frameId:playerAvatarDraftV16.frameId};
  renderPlayerAvatarPlacesV16();
  renderPlayerAvatarEditorV16();
  try{
    await DuduNpcPortraitLibrary.deleteUpload(uid,DuduPlayerAvatarV16.SCOPE,id);
    if(active()){
      status.textContent='Ảnh đã xóa trên thiết bị này. Avatar mặc định được giữ lại.';
      const notice=document.getElementById('player-avatar-v23-feedback');
      if(notice)notice.textContent=status.textContent;
    }
    return true;
  }catch(_){
    if(active()){
      status.textContent='Avatar đã đổi về mặc định, nhưng chưa dọn được ảnh cũ trên thiết bị.';
      const notice=document.getElementById('player-avatar-v23-feedback');
      if(notice)notice.textContent=status.textContent;
    }
    return false;
  }
}
async function uploadPlayerAvatarV16(event){
  if(!playerAvatarAllowedV497()||!playerAvatarDraftV16||!playerAvatarEditOwnerV16)return;
  const input=event.target,file=input.files?.[0];input.value='';
  if(!file)return;
  const status=document.getElementById('player-avatar-v16-status');
  const policy=window.DuduPlayerAvatarCompressV41;
  const error=policy?.validateFile(file)||(!policy?'missing-policy':null);
  if(error){
    status.textContent=error==='too-large'?
      'Ảnh gốc vượt 40 MB. Hãy giảm dung lượng tệp rồi chọn lại.':
      'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP hợp lệ (tệp gốc tối đa 40 MB).';
    return;
  }
  const owner=playerAvatarEditOwnerV16;
  const generation=++playerAvatarUploadGenerationV16;
  const objectUrl=URL.createObjectURL(file);
  const originalMB=(file.size/1048576).toFixed(2);
  status.textContent=file.size>5*1048576?
    'Ảnh '+originalMB+' MB — đang tự giảm kích thước và nén trên thiết bị…':
    'Đang tối ưu độ nét ảnh '+originalMB+' MB trên thiết bị…';
  const active=()=>generation===playerAvatarUploadGenerationV16&&
    owner===playerAvatarOwnerV16()&&
    owner===playerAvatarEditOwnerV16&&
    document.getElementById('player-avatar-v16-modal')?.style.display==='flex';
  try{
    const image=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('invalid-image'));
      img.src=objectUrl;
    });
    if(!active())return;
    const result=policy.resize(image,{
      createCanvas:()=>document.createElement('canvas'),
      checkUrl:value=>DuduPlayerAvatarV16.isValidImageDataURL(value)
    });
    if(!active())return;
    const id=DuduNpcPortraitLibrary.makeId();
    if(!await DuduNpcPortraitLibrary.saveUpload(
      owner,DuduPlayerAvatarV16.SCOPE,id,result.dataUrl))
      throw Error('storage-failed');
    // The upload belongs ONLY to the owner captured before any await.
    // A late IndexedDB write is discarded when the editor/account changes.
    if(!active()){
      try{await DuduNpcPortraitLibrary.deleteUpload(
        owner,DuduPlayerAvatarV16.SCOPE,id);}catch(_){}
      return;
    }
    playerAvatarDraftV16={...playerAvatarDraftV16,kind:'upload',
      uploadId:id,presetId:''};
    renderPlayerAvatarEditorV16();
    status.textContent='Đã nén '+originalMB+' MB → '+Math.ceil(result.bytes/1024)+
      ' KB ('+result.edge+'×'+result.edge+' px). Bấm Lưu avatar để áp dụng.';
  }catch(error){
    if(active())status.textContent=error?.message==='unsupported-dimensions'?
      'Ảnh quá lớn về số pixel hoặc bị lỗi. Thử ảnh khác có độ phân giải thấp hơn.':
      'Không thể xử lý/lưu ảnh này. Hãy thử JPG, PNG hoặc WebP khác.';
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}
// Capture Escape to avoid accidentally closing the phone behind the editor.
document.addEventListener('keydown',event=>{
  const modal=document.getElementById('player-avatar-v16-modal');
  if(!playerAvatarAllowedV497()||modal?.style.display!=='flex')return;
  if(event.key==='Escape'){
    event.preventDefault();event.stopImmediatePropagation();closePlayerAvatarEditorV16();
  }else if(event.key==='Tab'){
    const controls=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled])')]
      .filter(x=>x.getClientRects().length>0);
    if(!controls.length)return;
    const i=controls.indexOf(document.activeElement);
    if(event.shiftKey&&i<=0){event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey&&(i===controls.length-1||i<0)){
      event.preventDefault();controls[0].focus();
    }
  }
},true);
