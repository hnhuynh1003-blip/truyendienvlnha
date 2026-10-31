/* Ngọc Phường: tactile fourth Arcade stage, shared Arcade coins and modal sheets. */
(function(root){
 'use strict';
 const core=root.DuduPersonalArcadeCoreV1,jade=core?.JADE;
 if(!jade)return;
 const fmt=core.formatXu;
 const btn=(label,action,kind='primary',disabled=false)=>`<button type="button" class="arcade-button ${kind}" data-arcade-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
 const sheet=(label,icon,id)=>`<button type="button" class="arcade-drawer-trigger" data-arcade-drawer="${id}"><span aria-hidden="true">${icon}</span>${label}</button>`;
 const stoneName=stone=>stone.grade?jade.GRADES[stone.grade]+' · '+jade.COLORS[stone.color]:'Phế thạch';
 const trend=rate=>rate>100?'↗ +'+(rate-100)+'%':rate<100?'↘ −'+(100-rate)+'%':'→ 0%';
 const trendClass=rate=>rate>100?'is-up':rate<100?'is-down':'is-flat';
 const dateText=time=>new Date(time||Date.now()).toLocaleDateString('vi-VN',{timeZone:'UTC',day:'2-digit',month:'2-digit'});
 const nowOf=s=>s.lastAt||Date.now();
 const marketRates=s=>jade.COLORS.map((name,i)=>({name,index:i,rate:jade.marketRate(i,nowOf(s))}));
 let openStall=null;
 function rememberTray(index,opened){
  if(!Number.isSafeInteger(index)||index<0||index>=jade.MARKETS.length)return;
  if(opened)openStall=index;
  else if(openStall===index)openStall=null;
 }
 function stoneScene(stone,j){
  const phase=stone?.phase||'none',color=stone?jade.COLOR_HEX[stone.color]:'#8bc4a7',
   scanned=stone?stone.scans.filter(Boolean).length:0,
   carved=phase==='crafted',cut=phase==='cut'||carved;
  return `<div class="arcade-stage jade-stage jade-site-${stone?.site??0} jade-phase-${phase}"
    style="--jade-color:${color}" aria-label="Bàn soi đá Ngọc Phường">
    <div class="jade-hall-lattice jade-lattice-left"></div><div class="jade-hall-lattice jade-lattice-right"></div>
    <div class="jade-lantern jade-lantern-left"><i></i></div><div class="jade-lantern jade-lantern-right"><i></i></div>
    <div class="jade-hall-seal">玉</div><div class="jade-table-back"></div>
    <div class="jade-table-top"></div><div class="jade-table-front"></div>
    ${stone?`<div class="jade-specimen ${cut?'jade-revealed':''} ${carved?'jade-crafted':''} jade-craft-${stone.craft||'raw'}"
        aria-label="${cut?stoneName(stone):'Đá thô chưa cắt'}">
       <span class="jade-rock-face"></span><span class="jade-rock-grain"></span><span class="jade-rock-vein"></span>
       ${phase==='window'?'<span class="jade-polished-window"></span>':''}
       ${cut?`<span class="jade-gem-inner"></span><span class="jade-gem-shine"></span>`:''}
       ${!cut?[0,1,2].map(i=>`<button type="button" class="jade-scan-target jade-scan-${i} ${stone.scans[i]?'is-scanned':''}"
           data-arcade-action="jade-scan-${i}" ${stone.scans[i]?'disabled':''}
           aria-label="Soi điểm ${i+1}: ${['Độ xuyên sáng','Mãng đới và tùng hoa','Liệt văn và tạp chất'][i]}">
           ${stone.scans[i]?'✓':i+1}</button>`).join(''):''}
      </div>`:`<div class="jade-showcase-rough" aria-hidden="true"><i></i><i></i><i></i></div>`}
    <div class="jade-stage-base">${stone?'MẪU #'+String(stone.id).padStart(3,'0')+' · '+jade.MARKETS[stone.site].short.toUpperCase():
     'CHỜ CHỦ NHÂN CHỌN ĐÁ THÔ'}
      ${stone&&!cut?`<b>${scanned}/3 ĐIỂM ĐÃ SOI</b>`:stone&&cut?'<b>✦ ĐÃ LỘ NGỌC</b>':''}</div>
  </div>`;
 }
 function activePanel(s){
  const j=s.jade,stone=j.active;
  const rescueLeft=Math.max(0,j.rescueReadyAt-(s.lastAt||Date.now()));
  const rescueTime=Math.ceil(rescueLeft/60000);
  const canRescue=j.bought>0&&s.coins<jade.MARKETS[0].price;
  if(!stone&&j.stash.length)return `<div class="jade-welcome jade-welcome-stock">
    <span>✦ ĐÃ VỀ XƯỞNG</span><strong>${j.stash.length} viên đá đang chờ.</strong>
    <p>Chọn bất kỳ mẫu nào trong túi dưới đây để soi, khai song hoặc xẻ. Không cần quay lại chợ sau mỗi lần bán.</p>
    ${btn('◈ Đưa mẫu #'+j.stash[0].id+' lên bàn','jade-select-0','gold')}
    ${btn('＋ Mua thêm đá ở chợ','jade-open-market','upgrade',j.stash.length>=jade.MAX_STONES)}
    ${j.vault.length?btn('▱ Xem '+j.vault.length+' món ngọc đã cất','jade-open-vault','upgrade'):''}</div>`;
  if(!stone)return `<div class="jade-welcome">
    <span>✧ PHƯỜNG NGỌC ĐÃ MỞ CỬA</span><strong>Mỗi viên đá ẩn một câu chuyện.</strong>
    <p>Đi chợ lựa đá hoặc lấy mẫu thử, mang về túi rồi chọn viên để soi, khai song hay xẻ. Ngọc đẹp có thể bán, chế tác hoặc trưng bày.</p>
    ${btn(j.bought===0?'✦ Nhận đá thử miễn phí':'✦ Chọn lô đá mới',j.bought===0?'jade-buy-0':'jade-open-market','gold')}
    ${j.bought===0?btn('◈ Đi chợ chọn đá','jade-open-market','upgrade'):''}
    ${j.vault.length?btn('▱ Kho đang giữ '+j.vault.length+' món ngọc','jade-open-vault','upgrade'):''}
    ${canRescue?`<div class="jade-recovery">
      <small>Xu Arcade dưới 5 · Xưởng ngọc có đá tập cứu vốn, soi và xẻ không tốn phí.</small>
      ${btn(rescueLeft?'◷ Đá cứu vốn · '+rescueTime+' phút':'✦ Nhận đá cứu vốn · Miễn phí',
       'jade-rescue','upgrade',rescueLeft>0)}</div>`:''}</div>`;
  if(['raw','window'].includes(stone.phase)){
   const windowQuote=jade.marketQuote(stone,nowOf(s));
   return `<div class="jade-readout"><div class="jade-readout-head"><b>◈ Bàn giám ngọc</b><span>${stone.scans.filter(Boolean).length}/3 DẤU HIỆU</span></div>
     <div class="jade-clue-list">${[0,1,2].map((i)=>`<div class="jade-clue ${stone.scans[i]?'is-read':''}">
       <span>${['◉','❧','⌁'][i]}</span><div><b>${['Thủy đầu','Mãng đới / Tùng hoa','Liệt văn'][i]}</b>
       <small>${stone.scans[i]?jade.scanHint(stone,i,j.lamp):'Chạm điểm '+(i+1)+' trên thân đá để soi'}</small></div></div>`).join('')}</div></div>
     ${stone.phase==='window'?`<div class="jade-trader-offer"><span>GIÁ THU MUA HÔM NAY</span><strong>${fmt(windowQuote.value)} <small>Xu</small></strong>
      <small class="${trendClass(windowQuote.rate)}">${trend(windowQuote.rate)} · Giá thay đổi theo thị trường sắc ngọc. Có thể cất chờ.</small></div>
      <div class="jade-main-actions">${btn('✓ Bán sang tay','jade-sell-window','gold')}
      ${btn(jade.actionFee(stone,'cut')?'⚔ Xẻ đôi · '+fmt(jade.actionFee(stone,'cut'))+' Xu':'⚔ Xẻ đôi · Miễn phí','jade-cut','power',s.coins<jade.actionFee(stone,'cut'))}</div>`:
      `<div class="jade-main-actions">${btn(jade.actionFee(stone,'window')?'◈ Khai song · '+fmt(jade.actionFee(stone,'window'))+' Xu':'◈ Khai song · Miễn phí','jade-window','gold',s.coins<jade.actionFee(stone,'window'))}
      ${btn(jade.actionFee(stone,'cut')?'⚔ Xẻ đôi · '+fmt(jade.actionFee(stone,'cut'))+' Xu':'⚔ Xẻ đôi · Miễn phí','jade-cut','power',s.coins<jade.actionFee(stone,'cut'))}</div>`}
     <p class="jade-decision-note">${stone.phase==='window'?'Giá chào mua không đảm bảo phản ánh toàn bộ ruột đá.':
      'Khai song giúp nhận báo giá; xẻ đôi lộ toàn bộ phẩm chất nhưng không thể quay lại.'}</p>
     ${btn('↩ Cất đá · Đổi viên khác','jade-store','upgrade')}
     ${stone.phase==='raw'&&jade.rawSalvageValue(stone)?`<div class="jade-recovery jade-recovery-compact">
      <small>Thiếu tiền cắt? Trả lại đá nguyên vỏ, thu hồi 25% giá mua; không tính lượt giao dịch.</small>
      ${btn('↩ Thanh lý đá thô · +'+fmt(jade.rawSalvageValue(stone))+' Xu','jade-sell-raw','upgrade')}
     </div>`:''}`;
  }
  const good=stone.grade>0&&stone.flaw!=='skin',quote=jade.marketQuote(stone,nowOf(s)),value=quote.value;
  return `<div class="jade-reveal"><span>${stone.phase==='crafted'?'✦ TÁC PHẨM HOÀN THÀNH':'✦ KẾT QUẢ XẺ ĐÁ'}</span>
    <strong>${good?stoneName(stone):stone.flaw==='skin'?'Kháo Bì · Vỏ giả':'Phế thạch'}</strong>
    <small>${good?'Kích cỡ '+stone.size+' · '+jade.FLAW_NAMES[stone.flaw]+
     (stone.savedFracture?' · Cưa đã giữ được phôi':''):'Chỉ còn giá trị thu hồi'}
     ${stone.phase==='crafted'?' · '+jade.CRAFTS[stone.craft].name:''}</small>
    <div class="jade-reveal-price">GIÁ THU MUA ${dateText(nowOf(s))} <b>${fmt(value)} Xu</b></div>
    <div class="jade-quote-trend ${trendClass(quote.rate)}">${trend(quote.rate)} so với giá gốc ${fmt(quote.base)} Xu · ${jade.COLORS[stone.color]}</div></div>
    <div class="jade-main-actions">
     ${btn('✓ Bán · +'+fmt(value)+' Xu','jade-sell','gold')}
     ${stone.phase==='crafted'?btn('✦ Đưa vào tủ','jade-exhibit','power',j.exhibits.length>=40):
      btn(good?'◈ Chế tác ngọc':'Phế thạch không thể chế tác','jade-open-workshop','power',!good)}</div>
    <div class="jade-hold-action">${btn('▱ Cất vào Kho Ngọc · Chờ giá tốt','jade-vault-store','upgrade',j.vault.length>=jade.MAX_VAULT)}
    <small>${j.vault.length}/${jade.MAX_VAULT} chỗ · Cất không mất phí, bán sau theo giá thị trường.</small></div>
    <p class="jade-decision-note">${stone.phase==='crafted'?'Có thể giữ nguyên tác phẩm trong kho, trưng bày hoặc bán khi giá lên.':
     'Có thể cất phôi, chờ giá tăng hoặc mang ra chế tác sau. Không bắt buộc bán ngay.'}</p>`;
 }
 function stockPanel(s){
  const j=s.jade,held=j.stash.length+(j.active?1:0);
  if(!j.stash.length)return '';
  return `<div class="jade-stock-panel" aria-label="Túi đá thô của Ngọc Phường">
    <div class="jade-stock-heading"><b>◈ Túi đá thô</b><span>${held}/${jade.MAX_STONES} chỗ · ${j.stash.length} viên chờ</span></div>
    ${j.stash.length?`<div class="jade-stock-rail">${j.stash.map((stone,i)=>{
     const clue=jade.surface(stone);
     return `<button type="button" class="jade-stock-item" data-arcade-action="jade-select-${i}"
      ${j.active?'disabled':''} aria-label="Chọn mẫu ${stone.id} từ ${jade.MARKETS[stone.site].short}">
      <span class="jade-stock-pebble jade-shell-${stone.site}" aria-hidden="true">◈</span>
      <b>#${String(stone.id).padStart(3,'0')}</b>
      <small>${jade.MARKETS[stone.site].short}</small>
      <em>${stone.phase==='window'?'Đã khai song':clue.size}</em></button>`;}).join('')}</div>`:
     '<small class="jade-stock-empty">Chợ đang có các khay đá; mua trước rồi soi sau.</small>'}
    ${j.active?'<small class="jade-stock-help">Cất viên đang soi nếu muốn đổi mẫu. Không mất phí.</small>':
     '<small class="jade-stock-help">Chạm một viên bất kỳ để đưa lên bàn soi.</small>'}
   </div>`;
 }
 function marketPanel(s){
  const j=s.jade,held=j.stash.length+(j.active?1:0);
  const movers=marketRates(s).sort((a,b)=>b.rate-a.rate);
  return `<div class="jade-market-grid" data-arcade-panel="jade-market">
    <div class="jade-market-intro"><span>PHƯỜNG PHỈ THÚY · ${dateText(nowOf(s))}</span><strong>✦ Chợ cược thạch</strong>
      <small>Quan sát lớp bì, so giá chào, thử đèn để lấy manh mối rồi chọn hàng. Kết quả trong ruột đá luôn là bí mật.</small>
      <div class="jade-market-pulse"><span>▲ Sắc đang lên <b>${movers[0].name} +${movers[0].rate-100}%</b></span>
      <span>▼ Sắc đang xuống <b>${movers[movers.length-1].name} ${trend(movers[movers.length-1].rate)}</b></span></div>
      <em>Túi đá thô ${held}/${jade.MAX_STONES} · Mua nhanh 1/3/5 hoặc tự lựa.</em></div>
    ${jade.MARKETS.map((m,i)=>{const open=jade.unlocked(j,i),free=!j.bought&&i===0;
     return `<div class="jade-market-card jade-market-${i} ${open?'is-open':'is-locked'}">
      <div class="jade-market-top"><div class="jade-market-crest">${['◈','≋','◇','◆','✵'][i]}</div>
       <div class="jade-market-copy"><b>${m.name}</b><small>${m.skin} · ${m.detail}</small>
        <em>${open?'✦ Đã mở · '+fmt(m.price)+' Xu/viên':'🔒 '+m.unlock}</em></div></div>
      ${open?`<div class="jade-market-bundles" aria-label="Chọn số lượng đá ${m.short}">
       ${[1,3,5].map(q=>{const cost=(q-(free?1:0))*m.price;
        return btn(q+' viên · '+(cost?fmt(cost)+' Xu':'Tặng'),'jade-buy-pack-'+i+'-'+q,
         'market',held+q>jade.MAX_STONES||s.coins<cost);}).join('')}</div>
       <details class="jade-market-tray" data-market-stall="${i}" ${openStall===i?'open':''}><summary>◇ Mở sạp · So bì đá và thử đèn</summary>
        <div class="jade-market-samples">${[0,1,2].map(slot=>{const offer=jade.marketOffer(j,i,slot);
         const inspected=j.inspected?.includes(jade.inspectionKey(j,i,slot)),fee=jade.inspectFee(i),
          hint=inspected?jade.scanHint(offer.stone,(slot+1)%3,j.lamp):null;
         return `<div class="jade-market-sample ${inspected?'is-inspected':''}">
          <div class="jade-sample-top"><b>PHÔI ${['A','B','C'][slot]}</b><em>${offer.size}</em></div>
          <span class="jade-sample-pebble jade-shell-${i} jade-sample-type-${slot}" aria-hidden="true"><i></i></span>
          <small>${offer.marks}</small><div class="jade-sample-seller">Giá chào
           <strong>${free?'✦ Tặng':fmt(offer.ask)+' Xu'}</strong></div>
          <div class="jade-sample-clue">${inspected?'◉ '+hint:'? Ruột chưa biết · Tin dấu ngoài vỏ?'}</div>
          ${btn(inspected?'✓ Đã rọi đèn':'◉ Thử đèn · '+fmt(fee)+' Xu','jade-inspect-'+i+'-'+slot,
           'upgrade',inspected||s.coins<fee)}
          ${btn(free?'Mang về · Miễn phí':'◇ Lựa viên này','jade-pick-'+i+'-'+slot,
           'market',held>=jade.MAX_STONES||!free&&s.coins<offer.ask)}</div>`;}).join('')}</div>
       </details>`:'<small class="jade-market-unavailable">Hoàn thành điều kiện mở bãi để xem các khay đá.</small>'}
      </div>`;}).join('')}
    <p class="jade-sheet-hint">Đá mua theo lô không được lựa bì. Mẫu A/B/C có giá chào riêng; rọi đèn mất phí nhưng không bảo đảm thắng. Thành phần đã cố định trước khi mua và được giữ khi tải lại.</p></div>`;
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
    return `<article class="jade-vault-card"><span class="jade-vault-gem" style="--jade-color:${jade.COLOR_HEX[stone.color]}">◆</span>
     <div class="jade-vault-info"><b>#${String(stone.id).padStart(3,'0')} · ${stoneName(stone)}</b>
       <small>${stone.phase==='crafted'?jade.CRAFTS[stone.craft].name:'Phôi chưa chế tác'} · Cỡ ${stone.size}</small>
       <span class="${trendClass(q.rate)}">${trend(q.rate)} · <strong>${fmt(q.value)} Xu</strong></span></div>
     <div class="jade-vault-actions">${btn('Bán ngay','jade-vault-sell-'+i,'gold')}
      ${btn('Đưa ra bàn','jade-vault-select-'+i,'upgrade',!!j.active)}</div></article>`;}).join('')}</div>`:
    '<p class="jade-vault-empty">Chưa có ngọc lưu kho. Cắt viên đầu tiên rồi chọn “Cất vào Kho Ngọc” để giữ giá trị cho tương lai.</p>'}
   <p class="jade-sheet-hint">Giá cao hôm nay không chắc tiếp tục tăng ngày mai. Đây là thị trường giả lập chỉ dùng Xu Arcade, không liên kết giá ngọc thật.</p>
  </div>`;
 }
 function workshopPanel(s){
  const j=s.jade,stone=j.active,canCraft=stone?.phase==='cut'&&stone.grade>0&&stone.flaw!=='skin';
  const upgrades=[['lamp','◉','Đèn giám ngọc','Soi rõ tín hiệu và bì dày'],
   ['saw','⚙','Cưa hợp kim','Tăng cơ hội giữ nguyên phôi nứt'],
   ['carver','✧','Thợ khắc bậc cao','Tăng giá thành phẩm 17%/cấp'],
   ['permit','✵','Giấy phép Tàn Tích','Mở lô thiên thạch khi đủ giao dịch']];
  return `<div class="jade-workshop-content" data-arcade-panel="jade-workshop">
    <div class="jade-sheet-heading"><b>⌘ Xưởng chế tác</b><small>${canCraft?'Có phôi ngọc trên bàn':'Cắt được phôi mới có thể chế tác'}</small></div>
    <div class="jade-craft-list">${Object.entries(jade.CRAFTS).map(([id,item])=>{
     const fee=stone?jade.craftFee(stone,id):0;
     const allowed=canCraft&&stone.size>=item.min&&
      !(id==='bangle'&&stone.flaw==='fracture'&&!stone.savedFracture);
     return `<div class="jade-craft-card"><span>${{bangle:'◯',pendant:'◇',ring:'◈',beads:'❈'}[id]}</span>
      <div><b>${item.name}</b><small>Phôi cỡ ${item.min}+ · x${item.mult.toLocaleString('vi-VN')} giá trị</small></div>
      ${btn('+'+fmt(fee)+' Xu','jade-craft-'+id,'upgrade',!allowed||s.coins<fee)}</div>`;}).join('')}</div>
    <div class="jade-sheet-heading"><b>⚒ Nâng cấp xưởng</b><small>Đầu tư bằng Xu Arcade</small></div>
    ${upgrades.map(([id,icon,title,desc])=>{const cost=jade.upgradeCost(j,id);
     return `<div class="jade-tool-card"><span>${icon}</span><div><b>${title}</b><small>${desc} · ${id==='permit'?(j.permit?'Đã có':'Giấy phép'): 'Cấp '+j[id]+'/4'}</small></div>
      ${btn(cost===null?'Tối đa':fmt(cost)+' Xu','jade-upgrade-'+id,'upgrade',cost===null||s.coins<cost||id==='permit'&&j.sold<25)}</div>`;}).join('')}
    <p class="jade-sheet-hint">Cưa tốt giúp giảm tổn thất do đường nứt lúc xẻ; không thể biến phế thạch thành ngọc thật.</p></div>`;
 }
 function galleryPanel(s){
  const j=s.jade,found=Object.keys(j.album).length;
  const exhibits=j.exhibits.map((item,i)=>`<div class="jade-exhibit"><span style="--jade-color:${jade.COLOR_HEX[item.color]}">◆</span>
   <div><b>${jade.GRADES[item.grade]} · ${jade.COLORS[item.color]}</b>
   <small>${jade.CRAFTS[item.craft].name} · Cỡ ${item.size} · #${i+1}</small></div></div>`).join('');
  return `<div class="jade-gallery-content" data-arcade-panel="jade-gallery">
    <div class="jade-gallery-banner"><span>✦ SỔ PHỈ THÚY</span><strong>${found}/56</strong>
      <small>Khám phá theo 7 Chủng × 8 Sắc · Chỉ ghi nhận ngọc đã cắt</small></div>
    ${Array.from({length:7},(_,index)=>index+1).map(grade=>`<div class="jade-album-row"><b>${jade.GRADES[grade]}</b>
      <div class="jade-album-gems">${jade.COLORS.map((name,color)=>{
       const count=j.album[grade+'-'+color]||0;
       return `<div class="jade-album-slot ${count?'is-found':''}" title="${name}${count?' ×'+count:' · Chưa mở'}"
        style="--jade-color:${jade.COLOR_HEX[color]}" aria-label="${jade.GRADES[grade]}, ${name}, ${count?'đã thấy '+count+' lần':'chưa thấy'}">${count?'◆':'◇'}</div>`;}).join('')}</div></div>`).join('')}
    <div class="jade-sheet-heading"><b>✦ Tủ Triển Lãm Cá Nhân</b><small>${j.exhibits.length}/40 tác phẩm</small></div>
    ${exhibits||'<p class="jade-sheet-hint">Chế tác rồi chọn “Đưa vào tủ” để lưu tác phẩm hiếm. Trưng bày không nhận Xu bán.</p>'}</div>`;
 }
 function panel(s){
  const j=s.jade||jade.fresh(),stone=j.active,found=Object.keys(j.album).length;
  return `<section class="arcade-world arcade-world-jade" aria-label="Ngọc Phường">
   <header class="arcade-world-heading"><div><span class="arcade-eyebrow">04 / JADE APPRAISAL</span>
     <h3>Ngọc Phường</h3><p>Đoán đá · Chế tác · Sưu tầm</p></div><span class="arcade-world-live">✦ PHỈ THÚY KÝ</span></header>
   ${stoneScene(stone,j)}
   <div class="arcade-control-panel jade-control-panel">
    ${activePanel(s)}
    ${stockPanel(s)}
    <div class="jade-accounting"><div><small>ĐÃ GIAO DỊCH</small><b>${j.sold}</b></div>
      <div><small>ĐÃ KHÁM PHÁ</small><b>${found}<em>/56</em></b></div>
      <div><small>LỢI NHUẬN RÒNG</small><b>${fmt(j.received-j.invested)}<em> Xu</em></b></div></div>
    <div class="arcade-quick-drawers arcade-quick-drawers-quad jade-quick-drawers">
     ${sheet('Chợ đá','◈','jade-market')}${sheet('Kho ngọc','▱','jade-vault')}
     ${sheet('Xưởng','⚒','jade-workshop')}${sheet('Sổ ngọc','✧','jade-gallery')}</div>
    ${marketPanel(s)}${vaultPanel(s)}${workshopPanel(s)}${galleryPanel(s)}
   </div>
  </section>`;
 }
 root.DuduPersonalJadeUIV1=Object.freeze({panel,rememberTray});
})(typeof window!=='undefined'?window:{});
