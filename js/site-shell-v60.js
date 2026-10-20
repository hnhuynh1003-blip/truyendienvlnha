/* DUDU Studio 2.0 discovery shell. Do not migrate or write user/story data. */
(function () {
 'use strict';
 if (!document.getElementById('home-view') || typeof novels === 'undefined') return;
 const id=s=>document.getElementById(s);
 const routes={home:'#/home',library:'#/library',worlds:'#/worlds',shelf:'#/shelf',author:'#/author'};
 const labels={home:'Trang chủ',library:'Thư viện',worlds:'Thế giới',shelf:'Tủ sách',author:'Góc tác giả'};
 const icons={home:'⌂',library:'▤',worlds:'✧',shelf:'▧'};
 const oldGoHome=window.goHome,oldOpenCover=window.openCover,oldReadChapter=window.readChapter,oldRenderHome=window.renderHome;
 let current='home',refreshPending=false;
 function element(tag,cls,value){
   const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;
 }
 function button(text,callback,cls='d60-btn'){
   const n=element('button',cls,text);n.type='button';n.addEventListener('click',callback);return n;
 }
 function list(){return Array.isArray(novels)?novels.filter(n=>n&&n.id&&!n.isDraft):[];}
 function artwork(n){
   const box=element('div','d60-cover','✦'),src=n?.coverImage;
   if(typeof src==='string'&&/^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,|assets\/|\.\/assets\/)/i.test(src)){
     const img=document.createElement('img');img.loading='lazy';img.alt='';img.src=src;
     img.addEventListener('error',()=>img.remove());box.replaceChildren(img);
   }
   return box;
 }
 function bookmark(n){
   try{return v568ReadBookmarkForNovel(n);}catch{return null;}
 }
 function card(n,resume=false){
   const c=element('article','d60-book'),idx=novels.indexOf(n),mark=bookmark(n);
   c.append(artwork(n),element('div','d60-title',n.title||'Chưa đặt tên'),
     element('div','d60-meta',(n.author||'Tác giả')+' · '+(n.chapters?.length||0)+' chương'));
   const isResume=resume&&mark&&Number.isInteger(mark.chIdx)&&n.chapters?.[mark.chIdx];
   c.append(button(isResume?'Đọc tiếp · Chương '+(mark.chIdx+1):'Xem tác phẩm →',
     ()=>{if(isResume)smartReadAction(idx);else openCover(idx);},'d60-bookaction'));
   return c;
 }
 function section(title,more,action){
   const s=element('section','d60-section'),h=element('div','d60-sectionhead');
   h.append(element('h2','',title));if(more)h.append(button(more,action,'d60-textlink'));
   s.append(h);return s;
 }
 function recent(items){
   return items.slice().sort((a,b)=>{
     try{return DuduStoryDates.ordering(getNovelLatestDate(b))-DuduStoryDates.ordering(getNovelLatestDate(a));}catch{return 0;}
   });
 }
 function shelfItems(){
   // Only genuine readable bookmarks; keep progress from the existing reader API.
   const saved=list().map(n=>({n,mark:bookmark(n)}))
     .filter(x=>x.mark&&Number.isInteger(x.mark.chIdx)&&x.n.chapters?.[x.mark.chIdx]);
   // Prefer the most recently read book when the bookmark contains a timestamp.
   // Older bookmarks without dates retain their original stable order.
   const time=x=>{
     const m=x.mark||{};
     const raw=m.updatedAt??m.lastReadAt??m.savedAt??m.timestamp;
     if(raw&&typeof raw.toMillis==='function')return raw.toMillis();
     if(typeof raw==='number')return Number.isFinite(raw)?raw:0;
     if(typeof raw==='string'){const parsed=Date.parse(raw);return Number.isFinite(parsed)?parsed:0;}
     if(raw&&typeof raw.seconds==='number')return raw.seconds*1000;
     return 0;
   };
   return saved.sort((a,b)=>time(b)-time(a));
 }
 function bookGrid(title,books){
   const s=section(title,'Xem tất cả →',()=>navigate('library'));
   const g=element('div','d60-grid');books.forEach(n=>g.append(card(n)));
   if(!books.length)s.append(element('p','d60-empty','Thư viện chưa có tác phẩm phù hợp.'));
   else s.append(g);return s;
 }
 function openContact(){
   if(typeof togglePhone!=='function'||typeof openPhoneApp!=='function')return;
   const phone=id('cyber-phone');
   if(phone&&phone.style.display!=='flex')togglePhone();
   openPhoneApp('chat');
 }
 function fillHome(){
   const root=id('d60-home');if(!root)return;root.replaceChildren();
   const all=recent(list()),saved=shelfItems(),resume=saved[0]||null;
   const hero=element('section','d60-hero d61-hero');
   const copy=element('div','d61-hero-copy');
   copy.append(element('p','d61-terminal','◈  DUDU / SYSTEM GATE'),
     element('h1','','Đọc truyện. Mở vạn giới.'),
     element('p','d61-tagline','Mỗi câu chuyện, một khả năng.'));
   // Primary navigation owns the Library / Worlds / Shelf links.
   // The one hero action opens Contacts, which is not in the primary navigation.
   const actions=element('div','d60-actions d61-hero-actions');
   actions.append(button('Liên lạc NPC  ↗',openContact));
   copy.append(actions);
   const portal=element('div','d61-portal');
   portal.setAttribute('aria-hidden','true');
   portal.append(element('div','d61-orbit d61-orbit-outer'),
     element('div','d61-orbit d61-orbit-mid'),
     element('div','d61-orbit d61-orbit-inner'),
     element('div','d61-orbit-core','D'));
   const portalText=element('span','d61-portal-caption','DUDU // ∞');
   portal.append(portalText);
   hero.append(copy,portal);
   root.append(hero);
   const signal=element('div','d61-signal');
   signal.append(element('span','d61-signal-led'),
     element('span','d61-signal-label','THƯ VIỆN'),
     element('strong','',all.length+' truyện'),
     element('span','d61-signal-divider','/'),
     element('span','d61-signal-label','XUYÊN GIỚI'),
     element('span','d61-signal-off','Đang kiến tạo'));
   root.append(signal);
   if(resume){
     const s=section('Đang đọc');
     const row=element('div','d61-resume-card'),inner=element('div','d61-resume-copy');
     inner.append(element('strong','',resume.n.title||'Truyện đang đọc'),
       element('small','','Chương '+(resume.mark.chIdx+1)+' / '+resume.n.chapters.length));
     row.append(artwork(resume.n),inner,
       button('Đọc tiếp  →',()=>smartReadAction(novels.indexOf(resume.n)),'d61-resume-action'));
     s.append(row);root.append(s);
   }
   if(all.length){
     root.append(bookGrid('Mới cập nhật',all.slice(0,4)));
   }
   const genres=new Set();
   all.forEach(n=>String(n.genre||'').split(/[,/]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>genres.add(x)));
   if(genres.size){
     const s=section('Dấu hiệu thế giới'),r=element('div','d60-chips d61-chips');
     [...genres].slice(0,7).forEach(t=>r.append(button(t,()=>{
       navigate('library');selectedTag=t;renderHome();
     },'d60-chip')));
     s.append(r);root.append(s);
   }

 }
 // V64 World Atlas: compact mobile-first coordinates; detailed lore stays in the registry.
 function worldCard(g,index){
   // Genre gate, NOT one playable F/E world.
   const card=element('article','d64-world-card d63-tone-'+g.tone);
   card.dataset.genreId=g.genreId;
   card.setAttribute('aria-label','Thể loại '+g.name+', xem kho nhiệm vụ');
   const top=element('div','d64-card-top');
   top.append(element('span','d64-card-number',String(index+1).padStart(2,'0')),
     element('span','d64-card-tier','F · E'));
   const crest=element('div','d64-world-crest',g.symbol);crest.setAttribute('aria-hidden','true');
   const info=element('div','d64-card-info');
   const total=window.DuduWorldTaxonomyV66.byGenre(g.genreId).length;
   info.append(element('h3','d64-card-title',g.name),
     element('p','d64-card-category',total+' phó bản sơ cấp'));
   card.append(top,crest,info);
   return card;
 }
 function unverifiedCard(w){
   const card=element('article','d64-unknown-card');
   card.dataset.worldId=w.worldId;
   card.setAttribute('aria-label',w.name+'. '+w.signal+'. Chưa kiểm chứng');
   const sigil=element('span','d64-unknown-glyph','?');
   sigil.setAttribute('aria-hidden','true');
   card.append(sigil,element('span','d64-unknown-name',w.name));
   return card;
 }
 function fillWorlds(){
   const root=id('d60-worlds-list');if(!root)return;
   const wasOpen=!!root.querySelector('details.d64-unknown')?.open;
   root.replaceChildren();
   const taxonomy=window.DuduWorldTaxonomyV66;
   if(!taxonomy||!Array.isArray(taxonomy.genres)){
     root.append(element('p','d60-empty','Không thể tải bản đồ thể loại.'));
     return;
   }
   const starter=element('section','d64-world-section');
   const heading=element('div','d64-sectionhead');
   const randomBtn=button('↻',()=>window.DuduWorldUXV66?.openRandomSignal(),'d66-random-entry');
   randomBtn.setAttribute('aria-label','Xem một tín hiệu nhiệm vụ F ngẫu nhiên');
   randomBtn.title='Tín hiệu sơ cấp ngẫu nhiên';
   heading.append(element('h2','','Sáu thế giới lớn'),
     element('span','d64-world-count',taxonomy.missions.length+' PHÓ BẢN'),
     randomBtn);
   const grid=element('div','d64-world-grid');
   taxonomy.genres.forEach((g,i)=>grid.append(worldCard(g,i)));
   starter.append(heading,grid);
   const unknowns=window.DuduWorldRegistryV63?.unverifiedWorlds||[];
   const hidden=element('details','d64-unknown');hidden.open=wasOpen;
   const summary=element('summary','d64-unknown-summary');
   const left=element('span','d64-unknown-heading'),marker=element('span','d64-unknown-marker','◇');
   marker.setAttribute('aria-hidden','true');
   left.append(marker,element('span','','Ngoài phân loại'));
   summary.append(left,element('span','d64-unknown-count',String(unknowns.length).padStart(2,'0')),
     element('span','d64-unknown-arrow','⌄'));
   summary.lastChild.setAttribute('aria-hidden','true');
   hidden.append(summary);
   const unknownGrid=element('div','d64-unknown-grid');
   unknowns.forEach(w=>unknownGrid.append(unverifiedCard(w)));
   hidden.append(unknownGrid);
   // Stable, independent pilot link: visible even when the optional dialogue bundle fails.
   // The standalone playtest is not a real assignment and never grants rewards.
   const pilot=element('aside','dudu-pilot-entry dudu-pilot-entry-inline');
   const pilotCopy=element('div','dudu-pilot-entry-copy');
   pilotCopy.append(element('span','dudu-pilot-entry-kicker','F · PHÓ BẢN THỬ NGHIỆM'),
     element('strong','','Đêm mưa ở Quan Đạo'),
     element('span','dudu-pilot-entry-desc','Truyện ngắn đa nhánh · có mở đầu và hậu quả · không cấp thưởng'));
   const pilotLink=element('a','dudu-pilot-launch','Chơi thử ↗');
   pilotLink.href='dudu-pilot.html?v=story-3';
   pilotLink.setAttribute('aria-label','Mở bản chơi thử Đêm mưa ở Quan Đạo');
   pilot.append(pilotCopy,pilotLink);
   root.append(pilot,starter,hidden);
 }
 function fillShelf(){
   const root=id('d60-shelf-list');if(!root)return;root.replaceChildren();
   const arr=shelfItems();
   if(!arr.length){
     root.append(element('div','d60-empty','Bạn chưa có truyện đang đọc trên tài khoản hoặc thiết bị này. Hãy chọn một tác phẩm trong Thư viện.'));return;
   }
   const grid=element('div','d60-grid');arr.forEach(x=>grid.append(card(x.n,true)));root.append(grid);
 }
 function isAuthor(){return typeof canEditStories==='function'&&canEditStories();}
 function fillAuthor(){
   document.querySelectorAll('[data-d60-author]').forEach(n=>{n.hidden=!isAuthor();});
   const root=id('d60-author-actions');if(!root)return;root.replaceChildren();
   if(!isAuthor()){
     root.append(element('div','d60-empty','Bạn chưa có quyền quản lý tác phẩm. Đăng nhập bằng tài khoản đã được cấp quyền tác giả.'));return;
   }
   root.append(button('✎ Tạo tác phẩm',()=>openStoryModal()),
     button('▤ Nhập EPUB',()=>openEpubImportV48(),'d60-btn secondary'),
     button('📚 Quản lý trong Thư viện',()=>navigate('library'),'d60-btn secondary'),
     button('◇ Khung kịch bản',()=>window.DuduWorldUXV66?.openAuthorStudio(),'d60-btn secondary'));
 }
 function refresh(){
   if(refreshPending)return;refreshPending=true;
   queueMicrotask(()=>{refreshPending=false;
     try{fillHome();fillWorlds();fillShelf();fillAuthor();}catch(error){console.warn('DUDU site shell:',error);}
   });
 }
 function hidePages(){
   ['d60-home','home-view','d60-worlds','d60-shelf','d60-author'].forEach(k=>{const n=id(k);if(n)n.style.display='none';});
 }
 function navState(){
   document.querySelectorAll('[data-d60-route]').forEach(n=>{
     if(n.dataset.d60Route===current)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
   });
   document.title=(labels[current]||'DUDU')+' · DUDU Studio';
 }
 function enterLegacy(){
   hidePages();current='library';navState();
 }
 function navigate(page,updateHash=true){
   if(!routes[page])page='home';
   if(page==='author'&&!isAuthor())page='home';
   const cover=id('cover-view'),reader=id('reader-view');
   if(cover?.style.display==='block'||reader?.style.display==='block')oldGoHome();
   cover.style.display='none';reader.style.display='none';hidePages();
   current=page;
   const target={home:'d60-home',library:'home-view',worlds:'d60-worlds',shelf:'d60-shelf',author:'d60-author'}[page];
   id(target).style.display='block';
   if(page==='library')oldRenderHome();
   refresh();navState();
   if(updateHash&&location.hash!==routes[page])location.hash=routes[page];
   window.scrollTo(0,0);
 }
 function navButton(page,mobile){
   const n=button(labels[page],()=>navigate(page),'d60-navitem');n.dataset.d60Route=page;
   if(page==='author')n.dataset.d60Author='1';
   if(mobile){n.replaceChildren(element('span','d60-icon',icons[page]),element('span','',labels[page]));}
   return n;
 }
 function setup(){
   const header=document.querySelector('body > header');
   const top=element('nav','d60-topnav');top.setAttribute('aria-label','Điều hướng DUDU');
   ['home','library','worlds','shelf','author'].forEach(p=>top.append(navButton(p,false)));
   header.insertBefore(top,header.querySelector('.header-controls'));
   const bottom=element('nav','d60-bottomnav');bottom.setAttribute('aria-label','Điều hướng di động');
   ['home','library','worlds','shelf'].forEach(p=>bottom.append(navButton(p,true)));
   document.body.append(bottom);
   const container=document.querySelector('.container');
   const home=element('main','d60-page');home.id='d60-home';
   const worlds=element('section','d60-page');worlds.id='d60-worlds';
   const atlasHeading=element('div','d64-atlas-heading');
   const atlasTitles=element('div','d64-atlas-titleblock');
   atlasTitles.append(element('span','d64-atlas-kicker','DUDU · WORLDS'),
     element('h1','d60-page-title','Vạn giới'));
   atlasHeading.append(atlasTitles);
   const seal=element('span','d64-atlas-seal','Khế ước · F/E');
   atlasHeading.append(seal);
   worlds.append(atlasHeading);
   const worldList=element('div','');worldList.id='d60-worlds-list';worlds.append(worldList);
   const shelf=element('section','d60-page');shelf.id='d60-shelf';
   shelf.append(element('p','d60-kicker','DUDU · CÁ NHÂN'),element('h1','d60-page-title','Tủ sách của tôi'),
     element('p','d60-intro','Các tác phẩm có tiến độ đọc được lưu bằng cơ chế bookmark hiện tại.'));
   const shelfList=element('div','');shelfList.id='d60-shelf-list';shelf.append(shelfList);
   const author=element('section','d60-page');author.id='d60-author';
   author.append(element('p','d60-kicker','DUDU · AUTHOR STUDIO'),element('h1','d60-page-title','Góc tác giả'),
     element('p','d60-intro','Các công cụ sáng tác hiện có được giữ nguyên. Quyền xuất bản vẫn do hệ thống xác thực quyết định.'));
   const authorBtns=element('div','d60-two');authorBtns.id='d60-author-actions';author.append(authorBtns);
   for(const node of [author,shelf,worlds,home])container.insertBefore(node,container.firstChild);
   const library=id('home-view'),intro=element('div','d60-library-intro');
   intro.append(element('h1','','Thư viện truyện'),element('p','','Tìm kiếm theo tên, nhân vật, thể loại; lựa chọn truyện phù hợp với bạn.'));
   library.insertBefore(intro,library.firstChild);
   document.body.classList.add('dudu-site-v60');
   const route=Object.keys(routes).find(k=>location.hash===routes[k])||'home';
   navigate(route,false);
   window.addEventListener('hashchange',()=>{
     const next=Object.keys(routes).find(k=>location.hash===routes[k]);
     if(next&&next!==current)navigate(next,false);
     // Unknown hashes may be used by legacy reader flows; do not overwrite them.
   });
 }
 window.DuduSiteV60={navigate,refresh,get page(){return current;}};
 window.renderHome=function(){const v=oldRenderHome.apply(this,arguments);refresh();return v;};
 window.goHome=function(){const v=oldGoHome.apply(this,arguments);enterLegacy();id('home-view').style.display='block';return v;};
 window.openCover=function(){enterLegacy();return oldOpenCover.apply(this,arguments);};
 window.readChapter=function(){enterLegacy();return oldReadChapter.apply(this,arguments);};
 setup();
})();
