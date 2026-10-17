/* DUDU V43.9 — inventory market/journal overview, Sandbox-only. */
(function(root){
 'use strict';
 let pane='overview';
 const $=(tag,cls,t)=>{
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(t!==undefined)x.textContent=String(t);return x;
 };
 const fmt=n=>new Intl.NumberFormat('vi-VN').format(n);
 function render({host,inventory=[],coins=0,state,stories=[],onCancel,onFilter}={}){
  if(!host||!root.DuduInventoryTradeV439)return false;
  const rules=root.DuduInventoryTradeV439,s=rules.state(state);
  host.replaceChildren();
  host.className='dudu-v439-hub';
  const title=$('div','dudu-v439-header');
  const tagline=$('div','');
  tagline.append($('strong','','KHO XUYÊN THẾ GIỚI'),
   $('small','','Quản lý · Sử dụng · Giao dịch · Nguồn gốc'));
  const wallet=$('span','dudu-v439-wallet','🪙 '+fmt(coins)+' Xu');
  title.append(tagline,wallet);host.append(title);
  const metrics=$('div','dudu-v439-metrics');
  const usable=inventory.filter(x=>rules.actionStatus(x,stories)?.useable).length;
  const saleable=inventory.filter(x=>rules.saleValue(x)>0).length;
  const lots=s.listings.length;
  for(const [label,num] of [['Vật phẩm',inventory.length+'/500'],
   ['Dùng được',usable],['Bán thường',saleable],['Niêm yết',lots+'/'+rules.MAX_LISTINGS]]){
   const box=$('div','dudu-v439-metric');
   box.append($('small','',label),$('strong','',num));metrics.append(box);
  }
  host.append(metrics);
  const tabs=$('nav','dudu-v439-nav');
  tabs.setAttribute('aria-label','Chế độ xem kho');
  for(const [id,label] of [['overview','🎒 Kho đồ'],
   ['market','🪙 Bán thường'],['auction','⚖️ Đấu giá'],['gifts','💌 Quà truyện']]){
   const button=$('button','dudu-v439-tab'+(pane===id?' active':''),label);
   button.type='button';button.setAttribute('aria-pressed',String(pane===id));
   button.addEventListener('click',()=>{
    pane=id;
    render({host,inventory,coins,state,stories,onCancel,onFilter});
   });
   tabs.append(button);
  }
  host.append(tabs);
  const content=$('section','dudu-v439-pane');
  if(pane==='overview'){
   content.append($('p','','Chạm vào vật phẩm để xem nguồn gốc, công dụng và thao tác được phép. Vật phẩm chỉ là đạo cụ sẽ không có nút sử dụng giả.'));
   const quick=$('button','dudu-v439-quick','⚡ Xem những món dùng được');
   quick.type='button';quick.addEventListener('click',()=>onFilter?.('ACTIVATABLE'));
   content.append(quick);
  }else if(pane==='market'){
   content.append($('strong','','Quầy thu mua vật phẩm phổ thông'));
   content.append($('p','','Bán từng món trong chi tiết Kho. Giá thu mua thấp hơn giá mua; giới hạn 12 món mỗi ngày. Không nhận vật phẩm chức năng, đồ hiếm và kỷ vật.'));
   const count=$('div','dudu-v439-remaining',
    'Hôm nay đã bán: '+s.sold+'/'+rules.DAILY_SALES+' · '+saleable+' món đủ điều kiện');
   content.append(count);
   const jump=$('button','dudu-v439-quick','Lọc đồ có thể bán');
   jump.type='button';jump.addEventListener('click',()=>onFilter?.('ALL'));
   content.append(jump);
  }else if(pane==='auction'){
   content.append($('strong','','Sàn đấu giá · Kho niêm yết thử nghiệm'));
   content.append($('p','','Chỉ nhận vật phẩm hiếm B–SSS nhặt từ chương có thế giới khớp nguồn gốc. Khi niêm yết, món đồ chuyển vào kho ký gửi. Chưa có người mua, trả giá hay chuyển Xu thật; có thể hủy để nhận lại nguyên món.'));
   if(!s.listings.length)content.append($('div','dudu-v439-empty','Chưa có lô nào. Chọn một vật phẩm hiếm đủ điều kiện trong Kho để niêm yết.'));
   for(const lot of s.listings){
    const card=$('article','dudu-v439-lot');
    const info=$('div','dudu-v439-lot-info');
    const novel=stories.find(x=>x?.id===lot.storyId);
    info.append($('strong','',(lot.item.icon||'🎁')+' '+lot.item.name),
     $('small','',lot.item.rank+' · '+(novel?.title||lot.storyId)+
      ' · '+(lot.realm||'')+' · '+fmt(lot.ask)+' Xu (giá đề xuất)'),
     $('small','','Đang ký gửi · chưa mở đấu giá liên tài khoản'));
    const cancel=$('button','','Rút lô');
    cancel.type='button';cancel.addEventListener('click',()=>onCancel?.(lot.id));
    card.append(info,cancel);content.append(card);
   }
  }else{
   content.append($('strong','','Thiệp tặng quà cho truyện'));
   content.append($('p','','Mở vật phẩm rồi chọn “Tặng cho truyện”. Có thể ghi lời nhắn và chọn chương phù hợp. Phiên bản này chỉ ghi vào nhật ký Sandbox của bạn; không đăng bình luận công khai hoặc chuyển quà đến tác giả.'));
  }
  if(s.history.length){
   const history=$('details','dudu-v439-history');
   history.append($('summary','','Lịch sử giao dịch · '+s.history.length));
   const actionLabels={SELL:'Đã bán',GIFT:'Tặng truyện',LIST:'Ký gửi',CANCEL:'Rút lô'};
   for(const h of s.history.slice(-12).reverse()){
    const line=$('div','dudu-v439-history-line');
    const story=stories.find(x=>x.id===h.storyId);
    line.append($('span','',h.day+' · '+actionLabels[h.action]+' '+h.name+
     (story?' → '+story.title:'')),
     $('strong','',h.action==='SELL'?'+'+h.coins+' Xu':h.action==='LIST'?
      fmt(h.ask)+' Xu (đề xuất)':''));
    if(h.note)line.append($('small','', '“'+h.note+'”'));
    history.append(line);
   }
   content.append(history);
  }
  host.append(content);return true;
 }
 root.DuduInventoryHubV439=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
