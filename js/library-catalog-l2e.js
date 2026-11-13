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
  // A deliberately small strip: never render a wall of page numbers.
  // The jump control still reaches any of the actual total pages.
  function pageTokens(current,total){
    if(!Number.isSafeInteger(total)||total<1)return [];
    if(total<=5)return Array.from({length:total},(_,i)=>i+1);
    if(current<=3)return [1,2,3,'…',total];
    if(current>=total-2)return [1,'…',total-2,total-1,total];
    return [1,'…',current,'…',total];
  }
  function createPager(storage){
    let page=1;
    let returnScroll=null;
    try{
      const value=Number(storage?.getItem(KEY));
      if(Number.isSafeInteger(value)&&value>0)page=value;
    }catch{/* Storage may be disabled. */}

    function setPage(next){
      page=Number.isSafeInteger(Number(next))&&Number(next)>0?Number(next):1;
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
        const ribbon=doc.createElement('div');
        ribbon.className='library-catalog-page-ribbon';
        ribbon.setAttribute('role','group');
        ribbon.setAttribute('aria-label','Các trang truyện');
        const round=(label,cls,action)=>{
          const node=doc.createElement('button');
          node.type='button';node.className='library-catalog-page-round '+cls;
          node.textContent=label;node.addEventListener('click',action);
          return node;
        };
        const previous=round('‹','library-catalog-page-step',()=>onChoose(data.page-1));
        previous.disabled=data.page===1;
        previous.setAttribute('aria-label','Trang trước');
        ribbon.appendChild(previous);
        for(const token of pageTokens(data.page,data.pages)){
          if(token==='…'){
            const gap=doc.createElement('span');
            gap.className='library-catalog-page-dots';gap.textContent='…';
            gap.setAttribute('aria-hidden','true');
            ribbon.appendChild(gap);continue;
          }
          const item=round(String(token),'library-catalog-page-number'+
            (token===data.page?' is-current':''),()=>onChoose(token));
          item.setAttribute('data-page',String(token));
          item.setAttribute('aria-label',`Trang ${token} trên ${data.pages}`);
          if(token===data.page)item.setAttribute('aria-current','page');
          ribbon.appendChild(item);
        }
        const next=round('›','library-catalog-page-step',()=>onChoose(data.page+1));
        next.disabled=data.page===data.pages;
        next.setAttribute('aria-label','Trang sau');
        ribbon.appendChild(next);
        const range=doc.createElement('span');
        range.className='library-catalog-page-range';
        range.textContent=id==='library-catalog-pager-top'?
          `Trang ${data.page}/${data.pages}`:
          `${data.from}–${data.to} / ${data.total} truyện`;
        const jumpTrigger=doc.createElement('button');
        jumpTrigger.type='button';jumpTrigger.className='library-catalog-page-jump-toggle';
        jumpTrigger.textContent='⌕ Đi tới trang';
        jumpTrigger.setAttribute('aria-expanded','false');
        const form=doc.createElement('form');
        form.className='library-catalog-page-jump';form.hidden=true;
        form.noValidate=true; // Show our in-page range hint instead of a native popup.
        const label=doc.createElement('label');
        label.textContent='Trang số';
        const input=doc.createElement('input');
        input.type='number';input.min='1';input.max=String(data.pages);
        input.step='1';input.value=String(data.page);
        input.setAttribute('inputmode','numeric');
        input.setAttribute('aria-label',`Nhập số trang từ 1 đến ${data.pages}`);
        label.appendChild(input);
        const submit=doc.createElement('button');
        submit.type='submit';submit.textContent='Đi';
        const error=doc.createElement('small');
        error.className='library-catalog-page-error';
        error.setAttribute('role','status');
        form.append(label,submit,error);
        jumpTrigger.addEventListener('click',()=>{
          form.hidden=!form.hidden;
          jumpTrigger.setAttribute('aria-expanded',String(!form.hidden));
          if(!form.hidden)input.focus?.();
        });
        form.addEventListener('submit',event=>{
          event.preventDefault();
          const target=Number(input.value);
          if(!Number.isSafeInteger(target)||target<1||target>data.pages){
            error.textContent=`Chọn trang từ 1 đến ${data.pages}`;
            input.focus?.();return;
          }
          onChoose(target);
        });
        host.append(ribbon,range,jumpTrigger,form);
      }
    }
    return Object.freeze({get page(){return page;},setPage,resetPage,paginate,
      rememberScroll,restoreScroll,renderControls});
  }
  return Object.freeze({PAGE_SIZE,KEY,pageTokens,createPager});
});
