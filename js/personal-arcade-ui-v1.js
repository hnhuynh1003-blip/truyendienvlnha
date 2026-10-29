/* Personal Arcade — playable scenes for Trạm Neon / Địa Tầng 07 / Vườn Sương.
 * Local saves only. No Firestore, real wallet or entitlement writes.
 */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1;
 if(!core||!root.document)return;
 const KEY='dudu-personal-arcade:v1:';
 const host=()=>root.document.getElementById('personal-arcade-v1');
 const modeLabels={neon:'Trạm Neon',mine:'Địa Tầng 07',garden:'Vườn Sương'};
 const oreLabels={stone:'Đá',coal:'Than',iron:'Sắt',crystal:'Tinh thạch'};
 const oreGlyphs={stone:'◆',coal:'⬟',iron:'⬢',crystal:'✦'};
 let tab='neon',activeKey=null,state=null,lastTick=Date.now(),lastSave=0,
  lastPaint=0,lastRenderedKey=null,notice='',noticeUntil=0,error=false,feedback=null,
  exchangeOpen=false;
 const now=()=>Date.now();
 const isSandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 function identity(){
  if(isSandbox()&&typeof currentUsername!=='undefined'&&currentUsername)
   return 'sandbox:'+currentUsername;
  const uid=root.DuduAuth?.uid?.();
  return root.DuduAuth?.isReady?.()&&typeof uid==='string'&&uid?uid:null;
 }
 const keyFor=id=>id?KEY+encodeURIComponent(id):null;
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
   skinCost=core.upgradeCost(s,'skin');
  const activeRate=s.neon.running?core.rate(s):0;
  const rateLabel=(activeRate/1000).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:3});
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
    <div class="arcade-stage neon-stage neon-skin-${s.neon.skin}" role="img" aria-label="Dàn máy tính đang vận hành với những màn hình phát sáng">
      <div class="neon-light neon-light-one"></div><div class="neon-light neon-light-two"></div>
      <div class="neon-wall-logo">CRYO<span>TECH</span><small>NET · STATION</small></div>
      <div class="neon-server-stack"><span></span><span></span><span></span><span></span></div>
      <div class="neon-floor"></div><div class="neon-computer-rack">${stations}</div>
      <div class="neon-stage-income"><span>THU NHẬP TRỰC TIẾP</span><b>+${rateLabel} <small>Xu / giây</small></b>
        <div class="neon-income-track"><i></i></div></div>
      <div class="neon-room-level">${s.neon.stations}/3 DÀN · CẤP ${level}</div>
    </div>
    <div class="arcade-control-panel">
      <div class="arcade-panel-heading"><div><h4>Nâng cấp phòng máy</h4></div>
        ${button(s.neon.running?'Ⅱ Tạm dừng':'▶ Bật máy','toggle-neon','switch')}</div>
      <div class="arcade-upgrade-grid">
       ${upgrade('▦','CPU','Cấp '+s.neon.cpu+'/50','cpu',s.neon.cpu>=50?null:cpuCost)}
       ${upgrade('◈','VGA','Cấp '+s.neon.gpu+'/20','gpu',s.neon.gpu>=20?null:gpuCost)}
       ${upgrade('▣','Dàn máy',s.neon.stations+'/3 dàn','station',stationCost)}
       ${upgrade('⌁','Mạng', 'Cấp '+s.neon.router+'/10','router',routerCost)}
       ${upgrade('✧','LED phòng', ['Lam','Tím','Hổ phách'][s.neon.skin],'skin',skinCost)}
      </div>
    </div>
  </section>`;
 }
 function minePanel(s,time){
  const m=s.mine,repairing=!!m.repairUntil;
  const max=core.maxDurability(m);
  const all=Object.values(m.ores).reduce((sum,n)=>sum+n,0),hit=activeFeedback('mine',time);
  return `<section class="arcade-world arcade-world-mine" aria-label="Địa Tầng 07">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">02 / CLICKER</span>
      <h3>Địa Tầng 07</h3><p>Chạm vỉa quặng để khai thác. Mang khoáng sản đi bán.</p></div>
      <span class="arcade-world-live">CORE / 07</span></header>
    <div class="arcade-stage mine-stage ${hit?'mine-hit-active':''}">
      <div class="mine-stratum mine-stratum-1"></div><div class="mine-stratum mine-stratum-2"></div>
      <div class="mine-cave-light"></div><div class="mine-tunnel-arch"></div>
      <div class="mine-crystal mine-crystal-left"></div><div class="mine-crystal mine-crystal-right"></div>
      <div class="mine-scene-head"><span>HẦM KHAI THÁC · -${Math.floor(m.dug/20)+7}M</span>
        <span>${m.dug.toLocaleString('vi-VN')} LƯỢT ĐÀO</span></div>
      <button class="mine-ore-button" type="button" data-arcade-action="mine" ${repairing||!m.durability?'disabled':''}
        aria-label="Gõ vào vỉa quặng để đào" title="Chạm hoặc bấm để đào quặng">
        <span class="mine-rock-shadow"></span><span class="mine-rock"><i></i><i></i><i></i><i></i><i></i></span>
        <span class="mine-ore-glow"></span><span class="mine-hit-spark">✦</span>
        <span class="mine-tap-prompt">${repairing?'ĐANG SỬA CUỐC':m.durability?'⛏ CHẠM ĐỂ ĐÀO':'CUỐC ĐÃ HẾT ĐỘ BỀN'}</span></button>
      ${hit?`<div class="mine-drop" aria-live="polite">+1 ${oreGlyphs[hit.ore]} ${oreLabels[hit.ore]}</div>`:''}
      <div class="mine-bottom-hud"><div class="mine-durability-circle" style="--mine-durability:${m.durability/max*100}%"><span>CUỐC</span><b>${m.durability}<small>/${max}</small></b></div>
        <span>${repairing?`🔧 Tự sửa: <span data-arcade-until="${m.repairUntil}">${countdown(m.repairUntil-time)}</span>`:'Mỗi cú đào trừ 1 độ bền'}</span></div>
    </div>
    <div class="arcade-control-panel">
      <div class="arcade-panel-heading"><div><span class="arcade-eyebrow">KHO KHOÁNG SẢN</span><h4>Túi quặng · ${all} mẫu</h4></div>
        ${button('Bán tất cả ↗','sell-ores','market',!all)}</div>
      <div class="mine-inventory">${Object.entries(m.ores).map(([ore,count])=>
        `<div class="mine-inventory-slot mine-slot-${ore}"><span>${oreGlyphs[ore]}</span><small>${oreLabels[ore]}</small><b>${count}</b></div>`).join('')}</div>
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
      </div>
    </div>
  </section>`;
 }
 function gardenPanel(s,time){
  const g=s.garden;
  const bed=(b,index)=>{
   const mature=b.status==='growing'&&time>=b.readyAt;
   const action=b.status==='empty'?'plant-'+index:b.status==='dry'?'water-'+index:'harvest-'+index;
   const text=b.status==='empty'?'＋ Gieo':b.status==='dry'?'💧 Tưới':mature?'✦ Thu':'Đang lớn';
   const caption=b.status==='empty'?'Đất trống':b.status==='dry'?'Thiếu nước':mature?'Đã chín':countdown(b.readyAt-time);
   const disabled=b.status==='empty'?!g.seeds:b.status==='dry'?!g.water:!mature;
   return `<button class="garden-plot ${b.status} ${mature?'mature':''}" type="button" data-arcade-action="${action}" ${disabled?'disabled':''}
     aria-label="Luống ${index+1}: ${text}, ${caption}">
     <span class="garden-soil"></span><span class="garden-stem"><i></i><i></i><i></i></span>
     <span class="garden-flower"><i></i><i></i><i></i><i></i><i></i></span>
     <span class="garden-plot-label"><b>LUỐNG ${String(index+1).padStart(2,'0')}</b><small ${b.status==='growing'&&!mature?`data-arcade-until="${b.readyAt}"`:''}>${caption}</small><em>${text}</em></span></button>`;
  };
  return `<section class="arcade-world arcade-world-garden" aria-label="Vườn Sương">
    <header class="arcade-world-heading"><div><span class="arcade-eyebrow">03 / CHILL FARM</span>
      <h3>Vườn Sương</h3><p>Chăm hai luống hoa. Ngắm hồ cá, thu những món quà nhỏ.</p></div>
      <span class="arcade-world-live">MIST / GARDEN</span></header>
    <div class="arcade-stage garden-stage">
      <div class="garden-mist garden-mist-a"></div><div class="garden-mist garden-mist-b"></div>
      <div class="garden-cloud garden-cloud-a"></div><div class="garden-cloud garden-cloud-b"></div>
      <div class="garden-mountains"></div><div class="garden-grass"></div>
      <div class="garden-plot-area">${g.beds.map(bed).join('')}</div>
      <div class="garden-pond"><div class="garden-pond-shine"></div>
        <span class="garden-fish garden-fish-a"></span><span class="garden-fish garden-fish-b"></span>
        <span class="garden-bubble garden-bubble-a"></span><span class="garden-bubble garden-bubble-b"></span>
        <span class="garden-bubble garden-bubble-c"></span></div>
      <button type="button" class="garden-pond-collect ${g.bubbleReady?'is-ready':''}" data-arcade-action="catch-bubble" ${g.bubbleReady?'':'disabled'}>
        ${g.bubbleReady?'✦ Thu bọt · +0,5 Xu':`Hồ cá · <span data-arcade-until="${g.bubbleAt}">${countdown(g.bubbleAt-time)}</span>`}</button>
    </div>
    <div class="arcade-control-panel"><div class="garden-resources">${hud('NƯỚC HỨNG SƯƠNG','💧 '+g.water+'/'+g.waterCap,g.water===g.waterCap?'Bình đã đầy':'Hồi mỗi 15 phút')}
      ${hud('HẠT GIỐNG','✿ '+g.seeds,'Có thể mua thêm')}</div>
      <div class="arcade-panel-heading"><div><span class="arcade-eyebrow">NHÀ KÍNH</span>
        <h4>Vật tư & thu hoạch</h4></div>${button('＋ 3 hạt · 10 Xu','buy-seeds','market',s.coins<100)}</div>
      <div class="garden-statline"><span>🌿 Đã thu hoạch <b>${g.harvests}</b></span><span>🐟 Mồi câu <b>${g.bait}</b></span></div>
      <div class="arcade-upgrade-grid arcade-garden-upgrades">
       ${upgrade('💧','Bồn nước',g.waterCap+'/7 bình','water-cap',core.upgradeCost(s,'water-cap'))}
       ${upgrade('🐟','Hồ cá','Cấp '+g.pondTier+'/5','pond-tier',core.upgradeCost(s,'pond-tier'))}
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
        <div class="arcade-exchange-amount">✦ ${fmt(s.coins)} <small>Xu trò chơi</small></div>
        <div class="arcade-exchange-arrow">↓</div>
        <div class="arcade-exchange-target">Ví Xu đọc truyện <span>Chưa kết nối</span></div>
        ${button('Chuyển Xu · Chưa mở','transfer','gold',true)}
        <p>Chỉ mở đổi Xu khi ví và Rules xác nhận giao dịch. Xu trong trò chơi vẫn được giữ nguyên.</p>
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
  tick();if(!state||!activeKey)return false;
  const result=core.act(state,action,now(),Math.random());
  if(!result.ok){notice=result.reason;noticeUntil=now()+3500;error=true;render();return false;}
  state=result.state;
  feedback=action==='mine'?{type:'mine',ore:result.label,at:now()}:null;
  notice=result.label==='stone'?'Nhặt được Đá.':result.label==='coal'?'Nhặt được Than.':
   result.label==='iron'?'Nhặt được Sắt.':result.label==='crystal'?'✦ Nhặt được Tinh thạch!':result.label;
  noticeUntil=now()+2500;error=false;save();render();return true;
 }
 function init(){
  const element=host();if(!element)return false;
  element.addEventListener('click',event=>{
   const exchange=event.target.closest('[data-arcade-exchange]');
   if(exchange){
    const choice=exchange.dataset.arcadeExchange;
    if(choice==='open'||choice==='close'&&event.target===exchange||
     choice==='close'&&exchange.tagName==='BUTTON'){
     exchangeOpen=choice==='open';render();return;
    }
   }
   const control=event.target.closest('button');
   if(!control||control.disabled)return;
   const next=control.dataset.arcadeTab;
   if(next&&modeLabels[next]){tick();tab=next;notice='';error=false;render();return;}
   const action=control.dataset.arcadeAction;
   if(action&&action!=='transfer')interact(action);
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
 root.DuduPersonalArcadeUIV1=Object.freeze({init,render,interact,tick});
 init();
})(typeof window!=='undefined'?window:{});
