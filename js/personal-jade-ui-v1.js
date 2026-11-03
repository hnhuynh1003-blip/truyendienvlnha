/* Ngọc Phường: tactile fourth Arcade stage, shared Arcade coins and modal sheets. */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1,jade=core?.JADE;
 if(!jade)return;
 const fmt=core.formatXu;
 const greenMark='<i class="dudu-money-icon dudu-money-icon--green" aria-hidden="true"></i>';
 const btn=(label,action,kind='primary',disabled=false)=>`<button type="button" class="arcade-button ${kind}" data-arcade-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
 const stoneTool=(label,glyph,fee,action,kind,disabled=false,payout=null)=>`<button type="button" class="jade-tool-action jade-tool-${kind}" data-arcade-action="${action}" aria-label="${label}, ${payout!==null?'nhận '+fmt(payout)+' Tiền Xanh':fee?'phí '+fmt(fee)+' Tiền Xanh':'miễn phí'}" ${disabled?'disabled':''}>
   <span class="jade-tool-emblem" aria-hidden="true">${glyph}</span><span class="jade-tool-copy"><b>${label}</b><small>${payout!==null?'+'+greenMark+fmt(payout):fee?greenMark+fmt(fee):'Miễn phí'}</small></span></button>`;
 const sheet=(label,icon,id)=>`<button type="button" class="arcade-drawer-trigger" data-arcade-drawer="${id}"><span aria-hidden="true">${icon}</span>${label}</button>`;
 const stoneName=stone=>stone.grade?jade.GRADES[stone.grade]+' · '+jade.COLORS[stone.color]:'Phế thạch';
 const isGem=stone=>stone&&stone.grade>0&&stone.flaw!=='skin';
 const gemTier=stone=>!isGem(stone)?'waste':stone.grade>=7||stone.grade>=6&&stone.color===6?'legendary':stone.grade>=5||stone.color>=6?'precious':'common';
 const gemArtIndex=stone=>!isGem(stone)?-1:stone.color===0?0:stone.color===1?(stone.grade>=5?4:stone.grade>=4?9:1):stone.color===2?2:stone.color===3?(stone.grade>=6?10:3):stone.color===4?(stone.grade<=2?11:6):stone.color===5?7:stone.color===6?5:8;
 const splitArtIndex=stone=>!isGem(stone)?0:stone.color===0?1:stone.color===1?(stone.grade>=5?4:2):stone.color===2?11:stone.color===3?(stone.grade>=5?10:3):stone.color===4?6:stone.color===5?7:stone.color===6?5:8;
 const gemVisual=stone=>`jade-tier-${gemTier(stone)} jade-grade-${stone.grade||0} jade-item-shade-${stone.color} ${isGem(stone)?'jade-ai-gem-'+gemArtIndex(stone):'jade-ai-split-0'}`;
 const splitVisual=stone=>`jade-tier-${gemTier(stone)} jade-grade-${stone.grade||0} jade-item-shade-${stone.color} jade-ai-split-${splitArtIndex(stone)}`;
 const rawArtIndex=(site,seed)=>site===0&&((seed>>>4)%3===2)?5:site===1&&((seed>>>4)%4===0)?0:site===2&&((seed>>>4)%4===0)?5:site===3&&((seed>>>4)%5===0)?4:site;
 const shellVisual=(site,seed)=>`jade-raw-site-${site} jade-raw-var-${(seed>>>4)%3} jade-raw-ai-${rawArtIndex(site,seed)}`;
 const trend=rate=>rate>100?'↗ +'+(rate-100)+'%':rate<100?'↘ −'+(100-rate)+'%':'→ 0%';
 const trendClass=rate=>rate>100?'is-up':rate<100?'is-down':'is-flat';
 const dateText=time=>new Date(time||Date.now()).toLocaleDateString('vi-VN',{timeZone:'UTC',day:'2-digit',month:'2-digit'});
 const nowOf=s=>s.lastAt||Date.now();
 const marketRates=s=>jade.COLORS.map((name,i)=>({name,index:i,rate:jade.marketRate(i,nowOf(s))}));
 let openStall=null,selectedMarket=0,selectedDesign=0,selectedSetting=0;
 // Inspection notes are temporary UI state; the immutable scan/forecast
 // results continue to live in the saved stone as before.
 let selectedPoint=-1,activeStoneId=0;
 const chooseClue=(spot,stone)=>{
  if(!stone||!['raw','window'].includes(stone.phase)||!Number.isInteger(spot)||spot<0||spot>2)return false;
  selectedPoint=selectedPoint===spot&&stone.scans[spot]?-1:spot;
  return !stone.scans[spot];
 };
 const closeClue=()=>{selectedPoint=-1;};
 const chooseDesign=value=>{if(!Number.isInteger(value)||value<0||value>2)return false;selectedDesign=value;return true;};
 const chooseSetting=value=>{if(!Number.isInteger(value)||value<0||value>2)return false;selectedSetting=value;return true;};
 const jewelryLabel=stone=>stone?.craft&&jade.DESIGNS[stone.craft]?
  jade.DESIGNS[stone.craft][stone.design||0]+' · '+jade.SETTINGS[stone.setting||0]:null;
 const qualityLabel=stone=>stone?.certified===true?
  jade.QUALITY_NAMES[stone.quality??jade.jewelryQuality(stone)]:null;
 const qualityStyle=stone=>qualityLabel(stone)?'jade-quality-'+
  (stone.quality??jade.jewelryQuality(stone)):'jade-quality-hidden';
 // A finished jewel has its own real rendered object. The same atlas cell is
 // reused at the bench, in the vault and in the display cabinet.
 const jewelryArt=stone=>{
  const craft=Object.prototype.hasOwnProperty.call(jade.CRAFTS,stone?.craft)?stone.craft:'ring';
  const design=Math.max(0,Math.min(2,Number(stone?.design)||0));
  const setting=Math.max(0,Math.min(2,Number(stone?.setting)||0));
  return `jade-jewelry-sprite jade-jewelry-${craft} jade-jewelry-design-${design} jade-jewelry-setting-${setting}`;
 };
 const chosenSamples=new Map();
 function chooseMarket(index,j){
  if(!Number.isSafeInteger(index)||index<0||index>=jade.MARKETS.length||!j||!jade.unlocked(j,index))return false;
  selectedMarket=index;openStall=null;return true;
 }
 function rememberTray(index,opened){
  if(!Number.isSafeInteger(index)||index<0||index>=jade.MARKETS.length)return;
  if(opened)openStall=index;
  else if(openStall===index)openStall=null;
 }
 function chooseMarketSample(index,slot){
  if(!Number.isSafeInteger(index)||index<0||index>=jade.MARKETS.length)return;
  if(slot===null)chosenSamples.delete(index);
  else if(Number.isSafeInteger(slot)&&slot>=0&&slot<3)chosenSamples.set(index,slot);
  else return;
  openStall=index;
 }
 // Three very small inspection marks; results appear in the floating glass
 // note beside the photographed rock, never painted over its artwork.
 function stoneEvidence(stone){
  if(!stone||!['raw','window'].includes(stone.phase))return '';
  return `<div class="jade-inspection-overlay">
   ${['Thủy đầu','Mãng đới','Liệt văn'].map((name,i)=>`<button type="button"
    class="jade-evidence-point jade-evidence-${i} ${stone.scans[i]?'is-scanned':''}"
    data-jade-scan-point="${i}" aria-label="${stone.scans[i]?'Đã soi':'Soi'} ${name}"
    aria-pressed="${selectedPoint===i}" title="${name}">${stone.scans[i]?'✓':'◎'}</button>`).join('')}</div>`;
 }
 function glassNote(stone,j){
  if(!stone||!['raw','window'].includes(stone.phase)||selectedPoint<0)return '';
  const spot=selectedPoint;
  if(!stone.scans[spot])return '';
  const names=['Thủy đầu','Mãng đới','Liệt văn'];
  return `<aside class="jade-glass-note ${stone.phase==='window'||spot===1?'is-left':'is-right'}"
    aria-label="${names[spot]}" role="group">
    <div class="jade-glass-note-heading"><b>${['◉ THỦY ĐẦU','〽 MÃNG ĐỚI','⌁ LIỆT VĂN'][spot]}</b>
     <button type="button" data-jade-close-clue aria-label="Đóng ô soi">×</button></div>
    <div class="jade-glass-note-text">${jade.scanHint(stone,spot,j.lamp)}</div>
   </aside>`;
 }
 function stoneScene(stone,j,phasePulse,now){
  const phase=stone?.phase||'none',color=stone?jade.COLOR_HEX[stone.color]:'#8bc4a7',
   scanned=stone?stone.scans.filter(Boolean).length:0,
   carved=phase==='crafted',cut=phase==='cut'||carved,
   revealed=cut&&stone?.grade>0&&stone.flaw!=='skin',
   visual=cut?(revealed?'gem':'waste'):phase==='window'?'window':'rough',
   artworkIndex=stone?.site??0,tier=gemTier(stone),
   windowQuote=phase==='window'?jade.marketQuote(stone,now):null,
   windowPrice=windowQuote?fmt(windowQuote.value):'';
  return `<div class="arcade-stage jade-stage jade-site-${stone?.site??0} jade-phase-${phase} ${cut?'jade-result-'+tier:''} ${phasePulse?'is-'+phasePulse.type+'-reveal':''}"
    style="--jade-color:${color}" aria-label="Bàn soi đá Ngọc Phường">
    <div class="jade-hall-lattice jade-lattice-left"></div><div class="jade-hall-lattice jade-lattice-right"></div>
    <div class="jade-lantern jade-lantern-left"><i></i></div><div class="jade-lantern jade-lantern-right"><i></i></div>
    <div class="jade-hall-seal">玉</div><div class="jade-table-back"></div>
    <div class="jade-table-top"></div><div class="jade-table-front"></div>
    ${stone?`<div class="jade-specimen ${cut?'jade-revealed':''} ${carved?'jade-crafted':''} jade-craft-${stone.craft||'raw'}"
        aria-label="${cut?stoneName(stone):'Đá thô chưa cắt'}">
       <span class="jade-rock-face"></span><span class="jade-rock-grain"></span><span class="jade-rock-vein"></span>
       <span class="jade-item-art ${carved&&jade.CRAFTS[stone.craft]?jewelryArt(stone):`jade-item-${visual} ${cut?(carved?gemVisual(stone):splitVisual(stone)):shellVisual(stone.site,stone.seed)}`}" style="--jade-item-x:${artworkIndex*25}%;--jade-gem-tone:${color}" aria-hidden="true"></span>
       ${stoneEvidence(stone)}${cut&&revealed?'<span class="jade-reveal-rays" aria-hidden="true"></span>':''}
       ${phase==='window'?'<span class="jade-polished-window"></span>':''}
       ${cut?`<span class="jade-gem-inner"></span><span class="jade-gem-shine"></span>`:''}
      </div>`:`<div class="jade-showcase-rough" aria-hidden="true"><i></i><i></i><i></i></div>`}
    ${glassNote(stone,j)}
    ${windowQuote?`<aside class="jade-window-quote${windowPrice.length>7?' is-compact':''}${phasePulse?.type==='jade-window'?' is-revealing':''}"
       aria-label="Giá thu mua hôm nay" role="status">
      <span>THU MUA HÔM NAY</span>
      <strong>${windowPrice}${greenMark}</strong>
      <small class="${trendClass(windowQuote.rate)}">${trend(windowQuote.rate)}</small>
     </aside>`:''}
    ${cut?`<div class="jade-stage-quote jade-quote-${tier}" role="status">
      <small>${tier==='legendary'?'✦ HUYỀN THOẠI':tier==='precious'?'◇ NGỌC QUÝ':tier==='common'?'◈ NGỌC THƯỜNG':'PHẾ THẠCH'}</small>
      <strong>${revealed?stoneName(stone):'Không có ngọc'}</strong>
      <b>${greenMark}${fmt(jade.marketQuote(stone).value)}</b></div>`:''}
    ${phasePulse?`<span class="${phasePulse.type==='jade-window'?'jade-window-flash':'jade-cut-flash'} jade-flash-${tier}" aria-hidden="true"></span>`:''}
    <div class="jade-stage-base">${stone?'MẪU #'+String(stone.id).padStart(3,'0')+' · '+(stone.hunt!=null&&['raw','window'].includes(stone.phase)?'ĐÁ MÙ · '+jade.HUNTS[stone.hunt].name.toUpperCase():jade.MARKETS[stone.site].short.toUpperCase()):
     'CHỜ CHỦ NHÂN CHỌN ĐÁ THÔ'}
      ${stone&&phase==='window'?'<b>◈ ĐÃ KHAI SONG</b>':stone&&!cut?`<b>${scanned}/3 ĐIỂM ĐÃ SOI</b>`:stone&&cut?`<b>${revealed?'✦ ĐÃ LỘ NGỌC':'✦ ĐÁ ĐÃ XẺ'}</b>`:''}</div>
  </div>`;
 }
 function activePanel(s){
  const j=s.jade,stone=j.active;
  const rescueLeft=Math.max(0,j.rescueReadyAt-(s.lastAt||Date.now()));
  const rescueTime=Math.ceil(rescueLeft/60000);
  const canRescue=j.bought>0&&s.coins<jade.MARKETS[0].price;
  if(!stone&&j.stash.length)return `<div class="jade-welcome jade-welcome-stock jade-stock-dock">
    <div class="jade-stock-dock-summary"><span aria-hidden="true">◈</span><b>${j.stash.length} chờ</b></div>
    <div class="jade-stock-dock-actions" role="group" aria-label="Chọn mẫu đá hoặc đến chợ">
      ${btn('Đưa mẫu #'+j.stash[0].id,'jade-select-0','gold')}
      ${btn('＋ Đi chợ','jade-open-market','upgrade',j.stash.length>=jade.MAX_STONES)}
    </div></div>`;
  if(!stone)return `<div class="jade-welcome jade-welcome-compact">
    <div class="jade-compact-main"><span aria-hidden="true">◈</span>
     <b>${j.bought===0?'Có 1 phôi miễn phí':'Chưa chọn đá'}</b>
     ${btn(j.bought===0?'Nhận phôi':'Đến chợ',j.bought===0?'jade-buy-0':'jade-open-market','gold')}
     ${j.bought===0?'<button type="button" class="arcade-button upgrade jade-compact-market" data-arcade-action="jade-open-market" aria-label="Vào chợ đá" title="Chợ đá">▣</button>':''}</div>
    ${j.vault.length?`<div class="jade-compact-extra">${btn('▱ Kho · '+j.vault.length,'jade-open-vault','upgrade')}</div>`:''}
    ${canRescue?`<div class="jade-recovery jade-recovery-inline">
      <small>◷ Đá cứu vốn</small>
      ${btn(rescueLeft?rescueTime+' phút':'Nhận miễn phí','jade-rescue','upgrade',rescueLeft>0)}</div>`:''}</div>`;
  if(['raw','window'].includes(stone.phase)){
   const windowQuote=jade.marketQuote(stone,nowOf(s));
   const scanned=stone.scans.filter(Boolean).length,guessed=stone.forecast>=0;
   return `${scanned>=2?`<div class="jade-forecast-console ${guessed?'is-locked':''}"
     role="group" aria-label="Dự đoán loại lõi ngọc, chỉ được chọn một lần trước khi xẻ đá">
     <div class="jade-forecast-console-head"><b>◈ ĐOÁN LÕI</b>
      <small>${guessed?'✓ Đã ghi':scanned+'/3 · 1 lần'}</small></div>
     <div class="jade-forecast-console-options">${['Phế','Thường','Quý'].map((name,i)=>`<button type="button"
       class="jade-forecast-console-choice ${stone.forecast===i?'is-selected':''}"
       data-arcade-action="jade-forecast-${i}" aria-pressed="${stone.forecast===i}"
       title="${['Không có lõi ngọc giá trị','Lõi cấp 1–3','Lõi cấp 4–7'][i]} · Đoán đúng có thể được thưởng tay nghề"
       ${guessed?'disabled':''}><span aria-hidden="true">${['◇','◈','✦'][i]}</span><b>${name}</b></button>`).join('')}</div>
    </div>`:''}
     <div class="jade-saw-choices" role="group" aria-label="Chọn đường cưa đá">
      <b>⚒ Đường cưa</b>
      ${['Giữ ngọc','Cưa chuẩn','Mạo hiểm'].map((name,i)=>`<button type="button"
       class="${(stone.cutMode??1)===i?'is-selected':''}" data-arcade-action="jade-cut-mode-${i}"
       aria-pressed="${(stone.cutMode??1)===i}" title="${['Ít hao khi đá nứt, giảm 12% giá trị','Cân bằng, giữ luật cắt trước đây','Lõi lành tăng 22%, nứt giảm giá mạnh'][i]}">${name}</button>`).join('')}</div>
     ${stone.phase==='window'?`<div class="jade-main-actions jade-stone-workbench">${stoneTool('Bán sang tay','◇',0,'jade-sell-window','gold',false,windowQuote.value)}
      ${stoneTool('Xẻ đá','⚒',jade.actionFee(stone,'cut'),'jade-cut','emerald',s.coins<jade.actionFee(stone,'cut'))}</div>`:
      `<div class="jade-main-actions jade-stone-workbench">${stoneTool('Khai song','◈',jade.actionFee(stone,'window'),'jade-window','gold',s.coins<jade.actionFee(stone,'window'))}
      ${stoneTool('Xẻ đá','⚒',jade.actionFee(stone,'cut'),'jade-cut','emerald',s.coins<jade.actionFee(stone,'cut'))}</div>`}
     <div class="jade-stone-side-actions">
      <button type="button" class="jade-stone-side-button" data-arcade-action="jade-store" title="Cất đá, chọn viên khác">▱ Cất đá</button>
      ${stone.phase==='raw'&&jade.rawSalvageValue(stone)?`<button type="button" class="jade-stone-side-button jade-salvage-button" data-arcade-action="jade-sell-raw" title="Thanh lý đá thô: thu hồi 25% giá mua, không tính lượt giao dịch" aria-label="Thanh lý đá thô, nhận ${fmt(jade.rawSalvageValue(stone))} Tiền Xanh">↩ Thanh lý <small>+${greenMark}${fmt(jade.rawSalvageValue(stone))}</small></button>`:''}
     </div>`;
  }
  const good=stone.grade>0&&stone.flaw!=='skin',quote=jade.marketQuote(stone,nowOf(s)),value=quote.value;
  return `<div class="jade-cut-summary"><span>${stone.phase==='crafted'?'✦ Đã chế tác · '+jade.CRAFTS[stone.craft].name:'✦ Đã xẻ đá'}</span><small>${good?'Cỡ '+stone.size+' · '+jade.FLAW_NAMES[stone.flaw]:'Phế thạch · Có thể thu hồi'} · Giá ${greenMark}${fmt(value)}</small></div>
    ${stone.forecast>=0?`<div class="jade-forecast-verdict ${stone.forecastWon?'is-right':'is-wrong'}">${stone.forecastWon?'✓ Đoán đúng'+(stone.forecastBonus?' · +'+greenMark+fmt(stone.forecastBonus):' · luyện tay nghề'):'◇ Dự đoán chưa đúng'}</div>`:''}
    <div class="jade-main-actions">
     ${btn('✓ Bán · +'+greenMark+fmt(value),'jade-sell','gold')}
     ${stone.phase==='crafted'?btn('✦ Đưa vào tủ','jade-exhibit','power',j.exhibits.length>=40):
      btn(good?'◈ Chế tác ngọc':'Phế thạch không thể chế tác','jade-open-workshop','power',!good)}</div>
    <div class="jade-hold-action">${btn('▱ Cất vào Kho Ngọc · Chờ giá tốt','jade-vault-store','upgrade',j.vault.length>=jade.MAX_VAULT)}
    <small>${j.vault.length}/${jade.MAX_VAULT} chỗ · Cất không mất phí, bán sau theo giá thị trường.</small></div>
`;
 }
 function stockPanel(s){
  const j=s.jade,held=j.stash.length+(j.active?1:0);
  if(!j.stash.length)return '';
  return `<div class="jade-stock-panel" aria-label="Túi đá thô của Ngọc Phường">
    <div class="jade-stock-heading"><b>◈ Túi đá thô</b><span>${held}/${jade.MAX_STONES} chỗ · ${j.stash.length} viên chờ</span></div>
    ${j.stash.length?`<div class="jade-stock-rail">${j.stash.map((stone,i)=>{
     const clue=jade.surface(stone);
     return `<button type="button" class="jade-stock-item" data-arcade-action="jade-select-${i}"
      ${j.active?'disabled':''} aria-label="Chọn mẫu ${stone.id} từ ${stone.hunt!=null?'kiện đá mù':jade.MARKETS[stone.site].short}">
      <span class="jade-stock-pebble jade-shell-${stone.site} ${shellVisual(stone.site,stone.seed)}" aria-hidden="true"></span>
      <b>#${String(stone.id).padStart(3,'0')}</b>
      <small>${stone.hunt!=null&&['raw','window'].includes(stone.phase)?'🎒 Đá mù':jade.MARKETS[stone.site].short}</small>
      <em>${stone.phase==='window'?'Đã khai song':clue.size}</em></button>`;}).join('')}</div>`:
     '<small class="jade-stock-empty">Chợ đang có các khay đá; mua trước rồi soi sau.</small>'}
   </div>`;
 }
 function marketPanel(s){
  const j=s.jade,held=j.stash.length+(j.active?1:0);
  const movers=marketRates(s).sort((a,b)=>b.rate-a.rate);
  const active=jade.unlocked(j,selectedMarket)?selectedMarket:0;
  const opened=jade.MARKETS.filter((_,i)=>jade.unlocked(j,i)).length;
  return `<div class="jade-market-grid" data-arcade-panel="jade-market">
    <div class="jade-market-intro" aria-label="Phố chợ Phỉ Thúy">
      <div class="jade-market-street" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <span>PHỈ THÚY PHỐ · ${dateText(nowOf(s))}</span>
      <strong>CHỢ ĐÁ ĐÊM</strong>
      <div class="jade-market-pulse"><span>▲ <b>${movers[0].name} +${movers[0].rate-100}%</b></span>
       <span>▼ <b>${movers[movers.length-1].name} ${trend(movers[movers.length-1].rate)}</b></span></div>
      <em>🎒 ${held}/${jade.MAX_STONES} đá trong túi</em></div>
    <nav class="jade-market-route" aria-label="Chọn khu chợ đá">
     <div class="jade-market-stop-list" aria-label="${opened}/${jade.MARKETS.length} khu đã mở. Vuốt ngang để chọn khu">
      ${jade.MARKETS.map((m,i)=>{const unlocked=jade.unlocked(j,i);
       return `<button type="button" class="jade-market-stop jade-stop-${i} ${active===i?'is-active':''} ${unlocked?'':'is-locked'}"
        ${unlocked?'data-jade-market-switch':'data-jade-market-lock'}="${i}" aria-pressed="${active===i}"
        aria-label="${m.short}${unlocked?' · '+fmt(jade.purchasePrice(j,i))+' Tiền Xanh/viên':' · chưa mở, chạm để xem điều kiện'}" title="${unlocked?m.name:m.unlock}">
        <span class="jade-market-stop-icon" aria-hidden="true">${unlocked?['◈','≋','◇','◆','✵'][i]:'🔒'}</span>
        <strong>${m.short}</strong></button>`;}).join('')}
     </div>
    </nav>
    ${jade.MARKETS.map((m,i)=>{if(i!==active)return '';
     const free=!j.bought&&i===0;
     const chosen=chosenSamples.has(i)?chosenSamples.get(i):null;
     return `<section class="jade-market-card jade-market-${i} is-open" aria-label="Sạp ${m.name}">
      <div class="jade-stall-scene" aria-label="Khay đá ${m.short}. Chạm viên để xem và lựa.">
       <span class="jade-stall-awning"></span><span class="jade-stall-lamp jade-stall-lamp-left"></span>
       <span class="jade-stall-lamp jade-stall-lamp-right"></span><span class="jade-stall-merchant"></span>
       <span class="jade-stall-counter"></span>
       ${[0,1,2].map(slot=>`<button type="button" class="jade-stall-stone jade-stall-stone-${['a','b','c'][slot]} ${shellVisual(i,jade.marketOffer(j,i,slot).stone.seed)} ${chosen===slot?'is-selected':''}"
        data-jade-preview-slot="${slot}" aria-pressed="${chosen===slot}" style="--jade-item-x:${((i+slot)%5)*25}%" aria-label="Xem phôi ${['A','B','C'][slot]} tại sạp ${m.short}"><span>${['A','B','C'][slot]}</span></button>`).join('')}
      </div>
      <div class="jade-market-top"><div class="jade-market-copy"><b>${m.name}</b>
       <small>${m.skin}</small></div><div class="jade-stall-pricing"><strong class="jade-stall-price">${greenMark}${fmt(jade.purchasePrice(j,i))}/viên</strong>
       ${jade.stallFee(j,i)?`<small>Gồm phí quầy ${greenMark}${fmt(jade.stallFee(j,i))}</small>`:''}</div></div>
      <details class="jade-market-tray ${chosen!==null?'is-focused':''}" data-market-stall="${i}" ${openStall===i?'open':''} data-selected-slot="${chosen??'all'}">
       <summary>${chosen===null?'◈ Tự lựa 3 viên':'◈ Đang xem phôi '+['A','B','C'][chosen]} <span>Quan sát · Soi · Mang về</span></summary>
       ${chosen!==null?'<div class="jade-preview-compare"><button type="button" data-jade-preview-all="1">↔ So sánh cả 3 viên</button></div>':''}
       <div class="jade-market-samples">${[0,1,2].map(slot=>{const offer=jade.marketOffer(j,i,slot);
        const inspected=j.inspected?.includes(jade.inspectionKey(j,i,slot)),fee=jade.inspectFee(i),
         hints=inspected?jade.marketScanSpots(j,slot).map(spot=>jade.scanHint(offer.stone,spot,j.lamp)):[],
         visibleHints=chosen===slot?hints:hints.slice(0,1);
        return `<div class="jade-market-sample ${inspected?'is-inspected':''} ${chosen===slot?'is-selected':''}" data-jade-sample-slot="${slot}" ${chosen===slot?'tabindex="-1"':''}>
         <div class="jade-sample-top"><b>PHÔI ${['A','B','C'][slot]}</b><em>${offer.size}</em></div>
         <button type="button" class="jade-sample-pick" data-arcade-action="jade-pick-${i}-${slot}"
          ${held>=jade.MAX_STONES||!free&&s.coins<offer.ask?'disabled':''}
          aria-label="Chọn phôi ${['A','B','C'][slot]} · ${free?'miễn phí':fmt(offer.ask)+' Tiền Xanh'} · ${offer.marks}">
          <span class="jade-sample-pebble jade-shell-${(i+slot)%5} ${shellVisual(i,offer.stone.seed)} jade-sample-type-${slot}" aria-hidden="true"><i></i></span>
          <strong>${free?'TẶNG':greenMark+fmt(offer.ask)}</strong><span>✦ CHỌN</span></button>
         <small title="${offer.marks}">${offer.marks}</small>
         <div class="jade-sample-clue">${inspected?visibleHints.map(hint=>`<span class="jade-clue-line">◉ ${hint}</span>`).join('')+
          (hints.length>visibleHints.length?`<span class="jade-clue-extra">+${hints.length-visibleHints.length} dấu · chọn phôi để xem</span>`:''):'? Bí ẩn'}</div>
         ${btn(inspected?'✓ Đã soi':'◉ Soi · '+greenMark+fmt(fee),'jade-inspect-'+i+'-'+slot,
          'upgrade',inspected||s.coins<fee)}</div>`;}).join('')}</div>
      </details>
      <div class="jade-market-bundles" aria-label="Mua nhanh đá ${m.short}">
       <small>MUA LÔ NGẪU NHIÊN</small>
       ${[1,3,5].map(q=>{const cost=(q-(free?1:0))*jade.purchasePrice(j,i);
        return btn(q+' viên · '+(cost?greenMark+fmt(cost):'Tặng'),'jade-buy-pack-'+i+'-'+q,
         'market',held+q>jade.MAX_STONES||s.coins<cost);}).join('')}</div>
      </section>`;}).join('')}
    <p class="jade-market-fairness">✧ Đèn cấp cao giảm phí quầy; cấp 3/4 soi 2/3 dấu khi chọn phôi. Soi không đảm bảo trúng.</p></div>`;
 }
 function huntPanel(s){
  const j=s.jade,held=j.stash.length+(j.active?1:0);
  return `<div class="jade-hunt-content" data-arcade-panel="jade-hunt">
   <div class="jade-hunt-hero">
    <strong>🎒 SĂN ĐÁ MÙ</strong><em>${held}/${jade.MAX_STONES} ô túi</em>
    <small>Chọn tuyến · Mở phôi tại bàn</small>
   </div>
   ${jade.HUNTS.map((hunt,i)=>{
    const unlocked=jade.huntUnlocked(j,i),price=hunt.price;
    const chances=hunt.weights.map((weight,site)=>weight?`${jade.MARKETS[site].short} ${weight}%`:null)
     .filter(Boolean).join(' · ');
    return `<article class="jade-hunt-card jade-hunt-route-${i} ${unlocked?'':'is-locked'}">
     <div class="jade-hunt-card-top"><div><small>${String(i+1).padStart(2,'0')} · ${hunt.rank}</small>
      <b>${hunt.name}</b></div><div class="jade-hunt-sack" aria-hidden="true"><span>?</span></div></div>
     <div class="jade-hunt-odds" aria-label="Xác suất nguồn đá, không phải tỷ lệ ra ngọc">${chances}</div>
     <div class="jade-hunt-footer"><small>${unlocked?'1 phôi · xẻ tính phí':hunt.unlock}</small>
      ${btn(unlocked?'Săn · '+greenMark+fmt(price):'🔒','jade-blind-'+i,'gold',
       !unlocked||held>=jade.MAX_STONES||j.bought>=1000000||s.coins<price)}</div></article>`;}).join('')}
   <p class="jade-hunt-note">✧ Tỷ lệ hiển thị là <b>nguồn đá</b>; ngọc quý không được bảo đảm.</p>
  </div>`;
 }
 function vaultPanel(s){
  const j=s.jade,time=nowOf(s),rates=marketRates(s);
  return `<div class="jade-vault-content" data-arcade-panel="jade-vault">
   <div class="jade-vault-lead"><span>▱ KHO PHỈ THÚY CÁ NHÂN</span><strong>Giữ ngọc, đợi đúng thời</strong>
    <small>${j.vault.length}/${jade.MAX_VAULT} món · Giá niêm yết đổi mỗi ngày (UTC). Không tính phí lưu kho và không tự bán.</small></div>
   <div class="jade-sheet-heading"><b>◈ Bảng giá sắc ngọc</b><small>${dateText(time)} · so với giá gốc</small></div>
   <div class="jade-trend-grid">${rates.map(item=>`<div class="jade-trend-chip ${trendClass(item.rate)}">
     <span style="--jade-color:${jade.COLOR_HEX[item.index]}">◆</span>
     <small>${item.name}</small><b>${trend(item.rate)}</b></div>`).join('')}</div>
   <div class="jade-sheet-heading"><b>▱ Hòm ngọc đã cắt</b><small>${j.vault.length} vật phẩm</small></div>
   ${j.vault.length?`<div class="jade-vault-list">${j.vault.map((stone,i)=>{
    const q=jade.marketQuote(stone,time);
    const valuable=stone.grade>0&&stone.flaw!=='skin';
    return `<article class="jade-vault-card jade-result-${gemTier(stone)} ${qualityStyle(stone)}"><span class="jade-vault-gem jade-collectible-art ${valuable?'':'is-waste'} ${stone.phase==='crafted'&&jade.CRAFTS[stone.craft]?jewelryArt(stone):gemVisual(stone)}" style="--jade-color:${jade.COLOR_HEX[stone.color]};--jade-item-x:${(valuable?(Math.max(1,stone.grade)-1)%5:stone.site)*25}%" aria-hidden="true"></span>
     <div class="jade-vault-info"><b>#${String(stone.id).padStart(3,'0')} · ${stoneName(stone)}</b>
       <small>${stone.phase==='crafted'?jade.CRAFTS[stone.craft].name+' · '+jewelryLabel(stone):'Phôi chưa chế tác'} · Cỡ ${stone.size}</small>
       ${stone.phase==='crafted'?`<small class="jade-certificate ${qualityStyle(stone)}">${qualityLabel(stone)?'✦ '+qualityLabel(stone):'◇ Chưa giám định'}</small>`:''}
       <span class="${trendClass(q.rate)}">${trend(q.rate)} · <strong>${greenMark}${fmt(q.value)}</strong></span></div>
     <div class="jade-vault-actions ${stone.phase==='crafted'&&!stone.certified?'has-appraisal':''}">${btn('Bán ngay','jade-vault-sell-'+i,'gold')}
      ${btn('Đưa ra bàn','jade-vault-select-'+i,'upgrade',!!j.active)}
      ${stone.phase==='crafted'&&!stone.certified?btn('◇ Giám định '+greenMark+fmt(jade.appraisalFee(stone)),
       'jade-appraise-'+i,'upgrade',s.coins<jade.appraisalFee(stone)):''}</div></article>`;}).join('')}</div>`:
    '<p class="jade-vault-empty">Chưa có ngọc lưu kho. Cắt viên đầu tiên rồi chọn “Cất vào Kho Ngọc” để giữ giá trị cho tương lai.</p>'}
   <p class="jade-sheet-hint">Giá cao hôm nay không chắc tiếp tục tăng ngày mai. Thị trường giả lập chỉ dùng Tiền Xanh, không liên kết giá ngọc thật.</p>
  </div>`;
 }
 function workshopPanel(s){
  const j=s.jade,stone=j.active,canCraft=stone?.phase==='cut'&&stone.grade>0&&stone.flaw!=='skin';
  const job=j.craftJob,time=Date.now(),ready=!!job&&time>=job.readyAt;
  const requests=j.commissions||{done:0,readyAt:0,rerollAt:0},order=jade.commissionFor(j);
  const matching=j.vault.find(piece=>jade.commissionMatch(piece,order));
  const orderReady=time>=requests.readyAt,rerollReady=time>=requests.rerollAt;
  const orderValue=matching?Math.min(1000000000,Math.round(jade.marketQuote(matching,time).value*order.premium)):0;
  const special=jade.specialFor(j),specialOpen=jade.specialUnlocked(j);
  const specialPiece=specialOpen?j.vault.find(piece=>jade.specialMatch(piece,special)):null;
  const specialReady=time>=(requests.specialReadyAt||0),specialReroll=time>=(requests.specialRerollAt||0);
  const specialValue=specialPiece?Math.min(1000000000,
   Math.round(jade.marketQuote(specialPiece,time).value*special.premium)):0;
  const upgrades=[['lamp','◉','Đèn giám ngọc','Soi rõ tín hiệu và bì dày'],
   ['saw','⚙','Cưa hợp kim','Tăng cơ hội giữ nguyên phôi nứt'],
   ['carver','✧','Thợ khắc bậc cao','Tăng giá thành phẩm 17%/cấp'],
   ['permit','✵','Giấy phép Tàn Tích','Mở lô thiên thạch khi đủ giao dịch']];
  return `<div class="jade-workshop-content" data-arcade-panel="jade-workshop">
    <div class="jade-sheet-heading"><b>⌘ Xưởng chế tác</b><small>${job?'1 bàn đang hoạt động':'1 bàn thợ · tính giờ thực'}</small></div>
    ${job?`<div class="jade-craft-job ${ready?'is-ready':'is-working'}" role="status">
      <span class="jade-craft-preview ${jewelryArt({craft:job.type,design:job.design,setting:job.setting})}" aria-hidden="true"></span><div><b>${ready?'Thành phẩm đã hoàn tất':'Đang làm '+jade.CRAFTS[job.type].name}</b>
      <small>${jade.DESIGNS[job.type][job.design||0]} · ${jade.SETTINGS[job.setting||0]} · ${ready?'Đã xong':`<span data-arcade-until="${job.readyAt}">${Math.ceil((job.readyAt-time)/1000)}s</span>`}</small></div>
      ${btn(ready?'✦ Nhận ngọc':'Đang chế tác','jade-claim-craft','gold',!ready||j.vault.length>=jade.MAX_VAULT)}</div>`:''}
    <div class="jade-commission" aria-label="Đơn đặt trang sức từ khách">
      <div class="jade-commission-head"><b>✉ Đơn khách</b><small>${requests.done} đã giao</small></div>
      <div class="jade-commission-detail"><span class="jade-craft-preview ${jewelryArt(order)}" aria-hidden="true"></span>
       <div><strong>${jade.CRAFTS[order.craft].name} · ${jade.DESIGNS[order.craft][order.design]}</strong>
        <small>${order.name} · ${jade.GRADES[order.minGrade]}+ · ${jade.SETTINGS[order.setting]}+ · x${order.premium.toLocaleString('vi-VN')}</small></div></div>
      <div class="jade-commission-actions">
       ${btn(!orderReady?`◷ <span data-arcade-until="${requests.readyAt}">${Math.ceil((requests.readyAt-time)/1000)}s</span>`:
        matching?'Giao · +'+greenMark+fmt(orderValue):'Chưa có món phù hợp','jade-deliver-commission','gold',!orderReady||!matching)}
       ${btn(!rerollReady&&orderReady?`Đổi · <span data-arcade-until="${requests.rerollAt}">${Math.ceil((requests.rerollAt-time)/1000)}s</span>`:'↻ Đổi đơn',
        'jade-change-commission','upgrade',!orderReady||!rerollReady)}</div>
    </div>
    <details class="jade-special-order ${specialOpen?'is-unlocked':'is-locked'}">
     <summary><span>✦ Đơn hiếm</span><b>${specialOpen?special.name:'Chưa mở'}</b>
      <small>${specialOpen?'×'+special.premium.toLocaleString('vi-VN'):'2 đơn thường'}</small></summary>
     ${specialOpen?`<div class="jade-special-detail">
       <span class="jade-craft-preview ${jewelryArt(special)}" aria-hidden="true"></span>
       <div><b>${jade.CRAFTS[special.craft].name} · ${jade.DESIGNS[special.craft][special.design]}</b>
        <small>${jade.GRADES[special.minGrade]}+ · ${jade.QUALITY_NAMES[special.minQuality]}+ · ${jade.SETTINGS[special.setting]}+${special.color===undefined?'':' · '+jade.COLORS[special.color]}</small></div></div>
       <div class="jade-special-actions">
        ${btn(!specialReady?`◷ <span data-arcade-until="${requests.specialReadyAt}">${Math.ceil((requests.specialReadyAt-time)/1000)}s</span>`:
         specialPiece?'Giao · +'+greenMark+fmt(specialValue):'Chưa đủ điều kiện',
         'jade-deliver-special','gold',!specialReady||!specialPiece)}
        ${btn(!specialReroll&&specialReady?`↻ <span data-arcade-until="${requests.specialRerollAt}">${Math.ceil((requests.specialRerollAt-time)/1000)}s</span>`:'↻ Đổi',
         'jade-change-special','upgrade',!specialReady||!specialReroll)}</div>`:
       '<small class="jade-special-lock-note">Giao 2 đơn thường hoặc bán 8 viên để mở quầy khách hiếm.</small>'}
    </details>
    <div class="jade-style-picker" role="group" aria-label="Tùy chọn trang sức">
     <div class="jade-picker-row"><small>HỌA TIẾT</small>${['Trơn','Vân','Chạm'].map((label,i)=>`<button type="button" class="jade-picker-chip ${selectedDesign===i?'is-selected':''}"
       data-jade-design="${i}" aria-pressed="${selectedDesign===i}">${label}</button>`).join('')}</div>
     <div class="jade-picker-row"><small>CHẤT LIỆU</small>${['Ngọc','Bạc','Vàng'].map((label,i)=>`<button type="button" class="jade-picker-chip ${selectedSetting===i?'is-selected':''}"
       data-jade-setting="${i}" aria-pressed="${selectedSetting===i}">${label}</button>`).join('')}</div>
    </div>
    <div class="jade-craft-list">${Object.entries(jade.CRAFTS).map(([id,item])=>{
     const fee=stone?jade.craftFee(stone,id,selectedDesign,selectedSetting):0;
     const seconds=stone?Math.ceil(jade.craftDuration(stone,id,j.carver,selectedDesign,selectedSetting)/1000):
      Math.ceil((jade.CRAFT_TIMES[id]+selectedDesign*20000+selectedSetting*15000)/1000);
     const allowed=canCraft&&stone.size>=item.min&&
      !(id==='bangle'&&stone.flaw==='fracture'&&!stone.savedFracture);
     return `<div class="jade-craft-card"><span class="jade-craft-preview ${jewelryArt({craft:id,design:selectedDesign,setting:selectedSetting})}" aria-hidden="true"></span>
      <div><b>${item.name} · ${jade.DESIGNS[id][selectedDesign]}</b><small>Cỡ ${item.min}+ · ${Math.floor(seconds/60)}p${seconds%60?String(seconds%60).padStart(2,'0')+'s':''}</small></div>
      ${btn('⚒ '+greenMark+fmt(fee),'jade-craft-'+id+'-'+selectedDesign+'-'+selectedSetting,'upgrade',!allowed||s.coins<fee||!!job||j.vault.length>=jade.MAX_VAULT)}</div>`;}).join('')}</div>
    <div class="jade-sheet-heading"><b>⚒ Nâng cấp xưởng</b><small>Đầu tư bằng Tiền Xanh</small></div>
    ${upgrades.map(([id,icon,title,desc])=>{const cost=jade.upgradeCost(j,id);
     return `<div class="jade-tool-card"><span>${icon}</span><div><b>${title}</b><small>${desc} · ${id==='permit'?(j.permit?'Đã có':'Giấy phép'): 'Cấp '+j[id]+'/4'}</small></div>
      ${btn(cost===null?'Tối đa':greenMark+fmt(cost),'jade-upgrade-'+id,'upgrade',cost===null||s.coins<cost||id==='permit'&&j.sold<25)}</div>`;}).join('')}
    <p class="jade-sheet-hint">Một bàn thợ · Chế tác vẫn chạy khi sang game khác.</p></div>`;
 }
 function galleryPanel(s){
  const j=s.jade,found=Object.keys(j.album).length,forecasts=j.forecasts||{correct:0,total:0,best:0};
  const held=new Set([j.active,...j.vault,...j.exhibits].filter(stone=>stone&&stone.grade>0&&stone.flaw!=='skin')
   .map(stone=>stone.grade+'-'+stone.color));
  const latest=j.lastDiscoveryKey?.split('-').map(Number),newest=latest?.length===2&&j.album[j.lastDiscoveryKey];
  const recentNew=newest&&Date.now()-j.lastDiscoveryAt<10*60*1000;
  const exhibits=j.exhibits.map((item,i)=>`<div class="jade-exhibit ${qualityStyle(item)}"><span class="jade-collectible-art ${jewelryArt(item)}" style="--jade-color:${jade.COLOR_HEX[item.color]};--jade-item-x:${((Math.max(1,item.grade)-1)%5)*25}%" aria-hidden="true"></span>
   <div><b>${jade.GRADES[item.grade]} · ${jade.COLORS[item.color]}</b>
   <small>${jade.CRAFTS[item.craft].name} · ${jewelryLabel(item)} · #${i+1}</small>
   ${qualityLabel(item)?`<small class="jade-certificate ${qualityStyle(item)}">✦ ${qualityLabel(item)}</small>`:''}</div></div>`).join('');
  return `<div class="jade-gallery-content" data-arcade-panel="jade-gallery">
    <div class="jade-gallery-banner"><span>✦ SỔ PHỈ THÚY</span><strong>${found}/56</strong>
      <small>Đã mở = từng tìm thấy · Đang giữ = còn trong kho/tủ</small></div>
    <div class="jade-forecast-record"><span>◈ Tay nghề soi đá</span><b>${forecasts.correct}/${forecasts.total}</b><small>Chuỗi tốt nhất ×${forecasts.best}</small></div>
    ${newest?`<div class="jade-discovery-highlight"><b>${recentNew?'✦ MỚI MỞ':'✧ PHÁT HIỆN GẦN NHẤT'}</b><strong>${jade.GRADES[latest[0]]} · ${jade.COLORS[latest[1]]}</strong><small>${held.has(j.lastDiscoveryKey)?'✓ Đang giữ trong bộ sưu tập':'Đã ghi sổ · hiện không còn giữ viên này'}</small></div>`:''}
    ${Array.from({length:7},(_,index)=>index+1).map(grade=>`<div class="jade-album-row"><b>${jade.GRADES[grade]}</b>
      <div class="jade-album-gems">${jade.COLORS.map((name,color)=>{
       const key=grade+'-'+color,count=j.album[key]||0,owned=held.has(key),isNew=recentNew&&key===j.lastDiscoveryKey;
       return `<div class="jade-album-slot ${count?'is-found':''} ${owned?'is-owned':''} ${isNew?'is-new':''} jade-tier-${grade>=7?'legendary':grade>=5||color>=6?'precious':'common'} jade-grade-${grade} jade-item-shade-${color}" title="${name}${count?' · Đã mở ×'+count:' · Chưa mở'}${owned?' · Đang giữ':''}${isNew?' · Mới mở':''}"
        style="--jade-color:${jade.COLOR_HEX[color]};--jade-item-x:${((grade-1)%5)*25}%" aria-label="${jade.GRADES[grade]}, ${name}, ${count?'đã mở '+count+' lần':'chưa mở'}${owned?', đang giữ':''}${isNew?', mới mở':''}">${count?`<span class="jade-collectible-art ${gemVisual({grade,color,flaw:'perfect'})}" aria-hidden="true"></span>`:'◇'}</div>`;}).join('')}</div></div>`).join('')}
    <div class="jade-sheet-heading"><b>✦ Tủ Triển Lãm Cá Nhân</b><small>${j.exhibits.length}/40 tác phẩm</small></div>
    ${exhibits||'<p class="jade-sheet-hint">Chế tác rồi chọn “Đưa vào tủ” để lưu tác phẩm hiếm. Trưng bày không nhận Tiền Xanh bán.</p>'}</div>`;
 }
 function panel(s,cutPulse){
  const j=s.jade||jade.fresh(),stone=j.active,found=Object.keys(j.album).length;
  if((stone?.id||0)!==activeStoneId){activeStoneId=stone?.id||0;selectedPoint=-1;}
  const job=j.craftJob,jobReady=!!job&&Date.now()>=job.readyAt;
  return `<section class="arcade-world arcade-world-jade" aria-label="Ngọc Phường">
   <header class="arcade-world-heading"><div><span class="arcade-eyebrow">04 / JADE APPRAISAL</span>
     <h3>Ngọc Phường</h3></div></header>
   ${stoneScene(stone,j,cutPulse,nowOf(s))}
   ${job?`<button type="button" class="jade-work-order ${jobReady?'is-ready':''}" data-arcade-action="jade-open-workshop">
     <span aria-hidden="true">${jobReady?'✦':'⚒'}</span><strong>${jobReady?'Ngọc đã hoàn thành':'Thợ đang chế tác '+jade.CRAFTS[job.type].name}</strong>
     <small>${jobReady?'Vào Xưởng để nhận':`<span data-arcade-until="${job.readyAt}">${Math.ceil((job.readyAt-Date.now())/1000)}s</span> · vẫn tính giờ khi chơi game khác`}</small></button>`:''}
   <div class="arcade-control-panel jade-control-panel">
    ${activePanel(s)}
    ${stockPanel(s)}
    <div class="jade-accounting"><div><small>ĐÃ GIAO DỊCH</small><b>${j.sold}</b></div>
      <div><small>ĐÃ KHÁM PHÁ</small><b>${found}<em>/56</em></b></div>
      <div><small>LỢI NHUẬN RÒNG</small><b>${fmt(j.received-j.invested)}<em> ${greenMark}</em></b></div></div>
    <div class="arcade-quick-drawers arcade-quick-drawers-quad jade-quick-drawers">
     ${sheet('Chợ đá','◈','jade-market')}${sheet('Kho ngọc','▱','jade-vault')}
     ${sheet('Xưởng','⚒','jade-workshop')}${sheet('Sổ ngọc','✧','jade-gallery')}</div>
    <button type="button" class="jade-hunt-trigger" data-arcade-drawer="jade-hunt">
     <span class="jade-hunt-trigger-icon" aria-hidden="true">🎒</span><span><b>Săn đá mù</b></span><strong>›</strong></button>
    ${marketPanel(s)}${huntPanel(s)}${vaultPanel(s)}${workshopPanel(s)}${galleryPanel(s)}
   </div>
  </section>`;
 }
 root.DuduPersonalJadeUIV1=Object.freeze({panel,rememberTray,chooseMarketSample,chooseMarket,
  chooseDesign,chooseSetting,chooseClue,closeClue});
})(typeof window!=='undefined'?window:{});
