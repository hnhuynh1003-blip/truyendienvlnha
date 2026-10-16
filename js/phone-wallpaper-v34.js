/* DUDU V34 — compact settings card and opt-in wallpaper gallery.
 * Reuses V27's scoped local preferences and existing selectors, no Firebase writes.
 */
(function(){
'use strict';
const $=(id)=>document.getElementById(id);
let open=false,returnFocus=null;
function init(){
 if(!document.body.classList.contains('dudu-phone-v11'))return;
 const phone=$('cyber-phone'),settings=$('phone-app-settings');
 const section=settings?.querySelector('.dudu-v27-wallpaper-picker');
 if(!phone||!section||$('dudu-v34-open'))return;
 const current=document.createElement('div');current.className='dudu-v34-current';
 const art=document.createElement('span');art.className='dudu-v34-current-art';art.setAttribute('aria-hidden','true');
 const meta=document.createElement('div');meta.className='dudu-v34-current-meta';
 const name=document.createElement('strong');name.id='dudu-v34-current-name';
 const description=document.createElement('small');description.textContent='Đổi nền mà không thay đổi dữ liệu tài khoản.';
 const plus=document.createElement('button');plus.type='button';plus.id='dudu-v34-open';
 const plusIcon=document.createElement('span');plusIcon.className='dudu-v34-plus';plusIcon.setAttribute('aria-hidden','true');
 plus.append(plusIcon,document.createTextNode('Chọn hình nền'));
 plus.addEventListener('click',show);
 meta.append(name,description,plus);current.append(art,meta);
 section.querySelector('h3')?.after(current);
 const overlay=document.createElement('div');overlay.className='dudu-v34-overlay';overlay.id='dudu-v34-overlay';
 overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Thư viện hình nền điện thoại');
 const sheet=document.createElement('div');sheet.className='dudu-v34-sheet';
 const header=document.createElement('div');header.className='dudu-v34-heading';
 const title=document.createElement('strong');title.textContent='Hình nền điện thoại';
 const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='dudu-v34-close';
 closeButton.textContent='×';closeButton.setAttribute('aria-label','Đóng thư viện hình nền');closeButton.addEventListener('click',hide);
 header.append(title,closeButton);
 const scroll=document.createElement('div');scroll.className='dudu-v34-scroll';
 const heading=(name)=>{const h=document.createElement('div');h.className='dudu-v34-category';h.textContent=name;scroll.append(h);};
 heading('Hình nền sắc nét mới');
 const newGrid=document.createElement('div');newGrid.className='dudu-v34-new-grid';newGrid.setAttribute('role','group');newGrid.setAttribute('aria-label','Bộ hình nền minh họa sắc nét');
 const newChoices=[['v34-night','Ngân hà đêm'],['v34-room','Phòng nhỏ'],['v34-sakura','Lối hoa đào'],['v34-neon','Thành phố neon']];
 newChoices.forEach(([id,label])=>{
  const b=document.createElement('button');b.type='button';b.className='dudu-v34-new-choice';
  b.dataset.duduWallpaperChoice=id;b.setAttribute('aria-pressed','false');
  const preview=document.createElement('span');preview.className='dudu-v34-thumb';preview.setAttribute('aria-hidden','true');
  const text=document.createElement('span');text.textContent=label;b.append(preview,text);
  b.addEventListener('click',()=>{if(typeof window.setPhoneWallpaperV27==='function')window.setPhoneWallpaperV27(id);sync();hide();});
  newGrid.append(b);
 });
 scroll.append(newGrid);
 heading('Bộ nền có sẵn');
 const oldGrid=section.querySelector('.dudu-v27-wallpaper-grid');if(oldGrid)scroll.append(oldGrid);
 heading('Thế giới truyện');
 const worldGrid=section.querySelector('.dudu-v29-world-gallery');if(worldGrid)scroll.append(worldGrid);
 const mode=section.querySelector('.dudu-v28-mode'),info=$('dudu-v28-active-world');
 if(mode)scroll.append(mode);
 if(info)scroll.append(info);
 const note=document.createElement('p');note.className='dudu-v34-note';
 note.textContent='Nền được lưu riêng theo tài khoản trên thiết bị. Đổi nền không thay đổi nội dung truyện hay tin nhắn.';
 scroll.append(note);
 sheet.append(header,scroll);overlay.append(sheet);phone.append(overlay);
 scroll.addEventListener('click',event=>{
  const btn=event.target.closest('[data-dudu-wallpaper-choice]');
  if(btn&&!btn.classList.contains('dudu-v34-new-choice')){
   // Legacy choices use their existing inline handlers.
   Promise.resolve().then(()=>{sync();hide();});
  }else if(event.target.closest('[data-wallpaper-mode]')){
   Promise.resolve().then(sync);
  }
 });
 overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
 overlay.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();hide();return;}
  if(e.key==='Tab'){
   const focusable=Array.from(overlay.querySelectorAll('button:not(:disabled)')).filter(b=>b.getClientRects().length);
   const first=focusable[0],last=focusable[focusable.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 sync();
}
function sync(){
 const preview=$('dudu-v34-current-name');if(!preview)return;
 const id=document.body.dataset.duduPhoneWallpaper||'midnight';
 const presets=window.DuduPhoneWallpaperV27?.PRESETS||[];
 const selected=presets.find(p=>p.id===id);
 preview.textContent=selected?.name||'Hình nền đang dùng';
 const btns=document.querySelectorAll('#dudu-v34-overlay [data-dudu-wallpaper-choice]');
 btns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.duduWallpaperChoice===id)));
}
function show(){
 const modal=$('dudu-v34-overlay');if(!modal)return;
 returnFocus=document.activeElement;open=true;
 modal.hidden=false;modal.setAttribute('aria-hidden','false');sync();
 modal.querySelector('.dudu-v34-close')?.focus();
}
function hide(){
 const modal=$('dudu-v34-overlay');if(!modal)return;
 modal.hidden=true;modal.setAttribute('aria-hidden','true');open=false;
 if(returnFocus?.isConnected)returnFocus.focus();
 returnFocus=null;sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.DuduWallpaperGalleryV34={open:show,close:hide,sync};
})();