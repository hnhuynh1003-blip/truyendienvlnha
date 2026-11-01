/* L2E: 20 books per Library page; only tab-scoped navigation state.
   No changes to story records, bookmarks, user profiles or server data. */
(function(root,factory){
  const lib=factory();
  if(root){
    let storage=null;
    try{storage=root.sessionStorage;}catch{/* Private browsing can block storage. */}
    root.DuduLibraryCatalogL2E=lib.createPager(storage);
  }
  if(typeof module==='object'&&module.exports)module.exports=lib;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const PAGE_SIZE=20;
  const KEY='dudu-library-catalog-page-l2e';
  function createPager(storage){
    let page=1;
    let returnScroll=null;
    try{
      const value=Number(storage?.getItem(KEY));
      if(Number.isSafeInteger(value)&&value>0&&value<100000)page=value;
    }catch{/* Storage may be disabled. */}

    function setPage(next){
      page=Number.isSafeInteger(Number(next))&&Number(next)>0?
        Math.min(99999,Number(next)):1;
      try{storage?.setItem(KEY,String(page));}catch{/* Browser storage is optional. */}
      return page;
    }
    function resetPage(){return setPage(1);}
    function paginate(items){
      const total=items.length;
      const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
      if(page>pages)setPage(pages);
      const offset=(page-1)*PAGE_SIZE;
      return {page,pages,total,offset,from:total?offset+1:0,
        to:Math.min(offset+PAGE_SIZE,total),items:items.slice(offset,offset+PAGE_SIZE)};
    }
    function rememberScroll(win){
      if(win.document?.getElementById('home-view')?.style.display!=='block')return false;
      returnScroll=Math.max(0,Number(win.scrollY)||0);
      return true;
    }
    function restoreScroll(win){
      if(returnScroll===null)return false;
      const saved=returnScroll;
      returnScroll=null;
      win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{
        win.scrollTo({top:saved,behavior:'instant'});
      }));
      return true;
    }
    function renderControls(doc,data,onChoose){
      for(const id of ['library-catalog-pager-top','library-catalog-pager-bottom']){
        const host=doc.getElementById(id);
        if(!host)continue;
        host.replaceChildren();
        host.hidden=data.pages<=1;
        if(host.hidden)continue;
        const previous=doc.createElement('button');
        previous.type='button';previous.className='library-catalog-page-step';
        previous.textContent='‹ Trước';previous.disabled=data.page===1;
        previous.addEventListener('click',()=>onChoose(data.page-1));
        const select=doc.createElement('select');
        select.className='library-catalog-page-select';
        select.setAttribute('aria-label','Chọn trang truyện trong thư viện');
        for(let n=1;n<=data.pages;n++){
          const option=doc.createElement('option');
          option.value=String(n);option.textContent=`Trang ${n} / ${data.pages}`;
          select.appendChild(option);
        }
        select.value=String(data.page);
        select.addEventListener('change',()=>onChoose(Number(select.value)));
        const next=doc.createElement('button');
        next.type='button';next.className='library-catalog-page-step';
        next.textContent='Sau ›';next.disabled=data.page===data.pages;
        next.addEventListener('click',()=>onChoose(data.page+1));
        const range=doc.createElement('span');
        range.className='library-catalog-page-range';
        range.textContent=`${data.from}–${data.to} / ${data.total} truyện`;
        host.append(previous,select,next,range);
      }
    }
    return Object.freeze({get page(){return page;},setPage,resetPage,paginate,
      rememberScroll,restoreScroll,renderControls});
  }
  return Object.freeze({PAGE_SIZE,KEY,createPager});
});
