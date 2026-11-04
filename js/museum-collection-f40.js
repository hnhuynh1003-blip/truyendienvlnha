/* F4.0 — read-only historical museum. No inventory, wallet or reward writes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduMuseumF40=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const REALMS=Object.freeze({ORIGIN:'Khởi Nguyên',PALEO:'Cổ Sinh Bí Cảnh',
 CULTIVATION:'Tiên Hiệp Thần Binh',CYBER:'Cyberpunk 2099',WASTELAND:'Tận Thế Di Vật',
 ANIME:'Điện Phủ Nhân Vật',DREAM:'Mộng Cảnh Búp Bê',GARDEN:'Thần Nông Dị Quả',COSMOS:'Tinh Hà Vạn Tượng'});
 const RARE=['S','SS','SSS'];
 const STORIES={FIGURE:'Một dáng hình được lưu giữ từ truyền thuyết dị giới.',FOSSIL:'Dấu tích của sinh linh đã ngủ yên qua vô số kỷ nguyên.',WEAPON:'Bảo vật mang dấu ấn của những trận chiến xa xưa.',LUCK_CARD:'Kỷ vật giữ một lời hẹn với vận mệnh giữa muôn vàn tinh hệ.',BACKGROUND:'Một khung cảnh kỳ diệu được lưu giữ từ hành trình xuyên giới.'};
 let dismiss=null;
 function close(){if(dismiss)dismiss();dismiss=null;}
 function snapshot(catalog,album){
  const items=(catalog?.funVantVat||[]).filter(x=>x.collectionSet==='VAN_VAT');
  const ids=new Set(Array.isArray(album)?album:[]);
  return Object.keys(REALMS).filter(id=>items.some(x=>x.funRealm===id)).map(id=>{
   const all=items.filter(x=>x.funRealm===id),rare=all.filter(x=>RARE.includes(x.rank));
   const found=rare.filter(x=>ids.has(x.id));
   return {id,name:REALMS[id],items:rare,found,total:rare.length,count:found.length,
    explored:all.some(x=>ids.has(x.id)),complete:rare.length>0&&found.length===rare.length};
  });
 }
 function mount(root,container,result){
  close();container.replaceChildren();
  const doc=root.document,el=(tag,cls,text)=>{
   const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
  };
  const groups=snapshot(root.DuduItemCatalog,result?.state?.album);
  const album=new Set(groups.flatMap(g=>g.found.map(x=>x.id)));
  const total=groups.reduce((n,g)=>n+g.total,0),count=album.size;
  const heading=el('div','museum-vantvat-head');
  heading.append(el('strong','','✦ BÁCH GIỚI TÀNG PHẨM'),el('span','',count+'/'+total+' BẢO VẬT HIẾM'));
  container.append(heading);
  const overview=el('p','museum-f40-overview',groups.filter(g=>g.explored).length+'/'+groups.length+
   ' vị diện đã khám phá · '+groups.filter(g=>g.complete).length+' bộ hiếm hoàn thành');container.append(overview);
  const label=el('label','museum-f40-filter','Vị diện');
  const filter=el('select','');filter.setAttribute('aria-label','Lọc bảo vật theo vị diện');
  const option=el('option','','Tất cả bảo vật hiếm');option.value='ALL';filter.append(option);
  for(const g of groups){const o=el('option','',g.name+' · '+g.count+'/'+g.total);o.value=g.id;filter.append(o);}
  label.append(filter);container.append(label);
  const progress=el('div','museum-f40-realms');container.append(progress);
  const shelf=el('div','museum-f40-shelf');container.append(shelf);
  function art(node,item){if(!root.DuduItemArtV13?.mount?.(node,item))node.textContent=item.icon||'✦';}
  function inspect(item,trigger){
   close();
   const dialog=el('dialog','museum-f40-dialog rank-'+item.rank.toLowerCase());
   dialog.setAttribute('aria-label',item.name);
   const exit=el('button','museum-f40-close','×');exit.type='button';exit.setAttribute('aria-label','Đóng xem bảo vật');
   const image=el('div','museum-f40-large');art(image,item);
   dialog.append(exit,image,el('small','','HẠNG '+item.rank+' · '+REALMS[item.funRealm]),
    el('h3','',item.name),el('p','',STORIES[item.funCategory]||item.description||item.desc),
    el('p','museum-f40-record','✓ Đã từng sưu tầm'),
    el('small','','Kỷ lục sưu tầm được giữ lại cả sau khi bán.'));
   const cleanup=()=>{dialog.remove();if(dismiss===cleanup)dismiss=null;trigger?.focus?.();};
   dismiss=cleanup;exit.addEventListener('click',close);
   dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
   dialog.addEventListener('close',cleanup);
   dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
   container.append(dialog);dialog.showModal();exit.focus();
  }
  function draw(){
   close();progress.replaceChildren();shelf.replaceChildren();
   const selected=filter.value||'ALL';
   for(const g of groups.filter(g=>selected==='ALL'||g.id===selected)){
    const tile=el('section','museum-f40-realm'+(g.complete?' is-complete':''));tile.dataset.realm=g.id;
    const title=el('strong','',g.name);const score=el('span','',g.count+'/'+g.total);
    const state=g.total===0?'Chưa có bảo vật hạng S–SSS':g.complete?'✦ Hoàn thành bộ bảo vật hiếm':
     g.count===0?'Chưa khám phá bảo vật hiếm':'Đang sưu tập';
    const bar=el('progress','');bar.max=Math.max(1,g.total);bar.value=g.count;
    bar.setAttribute('aria-label',g.name+' — '+g.count+'/'+g.total+' bảo vật hiếm');
    tile.append(title,score,bar,el('small','',state));
    if(g.complete){const badge=el('span','museum-f40-badge','✧ Dấu ấn '+g.name);tile.append(badge);}
    progress.append(tile);
   }
   const items=groups.filter(g=>selected==='ALL'||g.id===selected).flatMap(g=>g.items)
    .sort((a,b)=>RARE.indexOf(b.rank)-RARE.indexOf(a.rank)||a.name.localeCompare(b.name,'vi'));
   const grid=el('div','museum-vantvat-grid'),missing=el('div','museum-vantvat-grid');
   for(const item of items){const found=album.has(item.id);
    const card=el(found?'button':'div','museum-vantvat-card rank-'+item.rank.toLowerCase()+(found?' is-owned':' is-locked'));
    card.dataset.itemId=item.id;const image=el('span','museum-vantvat-mini');
    if(found){card.type='button';art(image,item);card.setAttribute('aria-label','Ngắm '+item.name);
     card.addEventListener('click',()=>inspect(item,card));}else{image.textContent='?';card.setAttribute('aria-label','Bảo vật hạng '+item.rank+' chưa khám phá');}
    card.append(image,el('b','',item.rank),el('small','',found?item.name:'Chưa khám phá'));
    (found?grid:missing).append(card);
   }
   if(grid.children.length)shelf.append(grid);
   else shelf.append(el('p','museum-vantvat-empty',items.length?'Chưa tìm thấy bảo vật hiếm ở kệ này.':'Vị diện này chưa có bảo vật hạng S–SSS.'));
   if(missing.children.length){const details=el('details','museum-vantvat-unfound');
    details.append(el('summary','','Chưa khám phá · '+missing.children.length),missing);shelf.append(details);}
  }
  filter.addEventListener('change',draw);draw();
  const go=el('button','museum-vantvat-go','✦ Đến vòng quay');go.type='button';
  go.onclick=()=>{close();root.DuduFunUIV43?.showVantVat?.();};container.append(go);
 }
 return Object.freeze({REALMS,snapshot,mount,close});
});
