/* C4.26 — Museum of future rewards. This is a READ-ONLY exhibition.
 * A design preview is not ownership evidence; only /collectibles/mine
 * can populate the confirmed shelf. No reward granting, writes or claims.
 */
(function(root){
 'use strict';
 if(!root.document)return;
 const ART='assets/museum-c426/';
 const exhibits=Object.freeze([
  Object.freeze({id:'s01',name:'Ấn Khai Nguyên',group:'Mùa 01',
   kind:'KỶ VẬT MÙA',rarity:'Huyền thoại',
   story:'Phần thưởng hoàn bộ Sương Tinh Thạch. Chỉ xem trước; chưa có quyền nhận.',
   image:'assets/arcade-season/s01-founder-crest.webp',action:'season',label:'Xem Hộ chiếu'}),
  Object.freeze({id:'keeper',name:'Người Gác Tinh Quang',group:'Nhiệm vụ',
   kind:'TƯỢNG KỶ NIỆM',rarity:'Sử thi',
   story:'Phác thảo tượng cho một chuỗi nhiệm vụ đặc biệt trong tương lai.',
   image:ART+'statue-starkeeper.webp',action:'quests',label:'Xem Nhiệm vụ'}),
  Object.freeze({id:'obelisk',name:'Trụ Tinh Vân',group:'Thành tựu',
   kind:'TƯỢNG VINH DANH',rarity:'Huyền thoại',
   story:'Mẫu bảo vật bằng hắc diện thạch, dành cho những cột mốc chinh phục.',
   image:ART+'obelisk-nebula.webp',action:'honors',label:'Sổ Vinh Danh'}),
  Object.freeze({id:'frame',name:'Khung Vệt Sao',group:'Khung quà',
   kind:'KHUNG TRƯNG BÀY',rarity:'Sử thi',
   story:'Mẫu khung kỷ niệm có lõi trong suốt, chưa gắn vào hệ trang bị.',
   image:ART+'frame-astral.webp',action:null,label:null})
 ]);
 const el=(tag,cls,label)=>{
  const node=root.document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined)node.textContent=String(label);
  return node;
 };
 let host=null,owner='',sandboxMode=false,active='gallery',selected='s01';
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
  img.src=item.image;img.alt='Minh họa '+item.name;
  img.className='museum-c426-art'+(item.id==='frame'?' is-frame':'');
  stage.querySelector('.museum-c426-kind').textContent=item.kind;
  const detail=host.querySelector('.museum-c426-detail');
  detail.querySelector('.museum-c426-rarity').textContent=item.group+' · '+item.rarity;
  detail.querySelector('strong').textContent=item.name;
  detail.querySelector('p').textContent=item.story;
  const action=detail.querySelector('.museum-c426-action');
  if(item.action){action.hidden=false;action.textContent=item.label;
   action.onclick=()=>openSource(item);
  }else{action.hidden=true;action.onclick=null;}
  for(const button of host.querySelectorAll('.museum-c426-select')){
   const on=button.dataset.exhibit===item.id;
   button.classList.toggle('is-active',on);
   button.setAttribute('aria-pressed',String(on));
  }
 }
 function switchTab(id){
  if(!['gallery','owned','memories'].includes(id))return;
  active=id;
  for(const tab of host?.querySelectorAll('.museum-c426-tab')||[]){
   const on=tab.dataset.tab===id;
   tab.setAttribute('aria-selected',String(on));tab.classList.toggle('is-active',on);
  }
  for(const panel of host?.querySelectorAll('[data-museum-panel]')||[])
   panel.hidden=panel.dataset.museumPanel!==id;
 }
 function build(){
  host.replaceChildren();host.classList.add('museum-c426-root');
  const head=el('div','museum-c426-head');
  head.append(el('span','','✦ BẢO TÀNG LƯU QUANG'),
   el('strong','museum-c426-ledger','Sổ sở hữu chưa xác minh'));
  host.append(head);
  const nav=el('nav','museum-c426-tabs');nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Khu vực bảo tàng');
  for(const [id,label] of [['gallery','Đại sảnh'],['owned','Kho của tôi'],['memories','Kỷ niệm']]){
   const tab=el('button','museum-c426-tab',label);tab.type='button';
   tab.dataset.tab=id;tab.setAttribute('role','tab');tab.id='museum-c426-tab-'+id;
   tab.setAttribute('aria-controls','museum-c426-panel-'+id);
   tab.addEventListener('click',()=>switchTab(id));nav.append(tab);
  }
  host.append(nav);
  const gallery=el('section','museum-c426-gallery');gallery.id='museum-c426-panel-gallery';
  gallery.dataset.museumPanel='gallery';gallery.setAttribute('role','tabpanel');
  gallery.setAttribute('aria-labelledby','museum-c426-tab-gallery');
  const stage=el('div','museum-c426-stage');
  stage.append(el('div','museum-c426-glow'),el('span','museum-c426-eyebrow','◌ BẢN PHÁC THẢO · CHƯA PHÁT HÀNH'));
  const illustration=el('img','museum-c426-art');
  illustration.decoding='async';illustration.loading='eager';
  stage.append(illustration,el('span','museum-c426-kind'));
  gallery.append(stage);
  const detail=el('div','museum-c426-detail');detail.setAttribute('aria-live','polite');
  const copy=el('div','museum-c426-copy');
  copy.append(el('span','museum-c426-rarity'),el('strong',''),el('p',''));
  const action=el('button','museum-c426-action');action.type='button';
  detail.append(copy,action);gallery.append(detail);
  const collection=el('div','museum-c426-collection');
  collection.setAttribute('role','group');collection.setAttribute('aria-label','Chọn vật phẩm trưng bày thử');
  for(const exhibit of exhibits){
   const button=el('button','museum-c426-select');button.type='button';
   button.dataset.exhibit=exhibit.id;button.setAttribute('aria-label','Xem mẫu '+exhibit.name);
   const portrait=el('img','');portrait.src=exhibit.image;
   portrait.alt='';portrait.loading='lazy';portrait.decoding='async';
   button.append(portrait,el('small','',exhibit.group));
   button.addEventListener('click',()=>choose(exhibit.id));collection.append(button);
  }
  gallery.append(collection);
  gallery.append(el('p','museum-c426-disclaimer',
   '4 mẫu mỹ thuật để định hình quà tương lai. Chưa tạo vật phẩm, chưa phát thưởng hay mở khóa.'));
  host.append(gallery);
  const owned=el('section','museum-c426-owned');owned.id='museum-c426-panel-owned';
  owned.dataset.museumPanel='owned';owned.setAttribute('role','tabpanel');
  owned.setAttribute('aria-labelledby','museum-c426-tab-owned');
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
  if(changed){owner=ownerKey;sandboxMode=!!sandbox;active='gallery';selected='s01';
   build();host.classList.add('museum-c426-root-ready');}
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
    el('p','','Kỷ vật thật sẽ xuất hiện khi được xác nhận ở máy chủ. Mẫu Đại sảnh không tính là đã sở hữu.'));
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
 root.DuduMuseumVaultC426=Object.freeze({init,updateVerified,exhibits});
})(typeof window!=='undefined'?window:{});
