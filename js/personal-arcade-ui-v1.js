/* Personal Arcade — playable scenes for Trạm Neon / Địa Tầng 07 / Vườn Sương / Ngọc Phường.
 * Game simulation remains local. Spark personal transfer is opt-in and gated;
 * the matching Firestore Rules must be installed before enabling it.
 */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1;
 if(!core||!root.document)return;
 const seasonGame=core.seasonGame;
 const exchangePolicy=root.DuduPersonalArcadeExchangeV1;
 const sparkBridge=root.DuduPersonalSparkExchangeV1;
 const KEY='dudu-personal-arcade:v1:';
 const PENDING='dudu-personal-arcade:exchange-pending-v1:';
 const SETTLED='dudu-personal-arcade:exchange-settled-v1:';
 const host=()=>root.document.getElementById('personal-arcade-v1');
 const modeLabels={neon:'Trạm Neon',mine:'Địa Tầng 07',garden:'Vườn Sương',jade:'Ngọc Phường'};
 const oreLabels={stone:'Đá',coal:'Than',iron:'Sắt',copper:'Đồng',silver:'Bạc',
  gold:'Vàng',crystal:'Tinh thạch',jade:'Ngọc bích',meteor:'Thiên thạch',relic:'Cổ vật'};
 const oreKinds={stone:'Thường',coal:'Thường',iron:'Thường',copper:'Thường',
  silver:'Khá hiếm',gold:'Khá hiếm',crystal:'Tinh phẩm',jade:'Tinh phẩm',
  meteor:'Huyền thoại',relic:'Huyền thoại'};
 const orePortrait=ore=>`<span class="ore-portrait ore-portrait-${ore}" aria-hidden="true"></span>`;
 const neonOrderIcon=i=>`<svg class="neon-service-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${[
  '<path d="M11 16h23v15c0 6-5 10-11 10s-12-4-12-10V16Z"/><path d="M34 19h4c10 0 8 13-4 13"/><path d="M18 7c-4 4 4 5 0 9m10-9c-4 4 4 5 0 9"/>',
  '<path d="M17 18h14c7 0 11 4 13 15 1 7-4 10-9 5l-6-6H19l-6 6C8 43 3 40 4 33c2-11 6-15 13-15Z"/><path d="M14 25v9m-4-5h9"/><circle cx="33" cy="26" r="1.5"/><circle cx="38" cy="31" r="1.5"/>',
  '<path d="M34 7a12 12 0 0 0-14 15L7 35a6 6 0 1 0 8 8l13-13A12 12 0 0 0 42 16l-8 8-8-8 8-9Z"/>'
 ][i]}</svg>`;
 let tab='neon',drawerOpen=null,activeKey=null,state=null,lastTick=Date.now(),lastSave=0,
  lastPaint=0,lastRenderedKey=null,notice='',noticeUntil=0,error=false,feedback=null,
  exchangeOpen=false,exchangeAmount=10,exchangeBusy=false,resetScrollOnPaint=false,
  seasonOpen=false;
 const now=()=>Date.now();
 const isSandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 function identity(){
  if(isSandbox()&&typeof currentUsername!=='undefined'&&currentUsername)
   return 'sandbox:'+currentUsername;
  const uid=root.DuduAuth?.uid?.();
  return root.DuduAuth?.isReady?.()&&typeof uid==='string'&&uid?uid:null;
 }
 const keyFor=id=>id?KEY+encodeURIComponent(id):null;
 const exchangeEnabled=()=>!isSandbox()&&root.DUDU_SPARK_EXCHANGE_V1_READY===true&&!!sparkBridge;
 const exchangeKey=prefix=>identity()?prefix+encodeURIComponent(identity()):null;
 function readPending(){
  const key=exchangeKey(PENDING);if(!key)return null;
  try{
   const item=JSON.parse(root.localStorage.getItem(key)||'null');
   if(item?.uid!==identity()||!/^ex-[0-9a-f-]{36}$/.test(item.id)||
      !Number.isSafeInteger(item.gameXu)||!Number.isSafeInteger(item.availableTenths))return null;
   return item;
  }catch(_){return null;}
 }
 function save(candidate=state,previousState=null){
  if(!activeKey||!candidate)return false;
  try{
   root.localStorage.setItem(activeKey,JSON.stringify(candidate));
   // A session switch may be persisting the *previous* owner's game. Never
   // attribute its achievements to the newly selected account.
   if(activeKey===keyFor(identity()))
    root.DuduHonorUIV46?.observeArcade?.(candidate,previousState);
   lastSave=now();return true;
  }catch(_){notice='Không lưu được game trên thiết bị. Kiểm tra dung lượng trình duyệt.';
   error=true;noticeUntil=now()+5000;return false;}
 }
 function ensure(){
  const nextKey=keyFor(identity());
  if(nextKey!==activeKey){
   if(activeKey&&state)save();
   activeKey=nextKey;state=null;feedback=null;exchangeOpen=false;drawerOpen=null;seasonOpen=false;
   const time=now();lastTick=time;lastSave=time;
   if(activeKey){
    let saved=null;
    try{saved=JSON.parse(root.localStorage.getItem(activeKey)||'null');}catch(_){/* start fresh */}
    state=core.advance(core.norm(saved,time),time,0);
    notice='';noticeUntil=0;
    error=false;
   }
  }
  return state;
 }
 const visible=()=>root.document.getElementById('phone-app-arcade')?.style.display==='flex';
 const fmt=amount=>core.formatXu(amount);
 function updateWalletHeader(s){
  const chip=root.document.getElementById('arcade-header-wallet-v1');if(!chip)return;
  chip.textContent=s?'🪙 '+fmt(s.coins)+' Xu':'Khách';
  chip.disabled=!s;
 }
 const quoteForExchange=()=>exchangePolicy?.quote({
  availableTenths:readPending()?.availableTenths??state?.coins??0,
  requestedGameXu:readPending()?.gameXu??exchangeAmount})||
  {ok:false,reason:'not-ready',walletXu:0,maxGameXu:0};
 const exchangeHint=q=>q.ok?'Số Xu sẽ nhận khi giao dịch được mở.':
  q.reason==='minimum-10-game-xu'?'Tối thiểu 10 Xu Arcade mỗi lần.':
  q.reason==='must-be-multiple-of-10'?'Chọn bội số của 10 Xu Arcade.':
  q.reason==='insufficient-balance'?'Số dư Arcade chưa đủ để đổi mức này.':
  'Chưa đủ Xu để đổi.';
 function updateExchangePreview(){
  if(!exchangeOpen)return;
  const element=host(),q=quoteForExchange(),pending=readPending();
  const amount=element?.querySelector('[data-arcade-exchange-result]');
  if(amount)amount.textContent=q.walletXu.toLocaleString('vi-VN')+' Xu hệ thống';
  const hint=element?.querySelector('[data-arcade-exchange-hint]');
  if(hint)hint.textContent=pending?'Lệnh trước chưa xác nhận. Hãy thử lại cùng mã.':exchangeEnabled()&&q.ok?
   'Số Xu này sẽ vào Ví Xu hệ thống.':exchangeHint(q);
  const input=element?.querySelector('[data-arcade-exchange-input]');
  if(input){input.max=String(Math.max(10,q.maxGameXu));
   input.disabled=!!pending||exchangeBusy;
   input.setAttribute('aria-invalid',q.ok?'false':'true');}
  const available=element?.querySelector('[data-arcade-exchange-available]');
  if(available&&state)available.textContent=fmt(state.coins);
  element?.querySelectorAll?.('[data-arcade-exchange-preset]').forEach(button=>{
   const choice=button.dataset.arcadeExchangePreset;
   const value=choice==='max'?q.maxGameXu:Number(choice);
   button.disabled=!!pending||exchangeBusy||value<10||value>q.maxGameXu;
   button.setAttribute('aria-pressed',exchangeAmount===value&&value>=10?'true':'false');
  });
 }
 function exchangeForm(s){
  const q=quoteForExchange(),pending=readPending(),allowance=exchangePolicy?.remaining({availableTenths:pending?.availableTenths??s.coins});
  const max=allowance?.maxGameXu??0;
  const choices=[10,50,100,'max'];
  return `<div class="arcade-exchange-rate"><b>10 Xu Arcade</b><span>→</span><b>1 Xu ví</b></div>
    <div class="arcade-exchange-balance">Đang có <b data-arcade-exchange-available>${fmt(s.coins)}</b> Xu Arcade</div>
    <label class="arcade-exchange-label" for="arcade-exchange-input-v1">Muốn đổi bao nhiêu?</label>
    <input type="number" id="arcade-exchange-input-v1" data-arcade-exchange-input
      min="10" max="${Math.max(10,max)}" step="10" inputmode="numeric"
      value="${pending?.gameXu??(Number.isFinite(exchangeAmount)?exchangeAmount:0)}" ${pending||exchangeBusy?'disabled':''} aria-describedby="arcade-exchange-hint-v1" aria-invalid="${!q.ok}">
    <div class="arcade-exchange-presets" role="group" aria-label="Mức đổi nhanh">
      ${choices.map(choice=>{const value=choice==='max'?max:choice;
       return `<button type="button" data-arcade-exchange-preset="${choice}"
        ${pending||exchangeBusy||value<10||value>max?'disabled':''} aria-pressed="${exchangeAmount===value&&value>=10}">${choice==='max'?'Tối đa':value+' Xu'}</button>`;}).join('')}
    </div>
    <div class="arcade-exchange-quote"><span>Dự kiến nhận</span><strong aria-live="polite" data-arcade-exchange-result>${q.walletXu.toLocaleString('vi-VN')} Xu hệ thống</strong></div>
    <p class="arcade-exchange-hint" id="arcade-exchange-hint-v1" data-arcade-exchange-hint>${pending?'Thử lại lệnh cũ để tránh nhận Xu hai lần.':exchangeEnabled()&&q.ok?'Nhận ngay vào Ví Xu hệ thống.':exchangeHint(q)}</p>`;
 }
 function countdown(ms){
  const seconds=Math.max(0,Math.ceil(ms/1000));
  return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 }
 const button=(label,action,kind='primary',disabled=false)=>
  `<button type="button" class="arcade-button ${kind}" data-arcade-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
 const drawerButton=(label,icon,name)=>`<button type="button" class="arcade-drawer-trigger" data-arcade-drawer="${name}"><span aria-hidden="true">${icon}</span>${label}</button>`;
 const drawerTitles={
  'neon-upgrades':'Nâng cấp Trạm Neon','neon-awards':'Thành tựu & hợp đồng',
  'mine-map':'Bản đồ địa tầng','mine-bag':'Túi quặng & sổ khoáng',
  'mine-tools':'Xưởng rèn & trang bị','garden-seeds':'Vườn cây & hạt giống',
  'garden-album':'Nhật ký cá','garden-upgrades':'Nâng cấp Vườn Sương',
  'jade-market':'Chợ cược thạch','jade-vault':'Kho ngọc & bảng giá',
  'jade-workshop':'Xưởng ngọc','jade-gallery':'Sổ sưu tầm phỉ thúy'};
 const upgrade=(glyph,name,level,type,cost)=>`<div class="arcade-upgrade-card">
   <span class="arcade-upgrade-symbol">${glyph}</span><div><strong>${name}</strong><small>${level}</small></div>
   ${button(cost===null?'Tối đa':'＋ '+fmt(cost)+' Xu',type,'upgrade',cost===null||state.coins<cost)}</div>`;
 const neonFacility=(symbol,name,detail,type,level,max,cost)=>`<div class="neon-facility-row">
   <span class="neon-facility-icon">${symbol}</span><div><strong>${name}</strong><small>${detail} · ${level}/${max}</small></div>
   ${button(cost===null?'Tối đa':'＋ '+fmt(cost)+' Xu',type,'upgrade',cost===null||state.coins<cost)}</div>`;
 const activeFeedback=(type,time)=>feedback?.type===type&&time-feedback.at<1700?feedback:null;
 function seasonPanel(s){
  if(!seasonGame)return '';
  const record=s.season?.records?.s01||{relics:[],completedAt:0},
   have=Array.isArray(record.relics)?record.relics:[],
   complete=!!record.completedAt&&have.length===4,
   preview=seasonGame.PHASE!=='live';
  return `<div class="arcade-season-overlay" data-arcade-season-backdrop>
   <section class="arcade-season-book" role="dialog" aria-modal="true" aria-label="Hộ Chiếu Mùa 1 · Sương Tinh Thạch">
    <header class="arcade-season-book-header"><div><span>✦ DUDU // SEASON ARCHIVE</span><b>HỘ CHIẾU MÙA 01</b></div>
     <button type="button" data-arcade-season="close" aria-label="Đóng Hộ Chiếu Mùa">✕</button></header>
    <div class="arcade-season-book-scroll">
     <div class="arcade-season-hero">
      <div class="arcade-season-hero-type">DUDU ARCHIVE — S01</div>
      <h3>SƯƠNG<br><em>TINH THẠCH</em></h3>
      <div class="arcade-season-phase">${preview?'◌ CHƯA MỞ · XEM TRƯỚC':complete?'✦ ĐÃ HOÀN THÀNH':'✧ ĐANG SƯU TẦM'}</div>
     </div>
     <div class="arcade-season-progress"><strong><span class="arcade-season-progress-mark" aria-hidden="true">✣</span> BỘ DI VẬT KHAI MÙA</strong><span>${have.length}/4</span></div>
     <div class="arcade-season-track" role="progressbar" aria-label="Kỷ vật Mùa 1" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${have.length}"><i style="width:${have.length*25}%"></i></div>
     <div class="arcade-season-relic-grid">${seasonGame.RELICS.map((item,index)=>{
       const earned=have.includes(item.id);
       return `<button type="button" class="arcade-season-relic arcade-season-exhibit season-theme-${item.theme} ${earned?'is-owned':''}"
        data-arcade-season-go="${item.id}" aria-label="${item.name} · ${earned?'Đã sở hữu':'Chưa nhận'} · Đến ${item.world}">
        <span class="arcade-season-exhibit-art" aria-hidden="true"></span>
        <span class="arcade-season-exhibit-copy">
         <span class="arcade-season-exhibit-id">KỶ VẬT 0${index+1} / 04 <span aria-hidden="true">${earned?'✦':'◇'}</span></span>
         <strong>${item.name}</strong>
         <small>${earned?'ĐÃ KHẮC ẤN VĨNH VIỄN':item.hint}</small>
         <span class="arcade-season-relic-world">${item.world} <b aria-hidden="true">↗</b></span>
        </span></button>`;
      }).join('')}</div>
     <div class="arcade-season-final ${complete?'is-unlocked':''}">
      <span class="arcade-season-final-crest" aria-hidden="true"></span>
      <div><small>${complete?'✦ ĐÃ NHẬN DANH HIỆU':'PHẦN THƯỞNG HOÀN BỘ'}</small>
       <strong>Ấn Khai Nguyên · S01</strong><span>Danh hiệu: Người Khai Mùa</span></div>
     </div>
     <p class="arcade-season-archive-note">${preview?'Sự kiện sẽ kích hoạt sau khi reset thử nghiệm và chốt quyền lưu thưởng.':
      'Kỷ vật đã nhận không bị tiêu hao, bán hoặc xóa khi chuyển sang mùa khác.'}</p>
    </div>
   </section></div>`;
 }
 const hud=(name,value,small='')=>`<div class="arcade-stat"><span>${name}</span><strong>${value}</strong>${small?`<small>${small}</small>`:''}</div>`;
 function neonPanel(s){
  const n=s.neon,capacity=core.neonCapacity(n),service=core.neonService(n),
   roomCost=core.upgradeCost(s,'room-tier'),requiredGuests=n.roomTier===1?20:100,
   canExpand=n.roomTier<3&&n.stations===capacity&&n.guestsServed>=requiredGuests;
  const cpuCost=core.upgradeCost(s,'cpu'),gpuCost=core.upgradeCost(s,'gpu'),
   stationCost=core.upgradeCost(s,'station'),routerCost=core.upgradeCost(s,'router'),
   skinCost=core.upgradeCost(s,'skin'),coolingCost=core.upgradeCost(s,'cooling'),
   time=now(),boost=s.neon.turboUntil>time,ready=time>=s.neon.turboReadyAt;
  const activeRate=s.neon.running?core.rate(s):0,
   order=core.neonOrderPattern(n),
   orderNames=['Nước','Tay cầm','Sửa máy'],orderReady=time>=n.orderReadyAt,
   seasonTicket=!!seasonGame?.neonTicket?.(n),
   servicePulse=activeFeedback('neon-service',time),
   orderPulse=activeFeedback('neon-order',time);
  const level=Math.min(6,Math.floor((s.neon.cpu+s.neon.gpu)/5)+1);
  const stations=Array.from({length:capacity},(_,i)=>`<div class="neon-computer neon-computer-${i+1} ${i>=n.stations?'is-locked':i<service.guests&&n.running?'is-occupied':''}">
    <div class="neon-monitor"><div class="neon-monitor-glass"><span>${i>=n.stations?'KHOÁ':i<service.guests&&n.running?'KHÁCH':'CRYO<span class="neon-blink">_</span>'}</span>
      <i></i><i></i><i></i><div class="neon-monitor-graph"></div></div></div>
    <div class="neon-stand"></div><div class="neon-keyboard"></div>
    <div class="neon-tower"><b></b><b></b><b></b></div>
    ${i<service.guests&&n.running?'<div class="neon-guest" aria-hidden="true"></div>':''}
    <div class="neon-station-number">${String(i+1).padStart(2,'0')}</div></div>`).join('');
  return `<section class="arcade-world arcade-world-neon ${s.neon.running?'is-running':'is-paused'}" aria-label="Trạm Neon">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">01 / IDLE TYCOON</span>
      <h3>Trạm Neon</h3><p>Đón khách, nâng máy, mở rộng phòng net.</p></div></header>
    <div class="arcade-stage neon-stage neon-room-tier-${n.roomTier} neon-skin-${n.skin} ${boost?'neon-overclocking':''} ${servicePulse?'neon-service-pulse':''}" role="group" aria-label="Trạm Neon cấp ${n.roomTier}, ${n.stations} dàn máy, ${n.running?service.guests:0} khách đang dùng">
      <div class="neon-light neon-light-one"></div><div class="neon-light neon-light-two"></div>
      <div class="neon-world-plaque"><span class="neon-live-dot"></span> QUẬN CYBER · PHÒNG ${n.roomTier}</div>
      <div class="neon-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="neon-stage-actions" role="group" aria-label="Điều khiển phòng net">
       ${button(n.running?'Ⅱ Dừng máy':'▶ Bật máy','toggle-neon','switch')}
       ${button(boost?'⚡ Đang x2':ready?'⚡ Ép xung':`⏳ <span data-arcade-until="${s.neon.turboReadyAt}">${countdown(s.neon.turboReadyAt-time)}</span>`,
        'neon-turbo','power neon-boost-button',boost||!ready||!n.running)}</div>
      <div class="neon-wall-logo" aria-hidden="true">CRYO<span>TECH</span><small>NET · STATION</small></div>
      <div class="neon-server-stack"><span></span><span></span><span></span><span></span></div>
      <div class="neon-floor"></div><div class="neon-computer-rack ${capacity>3?'neon-rack-wide':''}">${stations}</div>
      ${servicePulse?`<div class="neon-coin-fountain" aria-live="polite">✦ +${fmt(servicePulse.quantity)} Xu <small>ĐÃ PHỤC VỤ</small></div>`:''}
      <div class="neon-stage-income"><span>${boost?'⚡ ĐANG ÉP XUNG ×2':'THU NHẬP TRỰC TIẾP'}</span><b>+${(boost?activeRate*2/1000:activeRate/1000).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:3})} <small>Xu / giây</small></b>
        <div class="neon-income-track"><i></i></div></div>
      <div class="neon-room-level">PHÒNG ${n.roomTier}/3 · ${n.stations}/${capacity} DÀN · MÁY CẤP ${level}</div>
    </div>
    <div class="arcade-control-panel">
      <div class="neon-operations-strip" aria-label="Hoạt động phòng máy">
        <span><i></i><b>${n.running?service.guests:0}/${n.stations}</b> khách đang chơi</span>
        <span>Thực thu <b>+${fmt(service.profit)} Xu</b>/lượt</span></div>
      <div class="neon-service-timing"><div><b>◉ Phục vụ tự động</b><small>Đã đón <b data-neon-served>${n.guestsServed}</b> khách</small></div>
        <span data-neon-session-time>${n.running?Math.ceil((core.NEON_SERVICE_INTERVAL-n.sessionMs)/1000)+'s':'Tạm dừng'}</span></div>
      <div class="neon-service-track" role="progressbar" aria-label="Tiến độ lượt phục vụ" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(n.sessionMs/core.NEON_SERVICE_INTERVAL*100)}" data-neon-service-track><i style="width:${n.sessionMs/core.NEON_SERVICE_INTERVAL*100}%"></i></div>
      <div class="neon-expansion" data-arcade-panel="neon-upgrades">
        <div class="neon-expansion-title"><span>✦ HÀNH TRÌNH MỞ PHÒNG NET</span><b>CẤP ${n.roomTier} / 3</b></div>
        <strong>${['','Góc net khởi nghiệp','Phòng máy phố đêm','Trung tâm Neon'][n.roomTier]}</strong>
        <p>${n.roomTier===3?'Đã mở toàn bộ mặt bằng. Hãy phục vụ khách và hoàn thiện bộ máy!':
         `Muốn mở cấp ${n.roomTier+1}: lắp ${capacity}/${capacity} dàn và phục vụ ${requiredGuests} khách.`}</p>
        <div class="neon-expansion-progress"><span>${n.stations}/${capacity} dàn</span><span>${Math.min(n.guestsServed,requiredGuests)}/${requiredGuests} khách</span></div>
        <div class="neon-expansion-track"><i style="width:${n.roomTier===3?100:Math.min(100,n.guestsServed/requiredGuests*100)}%"></i></div>
        ${n.roomTier<3?button(canExpand?'✦ Mở cấp '+(n.roomTier+1)+' · '+fmt(roomCost)+' Xu':
         '🔒 Mở rộng · '+fmt(roomCost)+' Xu','room-tier','market',!canExpand||s.coins<roomCost):
         '<span class="neon-expansion-complete">✓ Đã khai phá đủ ba cấp phòng</span>'}
      </div>
      <div class="arcade-quick-drawers">
       ${drawerButton('Nâng cấp','⬡','neon-upgrades')}
       ${drawerButton('Thành tựu','✦','neon-awards')}</div>
      <div class="arcade-upgrade-grid" data-arcade-panel="neon-upgrades">
       ${upgrade('▦','CPU','Cấp '+s.neon.cpu+'/50','cpu',s.neon.cpu>=50?null:cpuCost)}
       ${upgrade('◈','VGA','Cấp '+s.neon.gpu+'/20','gpu',s.neon.gpu>=20?null:gpuCost)}
       ${upgrade('▣','Dàn máy',n.stations+'/'+capacity+' dàn'+(stationCost===null&&n.roomTier<3?' · cần mở phòng':''),'station',stationCost)}
       ${upgrade('⌁','Mạng', 'Cấp '+s.neon.router+'/10','router',routerCost)}
       ${upgrade('✧','LED phòng', ['Lam','Tím','Hổ phách'][s.neon.skin],'skin',skinCost)}
       ${upgrade('❄','Tản nhiệt','Cấp '+s.neon.cooling+'/5 · kéo dài ép xung','cooling',coolingCost)}
      </div>
      <div class="neon-facility" data-arcade-panel="neon-upgrades"><div class="arcade-panel-heading arcade-panel-heading-sub"><div><span class="arcade-eyebrow">THU HÚT KHÁCH</span><h4>Tiện ích & dịch vụ</h4></div></div>
       ${neonFacility('▥','Ghế & bàn','Tăng số khách sử dụng máy','seating',n.seating,5,core.upgradeCost(s,'seating'))}
       ${neonFacility('✧','Không gian','Tăng độ hấp dẫn và giá lượt','ambiance',n.ambiance,5,core.upgradeCost(s,'ambiance'))}
       ${neonFacility('☕','Quầy nước','Tăng doanh thu trên mỗi khách','snack',n.snack,3,core.upgradeCost(s,'snack'))}</div>
      <div class="neon-milestones" data-arcade-panel="neon-awards"><h4>✦ Thành tựu nhà điều hành</h4>${[
       ['Đón 25 khách',n.guestsServed>=25,200],['Đón 100 khách',n.guestsServed>=100,500],
       ['Mở phòng cấp 2',n.roomTier>=2,300],['Mở phòng cấp 3',n.roomTier>=3,900]
      ].map(([name,met,reward],i)=>`<div class="arcade-contract"><span>${n.milestones.includes(i)?'✓':met?'✦':'○'} ${name}</span>
       ${button(n.milestones.includes(i)?'Đã nhận':met?'Nhận '+fmt(reward)+' Xu':'+'+fmt(reward)+' Xu',
        'neon-milestone-'+i,'contract',!met||n.milestones.includes(i))}</div>`).join('')}</div>
      <div class="arcade-contracts" data-arcade-panel="neon-awards"><h4>▤ Hợp đồng phòng máy</h4>${[
       ['Lắp CPU cấp 2',s.neon.cpu>=2,50],['Mở hai dàn máy',s.neon.stations>=2,120],
       ['Nâng mạng cấp 3',s.neon.router>=3,180]
      ].map(([name,met,reward],i)=>`<div class="arcade-contract"><span>${s.neon.contracts.includes(i)?'✓':met?'✦':'○'} ${name}</span>
       ${button(s.neon.contracts.includes(i)?'Đã nhận':met?'Nhận '+fmt(reward)+' Xu':'+'+fmt(reward)+' Xu',
        'neon-contract-'+i,'contract',!met||s.neon.contracts.includes(i))}</div>`).join('')}</div>
      <div class="neon-order-game ${orderReady?'is-ready':'is-waiting'} ${seasonTicket?'is-season-ticket':''} ${orderPulse?(orderPulse.success?'is-complete':'is-mistake'):''}" aria-label="Quầy dịch vụ khách: hoàn thành ${n.orderWon} đơn, liên tiếp ${n.orderStreak}">
       <div class="neon-order-heading"><b>✦ QUẦY KHÁCH GỌI</b><span>COMBO ×${n.orderStreak}</span></div>
       <div class="neon-order-scene">
        <div class="neon-order-customer" aria-hidden="true"><i></i><span>♪</span></div>
        <div class="neon-order-ticket"><small>${!n.running?'ĐÃ ĐÓNG QUẦY':orderReady?(seasonTicket?'✧ ĐƠN SƯƠNG #':'ĐƠN #')+String(n.orderRound+1).padStart(3,'0'):'KHÁCH MỚI SAU'}</small>
         <div class="neon-order-recipe">${orderReady?order.map((item,i)=>`<span class="${i<n.orderStep?'is-done':''}" aria-label="${i<n.orderStep?'Đã chuẩn bị':orderNames[item]}">${i<n.orderStep?'✓':neonOrderIcon(item)}</span>${i===0?'<i>›</i>':''}`).join(''):
          `<span class="neon-order-timer" data-arcade-until="${n.orderReadyAt}">${countdown(n.orderReadyAt-time)}</span>`}</div>
         <em>${orderReady?`MÓN ${n.orderStep+1}/2 · CHỌN THEO THỨ TỰ`:'CHUẨN BỊ LƯỢT MỚI'}</em></div>
       </div>
       <div class="neon-order-actions" role="group" aria-label="Chuẩn bị món khách yêu cầu">
        ${orderNames.map((name,i)=>`<button type="button" data-arcade-action="neon-order-${i}" aria-label="Phục vụ ${name}"
         ${!orderReady||!n.running?'disabled':''}><strong>${neonOrderIcon(i)}</strong><span>${name}</span></button>`).join('')}
       </div>
       <div class="neon-order-footer"><span>✓ ${n.orderWon} ĐƠN HOÀN THÀNH</span><span>THƯỞNG NHỎ · 90S/LƯỢT</span></div>
      </div>
    </div>
  </section>`;
 }
 function minePanel(s,time){
  const m=s.mine,repairing=!!m.repairUntil;
  const max=core.maxDurability(m);
  const all=Object.values(m.ores).reduce((sum,n)=>sum+n,0),hit=activeFeedback('mine',time),
   maxEnergy=core.maxCharge(m),found=Object.values(m.found).filter(Boolean).length;
  const probeTarget=core.mineProbeTarget(m),probeHit=activeFeedback('probe',time),
   seasonVein=!!seasonGame?.mineVein?.(m),
   canProbe=!repairing&&m.durability>0&&m.charge>=3;
  return `<section class="arcade-world arcade-world-mine" aria-label="Địa Tầng 07">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">02 / CLICKER</span>
      <h3>Địa Tầng 07</h3><p>Chạm vỉa quặng để khai thác. Mang khoáng sản đi bán.</p></div>
      <span class="arcade-world-live">CORE / 07</span></header>
    <div class="arcade-stage mine-stage mine-zone-scene-${m.zone} mine-dig-phase-${m.dug%4} ${hit?'mine-hit-active':''}">
      <div class="mine-stratum mine-stratum-1"></div><div class="mine-stratum mine-stratum-2"></div>
      <div class="mine-cave-light"></div><div class="mine-tunnel-arch"></div>
      <div class="mine-crystal mine-crystal-left"></div><div class="mine-crystal mine-crystal-right"></div>
      <div class="mine-cave-motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="mine-scene-head"><span>${['TẦNG ĐẤT','MẠCH SẮT','HANG TINH THẠCH'][m.zone]} · -${Math.floor(m.dug/20)+7}M</span>
        <span>${m.dug.toLocaleString('vi-VN')} LƯỢT ĐÀO</span></div>
      <button class="mine-ore-button" type="button" data-arcade-action="mine" ${repairing||!m.durability?'disabled':''}
        aria-label="Gõ vào vỉa quặng để đào" title="Chạm hoặc bấm để đào quặng">
        <span class="mine-rock-shadow"></span><span class="mine-rock"><i></i><i></i><i></i><i></i><i></i></span>
        <span class="mine-fracture-lines" aria-hidden="true"></span>
        <span class="mine-vein-core ${['ore-portrait-copper','ore-portrait-iron','ore-portrait-crystal'][m.zone]}" aria-hidden="true"></span>
        <span class="mine-ore-glow"></span><span class="mine-hit-spark">✦</span>
        <span class="mine-tap-prompt">${repairing?'ĐANG SỬA CUỐC':m.durability?'⛏ CHẠM ĐỂ ĐÀO':'CUỐC ĐÃ HẾT ĐỘ BỀN'}</span></button>
      ${hit?`<div class="mine-drop" aria-live="polite">${hit.ore==='burst'?'✦':orePortrait(hit.ore)}<strong>+${hit.quantity} ${hit.ore==='burst'?'QUẶNG':oreLabels[hit.ore]}</strong></div>`:''}
      <div class="mine-bottom-hud"><div class="mine-durability-circle" style="--mine-durability:${m.durability/max*100}%"><span>CUỐC</span><b>${m.durability}<small>/${max}</small></b></div>
        <span>${repairing?`🔧 <span data-arcade-until="${m.repairUntil}">${countdown(m.repairUntil-time)}</span>`:'⛏ Độ bền cuốc'}</span></div>
    </div>
    <div class="arcade-control-panel">
      <div class="arcade-panel-heading" data-arcade-panel="mine-map"><div><span class="arcade-eyebrow">BẢN ĐỒ KHAI THÁC</span><h4>Chọn địa tầng</h4></div><span class="mine-gear-label">Đèn cấp ${m.lantern}/3</span></div>
      <div class="mine-zone-list" data-arcade-panel="mine-map">${[
       ['Tầng đất','10 loại khoáng sản',0,1],['Mạch sắt','2 quặng/lượt',40,2],['Hang tinh thể','Quặng hiếm thường hơn',160,3]
      ].map(([name,sub,dug,lamp],i)=>{const unlocked=core.zoneUnlocked(m,i);
       return `<button type="button" class="mine-zone ${m.zone===i?'selected':''}" data-arcade-action="mine-zone-${i}" ${unlocked?'':'disabled'}>
       <b>${i===0?'Ⅰ':i===1?'Ⅱ':'Ⅲ'} ${name}</b><small>${unlocked?sub:`${Math.max(0,dug-m.dug)} lượt · đèn ${lamp}`}</small></button>`;}).join('')}</div>
      <div class="mine-energy"><div><b>⚡ Phá mạch quặng</b><small>Đào để nạp năng lượng</small></div><strong>${m.charge}/${maxEnergy}</strong></div>
      <div class="mine-charge-track" role="progressbar" aria-label="Năng lượng phá mạch" aria-valuenow="${m.charge}" aria-valuemax="${maxEnergy}"><i style="width:${m.charge/maxEnergy*100}%"></i></div>
      ${button('⚡ PHÁ MẠCH · 5 NĂNG LƯỢNG','mine-burst','power mine-burst',repairing||m.durability<3||m.charge<5)}
      <div class="arcade-mine-sell">${button('Bán quặng · '+all+' mẫu','sell-ores','market',!all)}</div>
      <div class="arcade-quick-drawers arcade-quick-drawers-triple">
       ${drawerButton('Địa tầng','⌁','mine-map')}
       ${drawerButton('Túi quặng','◈','mine-bag')}
       ${drawerButton('Xưởng rèn','⚒','mine-tools')}</div>
      <div class="arcade-panel-heading" data-arcade-panel="mine-bag"><div><span class="arcade-eyebrow">KHO KHOÁNG SẢN</span><h4>Túi quặng · ${all} mẫu</h4></div></div>
      <p class="arcade-world-hint" data-arcade-panel="mine-bag">Xe quặng cấp ${m.cart} tăng giá bán ${10*(m.cart-1)}%. Máy dò cấp ${m.scanner} cải thiện cơ hội gặp tinh thạch.</p>
      <div class="mine-inventory" data-arcade-panel="mine-bag">${Object.entries(m.ores).map(([ore,count])=>
        `<div class="mine-inventory-slot mine-slot-${ore} ${m.found[ore]?'is-found':'is-mystery'}" aria-label="${oreLabels[ore]} · ${oreKinds[ore]} · ${count} mẫu">
         ${orePortrait(ore)}<small>${m.found[ore]?oreLabels[ore]:'Chưa thấy'}</small><b>×${count}</b><em>${oreKinds[ore]}</em></div>`).join('')}</div>
      <div class="mine-codex" data-arcade-panel="mine-bag"><b>📜 Sổ địa tầng · ${found}/10 phát hiện</b><small>Món đã từng đào vẫn được ghi nhận sau khi bán. Xuống hầm sâu để gặp khoáng sản hiếm.</small></div>
      <div class="arcade-panel-heading arcade-panel-heading-sub" data-arcade-panel="mine-tools"><div><span class="arcade-eyebrow">XƯỞNG RÈN</span><h4>Bảo dưỡng dụng cụ</h4></div></div>
      <div class="mine-tool-actions" data-arcade-panel="mine-tools">
        ${button(repairing?`⏳ <span data-arcade-until="${m.repairUntil}">${countdown(m.repairUntil-time)}</span>`:'🔧 Tự sửa · 4 phút','repair-wait','tool',repairing||m.durability===max)}
        ${button('⚒ Rèn · 5 than + 2 sắt','repair-forge','tool',repairing||m.durability===max||m.ores.coal<5||m.ores.iron<2)}
        ${button('Dầu +25 · 15 Xu','buy-oil','tool',repairing||m.durability===max||s.coins<150)}
        ${button('Cuốc mới · 80 Xu','buy-pick','tool',(m.durability===max&&!repairing)||s.coins<800)}
      </div>
      <div class="arcade-upgrade-grid arcade-tool-upgrades" data-arcade-panel="mine-tools">
       ${upgrade('⛏','Cuốc thép','Cấp '+m.pickLevel+'/4','pick-level',core.upgradeCost(s,'pick-level'))}
       ${upgrade('◈','Mũi khoan','Cấp '+m.drillLevel+'/5','drill-level',core.upgradeCost(s,'drill-level'))}
       ${upgrade('◉','Đèn thám hiểm','Cấp '+m.lantern+'/3 · mở hầm','lantern',core.upgradeCost(s,'lantern'))}
       ${upgrade('▤','Xe chở quặng','Cấp '+m.cart+'/4 · +10% giá/cấp','cart',core.upgradeCost(s,'cart'))}
      </div>
      <div class="arcade-craft-row" data-arcade-panel="mine-tools"><div><b>✦ Chế máy dò · cấp ${m.scanner}/3</b><small>8 sắt + 3 tinh thạch · tăng cơ hội quặng hiếm</small></div>
       ${button(m.scanner>=3?'Đã tối đa':'⚒ Chế tạo','mine-scanner','tool',m.scanner>=3||m.ores.iron<8||m.ores.crystal<3)}</div>
      <div class="mine-seam-game ${probeHit?'is-revealing':''} ${seasonVein?'is-season-vein':''}" aria-label="Thăm dò ba ngách, đã dò ${m.probes} lần và tìm đúng ${m.probeHits} lần">
       <div class="mine-seam-heading"><b>${seasonVein?'✧ MẠCH SƯƠNG LAM':'⌁ THĂM DÒ MẠCH NGẦM'}</b><span>⚡ 3 / LƯỢT</span></div>
       <div class="mine-seam-scene" role="group" aria-label="Chọn ngách có tín hiệu mạnh nhất">
        ${[0,1,2].map(i=>{const signal=i===probeTarget?3:i===(probeTarget+1)%3?2:1;
         return `<button type="button" class="mine-seam-tunnel mine-seam-tunnel-${i} ${probeHit?.branch===i?(probeHit.hit?'is-probe-win':'is-probe-miss'):''}" data-arcade-action="mine-probe-${i}"
          aria-label="Thăm dò ngách ${i+1}, tín hiệu ${signal}/3" ${canProbe?'':'disabled'}>
          <span class="mine-seam-arch"><i></i><em>✧</em></span>
          <span class="mine-seam-signal">${[1,2,3].map(level=>`<i class="${level<=signal?'is-lit':''}"></i>`).join('')}</span>
          <strong>NGÁCH ${['Ⅰ','Ⅱ','Ⅲ'][i]}</strong></button>`;}).join('')}
        ${probeHit?`<div class="mine-seam-result ${probeHit.hit?'is-hit':'is-miss'}" aria-live="polite">${orePortrait(probeHit.ore)}<b>${probeHit.hit?'ĐÚNG MẠCH':'MẠCH YẾU'}</b><small>+${probeHit.quantity} ${oreLabels[probeHit.ore]}</small></div>`:''}
       </div>
       <div class="mine-seam-footer"><span>✦ ${m.probeHits}/${m.probes} DÒ TRÚNG</span>
        <b>${canProbe?'CHỌN TÍN HIỆU SÁNG NHẤT':'ĐÀO ĐỂ NẠP ⚡'}</b></div>
      </div>
    </div>
  </section>`;
 }
 function gardenPanel(s,time){
  const g=s.garden,fishHit=activeFeedback('fish',time),plotHit=activeFeedback('garden-plot',time);
  const line=g.line,waiting=!!line&&time<line.biteAt,biting=!!line&&!waiting;
  const discovered=Object.values(g.fishAlbum).filter(count=>count>0).length;
  const bed=(b,index)=>{
   const mature=b.status==='growing'&&time>=b.readyAt;
   const growthStage=b.status==='growing'?Math.max(0,Math.min(3,
    Math.floor((1-Math.max(0,b.readyAt-time)/core.CROPS[b.crop].grow)*3))):0;
   const action=b.status==='empty'?'plant-'+index:b.status==='dry'?'water-'+index:'harvest-'+index;
   const text=b.status==='empty'?'＋ Gieo':b.status==='dry'?'💧 Tưới':mature?'✦ Thu':'Đang lớn';
   const caption=b.status==='empty'?'Đất trống':b.status==='dry'?'Thiếu nước':mature?'Đã chín':countdown(b.readyAt-time);
   const disabled=b.status==='empty'?!g.seeds:b.status==='dry'?!g.water:!mature;
   return `<button class="garden-plot ${b.status} crop-${b.crop} growth-stage-${growthStage} ${mature?'mature':''} ${plotHit?.index===index?'is-action-burst plot-burst-'+plotHit.action:''}" type="button" data-arcade-action="${action}" ${disabled?'disabled':''}
     aria-label="Luống ${index+1}: ${text}, ${caption}">
     <span class="garden-soil"></span><span class="garden-stem"><i></i><i></i><i></i></span>
     <span class="garden-flower"><i></i><i></i><i></i><i></i><i></i></span>
     <span class="garden-crop-sprite" aria-hidden="true"></span>
     <span class="garden-plant-aura" aria-hidden="true"></span>
     <span class="garden-plot-label"><b>LUỐNG ${String(index+1).padStart(2,'0')} · ${b.status==='empty'?'✿':core.CROPS[b.crop].name}</b><small ${b.status==='growing'&&!mature?`data-arcade-until="${b.readyAt}"`:''}>${caption}</small><em>${text}</em></span></button>`;
  };
  return `<section class="arcade-world arcade-world-garden ${biting?'is-biting':''}" aria-label="Vườn Sương">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">03 / CHILL FARM</span>
      <h3>Vườn Sương</h3><p>Gieo giống, mở rộng vườn và câu cá dưới trăng.</p></div>
      <span class="arcade-world-live">MIST / GARDEN</span></header>
    <div class="arcade-stage garden-stage garden-pond-tier-${g.pondTier} garden-harvests-${Math.min(3,Math.floor(g.harvests/10))} ${g.plots>2?'garden-expanded':''} ${line?'is-fishing':''} ${biting?'is-biting':''}">
      <div class="garden-mist garden-mist-a"></div><div class="garden-mist garden-mist-b"></div>
      <div class="garden-cloud garden-cloud-a"></div><div class="garden-cloud garden-cloud-b"></div>
      <span class="garden-moon" aria-hidden="true"></span>
      <div class="garden-mountains"></div><div class="garden-grass"></div>
      <div class="garden-scenery" aria-hidden="true">
       <span class="garden-sakura garden-sakura-left"></span><span class="garden-sakura garden-sakura-right"></span>
       <span class="garden-wildflowers garden-bloom-1"></span><span class="garden-wildflowers garden-bloom-2"></span>
       <span class="garden-wildflowers garden-bloom-3"></span><span class="garden-wildflowers garden-bloom-4"></span>
       <span class="garden-wildflowers garden-bloom-5"></span><span class="garden-wildflowers garden-bloom-6"></span>
       <span class="garden-rock garden-rock-1"></span><span class="garden-rock garden-rock-2"></span>
      </div>
      <span class="garden-shore-lantern garden-lantern-left" aria-hidden="true"></span>
      <span class="garden-shore-lantern garden-lantern-right" aria-hidden="true"></span>
      <span class="garden-bank-reeds garden-reeds-left" aria-hidden="true"></span>
      <span class="garden-bank-reeds garden-reeds-right" aria-hidden="true"></span>
      <span class="garden-firefly garden-firefly-left" aria-hidden="true"></span>
      <span class="garden-firefly garden-firefly-right" aria-hidden="true"></span>
      <div class="garden-plot-area">${g.beds.map(bed).join('')}</div>
      <div class="garden-pond"><div class="garden-pond-shine"></div>
        ${['a','b','c','d','e','f'].map((id,i)=>`<span class="garden-fish garden-fish-${id} garden-fish-species-${['reed','carp','silver','koi','blue','moonfish'][i]}"></span>`).join('')}
        <span class="garden-lotus garden-lotus-a" aria-hidden="true"></span><span class="garden-lotus garden-lotus-b" aria-hidden="true"></span>
        <span class="garden-bubble garden-bubble-a"></span><span class="garden-bubble garden-bubble-b"></span>
        <span class="garden-bubble garden-bubble-c"></span>
        ${line?'<span class="garden-fishing-line"></span><span class="garden-float" aria-hidden="true"></span>':''}</div>
      ${fishHit?`<div class="garden-catch-pop garden-catch-card" role="status"><span class="garden-fish-portrait fish-${fishHit.fishId||'reed'}" aria-hidden="true"></span><b>${fishHit.label}</b><small>✦ THÊM VÀO NHẬT KÝ CÁ</small></div>`:''}
    </div>
    <div class="arcade-control-panel">
      <div class="garden-fishing-status" role="status" aria-live="polite">${biting?'✦ CÁ CẮN CÂU!':waiting?
       `Đang chờ… <span data-arcade-until="${line.biteAt}">${countdown(line.biteAt-time)}</span>`:
       '✧ HỒ SƯƠNG YÊN Ả'}</div>
      <div class="garden-fishing-controls" role="group" aria-label="Điều khiển câu cá">
       ${button(biting?`🎣 THU CÂU · <span data-arcade-until="${line.escapeAt}">${countdown(line.escapeAt-time)}</span>`:
        waiting?'🎣 ĐANG CHỜ CÁ CẮN':g.bait?'🎣 THẢ CÂU · '+g.bait+' MỒI':'🎣 CHƯA CÓ MỒI',
        line?'reel-line':'cast-line','power garden-cast-button',waiting||!line&&!g.bait)}
       <button type="button" class="garden-pond-collect ${g.bubbleReady?'is-ready':''}" data-arcade-action="catch-bubble" ${g.bubbleReady?'':'disabled'}>
        ${g.bubbleReady?'✦ Thu bọt':`💧 <span data-arcade-until="${g.bubbleAt}">${countdown(g.bubbleAt-time)}</span>`}</button></div>
      <div class="garden-resources">${hud('NƯỚC','💧 '+g.water+'/'+g.waterCap,'Hồi mỗi 15 phút')}
      ${hud('HẠT GIỐNG','✿ '+g.seeds,'Trong túi hạt')}</div>
      <div class="arcade-panel-heading" data-arcade-panel="garden-seeds"><div><span class="arcade-eyebrow">TÚI HẠT GIỐNG</span><h4>Chọn giống trồng</h4></div></div>
      <div class="garden-seed-list" data-arcade-panel="garden-seeds">${Object.entries(core.CROPS).map(([id,crop])=>`<button type="button" class="garden-seed ${g.crop===id?'selected':''}" data-arcade-action="crop-${id}" ${core.cropUnlocked(g,id)?'':'disabled'}>
       <b>${id==='bloom'?'✿':id==='mint'?'❧':'☾'} ${crop.name}</b><small>${core.cropUnlocked(g,id)?`${crop.grow/60000} phút · +${fmt(crop.value)} Xu`:`Mở sau ${id==='mint'?10:30} lần thu`}</small></button>`).join('')}</div>
      <div class="arcade-panel-heading" data-arcade-panel="garden-seeds"><div><span class="arcade-eyebrow">NHÀ KÍNH</span>
        <h4>Vật tư & thu hoạch</h4></div>${button('＋ 3 hạt · 10 Xu','buy-seeds','market',s.coins<100)}</div>
      <div class="garden-quick-actions">${button('💧 Tưới các luống khô','water-all','tool',!g.sprinkler||!g.water||!g.beds.some(b=>b.status==='dry'))}
       ${button('✿ Thu hoạch tất cả','harvest-all','tool',!g.beds.some(b=>b.status==='growing'&&time>=b.readyAt))}</div>
      <div class="garden-statline"><span>🌿 Đã thu hoạch <b>${g.harvests}</b></span><span>🐟 Mồi câu <b>${g.bait}</b></span></div>
      <div class="arcade-quick-drawers arcade-quick-drawers-triple">
       ${drawerButton('Hạt giống','✿','garden-seeds')}
       ${drawerButton('Sổ cá','🐟','garden-album')}
       ${drawerButton('Nâng cấp','⚙','garden-upgrades')}</div>
      <div class="garden-fishing" data-arcade-panel="garden-album"><div><b>🎣 Nhật ký hồ sương</b><small>${g.fish} cá đã câu · ${g.rareFish} cá hiếm · ${discovered}/${Object.keys(core.FISH_SPECIES).length} loài từng tìm thấy</small></div></div>
      <div class="garden-fish-album" data-arcade-panel="garden-album" aria-label="Sổ sưu tầm cá">${Object.entries(core.FISH_SPECIES).map(([id,fish])=>{
       const count=g.fishAlbum[id],known=count>0;
       return `<div class="garden-fish-entry fish-${id} ${known?'is-discovered':'is-unknown'}">
        <span class="garden-fish-art garden-fish-portrait ${known?'fish-'+id:'fish-undiscovered'}" aria-hidden="true"></span>
        <div><strong>${known?fish.name:'Chưa khám phá'}</strong><small>${known?fish.rarity+' · Kỷ lục '+g.fishBest[id]+' cm':fish.rarity}</small></div>
        <b>${known?'×'+count:'◈'}</b></div>`;}).join('')}</div>
      <div class="arcade-upgrade-grid arcade-garden-upgrades" data-arcade-panel="garden-upgrades">
       ${upgrade('💧','Bồn nước',g.waterCap+'/7 bình','water-cap',core.upgradeCost(s,'water-cap'))}
       ${upgrade('🐟','Hồ cá','Cấp '+g.pondTier+'/5','pond-tier',core.upgradeCost(s,'pond-tier'))}
       ${upgrade('▦','Mở thêm luống',g.plots+'/4 luống','plots',core.upgradeCost(s,'plots'))}
       ${upgrade('☂','Dàn tưới sương','Cấp '+g.sprinkler+'/2 · tưới nhanh','sprinkler',core.upgradeCost(s,'sprinkler'))}
       ${upgrade('🎣','Cần câu','Cấp '+g.rod+'/5 · cá giá trị hơn','rod',core.upgradeCost(s,'rod'))}
      </div>
    </div>
  </section>`;
 }
 function render(){
  const element=host();if(!element)return false;
  const s=ensure();
  updateWalletHeader(s);
  if(!s){element.innerHTML='<div class="arcade-empty">Đăng nhập tài khoản để lưu tiến trình minigame riêng trên thiết bị này.</div>';lastRenderedKey=null;return true;}
  const time=now(),panel=tab==='neon'?neonPanel(s):tab==='mine'?minePanel(s,time):
   tab==='jade'?root.DuduPersonalJadeUIV1?.panel(s,activeFeedback('jade-cut',time)||activeFeedback('jade-window',time))||'<div>Ngọc Phường đang mở cửa…</div>':gardenPanel(s,time);
  // Different games are separate pages: never land halfway down the new one
  // just because the previous game was scrolled near its workshop controls.
  const previousScroll=resetScrollOnPaint?0:
   element.querySelector?.('.arcade-scroll')?.scrollTop??element.scrollTop??0;
  const oldSheet=element.querySelector?.('.arcade-sheet-overlay');
  const previousSheetScroll=oldSheet?.dataset?.sheet===drawerOpen?
   oldSheet.querySelector?.('.arcade-sheet-body')?.scrollTop??0:0;
  const previousMarketRailScroll=oldSheet?.dataset?.sheet===drawerOpen?
   oldSheet.querySelector?.('.jade-market-stop-list')?.scrollLeft??0:0;
  const showToast=notice&&time<noticeUntil;
  element.innerHTML=`<div class="arcade-shell arcade-active-${tab}">
    <div class="arcade-scroll" aria-label="Nội dung trò chơi">
      ${panel}
    </div>
    <nav class="arcade-tabs" role="tablist" aria-label="Bốn minigame">
      ${Object.entries(modeLabels).map(([type,name])=>`<button type="button" class="arcade-tab ${tab===type?'is-active':''}" role="tab"
        aria-selected="${tab===type}" data-arcade-tab="${type}"><span class="arcade-tab-icon" aria-hidden="true">${type==='neon'?'⌘':type==='mine'?'⛏':type==='garden'?'✿':'◆'}</span><span>${name}</span></button>`).join('')}
    </nav>
    ${showToast?`<div class="arcade-status arcade-status-toast" data-error="${error}" aria-live="polite" data-arcade-notice></div>`:''}
    ${exchangeOpen?`<div class="arcade-exchange-overlay" data-arcade-exchange="close">
      <section class="arcade-exchange-dialog" role="dialog" aria-modal="true" aria-label="Đổi Xu">
        <div class="arcade-exchange-heading"><strong>Đổi Xu</strong><button type="button" data-arcade-exchange="close" aria-label="Đóng">✕</button></div>
        ${exchangeForm(s)}
        <div class="arcade-exchange-target">Ví Xu hệ thống <button type="button" data-arcade-exchange="wallet">Xem ví ↗</button></div>
        ${button(!exchangeEnabled()?'Chuyển Xu · Sắp mở':exchangeBusy?'Đang chuyển…':
          readPending()?'↻ Xác nhận lệnh cũ':'✓ Chuyển vào Ví Xu',
          'transfer','gold',!exchangeEnabled()||exchangeBusy||!quoteForExchange().ok)}
        ${exchangeEnabled()?'':'<p>Chức năng đổi Xu chưa mở.</p>'}
      </section></div>`:''}
    ${seasonOpen?seasonPanel(s):''}
  </div>`;
  if(showToast)element.querySelector('[data-arcade-notice]').textContent=notice;
  const scrollPort=element.querySelector?.('.arcade-scroll');if(scrollPort)scrollPort.scrollTop=previousScroll;
  resetScrollOnPaint=false;
  if(drawerOpen&&drawerTitles[drawerOpen]&&root.document.createElement){
   const sections=Array.from(element.querySelectorAll?.('.arcade-world [data-arcade-panel="'+drawerOpen+'"]')||[]);
   if(sections.length){
    const overlay=root.document.createElement('div');
    overlay.className='arcade-sheet-overlay';overlay.dataset.sheet=drawerOpen;
    overlay.innerHTML=`<section class="arcade-sheet" role="dialog" aria-modal="true" aria-label="${drawerTitles[drawerOpen]}">
      <header class="arcade-sheet-heading"><div><small>✦ ARCADE</small><h3>${drawerTitles[drawerOpen]}</h3></div>
       <div class="arcade-sheet-controls"><button type="button" class="arcade-sheet-honor" data-arcade-honor="${tab}"
        aria-label="Xem thử thách ${modeLabels[tab]}" title="Thử thách & danh hiệu">✦</button>
        <button type="button" class="arcade-sheet-close" data-arcade-drawer="close" aria-label="Đóng cửa sổ">✕</button></div></header>
      <div class="arcade-sheet-body">${sections.map(node=>node.outerHTML).join('')}</div></section>`;
    element.querySelector('.arcade-shell')?.appendChild(overlay);
    const content=overlay.querySelector('.arcade-sheet-body');
    if(content){
     content.scrollTop=previousSheetScroll;
     const rail=content.querySelector('.jade-market-stop-list');
     if(rail)rail.scrollLeft=previousMarketRailScroll;
    }
   }
  }
  lastPaint=time;lastRenderedKey=activeKey;return true;
 }
 function refreshLive(time){
  const element=host();if(!element||!state)return;
  updateWalletHeader(state);
  if(exchangeOpen)updateExchangePreview();
  const toast=element.querySelector?.('.arcade-status');
  if(toast&&time>=noticeUntil)toast.hidden=true;
  element.querySelectorAll?.('[data-arcade-until]').forEach(node=>{
   const until=Number(node.dataset.arcadeUntil);
   if(Number.isFinite(until))node.textContent=countdown(until-time);
  });
  const session=element.querySelector?.('[data-neon-service-track]');
  if(session){
   const progress=Math.round(state.neon.sessionMs/core.NEON_SERVICE_INTERVAL*100);
   session.setAttribute('aria-valuenow',String(progress));
   const fill=session.querySelector('i');if(fill)fill.style.width=progress+'%';
   const timer=element.querySelector('[data-neon-session-time]');
   if(timer)timer.textContent=state.neon.running?
    Math.ceil((core.NEON_SERVICE_INTERVAL-state.neon.sessionMs)/1000)+'s':'Tạm dừng';
  }
  lastPaint=time;
 }
 function tick(){
  const time=now(),s=ensure();
  if(!s){lastTick=time;if(visible())render();return;}
  state=core.advance(s,time,Math.max(0,time-lastTick));
  lastTick=time;
  const customerServed=s.neon.guestsServed!==state.neon.guestsServed;
  if(customerServed&&tab==='neon'){
   const service=core.neonService(state.neon);
   const sessions=Math.max(1,Math.round((state.neon.guestsServed-s.neon.guestsServed)/Math.max(1,service.guests)));
   feedback={type:'neon-service',quantity:service.profit*sessions,at:time};
  }
  // Save when a real service milestone lands, including while the Arcade is
  // running in the background, rather than missing the exact unlock edge.
  if(customerServed||time-lastSave>=5000)save(state,s);
  if(visible()){
   const completedRepair=!!s.mine.repairUntil&&!state.mine.repairUntil;
   const waterRefilled=s.garden.water!==state.garden.water;
   const bubbleAppeared=s.garden.bubbleReady!==state.garden.bubbleReady;
   const plantMatured=s.garden.beds.some(b=>b.status==='growing'&&b.readyAt>s.lastAt&&b.readyAt<=time);
   const fishBit=!!s.garden.line&&s.lastAt<s.garden.line.biteAt&&time>=s.garden.line.biteAt;
   const fishEscaped=!!s.garden.line&&!state.garden.line;
   const boostExpired=!!s.neon.turboUntil&&s.lastAt<s.neon.turboUntil&&time>=s.neon.turboUntil;
   const turboReady=!!s.neon.turboReadyAt&&s.lastAt<s.neon.turboReadyAt&&time>=s.neon.turboReadyAt;
   const nextOrder=!!s.neon.orderReadyAt&&s.lastAt<s.neon.orderReadyAt&&time>=s.neon.orderReadyAt;
   if(fishEscaped){notice='Cá đã tuột khỏi lưỡi câu. Hãy thử lượt khác nhé.';
    noticeUntil=time+3500;error=false;}
   if(lastRenderedKey!==activeKey||completedRepair||waterRefilled||bubbleAppeared||plantMatured||fishBit||fishEscaped||customerServed||boostExpired||turboReady||nextOrder)render();
   else if(time-lastPaint>=900)refreshLive(time);
  }
 }
 function interact(action){
  tick();if(!state||!activeKey||exchangeBusy)return false;
  const previousState=state;
  const hookedFish=action==='reel-line'?state.garden.line?.fishId:null;
  const result=core.act(state,action,now(),Math.random());
  if(!result.ok){notice=result.reason;noticeUntil=now()+3500;error=true;render();return false;}
  state=result.state;
  if(/^jade-pick-\d+-[0-2]$/.test(action)){
   // That physical specimen is now in the bag; show the refreshed tray rather
   // than leaving the same letter highlighted for a different incoming stone.
   root.DuduPersonalJadeUIV1?.chooseMarketSample?.(Number(action.split('-')[2]),null);
  }
  feedback=/^mine-probe-[012]$/.test(action)?{type:'probe',hit:result.hit,ore:result.ore,
   quantity:result.quantity,branch:Number(action.slice(-1)),at:now()}:
   action==='mine'||action==='mine-burst'?{type:'mine',ore:action==='mine-burst'?'burst':result.label,
   quantity:result.quantity||1,at:now()}:/^neon-order-[012]$/.test(action)?
    {type:'neon-order',success:!result.label.includes('Nhầm'),at:now()}:
    action==='reel-line'?{type:'fish',fishId:hookedFish,label:result.label,at:now()}:
    /^(plant|water|harvest)-[0-3]$/.test(action)?{type:'garden-plot',action:action.split('-')[0],index:Number(action.slice(-1)),at:now()}:
    action==='jade-cut'||action==='jade-window'?{type:action,at:now()}:null;
  notice=result.label==='stone'?'Nhặt được Đá.':result.label==='coal'?'Nhặt được Than.':
   result.label==='iron'?'Nhặt được Sắt.':result.label==='crystal'?'✦ Nhặt được Tinh thạch!':result.label;
  noticeUntil=now()+2500;error=false;save(state,previousState);render();return true;
 }
 async function transferArcade(){
  tick();
  if(!exchangeEnabled()||exchangeBusy||!state||!activeKey)return false;
  const uid=identity(),pendingKey=exchangeKey(PENDING),settledKey=exchangeKey(SETTLED);
  const auth=root.firebase?.auth?.(),firestore=root.firebase?.firestore?.();
  if(!uid||!pendingKey||!settledKey||auth?.currentUser?.uid!==uid||!firestore){
   notice='Hãy đăng nhập trước khi đổi Xu.';error=true;noticeUntil=now()+4500;render();return false;
  }
  let pending=readPending();
  if(!pending){
   const q=quoteForExchange();if(!q.ok)return false;
   pending={uid,id:sparkBridge.requestId(),gameXu:q.gameXu,
    availableTenths:state.coins};
   try{root.localStorage.setItem(pendingKey,JSON.stringify(pending));}
   catch(_){notice='Không lưu được lệnh đổi trên thiết bị.';error=true;noticeUntil=now()+4500;render();return false;}
  }
  exchangeBusy=true;render();
  try{
   const result=await sparkBridge.transfer({db:firestore,auth,uid,id:pending.id,
    gameXu:pending.gameXu,availableTenths:pending.availableTenths});
   if(identity()!==uid||activeKey!==keyFor(uid))return false;
   const settled=root.localStorage.getItem(settledKey);
   if(settled!==pending.id){
    state=core.advance(state,now(),0);
    state.coins=Math.max(0,state.coins-pending.gameXu*10);
    if(!save())throw Error('Đã cộng vào ví nhưng chưa xác nhận trừ Xu game trên thiết bị');
    root.localStorage.setItem(settledKey,pending.id);
   }
   root.localStorage.removeItem(pendingKey);
   if(typeof userProfile!=='undefined'&&userProfile){
    userProfile.currency=result.balance;
    if(typeof saveCurrentAccount==='function')saveCurrentAccount();
   }
   root.renderWallet?.();
   exchangeOpen=false;notice='✓ Đã chuyển '+result.walletXu+' Xu vào Ví hệ thống.';
   error=false;noticeUntil=now()+4500;return true;
  }catch(e){
   notice='Chưa xác nhận lệnh đổi. Thử lại đúng lệnh đang chờ.';
   error=true;noticeUntil=now()+5500;
   console.warn('DUDU Spark personal exchange:',e?.code||e?.message||'unknown');
   return false;
  }finally{exchangeBusy=false;render();}
 }
 function init(){
  const element=host();if(!element)return false;
  root.document.getElementById('arcade-season-portal-c423')?.addEventListener('click',()=>{
   if(!ensure())return;
   seasonOpen=true;drawerOpen=null;exchangeOpen=false;render();
  });
  const headerWallet=root.document.getElementById('arcade-header-wallet-v1');
  headerWallet?.addEventListener('click',()=>{
   if(!ensure())return;
   drawerOpen=null;exchangeAmount=10;exchangeOpen=true;render();
  });
  element.addEventListener('input',event=>{
   if(!event.target.matches?.('[data-arcade-exchange-input]'))return;
   exchangeAmount=event.target.value.trim()===''?0:Number(event.target.value);
   updateExchangePreview();
  });
  element.addEventListener('click',event=>{
   const seasonControl=event.target.closest?.('button[data-arcade-season]');
   if(seasonControl?.dataset?.arcadeSeason!=null){seasonOpen=false;render();return;}
   const seasonDestination=event.target.closest?.('button[data-arcade-season-go]');
   if(seasonDestination?.dataset?.arcadeSeasonGo!=null){
    const next=seasonDestination.dataset.arcadeSeasonGo;
    if(modeLabels[next]){tab=next;seasonOpen=false;drawerOpen=null;
     resetScrollOnPaint=true;render();}
    return;
   }
   const marketSummary=event.target.closest?.('.jade-market-tray summary');
   if(marketSummary?.tagName==='SUMMARY'){
    const tray=marketSummary.parentElement;
    root.DuduPersonalJadeUIV1?.rememberTray?.(Number(tray.dataset.marketStall),!tray.open);
   }
   const honorLink=event.target.closest?.('button[data-arcade-honor]');
   if(honorLink?.dataset?.arcadeHonor){
    const source=modeLabels[honorLink.dataset.arcadeHonor];
    if(source)root.DuduHonorUIV46?.openGame?.(source);
    drawerOpen=null;
    if(source)root.openPhoneApp?.('honors');
    return;
   }
   const drawer=event.target.closest?.('button[data-arcade-drawer]');
   if(drawer?.dataset?.arcadeDrawer){
    drawerOpen=drawer.dataset.arcadeDrawer==='close'?null:drawer.dataset.arcadeDrawer;
    if(drawerOpen)exchangeOpen=false;
    render();return;
   }
   if(event.target.classList?.contains('arcade-sheet-overlay')){
    drawerOpen=null;render();return;
   }
   const preset=event.target.closest('[data-arcade-exchange-preset]');
   if(preset?.dataset?.arcadeExchangePreset!=null&&!preset.disabled){
    const choice=preset.dataset.arcadeExchangePreset;
    exchangeAmount=choice==='max'?quoteForExchange().maxGameXu:Number(choice);
    render();return;}
   const exchange=event.target.closest('[data-arcade-exchange]');
   if(exchange){
    const choice=exchange.dataset.arcadeExchange;
    if(choice==='wallet'){
     exchangeOpen=false;
     if(typeof root.openPhoneApp==='function')root.openPhoneApp('wallet');
     else render();
     return;
    }
    if(choice==='open'||choice==='close'&&event.target===exchange||
     choice==='close'&&exchange.tagName==='BUTTON'){
     if(choice==='open')exchangeAmount=10;
     exchangeOpen=choice==='open';render();return;
    }
   }
   const control=event.target.closest('button');
   if(!control||control.disabled)return;
   if(control.dataset.jadeMarketLock!=null){
    const market=core.JADE?.MARKETS?.[Number(control.dataset.jadeMarketLock)];
    if(market){notice='🔒 '+market.short+': '+market.unlock;noticeUntil=now()+4500;error=false;render();}
    return;
   }
   if(control.dataset.jadeMarketSwitch!=null){
    const market=Number(control.dataset.jadeMarketSwitch);
    if(root.DuduPersonalJadeUIV1?.chooseMarket?.(market,state?.jade)){
     render();
     const viewport=element.querySelector('.arcade-sheet-overlay .arcade-sheet-body');
     const route=viewport?.querySelector('.jade-market-stop-list');
     const selected=route?.querySelector('.jade-market-stop.is-active');
     if(route&&selected){
      route.scrollLeft=selected.offsetLeft-(route.clientWidth-selected.offsetWidth)/2;
      selected.focus?.({preventScroll:true});
     }
     if(viewport){
      const intro=viewport.querySelector('.jade-market-intro');
      viewport.scrollTop=(intro?.offsetHeight||0)+8;
     }
    }
    return;
   }
   if(control.dataset.jadePreviewSlot!=null){
    const tray=control.closest('.jade-market-card')?.querySelector('.jade-market-tray');
    if(tray){
     const stall=Number(tray.dataset.marketStall);
     const slot=Number(control.dataset.jadePreviewSlot);
     root.DuduPersonalJadeUIV1?.chooseMarketSample?.(stall,slot);
     render();
     const selectedTray=element.querySelector('.arcade-sheet-overlay .jade-market-tray[data-market-stall="'+stall+'"]');
     const specimen=selectedTray?.querySelector('.jade-market-sample.is-selected');
     const viewport=selectedTray?.closest('.arcade-sheet-body');
     if(specimen&&viewport){
      // Each stone in the scene opens only its own actionable offer, not three
      // duplicate cards. Keep the chosen offer visible after the sheet redraw.
      const target=specimen.getBoundingClientRect(),frame=viewport.getBoundingClientRect();
      viewport.scrollTop+=Math.round((target.top+target.bottom-frame.top-frame.bottom)/2);
      const pick=specimen.querySelector('.jade-sample-pick');
      if(pick?.disabled)specimen.focus?.({preventScroll:true});
      else pick?.focus?.({preventScroll:true});
     }
    }
    return;
   }
   if(control.dataset.jadePreviewAll!=null){
    const tray=control.closest('.jade-market-tray'),stall=Number(tray?.dataset.marketStall);
    root.DuduPersonalJadeUIV1?.chooseMarketSample?.(stall,null);
    render();
    const comparison=element.querySelector('.arcade-sheet-overlay .jade-market-tray[data-market-stall="'+stall+'"]');
    const viewport=comparison?.closest('.arcade-sheet-body');
    if(comparison&&viewport){
     viewport.scrollTop+=Math.round(comparison.getBoundingClientRect().top-viewport.getBoundingClientRect().top-10);
     comparison.querySelector('summary')?.focus?.({preventScroll:true});
    }
    return;
   }
   const next=control.dataset.arcadeTab;
   if(next&&modeLabels[next]){
    tick();if(next!==tab)resetScrollOnPaint=true;
    tab=next;drawerOpen=null;notice='';error=false;render();return;}
   const action=control.dataset.arcadeAction;
   if(action==='transfer'){void transferArcade();return;}
   if(['jade-open-market','jade-open-workshop','jade-open-vault'].includes(action)){
    drawerOpen=action==='jade-open-market'?'jade-market':
     action==='jade-open-vault'?'jade-vault':'jade-workshop';render();return;
   }
   if(action)interact(action);
  });
  root.setInterval(tick,1000);
  root.addEventListener('pagehide',()=>save());
  root.document.addEventListener?.('keydown',event=>{
   if(event.key==='Escape'&&(exchangeOpen||drawerOpen||seasonOpen)){
    if(seasonOpen)seasonOpen=false;else if(exchangeOpen)exchangeOpen=false;else drawerOpen=null;
    render();
   }
  });
  root.addEventListener('storage',event=>{
   if(!activeKey||event.key!==activeKey)return;
   // Another tab saved the same local arcade. Refresh the view instead of
   // silently continuing from a stale in-memory snapshot.
   try{state=core.advance(core.norm(JSON.parse(event.newValue||'null'),now()),now(),0);
    lastTick=now();if(visible())render();}catch(_){/* Leave last valid local copy. */}
  });
  return true;
 }
 function peekBalance(){
  const current=ensure();
  return current?fmt(current.coins):null;
 }
 function openExchange(){
  if(!ensure()){
   if(typeof root.openPhoneApp==='function')root.openPhoneApp('arcade');
   return false;
  }
  exchangeAmount=10;exchangeOpen=true;
  if(!visible()&&typeof root.openPhoneApp==='function')root.openPhoneApp('arcade');
  else render();
  return true;
 }
 root.DuduPersonalArcadeUIV1=Object.freeze({init,render,interact,tick,peekBalance,openExchange});
 init();
})(typeof window!=='undefined'?window:{});
