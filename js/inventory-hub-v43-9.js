/* DUDU V44.0.1 — compact, inventory-first phone navigation.
 * The default view is the grid, not a dashboard of repeated labels.
 * Legacy Sandbox gift receipts are retained as history, not new actions.
 */
(function(root){
 'use strict';
 let pane='overview';
 const $=(tag,cls,t)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(t!==undefined)x.textContent=String(t);
  return x;
 };
 const fmt=n=>new Intl.NumberFormat('vi-VN').format(n);
 const TITLES=Object.freeze({
  overview:'Kho đồ',market:'Bán thường',auction:'Đấu giá'
 });
 function active(){return pane;}
 function reset(){pane='overview';}
 function render({host,inventory=[],coins=0,state,stories=[],
  onCancel,onFilter,onModeChange}={}){
  if(!host||!root.DuduInventoryTradeV439)return false;
  const rules=root.DuduInventoryTradeV439,s=rules.state(state);
  host.replaceChildren();
  host.className='dudu-v439-hub dudu-v440-compact';
  host.dataset.mode=pane;
  const nav=$('nav','dudu-v439-nav');
  nav.setAttribute('aria-label','Chế độ xem Kho Xuyên Thế Giới');
  const tabs=[
   ['overview','🎒','Kho'],
   ['market','🪙','Bán'],
   ['auction','⚖️','Đấu giá']
  ];
  for(const [id,emoji,label] of tabs){
   const button=$('button','dudu-v439-tab'+(pane===id?' active':''),emoji+' '+label);
   button.type='button';button.dataset.mode=id;
   button.setAttribute('aria-pressed',String(pane===id));
   button.setAttribute('aria-label',TITLES[id]);
   button.addEventListener('click',()=>{
    if(pane===id)return;
    pane=id;
    if(typeof onModeChange==='function')onModeChange(id);
    else render({host,inventory,coins,state,stories,onCancel,onFilter});
    host.querySelector('.dudu-v439-tab[data-mode="'+id+'"]')?.focus({preventScroll:true});
   });
   nav.append(button);
  }
  host.append(nav);

  if(pane!=='overview'){
   const eligible=inventory.filter(x=>rules.saleValue(x)>0).length;
   const intro=$('div','dudu-v440-mode-summary');
   const modeStatus=pane==='market'?
    'Có '+eligible+' món · Đã bán '+s.sold+'/'+rules.DAILY_SALES:
    'Ký gửi '+s.listings.length+'/'+rules.MAX_LISTINGS;
   intro.append($('strong','',modeStatus));
   const help=$('details','dudu-v440-help');
   const summary=$('summary','','?');
   summary.setAttribute('aria-label','Hướng dẫn '+TITLES[pane]);
   summary.title='Hướng dẫn '+TITLES[pane];
   help.append(summary);
   const desc=$('p','',pane==='market'?
    'Nhấn vào món phổ thông trong lưới rồi chọn Bán. Giá thu mua thấp hơn giá mua; tối đa 12 món/ngày. Không bán kỷ vật hoặc đồ khóa.':
    'Chỉ ký gửi thử vật phẩm hiếm đúng nguồn chương/thế giới. Chưa có mua bán giữa người chơi; rút lô để lấy lại vật phẩm.');
   help.append(desc);intro.append(help);
   const historyCount=s.history.length;
   if(historyCount){
    const history=$('details','dudu-v440-history');
    const heading=$('summary','','↺ '+historyCount);
    heading.title='Xem nhật ký giao dịch';
    heading.setAttribute('aria-label','Xem '+historyCount+' giao dịch gần đây');
    history.append(heading);
    const list=$('div','dudu-v440-history-items');
    const labels={SELL:'Bán',GIFT:'Ủng hộ',LIST:'Ký gửi',CANCEL:'Rút'};
    for(const h of s.history.slice(-12).reverse()){
     const row=$('div','dudu-v440-history-item');
     const story=stories.find(x=>x?.id===h.storyId);
     row.append($('span','',h.day+' · '+(labels[h.action]||h.action)+
      ' '+h.name+(story?' → '+story.title:'')));
     if(h.action==='SELL')row.append($('strong','', '+'+fmt(h.coins)+' Xu'));
     if(h.note)row.append($('small','', '“'+h.note+'”'));
     list.append(row);
    }
    history.append(list);intro.append(history);
   }
   host.append(intro);
   if(pane==='auction'){
    const content=$('section','dudu-v439-pane dudu-v440-escrow');
    if(!s.listings.length){
     content.append($('span','dudu-v439-empty','Chưa có lô ký gửi'));
    }
    for(const lot of s.listings){
     const card=$('article','dudu-v439-lot');
     const info=$('div','dudu-v439-lot-info');
     const story=stories.find(x=>x?.id===lot.storyId);
     const artwork=$('span','dudu-v439-lot-art',lot.item.icon||'🎁');
     artwork.setAttribute('aria-hidden','true');
     root.DuduItemArtV13?.mount(artwork,
      root.DuduItemCatalog?.byId(lot.item.id)||lot.item);
     info.append($('strong','',lot.item.name),
      $('small','',lot.item.rank+' · '+(story?.title||lot.storyId)+
       ' · '+fmt(lot.ask)+' Xu đề xuất'));
     const cancel=$('button','','Rút lô');
     cancel.type='button';
     cancel.addEventListener('click',()=>onCancel?.(lot.id));
     card.append(artwork,info,cancel);content.append(card);
    }
    host.append(content);
   }
  }
  return true;
 }
 root.DuduInventoryHubV439=Object.freeze({render,active,reset});
})(typeof window!=='undefined'?window:{});
