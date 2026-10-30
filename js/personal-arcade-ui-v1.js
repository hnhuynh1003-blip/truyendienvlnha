/* Personal Arcade — playable scenes for Trạm Neon / Địa Tầng 07 / Vườn Sương.
 * Game simulation remains local. Spark personal transfer is opt-in and gated;
 * the matching Firestore Rules must be installed before enabling it.
 */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1;
 if(!core||!root.document)return;
 const exchangePolicy=root.DuduPersonalArcadeExchangeV1;
 const sparkBridge=root.DuduPersonalSparkExchangeV1;
 const KEY='dudu-personal-arcade:v1:';
 const PENDING='dudu-personal-arcade:exchange-pending-v1:';
 const SETTLED='dudu-personal-arcade:exchange-settled-v1:';
 const host=()=>root.document.getElementById('personal-arcade-v1');
 const modeLabels={neon:'Trạm Neon',mine:'Địa Tầng 07',garden:'Vườn Sương'};
 const oreLabels={stone:'Đá',coal:'Than',iron:'Sắt',copper:'Đồng',silver:'Bạc',
  gold:'Vàng',crystal:'Tinh thạch',jade:'Ngọc bích',meteor:'Thiên thạch',relic:'Cổ vật'};
 const oreGlyphs={stone:'◆',coal:'⬟',iron:'⬢',copper:'⬡',silver:'◈',
  gold:'✹',crystal:'✦',jade:'❖',meteor:'☄',relic:'♜'};
 let tab='neon',activeKey=null,state=null,lastTick=Date.now(),lastSave=0,
  lastPaint=0,lastRenderedKey=null,notice='',noticeUntil=0,error=false,feedback=null,
  exchangeOpen=false,exchangeAmount=10,exchangeBusy=false;
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
 function save(candidate=state){
  if(!activeKey||!candidate)return false;
  try{
   root.localStorage.setItem(activeKey,JSON.stringify(candidate));
   lastSave=now();return true;
  }catch(_){notice='Không lưu được game trên thiết bị. Kiểm tra dung lượng trình duyệt.';
   error=true;noticeUntil=now()+5000;return false;}
 }
 function ensure(){
  const nextKey=keyFor(identity());
  if(nextKey!==activeKey){
   if(activeKey&&state)save();
   activeKey=nextKey;state=null;feedback=null;exchangeOpen=false;
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
 const upgrade=(glyph,name,level,type,cost)=>`<div class="arcade-upgrade-card">
   <span class="arcade-upgrade-symbol">${glyph}</span><div><strong>${name}</strong><small>${level}</small></div>
   ${button(cost===null?'Tối đa':'＋ '+fmt(cost)+' Xu',type,'upgrade',cost===null||state.coins<cost)}</div>`;
 const activeFeedback=(type,time)=>feedback?.type===type&&time-feedback.at<1700?feedback:null;
 const hud=(name,value,small='')=>`<div class="arcade-stat"><span>${name}</span><strong>${value}</strong>${small?`<small>${small}</small>`:''}</div>`;
 function neonPanel(s){
  const cpuCost=core.upgradeCost(s,'cpu'),gpuCost=core.upgradeCost(s,'gpu'),
   stationCost=core.upgradeCost(s,'station'),routerCost=core.upgradeCost(s,'router'),
   skinCost=core.upgradeCost(s,'skin'),coolingCost=core.upgradeCost(s,'cooling'),
   time=now(),boost=s.neon.turboUntil>time,ready=time>=s.neon.turboReadyAt;
  const activeRate=s.neon.running?core.rate(s):0;
  const level=Math.min(6,Math.floor((s.neon.cpu+s.neon.gpu)/5)+1);
  const stations=Array.from({length:3},(_,i)=>`<div class="neon-computer neon-computer-${i+1} ${i>=s.neon.stations?'is-locked':''}">
    <div class="neon-monitor"><div class="neon-monitor-glass"><span>${i>=s.neon.stations?'LOCKED':'CRYO<span class="neon-blink">_</span>'}</span>
      <i></i><i></i><i></i><div class="neon-monitor-graph"></div></div></div>
    <div class="neon-stand"></div><div class="neon-keyboard"></div>
    <div class="neon-tower"><b></b><b></b><b></b></div></div>`).join('');
  return `<section class="arcade-world arcade-world-neon ${s.neon.running?'is-running':'is-paused'}" aria-label="Trạm Neon">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">01 / IDLE TYCOON</span>
      <h3>Trạm Neon</h3><p>Xây dàn máy. Chạy tự động. Nâng cấp doanh thu.</p></div>
      <span class="arcade-world-live">${s.neon.running?'● ĐANG CHẠY':'Ⅱ TẠM DỪNG'}</span></header>
    <div class="arcade-stage neon-stage neon-skin-${s.neon.skin} ${boost?'neon-overclocking':''}" role="img" aria-label="Dàn máy tính đang vận hành với những màn hình phát sáng">
      <div class="neon-light neon-light-one"></div><div class="neon-light neon-light-two"></div>
      <div class="neon-wall-logo">CRYO<span>TECH</span><small>NET · STATION</small></div>
      <div class="neon-server-stack"><span></span><span></span><span></span><span></span></div>
      <div class="neon-floor"></div><div class="neon-computer-rack">${stations}</div>
      <div class="neon-stage-income"><span>${boost?'⚡ ĐANG ÉP XUNG ×2':'THU NHẬP TRỰC TIẾP'}</span><b>+${(boost?activeRate*2/1000:activeRate/1000).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:3})} <small>Xu / giây</small></b>
        <div class="neon-income-track"><i></i></div></div>
      <div class="neon-room-level">${s.neon.stations}/3 DÀN · CẤP ${level}</div>
    </div>
    <div class="arcade-control-panel">
      <div class="arcade-panel-heading"><div><h4>Nâng cấp phòng máy</h4></div>
        ${button(s.neon.running?'Ⅱ Tạm dừng':'▶ Bật máy','toggle-neon','switch')}</div>
      <div class="arcade-power-row"><div><b>⚡ Tăng tốc phòng máy</b><small>${boost?`Còn <span data-arcade-until="${s.neon.turboUntil}">${countdown(s.neon.turboUntil-time)}</span> · x2 thu nhập`:ready?'Tăng gấp đôi thu nhập trong 3–5 phút':`Máy làm mát: <span data-arcade-until="${s.neon.turboReadyAt}">${countdown(s.neon.turboReadyAt-time)}</span>`}</small></div>
       ${button(boost?'⚡ Đang chạy':ready?'⚡ Ép xung':'⏳ Đang nguội','neon-turbo','power',boost||!ready||!s.neon.running)}</div>
      <div class="arcade-upgrade-grid">
       ${upgrade('▦','CPU','Cấp '+s.neon.cpu+'/50','cpu',s.neon.cpu>=50?null:cpuCost)}
       ${upgrade('◈','VGA','Cấp '+s.neon.gpu+'/20','gpu',s.neon.gpu>=20?null:gpuCost)}
       ${upgrade('▣','Dàn máy',s.neon.stations+'/3 dàn','station',stationCost)}
       ${upgrade('⌁','Mạng', 'Cấp '+s.neon.router+'/10','router',routerCost)}
       ${upgrade('✧','LED phòng', ['Lam','Tím','Hổ phách'][s.neon.skin],'skin',skinCost)}
       ${upgrade('❄','Tản nhiệt','Cấp '+s.neon.cooling+'/5 · kéo dài ép xung','cooling',coolingCost)}
      </div>
      <div class="arcade-contracts"><h4>▤ Hợp đồng phòng máy</h4>${[
       ['Lắp CPU cấp 2',s.neon.cpu>=2,50],['Mở hai dàn máy',s.neon.stations>=2,120],
       ['Nâng mạng cấp 3',s.neon.router>=3,180]
      ].map(([name,met,reward],i)=>`<div class="arcade-contract"><span>${s.neon.contracts.includes(i)?'✓':met?'✦':'○'} ${name}</span>
       ${button(s.neon.contracts.includes(i)?'Đã nhận':met?'Nhận '+fmt(reward)+' Xu':'+'+fmt(reward)+' Xu',
        'neon-contract-'+i,'contract',!met||s.neon.contracts.includes(i))}</div>`).join('')}</div>
    </div>
  </section>`;
 }
 function minePanel(s,time){
  const m=s.mine,repairing=!!m.repairUntil;
  const max=core.maxDurability(m);
  const all=Object.values(m.ores).reduce((sum,n)=>sum+n,0),hit=activeFeedback('mine',time),
   maxEnergy=core.maxCharge(m),found=Object.values(m.found).filter(Boolean).length;
  return `<section class="arcade-world arcade-world-mine" aria-label="Địa Tầng 07">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">02 / CLICKER</span>
      <h3>Địa Tầng 07</h3><p>Chạm vỉa quặng để khai thác. Mang khoáng sản đi bán.</p></div>
      <span class="arcade-world-live">CORE / 07</span></header>
    <div class="arcade-stage mine-stage mine-zone-scene-${m.zone} ${hit?'mine-hit-active':''}">
      <div class="mine-stratum mine-stratum-1"></div><div class="mine-stratum mine-stratum-2"></div>
      <div class="mine-cave-light"></div><div class="mine-tunnel-arch"></div>
      <div class="mine-crystal mine-crystal-left"></div><div class="mine-crystal mine-crystal-right"></div>
      <div class="mine-scene-head"><span>${['TẦNG ĐẤT','MẠCH SẮT','HANG TINH THẠCH'][m.zone]} · -${Math.floor(m.dug/20)+7}M</span>
        <span>${m.dug.toLocaleString('vi-VN')} LƯỢT ĐÀO</span></div>
      <button class="mine-ore-button" type="button" data-arcade-action="mine" ${repairing||!m.durability?'disabled':''}
        aria-label="Gõ vào vỉa quặng để đào" title="Chạm hoặc bấm để đào quặng">
        <span class="mine-rock-shadow"></span><span class="mine-rock"><i></i><i></i><i></i><i></i><i></i></span>
        <span class="mine-ore-glow"></span><span class="mine-hit-spark">✦</span>
        <span class="mine-tap-prompt">${repairing?'ĐANG SỬA CUỐC':m.durability?'⛏ CHẠM ĐỂ ĐÀO':'CUỐC ĐÃ HẾT ĐỘ BỀN'}</span></button>
      ${hit?`<div class="mine-drop" aria-live="polite">${hit.ore==='burst'?`✦ +${hit.quantity} QUẶNG!`:`+${hit.quantity} ${oreGlyphs[hit.ore]} ${oreLabels[hit.ore]}`}</div>`:''}
      <div class="mine-bottom-hud"><div class="mine-durability-circle" style="--mine-durability:${m.durability/max*100}%"><span>CUỐC</span><b>${m.durability}<small>/${max}</small></b></div>
        <span>${repairing?`🔧 Tự sửa: <span data-arcade-until="${m.repairUntil}">${countdown(m.repairUntil-time)}</span>`:'Mỗi cú đào trừ 1 độ bền'}</span></div>
    </div>
    <div class="arcade-control-panel">
      <div class="arcade-panel-heading"><div><span class="arcade-eyebrow">BẢN ĐỒ KHAI THÁC</span><h4>Chọn địa tầng</h4></div><span class="mine-gear-label">Đèn cấp ${m.lantern}/3</span></div>
      <div class="mine-zone-list">${[
       ['Tầng đất','10 loại khoáng sản',0,1],['Mạch sắt','2 quặng/lượt',40,2],['Hang tinh thể','Quặng hiếm thường hơn',160,3]
      ].map(([name,sub,dug,lamp],i)=>{const unlocked=core.zoneUnlocked(m,i);
       return `<button type="button" class="mine-zone ${m.zone===i?'selected':''}" data-arcade-action="mine-zone-${i}" ${unlocked?'':'disabled'}>
       <b>${i===0?'Ⅰ':i===1?'Ⅱ':'Ⅲ'} ${name}</b><small>${unlocked?sub:`${Math.max(0,dug-m.dug)} lượt · đèn ${lamp}`}</small></button>`;}).join('')}</div>
      <div class="mine-energy"><div><b>⚡ Phá mạch quặng</b><small>Đào thường để nạp năng lượng. Phá mạch nhận 3 quặng/lần.</small></div><strong>${m.charge}/${maxEnergy}</strong></div>
      <div class="mine-charge-track" role="progressbar" aria-label="Năng lượng phá mạch" aria-valuenow="${m.charge}" aria-valuemax="${maxEnergy}"><i style="width:${m.charge/maxEnergy*100}%"></i></div>
      ${button('⚡ PHÁ MẠCH · 5 NĂNG LƯỢNG','mine-burst','power mine-burst',repairing||m.durability<3||m.charge<5)}
      <div class="arcade-panel-heading"><div><span class="arcade-eyebrow">KHO KHOÁNG SẢN</span><h4>Túi quặng · ${all} mẫu</h4></div>
        ${button('Bán tất cả ↗','sell-ores','market',!all)}</div>
      <p class="arcade-world-hint">Xe quặng cấp ${m.cart} tăng giá bán ${10*(m.cart-1)}%. Máy dò cấp ${m.scanner} cải thiện cơ hội gặp tinh thạch.</p>
      <div class="mine-inventory">${Object.entries(m.ores).map(([ore,count])=>
        `<div class="mine-inventory-slot mine-slot-${ore} ${m.found[ore]?'is-found':'is-mystery'}"><span>${m.found[ore]?oreGlyphs[ore]:'?'}</span><small>${m.found[ore]?oreLabels[ore]:'Chưa thấy'}</small><b>${count}</b></div>`).join('')}</div>
      <div class="mine-codex"><b>📜 Sổ địa tầng · ${found}/10 phát hiện</b><small>Món đã từng đào vẫn được ghi nhận sau khi bán. Xuống hầm sâu để gặp khoáng sản hiếm.</small></div>
      <div class="arcade-panel-heading arcade-panel-heading-sub"><div><span class="arcade-eyebrow">XƯỞNG RÈN</span><h4>Bảo dưỡng dụng cụ</h4></div></div>
      <div class="mine-tool-actions">
        ${button(repairing?`⏳ <span data-arcade-until="${m.repairUntil}">${countdown(m.repairUntil-time)}</span>`:'🔧 Tự sửa · 4 phút','repair-wait','tool',repairing||m.durability===max)}
        ${button('⚒ Rèn · 5 than + 2 sắt','repair-forge','tool',repairing||m.durability===max||m.ores.coal<5||m.ores.iron<2)}
        ${button('Dầu +25 · 15 Xu','buy-oil','tool',repairing||m.durability===max||s.coins<150)}
        ${button('Cuốc mới · 80 Xu','buy-pick','tool',(m.durability===max&&!repairing)||s.coins<800)}
      </div>
      <div class="arcade-upgrade-grid arcade-tool-upgrades">
       ${upgrade('⛏','Cuốc thép','Cấp '+m.pickLevel+'/4','pick-level',core.upgradeCost(s,'pick-level'))}
       ${upgrade('◈','Mũi khoan','Cấp '+m.drillLevel+'/5','drill-level',core.upgradeCost(s,'drill-level'))}
       ${upgrade('◉','Đèn thám hiểm','Cấp '+m.lantern+'/3 · mở hầm','lantern',core.upgradeCost(s,'lantern'))}
       ${upgrade('▤','Xe chở quặng','Cấp '+m.cart+'/4 · +10% giá/cấp','cart',core.upgradeCost(s,'cart'))}
      </div>
      <div class="arcade-craft-row"><div><b>✦ Chế máy dò · cấp ${m.scanner}/3</b><small>8 sắt + 3 tinh thạch · tăng cơ hội quặng hiếm</small></div>
       ${button(m.scanner>=3?'Đã tối đa':'⚒ Chế tạo','mine-scanner','tool',m.scanner>=3||m.ores.iron<8||m.ores.crystal<3)}</div>
    </div>
  </section>`;
 }
 function gardenPanel(s,time){
  const g=s.garden,fishHit=activeFeedback('fish',time);
  const bed=(b,index)=>{
   const mature=b.status==='growing'&&time>=b.readyAt;
   const action=b.status==='empty'?'plant-'+index:b.status==='dry'?'water-'+index:'harvest-'+index;
   const text=b.status==='empty'?'＋ Gieo':b.status==='dry'?'💧 Tưới':mature?'✦ Thu':'Đang lớn';
   const caption=b.status==='empty'?'Đất trống':b.status==='dry'?'Thiếu nước':mature?'Đã chín':countdown(b.readyAt-time);
   const disabled=b.status==='empty'?!g.seeds:b.status==='dry'?!g.water:!mature;
   return `<button class="garden-plot ${b.status} crop-${b.crop} ${mature?'mature':''}" type="button" data-arcade-action="${action}" ${disabled?'disabled':''}
     aria-label="Luống ${index+1}: ${text}, ${caption}">
     <span class="garden-soil"></span><span class="garden-stem"><i></i><i></i><i></i></span>
     <span class="garden-flower"><i></i><i></i><i></i><i></i><i></i></span>
     <span class="garden-plot-label"><b>LUỐNG ${String(index+1).padStart(2,'0')} · ${b.status==='empty'?'✿':core.CROPS[b.crop].name}</b><small ${b.status==='growing'&&!mature?`data-arcade-until="${b.readyAt}"`:''}>${caption}</small><em>${text}</em></span></button>`;
  };
  return `<section class="arcade-world arcade-world-garden" aria-label="Vườn Sương">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">03 / CHILL FARM</span>
      <h3>Vườn Sương</h3><p>Gieo giống, mở rộng vườn và câu cá dưới trăng.</p></div>
      <span class="arcade-world-live">MIST / GARDEN</span></header>
    <div class="arcade-stage garden-stage ${g.plots>2?'garden-expanded':''}">
      <div class="garden-mist garden-mist-a"></div><div class="garden-mist garden-mist-b"></div>
      <div class="garden-cloud garden-cloud-a"></div><div class="garden-cloud garden-cloud-b"></div>
      <div class="garden-mountains"></div><div class="garden-grass"></div>
      <div class="garden-plot-area">${g.beds.map(bed).join('')}</div>
      <div class="garden-pond"><div class="garden-pond-shine"></div>
        <span class="garden-fish garden-fish-a"></span><span class="garden-fish garden-fish-b"></span>
        <span class="garden-bubble garden-bubble-a"></span><span class="garden-bubble garden-bubble-b"></span>
        <span class="garden-bubble garden-bubble-c"></span></div>
      ${button(g.bait?'🎣 THẢ CÂU · '+g.bait+' MỒI':'🎣 THIẾU MỒI','cast-line','power garden-cast-button',!g.bait)}
      ${fishHit?`<div class="garden-catch-pop" role="status">${fishHit.label}</div>`:''}
      <button type="button" class="garden-pond-collect ${g.bubbleReady?'is-ready':''}" data-arcade-action="catch-bubble" ${g.bubbleReady?'':'disabled'}>
        ${g.bubbleReady?'✦ Thu bọt · +0,5 Xu':`Hồ cá · <span data-arcade-until="${g.bubbleAt}">${countdown(g.bubbleAt-time)}</span>`}</button>
    </div>
    <div class="arcade-control-panel"><div class="garden-resources">${hud('NƯỚC HỨNG SƯƠNG','💧 '+g.water+'/'+g.waterCap,g.water===g.waterCap?'Bình đã đầy':'Hồi mỗi 15 phút')}
      ${hud('HẠT GIỐNG','✿ '+g.seeds,'Có thể mua thêm')}</div>
      <div class="arcade-panel-heading"><div><span class="arcade-eyebrow">TÚI HẠT GIỐNG</span><h4>Chọn giống trồng</h4></div></div>
      <div class="garden-seed-list">${Object.entries(core.CROPS).map(([id,crop])=>`<button type="button" class="garden-seed ${g.crop===id?'selected':''}" data-arcade-action="crop-${id}" ${core.cropUnlocked(g,id)?'':'disabled'}>
       <b>${id==='bloom'?'✿':id==='mint'?'❧':'☾'} ${crop.name}</b><small>${core.cropUnlocked(g,id)?`${crop.grow/60000} phút · +${fmt(crop.value)} Xu`:`Mở sau ${id==='mint'?10:30} lần thu`}</small></button>`).join('')}</div>
      <div class="arcade-panel-heading"><div><span class="arcade-eyebrow">NHÀ KÍNH</span>
        <h4>Vật tư & thu hoạch</h4></div>${button('＋ 3 hạt · 10 Xu','buy-seeds','market',s.coins<100)}</div>
      <div class="garden-quick-actions">${button('💧 Tưới các luống khô','water-all','tool',!g.sprinkler||!g.water||!g.beds.some(b=>b.status==='dry'))}
       ${button('✿ Thu hoạch tất cả','harvest-all','tool',!g.beds.some(b=>b.status==='growing'&&time>=b.readyAt))}</div>
      <div class="garden-statline"><span>🌿 Đã thu hoạch <b>${g.harvests}</b></span><span>🐟 Mồi câu <b>${g.bait}</b></span></div>
      <div class="garden-fishing"><div><b>🎣 Góc câu cá</b><small>${g.fish} cá đã câu · ${g.rareFish} cá ánh trăng · Bấm Thả câu ngay trên hồ để xem cá xuất hiện</small></div></div>
      <div class="arcade-upgrade-grid arcade-garden-upgrades">
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
  if(!s){element.innerHTML='<div class="arcade-empty">Đăng nhập tài khoản để lưu tiến trình minigame riêng trên thiết bị này.</div>';lastRenderedKey=null;return true;}
  const time=now(),panel=tab==='neon'?neonPanel(s):tab==='mine'?minePanel(s,time):gardenPanel(s,time);
  const scrollPort=element.closest?.('.phone-sub-app')||element;
  const previousScroll=scrollPort.scrollTop;
  const showToast=notice&&time<noticeUntil;
  element.innerHTML=`<div class="arcade-shell arcade-active-${tab}">
    <div class="arcade-topbar"><span class="arcade-topbar-caption">CHƠI TỰ DO</span>
      <div class="arcade-wallet"><strong data-arcade-wallet>✦ ${fmt(s.coins)}</strong><span>Xu</span>
      <button class="arcade-exchange-trigger" type="button" data-arcade-exchange="open" aria-label="Đổi Xu trò chơi sang ví đọc truyện">⇄ Đổi</button></div></div>
    <div class="arcade-tabs" role="tablist" aria-label="Ba minigame">
      ${Object.entries(modeLabels).map(([type,name])=>`<button type="button" class="arcade-tab ${tab===type?'is-active':''}" role="tab"
        aria-selected="${tab===type}" data-arcade-tab="${type}"><span class="arcade-tab-icon">${type==='neon'?'▣':type==='mine'?'◈':'✿'}</span><span>${name}</span></button>`).join('')}
    </div>
    ${panel}
    ${showToast?`<div class="arcade-status" data-error="${error}" aria-live="polite" data-arcade-notice></div>`:''}
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
  </div>`;
  if(showToast)element.querySelector('[data-arcade-notice]').textContent=notice;
  scrollPort.scrollTop=previousScroll;
  lastPaint=time;lastRenderedKey=activeKey;return true;
 }
 function refreshLive(time){
  const element=host();if(!element||!state)return;
  const wallet=element.querySelector?.('[data-arcade-wallet]');
  if(wallet)wallet.textContent='✦ '+fmt(state.coins);
  if(exchangeOpen)updateExchangePreview();
  const toast=element.querySelector?.('.arcade-status');
  if(toast&&time>=noticeUntil)toast.hidden=true;
  element.querySelectorAll?.('[data-arcade-until]').forEach(node=>{
   const until=Number(node.dataset.arcadeUntil);
   if(Number.isFinite(until))node.textContent=countdown(until-time);
  });
  lastPaint=time;
 }
 function tick(){
  const time=now(),s=ensure();
  if(!s){lastTick=time;if(visible())render();return;}
  state=core.advance(s,time,Math.max(0,time-lastTick));
  lastTick=time;
  if(time-lastSave>=5000)save();
  if(visible()){
   const completedRepair=!!s.mine.repairUntil&&!state.mine.repairUntil;
   const waterRefilled=s.garden.water!==state.garden.water;
   const bubbleAppeared=s.garden.bubbleReady!==state.garden.bubbleReady;
   const plantMatured=s.garden.beds.some(b=>b.status==='growing'&&b.readyAt>s.lastAt&&b.readyAt<=time);
   if(lastRenderedKey!==activeKey||completedRepair||waterRefilled||bubbleAppeared||plantMatured)render();
   else if(time-lastPaint>=900)refreshLive(time);
  }
 }
 function interact(action){
  tick();if(!state||!activeKey||exchangeBusy)return false;
  const result=core.act(state,action,now(),Math.random());
  if(!result.ok){notice=result.reason;noticeUntil=now()+3500;error=true;render();return false;}
  state=result.state;
  feedback=action==='mine'||action==='mine-burst'?{type:'mine',ore:action==='mine-burst'?'burst':result.label,
   quantity:result.quantity||1,at:now()}:action==='cast-line'?{type:'fish',label:result.label,at:now()}:null;
  notice=result.label==='stone'?'Nhặt được Đá.':result.label==='coal'?'Nhặt được Than.':
   result.label==='iron'?'Nhặt được Sắt.':result.label==='crystal'?'✦ Nhặt được Tinh thạch!':result.label;
  noticeUntil=now()+2500;error=false;save();render();return true;
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
  element.addEventListener('input',event=>{
   if(!event.target.matches?.('[data-arcade-exchange-input]'))return;
   exchangeAmount=event.target.value.trim()===''?0:Number(event.target.value);
   updateExchangePreview();
  });
  element.addEventListener('click',event=>{
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
   const next=control.dataset.arcadeTab;
   if(next&&modeLabels[next]){tick();tab=next;notice='';error=false;render();return;}
   const action=control.dataset.arcadeAction;
   if(action==='transfer'){void transferArcade();return;}
   if(action)interact(action);
  });
  root.setInterval(tick,1000);
  root.addEventListener('pagehide',()=>save());
  root.document.addEventListener?.('keydown',event=>{
   if(event.key==='Escape'&&exchangeOpen){exchangeOpen=false;render();}
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
