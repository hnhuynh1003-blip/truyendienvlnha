/* Personal Arcade V1 — Trạm Neon / Địa Tầng 07 / Vườn Sương.
 * Per-UID local game saves only. No Firestore, real wallet, shop or entitlement writes.
 */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1;
 if(!core||!root.document)return;
 const KEY='dudu-personal-arcade:v1:';
 const host=()=>root.document.getElementById('personal-arcade-v1');
 const modeLabels={neon:'Trạm Neon',mine:'Địa Tầng 07',garden:'Vườn Sương'};
 const oreLabels={stone:'Đá',coal:'Than',iron:'Sắt',crystal:'Tinh thạch'};
 let tab='neon',activeKey=null,state=null,lastTick=Date.now(),lastSave=0,
  lastPaint=0,notice='Ba trò chơi độc lập. Chọn một trạm để bắt đầu.',error=false;
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
   error=true;return false;}
 }
 function ensure(){
  const nextKey=keyFor(identity());
  if(nextKey!==activeKey){
   if(activeKey&&state)save();
   activeKey=nextKey;state=null;
   const time=now();lastTick=time;lastSave=time;
   if(activeKey){
    let saved=null;
    try{saved=JSON.parse(root.localStorage.getItem(activeKey)||'null');}catch(_){/* start fresh */}
    state=core.advance(core.norm(saved,time),time,0);
    notice='Đã mở khu giải trí cá nhân. Xu ở đây chưa liên kết ví hệ thống.';
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
 function neonPanel(s){
  const cpuCost=core.upgradeCost(s,'cpu'),gpuCost=core.upgradeCost(s,'gpu');
  const activeRate=s.neon.running?core.rate(s):0;
  return `<section class="arcade-panel arcade-neon" aria-label="Trạm Neon">
    <div class="arcade-heading"><strong>Trạm Neon</strong><code>NODE / ACTIVE</code></div>
    <div class="arcade-kicker">${s.neon.running?'● SYSTEM ONLINE':'○ SYSTEM PAUSED'}</div>
    <div class="arcade-big">+${fmt(activeRate)} Xu/s</div>
    <div class="arcade-terminal"><span>01</span> const income = ${activeRate/10};
    <span>02</span> ${s.neon.running?'// auto mining cycles':'// system paused'}</div>
    <div class="arcade-metric">Chạy nhàn rỗi trong tab đang mở. Không tốn thể lực.</div>
    <div class="arcade-tile-grid">
      <div class="arcade-tile"><small>CPU / Xung</small><b>Lv.${s.neon.cpu}</b></div>
      <div class="arcade-tile"><small>VGA / Nhân</small><b>Lv.${s.neon.gpu}</b></div>
    </div>
    <div class="arcade-actions">
      ${button(s.neon.running?'Ⅱ Tạm dừng':'▶ Bật máy','toggle-neon','primary')}
      ${button('CPU · '+fmt(cpuCost)+' Xu','cpu','gold',s.coins<cpuCost||s.neon.cpu>=50)}
      ${button('VGA · '+fmt(gpuCost)+' Xu','gpu','gold',s.coins<gpuCost||s.neon.gpu>=20)}
    </div>
  </section>`;
 }
 function minePanel(s,time){
  const m=s.mine,repairing=!!m.repairUntil;
  const all=Object.values(m.ores).reduce((sum,n)=>sum+n,0);
  return `<section class="arcade-panel arcade-mine" aria-label="Địa Tầng 07">
    <div class="arcade-heading"><strong>Địa Tầng 07</strong><code>CORE / 07</code></div>
    <div class="arcade-metric">Độ bền cuốc <b>${m.durability}/100</b>
      ${repairing?'· Đang sửa '+countdown(m.repairUntil-time):''}</div>
    <div class="arcade-progress" role="progressbar" aria-label="Độ bền cuốc" aria-valuenow="${m.durability}" aria-valuemin="0" aria-valuemax="100"><span style="width:${m.durability}%"></span></div>
    <div class="arcade-actions">
      ${button('⛏ Đào quặng','mine','primary',repairing||!m.durability)}
      ${button(repairing?'🔧 '+countdown(m.repairUntil-time):'🔧 Tự sửa · 4 phút','repair-wait','',repairing||m.durability===100)}
      ${button('⚒ Rèn ngay · 5 than + 2 sắt','repair-forge','gold',repairing||m.durability===100||m.ores.coal<5||m.ores.iron<2)}
      ${button('Dầu bôi trơn · 15 Xu','buy-oil','',repairing||m.durability===100||s.coins<150)}
      ${button('Cuốc mới · 80 Xu','buy-pick','gold',(m.durability===100&&!repairing)||s.coins<800)}
    </div>
    <div class="arcade-tile-grid">${Object.entries(m.ores).map(([ore,count])=>
     `<div class="arcade-tile"><small>${oreLabels[ore]}</small><b>${count}</b></div>`).join('')}</div>
    <div class="arcade-actions">${button('Bán '+all+' quặng','sell-ores','gold',!all)}</div>
    <p class="arcade-note">Đào quặng không tiêu hao năng lượng đọc truyện. Có thể chờ cuốc tự hồi hoặc dùng vật liệu trong mỏ.</p>
  </section>`;
 }
 function gardenPanel(s,time){
  const g=s.garden;
  const bed=(b,index)=>{
   const mature=b.status==='growing'&&time>=b.readyAt;
   const action=b.status==='empty'?'plant-'+index:b.status==='dry'?'water-'+index:'harvest-'+index;
   const text=b.status==='empty'?'Gieo hạt':b.status==='dry'?'Tưới nước':mature?'Thu hoạch':'Đang lớn';
   const caption=b.status==='empty'?'Ô trống':b.status==='dry'?'Chờ tưới':mature?'Đã chín':countdown(b.readyAt-time);
   const disabled=b.status==='empty'?!g.seeds:b.status==='dry'?!g.water:!mature;
   return `<div class="arcade-bed"><span class="symbol">${b.status==='empty'?'▫':b.status==='dry'?'🌱':mature?'🌼':'🪴'}</span>
     <strong>Luống ${index+1}</strong><small>${caption}</small>${button(text,action,'primary',disabled)}</div>`;
  };
  return `<section class="arcade-panel arcade-garden" aria-label="Vườn Sương">
    <div class="arcade-heading"><strong>Vườn Sương</strong><code>MIST / GARDEN</code></div>
    <div class="arcade-tile-grid">
      <div class="arcade-tile"><small>Nước hứng sương</small><b>💧 ${g.water}/3</b></div>
      <div class="arcade-tile"><small>Hạt giống</small><b>🌿 ${g.seeds}</b></div>
    </div>
    <div class="arcade-metric">Mỗi 15 phút hứng thêm một bình nước, kể cả khi không chơi.</div>
    <div class="arcade-beds">${g.beds.map(bed).join('')}</div>
    <div class="arcade-actions">${button('Mua 3 hạt · 10 Xu','buy-seeds','gold',s.coins<100)}</div>
    <div class="arcade-tile" style="margin-top:9px"><small>Hồ cá · Nhặt bọt nước</small>
      <div class="arcade-big" style="font-size:23px">🐠 ${g.bubbleReady?'✦ Có quà':'◌ '+countdown(g.bubbleAt-time)}</div>
      <div class="arcade-metric">Mồi câu đã nhặt: ${g.bait}</div>
      <div class="arcade-actions">${button('Thu bọt · +4 Xu & mồi','catch-bubble','primary',!g.bubbleReady)}</div>
    </div>
  </section>`;
 }
 function render(){
  const element=host();if(!element)return false;
  const s=ensure();
  if(!s){element.innerHTML='<div class="arcade-empty">Đăng nhập tài khoản để lưu tiến trình minigame riêng trên thiết bị này.</div>';return true;}
  const time=now(),panel=tab==='neon'?neonPanel(s):tab==='mine'?minePanel(s,time):gardenPanel(s,time);
  const previousScroll=element.scrollTop;
  element.innerHTML=`<div class="arcade-shell">
    <div class="arcade-hero"><div class="arcade-kicker">PERSONAL / ARCADE / V1</div>
      <div class="arcade-hero-title">Chơi một chút, tích một chút.</div>
      <div class="arcade-hero-wallet">${fmt(s.coins)} <small>Xu trò chơi</small></div>
      <p class="arcade-note">Ba trò độc lập · Chơi tùy thích · Không cần đọc truyện để nhận lượt.</p>
    </div>
    <div class="arcade-tabs" role="tablist" aria-label="Ba minigame">
      ${Object.entries(modeLabels).map(([type,name])=>`<button type="button" class="arcade-tab" role="tab"
        aria-selected="${tab===type}" data-arcade-tab="${type}">${type==='neon'?'🖥️':type==='mine'?'⛏️':'🪴'} ${name}</button>`).join('')}
    </div>
    ${panel}
    <div class="arcade-status" data-error="${error}" aria-live="polite" data-arcade-notice></div>
    <div class="arcade-privacy"><span class="arcade-pill">LOCAL / FREE</span>
      <p class="arcade-note">Xu trò chơi hiện chỉ lưu trên thiết bị này, theo tài khoản. Chưa chuyển vào ví Xu chính hoặc mở khóa truyện. Không sử dụng Firebase Functions, không phát sinh phí.</p>
      ${button('Chuyển vào ví Xu hệ thống · chờ Rules','transfer','gold',true)}
    </div>
  </div>`;
  element.querySelector('[data-arcade-notice]').textContent=notice;
  element.scrollTop=previousScroll;
  lastPaint=time;return true;
 }
 function tick(){
  const time=now(),s=ensure();
  if(!s){lastTick=time;if(visible())render();return;}
  state=core.advance(s,time,Math.max(0,time-lastTick));
  lastTick=time;
  if(time-lastSave>=5000)save();
  if(visible()&&time-lastPaint>=2000)render();
 }
 function interact(action){
  tick();if(!state||!activeKey)return false;
  const result=core.act(state,action,now(),Math.random());
  if(!result.ok){notice=result.reason;error=true;render();return false;}
  state=result.state;
  notice=result.label==='stone'?'Nhặt được Đá.':result.label==='coal'?'Nhặt được Than.':
   result.label==='iron'?'Nhặt được Sắt.':result.label==='crystal'?'✦ Nhặt được Tinh thạch!':result.label;
  error=false;save();render();return true;
 }
 function init(){
  const element=host();if(!element)return false;
  element.addEventListener('click',event=>{
   const control=event.target.closest('button');
   if(!control||control.disabled)return;
   const next=control.dataset.arcadeTab;
   if(next&&modeLabels[next]){tick();tab=next;notice='Đã chuyển sang '+modeLabels[next]+'.';error=false;render();return;}
   const action=control.dataset.arcadeAction;
   if(action&&action!=='transfer')interact(action);
  });
  root.setInterval(tick,1000);
  root.addEventListener('pagehide',()=>save());
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
