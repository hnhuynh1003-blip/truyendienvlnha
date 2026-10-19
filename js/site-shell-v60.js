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
   return list().map(n=>({n,mark:bookmark(n)}))
     .filter(x=>x.mark&&Number.isInteger(x.mark.chIdx)&&x.n.chapters?.[x.mark.chIdx]);
 }
 function bookGrid(title,books){
   const s=section(title,'Xem tất cả →',()=>navigate('library'));
   const g=element('div','d60-grid');books.forEach(n=>g.append(card(n)));
   if(!books.length)s.append(element('p','d60-empty','Thư viện chưa có tác phẩm phù hợp.'));
   else s.append(g);return s;
 }
 function fillHome(){
   const root=id('d60-home');if(!root)return;root.replaceChildren();
   const hero=element('section','d60-hero');
   hero.append(element('p','d60-kicker','✦ DUDU STUDIO · THƯ VIỆN VẠN GIỚI'),
     element('h1','','Mỗi trang truyện, một thế giới chờ khám phá.'),
     element('p','','Đọc câu chuyện bạn yêu thích, kết nối với những nhân vật đáng nhớ và khám phá hành trình riêng khi bạn sẵn sàng.'));
   const acts=element('div','d60-actions');
   acts.append(button('Khám phá thư viện →',()=>navigate('library')),
     button('Về những thế giới',()=>navigate('worlds'),'d60-btn secondary'));
   hero.append(acts);root.append(hero);
   const saved=shelfItems();
   if(saved.length){
     const entry=saved[0],s=section('Đọc tiếp','Tủ sách của tôi →',()=>navigate('shelf'));
     const item=element('div','d60-card d60-resume'),content=element('div');
     content.append(element('div','d60-title',entry.n.title),
       element('div','d60-meta','Chương '+(entry.mark.chIdx+1)+' · '+(entry.n.chapters[entry.mark.chIdx]?.title||'')),
       button('Tiếp tục đọc',()=>smartReadAction(novels.indexOf(entry.n))));
     item.append(artwork(entry.n),content);s.append(item);root.append(s);
   }
   const books=recent(list());
   if(books.length)root.append(bookGrid('Truyện vừa cập nhật',books.slice(0,8)));
   const genres=new Set();
   books.forEach(n=>String(n.genre||'').split(/[,/]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>genres.add(x)));
   if(genres.size){
     const s=section('Khám phá thể loại'),r=element('div','d60-chips');
     [...genres].slice(0,14).forEach(t=>r.append(button(t,()=>{
       navigate('library');
       selectedTag=t;
       renderHome();
     },'d60-chip')));
     s.append(r);root.append(s);
   }
   const s=section('Một trải nghiệm vượt ngoài trang sách','Tìm hiểu →',()=>navigate('worlds'));
   const two=element('div','d60-two');
   const one=element('article','d60-card'),other=element('article','d60-card');
   one.append(element('span','d60-badge','ĐỌC THOẢI MÁI'),element('h3','','Bạn luôn được chọn chỉ đọc truyện'),element('p','','Không điểm danh bắt buộc, không phải chạy nhiệm vụ hay kiếm Xu để tiếp tục đọc.'));
   other.append(element('span','d60-badge','THẾ GIỚI TƯƠNG LAI'),element('h3','','Hành trình xuyên sách do bạn lựa chọn'),element('p','','Tiểu thế giới, suy luận, NPC và các kết cục riêng chỉ mở khi thực sự phát hành.'));
   two.append(one,other);s.append(two);root.append(s);
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
     button('📚 Quản lý trong Thư viện',()=>navigate('library'),'d60-btn secondary'));
 }
 function refresh(){
   if(refreshPending)return;refreshPending=true;
   queueMicrotask(()=>{refreshPending=false;
     try{fillHome();fillShelf();fillAuthor();}catch(error){console.warn('DUDU site shell:',error);}
   });
 }
 function hidePages(){
   ['d60-home','home-view','d60-worlds','d60-shelf','d60-author'].forEach(k=>{const n=id(k);if(n)n.style.display='none';});
 }
 function navState(){
   document.querySelectorAll('[data-d60-route]').forEach(n=>{
     if(n.dataset.d60Route===current)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
   });
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
   worlds.append(element('p','d60-kicker','DUDU · KHÁM PHÁ'),
     element('h1','d60-page-title','Thế giới DUDU'),
     element('p','d60-intro','Các tiểu thế giới và hành trình xuyên sách đang được thiết kế. Hiện chưa có cổng xuyên giới công khai.'));
   const wg=element('div','d60-two'),w1=element('article','d60-card'),w2=element('article','d60-card');
   w1.append(element('span','d60-badge','ĐANG CHUẨN BỊ'),element('h3','','Tiểu thế giới nhiệm vụ'),
     element('p','','Những câu chuyện ngắn độc lập: phá án, escape room, sinh tồn, cứu rỗi và nhiều hướng giải quyết.'));
   w2.append(element('span','d60-badge','CHƯA PHÁT HÀNH'),element('h3','','Xuyên vào thế giới truyện'),
     element('p','','Quyền chọn thế giới, cấp hệ thống và gameplay nhập vai sẽ được mở sau khi hoàn thiện và kiểm thử.'));
   wg.append(w1,w2);worlds.append(wg);
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
   });
 }
 window.DuduSiteV60={navigate,refresh,get page(){return current;}};
 window.renderHome=function(){const v=oldRenderHome.apply(this,arguments);refresh();return v;};
 window.goHome=function(){const v=oldGoHome.apply(this,arguments);enterLegacy();id('home-view').style.display='block';return v;};
 window.openCover=function(){enterLegacy();return oldOpenCover.apply(this,arguments);};
 window.readChapter=function(){enterLegacy();return oldReadChapter.apply(this,arguments);};
 setup();
})();
