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
 let pageSize=24,last=null;
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
  for(const story of stories||[]){
   if(story?.id&&typeof story.id==='string')ids.set(story.id,String(story.title||story.id));
  }
  for(const item of Array.isArray(inventory)?inventory:[]){
   const sid=model.inspect(item)?.storyId;
   if(sid&&!ids.has(sid))ids.set(sid,sid);
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
 function inspector({detail,entry,args}){
  const panel=$('inventory-v12-detail');if(!panel)return;
  panel.replaceChildren();
  panel.classList.remove('dudu-v42-detail-open');
  if(!detail){panel.style.display='none';return;}
  const head=make('div','dudu-v42-inspector-head');
  const {container:icon}=artwork(detail,args.art);
  icon.classList.add('dudu-v42-large-art');
  const info=make('div','dudu-v42-inspector-info');
  const title=make('strong','dudu-v42-inspector-name',detail.name);
  const sub=make('small','',detail.rank+' · '+detail.categoryLabel+' · '+detail.worldLabel);
  const id=make('code','dudu-v42-code',detail.id||'legacy-unknown');
  info.append(title,sub,id);
  const close=make('button','dudu-v42-close','×');close.type='button';
  close.setAttribute('aria-label','Đóng chi tiết vật phẩm');
  close.addEventListener('click',()=>args.onClose());
  head.append(icon,info,close);
  const desc=make('p','dudu-v42-inspector-desc',detail.description);
  const facts=make('div','dudu-v42-inspector-facts');
  function fact(key,value){
   const row=make('div','dudu-v42-fact');
   row.append(make('span','',key),make('strong','',value));facts.append(row);
  }
  fact('Phẩm chất',detail.rank);
  fact('Nguồn',detail.scope==='DUDU'?'Kỷ vật hệ thống':
    detail.scope==='REALM'?'Vật phẩm thế giới':
    detail.scope==='COMMON'?'Vật phẩm phổ thông':
    detail.scope==='LEGACY'?'Đồ cũ được bảo lưu':
    detail.scope==='STORY'||detail.scope==='CHAPTER'?'Vật phẩm tác giả':'Dữ liệu cũ / cửa hàng');
  if(detail.storyId){
   const novel=(args.stories||[]).find(x=>x?.id===detail.storyId);
   fact('Truyện',novel?.title||detail.storyId);
  }
  if(detail.chapterId)fact('Chương (ID)',detail.chapterId);
  fact('Chức năng RPG','Chưa kích hoạt trong V42');
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
  if(detail.scope==='DUDU'&&typeof args.onMuseum==='function'){
   const museum=make('button','btn dudu-v42-museum','Xem Bảo Tàng');
   museum.type='button';museum.addEventListener('click',()=>args.onMuseum());
   footer.append(museum);
  }
  if(!detail.protected){
   const discard=make('button','btn btn-danger dudu-v42-discard','Vứt vật phẩm');
   discard.type='button';
   discard.addEventListener('click',()=>{
    if(!Array.isArray(args.inventory)||args.inventory[entry.index]!==entry.item)return;
    if(!confirm('Vứt '+detail.name+' khỏi hành trang?'))return;
    args.onDiscard(entry.index);
   });
   footer.append(discard);
  }
  panel.append(head,desc,facts,footer);
  panel.style.display='block';
  panel.classList.add('dudu-v42-detail-open');
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
  const result=model.list(args.inventory,options);
  const all=model.list(args.inventory,{...options,category:'ALL',query:'',rank:'ALL',
    realm:'ALL',storyId:'ALL',limit:1}).total;
  const count=$('inventory-v2-count');
  if(count)count.textContent='Hiện '+result.entries.length+'/'+result.total+
   ' · Sở hữu '+all+' vật phẩm';
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
  const current=result.entries.find(row=>row.item===args.selected)||null;
  for(const entry of result.entries){
   const detail=entry.detail;
   const slot=make('button','item-card dudu-inventory-v12-row dudu-inventory-v12-open dudu-v27-inventory-slot dudu-v42-slot');
   slot.type='button';slot.dataset.inventoryIndex=String(entry.index);
   slot.dataset.rarity=detail.rank;slot.dataset.category=detail.category;
   const selected=current?.item===entry.item;
   slot.classList.toggle('is-selected',selected);
   slot.setAttribute('aria-label','Xem chi tiết '+detail.name);
   slot.setAttribute('aria-expanded',String(selected));
   slot.setAttribute('aria-controls','inventory-v12-detail');
   const art=artwork(detail,args.art);
   slot.style.setProperty('--rarity-glow',art.color);
   const badge=make('span','dudu-v27-slot-rarity',detail.rank);
   const label=make('span','dudu-v27-slot-name',detail.name);
   slot.append(art.container,badge,label);
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
  const panel=$('inventory-v12-detail');
  if(panel){panel.replaceChildren();panel.classList.remove('dudu-v42-detail-open');panel.style.display='none';}
 }
 return Object.freeze({render,reset,more,chooseCategory,close,filters});
});
