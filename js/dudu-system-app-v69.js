/* DUDU V70 — single-purpose player System + prompt-first AU Core.
 * System content is not mounted until a SERVER pass exists; meanwhile a
 * sandbox-only display card offers a cosmetic preview (no grants or pact).
 * The everyday DUDU friend remains in Messenger V43/V67, never mixed in.
 */
(function(root){
 'use strict';
 const doc=root.document,model=root.DuduTraversalV69,gate=root.DuduSystemGateV70;
 if(!doc||!model||!gate)return;
 const get=id=>doc.getElementById(id);
 const el=(tag,cls,value)=>{
  const n=doc.createElement(tag);
  if(cls)n.className=cls;
  if(value!==undefined)n.textContent=String(value);
  return n;
 };
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
 let popupEscape=null;
 function identity(){
  const uid=typeof currentUsername==='string'?currentUsername:'';
  if(!uid)return null;
  if(sandbox())return {id:'sandbox:'+uid,uid,verified:false};
  try{
   if(root.DuduAuth?.isReady?.()===true&&root.DuduAuth?.uid?.()===uid)
    return {id:'firebase:'+uid,uid,verified:true};
  }catch(_){}
  return null;
 }
 function isAuthor(){
  const user=identity();if(!user)return false;
  try{return typeof canEditStories==='function'&&canEditStories()===true&&
    (sandbox()||(root.DuduAuth?.isReady?.()===true&&root.DuduAuth?.isAdmin?.()===true));}
  catch(_){return false;}
 }
 function session(){try{return root.sessionStorage||null;}catch(_){return null;}}
 function gateState(){
  const id=identity();return id?gate.state({sandbox:sandbox(),accountId:id.id,session:session()}):'locked';
 }
 function displayName(user){
  if(!user)return 'Ký chủ';
  try{
   if(userProfile&&userProfile.username===user.uid)
    return String(userProfile.name||userProfile.username||'Ký chủ').trim().slice(0,50)||'Ký chủ';
  }catch(_){}
  return 'Ký chủ '+user.uid.slice(0,6);
 }
 function row(label,value){
  const r=el('div','dudu-v69-kv');
  r.append(el('span','',label),el('strong','',value==null?'—':value));
  return r;
 }
 function panel(title,description,cls=''){
  const p=el('section','dudu-v69-panel '+cls);
  p.append(el('h3','',title));
  if(description)p.append(el('p','',description));
  return p;
 }
 function action(text,cls,fn){
  const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;
 }
 function closePopup(){
  get('dudu-v69-status-popup')?.remove();
  if(popupEscape){doc.removeEventListener('keydown',popupEscape);popupEscape=null;}
 }
 function statusPopup(){
  closePopup();
  if(gateState()!=='demo')return false; // no stats before card
  const parent=get('phone-app-system'),id=identity();if(!parent||!id)return false;
  const data=gate.demoProjection({accountId:id.id,name:displayName(id)});
  const cover=el('div','dudu-v69-popup');cover.id='dudu-v69-status-popup';
  cover.setAttribute('role','dialog');cover.setAttribute('aria-modal','true');
  cover.setAttribute('aria-label','Bảng trạng thái ký chủ');
  const inner=el('section','dudu-v69-popup-card');
  const head=el('div','dudu-v69-popup-head');
  const quit=action('×','dudu-v69-close',closePopup);
  quit.setAttribute('aria-label','Đóng bảng chỉ số');
  head.append(el('h2','','THUỘC TÍNH KÝ CHỦ'),quit);
  inner.append(head,el('p','dudu-v70-eyebrow','THÔNG SỐ MÔ PHỎNG · KHÔNG PHẢI ĐIỂM THẬT'));
  const tiles=el('div','dudu-v69-stat-grid');
  for(const s of data.stats){
   const t=el('div','dudu-v69-stat');
   t.append(el('span','',s.label),el('strong','',String(s.value)));
   const meter=el('div','dudu-v70-meter');
   const fill=el('i','');fill.style.width=s.value+'%';meter.append(fill);
   t.append(meter);tiles.append(t);
  }
  inner.append(tiles,el('p','dudu-v69-muted',
   'Các điểm chỉ để thử bố cục. Nhiệm vụ ẩn, lựa chọn và vật phẩm phải được máy chủ quyết định theo chỉ số thật.'));
  cover.append(inner);parent.append(cover);
  cover.addEventListener('click',e=>{if(e.target===cover)closePopup();});
  popupEscape=e=>{if(e.key==='Escape')closePopup();};
  doc.addEventListener('keydown',popupEscape);
  quit.focus({preventScroll:true});return true;
 }
 function lockedView(host){
  const wrap=el('div','dudu-v70-gate');
  wrap.append(el('div','dudu-v70-gate-symbol','◇'),
   el('span','dudu-v70-eyebrow','DUDU · SYSTEM ACCESS'),
   el('h2','','HỆ THỐNG CHƯA THỨC TỈNH'),
   el('p','dudu-v70-description','Nhập mã Thẻ thông hành nhận được sau khi hoàn thành nhiệm vụ mở đầu.'));
  const form=el('form','dudu-v70-entry');
  const input=el('input','dudu-v69-input');
  input.type='text';input.maxLength=48;input.autocomplete='off';
  input.placeholder='Mã Thẻ thông hành';input.setAttribute('aria-label','Nhập mã Thẻ thông hành');
  const submit=el('button','dudu-v69-primary','XÁC NHẬN MÃ');
  submit.type='submit';
  const result=el('p','dudu-v70-result','');
  result.setAttribute('role','status');
  form.append(input,submit,result);
  form.addEventListener('submit',e=>{
   e.preventDefault();
   const id=identity(),receipt=gate.admit(input.value,{
    sandbox:sandbox(),accountId:id?.id||'',session:session()
   });
   input.value='';
   if(!receipt.ok){
    result.textContent=!id?'Hãy đăng nhập trước để nhận Thẻ thông hành.':
     sandbox()?'Mã không hợp lệ. Thẻ thử không mở quyền chơi thật.':
     'Mã chưa thể xác thực: nhiệm vụ cấp thẻ và máy chủ chưa được kích hoạt.';
    return;
   }
   renderSystem();
  });
  wrap.append(form);
  wrap.append(el('p','dudu-v70-note',
   sandbox()?'CHẾ ĐỘ THỬ · Mã mẫu chỉ mở giao diện, không ký khế ước hay nhận thưởng.':
    'Không có thẻ? Hoàn thành nhiệm vụ mở đầu để nhận mã được máy chủ cấp.'));
  wrap.append(action('Đến Nhiệm vụ ↗','dudu-v69-secondary',
    ()=>root.openPhoneApp?.('quests')));
  host.append(wrap);
 }
 function unlockedView(host,id){
  const d=gate.demoProjection({accountId:id.id,name:displayName(id)});
  const hero=el('div','dudu-v70-hero');
  hero.append(el('span','dudu-v70-eyebrow','✦ SYSTEM LINK · BẢN XEM THỬ'),
   el('div','dudu-v70-title',d.host.name));
  const identifiers=el('div','dudu-v70-identifiers');
  identifiers.append(el('span','','KÝ CHỦ  /  '+d.host.id),
    el('span','','LV '+d.host.level+'  ·  '+d.host.exp+' EXP'));
  hero.append(identifiers);
  host.append(hero);
  const system=el('section','dudu-v70-system');
  const systemHead=el('div','dudu-v70-system-head');
  const face=el('div','dudu-v70-orb','✧');
  const copy=el('div','dudu-v70-system-copy');
  copy.append(el('span','dudu-v70-eyebrow','HỆ THỐNG CON ĐỒNG HÀNH'),
   el('h3','',d.system.label),el('span','dudu-v70-system-id',d.system.displayId));
  systemHead.append(face,copy);
  system.append(systemHead);
  const strip=el('div','dudu-v70-status-line');
  strip.append(el('span','',d.system.identity),
   el('span','','CẤP '+d.system.rank+' · '+d.system.level),
   el('span','','0 / 100 EXP'));
  system.append(strip);
  system.append(el('p','dudu-v70-system-note',
   'Thiên hướng: '+d.system.temperament+'. Mã công khai có thể bị giả mạo: chỉ máy chủ mới phân biệt chính quy và phi chính quy.'));
  host.append(system);
  const shortcuts=el('div','dudu-v70-actions');
  shortcuts.append(action('◈  Chỉ số','dudu-v69-primary',statusPopup));
  const info=el('details','dudu-v70-details');
  const summary=el('summary','','Thành tựu · vật phẩm · hành trình');
  info.append(summary);
  const stats=el('div','dudu-v70-summary');
  for(const [name,value] of [
   ['Đã xuyên',d.journey.worlds],['Thành tựu',d.journey.achievements],
   ['Vật phẩm',d.journey.items],['Phần thưởng',d.journey.rewards]
  ])stats.append(row(name,String(value)+' (thử)'));
  info.append(stats);
  shortcuts.append(action('♢  Nhật ký','dudu-v69-secondary',()=>{
   info.open=!info.open;
  }));
  host.append(shortcuts,info);
  const notice=el('div','dudu-v70-locked-note');
  notice.append(el('strong','','KHẾ ƯỚC & XUYÊN GIỚI ĐANG KHÓA'),
   el('small','','Thẻ thử chỉ mở bản xem. Chưa có hệ thống chính thức, ký kết, nâng cấp hoặc quyền nhận vật phẩm.'));
  host.append(notice);
  host.append(action('Trở lại màn nhập thẻ','dudu-v70-reset',()=>{
   gate.revoke({accountId:id.id,session:session()});closePopup();renderSystem();
  }));
 }
 function renderSystem(){
  const host=get('dudu-v69-system-view');if(!host)return false;
  closePopup();host.replaceChildren();
  const id=identity();
  if(!id||gateState()==='locked')lockedView(host);
  else unlockedView(host,id);
  return true;
 }
 function askCoreAI(input,output,button){
  const instruction=String(input.value||'').trim();
  if(instruction.length<5){output.textContent='Cần một chỉ thị đủ rõ để Chủ Thần phân tích.';return;}
  if(!isAuthor())return;
  if(!root.DuduCoreAIV70){
   output.textContent='Chưa kết nối tuyến DeepSeek Chủ Thần trên Worker.';return;
  }
  button.disabled=true;output.textContent='Đang gửi chỉ thị đến DeepSeek (chỉ mô phỏng quyết định)...';
  Promise.resolve(root.DuduCoreAIV70.ask(instruction))
   .then(r=>{
    if(!isAuthor())return;
    output.textContent=r?.ok?
     'Phân tích của Chủ Thần:\n'+r.text+'\n\nĐây chưa phải quyết định có hiệu lực máy chủ.':
     r?.message||'DeepSeek chưa được bật; không có hành động được thực thi.';
   }).catch(()=>{if(isAuthor())output.textContent='Không thể kết nối AI; chưa thực thi hành động.';})
   .finally(()=>{button.disabled=false;});
 }
 function renderCore(){
  const host=get('dudu-v69-core-view');if(!host)return false;
  host.replaceChildren();
  if(!isAuthor())return false; // never render privileged UI for a reader
  const hero=el('section','dudu-v70-core-hero');
  hero.append(el('span','dudu-v70-eyebrow','DUDU CORE · AU ONLY'),
   el('h2','','CHỦ THẦN'),
   el('p','','Đưa mệnh lệnh bằng ngôn ngữ tự nhiên. DeepSeek phân tích, lập quy tắc và kế hoạch điều phối trong phạm vi được cấp.'));
  host.append(hero);
  const main=panel('Chỉ thị cho Chủ Thần','Một prompt thay cho nhiều biểu mẫu.');
  const prompt=el('textarea','dudu-v69-input');
  prompt.rows=5;prompt.maxLength=1400;
  prompt.placeholder='Ví dụ: Xây luật xử lý phá khế ước, bảo hộ ký chủ và điều kiện phát sinh nhiệm vụ ẩn; phân biệt hình phạt có bằng chứng...';
  prompt.setAttribute('aria-label','Prompt chỉ thị Chủ Thần');
  const output=el('pre','dudu-v70-core-output','DeepSeek chưa kết nối. Không có hình phạt hoặc trích xuất dữ liệu nào được thực thi.');
  output.setAttribute('role','status');output.setAttribute('aria-live','polite');
  const button=action('GỬI CHỈ THỊ ĐẾN DEEPSEEK','dudu-v69-primary',()=>askCoreAI(prompt,output,button));
  main.append(prompt,button,output);
  host.append(main);
  const scope=el('details','dudu-v70-details');
  scope.append(el('summary','','Phạm vi vận hành và truy vết'));
  scope.append(el('p','',
   'AI có thể tự lập kế hoạch và giám sát bằng event đã xác thực. Máy chủ phải kiểm tra quyền hạn, bằng chứng, giới hạn ảnh hưởng và lưu lịch sử trước khi thi hành. Hình phạt thật và trích xuất dữ liệu riêng tư chưa được triển khai; không bắt AU xử lý thủ công trong giao diện này.'));
  host.append(scope);return true;
 }
 function syncAccess(){
  const launch=get('dudu-v69-core-launch'),allowed=isAuthor();
  if(launch){launch.hidden=!allowed;launch.style.display=allowed?'':'none';}
  const screen=get('phone-app-core-console');
  if(!allowed&&screen?.style.display==='flex'){root.phoneHome?.();screen.style.display='none';}
  return allowed;
 }
 function passportQuest(){
  const host=get('dudu-v69-passport-quest');if(!host)return false;
  host.replaceChildren();
  const box=el('div','dudu-v70-passport-quest');
  box.append(el('strong','','🎫 Thẻ thông hành'),
   el('small','','Hoàn thành nhiệm vụ mở đầu và chờ máy chủ cấp mã. Tài khoản Sandbox có thể sử dụng mã thử để kiểm tra giao diện Hệ Thống.'));
  box.append(action('Mở Hệ Thống →','dudu-v69-secondary',
   ()=>root.openPhoneApp?.('system')));
  host.append(box);return true;
 }
 const api=Object.freeze({
  version:2,identity,isAuthor,render:renderSystem,renderSystem,renderCore,
  syncAccess,passportQuest,statusPopup,gateState,canGrantReward:()=>false,canSignPact:()=>false
 });
 root.DuduSystemAppsV69=api;
 const init=()=>{syncAccess();passportQuest();};
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 doc.addEventListener('dudu:phone:lifecycle',event=>{
  closePopup();
  if(event?.detail?.accountChanged)syncAccess();
 });
})(typeof window!=='undefined'?window:{});
