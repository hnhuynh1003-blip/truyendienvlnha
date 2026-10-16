/* DUDU V35 — settings information architecture, no save-schema changes. */
(function(){
 'use strict';
 const q=(s,p=document)=>p.querySelector(s);
 function tag(name,cls,text){
  const el=document.createElement(name);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;
  return el;
 }
 function accordion(section,title,description,icon){
  if(!section||section.closest('.dudu-v35-accordion'))return null;
  const wrapper=tag('details','dudu-v35-accordion');
  const summary=tag('summary','dudu-v35-summary');
  const emblem=tag('span','dudu-v35-emblem',icon);emblem.setAttribute('aria-hidden','true');
  const copy=tag('span','dudu-v35-summary-copy');
  copy.append(tag('strong','',title),tag('small','',description));
  const chevron=tag('span','dudu-v35-chevron','⌄');chevron.setAttribute('aria-hidden','true');
  summary.append(emblem,copy,chevron);
  const body=tag('div','dudu-v35-detail-body');
  section.before(wrapper);body.append(section);wrapper.append(summary,body);
  return wrapper;
 }
 function organize(){
  const app=document.getElementById('phone-app-settings');
  if(!document.body.classList.contains('dudu-phone-v11')||!app||app.dataset.duduV35Settings==='1')return;
  const head=q('.phone-app-header',app), wallpaper=q('.dudu-v27-wallpaper-picker',app);
  const reading=q('section[aria-labelledby="dudu-v27-reading-title"]',app);
  const typeface=q('section[aria-labelledby="dudu-v31-font-heading"]',app);
  if(!head||!wallpaper||!reading||!typeface)return;
  app.dataset.duduV35Settings='1';
  const eyebrow=tag('div','dudu-v35-eyebrow','GIAO DIỆN & CÁ NHÂN HÓA');
  head.after(eyebrow);
  eyebrow.after(wallpaper);
  const heading=q('h3',wallpaper);
  if(heading)heading.textContent='Hình nền';
  const current=q('.dudu-v34-current',wallpaper);
  if(current){
    current.classList.add('dudu-v35-wallpaper-preview');
    const description=q('.dudu-v34-current-meta small',current);
    if(description)description.textContent='Chạm để khám phá bộ sưu tập';
    const open=q('#dudu-v34-open',current);
    if(open){open.setAttribute('aria-label','Mở thư viện hình nền');open.lastChild.textContent=' Thay đổi';}
  }
  const readingBlock=accordion(reading,'Đọc truyện','Cỡ chữ, chế độ sáng tối','Aa');
  const fontBlock=accordion(typeface,'Kiểu chữ điện thoại','Font chữ và kích cỡ','Tt');
  if(fontBlock&&readingBlock)readingBlock.after(fontBlock);
  if(readingBlock)wallpaper.after(readingBlock);
  const tools=document.getElementById('dudu-v27-tools');
  if(tools){
    tools.classList.add('dudu-v35-accordion','dudu-v35-tools');
    const summ=q('summary',tools);
    if(summ){
      summ.replaceChildren();
      const icon=tag('span','dudu-v35-emblem','⚙');icon.setAttribute('aria-hidden','true');
      const copy=tag('span','dudu-v35-summary-copy');
      copy.append(tag('strong','','Công cụ nâng cao'),tag('small','','Kết nối NPC, sao lưu hội thoại'));
      const arrow=tag('span','dudu-v35-chevron','⌄');arrow.setAttribute('aria-hidden','true');
      summ.append(icon,copy,arrow);
      summ.className='dudu-v35-summary';
    }
  }
 }
 function organizeGallery(){
  const modal=document.getElementById('dudu-v34-overlay');
  const sheet=q('.dudu-v34-sheet',modal||document);
  const scroll=q('.dudu-v34-scroll',sheet||document);
  if(!modal||!sheet||!scroll||modal.dataset.duduV35Gallery==='1')return;
  const oldGrid=q('.dudu-v27-wallpaper-grid',scroll);
  const newGrid=q('.dudu-v34-new-grid',scroll);
  const worldGrid=q('.dudu-v29-world-gallery',scroll);
  if(!oldGrid||!newGrid||!worldGrid)return;
  modal.dataset.duduV35Gallery='1';
  // Preserve existing onclick bindings, local storage, and V28 world mode.
  const panels=tag('div','dudu-v35-gallery-panels');
  const makePanel=(id,heading,description)=>{
   const panel=tag('section','dudu-v35-gallery-panel');
   panel.dataset.duduV35Tab=id;
   panel.append(tag('h3','',heading),tag('p','',description));
   panels.append(panel);return panel;
  };
  const calm=makePanel('calm','Nền màu thanh lịch','Không bị vỡ hình. Ưu tiên sự tinh giản và dễ nhìn.');
  const world=makePanel('world','Theo thế giới truyện','Dành cho hình nền tự thay đổi theo thể loại truyện.');
  const legacy=makePanel('legacy','Mẫu thử V34','Giữ lại để không mất lựa chọn cũ; không phải bộ tranh anime chính thức.');
  calm.append(oldGrid);legacy.append(newGrid);world.append(worldGrid);
  const mode=q('.dudu-v28-mode',scroll),info=q('#dudu-v28-active-world',scroll);
  if(mode)world.append(mode);
  if(info)world.append(info);
  [...scroll.querySelectorAll('.dudu-v34-category')].forEach(n=>n.remove());
  const note=q('.dudu-v34-note',scroll);
  if(note)note.remove();
  scroll.prepend(panels);
  const tabs=tag('nav','dudu-v35-gallery-tabs');
  tabs.setAttribute('aria-label','Nhóm hình nền');
  [['calm','Tinh giản'],['world','Theo truyện'],['legacy','Mẫu cũ']].forEach(([id,label])=>{
    const button=tag('button','',label);button.type='button';button.dataset.duduV35TabButton=id;
    button.addEventListener('click',()=>select(id));tabs.append(button);
  });
  q('.dudu-v34-heading',sheet)?.after(tabs);
  function select(id){
    tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.duduV35TabButton===id)));
    panels.querySelectorAll('[data-dudu-v35-tab]').forEach(p=>{p.hidden=p.dataset.duduV35Tab!==id;});
    scroll.scrollTop=0;
  }
  select('calm');
 }
 function init(){
  organize();organizeGallery();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();