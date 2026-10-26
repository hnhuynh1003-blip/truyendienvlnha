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
 function resetSystemScroll(){
  const host=get('dudu-v69-system-view');
  if(host)host.scrollTop=0;
 }
 function screen(text,{title='HỆ THỐNG ĐANG KHÓA',state='CHƯA LIÊN KẾT'}={}){
  const n=h('section','dudu-v71-lock');
  n.append(h('div','dudu-v71-inscription','✦  DUDU SYSTEM · VẠN GIỚI  ✦'));
  const seal=h('div','dudu-v71-seal');
  seal.append(h('span','dudu-v71-seal-outer',''),h('span','dudu-v71-sigil','✧'));
  n.append(seal,h('div','dudu-v71-eyebrow','GIAO THỨC THÔNG HÀNH'),
   h('h2','',title),h('p','dudu-v71-gate-description',text));
  const signal=h('div','dudu-v71-signal');
  signal.append(h('span','','◈ TRẠNG THÁI'),h('strong','',state));
  n.append(signal);
  return n;
 }
 function loading(){
  const host=get('dudu-v69-system-view');if(!host)return;
  host.replaceChildren(screen('Đang đối chiếu Thẻ thông hành và hồ sơ máy chủ…'));
  resetSystemScroll();
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
 function authorTestCard(){
  const wrap=h('details','dudu-v71-au-pilot');
  wrap.append(h('summary','','✦ THẺ THỬ DÀNH CHO AU'));
  const inner=h('div','dudu-v71-au-pilot-inner');
  const note=h('p','',
   'Chỉ tài khoản AU có Firebase admin và UID được cho phép mới có thể yêu cầu thẻ thử. Mã chỉ được hiển thị trong phiên này.');
  const consent=h('label','dudu-v71-au-consent');
  const check=h('input','');check.type='checkbox';
  consent.append(check,h('span','',
   'Tôi xác nhận tạo thẻ thử gắn với chính tài khoản này. Thẻ có hiệu lực một lần.'));
  const output=h('div','dudu-v71-au-output','');
  output.setAttribute('role','status');
  let complete=false;
  const issue=btn('TẠO THẺ THỬ AU','dudu-v71-main',async()=>{
   if(pending||complete||!isAuthor())return;
   if(!check.checked){
    output.textContent='Cần xác nhận trước khi yêu cầu cấp thẻ.';return;
   }
   const original=uid();pending=true;issue.disabled=true;
   output.textContent='Đang xác minh quyền AU với registry…';
   try{
    const res=await client.issueOwnerTestPass();
    if(uid()!==original||!isAuthor()||owner!==original||!wrap.isConnected)return;
    if(!res?.ok){output.textContent=res?.error||'Máy chủ không cho phép cấp thẻ.';return;}
    const code=res.data?.code;
    if(typeof code!=='string'||!/^DT-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/.test(code)){
     output.textContent='Máy chủ trả về mã không hợp lệ. Không tự tạo thẻ ở trình duyệt.';
     return;
    }
    complete=true;
    // Never persist or log a pass; keep it in this authenticated DOM only.
    const secret=h('code','dudu-v71-au-code',code);
    const copy=btn('SAO CHÉP MÃ THẺ','dudu-v71-alt',async()=>{
     if(!isAuthor()||uid()!==original)return;
     try{
      if(typeof root.navigator?.clipboard?.writeText!=='function')
       throw Error('Clipboard API unavailable');
      await root.navigator.clipboard.writeText(code);
      copy.textContent='ĐÃ SAO CHÉP';
     }catch(_){copy.textContent='Không sao chép được. Hãy chép mã phía trên.';}
    });
    output.replaceChildren(h('strong','','THẺ ĐÃ ĐƯỢC MÁY CHỦ CẤP'),
     secret,h('small','','Giữ riêng mã này, sau đó nhập ở ô Thẻ thông hành.'),
     copy);
   }catch(_){
    if(uid()===original)output.textContent='Không thể cấp thẻ. Chưa xác nhận giao dịch.';
   }finally{
    pending=false;issue.disabled=complete;
   }
  });
  inner.append(note,consent,issue,output);
  wrap.append(inner);
  return wrap;
 }
 function locked(host,profile){
  const box=screen('Chỉ Thẻ thông hành được máy chủ cấp cho tài khoản này mới có thể thức tỉnh Hệ Thống.',
   {state:'ĐANG CHỜ THÔNG HÀNH'});
  const access=h('div','dudu-v71-access');
  access.append(h('div','dudu-v71-access-heading','✦ XÁC THỰC THẺ THÔNG HÀNH'));
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
  access.append(form);
  access.append(h('small','dudu-v71-whisper',
   profile?.passport?.state==='issued'?'Máy chủ đã cấp thẻ cho tài khoản này.':
   'Nhiệm vụ phát Thẻ thông hành chính thức chưa mở cho độc giả.'));
  access.append(btn('XEM NHIỆM VỤ ↗','dudu-v71-textbtn',()=>root.openPhoneApp?.('quests')));
  const feedback=h('p','dudu-v71-message','');feedback.id='dudu-v71-message';feedback.setAttribute('role','status');
  access.append(feedback);
  if(isAuthor())access.append(authorTestCard());
  box.append(access);
  box.append(h('small','dudu-v71-seal-note','Danh tính và chỉ số đều do máy chủ xác nhận.'));
  host.append(box);
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
 function numberFromServer(value){
  return Number.isSafeInteger(value)&&value>=0?String(value):'—';
 }
 function infoPopup(kind){
  if(!current?.host?.name||!uid()||owner!==uid()||current.authoritative!==true)return false;
  const cfg={
   quests:{title:'NHIỆM VỤ THẾ GIỚI',subtitle:'Nhiệm vụ riêng của từng tiểu thế giới',
    rows:current.worldAccess===true&&current.worldContext?.activeMission?.missionId&&
     current.worldContext?.activeWorld?.smallWorldId?
     [['Tiểu thế giới',current.worldContext.activeWorld.name||current.worldContext.activeWorld.smallWorldId],
      ['Mã thế giới',current.worldContext.activeWorld.smallWorldId],
      ['Mã nhiệm vụ',current.worldContext.activeMission.missionId],
      ['Trạng thái',current.worldContext.activeMission.status||'Chưa xác minh']]:
     [['Tiểu thế giới hiện tại','Chưa được phân công'],
      ['Nhiệm vụ đang hoạt động','Chưa có']],
    foot:current.worldAccess===true&&current.worldContext?.activeMission?.missionId?
     'Chỉ hiện phân công từ máy chủ; kết quả và phần thưởng cần Game Engine xác minh.':
     'Mỗi tiểu thế giới có nhiệm vụ riêng. Nhiệm vụ chỉ xuất hiện khi máy chủ phân công kịch bản đã phát hành. Hiện chưa có nhiệm vụ thật để nhận.'},
   journal:{title:'NHẬT KÝ',subtitle:'Tổng quan tiến trình ký chủ',
    rows:[['Khế ước',current.pact?.status==='signed'?'Đã ký':'Chưa ký'],
     ['Thế giới',numberFromServer(current.progress?.worlds)],
     ['Nhiệm vụ',numberFromServer(current.progress?.missions)],
     ['Thành tựu',numberFromServer(current.progress?.achievements)]],
    foot:'Registry V71 chưa cung cấp lịch sử sự kiện cho giao diện. Không tạo nhật ký giả.'},
   inventory:{title:'KHO',subtitle:'Thống kê được xác minh từ registry',
    rows:[['Vật phẩm',numberFromServer(current.progress?.items)],
     ['Thành tựu',numberFromServer(current.progress?.achievements)],
     ['Quà đã nhận',numberFromServer(current.progress?.rewards)]],
    foot:'Chỉ hiển thị tổng số. Danh sách vật phẩm Thiên Mệnh chưa được mở.'}
  }[kind];
  if(!cfg)return false;
  clearPopup();
  const parent=get('phone-app-system');if(!parent)return false;
  const cover=h('div','dudu-v69-popup');cover.id='dudu-v69-status-popup';
  cover.setAttribute('role','dialog');cover.setAttribute('aria-modal','true');
  cover.setAttribute('aria-label',cfg.title);
  const panel=h('section','dudu-v69-popup-card dudu-v71-info-card');
  const head=h('div','dudu-v69-popup-head');
  const close=btn('×','dudu-v69-close',clearPopup);
  close.setAttribute('aria-label','Đóng bảng');
  head.append(h('h2','',cfg.title),close);
  panel.append(head,h('p','dudu-v71-info-subtitle',cfg.subtitle));
  const rows=h('div','dudu-v71-info-rows');
  for(const [label,value] of cfg.rows)rows.append(progressRow(label,value));
  panel.append(rows,h('p','dudu-v71-info-foot',cfg.foot));
  cover.append(panel);parent.append(cover);
  cover.addEventListener('click',e=>{if(e.target===cover)clearPopup();});
  escapeKey=e=>{if(e.key==='Escape')clearPopup();};
  doc.addEventListener('keydown',escapeKey);
  close.focus({preventScroll:true});return true;
 }
 function gameTile(icon,label,style,action,subtitle=''){
  const tile=btn('','dudu-v71-game-tile dudu-v71-tile-'+style,action);
  const symbol=h('span','dudu-v71-tile-symbol',icon);
  symbol.setAttribute('aria-hidden','true');
  const info=h('span','dudu-v71-tile-text');
  info.append(h('strong','',label));
  if(subtitle)info.append(h('small','',subtitle));
  tile.append(symbol,info,h('span','dudu-v71-tile-arrow','›'));
  return tile;
 }
 function noticeItem(level,label,message){
  const entry=h('div','dudu-v71-notice-entry dudu-v71-notice-'+level);
  entry.append(h('span','dudu-v71-notice-marker','◆'),
   h('span','dudu-v71-notice-text','【'+label+'】 '+message));
  return entry;
 }
 function dashboard(host,d){
  const linked=d.pact?.status==='signed';
  // Core identity: only the signed server response can supply an ID/rank/EXP.
  const system=h('section','dudu-v71-system dudu-v71-system-identity');
  const sym=h('div','dudu-v71-system-sigil','✧');
  const title=h('div','dudu-v71-system-title');
  // Displayed serial is only a public alias, not an internal ledger key.
  const publicId=String(d.system.id||'').trim();
  const found=/^DUDU-(\d{1,3})$/i.exec(publicId);
  const serial=found?String(Number(found[1])):String(d.system.name||publicId||'Hệ thống');
  title.append(h('span','dudu-v71-eyebrow','✧ HỆ THỐNG ĐỒNG HÀNH'),
   h('h3','dudu-v71-system-number',serial));
  const top=h('div','dudu-v71-system-top');top.append(sym,title);
  system.append(top);
  // No repeated 'Ký chủ' label or 'ID ký chủ' prefix.
  const hostLine=h('div','dudu-v71-hero dudu-v71-hostline');
  hostLine.append(h('h2','dudu-v71-host-name',d.host.name),
   h('small','dudu-v71-id',d.host.id));
  system.append(hostLine);
  const rank=h('div','dudu-v71-rank');
  rank.append(h('span','','CẤP '+d.system.rank+' · LV '+numberFromServer(d.system.level)),
   h('span','',numberFromServer(d.system.exp)+' EXP'));
  system.append(rank,h('div','dudu-v71-exp-track'));
  if(!linked){
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
  } // Linked players do not need a redundant confirmation line.
  host.append(system);

  // A compact, native disclosure belongs AFTER the actionable game menu.
  // The player should never have to scroll through notices to reach actions.
  const notices=h('details','dudu-v71-notices dudu-v71-notices-compact');
  const summary=h('summary','dudu-v71-notices-summary');
  const noticePreview=d.worldAccess===true&&d.worldContext?.activeMission?.missionId?
   'Có phân công nhiệm vụ thế giới':'Chưa có nhiệm vụ thế giới';
  summary.append(
   h('span','dudu-v71-notices-symbol','✧'),
   h('span','dudu-v71-notices-summary-text','THÔNG BÁO HỆ THỐNG'),
   h('span','dudu-v71-notices-summary-preview',noticePreview),
   h('span','dudu-v71-notices-chevron','⌄'));
  notices.append(summary);
  const feed=h('div','dudu-v71-notices-feed');
  feed.append(noticeItem('info','Nhiệm vụ thế giới',
   d.worldAccess===true&&d.worldContext?.activeMission?.missionId?
   'Đang theo dõi phân công '+d.worldContext.activeMission.missionId+'.':
   'Chưa có nhiệm vụ riêng của tiểu thế giới được phân công.'));
  notices.append(feed,h('small','dudu-v71-notices-source',
   'Trạng thái từ registry · Chưa kích hoạt đối thoại AI'));

  const actions=h('nav','dudu-v71-tools dudu-v71-game-menu');
  actions.setAttribute('aria-label','Các mục Thiên Mệnh');
  actions.append(
   gameTile('▥','Chỉ số','stats',statusPopup),
   gameTile('▤','Nhiệm vụ','quests',()=>infoPopup('quests')),
   gameTile('≡','Nhật ký','journal',()=>infoPopup('journal')),
   gameTile('▣','Kho','inventory',()=>infoPopup('inventory')));
  host.append(actions);
  const foot=h('section','dudu-v71-footer dudu-v71-world-gate');
  foot.append(h('span','dudu-v71-world-icon','◇'),
   h('span','','TRẠNG THÁI THẾ GIỚI'),
   h('strong','',d.worldAccess===true?
    'ĐÃ MỞ QUYỀN TRUY CẬP THẾ GIỚI':'CHƯA MỞ NHIỆM VỤ XUYÊN TRUYỆN'));
  host.append(foot,notices);
  const feedback=h('p','dudu-v71-message','');feedback.id='dudu-v71-message';
  feedback.setAttribute('role','status');host.append(feedback);
 }
 function unavailable(host,message,retry=false){
  const panel=screen(message,{
   title:retry?'KẾT NỐI GIÁN ĐOẠN':'CHỜ KÝ CHỦ',
   state:retry?'CHƯA KẾT NỐI MÁY CHỦ':'CHƯA XÁC THỰC'
  });
  // Preserve dudu-v71-lock: removing it broke the System layout on phones.
  panel.className+=' dudu-v71-unavailable';
  const action=h('div','dudu-v71-access dudu-v71-offline-actions');
  action.append(h('div','dudu-v71-access-heading',
   retry?'◈ KÊNH ĐỊNH DANH TẠM GIÁN ĐOẠN':'◈ XÁC THỰC TÀI KHOẢN'));
  action.append(h('p','dudu-v71-offline-note',retry?
   'Hồ sơ ký chủ vẫn an toàn và đang bị khóa. Hãy thử lại sau khi máy chủ V71 sẵn sàng.':
   'Đăng nhập Firebase để xác minh Thẻ thông hành.'));
  if(retry)action.append(btn('↻ THỬ KẾT NỐI LẠI','dudu-v71-main',()=>renderSystem()));
  else action.append(btn('ĐĂNG NHẬP ĐỂ TIẾP TỤC','dudu-v71-main',
   ()=>root.openAuthModal?.()));
  panel.append(action,h('small','dudu-v71-seal-note',
   'Không tạo danh tính hoặc chỉ số mô phỏng khi mất kết nối.'));
  host.append(panel);
 }
 function renderState(){
  const host=get('dudu-v69-system-view');if(!host)return false;
  clearPopup();host.replaceChildren();
  if(!uid()){
   unavailable(host,'Đăng nhập Firebase để kiểm tra Thẻ thông hành trên máy chủ.');
   resetSystemScroll();return true;
  }
  if(!current){
   unavailable(host,loadError||'Chưa kết nối được máy chủ Hệ Thống.',true);
   resetSystemScroll();return true;
  }
  if(current.stage==='locked')locked(host,current);
  else if(current.host&&current.system&&current.progress){
   if(!current.host.name)nameStep(host,current);
   else dashboard(host,current);
  }else unavailable(host,'Dữ liệu hồ sơ máy chủ không đúng định dạng.',true);
  resetSystemScroll();return true;
 }
 async function renderSystem(){
  const next=uid();
  if(next!==owner){current=null;owner=next;generation++;loadError='';}
  loading();
  const runId=++generation;
  if(!next){current=null;renderState();return false;}
  const result=await client.me();
  if(uid()!==next||runId!==generation)return false;
  current=result.ok&&result.data?.authoritative===true?result.data:null;
  loadError=current?'':(result.error||'Không thể xác minh hồ sơ từ registry Hệ Thống.');
  renderState();
  return !!current;
 }
 function renderCore(){
  const host=get('dudu-v69-core-view');if(!host)return false;
  host.replaceChildren();if(!isAuthor())return false;
  const creator=h('section','dudu-v71-core');
  creator.append(h('h2','','WORLD CREATOR'),h('p','','Soạn tiểu thế giới, địa điểm và cảnh truyện.'),
   btn('MỞ BẢN SOẠN WORLD','dudu-v71-main',()=>root.DuduWorldCreator?.mount?.(host)));
  host.append(creator);
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
  // Keep passport creation inside the guarded locked System gate only.
  const gate=h('p','', 'Thẻ thử AU được cấp tại Thiên Mệnh khi ký chủ chưa liên kết. Không dùng AI để cấp thẻ.');
  section.append(gate,btn('MỞ THIÊN MỆNH','dudu-v71-alt',
   ()=>root.openPhoneApp?.('system')));
  host.append(section);return true;
 }
 function syncAccess(){
  root.DuduWorldCreator?.syncAccess?.();
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
