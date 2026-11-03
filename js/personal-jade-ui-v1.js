/* Ngọc Phường: tactile fourth Arcade stage, shared Arcade coins and modal sheets. */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1,jade=core?.JADE;
 if(!jade)return;
 const fmt=core.formatXu;
 const greenMark='<i class="dudu-money-icon dudu-money-icon--green" aria-hidden="true"></i>';
 const btn=(label,action,kind='primary',disabled=false)=>`<button type="button" class="arcade-button ${kind}" data-arcade-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
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
 let openStall=null,selectedMarket=0;
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
 function stoneScene(stone,j,phasePulse){
  const phase=stone?.phase||'none',color=stone?jade.COLOR_HEX[stone.color]:'#8bc4a7',
   scanned=stone?stone.scans.filter(Boolean).length:0,
   carved=phase==='crafted',cut=phase==='cut'||carved,
   revealed=cut&&stone?.grade>0&&stone.flaw!=='skin',
   visual=cut?(revealed?'gem':'waste'):phase==='window'?'window':'rough',
   artworkIndex=stone?.site??0,tier=gemTier(stone);
  return `<div class="arcade-stage jade-stage jade-site-${stone?.site??0} jade-phase-${phase} ${cut?'jade-result-'+tier:''} ${phasePulse?'is-'+phasePulse.type+'-reveal':''}"
    style="--jade-color:${color}" aria-label="Bàn soi đá Ngọc Phường">
    <div class="jade-hall-lattice jade-lattice-left"></div><div class="jade-hall-lattice jade-lattice-right"></div>
    <div class="jade-lantern jade-lantern-left"><i></i></div><div class="jade-lantern jade-lantern-right"><i></i></div>
    <div class="jade-hall-seal">玉</div><div class="jade-table-back"></div>
    <div class="jade-table-top"></div><div class="jade-table-front"></div>
    ${stone?`<div class="jade-specimen ${cut?'jade-revealed':''} ${carved?'jade-crafted':''} jade-craft-${stone.craft||'raw'}"
        aria-label="${cut?stoneName(stone):'Đá thô chưa cắt'}">
       <span class="jade-rock-face"></span><span class="jade-rock-grain"></span><span class="jade-rock-vein"></span>
       <span class="jade-item-art jade-item-${visual} ${cut?(carved?gemVisual(stone):splitVisual(stone)):shellVisual(stone.site,stone.seed)}" style="--jade-item-x:${artworkIndex*25}%;--jade-gem-tone:${color}" aria-hidden="true"></span>${cut&&revealed?'<span class="jade-reveal-rays" aria-hidden="true"></span>':''}
       ${phase==='window'?'<span class="jade-polished-window"></span>':''}
       ${cut?`<span class="jade-gem-inner"></span><span class="jade-gem-shine"></span>`:''}
      </div>`:`<div class="jade-showcase-rough" aria-hidden="true"><i></i><i></i><i></i></div>`}
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
     ${btn(j.bought===0?'Nhận phôi':'Đến chợ',j.bought===0?'jade-buy-0':'jade-open-market','gold')}</div>
    ${j.vault.length?`<div class="jade-compact-extra">${btn('▱ Kho · '+j.vault.length,'jade-open-vault','upgrade')}</div>`:''}
    ${canRescue?`<div class="jade-recovery jade-recovery-inline">
      <small>◷ Đá cứu vốn</small>
      ${btn(rescueLeft?rescueTime+' phút':'Nhận miễn phí','jade-rescue','upgrade',rescueLeft>0)}</div>`:''}</div>`;
  if(['raw','window'].includes(stone.phase)){
   const windowQuote=jade.marketQuote(stone,nowOf(s));
   return `<details class="jade-scan-drawer" ${stone.scans.some(Boolean)&&stone.scans.some(v=>!v)?'open':''}>
       <summary>◉ Soi dấu hiệu <small>${stone.scans.filter(Boolean).length}/3 · Tùy chọn</small></summary>
       <div class="jade-scan-options">${[0,1,2].map(i=>`<button type="button" class="jade-scan-choice" data-arcade-action="jade-scan-${i}" ${stone.scans[i]?'disabled':''}>
         <span>${['Thủy đầu','Mãng đới','Liệt văn'][i]}</span>
         <small>${stone.scans[i]?jade.scanHint(stone,i,j.lamp):'Chạm để soi'}</small></button>`).join('')}</div>
      </details>
     ${stone.phase==='window'?`<div class="jade-trader-offer"><span>GIÁ THU MUA HÔM NAY</span><strong>${fmt(windowQuote.value)} <small>${greenMark}</small></strong>
      <small class="${trendClass(windowQuote.rate)}">${trend(windowQuote.rate)} · Giá thay đổi theo thị trường sắc ngọc. Có thể cất chờ.</small></div>
      <div class="jade-main-actions">${btn('✓ Bán sang tay','jade-sell-window','gold')}
      ${btn(jade.actionFee(stone,'cut')?'⚔ Xẻ đôi · '+greenMark+fmt(jade.actionFee(stone,'cut')):'⚔ Xẻ đôi · Miễn phí','jade-cut','power',s.coins<jade.actionFee(stone,'cut'))}</div>`:
      `<div class="jade-main-actions">${btn(jade.actionFee(stone,'window')?'◈ Khai song · '+greenMark+fmt(jade.actionFee(stone,'window')):'◈ Khai song · Miễn phí','jade-window','gold',s.coins<jade.actionFee(stone,'window'))}
      ${btn(jade.actionFee(stone,'cut')?'⚔ Xẻ đôi · '+greenMark+fmt(jade.actionFee(stone,'cut')):'⚔ Xẻ đôi · Miễn phí','jade-cut','power',s.coins<jade.actionFee(stone,'cut'))}</div>`}

     ${btn('↩ Cất đá · Đổi viên khác','jade-store','upgrade')}
     ${stone.phase==='raw'&&jade.rawSalvageValue(stone)?`<div class="jade-recovery jade-recovery-compact">
      <small>Thiếu tiền cắt? Trả lại đá nguyên vỏ, thu hồi 25% giá mua; không tính lượt giao dịch.</small>
      ${btn('↩ Thanh lý đá thô · +'+greenMark+fmt(jade.rawSalvageValue(stone)),'jade-sell-raw','upgrade')}
     </div>`:''}`;
  }
  const good=stone.grade>0&&stone.flaw!=='skin',quote=jade.marketQuote(stone,nowOf(s)),value=quote.value;
  return `<div class="jade-cut-summary"><span>${stone.phase==='crafted'?'✦ Đã chế tác · '+jade.CRAFTS[stone.craft].name:'✦ Đã xẻ đá'}</span><small>${good?'Cỡ '+stone.size+' · '+jade.FLAW_NAMES[stone.flaw]:'Phế thạch · Có thể thu hồi'} · Giá ${greenMark}${fmt(value)}</small></div>
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
    return `<article class="jade-vault-card jade-result-${gemTier(stone)}"><span class="jade-vault-gem jade-collectible-art ${valuable?'':'is-waste'} ${gemVisual(stone)}" style="--jade-color:${jade.COLOR_HEX[stone.color]};--jade-item-x:${(valuable?(Math.max(1,stone.grade)-1)%5:stone.site)*25}%" aria-hidden="true"></span>
     <div class="jade-vault-info"><b>#${String(stone.id).padStart(3,'0')} · ${stoneName(stone)}</b>
       <small>${stone.phase==='crafted'?jade.CRAFTS[stone.craft].name:'Phôi chưa chế tác'} · Cỡ ${stone.size}</small>
       <span class="${trendClass(q.rate)}">${trend(q.rate)} · <strong>${greenMark}${fmt(q.value)}</strong></span></div>
     <div class="jade-vault-actions">${btn('Bán ngay','jade-vault-sell-'+i,'gold')}
      ${btn('Đưa ra bàn','jade-vault-select-'+i,'upgrade',!!j.active)}</div></article>`;}).join('')}</div>`:
    '<p class="jade-vault-empty">Chưa có ngọc lưu kho. Cắt viên đầu tiên rồi chọn “Cất vào Kho Ngọc” để giữ giá trị cho tương lai.</p>'}
   <p class="jade-sheet-hint">Giá cao hôm nay không chắc tiếp tục tăng ngày mai. Thị trường giả lập chỉ dùng Tiền Xanh, không liên kết giá ngọc thật.</p>
  </div>`;
 }
 function workshopPanel(s){
  const j=s.jade,stone=j.active,canCraft=stone?.phase==='cut'&&stone.grade>0&&stone.flaw!=='skin';
  const job=j.craftJob,time=Date.now(),ready=!!job&&time>=job.readyAt;
  const upgrades=[['lamp','◉','Đèn giám ngọc','Soi rõ tín hiệu và bì dày'],
   ['saw','⚙','Cưa hợp kim','Tăng cơ hội giữ nguyên phôi nứt'],
   ['carver','✧','Thợ khắc bậc cao','Tăng giá thành phẩm 17%/cấp'],
   ['permit','✵','Giấy phép Tàn Tích','Mở lô thiên thạch khi đủ giao dịch']];
  return `<div class="jade-workshop-content" data-arcade-panel="jade-workshop">
    <div class="jade-sheet-heading"><b>⌘ Xưởng chế tác</b><small>${job?'1 bàn đang hoạt động':'1 bàn thợ · tính giờ thực'}</small></div>
    ${job?`<div class="jade-craft-job ${ready?'is-ready':'is-working'}" role="status">
      <span aria-hidden="true">${ready?'✦':'⚒'}</span><div><b>${ready?'Thành phẩm đã hoàn tất':'Đang làm '+jade.CRAFTS[job.type].name}</b>
      <small>${jade.GRADES[job.stone.grade]} · ${jade.COLORS[job.stone.color]} · ${ready?'Sẵn sàng vào Kho Ngọc':`Còn <span data-arcade-until="${job.readyAt}">${Math.ceil((job.readyAt-time)/1000)}s</span> · chơi game khác vẫn tính giờ`}</small></div>
      ${btn(ready?'✦ Nhận ngọc':'Đang chế tác','jade-claim-craft','gold',!ready||j.vault.length>=jade.MAX_VAULT)}</div>`:''}
    <div class="jade-craft-list">${Object.entries(jade.CRAFTS).map(([id,item])=>{
     const fee=stone?jade.craftFee(stone,id):0;
     const seconds=stone?Math.ceil(jade.craftDuration(stone,id,j.carver)/1000):Math.ceil(jade.CRAFT_TIMES[id]/1000);
     const allowed=canCraft&&stone.size>=item.min&&
      !(id==='bangle'&&stone.flaw==='fracture'&&!stone.savedFracture);
     return `<div class="jade-craft-card"><span>${{bangle:'◯',pendant:'◇',ring:'◈',beads:'❈'}[id]}</span>
      <div><b>${item.name}</b><small>Phôi cỡ ${item.min}+ · ${Math.floor(seconds/60)}p${seconds%60?String(seconds%60).padStart(2,'0')+'s':''} · x${item.mult.toLocaleString('vi-VN')} giá trị</small></div>
      ${btn('⚒ '+greenMark+fmt(fee),'jade-craft-'+id,'upgrade',!allowed||s.coins<fee||!!job||j.vault.length>=jade.MAX_VAULT)}</div>`;}).join('')}</div>
    <div class="jade-sheet-heading"><b>⚒ Nâng cấp xưởng</b><small>Đầu tư bằng Tiền Xanh</small></div>
    ${upgrades.map(([id,icon,title,desc])=>{const cost=jade.upgradeCost(j,id);
     return `<div class="jade-tool-card"><span>${icon}</span><div><b>${title}</b><small>${desc} · ${id==='permit'?(j.permit?'Đã có':'Giấy phép'): 'Cấp '+j[id]+'/4'}</small></div>
      ${btn(cost===null?'Tối đa':greenMark+fmt(cost),'jade-upgrade-'+id,'upgrade',cost===null||s.coins<cost||id==='permit'&&j.sold<25)}</div>`;}).join('')}
    <p class="jade-sheet-hint">Gửi phôi xong, cứ sang Net, Đào đá hoặc Câu cá. Quay lại nhận ngọc sau khi thợ hoàn tất; mỗi lần một phôi.</p></div>`;
 }
 function galleryPanel(s){
  const j=s.jade,found=Object.keys(j.album).length;
  const held=new Set([j.active,...j.vault,...j.exhibits].filter(stone=>stone&&stone.grade>0&&stone.flaw!=='skin')
   .map(stone=>stone.grade+'-'+stone.color));
  const latest=j.lastDiscoveryKey?.split('-').map(Number),newest=latest?.length===2&&j.album[j.lastDiscoveryKey];
  const recentNew=newest&&Date.now()-j.lastDiscoveryAt<10*60*1000;
  const exhibits=j.exhibits.map((item,i)=>`<div class="jade-exhibit"><span class="jade-collectible-art ${gemVisual(item)}" style="--jade-color:${jade.COLOR_HEX[item.color]};--jade-item-x:${((Math.max(1,item.grade)-1)%5)*25}%" aria-hidden="true"></span>
   <div><b>${jade.GRADES[item.grade]} · ${jade.COLORS[item.color]}</b>
   <small>${jade.CRAFTS[item.craft].name} · Cỡ ${item.size} · #${i+1}</small></div></div>`).join('');
  return `<div class="jade-gallery-content" data-arcade-panel="jade-gallery">
    <div class="jade-gallery-banner"><span>✦ SỔ PHỈ THÚY</span><strong>${found}/56</strong>
      <small>Đã mở = từng tìm thấy · Đang giữ = còn trong kho/tủ</small></div>
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
  const job=j.craftJob,jobReady=!!job&&Date.now()>=job.readyAt;
  return `<section class="arcade-world arcade-world-jade" aria-label="Ngọc Phường">
   <header class="arcade-world-heading"><div><span class="arcade-eyebrow">04 / JADE APPRAISAL</span>
     <h3>Ngọc Phường</h3></div></header>
   ${stoneScene(stone,j,cutPulse)}
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
 root.DuduPersonalJadeUIV1=Object.freeze({panel,rememberTray,chooseMarketSample,chooseMarket});
})(typeof window!=='undefined'?window:{});
