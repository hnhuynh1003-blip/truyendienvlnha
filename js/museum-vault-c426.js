/* C4.26/C4.39 — Museum of future rewards and device-side display preferences.
 * Design previews and personal Arcade discovery arrangements are not ownership
 * evidence; only /collectibles/mine populates the confirmed shelf.
 * No reward granting, server writes or claims.
 */
(function(root){
 'use strict';
 if(!root.document)return;
 // This wing mirrors the *same* four Season 01 artworks as its Passport.
 // Long-term achievement statues belong to Chiến Tích, not Quà mùa.
 const seasonRelics=root.DuduPersonalArcadeSeasonC423?.RELICS||[
  {id:'neon',name:'Vi Mạch Bình Minh'},
  {id:'mine',name:'Tinh Thạch Sương Lam'},
  {id:'garden',name:'Giọt Sương Nguyệt'},
  {id:'jade',name:'Ngọc Ấn Khai Mùa'}
 ];
 const exhibits=Object.freeze([
  ...seasonRelics.map((r,i)=>Object.freeze({id:'s01-'+r.id,name:r.name,
   artId:r.id,group:'Mùa 01',kind:'BÁU VẬT 0'+(i+1)+' / 04',rarity:'Sử thi',
   story:'Báu vật khởi nguyên của '+(r.world||'bốn hành trình')+
    '. Chưa phát hành; chưa thể nhận hoặc trưng bày như vật phẩm đã sở hữu.',
   action:'season',label:'Xem Hộ chiếu'})),
  Object.freeze({id:'s01-founder',name:'Ấn Khai Nguyên',artId:'founder',
   group:'Di sản · Mùa 01',kind:'DI SẢN CUỐI MÙA',rarity:'Di sản',
   story:'Di sản dành cho hành trình lớn qua bốn thế giới. Hiện chỉ là hình xem trước.',
   action:'season',label:'Xem Hộ chiếu'})
 ]);
 const el=(tag,cls,label)=>{
  const node=root.document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined)node.textContent=String(label);
  return node;
 };
 let host=null,owner='',sandboxMode=false,active='gallery',selected='s01-neon';
 let vanBaoRequest=0,vanVatRequest=0;
 const byId=id=>root.document.getElementById(id);
 const getPanel=id=>host?.querySelector('[data-museum-panel="'+id+'"]');
 function openSource(item){
  if(item.action==='season'){
   if(root.DuduPersonalArcadeUIV1?.openSeason?.())return;
   root.openPhoneApp?.('arcade');return;
  }
  if(item.action==='quests')root.openPhoneApp?.('quests');
  if(item.action==='honors')root.openPhoneApp?.('honors');
 }
 function choose(id){
  const item=exhibits.find(x=>x.id===id)||exhibits[0];selected=item.id;
  const stage=host?.querySelector('.museum-c426-stage');if(!stage)return;
  stage.dataset.exhibit=item.id;
  const img=stage.querySelector('.museum-c426-art');
  img.dataset.relic=item.artId;
  img.setAttribute('aria-label','Hình xem trước '+item.name);
  stage.querySelector('.museum-c426-kind').textContent=item.kind;
  const detail=host.querySelector('.museum-c426-detail');
  detail.querySelector('.museum-c426-rarity').textContent=item.group+' · '+item.rarity;
  detail.querySelector('strong').textContent=item.name;
  detail.querySelector('p').textContent=item.story;
  const action=detail.querySelector('.museum-c426-action');
  if(item.action){action.hidden=false;
   const hasAccount=typeof currentUsername==='string'&&!!currentUsername;
   action.textContent=item.action==='season'&&!hasAccount?'Đến Arcade':item.label;
   action.onclick=()=>openSource(item);
  }else{action.hidden=true;action.onclick=null;}
  for(const button of host.querySelectorAll('.museum-c426-select')){
   const on=button.dataset.exhibit===item.id;
   button.classList.toggle('is-active',on);
   button.setAttribute('aria-pressed',String(on));
  }
 }
 function switchTab(id){
  if(!['gallery','display','preview','owned','memories'].includes(id))return;
  active=id;
  for(const tab of host?.querySelectorAll('.museum-c426-tab')||[]){
   const on=tab.dataset.tab===id;
   tab.setAttribute('aria-selected',String(on));tab.classList.toggle('is-active',on);
  }
  for(const panel of host?.querySelectorAll('[data-museum-panel]')||[])
   panel.hidden=panel.dataset.museumPanel!==id;
  if(id==='display')root.DuduArcadeShowcaseUIV439?.render?.();
  if(id==='owned'){void refreshVanBao();void refreshVanVat();}
 }
 // A separate Firestore-backed FUN shelf: it never masquerades as the Worker
 // collectible ledger, grants items, or trusts browser storage as ownership.
 function renderVanBao(result,reason=''){
  const container=host?.querySelector('.museum-c426-vanbao');if(!container)return;
  container.replaceChildren();
  const rare=(root.DuduItemCatalog?.funCollectibles||[])
   .filter(item=>item.collectionSet==='VAN_BAO'&&['S','SS','SSS'].includes(item.rank));
  const ids=new Set(Array.isArray(result?.state?.album)?result.state.album:[]);
  const owned=rare.filter(item=>ids.has(item.id)).length;
  const heading=el('div','museum-vanbao-head');
  heading.append(el('span','','✦ KỆ VẠN BẢO'),
   el('strong','',owned+'/'+rare.length+' BẢO VẬT HIẾM'));
  container.append(heading);
  if(reason){container.append(el('small','museum-vanbao-note',
   reason==='sandbox'?'Xem thử · Sandbox không xác nhận sở hữu.':
   reason==='unauthenticated'?'Đăng nhập để xem kệ bảo vật của bạn.':
   'Chưa tải được sổ Vạn Bảo · thử mở lại Bảo Tàng.'));}
  else container.append(el('small','museum-vanbao-note',
   'Đồng bộ từ Hộp Mù DUDU FUN · không cần nhận lại.'));
  if(!rare.length)return;
  const focus=el('div','museum-vanbao-focus');
  const artwork=el('span','museum-vanbao-hero');
  const caption=el('div','museum-vanbao-caption');
  focus.append(artwork,caption);container.append(focus);
  const gallery=el('div','museum-vanbao-pedestals');
  const buttons=[];
  function chooseRare(item){
   const has=ids.has(item.id);
   artwork.replaceChildren();artwork.className='museum-vanbao-hero'+(has?'':' is-locked');
   if(!root.DuduItemArtV13?.mount?.(artwork,item))artwork.textContent=has?(item.icon||'✦'):'◆';
   caption.replaceChildren(el('span','','HẠNG '+item.rank),
    el('strong','',has?item.name:'Bảo vật chưa tìm thấy'),
    el('small','',has?'✦ Đã ghi nhận trong Sổ Vạn Bảo':'Mở Hộp Mù để sưu tập'));
   for(const button of buttons){
    const on=button.dataset.itemId===item.id;
    button.classList.toggle('is-selected',on);
    button.setAttribute('aria-pressed',String(on));
   }
  }
  for(const item of rare){
   const has=ids.has(item.id),card=el('button','museum-vanbao-pedestal'+
    (has?' is-owned':' is-locked')+' rank-'+item.rank.toLowerCase());
   card.type='button';card.dataset.itemId=item.id;
   card.setAttribute('aria-label',has?'Ngắm '+item.name:
    'Bảo vật hạng '+item.rank+' chưa sở hữu');
   const image=el('span','museum-vanbao-mini');
   image.setAttribute('aria-hidden','true');
   if(!root.DuduItemArtV13?.mount?.(image,item))image.textContent='◆';
   card.append(image,el('b','',item.rank));
   card.addEventListener('click',()=>chooseRare(item));
   buttons.push(card);gallery.append(card);
  }
  container.append(gallery);
  chooseRare([...rare].reverse().find(item=>ids.has(item.id))||rare[rare.length-1]);
 }
 async function refreshVanBao(){
  const request=++vanBaoRequest,bridge=root.DuduBlindBoxLiveBridgeC29;
  if(sandboxMode){renderVanBao(null,'sandbox');return;}
  if(!owner||!bridge?.ready?.()||bridge.uid?.()!==owner){
   renderVanBao(null,'unauthenticated');return;
  }
  const uid=owner;
  const container=host?.querySelector('.museum-c426-vanbao');
  if(container)container.textContent='Đang tải kệ Vạn Bảo…';
  try{
   const result=await bridge.load();
   if(request!==vanBaoRequest||uid!==owner||!bridge.ready?.()||
    bridge.uid?.()!==uid)return;
   renderVanBao(result);
  }catch(_){
   if(request!==vanBaoRequest||uid!==owner)return;
   renderVanBao(null,'unavailable');
  }
 }
 // F3.9 · Rare S/SS/SSS keepsakes share the "Đã sở hữu" wing with Vạn Bảo.
 // The account's server-backed album is historical collection evidence, not
 // physical Kho ownership (selling an item does not erase its museum record).
 function renderVanVat(result,reason=''){
  const container=host?.querySelector('.museum-c426-vantvat');if(!container)return;
  container.replaceChildren();
  const all=(root.DuduItemCatalog?.funVantVat||[])
   .filter(item=>item.collectionSet==='VAN_VAT'&&
    ['S','SS','SSS'].includes(item.rank));
  const permitted=new Set(all.map(item=>item.id));
  const album=new Set((Array.isArray(result?.state?.album)?result.state.album:[])
   .filter(id=>permitted.has(id)));
  const owned=all.filter(item=>album.has(item.id));
  const header=el('div','museum-vantvat-head');
  header.append(el('strong','','✦ KỆ VẠN TƯỢNG'),
   el('span','',owned.length+'/'+all.length+' BẢO VẬT HIẾM'));
  container.append(header);
  if(reason){
   const message=reason==='sandbox'?'Sandbox chỉ xem thử, không xác nhận vật phẩm.':
    reason==='unauthenticated'?'Đăng nhập để xem bảo vật đã quay trên tài khoản.':
    'Chưa tải được sổ Vạn Tượng. Hãy mở lại mục Đã sở hữu.';
   container.append(el('p','museum-vantvat-empty',message));return;
  }
  container.append(el('small','museum-vantvat-note',
   'Chỉ trưng bày hạng S–SSS đã sưu tầm · vật phẩm thực và giá bán ở Kho.'));
  if(!all.length)return;
  const rankOrder=['SSS','SS','S','A','B','C','D','E','F'];
  const sorted=[...all].sort((a,b)=>Number(album.has(b.id))-Number(album.has(a.id))||
   rankOrder.indexOf(a.rank)-rankOrder.indexOf(b.rank)||a.name.localeCompare(b.name,'vi'));
  const feature=el('div','museum-vantvat-feature');
  const art=el('span','museum-vantvat-art');
  const description=el('div','museum-vantvat-desc');
  feature.append(art,description);container.append(feature);
  const grid=el('div','museum-vantvat-grid');
  grid.setAttribute('aria-label','Các bảo vật đã sưu tầm từ Vạn Tượng');
  const missing=el('div','museum-vantvat-grid');
  missing.setAttribute('aria-label','Các bảo vật chưa tìm thấy');
  const buttons=[];
  function select(item){
   const found=album.has(item.id);
   feature.className='museum-vantvat-feature rank-'+item.rank.toLowerCase()+
    (found?' is-owned':' is-locked');
   art.replaceChildren();art.className='museum-vantvat-art'+(found?'':' is-locked');
   if(found){
    if(!root.DuduItemArtV13?.mount?.(art,item))art.textContent=item.icon||'✦';
   }else art.textContent='◇';
   description.replaceChildren(el('small','',found?'HẠNG '+item.rank+' · ĐÃ SƯU TẦM':
    'HẠNG '+item.rank+' · CHƯA MỞ KHÓA'),
    el('strong','',found?item.name:'Bảo vật chưa tìm thấy'),
    el('span','',found?'Kỷ vật đã từng nhận từ vòng quay.':
     'Quay Vạn Tượng để khám phá món đồ này.'));
   for(const button of buttons){
    const chosen=button.dataset.itemId===item.id;
    button.classList.toggle('is-selected',chosen);
    button.setAttribute('aria-pressed',String(chosen));
   }
  }
  for(const item of sorted){
   const found=album.has(item.id);
   const card=el('button','museum-vantvat-card rank-'+item.rank.toLowerCase()+
    (found?' is-owned':' is-locked'));
   card.type='button';card.dataset.itemId=item.id;
   card.setAttribute('aria-label',found?'Ngắm '+item.name:
    'Bảo vật hạng '+item.rank+' chưa mở khóa');
   const picture=el('span','museum-vantvat-mini');
   if(found){
    if(!root.DuduItemArtV13?.mount?.(picture,item))picture.textContent=item.icon||'✦';
   }else picture.textContent='◇';
   card.append(picture,el('b','',item.rank),
    el('small','',found?item.name:'Chưa có'));
   card.addEventListener('click',()=>select(item));
   (found?grid:missing).append(card);buttons.push(card);
  }
  if(!owned.length)container.append(el('p','museum-vantvat-empty',
   'Chưa sưu tầm được bảo vật S trở lên. Quay để tìm kỳ trân nhé!'));
  else container.append(grid);
  if(missing.children.length){
   const unknown=el('details','museum-vantvat-unfound');
   unknown.append(el('summary','','Bảo vật hiếm chưa khám phá · '+missing.children.length),missing);
   container.append(unknown);
  }
  select(sorted.find(item=>album.has(item.id))||sorted[0]);
  const go=el('button','museum-vantvat-go','🎰 Đến vòng quay');
  go.type='button';go.onclick=()=>root.DuduFunUIV43?.showVantVat?.();
  container.append(go);
 }
 async function refreshVanVat(){
  const request=++vanVatRequest,bridge=root.DuduVantVatLiveBridgeF31;
  if(sandboxMode){renderVanVat(null,'sandbox');return;}
  if(!owner||!bridge?.ready?.()||bridge.uid?.()!==owner){
   renderVanVat(null,'unauthenticated');return;
  }
  const uid=owner,container=host?.querySelector('.museum-c426-vantvat');
  if(container)container.textContent='Đang đối chiếu bảo vật Vạn Tượng…';
  try{
   const result=await bridge.load();
   if(request!==vanVatRequest||uid!==owner||!bridge.ready?.()||
    bridge.uid?.()!==uid)return;
   renderVanVat(result);
  }catch(_){
   if(request!==vanVatRequest||uid!==owner)return;
   renderVanVat(null,'unavailable');
  }
 }
 function build(){
  host.replaceChildren();host.classList.add('museum-c426-root');
  const nav=el('nav','museum-c426-tabs');nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Khu vực bảo tàng');
  for(const [id,label] of [['gallery','Chiến tích'],['display','Tủ riêng'],
   ['preview','Quà mùa'],['owned','Đã sở hữu'],['memories','Kỷ niệm']]){
   const tab=el('button','museum-c426-tab',label);tab.type='button';
   tab.dataset.tab=id;tab.setAttribute('role','tab');tab.id='museum-c426-tab-'+id;
   tab.setAttribute('aria-controls','museum-c426-panel-'+id);
   tab.addEventListener('click',()=>switchTab(id));nav.append(tab);
  }
  host.append(nav);
  const local=el('section','museum-c429-local');local.id='museum-c426-panel-gallery';
  local.dataset.museumPanel='gallery';local.setAttribute('role','tabpanel');
  local.setAttribute('aria-labelledby','museum-c426-tab-gallery');
  host.append(local);
  const display=el('section','dudu-c439-hall');display.id='museum-c426-panel-display';
  display.dataset.museumPanel='display';display.setAttribute('role','tabpanel');
  display.setAttribute('aria-labelledby','museum-c426-tab-display');
  host.append(display);
  const gallery=el('section','museum-c426-gallery');gallery.id='museum-c426-panel-preview';
  gallery.dataset.museumPanel='preview';gallery.setAttribute('role','tabpanel');
  gallery.setAttribute('aria-labelledby','museum-c426-tab-preview');
  const stage=el('div','museum-c426-stage');
  stage.append(el('div','museum-c426-glow'),el('span','museum-c426-eyebrow','◌ MÙA 01 · CHỈ XEM TRƯỚC'));
  const illustration=el('span','museum-c426-art');
  illustration.setAttribute('role','img');
  stage.append(illustration,el('span','museum-c426-kind'));
  gallery.append(stage);
  const detail=el('div','museum-c426-detail');detail.setAttribute('aria-live','polite');
  const copy=el('div','museum-c426-copy');
  const lore=el('details','museum-c426-lore');
  lore.append(el('summary','','Chuyện món đồ'),el('p',''));
  copy.append(el('span','museum-c426-rarity'),el('strong',''),lore);
  const action=el('button','museum-c426-action');action.type='button';
  detail.append(copy,action);gallery.append(detail);
  const collection=el('div','museum-c426-collection');
  collection.setAttribute('role','group');collection.setAttribute('aria-label','Năm báu vật Mùa 1 xem trước');
  for(const exhibit of exhibits){
   const button=el('button','museum-c426-select');button.type='button';
   button.dataset.exhibit=exhibit.id;button.setAttribute('aria-label','Xem trước '+exhibit.name);
   const portrait=el('span','museum-c426-mini-art');
   portrait.dataset.relic=exhibit.artId;portrait.setAttribute('aria-hidden','true');
   button.append(portrait,el('small','',exhibit.group));
   button.addEventListener('click',()=>choose(exhibit.id));collection.append(button);
  }
  gallery.append(collection);
  host.append(gallery);
  const owned=el('section','museum-c426-owned');owned.id='museum-c426-panel-owned';
  owned.dataset.museumPanel='owned';owned.setAttribute('role','tabpanel');
  owned.setAttribute('aria-labelledby','museum-c426-tab-owned');
  owned.append(el('section','museum-c426-vanbao'));
  owned.append(el('section','museum-c426-vantvat'));
  owned.append(el('span','museum-c426-ledger','Sổ sở hữu chưa xác minh'));
  const verified=el('div','museum-c426-verified');
  verified.setAttribute('aria-live','polite');owned.append(verified);host.append(owned);
  const memories=el('section','museum-c426-memories');memories.id='museum-c426-panel-memories';
  memories.dataset.museumPanel='memories';memories.setAttribute('role','tabpanel');
  memories.setAttribute('aria-labelledby','museum-c426-tab-memories');
  const memorySlot=el('div','');memorySlot.id='dudu-museum-memory-slot';
  memories.append(memorySlot);
  if(!sandboxMode)memories.append(el('p','museum-c426-memory-empty',
   'Album tình bạn thử nghiệm được giữ riêng. Khi có kỷ niệm chính thức đã duyệt, nơi này sẽ đón thêm hiện vật.'));
  host.append(memories);
  choose(selected);switchTab(active);
 }
 function init({container,ownerKey='',sandbox=false}={}){
  if(!container)return false;
  const changed=host!==container||owner!==ownerKey||sandboxMode!==!!sandbox||
   !container.classList.contains('museum-c426-root-ready');
  host=container;
  if(changed){vanBaoRequest++;vanVatRequest++;owner=ownerKey;sandboxMode=!!sandbox;
   active='gallery';selected='s01-neon';
   build();host.classList.add('museum-c426-root-ready');}
  root.DuduMuseumGalleryC429?.mount?.({container:getPanel('gallery'),ownerKey:owner,sandbox:sandboxMode});
  root.DuduArcadeShowcaseUIV439?.mount?.({container:getPanel('display')});
  if(active==='owned'){void refreshVanBao();void refreshVanVat();}
  return true;
 }
 function showVanBao(){
  if(!host)return false;
  switchTab('owned');return true;
 }
 function showVanVat(){
  if(!host)return false;
  switchTab('owned');
  host.querySelector('.museum-c426-vantvat')?.scrollIntoView?.({block:'nearest'});
  return true;
 }
 function showDisplay(){
  if(!host)return false;
  switchTab('display');
  root.DuduArcadeShowcaseUIV439?.render?.();
  return true;
 }
 function updateVerified(result){
  if(!host)return false;
  const container=host.querySelector('.museum-c426-verified');
  const ledger=host.querySelector('.museum-c426-ledger');
  if(!container||!ledger)return false;
  container.replaceChildren();
  if(result?.loading){ledger.textContent='Đang kiểm tra sở hữu';
   container.append(el('p','museum-c426-state','Đang đối chiếu kỷ vật với máy chủ…'));
   return true;
  }
  const items=Array.isArray(result?.items)?result.items:[];
  if(!result?.ok){
   ledger.textContent='Chưa xác minh';
   const reason=result?.reason==='sandbox'?
    'Sandbox không kết nối sổ sở hữu. Các hiện vật ở Đại sảnh chỉ là bản mẫu.':
    result?.reason==='unauthenticated'?
    'Hãy đăng nhập để kiểm tra kho kỷ vật đã được máy chủ xác minh.':
    'Chưa kết nối được sổ sở hữu. Bạn có thể thử nút làm mới ở góc phải.';
   container.append(el('p','museum-c426-state',reason));return true;
  }
  ledger.textContent=items.length+' kỷ vật xác minh';
  if(!items.length){
   const empty=el('div','museum-c426-empty');
   empty.append(el('span','museum-c426-empty-seal','◇'),
    el('strong','','Bệ trưng bày đang đợi hiện vật đầu tiên'),
    el('p','','Báu vật đã nhận sẽ xuất hiện khi hệ thống xác nhận sở hữu. Hình xem trước không tính là vật phẩm đã nhận.'));
   const back=el('button','museum-c426-back','Khám phá Đại sảnh ›');back.type='button';
   back.addEventListener('click',()=>switchTab('gallery'));
   empty.append(back);container.append(empty);return true;
  }
  const list=el('div','museum-c426-owned-list');
  for(const item of items){
   const card=el('article','museum-c426-owned-card');
   const emblem=el('span','museum-c426-owned-emblem');
   // Server icons are data, not HTML or ownership rules.
   emblem.textContent=typeof item?.icon==='string'?item.icon:'✦';
   const copy=el('div','museum-c426-owned-copy');
   copy.append(el('small','','✦ ĐÃ XÁC MINH · '+String(item?.rank||'Kỷ vật')),
    el('strong','',item?.name||'Kỷ vật đã lưu'),
    el('span','',item?.summary||'Hiện vật thuộc sổ sở hữu của bạn.'));
   card.append(emblem,copy);list.append(card);
  }
  container.append(list);return true;
 }
 root.DuduMuseumVaultC426=Object.freeze({init,updateVerified,showDisplay,
  showVanBao,showVanVat,exhibits});
})(typeof window!=='undefined'?window:{});
