/* DUDU V37 — featured anime wallpapers in V35 gallery; sandbox only. */
(function(){
'use strict';
const ITEMS=[
  {id:'v37-sakura',label:'Thung lũng hoa',note:'Rực rỡ sắc xuân'},
  {id:'v37-city-rain',label:'Phố đêm',note:'Ánh đèn và mưa'},
  {id:'v37-city-night',label:'Đô thị neon',note:'Thành phố lúc khuya'}
];
function init(){
 if(!document.body.classList.contains('dudu-phone-v11'))return;
 const tabs=document.querySelector('.dudu-v35-gallery-tabs');
 const panels=document.querySelector('.dudu-v35-gallery-panels');
 const open=document.getElementById('dudu-v34-open');
 if(!tabs||!panels||!open||document.getElementById('dudu-v37-anime-panel'))return;
 const tab=document.createElement('button');tab.type='button';
 tab.textContent='Tranh anime';tab.dataset.duduV35TabButton='anime';
 tab.setAttribute('aria-pressed','false');
 tab.addEventListener('click',()=>{
   tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));
   panels.querySelectorAll('[data-dudu-v35-tab]').forEach(p=>p.hidden=p.dataset.duduV35Tab!=='anime');
   const scroll=document.querySelector('.dudu-v34-scroll');if(scroll)scroll.scrollTop=0;
 });
 const legacy=tabs.querySelector('[data-dudu-v35-tab-button="legacy"]');
 if(legacy)legacy.before(tab);else tabs.append(tab);
 const panel=document.createElement('section');panel.id='dudu-v37-anime-panel';
 panel.className='dudu-v35-gallery-panel dudu-v37-gallery-panel';
 panel.dataset.duduV35Tab='anime';panel.hidden=true;
 const h=document.createElement('h3');h.textContent='Tranh nền anime';
 const p=document.createElement('p');p.textContent='Tranh dọc sắc nét, được tối ưu cho giao diện điện thoại.';
 const grid=document.createElement('div');grid.className='dudu-v37-gallery-grid';
 ITEMS.forEach(item=>{
   const b=document.createElement('button');b.type='button';
   b.className='dudu-v37-choice';b.dataset.duduWallpaperChoice=item.id;
   b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Đặt hình nền '+item.label);
   const thumb=document.createElement('span');thumb.className='dudu-v37-thumb';thumb.setAttribute('aria-hidden','true');
   const copy=document.createElement('span');copy.className='dudu-v37-caption';
   const name=document.createElement('strong');name.textContent=item.label;
   const note=document.createElement('small');note.textContent=item.note;copy.append(name,note);
   b.append(thumb,copy);
   b.addEventListener('click',()=>{
     if(typeof window.setPhoneWallpaperV27!=='function')return;
     window.setPhoneWallpaperV27(item.id);
     window.DuduWallpaperGalleryV34?.sync?.();
     window.DuduWallpaperGalleryV34?.close?.();
   });
   grid.append(b);
 });
 panel.append(h,p,grid);
 panels.prepend(panel);
 open.addEventListener('click',()=>{tab.click();},{passive:true});
 document.querySelectorAll('[data-dudu-wallpaper-choice]').forEach(b=>{if(b.classList.contains('dudu-v37-choice'))return;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
