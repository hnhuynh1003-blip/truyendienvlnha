/* V71 — minimalist production System. Server truth only; no demo persona leak.
 * The ordinary DUDU Messenger and AU Core remain separate.
 */
(function(root){
 'use strict';
 const doc=root.document,client=root.DuduSystemClientV71,canon=root.DuduTraversalV69;
 if(!doc||!client)return;
 const get=id=>doc.getElementById(id);
 const h=(tag,cl,text)=>{
  const n=doc.createElement(tag);if(cl)n.className=cl;
  if(text!==undefined)n.textContent=String(text);return n;
 };
 const btn=(text,cl,fn)=>{
  const b=h('button',cl,text);b.type='button';b.addEventListener('click',fn);return b;
 };
 const uid=()=>root.DuduAuth?.isReady?.()===true?root.DuduAuth?.uid?.():null;
 const isAuthor=()=>!!uid()&&root.DuduAuth?.isAdmin?.()===true&&
  (typeof canEditStories==='function'&&canEditStories()===true);
 let current=null,owner=null,pending=false,generation=0,escapeKey=null,loadError='';
 function clearPopup(){
  get('dudu-v69-status-popup')?.remove();
  if(escapeKey){doc.removeEventListener('keydown',escapeKey);escapeKey=null;}
 }
 function status(text){const el=get('dudu-v71-message');if(el)el.textContent=text;}
 function screen(text){
  const n=h('div','dudu-v71-lock');
  n.append(h('div','dudu-v71-sigil','✧'),
   h('div','dudu-v71-eyebrow','DUDU · GIAO THỨC LIÊN KẾT'),
   h('h2','','HỆ THỐNG ĐANG KHÓA'),
   h('p','',text));
  return n;
 }
 function loading(){
  const host=get('dudu-v69-system-view');if(!host)return;
  host.replaceChildren(screen('Đang đối chiếu Thẻ thông hành và hồ sơ máy chủ…'));
 }
 function run(op,callback){
  if(pending)return;
  const start=uid(),t=++generation;
  pending=true;status('Đang xác minh với máy chủ…');
  Promise.resolve(op()).then(res=>{
   if(start!==uid()||t!==generation)return;
   if(!res?.ok){status(res?.error||'Chưa thể xử lý yêu cầu.');return;}
   current=res.data;callback?.(res.data);renderState();
  }).catch(()=>{if(start===uid())status('Kết nối gián đoạn, dữ liệu không thay đổi.');})
   .finally(()=>{pending=false;});
 }
 function locked(host,profile){
  const box=screen('Nhập mã Thẻ thông hành nhận được sau nhiệm vụ mở đầu.');
  const form=h('form','dudu-v71-pass-form');
  const input=h('input','dudu-v71-input');
  input.type='text';input.maxLength=48;input.autocomplete='off';
  input.placeholder='DT-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX';
  input.setAttribute('aria-label','Mã Thẻ thông hành');input.required=true;
  const submit=h('button','dudu-v71-main','XÁC NHẬN THÔNG HÀNH');
  submit.type='submit';
  form.append(input,submit);
  form.addEventListener('submit',e=>{
   e.preventDefault();
   const code=input.value.trim();
   input.value='';
   run(()=>client.redeem(code));
  });
  box.append(form);
  box.append(h('small','dudu-v71-whisper',
   profile?.passport?.state==='issued'?'Máy chủ đã cấp thẻ cho tài khoản này.':
   'Chưa có thẻ? Hoàn thành nhiệm vụ để nhận mã cá nhân.'));
  box.append(btn('MỞ NHIỆM VỤ ↗','dudu-v71-textbtn',()=>root.openPhoneApp?.('quests')));
  const feedback=h('p','dudu-v71-message','');feedback.id='dudu-v71-message';feedback.setAttribute('role','status');
  box.append(feedback);host.append(box);
 }
 function nameStep(host,d){
  const wrap=h('section','dudu-v71-name-step');
  wrap.append(h('div','dudu-v71-eyebrow','ĐÃ NHẬN HỆ THỐNG · ĐĂNG KÝ DANH TÍNH'),
   h('div','dudu-v71-sigil','✧'),h('h2','','CHÀO MỪNG KÝ CHỦ'),
   h('p','','Mã định danh đã được gắn với tài khoản và không thể sửa. Hãy chọn tên ký chủ để hệ thống gọi bạn.'));
  const tag=h('div','dudu-v71-host-id','ID KÝ CHỦ · '+d.host.id);
  const form=h('form','dudu-v71-pass-form');
  const input=h('input','dudu-v71-input');
  input.type='text';input.maxLength=28;input.minLength=2;
  input.required=true;input.placeholder='Tên ký chủ (2–28 ký tự)';
  input.setAttribute('aria-label','Đăng ký tên ký chủ');
  const submit=h('button','dudu-v71-main','XÁC NHẬN DANH TÍNH');
  submit.type='submit';form.append(input,submit);
  form.addEventListener('submit',e=>{
   e.preventDefault();run(()=>client.registerName(input.value.trim()));
  });
  const feedback=h('p','dudu-v71-message','');feedback.id='dudu-v71-message';
  feedback.setAttribute('role','status');
  wrap.append(tag,form,feedback);host.append(wrap);
 }
 function progressRow(label,value){
  const x=h('div','dudu-v71-meta');x.append(h('span','',label),h('strong','',value));return x;
 }
 function statusPopup(){
  if(!current?.host?.name||!uid()||owner!==uid())return false;
  clearPopup();
  const parent=get('phone-app-system');if(!parent)return false;
  const cover=h('div','dudu-v69-popup');cover.id='dudu-v69-status-popup';
  cover.setAttribute('role','dialog');cover.setAttribute('aria-modal','true');
  cover.setAttribute('aria-label','Bảng chỉ số ký chủ');
  const panel=h('div','dudu-v69-popup-card');
  const head=h('div','dudu-v69-popup-head');
  const close=btn('×','dudu-v69-close',clearPopup);
  close.setAttribute('aria-label','Đóng chỉ số');
  head.append(h('h2','','BẢNG TRẠNG THÁI'),close);
  panel.append(head,h('div','dudu-v71-eyebrow',
   current.host.name+' · '+current.host.id));
  const stats=h('div','dudu-v69-stat-grid');
  for(const attr of canon?.attributes||[]){
   const value=current.host.stats?.[attr.id];
   const cell=h('div','dudu-v69-stat');
   cell.append(h('span','',attr.name),
    h('strong','',Number.isInteger(value)?value:'—'));
   if(Number.isInteger(value)){
    const track=h('div','dudu-v71-track');const fill=h('i','');
    fill.style.width=Math.max(0,Math.min(100,value))+'%';
    track.append(fill);cell.append(track);
   }
   stats.append(cell);
  }
  panel.append(stats);cover.append(panel);parent.append(cover);
  cover.addEventListener('click',e=>{if(e.target===cover)clearPopup();});
  escapeKey=e=>{if(e.key==='Escape')clearPopup();};
  doc.addEventListener('keydown',escapeKey);
  close.focus({preventScroll:true});return true;
 }
 function dashboard(host,d){
  const hero=h('section','dudu-v71-hero');
  hero.append(h('div','dudu-v71-eyebrow','✦ KẾT NỐI HỆ THỐNG'),
   h('h2','',d.host.name),
   h('div','dudu-v71-id',d.host.id));
  const bar=h('div','dudu-v71-ribbon');
  bar.append(h('span','','KÝ CHỦ LV '+d.host.level),
   h('span','',d.host.exp+' EXP'));
  hero.append(bar);host.append(hero);
  const system=h('section','dudu-v71-system');
  const sym=h('div','dudu-v71-system-sigil','✧');
  const text=h('div','dudu-v71-system-title');
  text.append(h('span','dudu-v71-eyebrow','LIÊN KẾT HỆ THỐNG'),
   h('h3','',d.system.name),h('small','',d.system.id));
  const top=h('div','dudu-v71-system-top');top.append(sym,text);system.append(top);
  const rank=h('div','dudu-v71-rank');
  rank.append(h('span','','CẤP '+d.system.rank+' · LV '+d.system.level),
   h('span','',d.system.exp+' EXP'));
  system.append(rank);
  if(d.pact?.status!=='signed'){
   system.append(h('p','dudu-v71-pact-note',
    'Hệ thống đã được phân phối. Cần xác nhận khế ước trước khi liên kết.'));
   const consent=h('label','dudu-v71-consent');
   const check=h('input','');check.type='checkbox';
   consent.append(check,h('span','',
     'Tôi đồng ý khế ước thử nghiệm V71. Chưa mở nhiệm vụ xuyên truyện hay phần thưởng thật.'));
   const sign=btn('KÝ KHẾ ƯỚC','dudu-v71-main',()=>{
    if(check.checked)run(()=>client.acceptPact());
    else status('Bạn cần đồng ý điều khoản trước khi ký.');
   });
   system.append(consent,sign);
  }else{
   system.append(h('p','dudu-v71-connected','● Khế ước đã được ghi trên máy chủ'));
  }
  host.append(system);
  const actions=h('div','dudu-v71-tools');
  actions.append(btn('◈  Chỉ số','dudu-v71-main',statusPopup));
  const details=h('details','dudu-v71-details');
  details.append(h('summary','','✧ Thành tựu và kho'));
  const inner=h('div','dudu-v71-detail-grid');
  for(const [label,val] of [
   ['Thế giới',d.progress.worlds],['Nhiệm vụ',d.progress.missions],
   ['Thành tựu',d.progress.achievements],['Vật phẩm',d.progress.items],
   ['Quà đã nhận',d.progress.rewards]
  ])inner.append(progressRow(label,String(val)));
  details.append(inner);
  actions.append(btn('▤  Nhật ký','dudu-v71-alt',()=>{details.open=!details.open;}));
  host.append(actions,details);
  const foot=h('div','dudu-v71-footer');
  foot.append(h('span','','TRẠNG THÁI THẾ GIỚI'),
   h('strong','','CHƯA MỞ NHIỆM VỤ XUYÊN TRUYỆN'));
  host.append(foot);
  const feedback=h('p','dudu-v71-message','');feedback.id='dudu-v71-message';
  feedback.setAttribute('role','status');host.append(feedback);
 }
 function unavailable(host,message,retry=false){
  const panel=screen(message);panel.className='dudu-v71-unavailable';
  if(retry)panel.append(btn('THỬ KẾT NỐI LẠI','dudu-v71-alt',()=>renderSystem()));
  host.append(panel);
 }
 function renderState(){
  const host=get('dudu-v69-system-view');if(!host)return false;
  clearPopup();host.replaceChildren();
  if(!uid()){
   unavailable(host,'Đăng nhập Firebase để kiểm tra Thẻ thông hành trên máy chủ.');
   return true;
  }
  if(!current){
   unavailable(host,loadError||'Chưa kết nối được máy chủ Hệ Thống.',true);
   return true;
  }
  if(current.stage==='locked')locked(host,current);
  else if(!current.host?.name)nameStep(host,current);
  else dashboard(host,current);
  return true;
 }
 async function renderSystem(){
  const next=uid();
  if(next!==owner){current=null;owner=next;generation++;loadError='';}
  loading();
  const runId=++generation;
  if(!next){current=null;renderState();return false;}
  const result=await client.me();
  if(uid()!==next||runId!==generation)return false;
  current=result.ok&&result.data?result.data:null;
  loadError=current?'':(result.error||'Không thể đọc registry hiện tại.');
  renderState();
  return !!current;
 }
 function renderCore(){
  const host=get('dudu-v69-core-view');if(!host)return false;
  host.replaceChildren();if(!isAuthor())return false;
  const section=h('div','dudu-v71-core');
  section.append(h('div','dudu-v71-eyebrow','DUDU · QUẢN TRỊ CHỦ THẦN'),
   h('h2','','CHỦ THẦN'),h('p','',
    'Truyền chỉ thị để DeepSeek phân tích và điều phối. Các lệnh thực thi chỉ có hiệu lực sau khi máy chủ nghiệm thu.'));
  const input=h('textarea','dudu-v71-input');
  input.rows=5;input.maxLength=1400;input.placeholder='Nhập chỉ thị cho Chủ Thần…';
  input.setAttribute('aria-label','Chỉ thị Chủ Thần');
  const output=h('pre','dudu-v71-core-reply','DeepSeek chưa được kích hoạt. Chưa thi hành hành động nào.');
  const send=btn('GỬI CHỈ THỊ','dudu-v71-main',async()=>{
   if(!isAuthor())return;
   const value=input.value.trim();if(value.length<5){output.textContent='Chỉ thị quá ngắn.';return;}
   send.disabled=true;output.textContent='Đang chờ DeepSeek…';
   try{
    const result=await root.DuduCoreAIV70?.ask?.(value);
    if(isAuthor())output.textContent=result?.ok?result.text+
     '\n\n[Phân tích, không phải lệnh xử phạt thực thi]':
     result?.message||'AI chưa sẵn sàng.';
   }finally{send.disabled=false;}
  });
  section.append(input,send,output);
  // Pilot issuance is a privileged *testing operation* not a DeepSeek order.
  const tests=h('details','dudu-v71-details');
  tests.append(h('summary','','Cấp thẻ kiểm tra cho AU (tài khoản này)'));
  const issue=btn('TẠO THẺ THỬ MÁY CHỦ','dudu-v71-alt',()=>{
   issue.disabled=true;issued.textContent='Đang xin thẻ từ registry…';
   client.issueOwnerTestPass().then(res=>{
    issued.textContent=res.ok?
     'Mã thẻ của bạn: '+res.data.code+' · lưu lại trước khi đóng.':
     (res.error||'Không được phép cấp thẻ.');
   }).finally(()=>{issue.disabled=false;});
  });
  const issued=h('p','dudu-v71-issued','Chỉ UID AU có quyền admin và nằm trong bí mật triển khai mới được cấp.');
  tests.append(issue,issued);section.append(tests);
  host.append(section);return true;
 }
 function syncAccess(){
  const launch=get('dudu-v69-core-launch');
  if(launch){launch.hidden=!isAuthor();launch.style.display=isAuthor()?'':'none';}
  if(!isAuthor()&&get('phone-app-core-console')?.style.display==='flex')root.phoneHome?.();
  const next=uid();
  if(owner!==next){
   // Clear the previous account's server-derived System DOM immediately.
   // A cached panel must not remain visible while a new UID is loading.
   owner=next;current=null;loadError='';generation++;clearPopup();
   if(get('dudu-v69-system-view'))renderState();
  }
  return isAuthor();
 }
 function passportQuest(){
  const host=get('dudu-v69-passport-quest');if(!host)return false;
  host.replaceChildren();
  const box=h('div','dudu-v71-quest');
  box.append(h('strong','','✧ Thẻ thông hành'),h('small','',
   'Hoàn thành nhiệm vụ mở đầu để nhận mã Thẻ thông hành. Khi được cấp, nhập mã trong Hệ Thống.'));
  box.append(btn('ĐẾN HỆ THỐNG ↗','dudu-v71-alt',()=>root.openPhoneApp?.('system')));
  host.append(box);return true;
 }
 const api=Object.freeze({
  version:3,isAuthor,render:renderSystem,renderSystem,renderCore,
  syncAccess,passportQuest,statusPopup,canSignPact:()=>false,canGrantReward:()=>false
 });
 root.DuduSystemAppsV69=api;
 const init=()=>{syncAccess();passportQuest();};
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 doc.addEventListener('dudu:phone:lifecycle',()=>syncAccess());
})(typeof window!=='undefined'?window:{});
