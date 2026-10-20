/* DUDU V69 — a separate player System app and AU-only Core console.
 * NOT the DUDU Messenger friend. Read-only, fail-closed until backend ticket
 * issuance, consent, signed pact, progression and audit APIs exist.
 */
(function(root){
 'use strict';
 const model=root.DuduTraversalV69;
 if(!root.document||!model)return;
 const document=root.document;
 const byId=id=>document.getElementById(id);
 const node=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 const isSandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
 function identity(){
  const current=typeof currentUsername==='string'?currentUsername:'';
  if(!current)return null;
  if(isSandbox())return {id:'sandbox:'+current,verified:false};
  try{
   if(root.DuduAuth?.isReady?.()===true&&root.DuduAuth.uid()===current)
    return {id:'firebase:'+current,verified:true};
  }catch(_){}
  return null;
 }
 function isAuthor(){
  const user=identity();
  if(!user)return false;
  try{return typeof canEditStories==='function'&&canEditStories()===true&&
    (isSandbox()||(root.DuduAuth?.isReady?.()===true&&root.DuduAuth?.isAdmin?.()===true));}
  catch(_){return false;}
 }
 const unknown=value=>value==null?'—':String(value);
 function pair(label,value){
  const row=node('div','dudu-v69-kv');
  row.append(node('span','',label),node('strong','',unknown(value)));
  return row;
 }
 function field(label,text){
  const article=node('article','dudu-v69-panel');
  article.append(node('h3','',label),node('p','',text));
  return article;
 }
 function currentLegacyLevel(){
  // This is the EXISTING book/account profile, NOT a signed System level.
  const user=identity();
  if(!user||!user.verified)return 'Chưa có hồ sơ thật được xác thực';
  try{
   const level=Number(userProfile?.level),exp=Number(userProfile?.exp);
   if(Number.isSafeInteger(level)&&level>=1&&Number.isSafeInteger(exp)&&exp>=0)
    return 'Lv '+level+' · '+exp+' EXP (hồ sơ đọc truyện, không phải hệ thống)';
  }catch(_){}
  return 'Chưa tải được tiến độ đọc truyện';
 }
 function statusPopup(){
  const panel=byId('phone-app-system'),existing=byId('dudu-v69-status-popup');
  existing?.remove();
  if(!panel)return;
  const cover=node('div','dudu-v69-popup');
  cover.id='dudu-v69-status-popup';
  cover.setAttribute('role','dialog');
  cover.setAttribute('aria-modal','true');
  cover.setAttribute('aria-label','Bảng chỉ số ký chủ');
  const dialog=node('section','dudu-v69-popup-card');
  const title=node('h2','','✦ Bảng trạng thái ký chủ');
  const close=node('button','dudu-v69-close','×');
  close.type='button';close.setAttribute('aria-label','Đóng bảng chỉ số');
  const hide=()=>{cover.remove();document.removeEventListener('keydown',escape);};
  const escape=e=>{if(e.key==='Escape')hide();};
  close.addEventListener('click',hide);
  cover.addEventListener('click',e=>{if(e.target===cover)hide();});
  const head=node('div','dudu-v69-popup-head');head.append(title,close);
  dialog.append(head,node('p','dudu-v69-muted',
    'Chỉ số xuyên truyện chờ máy chủ xác minh. Dấu — không đại diện cho điểm 0.'));
  const stats=node('div','dudu-v69-stat-grid');
  const values=model.projection().stats;
  for(const s of model.attributes){
   const tile=node('article','dudu-v69-stat');
   tile.append(node('span','',s.name),node('strong','',unknown(values[s.id])),
     node('small','',s.impact));
   stats.append(tile);
  }
  dialog.append(stats,node('p','dudu-v69-muted',
    'Trong thế giới được mở chính thức, chỉ số sẽ tác động lựa chọn, nhiệm vụ ẩn và điều kiện vật phẩm. Quyết định phải do World Engine/Server kiểm chứng.'));
  cover.append(dialog);panel.append(cover);
  document.addEventListener('keydown',escape);
  close.focus({preventScroll:true});
 }
 function systemView(){
  const host=byId('dudu-v69-system-view');if(!host)return false;
  host.replaceChildren();
  const id=identity(),data=model.projection();
  const header=field('✦ Hệ Thống Xuyên Truyện',
   id?'Hồ sơ đang xem: '+(id.verified?'Firebase đã đăng nhập':'Sandbox · thử giao diện'):
     'Hãy đăng nhập để chuẩn bị nhận Thẻ thông hành trong Nhiệm vụ.');
  header.append(node('p','dudu-v69-muted','Trạng thái hệ thống: CHƯA KÍCH HOẠT · Không cấp tiến trình giả.'));
  host.append(header);
  const step=node('section','dudu-v69-panel');
  step.append(node('h3','','Tuyến mở khóa chính thức'));
  const list=node('ol','dudu-v69-steps');
  for(const text of [
   'Hoàn thành nhiệm vụ mở đầu ở ứng dụng Nhiệm vụ',
   'Máy chủ nghiệm thu và cấp Thẻ thông hành cho đúng tài khoản',
   'Người chơi xem điều khoản và tự nguyện ký khế ước với hệ thống con',
   'Hệ thống được kích hoạt; sau đó mới phân phối thế giới, EXP và nâng cấp'
  ])list.append(node('li','',text));
  step.append(list);
  step.append(pair('Thẻ thông hành',data.passport.status==='unavailable'?'Chưa có nguồn xác thực':data.passport.status));
  step.append(pair('Khế ước',data.pact.status==='not_launched'?'Chưa mở':data.pact.status));
  const action=node('button','dudu-v69-disabled','Ký khế ước · Chưa đủ điều kiện');
  action.disabled=true;action.type='button';step.append(action);
  const quest=node('button','dudu-v69-secondary','Đến Nhiệm vụ →');
  quest.type='button';quest.addEventListener('click',()=>root.openPhoneApp?.('quests'));
  step.append(quest);
  host.append(step);
  const inspect=node('section','dudu-v69-panel');
  inspect.append(node('h3','','Hồ sơ & thành tựu'));
  const open=node('button','dudu-v69-primary','Xem bảng chỉ số ↗');
  open.type='button';open.addEventListener('click',statusPopup);
  inspect.append(open,
   pair('Cấp và EXP đọc truyện',currentLegacyLevel()),
   pair('Cấp hệ thống',unknown(data.system.rank)),
   pair('EXP hệ thống',unknown(data.system.exp)),
   pair('Cấp ký chủ xuyên truyện',unknown(data.player.level)),
   pair('Trạng thái ký chủ',data.player.state==='unknown'?'Chưa xác thực':data.player.state),
   pair('Tiểu thế giới đã xuyên',unknown(data.progress.worldsCrossed)),
   pair('Nhiệm vụ hoàn thành',unknown(data.progress.missionsCompleted)),
   pair('Thành tựu đã xác minh',unknown(data.progress.achievements)),
   pair('Phần thưởng đã nhận',unknown(data.rewards.claimedCount)),
   pair('Vật phẩm xuyên giới',unknown(data.rewards.itemCount)));
  host.append(inspect);
  host.append(field('Hệ thống con đồng hành · Đang khóa',
   'Chưa có Thẻ thông hành xác thực và khế ước thì chưa có hệ thống theo ký chủ, kỹ năng, trí nhớ hệ thống, điểm nâng cấp hay quyền xuyên truyện.'));
  const mechanics=node('section','dudu-v69-panel');
  mechanics.append(node('h3','','Các thuộc tính ảnh hưởng gameplay'));
  for(const attr of model.attributes)mechanics.append(pair(attr.name,attr.impact));
  mechanics.append(node('p','dudu-v69-muted',
   'Nhánh ẩn, lựa chọn và vật phẩm chỉ được hiện sau khi đủ điều kiện được Engine kiểm tra. Bốn ví dụ điều kiện hiện đang nằm trong bộ thiết kế, không phải phần thưởng có thể nhận.'));
  host.append(mechanics);
  return true;
 }
 function draftKey(){
  const id=identity();return isAuthor()&&id?'dudu:v69:core-rule-draft:'+id.id:null;
 }
 function loadDraft(){
  const key=draftKey();if(!key)return null;
  try{return model.validateAuthorDraft(JSON.parse(root.localStorage?.getItem(key)||'null'));}
  catch(_){return null;}
 }
 function renderCore(){
  const host=byId('dudu-v69-core-view');if(!host)return false;
  host.replaceChildren();
  if(!isAuthor()){
   host.append(field('Quyền truy cập bị từ chối',
    'Bộ điều khiển Chủ Thần chỉ dành cho AU có quyền tác giả đã được kiểm tra. Không được mở qua giao diện độc giả.'));
   return false;
  }
  host.append(field('✦ Bảng điều khiển Chủ Thần · AU',
   'Nơi thiết kế luật, xem cấu trúc bằng chứng và kiểm tra hậu quả. Luật đang soạn KHÔNG tự áp dụng cho người chơi, và không có quyền phạt hoặc trích xuất dữ liệu tài khoản người khác trên trình duyệt.'));
  const view=node('section','dudu-v69-panel');
  view.append(node('h3','','Luật hiện hành và điểm kiểm soát'));
  for(const p of model.authorPolicyFields)view.append(pair(p.label,p.rule));
  host.append(view);
  const draft=node('section','dudu-v69-panel');
  draft.append(node('h3','','Soạn luật nháp (riêng AU, chỉ trên thiết bị)'));
  const selected=loadDraft();
  const label=node('label','','Phạm vi luật');label.setAttribute('for','dudu-v69-policy-id');
  const select=node('select','dudu-v69-input');select.id='dudu-v69-policy-id';
  for(const rule of model.authorPolicyFields){
   const opt=node('option','',rule.label);opt.value=rule.id;select.append(opt);
  }
  if(selected)select.value=selected.policyId;
  const disposition=node('select','dudu-v69-input');
  disposition.setAttribute('aria-label','Biện pháp xử lý');
  for(const [id,name] of [['observe','Chỉ theo dõi'],['review','Chuyển điều tra có bằng chứng'],
    ['hold','Đề nghị tạm giữ để xem xét']]){
    const opt=node('option','',name);opt.value=id;disposition.append(opt);
  }
  if(selected)disposition.value=selected.disposition;
  const note=node('textarea','dudu-v69-input');note.maxLength=220;
  note.rows=3;note.placeholder='Điều kiện, bằng chứng cần có, phạm vi áp dụng...';
  note.setAttribute('aria-label','Ghi chú quy tắc nháp');
  note.value=selected?.note||'';
  const save=node('button','dudu-v69-primary','Lưu bản nháp AU');
  save.type='button';
  const feedback=node('p','dudu-v69-muted','Chưa có dịch vụ phát hành luật hoặc hình phạt. Không đọc dữ liệu người chơi thật.');
  feedback.setAttribute('role','status');
  save.addEventListener('click',()=>{
   const value=model.validateAuthorDraft({policyId:select.value,
     disposition:disposition.value,note:note.value});
   const key=draftKey();
   if(!isAuthor()||!key||!value){
    feedback.textContent='Không đủ quyền hoặc bản nháp không hợp lệ.';return;
   }
   try{
    root.localStorage.setItem(key,JSON.stringify(value));
    feedback.textContent='Đã lưu nháp cục bộ. Chưa áp dụng luật hoặc hình phạt.';
   }catch(_){feedback.textContent='Không lưu được bản nháp trên thiết bị.';}
  });
  draft.append(label,select,disposition,note,save,feedback);
  host.append(draft);
  const audit=node('section','dudu-v69-panel');
  audit.append(node('h3','','Bằng chứng & trích xuất thông tin'));
  audit.append(node('p','',
   'Bản thiết kế: xác thực quyền AU/Chủ Thần trên server → ghi nhận eventId, UID phạm vi, nhiệm vụ, receipt đã ký, nhật ký thay đổi và bằng chứng có thể kiểm tra → duyệt hình phạt, kháng nghị, ghi log idempotent.'));
  audit.append(node('p','dudu-v69-muted',
   'Không truy vấn hoặc công khai UID/người chơi khác; không thực hiện trích xuất, tạm giữ, trừ Xu/EXP hoặc khóa tài khoản khi backend chưa được triển khai.'));
  host.append(audit);
  const stat=node('section','dudu-v69-panel');
  stat.append(node('h3','','Xây dựng điều kiện chỉ số (mô phỏng)'));
  for(const sample of model.discoveryExamples){
   const r=model.previewConditions(null,sample.conditions);
   stat.append(pair(sample.title,sample.conditions.map(x=>x.attribute+' ≥ '+x.min).join(' + ')+
     ' · '+r.state));
  }
  host.append(stat);
  return true;
 }
 function syncAccess(){
  const launch=byId('dudu-v69-core-launch');
  if(launch){
   const au=isAuthor();
   launch.hidden=!au;
   launch.style.display=au?'':'none';
  }
  const current=byId('phone-app-core-console');
  if(!isAuthor()&&current?.style.display==='flex'){
   root.phoneHome?.();
   current.style.display='none';
  }
  return isAuthor();
 }
 function passportQuest(){
  const host=byId('dudu-v69-passport-quest');
  if(!host)return false;
  host.replaceChildren();
  const panel=field('🎫 Thẻ thông hành xuyên truyện',
   'Chỉ được cấp sau khi hoàn thành nhiệm vụ mở đầu trong ứng dụng Nhiệm vụ và máy chủ xác nhận kết quả. Các nhiệm vụ V43.7 hiện chưa thể phát thẻ này.');
  panel.append(pair('Trạng thái','Chưa có nhiệm vụ cấp thẻ được công bố'));
  const btn=node('button','dudu-v69-secondary','Xem điều kiện khế ước →');
  btn.type='button';btn.addEventListener('click',()=>root.openPhoneApp?.('system'));
  panel.append(btn);host.append(panel);return true;
 }
 const api=Object.freeze({version:1,identity,isAuthor,render:systemView,
  renderSystem:systemView,renderCore,syncAccess,passportQuest,
  statusPopup,canGrantReward:()=>false,canSignPact:()=>false});
 root.DuduSystemAppsV69=api;
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',()=>{syncAccess();passportQuest();},{once:true});
 else {syncAccess();passportQuest();}
 document.addEventListener('dudu:phone:lifecycle',event=>{
  if(event?.detail?.accountChanged)syncAccess();
 });
})(typeof window!=='undefined'?window:{});
