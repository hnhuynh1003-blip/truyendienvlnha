/* DUDU V42.2 — Sandbox-only inventory interface.
 * Read-only RPG classification and inspector: never mutates economy, NPC
 * relationships or server collectibles. Existing discard callback is reused.
 */
(function(root,factory){
 'use strict';
 const api=factory(root?.DuduInventoryV42,root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduInventoryViewV42=api;
})(typeof window!=='undefined'?window:null,function(model,catalog){
 'use strict';
 let pageSize=24,last=null,focusIndex=null;
 const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
 const make=(tag,klass,value)=>{
  const node=document.createElement(tag);
  if(klass)node.className=klass;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 function filters(){
  const read=(id,fallback)=>$(id)?.value||fallback;
  return {
   category:read('inventory-v42-category','ALL'),
   query:read('inventory-v2-search',''),
   rank:read('inventory-v42-rank','ALL'),
   realm:read('inventory-v42-realm','ALL'),
   storyId:read('inventory-v42-story','ALL'),
   order:read('inventory-v42-sort','recent'),
   limit:pageSize
  };
 }
 function storyOptions(inventory,stories=[]){
  const select=$('inventory-v42-story');if(!select)return;
  const selected=select.value||'ALL', ids=new Map();
  const storyNames=new Map((stories||[]).filter(x=>typeof x?.id==='string')
    .map(x=>[x.id,String(x.title||x.id)]));
  for(const item of Array.isArray(inventory)?inventory:[]){
   const detail=model.inspect(item);
   // The story filter only lists ACTUAL bound items; not every story
   // visited when picking up a global COMMON or realm-shared drop.
   if(['COMMON','REALM'].includes(detail?.scope))continue;
   const sid=detail?.storyId;
   if(sid&&!ids.has(sid))ids.set(sid,storyNames.get(sid)||sid);
  }
  const signature=JSON.stringify([...ids]);
  if(select.dataset.inventory42Options===signature)return;
  select.replaceChildren();
  for(const [value,label] of [['ALL','Mọi truyện'],['GLOBAL','Không gắn truyện'],...ids]){
   const option=make('option','',label);option.value=value;select.append(option);
  }
  select.value=[...select.options].some(x=>x.value===selected)?selected:'ALL';
  select.dataset.inventory42Options=signature;
 }
 function artwork(item,art){
  const container=make('span','dudu-inventory-v12-icon dudu-v27-slot-art dudu-v42-art');
  container.textContent=item.icon||'🎒';
  const data=art?.visual?.(catalog?.byId(item.id)||item);
  if(data?.src){
   const img=make('img','dudu-item-v13-art');img.src=data.src;img.alt='';
   img.width=76;img.height=76;img.decoding='async';img.loading='lazy';
   container.replaceChildren(img);
   container.classList.add('dudu-item-v13-frame');
   container.style.setProperty('--rarity-glow',data.light);
  }
  return {container,color:data?.light||'#988fb8'};
 }

 // Keep the modal at phone-root level: it must never be a sticky grid child.
 function ensureModal(){
  if(typeof document==='undefined')return null;
  let overlay=$('inventory-v42-modal');
  if(overlay)return overlay;
  const host=$('cyber-phone');
  if(!host)return null;
  overlay=make('div','dudu-v42-modal-overlay');
  overlay.id='inventory-v42-modal';overlay.hidden=true;
  overlay.setAttribute('aria-hidden','true');
  const dialog=make('div','dudu-v42-modal-dialog');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','inventory-v42-modal-heading');
  dialog.setAttribute('aria-describedby','inventory-v42-modal-description');
  dialog.tabIndex=-1;
  const scroll=make('section','dudu-v42-dialog-scroll');
  scroll.id='inventory-v42-modal-scroll';
  dialog.append(scroll);overlay.append(dialog);host.append(overlay);
  overlay.addEventListener('pointerdown',event=>{
    if(event.target===overlay&&last?.onClose)last.onClose();
  });
  // Intercept Escape before the parent phone's shortcuts, trap focus inside.
  document.addEventListener('keydown',event=>{
    if(overlay.hidden||!overlay.isConnected)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();
      if(last?.onClose)last.onClose();
    }else if(event.key==='Tab'){
      const focusables=[...dialog.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
        .filter(el=>el.getClientRects().length);
      if(!focusables.length){event.preventDefault();dialog.focus();return;}
      const first=focusables[0],lastFocus=focusables[focusables.length-1];
      if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){
        event.preventDefault();lastFocus.focus();
      }else if(!event.shiftKey&&(document.activeElement===lastFocus||!dialog.contains(document.activeElement))){
        event.preventDefault();first.focus();
      }
    }
  },true);
  return overlay;
 }
 function hideModal(restoreFocus=true){
  const overlay=$('inventory-v42-modal');
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  overlay.querySelector('#inventory-v42-modal-scroll')?.replaceChildren();
  if(restoreFocus&&Number.isSafeInteger(focusIndex)){
    const app=$('phone-app-inventory');
    if(app?.style.display==='flex'){
      const target=$('inventory-container')?.querySelector('[data-inventory-index="'+focusIndex+'"]');
      if(target?.isConnected)target.focus({preventScroll:true});
    }
  }
 }

 function inspector({detail,entry,args}){
  const legacy=$('inventory-v12-detail');
  if(legacy){legacy.replaceChildren();legacy.style.display='none';}
  const overlay=ensureModal();if(!overlay)return;
  const panel=$('inventory-v42-modal-scroll');
  if(!detail){hideModal();return;}
  if(!panel)return;
  focusIndex=entry.index;
  panel.replaceChildren();
  const head=make('div','dudu-v42-inspector-head');
  const {container:icon}=artwork(detail,args.art);
  icon.classList.add('dudu-v42-large-art');
  const info=make('div','dudu-v42-inspector-info');
  const title=make('strong','dudu-v42-inspector-name',detail.name);
  title.id='inventory-v42-modal-heading';
  const sub=make('small','',detail.rank+' · '+detail.categoryLabel+' · '+detail.worldLabel);
  const id=make('code','dudu-v42-code',detail.id||'legacy-unknown');
  info.append(title,sub,id);
  const close=make('button','dudu-v42-close','×');close.type='button';
  close.setAttribute('aria-label','Đóng chi tiết vật phẩm');
  close.addEventListener('click',()=>args.onClose());
  head.append(icon,info,close);
  const desc=make('p','dudu-v42-inspector-desc',detail.description);
  desc.id='inventory-v42-modal-description';
  const facts=make('div','dudu-v42-inspector-facts');
  function fact(key,value){
   const row=make('div','dudu-v42-fact');
   row.append(make('span','',key),make('strong','',value));facts.append(row);
  }
  fact('Phẩm chất',detail.rank);
  if(entry.count>1)fact('Số lượng sở hữu','×'+entry.count);
  fact('Nguồn',detail.scope==='DUDU'?'Kỷ vật hệ thống':
    detail.scope==='REALM'?'Chung trong thế giới '+(model.REALMS[detail.realm]||''): 
    detail.scope==='COMMON'?'Chung toàn hệ thống':
    detail.scope==='LEGACY'?'Đồ cũ được bảo lưu':
    detail.scope==='FUNCTIONAL'?'Vật phẩm chức năng DUDU':
    detail.scope==='STORY'||detail.scope==='CHAPTER'?'Vật phẩm tác giả':'Dữ liệu cũ / cửa hàng');
  if(detail.storyId){
   const novel=(args.stories||[]).find(x=>x?.id===detail.storyId);
   fact('Truyện',novel?.title||detail.storyId);
  }
  if(detail.chapterId)fact('Chương (ID)',detail.chapterId);
  if(detail.acquisitionKind){
   fact('Cách nhận (bản lưu trên thiết bị)',{
    SHOP:'Mua tại DUDU MARKET',CHAPTER:'Thu thập tại chương',
    GLOBAL:'Thu thập trong điện thoại',STARTER:'Vật phẩm ban đầu',
    EVENT:'Nhận qua hoạt động DUDU FUN (Sandbox)'
   }[detail.acquisitionKind]);
  }
  if(detail.usageStatus!=='NOT_IMPLEMENTED'){
    const usage=typeof args.usageFor==='function'?args.usageFor(entry.item):null;
    const descriptions={
     CLEAR_PHONE_COOLDOWN:'Xóa toàn bộ hồi chiêu nhặt đồ Điện thoại',
     SHORTEN_PHONE_COOLDOWN:'Giảm tối đa 60 giây hồi chiêu Điện thoại',
     OPEN_SUPPLY:'Mở 1 Nước Uống Đóng Chai + 1 Bánh Quy Khô',
     ACTIVATE_COUPON:'Kích hoạt -25% (tối đa 12 Xu) cho 1 món phổ thông hôm nay'
    };
    fact('Công dụng',descriptions[detail.usageStatus]||'Công cụ tiêu hao');
    fact('Đã dùng hôm nay',(usage?.used||0)+'/'+(usage?.limit||2));
    if(['CLEAR_PHONE_COOLDOWN','SHORTEN_PHONE_COOLDOWN'].includes(detail.usageStatus))
     fact('Nhặt theo chương','Không thay đổi');
    if(detail.usageStatus==='ACTIVATE_COUPON')
     fact('Điều kiện','Một phiếu hiệu lực cùng ngày, không giảm vật phẩm chức năng');
  }else{
    fact('Chức năng RPG','Chưa kích hoạt trong V42');
  }
  const tradeStatus=typeof args.tradeStatus==='function'?args.tradeStatus(entry.item):null;
  if(tradeStatus){
   fact('Trạng thái',tradeStatus.label);
   if(tradeStatus.rare)fact('Thị trường hiếm',tradeStatus.auction?
    'Đủ điều kiện ký gửi thử nghiệm':'Khóa giao dịch / chưa xác nhận nguồn gốc');
   if(tradeStatus.buyback)fact('Giá thu mua Sandbox',tradeStatus.buyback+' Xu / món');
  }
  if(detail.protected)fact('Sở hữu','Đồ bảo vệ · Không được vứt');
  // User-owned browser items are not proof of a server-verified relic.
  // verifiedCollectible is always false in this model: the museum has its
  // own authenticated, read-only ledger.
  if(detail.scope==='DUDU'&&!detail.verifiedCollectible)
   fact('Xác minh','Kiểm tra tại Bảo Tàng Ký Ức');
  const footer=make('div','dudu-v42-inspector-footer');
  const status=make('span','dudu-v42-inspector-status',detail.giftable?
    'Quà NPC: tùy điều kiện tặng':'Quà NPC: chưa được phép hoặc chưa xác nhận');
  footer.append(status);
  if(detail.usageStatus!=='NOT_IMPLEMENTED'&&
    typeof args.usageFor==='function'&&typeof args.onUse==='function'){
    const usage=args.usageFor(entry.item);
    const button=make('button','btn dudu-v43-use-item',
     detail.usageStatus==='OPEN_SUPPLY'?'📦 Mở gói':
     detail.usageStatus==='ACTIVATE_COUPON'?'🎟️ Kích hoạt':'⚡ Sử dụng');
    button.type='button';
    button.disabled=!usage?.canUse;
    button.title=usage?.reason==='no-cooldown'?
      'Chỉ dùng khi nút nhặt đồ đang hồi chiêu.':
      usage?.reason==='daily-limit'?'Đã hết lượt dùng hôm nay.':
      usage?.reason==='coupon-active'?'Đang có một phiếu giảm giá chờ mua.':
      usage?.reason==='inventory-full'?'Kho cần ít nhất một ô trống.':
      usage?.canUse?'Tiêu hao 1 vật phẩm chức năng trong Sandbox.':
      'Vật phẩm không hợp lệ hoặc đã sử dụng.';
    button.addEventListener('click',()=>{
      if(!Array.isArray(args.inventory)||args.inventory[entry.index]!==entry.item)return;
      args.onUse(entry.item);
    });
    footer.append(button);
    if(!usage?.canUse){
      footer.append(make('small','dudu-v43-use-hint',
        usage?.reason==='no-cooldown'?'Chỉ dùng khi đồng hồ nhặt đồ đang chạy.':
        usage?.reason==='daily-limit'?'Đã đạt giới hạn dùng hôm nay.':
        usage?.reason==='coupon-active'?'Đã có một phiếu đang chờ dùng.':
        usage?.reason==='inventory-full'?'Cần dọn kho để nhận 2 món tiếp tế.':
        'Chưa đủ điều kiện sử dụng.'));
    }
  }
  if(detail.scope==='DUDU'&&typeof args.onMuseum==='function'){
   const museum=make('button','btn dudu-v42-museum','Xem Bảo Tàng');
   museum.type='button';museum.addEventListener('click',()=>args.onMuseum());
   footer.append(museum);
  }
  if(tradeStatus?.buyback&&typeof args.onSell==='function'){
   const sell=make('button','btn dudu-v439-sell','🪙 Bán · +'+tradeStatus.buyback+' Xu');
   sell.type='button';sell.addEventListener('click',()=>{
    if(!Array.isArray(args.inventory)||args.inventory[entry.index]!==entry.item)return;
    if(!confirm('Bán 1 '+detail.name+' để nhận '+tradeStatus.buyback+' Xu Sandbox?'))return;
    args.onSell(entry.item);
   });footer.append(sell);
  }
  if(tradeStatus?.auction&&typeof args.onAuction==='function'){
   const listing=make('details','dudu-v439-action-card');
   listing.append(make('summary','','⚖️ Đưa vào đấu giá thử'));
   const lbl=make('label','','Giá đề xuất (10–5000 Xu)');
   const price=make('input','dudu-v439-ask');
   price.type='number';price.min='10';price.max='5000';price.step='1';price.value='80';
   lbl.append(price);
   const notice=make('small','','Vật phẩm chuyển vào ký gửi. Chưa mở đặt giá thật hoặc thanh toán.');
   const button=make('button','btn dudu-v439-list','Niêm yết thử');
   button.type='button';button.addEventListener('click',()=>{
    if(!Array.isArray(args.inventory)||args.inventory[entry.index]!==entry.item)return;
    args.onAuction(entry.item,Number(price.value));
   });
   listing.append(lbl,notice,button);footer.append(listing);
  }
  if(tradeStatus?.giftTargets&&typeof args.onStoryGift==='function'&&
    typeof args.storyGiftTargets==='function'){
   const targets=args.storyGiftTargets(entry.item);
   if(targets.length){
    const gift=make('details','dudu-v439-action-card');
    gift.append(make('summary','','💌 Tặng cho truyện · Ghi lời nhắn'));
    const storyLabel=make('label','','Chọn truyện');
    const story=make('select','dudu-v439-story-pick');
    for(const target of targets){
     const option=make('option','',target.title);option.value=target.id;story.append(option);
    }
    storyLabel.append(story);
    const chapterLabel=make('label','','Chương (không bắt buộc)');
    const chapter=make('select','dudu-v439-chapter-pick');
    const refreshChapters=()=>{
     chapter.replaceChildren();
     const rootOption=make('option','','Cả truyện');rootOption.value='';chapter.append(rootOption);
     const target=targets.find(x=>x.id===story.value);
     for(const ch of target?.chapters||[]){
      const option=make('option','',ch.title);option.value=ch.id;chapter.append(option);
     }
    };
    story.addEventListener('change',refreshChapters);refreshChapters();
    chapterLabel.append(chapter);
    // A public story object never proves its author's Firebase UID.
    // In V44.0 only the local STORY_SANDBOX destination is enabled.
    const recipient=make('div','dudu-v44-recipient');
    const recipientTitle=make('strong','','📚 Ủng hộ truyện');
    const recipientDesc=make('small','','');
    const authorLocked=make('div','dudu-v44-recipient-locked',
      '🔒 Gửi trực tiếp tác giả: chưa mở · cần xác minh UID chủ truyện và quyền sở hữu trên máy chủ.');
    const refreshRecipient=()=>{
      const result=typeof args.recipientFor==='function'?
       args.recipientFor(story.value):null;
      recipientDesc.textContent=result?.description||
        'Chỉ lưu thiệp vào nhật ký Sandbox cá nhân, không chuyển cho tác giả.';
    };
    story.addEventListener('change',refreshRecipient);refreshRecipient();
    recipient.append(recipientTitle,recipientDesc,authorLocked);
    const noteLabel=make('label','','Lời nhắn riêng · tối đa 160 ký tự');
    const note=make('textarea','dudu-v439-note');note.maxLength=160;note.rows=2;
    note.placeholder='Viết lời nhắn khi tặng quà cho truyện...';
    noteLabel.append(note);
    gift.append(storyLabel,chapterLabel,recipient,noteLabel,
     make('small','','V44.0 · Chỉ lưu ở Sandbox. Đồ sẽ bị trừ khỏi Kho Sandbox và ghi nhật ký, nhưng không gửi sang tài khoản khác.'));
    const button=make('button','btn dudu-v439-gift','Lưu thiệp ủng hộ Sandbox');
    button.type='button';button.addEventListener('click',()=>{
     if(!Array.isArray(args.inventory)||args.inventory[entry.index]!==entry.item)return;
     if(!confirm('Dùng 1 '+detail.name+' để ghi thiệp ủng hộ trong Sandbox? Quà KHÔNG được gửi tới tài khoản tác giả.'))return;
     args.onStoryGift(entry.item,story.value,chapter.value||null,note.value);
    });
    gift.append(button);footer.append(gift);
   }
  }
  if(!detail.protected){
   const discard=make('button','btn btn-danger dudu-v42-discard',entry.count>1?'Vứt 1 vật phẩm':'Vứt vật phẩm');
   discard.type='button';
   discard.addEventListener('click',()=>{
    if(!Array.isArray(args.inventory)||args.inventory[entry.index]!==entry.item)return;
    if(!confirm('Vứt 1 '+detail.name+' khỏi hành trang?'))return;
    args.onDiscard(entry.index); // one concrete instance, not the whole visual stack
   });
   footer.append(discard);
  }
  panel.append(head,desc,facts,footer);
  const wasHidden=overlay.hidden;
  overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
  if(wasHidden){panel.scrollTop=0;close.focus({preventScroll:true});}
 }
 function render(args){
  if(!model||!args||typeof document==='undefined')return false;
  const container=$('inventory-container'),toolbar=$('inventory-v2-toolbar');
  if(!container||!toolbar)return false;
  last=args;
  toolbar.style.display='flex';
  container.classList.add('dudu-v27-inventory-grid','dudu-v42-grid');
  storyOptions(args.inventory,args.stories);
  const options=filters();
  const result=model.displayList(args.inventory,options);
  const all=model.displayList(args.inventory,{...options,category:'ALL',query:'',rank:'ALL',
    realm:'ALL',storyId:'ALL',limit:1}).total;
  // Count deliberately omitted from the search row (mobile space).
  // Keep the status node empty for compatibility with legacy scripts.
  const count=$('inventory-v2-count');
  if(count){count.textContent='';count.hidden=true;}
  const capacity=$('inventory-v438-capacity');
  if(capacity){
   const num=Array.isArray(args.inventory)?args.inventory.length:0;
   const tools=(args.inventory||[]).filter(x=>
     model.inspect(x)?.category==='TOOL').length;
   capacity.textContent='🎒 '+num+'/500 vật phẩm · '+tools+' công cụ';
  }
  const categoryPicker=$('inventory-v42-categories');
  if(categoryPicker)for(const button of categoryPicker.querySelectorAll('button[data-category]')){
   const active=button.dataset.category===options.category;
   button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);
  }
  container.replaceChildren();
  if(!result.total){
   container.append(make('p','dudu-v27-inventory-empty',
     all?'Không có vật phẩm phù hợp bộ lọc.':'Hành trang còn trống. Đồ nhặt được sẽ xuất hiện ở đây.'));
  }
  const current=result.entries.find(row=>row.items.includes(args.selected))||null;
  for(const entry of result.entries){
   const detail=entry.detail;
   const slot=make('button','item-card dudu-inventory-v12-row dudu-inventory-v12-open dudu-v27-inventory-slot dudu-v42-slot');
   slot.type='button';slot.dataset.inventoryIndex=String(entry.index);
   slot.dataset.rarity=detail.rank;slot.dataset.category=detail.category;
   const selected=!!current&&current===entry;
   slot.classList.toggle('is-selected',selected);
   slot.setAttribute('aria-label',
     (detail.usageStatus!=='NOT_IMPLEMENTED'?'Xem chi tiết và dùng ':'Xem chi tiết ')+
     detail.name+(entry.count>1?' · '+entry.count+' món':''));
   slot.setAttribute('aria-expanded',String(selected));
   slot.setAttribute('aria-controls','inventory-v42-modal');
   const art=artwork(detail,args.art);
   slot.style.setProperty('--rarity-glow',art.color);
   const badge=make('span','dudu-v27-slot-rarity',detail.rank);
   const label=make('span','dudu-v27-slot-name',detail.name);
   slot.append(art.container,badge,label);
   const action=typeof args.tradeStatus==='function'?args.tradeStatus(entry.item):null;
   const hint=action?.useable?'⚡ Dùng':action?.auction?'⚖️ Ký gửi':
     action?.buyback?'🪙 Bán':action?.giftTargets?'💌 Tặng':
     detail.protected?'🔒 Khóa':'📦 Lưu trữ';
   const ribbon=make('span','dudu-v439-slot-hint',hint);
   slot.append(ribbon);
   if(detail.usageStatus!=='NOT_IMPLEMENTED'){
    slot.classList.add('dudu-v43-tool-slot');
    const marker=make('span','dudu-v43-tool-marker',
     detail.usageStatus==='OPEN_SUPPLY'?'📦':
     detail.usageStatus==='ACTIVATE_COUPON'?'🎟️':'⚡');
    marker.title='Vật phẩm chức năng · nhấn để xem công dụng và sử dụng';
    marker.setAttribute('aria-hidden','true');
    slot.append(marker);
   }
   if(entry.count>1){
     const quantity=make('span','dudu-v42-slot-quantity','×'+entry.count);
     quantity.setAttribute('aria-label','Số lượng '+entry.count);
     slot.append(quantity);
   }
   if(detail.protected){
    const lock=make('span','dudu-v27-slot-lock','🔒');
    lock.setAttribute('aria-hidden','true');slot.append(lock);
   }
   slot.addEventListener('click',()=>args.onSelect(selected?null:entry.item));
   container.append(slot);
  }
  const more=$('inventory-v42-more');
  if(more){
   more.hidden=!result.hasMore;
   more.textContent='Xem thêm '+Math.min(24,result.total-pageSize)+' vật phẩm';
  }
  inspector({detail:current?.detail||null,entry:current,args});
  return true;
 }
 function reset(){
  pageSize=24;
  if(last)render(last);
 }
 function more(){
  pageSize+=24;
  if(last)render(last);
 }
 function chooseCategory(category){
  const input=$('inventory-v42-category');
  if(!input||!Object.hasOwn(model?.CATEGORIES||{},category))return;
  input.value=category;reset();
 }
 function close(){
  hideModal(false);
  const legacy=$('inventory-v12-detail');
  if(legacy){legacy.replaceChildren();legacy.style.display='none';}
 }
 return Object.freeze({render,reset,more,chooseCategory,close,filters});
});
