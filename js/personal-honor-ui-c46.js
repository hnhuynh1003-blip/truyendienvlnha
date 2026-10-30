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
 const create=(tag,cls,content)=>{const e=root.document.createElement(tag);
  if(cls)e.className=cls;if(content!==undefined)e.textContent=String(content);return e;};
 let page='titles',category='Tất cả',busy=false,observedAt=0,observedOwner='',lastToast='';
 const rarityName={common:'Thường',rare:'Hiếm',epic:'Sử thi',mythic:'Huyền thoại'};
 function readArcade(){
  const key=localKey();if(!key||!arcadeCore)return null;
  try{return arcadeCore.norm(JSON.parse(root.localStorage.getItem(key)||'null'),Date.now());}
  catch(_){return null;}
 }
 const profile=()=>typeof userProfile!=='undefined'&&userProfile?userProfile:null;
 function current(){return honor.view(profile()||{},readArcade());}
 function activeTitle(v){return v.titles.find(t=>t.id===v.equipped)||v.titles[0];}
 function refresh(){
  if(!profile())return;
  const v=current(),selected=activeTitle(v);
  const chip=$('dudu-honor-home-title');
  if(chip){chip.textContent=selected.icon+' '+selected.name;
   chip.dataset.rarity=selected.rarity;chip.disabled=!account();}
  const title=$('profile-title');
  if(title){title.textContent=selected.icon+' '+selected.name;title.dataset.rarity=selected.rarity;}
  const summary=$('dudu-honor-profile-summary');
  if(summary){summary.replaceChildren();
   const pinned=v.pinned.filter(id=>v.earned.includes(id));
   if(pinned.length){
    for(const id of pinned){const a=honor.CATALOG.find(row=>row.id===id);
     if(!a)continue;
     const badge=create('span','dudu-honor-profile-medal',a.icon);
     badge.title=a.name;summary.append(badge);}
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
 function titleCard(t,v){
  const locked=!t.unlocked,selected=t.id===v.equipped;
  const card=create('article','dudu-honor-card dudu-honor-title-card'+
   (locked?' is-locked':'')+(selected?' is-equipped':''));
  card.dataset.rarity=t.rarity;
  card.append(create('span','dudu-honor-symbol',locked?'◇':t.icon));
  const copy=create('div','dudu-honor-card-copy');
  copy.append(create('strong','',locked?'Danh hiệu chưa mở':t.name),
   create('small','',locked?'Hoàn thành thành tựu liên quan để mở khóa.':t.source));
  copy.append(rarityTag(t.rarity));card.append(copy);
  const action=create('button','dudu-honor-action',selected?'Đang dùng':locked?'🔒':'Sử dụng');
  action.type='button';action.disabled=locked||selected||busy;
  if(!action.disabled)action.addEventListener('click',()=>{void transact('equip',{titleId:t.id});});
  card.append(action);return card;
 }
 function achievementCard(a,v){
  const hidden=a.secret&&!a.unlocked;
  const card=create('article','dudu-honor-achievement'+(a.unlocked?' is-earned':' is-locked'));
  card.dataset.rarity=a.rarity;
  const emblem=create('span','dudu-honor-ach-icon',hidden?'✧':a.icon);
  const content=create('div','dudu-honor-ach-copy');
  content.append(create('small','',a.source+' · '+rarityName[a.rarity]),
   create('strong','',hidden?'Bí mật chưa khám phá':a.name),
   create('p','',hidden?'Hãy tiếp tục khám phá, dấu mốc này sẽ tự hé lộ.':a.description));
  const meter=create('div','dudu-honor-ach-meter'),fill=create('i','');
  fill.style.width=(a.unlocked?100:a.current/a.target*100)+'%';meter.append(fill);
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
 function render(){
  const host=$('dudu-honor-content-c46');if(!host)return false;
  refresh();host.replaceChildren();
  if(!account()){
   host.append(create('p','dudu-honor-empty','Đăng nhập để bắt đầu hành trình danh hiệu của riêng bạn.'));
   return true;
  }
  const v=current();host.append(metric(v));
  const nav=create('nav','dudu-honor-tabs');nav.setAttribute('aria-label','Loại vinh danh');
  for(const [id,label] of [['titles','Danh hiệu'],['achievements','Thành tựu'],['secrets','Bí ẩn']]){
   const btn=create('button',page===id?'is-active':'',label);btn.type='button';
   btn.setAttribute('aria-pressed',String(page===id));
   btn.addEventListener('click',()=>{page=id;render();});nav.append(btn);
  }
  host.append(nav);
  const body=create('div','dudu-honor-collection');
  if(page==='titles'){
   body.append(create('p','dudu-honor-tip',
    'Chọn một danh hiệu để hiển thị dưới tên nhân vật. Có thể thay đổi bất cứ lúc nào.'));
   for(const t of v.titles)body.append(titleCard(t,v));
  }else{
   const secret=page==='secrets';
   if(!secret){
    const filters=create('div','dudu-honor-filters');
    for(const label of ['Tất cả','Trạm Neon','Địa Tầng 07','Vườn Sương','Ngọc Phường','Khác']){
     const btn=create('button',category===label?'is-active':'',label);btn.type='button';
     btn.setAttribute('aria-pressed',String(category===label));
     btn.addEventListener('click',()=>{category=label;render();});filters.append(btn);
    }
    body.append(filters);
   }
   const list=v.achievements.filter(a=>secret?a.secret:!a.secret&&
    (category==='Tất cả'||a.source===category||category==='Khác'&&
     !['Trạm Neon','Địa Tầng 07','Vườn Sương','Ngọc Phường'].includes(a.source)));
   for(const a of list)body.append(achievementCard(a,v));
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
  if(kind==='equip')profile().title=result.title;
  try{root.localStorage.setItem('profile_'+account(),JSON.stringify(profile()));}catch(_){}
  refresh();
  if($('phone-app-honors')?.style.display==='flex')render();
  if(kind==='equip'){
   root.updatePhoneUI?.();root.showSystemAlert?.('ĐÃ TRANG BỊ DANH HIỆU',result.title);
  }else if(kind==='pin')root.showSystemAlert?.('HUY HIỆU ĐÃ CẬP NHẬT',
   'Có thể trưng bày tối đa 3 huy hiệu trên Hồ sơ.');
  else if(result.newIds?.length){
   const first=honor.CATALOG.find(x=>x.id===result.newIds[0]);
   if(first&&lastToast!==first.id){lastToast=first.id;
    root.showSystemAlert?.('✦ THÀNH TỰU MỚI',first.name);}
  }
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
 async function transact(kind,options={},arcade=readArcade()){
  if(busy)return false;
  if(sandbox())return sandboxTransact(kind,options,arcade);
  const owner=uid();
  if(!owner||!root.firebase?.firestore||!root.firebase?.auth){
   if(kind!=='sync')root.showSystemAlert?.('CHƯA SẴN SÀNG','Hãy đăng nhập để lưu danh hiệu.');
   return false;
  }
  busy=true;
  try{
   if(typeof pendingLiveProfileWrites!=='undefined')
    await Promise.allSettled([...pendingLiveProfileWrites]);
   if(owner!==uid())return false;
   const result=await honor.run({db:root.firebase.firestore(),auth:root.firebase.auth(),
    uid:owner,kind,arcade,...options});
   if(owner!==uid())return false;
   remember(result,kind);return true;
  }catch(error){
   console.warn('Honor Hall:',error?.reason||error?.code||error?.message);
   if(kind!=='sync')root.showSystemAlert?.('CHƯA LƯU ĐƯỢC',
    'Danh hiệu chưa được cập nhật. Hãy kiểm tra kết nối rồi thử lại.');
   return false;
  }finally{busy=false;if($('phone-app-honors')?.style.display==='flex')render();}
 }
 function open(){render();if(!sandbox())void transact('sync');}
 function observeArcade(state){
  if(!state||sandbox()||!uid()||!profile())return;
  const owner=uid(),time=Date.now();
  if(observedOwner!==owner){observedOwner=owner;observedAt=0;lastToast='';}
  if(busy||time-observedAt<15000)return;
  const old=new Set(honor.norm(profile().honorV1).earned);
  if(!honor.discovered(profile(),state).some(id=>!old.has(id)))return;
  observedAt=time;void transact('sync',{},state);
 }
 root.DuduHonorUIV46=Object.freeze({render,refresh,open,observeArcade,readArcade});
 refresh();
})(typeof window!=='undefined'?window:null);
