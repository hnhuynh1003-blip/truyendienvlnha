/* DUDU V44.3.1 — accessible, searchable Sandbox gift chooser.
 * Hosted in <body> so reading layouts cannot clip or stretch the picker.
 * This view never mutates inventory, never contacts any gift server.
 */
(function(root){
 'use strict';
 let active=null;
 const $=(tag,cls,text)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(text!==undefined)x.textContent=String(text);
  return x;
 };
 function open({choices=[],selectedInstanceId=null,onChoose,onClose}={}){
  if(typeof document==='undefined'||!root.DuduGiftPickerModelV4431)return null;
  active?.close();
  const engine=root.DuduGiftPickerModelV4431,rows=engine.groups(choices);
  if(!rows.length)return null;
  let mode='ALL',query='',visible=8,selected=engine.selection(rows,selectedInstanceId);
  const priorFocus=document.activeElement;
  const mask=$('div','dudu-v4431-overlay');
  const dialog=$('section','dudu-v4431-dialog');
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','dudu-v4431-title');
  dialog.tabIndex=-1;
  const header=$('div','dudu-v4431-header');
  const heading=$('div','dudu-v4431-heading');
  const title=$('strong','','🎁 Chọn quà đính kèm');
  title.id='dudu-v4431-title';
  heading.append(title,$('small','','Chọn từ Kho · gửi một món / bình luận'));
  const closeBtn=$('button','dudu-v4431-close','×');
  closeBtn.type='button';closeBtn.setAttribute('aria-label','Đóng chọn quà');
  header.append(heading,closeBtn);
  const searchWrap=$('div','dudu-v4431-search-wrap');
  const search=$('input','dudu-v4431-search');
  search.type='search';search.placeholder='Tìm tên hoặc mã vật phẩm…';
  search.autocomplete='off';search.setAttribute('aria-label','Tìm kiếm quà');
  searchWrap.append($('span','','⌕'),search);
  const categories=$('div','dudu-v4431-filters');
  categories.setAttribute('role','group');
  categories.setAttribute('aria-label','Lọc vật phẩm để tặng');
  const results=$('div','dudu-v4431-results');
  results.setAttribute('aria-live','polite');
  const grid=$('div','dudu-v4431-grid');
  const more=$('button','dudu-v4431-more','Xem thêm');
  more.type='button';
  const scroll=$('div','dudu-v4431-scroll');
  scroll.append(grid,more);
  const preview=$('div','dudu-v4431-preview');
  const detail=$('div','dudu-v4431-preview-detail');
  const foot=$('div','dudu-v4431-footer');
  const cancel=$('button','dudu-v4431-cancel','Hủy');
  const apply=$('button','dudu-v4431-apply','Gắn vào bình luận');
  cancel.type=apply.type='button';
  foot.append(cancel,apply);
  const legal=$('small','dudu-v4431-legal',
   'Chỉ trừ 1 món khi đăng bình luận Sandbox. Không gửi tới tác giả thật.');
  preview.append(detail,foot,legal);
  const count=$('small','dudu-v4431-count');
  results.append(count);
  const intro=$('div','dudu-v4431-intro');
  intro.append($('span','','📚 Chỉ hiển thị quà phù hợp truyện/chương này'));
  dialog.append(header,searchWrap,categories,intro,results,scroll,preview);
  mask.append(dialog);document.body.append(mask);
  let closed=false;
  const onKey=e=>{
   if(e.key==='Escape'){e.preventDefault();close();return}
   if(e.key!=='Tab')return;
   const candidates=[...dialog.querySelectorAll(
    'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')]
    .filter(x=>x.getClientRects().length>0);
   if(!candidates.length)return;
   const first=candidates[0],last=candidates[candidates.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  };
  document.addEventListener('keydown',onKey);
  function close(){
   if(closed)return;
   closed=true;document.removeEventListener('keydown',onKey);
   mask.remove();
   if(active?.close===close)active=null;
   if(priorFocus?.isConnected&&priorFocus.focus)priorFocus.focus({preventScroll:true});
   onClose?.();
  }
  function drawPreview(){
   detail.replaceChildren();
   if(!selected){
    detail.append($('div','dudu-v4431-preview-icon','🎁'),
     $('div','dudu-v4431-preview-text','Chọn một món trong danh sách'));
   }else{
    const icon=$('div','dudu-v4431-preview-icon',selected.icon);
    const content=$('div','dudu-v4431-preview-text');
    content.append($('strong','',selected.name),
     $('small','','Số lượng trong Kho: ×'+selected.count+
      ' · Sẽ sử dụng 1 món khi đăng'));
    detail.append(icon,content);
   }
   apply.disabled=!selected;
  }
  function drawFilters(){
   categories.replaceChildren();
   for(const filter of engine.MODES){
    const button=$('button','dudu-v4431-chip'+(mode===filter.id?' active':''),
     filter.label);
    button.type='button';button.dataset.filter=filter.id;
    button.setAttribute('aria-pressed',String(mode===filter.id));
    button.addEventListener('click',()=>{
     mode=filter.id;visible=8;drawFilters();drawList();
    });
    categories.append(button);
   }
  }
  function drawList(){
   const filtered=engine.filter(rows,{mode,query});
   grid.replaceChildren();
   const total=filtered.reduce((sum,row)=>sum+row.count,0);
   count.textContent=filtered.length+' loại · '+total+' vật phẩm phù hợp';
   for(const row of filtered.slice(0,visible)){
    const card=$('button','dudu-v4431-card'+
     (selected?.id===row.id?' selected':''));card.type='button';
    card.dataset.itemId=row.id;
    card.setAttribute('aria-pressed',String(selected?.id===row.id));
    const art=$('span','dudu-v4431-art',row.icon);
    const info=$('span','dudu-v4431-info');
    info.append($('strong','',row.name),
     $('small','',row.rank+' · '+(row.scope==='COMMON'?'Phổ thông':
      row.scope==='REALM'?'Theo thế giới':'Vật phẩm truyện')));
    const qty=$('span','dudu-v4431-qty','×'+row.count);
    card.append(art,info,qty);
    card.addEventListener('click',()=>{
     selected=row;drawList();drawPreview();
    });
    grid.append(card);
   }
   if(!filtered.length){
    grid.append($('p','dudu-v4431-empty','Không tìm thấy món phù hợp. Thử tên khác hoặc đổi bộ lọc.'));
   }
   more.hidden=filtered.length<=visible;
   if(!more.hidden)more.textContent='Xem thêm · còn '+(filtered.length-visible)+' loại';
  }
  search.addEventListener('input',()=>{query=search.value;visible=8;drawList()});
  more.addEventListener('click',()=>{visible+=8;drawList()});
  apply.addEventListener('click',()=>{
   if(!selected)return;
   const itemId=selected.instanceId;
   close();onChoose?.(itemId,selected);
  });
  closeBtn.addEventListener('click',close);
  cancel.addEventListener('click',close);
  mask.addEventListener('click',e=>{if(e.target===mask)close()});
  drawFilters();drawList();drawPreview();
  search.focus({preventScroll:true});
  active={close};
  return {close};
 }
 function closeActive(){active?.close();}
 root.DuduGiftPickerV4431=Object.freeze({open,closeActive});
})(typeof window!=='undefined'?window:{});
