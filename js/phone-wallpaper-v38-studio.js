/* V38 — portrait-art wallpaper boutique + font atelier. No paid writes. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const catalog=window.DuduWallpaperCatalogV38;
 if(!catalog)return;
 const q=(s,p=document)=>p.querySelector(s);
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);
  if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const owner=()=>typeof phoneWallpaperOwnerV27==='function'?phoneWallpaperOwnerV27():null;
 const allowed=(kind,id)=>catalog.allowed(kind,id,localStorage,owner());
 const selectedWallpaper=()=>window.DuduPhoneWallpaperV27?.read(localStorage,owner());
 const selectedFont=()=>window.DuduPhoneTypographyV31?.read(localStorage,owner())?.font;
 let activeFilter='Tất cả',activePreview=null,returnFocus=null;
 let gallery=null,fontsPanel=null,inspect=null,feedback=null;
 const money=()=>'<i class="dudu-money-icon dudu-money-icon--gold" aria-hidden="true"></i>';
 function notice(message){if(feedback){feedback.textContent=message;feedback.hidden=false;}}
 function labelFor(item){return item.kind==='premium'?'GOLD':item.kind==='gift'?'✦ QUÀ':'MIỄN PHÍ';}
 function priceLabel(node,item){
  if(item.kind==='premium')node.innerHTML=money()+' '+item.price;
  else node.textContent=labelFor(item);
 }
 function syncCards(){
  document.querySelectorAll('.dudu-v38-wall-card').forEach(card=>{
   const id=card.dataset.v38Id;
   card.setAttribute('aria-pressed',String(selectedWallpaper()===id));
   const badge=q('.dudu-v38-price',card),item=catalog.ITEMS.find(x=>x.id===id);
   if(badge&&item){if(item.kind==='gift'&&allowed('wallpaper',id))badge.textContent='✓ ĐÃ NHẬN';
    else priceLabel(badge,item);}
  });
  document.querySelectorAll('.dudu-v38-font-card').forEach(card=>{
   const id=card.dataset.v38Id;
   card.setAttribute('aria-pressed',String(selectedFont()===id));
   const item=catalog.FONTS.find(x=>x.id===id),badge=q('.dudu-v38-font-kind',card);
   if(badge&&item){if(item.kind==='gift'&&allowed('font',id))badge.textContent='✓ QUÀ';
    else priceLabel(badge,item);}
  });
 }
 function switchTab(id){
  const tabs=q('.dudu-v35-gallery-tabs'),panels=q('.dudu-v35-gallery-panels');
  if(!tabs||!panels)return;
  tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.duduV35TabButton===id)));
  panels.querySelectorAll('[data-dudu-v35-tab]').forEach(p=>{p.hidden=p.dataset.duduV35Tab!==id;});
  const scroll=q('.dudu-v34-scroll');if(scroll)scroll.scrollTop=0;
  if(id==='studio')syncCards();
 }
 function filterTo(id){
  activeFilter=id;
  document.querySelectorAll('.dudu-v38-filter').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v38Filter===id)));
  document.querySelectorAll('.dudu-v38-wall-card').forEach(b=>{
   const item=catalog.ITEMS.find(x=>x.id===b.dataset.v38Id);
   b.hidden=activeFilter!=='Tất cả'&&item?.category!==activeFilter;
  });
 }
 function makeStudio(){
  const panel=el('section','dudu-v35-gallery-panel dudu-v38-studio');panel.dataset.duduV35Tab='studio';
  const hero=el('div','dudu-v38-hero');hero.innerHTML='<span class="dudu-v38-hero-spark">✦</span><div><small>DUDU · WALLPAPER ATELIER</small><strong>Thế giới trong lòng bàn tay</strong><span>6 tác phẩm AI · mỗi nền một câu chuyện riêng</span></div>';
  const filters=el('div','dudu-v38-filters');filters.setAttribute('aria-label','Chủ đề hình nền');
  ['Tất cả','Thiên nhiên','Huyền ảo','Neon','Cổ phong','Linh thú'].forEach(name=>{
   const b=el('button','dudu-v38-filter',name);b.type='button';b.dataset.v38Filter=name;
   b.addEventListener('click',()=>filterTo(name));filters.append(b);
  });
  const grid=el('div','dudu-v38-wall-grid');
  catalog.ITEMS.forEach(item=>{
   const card=el('button','dudu-v38-wall-card');card.type='button';card.dataset.v38Id=item.id;
   card.setAttribute('aria-label','Xem thử '+item.name);card.setAttribute('aria-pressed','false');
   const art=el('span','dudu-v38-wall-art');
   const img=el('img');img.src='assets/wallpapers/v38/'+item.asset;img.alt='';img.loading='lazy';img.decoding='async';img.width=180;img.height=389;
   const badge=el('span','dudu-v38-price');priceLabel(badge,item);art.append(img,badge);
   const foot=el('span','dudu-v38-wall-info');foot.append(el('strong','',item.name),el('small','',item.category));
   card.append(art,foot);card.addEventListener('click',()=>showPreview(item));grid.append(card);
  });
  const note=el('p','dudu-v38-honesty','✦ Hình cao cấp xem thử được; thanh toán Xu Vàng đang chờ tích hợp ví an toàn.');
  panel.append(hero,filters,grid,note);
  filterTo('Tất cả');
  return panel;
 }
 function makeFonts(){
  const panel=el('section','dudu-v35-gallery-panel dudu-v38-fonts');panel.dataset.duduV35Tab='fonts';
  const intro=el('div','dudu-v38-font-intro');intro.innerHTML='<small>DUDU · TYPE ATELIER</small><strong>Chữ đẹp, dấu ấn riêng.</strong><p>Thử kiểu chữ và ký tên lên màn hình chính.</p>';
  const list=el('div','dudu-v38-font-list');
  catalog.FONTS.forEach(item=>{
   const b=el('button','dudu-v38-font-card');b.type='button';b.dataset.v38Id=item.id;b.setAttribute('aria-pressed','false');
   const font=window.DuduPhoneTypographyV31?.fontById(item.id);
   const sample=el('span','dudu-v38-font-sample','Du Studio');sample.style.fontFamily=font?.family||'serif';
   const meta=el('span','dudu-v38-font-meta');meta.append(el('strong','',item.name),el('small','',item.sample));
   const badge=el('span','dudu-v38-font-kind');priceLabel(badge,item);
   b.append(sample,meta,badge);b.addEventListener('click',()=>useFont(item));list.append(b);
  });
  const sign=el('section','dudu-v38-signature');
  const title=el('div','dudu-v38-sign-title');title.append(el('strong','','✒ Chữ ký của Du'),el('small','','Tùy chỉnh ngay trên màn hình chính'));
  const preview=el('div','dudu-v38-sign-preview');preview.id='dudu-v38-sign-preview';
  const input=el('input','dudu-v38-sign-input');input.id='dudu-v38-sign-input';input.type='text';input.maxLength=22;input.autocomplete='off';input.setAttribute('aria-label','Nội dung chữ ký');input.placeholder='Tên hoặc biệt danh';
  const styles=el('div','dudu-v38-sign-styles');styles.setAttribute('role','group');styles.setAttribute('aria-label','Kiểu chữ ký');
  [['script','✒ Mềm mại'],['royal','♛ Hoàng gia'],['neon','✧ Ánh sao']].forEach(([id,name])=>{
   const b=el('button','dudu-v38-sign-style',name);b.type='button';b.dataset.v38SignatureStyle=id;
   b.addEventListener('click',()=>updateSignature({style:id}));styles.append(b);
  });
  const toggle=el('button','dudu-v38-sign-toggle');toggle.id='dudu-v38-sign-toggle';toggle.type='button';
  toggle.addEventListener('click',()=>updateSignature({visible:!catalog.readSignature(localStorage,owner()).visible}));
  input.addEventListener('input',()=>updateSignature({text:input.value}));
  sign.append(title,preview,input,styles,toggle);
  panel.append(intro,list,sign);
  return panel;
 }
 function loadFontPreview(){
  if($('dudu-v38-preview-fonts'))return;
  const link=el('link');link.id='dudu-v38-preview-fonts';link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Dancing+Script:wght@500;700&family=Great+Vibes&family=Marcellus&family=Outfit:wght@400;600&family=Prata&display=swap';
  document.head.append(link);
 }
 function useFont(item){
  if(item.kind==='premium'){
   notice('Bản xem thử · '+item.name+' có giá '+item.price+' Xu Vàng. Chưa mở thanh toán để bảo vệ số dư.');return;
  }
  if(item.kind==='gift'&&!allowed('font',item.id)){
   if(!catalog.claimGift(localStorage,owner(),item.id)){notice('Không lưu được quà trên thiết bị.');return;}
  }
  if(typeof window.setPhoneFontV31==='function')window.setPhoneFontV31(item.id);
  syncCards();notice('✓ Đã áp dụng kiểu chữ '+item.name+'.');
 }
 function showPreview(item){
  activePreview=item;returnFocus=document.activeElement;
  if(!inspect)return;
  inspect.hidden=false;
  const art=q('.dudu-v38-inspect-art',inspect);
  art.style.backgroundImage='linear-gradient(180deg,#080e2288,transparent 28%,transparent 68%,#080e2299),url("assets/wallpapers/v38/'+item.asset+'")';
  q('.dudu-v38-inspect-name',inspect).textContent=item.name;
  q('.dudu-v38-inspect-category',inspect).textContent=item.category;
  const action=q('.dudu-v38-inspect-action',inspect);
  if(allowed('wallpaper',item.id))action.textContent='✓ Dùng hình nền';
  else if(item.kind==='gift')action.textContent='✦ Nhận quà & dùng';
  else action.innerHTML=money()+' '+item.price+' · Mua';
  q('.dudu-v38-inspect-close',inspect).focus();
 }
 function hidePreview(){if(!inspect)return;inspect.hidden=true;activePreview=null;
  if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;}
 function previewAction(){
  const item=activePreview;if(!item)return;
  if(item.kind==='premium'){
   notice('Mua '+item.name+' · '+item.price+' Xu Vàng. Đang chờ kết nối giao dịch xác thực, chưa trừ Xu.');
   hidePreview();return;
  }
  if(item.kind==='gift'&&!allowed('wallpaper',item.id)&&!catalog.claimGift(localStorage,owner(),item.id)){
   notice('Không lưu được quà; thử lại sau.');return;
  }
  if(typeof window.setPhoneWallpaperV27==='function')window.setPhoneWallpaperV27(item.id);
  syncCards();hidePreview();window.DuduWallpaperGalleryV34?.close?.();
 }
 function makeInspect(){
  inspect=el('section','dudu-v38-inspect');inspect.hidden=true;inspect.setAttribute('aria-label','Xem thử hình nền');
  const top=el('div','dudu-v38-inspect-top');const close=el('button','dudu-v38-inspect-close','‹');close.type='button';close.setAttribute('aria-label','Quay lại bộ sưu tập');close.addEventListener('click',hidePreview);
  const title=el('strong','','Xem thử');top.append(close,title);
  const screen=el('div','dudu-v38-inspect-art');screen.append(el('span','dudu-v38-inspect-time','09:41'),el('span','dudu-v38-inspect-dots','✦  DUDU LINK'),el('span','dudu-v38-inspect-nav'));
  const detail=el('div','dudu-v38-inspect-detail');const meta=el('div');meta.append(el('strong','dudu-v38-inspect-name'),el('small','dudu-v38-inspect-category'));
  const action=el('button','dudu-v38-inspect-action');action.type='button';action.addEventListener('click',previewAction);
  detail.append(meta,action);inspect.append(top,screen,detail);
  inspect.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();hidePreview();}});
  return inspect;
 }
 function updateSignature(patch){
  const current=catalog.readSignature(localStorage,owner());
  if(!catalog.writeSignature(localStorage,owner(),{...current,...patch})){
   notice('Không lưu được chữ ký trên thiết bị.');return;
  }
  syncSignature();
 }
 function syncSignature(){
  const state=catalog.readSignature(localStorage,owner());
  const badge=$('dudu-v38-home-signature'),preview=$('dudu-v38-sign-preview'),input=$('dudu-v38-sign-input');
  if(badge){badge.textContent=state.text;badge.className='dudu-v38-home-signature is-'+state.style;badge.hidden=!state.visible;}
  if(preview){preview.textContent=state.text;preview.className='dudu-v38-sign-preview is-'+state.style;}
  if(input&&document.activeElement!==input)input.value=state.text;
  document.querySelectorAll('.dudu-v38-sign-style').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v38SignatureStyle===state.style)));
  const toggle=$('dudu-v38-sign-toggle');if(toggle)toggle.textContent=state.visible?'✓ Đang hiện trên điện thoại':'＋ Đặt chữ ký lên điện thoại';
 }
 function init(){
  if(!document.body.classList.contains('dudu-phone-v11'))return;
  const tabs=q('.dudu-v35-gallery-tabs'),panels=q('.dudu-v35-gallery-panels'),sheet=q('.dudu-v34-sheet');
  if(!tabs||!panels||!sheet||$('dudu-v38-studio'))return;
  const current=panels.querySelector('[data-dudu-v35-tab="calm"]');
  if(current){q('h3',current).textContent='Sắc màu tối giản';q('p',current).textContent='Bộ màu nhẹ, dễ nhìn.';}
  gallery=makeStudio();gallery.id='dudu-v38-studio';fontsPanel=makeFonts();
  panels.prepend(gallery);panels.append(fontsPanel);
  tabs.replaceChildren();
  [['studio','Khám phá'],['calm','Tối giản'],['fonts','Kiểu chữ'],['personal','Ảnh của tôi']].forEach(([id,name])=>{
   const b=el('button','',name);b.type='button';b.dataset.duduV35TabButton=id;
   b.addEventListener('click',()=>{loadFontPreview();switchTab(id);});tabs.append(b);
  });
  const oldCustom=panels.querySelector('[data-dudu-v35-tab="personal"]');
  if(oldCustom){q('p',oldCustom).textContent='Ảnh tự chọn lưu trên thiết bị của bạn.';}
  feedback=el('div','dudu-v38-feedback');feedback.hidden=true;feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  q('.dudu-v34-heading',sheet)?.after(feedback);
  sheet.append(makeInspect());
  const signature=el('span','dudu-v38-home-signature');signature.id='dudu-v38-home-signature';signature.hidden=true;signature.setAttribute('aria-label','Chữ ký cá nhân');
  $('phone-home-screen')?.append(signature);
  const open=$('dudu-v34-open');open?.addEventListener('click',()=>{if(feedback)feedback.hidden=true;switchTab('studio');});
  document.body.addEventListener('dudu-account-changed',syncSignature);
  new MutationObserver(()=>{syncSignature();syncCards();}).observe(document.body,{attributes:true,attributeFilter:['data-dudu-phone-wallpaper']});
  // Account changes re-render the phone without changing wallpaper. Refresh on each opening.
  open?.addEventListener('click',()=>{syncSignature();syncCards();});
  switchTab('studio');filterTo('Tất cả');syncSignature();syncCards();
 }
 window.DuduWallpaperStudioV38=Object.freeze({
  canUseWallpaper:id=>allowed('wallpaper',id),
  canUseFont:id=>allowed('font',id),
  sync:()=>{syncSignature();syncCards();}
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
