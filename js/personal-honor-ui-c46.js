/* C4.6 Honor Hall — compact phone home chip, avatar profile badges and
 * a full collection view. No raw backend jargon is displayed to players.
 */
(function(root){
 'use strict';
 const honor=root.DuduPersonalHonorC46,arcadeCore=root.DuduPersonalArcadeCoreV1;
 if(!honor||!root.document)return;
 const $=id=>root.document.getElementById(id);
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const uid=()=>!sandbox()&&root.DuduAuth?.isReady?.()?root.DuduAuth.uid():null;
 const account=()=>sandbox()?typeof currentUsername!=='undefined'?currentUsername:null:uid();
 const localKey=()=>account()?'dudu-personal-arcade:v1:'+encodeURIComponent(
  sandbox()?'sandbox:'+account():account()):null;
 const deviceKey=()=>uid()?'dudu-honor-device-v1:'+encodeURIComponent(uid()):null;
 const create=(tag,cls,content)=>{const e=root.document.createElement(tag);
  if(cls)e.className=cls;if(content!==undefined)e.textContent=String(content);return e;};
 let page='titles',category='Tất cả',titleScope='all',focusAchievementId=null,
  visibleLimit=8,busy=false,
  observedAt=0,observedOwner='',observedIds=null,
  announcedIds=new Set(),momentNode=null,momentTimer=null;
 const rarityName={common:'Thường',rare:'Hiếm',epic:'Sử thi',mythic:'Huyền thoại'};
 const arcadeSources=honor.JOURNEYS.map(j=>j.source);
 const ownerKey=()=>account()?(sandbox()?'sandbox:':'uid:')+account():null;
 function clearMoment(){
  if(momentTimer!==null)root.clearTimeout?.(momentTimer);
  momentTimer=null;momentNode?.remove?.();momentNode=null;
  $('cyber-phone')?.classList?.remove('dudu-c411-celebrating');
 }
 function matchOwner(){
  const owner=ownerKey();
  if(owner!==observedOwner){clearMoment();observedOwner=owner||'';
   observedAt=0;observedIds=null;announcedIds=new Set();}
  return owner;
 }
 function showUnlockMoment(moment){
  const phone=$('cyber-phone');
  if(!phone||phone.style.display!=='flex'){clearMoment();return false;}
  clearMoment();
  const toast=create('div','dudu-c411-unlock-toast');
  toast.dataset.rarity=moment.rarity;
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  toast.setAttribute('aria-atomic','true');
  toast.append(create('span','dudu-c411-unlock-symbol',moment.icon));
  const detail=create('div','dudu-c411-unlock-detail');
  detail.append(create('small','',
   (moment.title?'✦ DANH HIỆU MỚI':'✧ THÀNH TỰU MỚI')+' · '+rarityName[moment.rarity].toUpperCase()),
   create('strong','',moment.name),
   create('span','',moment.source+(moment.count>1?' · '+moment.count+' mốc vừa hoàn tất':'')));
  toast.append(detail);
  toast.append(create('span','dudu-c411-unlock-stars','✦'));
  phone.append(toast);phone.classList?.add('dudu-c411-celebrating');momentNode=toast;
  const duration=moment.rarity==='mythic'?6200:moment.rarity==='epic'?5000:4000;
  if(typeof root.setTimeout==='function')momentTimer=root.setTimeout(()=>{
   if(momentNode===toast)clearMoment();
  },duration);
  return true;
 }
 function announce(ids,sources){
  if(!matchOwner())return false;
  const fresh=(Array.isArray(ids)?ids:[]).filter(id=>!announcedIds.has(id));
  const moment=honor.unlockMoment([],fresh,sources);
  if(!moment)return false;
  for(const id of moment.ids)announcedIds.add(id);
  return showUnlockMoment(moment);
 }
 function readArcade(){
  const key=localKey();if(!key||!arcadeCore)return null;
  try{return arcadeCore.norm(JSON.parse(root.localStorage.getItem(key)||'null'),Date.now());}
  catch(_){return null;}
 }
 const profile=()=>typeof userProfile!=='undefined'&&userProfile?userProfile:null;
 // Only pass the few local progress signals used for cosmetic achievements;
 // the transaction never publishes these counters as account rewards.
 function localEvidence(){
  const p=profile()||{};
  return {readRewards:p.readRewards||{},quests:p.quests||[],questV437:p.questV437||{},
   storyStates:{__duduBlindBoxC29:p.storyStates?.__duduBlindBoxC29||{}}};
 }
 function devicePreferences(){
  const key=deviceKey();if(!key)return null;
  try{
   const s=JSON.parse(root.localStorage.getItem(key)||'null');
   if(!s||s.version!==1||s.uid!==uid())return null;
   return {version:1,uid:s.uid,
    equipped:honor.TITLES.some(t=>t.id===s.equipped)?s.equipped:null,
    pinned:Array.isArray(s.pinned)?s.pinned.filter(id=>honor.CATALOG.some(a=>a.id===id)).slice(0,3):null};
  }catch(_){return null;}
 }
 function writeDevicePreferences(prefs){
  const key=deviceKey();if(!key||!prefs)return false;
  try{
   if(!prefs.equipped&&prefs.pinned===null)root.localStorage.removeItem(key);
   else root.localStorage.setItem(key,JSON.stringify(prefs));
   return true;
  }catch(_){return false;}
 }
 function current(){
  const p=profile()||{},a=readArcade(),device=devicePreferences();
  if(!device)return honor.view(p,a);
  const saved=honor.norm(p.honorV1);
  const earned=[...new Set([...saved.earned,...honor.discovered(p,a)])];
  const overlay={...saved,earned,
   equipped:device.equipped&&honor.titleUnlocked(device.equipped,earned)?
    device.equipped:saved.equipped,
   pinned:device.pinned===null?saved.pinned:device.pinned};
  return honor.view({...p,honorV1:overlay},a);
 }
 function activeTitle(v){return v.titles.find(t=>t.id===v.equipped)||v.titles[0];}
 function refresh(){
  if(!profile())return;
  const v=current(),selected=activeTitle(v);
  const rarity=rarityName[selected.rarity]||rarityName.common;
  const frame=$('dudu-honor-home-title')?.closest?.('.dudu-honor-identity-frame');
  if(frame)frame.dataset.rarity=selected.rarity;
  const chip=$('dudu-honor-home-title');
  if(chip){
   const label=$('dudu-honor-home-title-label'),emblem=$('dudu-honor-home-emblem'),
    caption=$('dudu-honor-home-rarity');
   if(label)label.textContent=selected.name;
   if(emblem)emblem.textContent=selected.icon;
   if(caption)caption.textContent='VINH DANH · '+rarity.toLocaleUpperCase('vi-VN');
   chip.dataset.rarity=selected.rarity;chip.disabled=!account();
   chip.setAttribute('aria-label','Danh hiệu '+selected.name+' · bậc '+rarity+'. Mở Sổ Vinh Danh');
  }
  const title=$('profile-title');
  if(title){title.textContent=selected.icon+' '+selected.name;title.dataset.rarity=selected.rarity;}
  const summary=$('dudu-honor-profile-summary');
  if(summary){summary.replaceChildren();
   const pinned=v.pinned.filter(id=>v.earned.includes(id));
   if(pinned.length){
    for(const id of pinned){const a=honor.CATALOG.find(row=>row.id===id);
     if(!a)continue;
     const badge=create('span','dudu-honor-profile-medal',a.icon);
     badge.dataset.rarity=a.rarity;
     badge.title=a.name+' · '+(rarityName[a.rarity]||'Thường');summary.append(badge);}
   }else summary.append(create('span','dudu-honor-profile-empty',
    'Chưa ghim huy hiệu · Chọn trong Sổ Vinh Danh'));
  }
  const count=$('dudu-honor-profile-count');if(count)count.textContent=
   v.titles.filter(t=>t.unlocked).length+' danh hiệu · '+v.unlockedCount+' thành tựu';
 }
 function rarityTag(r){const badge=create('span','dudu-honor-rarity dudu-honor-'+r,rarityName[r]||r);
  return badge;}
 function metric(v){
  const hero=create('section','dudu-honor-hero');
  hero.append(create('small','','✦ NHẬT KÝ CHINH PHỤC'));
  const selected=activeTitle(v),row=create('div','dudu-honor-hero-row');
  hero.dataset.rarity=selected.rarity;
  row.append(create('span','dudu-honor-main-symbol',selected.icon));
  const copy=create('div','dudu-honor-main-copy');
  copy.append(create('small','','DANH HIỆU ĐANG TRANG BỊ'),
   create('strong','',selected.name),rarityTag(selected.rarity));
  row.append(copy);hero.append(row);
  const stats=create('div','dudu-honor-stats');
  stats.append(create('span','',v.titles.filter(x=>x.unlocked).length+'/'+v.titles.length+' danh hiệu'),
   create('span','',v.unlockedCount+'/'+honor.CATALOG.length+' thành tựu'),
   create('span','',v.pinned.length+'/3 huy hiệu ghim'));
  hero.append(stats);return hero;
 }
 function goToGoal(t){
  if(!t?.goal)return;
  page=t.goal.secret?'secrets':'achievements';
  category=categories.includes(t.source)?t.source:'Khác';
  focusAchievementId=t.goal.id;visibleLimit=8;render();
  const host=$('dudu-honor-content-c46');if(host)host.scrollTop=0;
 }
 function huntSpotlight(t){
  const section=create('section','dudu-honor-hunt-spotlight');section.dataset.rarity=t.rarity;
  section.append(create('span','dudu-honor-hunt-sigil',t.icon));
  const copy=create('div','dudu-honor-hunt-info');
  copy.append(create('small','','✦ MỤC TIÊU ĐÁNG SĂN · '+rarityName[t.rarity]),
   create('strong','',t.name),
   create('span','',t.goal.description+' · '+t.goal.current+'/'+t.goal.target));
  section.append(copy);
  const action=create('button','dudu-honor-hunt-open','›');action.type='button';
  action.title='Xem điều kiện '+t.name;
  action.setAttribute('aria-label',action.title);
  action.addEventListener('click',()=>goToGoal(t));section.append(action);
  return section;
 }
 function titleCard(t,v){
  const locked=!t.unlocked,selected=t.id===v.equipped;
  const secret=locked&&t.goal?.secret;
  const card=create('article','dudu-honor-card dudu-honor-title-card'+
   (locked?' is-locked':'')+(selected?' is-equipped':''));
  card.dataset.rarity=t.rarity;
  card.append(create('span','dudu-honor-symbol',secret?'◇':t.icon));
  const copy=create('div','dudu-honor-card-copy');
  copy.append(create('strong','',secret?'Danh hiệu bí ẩn':t.name),
   create('small','',locked?(secret?'Nguồn: '+t.source+' · Điều kiện ẩn':t.goal?.description||'Chưa mở khóa'):
    t.source));
  if(locked&&t.goal&&!secret){
   const progress=create('div','dudu-honor-title-progress');
   const track=create('span','dudu-honor-title-track');
   const fill=create('i','');fill.style.width=Math.floor(t.goal.current/t.goal.target*100)+'%';
   track.append(fill);progress.append(track,
    create('span','',t.goal.current+'/'+t.goal.target));
   copy.append(progress);
  }
  copy.append(rarityTag(t.rarity));card.append(copy);
  const action=create('button','dudu-honor-action',selected?'Đang dùng':locked?'Xem mốc ›':'Sử dụng');
  action.type='button';action.disabled=selected||busy;
  if(locked)action.setAttribute('aria-label','Xem điều kiện mở khóa '+(secret?'danh hiệu bí ẩn':t.name));
  if(!action.disabled)action.addEventListener('click',()=>{
   if(locked)goToGoal(t);else void transact('equip',{titleId:t.id});
  });
  card.append(action);return card;
 }
 function achievementCard(a,v){
  const hidden=a.secret&&!a.unlocked;
  const card=create('article','dudu-honor-achievement'+(a.unlocked?' is-earned':' is-locked')+
   (a.id===focusAchievementId?' is-target':''));
  card.dataset.rarity=a.rarity;
  const emblem=create('span','dudu-honor-ach-icon',hidden?'✧':a.icon);
  const content=create('div','dudu-honor-ach-copy');
  content.append(create('small','',a.source+' · '+rarityName[a.rarity]),
   create('strong','',hidden?'Bí mật chưa khám phá':a.name),
   create('p','',hidden?'Hãy tiếp tục khám phá, dấu mốc này sẽ tự hé lộ.':a.description));
  const meter=create('div','dudu-honor-ach-meter'),fill=create('i','');
  fill.style.width=(hidden?0:a.unlocked?100:a.current/a.target*100)+'%';meter.append(fill);
  content.append(meter,create('small','',a.unlocked?'✓ Đã hoàn thành':hidden?'???':
   a.current+'/'+a.target));
  card.append(emblem,content);
  if(a.unlocked){
   const pinned=v.pinned.includes(a.id);
   const action=create('button','dudu-honor-pin'+(pinned?' is-pinned':''),
    pinned?'★':'☆');
   action.title=pinned?'Bỏ ghim huy hiệu':'Ghim huy hiệu lên hồ sơ (tối đa 3)';
   action.setAttribute('aria-label',action.title);action.type='button';action.disabled=busy;
   action.addEventListener('click',()=>{void transact('pin',{achievementId:a.id});});
   card.append(action);
  }
  return card;
 }
 function journeyCard(j){
  const complete=j.done===j.total;
  const card=create('article','dudu-honor-journey'+(complete?' is-complete':''));
  card.dataset.game=j.id;
  const top=create('div','dudu-honor-journey-heading');
  top.append(create('span','dudu-honor-journey-icon',j.icon));
  const heading=create('div','dudu-honor-journey-name');
  heading.append(create('small','',j.source),create('strong','',j.name));
  top.append(heading,create('span','dudu-honor-journey-count',j.done+'/'+j.total));
  card.append(top);
  const meter=create('div','dudu-honor-journey-meter');
  meter.setAttribute('role','progressbar');
  meter.setAttribute('aria-label','Tiến độ '+j.name);
  meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(j.total));
  meter.setAttribute('aria-valuenow',String(j.done));
  const fill=create('i','');fill.style.width=(j.done/j.total*100)+'%';meter.append(fill);
  card.append(meter);
  card.append(create('p','dudu-honor-journey-next',complete?
   '✦ Đã hoàn tất bộ thử thách!':
   'Mốc tiếp theo: '+j.next.name+' · '+j.next.current+'/'+j.next.target));
  const bottom=create('div','dudu-honor-journey-foot');
  bottom.append(create('small','',j.title?.icon+' Danh hiệu: '+(j.title?.name||'')));
  const action=create('button','dudu-honor-journey-open','Xem mốc ›');
  action.type='button';action.setAttribute('aria-label','Xem thử thách '+j.source);
  action.addEventListener('click',()=>{page='achievements';category=j.source;
   focusAchievementId=j.next?.id||null;visibleLimit=8;render();});
  bottom.append(action);card.append(bottom);
  return card;
 }
 const categories=['Tất cả','Trạm Neon','Địa Tầng 07','Vườn Sương','Ngọc Phường','Khác'];
 function filterRow(){
  const filters=create('div','dudu-honor-filters');
  for(const label of categories){
   const btn=create('button',category===label?'is-active':'',label);btn.type='button';
   btn.setAttribute('aria-pressed',String(category===label));
   btn.addEventListener('click',()=>{category=label;visibleLimit=8;render();});filters.append(btn);
  }
  return filters;
 }
 const titleScopes=[['all','Tất cả'],['locked','Chưa có'],['owned','Đã sở hữu'],
  ['rare','Hiếm trở lên'],['mythic','Huyền thoại']];
 function titleScopeRow(){
  const row=create('div','dudu-honor-title-scopes');
  row.setAttribute('aria-label','Lọc danh hiệu theo tình trạng và độ hiếm');
  for(const [id,label] of titleScopes){
   const btn=create('button',titleScope===id?'is-active':'',label);
   btn.type='button';btn.setAttribute('aria-pressed',String(titleScope===id));
   btn.addEventListener('click',()=>{titleScope=id;visibleLimit=8;render();});row.append(btn);
  }
  return row;
 }
 function matchesScope(t){return titleScope==='all'||
  titleScope==='locked'&&!t.unlocked||titleScope==='owned'&&t.unlocked||
  titleScope==='rare'&&t.rarity!=='common'||titleScope==='mythic'&&t.rarity==='mythic';}
 function matchesCategory(row){return category==='Tất cả'||row.source===category||
  category==='Khác'&&!categories.slice(1,-1).includes(row.source);}
 function appendPaged(body,items,renderItem,v){
  for(const item of items.slice(0,visibleLimit))body.append(renderItem(item,v));
  if(items.length>visibleLimit){
   const more=create('button','dudu-honor-more','Xem thêm '+Math.min(8,items.length-visibleLimit)+' mục ↓');
   more.type='button';more.addEventListener('click',()=>{visibleLimit+=8;render();});body.append(more);
  }
 }
 function render(){
  const host=$('dudu-honor-content-c46');if(!host)return false;
  refresh();host.replaceChildren();
  if(!account()){
   host.append(create('p','dudu-honor-empty','Đăng nhập để bắt đầu hành trình danh hiệu của riêng bạn.'));
   return true;
  }
  const v=current();host.append(metric(v));
  const device=devicePreferences();
  if(device&&(device.equipped||device.pinned!==null)){
   const note=create('div','dudu-honor-device-note');
   note.append(create('span','',
    '✧ Đang dùng trên thiết bị này · Chưa đồng bộ lên tài khoản'));
   const retry=create('button','','Thử đồng bộ');retry.type='button';
   retry.disabled=busy;
   retry.addEventListener('click',()=>{void syncDevicePreferences();});
   note.append(retry);
   host.append(note);
  }
  const nav=create('nav','dudu-honor-tabs');nav.setAttribute('aria-label','Loại vinh danh');
  for(const [id,label] of [['titles','Danh hiệu'],['journeys','Thử thách'],
   ['achievements','Thành tựu'],['secrets','Bí ẩn']]){
   const btn=create('button',page===id?'is-active':'',label);btn.type='button';
   btn.setAttribute('aria-pressed',String(page===id));
   btn.addEventListener('click',()=>{page=id;category='Tất cả';focusAchievementId=null;
    visibleLimit=8;render();});nav.append(btn);
  }
  host.append(nav);
  const body=create('div','dudu-honor-collection');
  if(page==='titles'){
   body.append(create('p','dudu-honor-tip',
    'Mỗi danh hiệu có bậc hiếm riêng. Mở khóa rồi chọn Sử dụng để trưng bày trên điện thoại.'));
   if(v.nextHunt&&category==='Tất cả'&&titleScope==='all')body.append(huntSpotlight(v.nextHunt));
   body.append(titleScopeRow(),filterRow());
   const list=v.titles.filter(t=>matchesCategory(t)&&matchesScope(t));
   if(!list.length)body.append(create('p','dudu-honor-empty','Chưa có danh hiệu trong nhóm này.'));
   appendPaged(body,list,titleCard,v);
  }else if(page==='journeys'){
   body.append(create('p','dudu-honor-tip',
    'Bốn hành trình, bốn đích đến. Mỗi mốc dựa trên kết quả chơi thật và chỉ trao huy hiệu/danh hiệu trang trí.'));
   if(category!=='Tất cả'){
    const all=create('button','dudu-honor-more','← Xem cả 4 hành trình');
    all.type='button';all.addEventListener('click',()=>{category='Tất cả';render();});
    body.append(all);
   }
   for(const journey of v.journeys.filter(j=>category==='Tất cả'||j.source===category))
    body.append(journeyCard(journey));
  }else{
   const secret=page==='secrets';
   if(!secret)body.append(filterRow());
   const list=v.achievements.filter(a=>secret?a.secret:!a.secret&&matchesCategory(a));
   if(focusAchievementId)list.sort((a,b)=>(b.id===focusAchievementId)-(a.id===focusAchievementId));
   appendPaged(body,list,achievementCard,v);
  }
  host.append(body);
  const footer=create('p','dudu-honor-footnote',sandbox()? 
   'Đây là bộ sưu tập trong Sandbox; không chuyển sang tài khoản chính.':
   'Danh hiệu là phần thưởng trang trí; không cộng Xu hay sức mạnh. Thành tích mở khóa được giữ trong hồ sơ.');
  host.append(footer);return true;
 }
 function remember(result,kind){
  if(!profile())return;
  profile().honorV1=result.honorV1;
  if(kind==='equip'||kind==='preferences')profile().title=result.title;
  const local=devicePreferences();
  if(local&&(kind==='equip'||kind==='pin'||kind==='preferences')){
   if(kind==='equip'||kind==='preferences')local.equipped=null;
   if(kind==='pin'||kind==='preferences')local.pinned=null;
   writeDevicePreferences(local);
  }
  try{root.localStorage.setItem('profile_'+account(),JSON.stringify(profile()));}catch(_){}
  refresh();
  if($('phone-app-honors')?.style.display==='flex')render();
  if(kind==='equip'){
   root.updatePhoneUI?.();root.showSystemAlert?.('ĐÃ TRANG BỊ DANH HIỆU',result.title);
  }else if(kind==='preferences'){
   root.updatePhoneUI?.();root.showSystemAlert?.('ĐÃ ĐỒNG BỘ VINH DANH',
    'Danh hiệu và huy hiệu đã lưu lên hồ sơ tài khoản.');
  }else if(kind==='pin')root.showSystemAlert?.('HUY HIỆU ĐÃ CẬP NHẬT',
   'Có thể trưng bày tối đa 3 huy hiệu trên Hồ sơ.');
  else if(result.newIds?.length)announce(result.newIds);
 }
 function sandboxTransact(kind,options,arcade){
  const p=profile();if(!p||!account())return false;
  const v=honor.view(p,arcade),next={version:1,earned:v.earned,
   equipped:v.equipped,pinned:[...v.pinned]};
  if(kind==='equip'){
   const title=v.titles.find(x=>x.id===options.titleId&&x.unlocked);
   if(!title)return false;
   next.equipped=title.id;p.title=title.name;
  }else if(kind==='pin'){
   if(!v.earned.includes(options.achievementId))return false;
   next.pinned=next.pinned.includes(options.achievementId)?
    next.pinned.filter(x=>x!==options.achievementId):
    [...next.pinned,options.achievementId].slice(-3);
  }
  p.honorV1=next;
  if(typeof saveCurrentAccount==='function')saveCurrentAccount();
  refresh();render();return true;
 }
 function deviceTransact(kind,options){
  if(kind!=='equip'&&kind!=='pin')return false;
  const owner=uid();
  if(!owner||typeof currentUsername==='undefined'||currentUsername!==owner||!profile())return false;
  const v=current();
  const local=devicePreferences()||{version:1,uid:owner,equipped:null,pinned:null};
  if(kind==='equip'){
   const t=v.titles.find(x=>x.id===options.titleId&&x.unlocked);
   if(!t)return false;
   local.equipped=t.id;
  }else{
   if(!v.earned.includes(options.achievementId))return false;
   local.pinned=v.pinned.includes(options.achievementId)?
    v.pinned.filter(id=>id!==options.achievementId):
    [...v.pinned,options.achievementId].slice(-3);
  }
  if(!writeDevicePreferences(local))return false;
  root.updatePhoneUI?.();refresh();
  root.showSystemAlert?.('ĐÃ LƯU TRÊN THIẾT BỊ',
   'Danh hiệu đã hiển thị ở máy này. Việc lưu lên tài khoản đang bị từ chối.');
  return true;
 }
 function saveFailureMessage(error){
  const reason=error?.reason||error?.code||'';
  if(reason==='title-locked')return 'Danh hiệu chưa đủ điều kiện trên tài khoản. Hãy mở Sổ Vinh Danh để cập nhật tiến độ.';
  if(reason==='achievement-locked')return 'Huy hiệu chưa được mở khóa trên tài khoản này.';
  if(reason==='profile-missing')return 'Chưa tìm thấy hồ sơ đã đồng bộ. Hãy tải lại trang sau khi đăng nhập.';
  if(reason==='invalid-account'||reason==='account-changed')return 'Tài khoản vừa thay đổi. Hãy mở lại Điện thoại rồi thử lại.';
  if(reason==='permission-denied')return 'Tài khoản chưa được phép lưu thay đổi này. Hãy kiểm tra quyền hồ sơ.';
  if(reason==='unavailable'||reason==='deadline-exceeded'||reason==='failed-precondition')
   return 'Chưa kết nối được để lưu danh hiệu. Tiến độ hiện có vẫn được giữ nguyên.';
  return 'Danh hiệu chưa được cập nhật. Hãy kiểm tra kết nối rồi thử lại.';
 }
 function syncDevicePreferences(){
  const pending=devicePreferences();if(!pending)return false;
  const v=current();
  return transact('preferences',{titleId:pending.equipped||v.equipped,
   pinnedIds:pending.pinned===null?v.pinned:pending.pinned});
 }
 async function transact(kind,options={},arcade=readArcade()){
  if(busy){
   if(kind!=='sync')root.showSystemAlert?.('ĐANG CẬP NHẬT',
    'Sổ Vinh Danh đang ghi nhận tiến độ. Hãy thử lại sau ít giây.');
   return false;
  }
  if(sandbox())return sandboxTransact(kind,options,arcade);
  // A device-only pin is already ahead of Firestore. Continue toggling that
  // local selection until an explicit reconciliation is available; sending a
  // remote toggle now could accidentally reverse the user's intended state.
  if(kind==='pin'&&devicePreferences()?.pinned!==null)
   return deviceTransact(kind,options);
  const owner=uid();
  if(!owner||typeof currentUsername==='undefined'||currentUsername!==owner||
   !root.firebase?.firestore||!root.firebase?.auth){
   if(kind!=='sync')root.showSystemAlert?.('CHƯA SẴN SÀNG','Hãy đăng nhập để lưu danh hiệu.');
   return false;
  }
  busy=true;
  try{
   if(typeof pendingLiveProfileWrites!=='undefined')
    await Promise.allSettled([...pendingLiveProfileWrites]);
   if(owner!==uid())return false;
   const result=await honor.run({db:root.firebase.firestore(),auth:root.firebase.auth(),
    uid:owner,kind,arcade,localProfile:localEvidence(),...options});
   if(owner!==uid())return false;
   remember(result,kind);return true;
  }catch(error){
   console.warn('Honor Hall:',error?.reason||error?.code||error?.message);
   if(owner===uid()&&currentUsername===owner&&
    (error?.code==='permission-denied'||error?.code==='unavailable')&&
    deviceTransact(kind,options))return true;
   if(kind!=='sync')root.showSystemAlert?.('CHƯA LƯU ĐƯỢC',
    saveFailureMessage(error));
   return false;
  }finally{busy=false;if($('phone-app-honors')?.style.display==='flex')render();}
 }
 function open(){render();if(!sandbox())void transact('sync');}
 function openGame(source){
  if(!honor.JOURNEYS.some(j=>j.source===source))return false;
  page='journeys';category=source;visibleLimit=8;render();return true;
 }
 function observeArcade(state,previousState=null){
  if(!state||!profile()||!matchOwner())return;
  // Only celebrate transitions occurring *while playing*. Existing saved
  // progress becomes the initial baseline, so reopening is never a new win.
  const currentIds=honor.discovered(profile(),state);
  const beforeIds=previousState?honor.discovered(profile(),previousState):observedIds||currentIds;
  observedIds=currentIds;
  const moment=honor.unlockMoment(beforeIds,currentIds,arcadeSources);
  const alreadyOwned=new Set(honor.norm(profile().honorV1).earned);
  if(moment)announce(moment.ids.filter(id=>!alreadyOwned.has(id)),arcadeSources);
  if(sandbox()||!uid()||typeof currentUsername!=='undefined'&&currentUsername!==uid())return;
  const time=Date.now();
  if(busy||time-observedAt<15000)return;
  const old=new Set(honor.norm(profile().honorV1).earned);
  if(!honor.discovered(profile(),state).some(id=>!old.has(id)))return;
  observedAt=time;void transact('sync',{},state);
 }
 root.DuduHonorUIV46=Object.freeze({render,refresh,open,openGame,observeArcade,readArcade});
 refresh();
})(typeof window!=='undefined'?window:null);
