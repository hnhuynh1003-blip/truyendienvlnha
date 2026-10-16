/* V43.5.1 — compact, data-driven shop UI. Sandbox only.
 * No privileged actions; purchases delegated to original page after validation.
 */
(function(root){
 'use strict';
 const core=root.DuduEconomyCoreV43;
 if(!core)return;
 let tab='COMMON',realm='URBAN',query='';
 const REALMS={URBAN:'Hiện đại',APOCALYPSE:'Tận thế',CULTIVATION:'Tu tiên',
  FANTASY:'Huyền huyễn',SCIFI:'Viễn tưởng',HORROR:'Kinh dị'};
 const make=(tag,cls,copy)=>{
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(copy!==undefined)node.textContent=String(copy);
   return node;
 };
 function render({host,coins,state,onBuy}={}){
   if(!host||typeof onBuy!=='function')return false;
   host.replaceChildren();
   const toolbar=make('section','dudu-v43-market-toolbar');
   const intro=make('div','dudu-v43-market-intro');
   intro.append(make('strong','','✦ DUDU MARKET'),
     make('small','','Chung kho đồ · riêng nguồn nhận'));
   toolbar.append(intro);
   const tabs=make('div','dudu-v43-market-tabs');
   for(const [id,label] of [['COMMON','Mua sắm'],['REALM','Vị diện'],
     ['DUDU','Kỷ vật'],['STORY','Theo truyện'],['TOOLS','Chức năng']]){
     const button=make('button','dudu-v43-market-tab'+(id===tab?' is-active':''),label);
     button.type='button';button.setAttribute('aria-pressed',String(tab===id));
     button.addEventListener('click',()=>{tab=id;render({host,coins,state,onBuy});});
     tabs.append(button);
   }
   const filters=make('div','dudu-v43-market-filters');
   const input=make('input','dudu-v43-market-search');
   input.type='search';input.placeholder='Tìm tên vật phẩm hoặc phẩm cấp';
   input.setAttribute('aria-label','Tìm vật phẩm trong cửa hàng');
   input.value=query;
   input.addEventListener('input',()=>{
     query=input.value.slice(0,60);
     // Keep keyboard focus while updating the grid only.
     draw();
   });
   filters.append(input);
   const realmSelector=make('select','dudu-v43-market-realm');
   realmSelector.setAttribute('aria-label','Chọn vị diện để xem vật phẩm');
   for(const [id,label] of Object.entries(REALMS)){
     const opt=make('option','',label);opt.value=id;realmSelector.append(opt);
   }
   realmSelector.value=realm;
   realmSelector.addEventListener('change',()=>{
     realm=realmSelector.value;draw();
   });
   filters.append(realmSelector);
   const hint=make('p','dudu-v43-market-hint');
   const collection=make('div','dudu-v43-market-grid');
   const footer=make('small','dudu-v43-market-footer',
     'Vật phẩm có nguồn gốc và ID cố định. Kỷ vật thật chỉ do máy chủ xác nhận.');
   toolbar.append(tabs,filters,hint);
   host.append(toolbar,collection,footer);
   function draw(){
     realmSelector.hidden=tab!=='REALM';
     input.hidden=tab==='STORY'||tab==='TOOLS';
     const ledger=core.norm(state);
     if(tab==='COMMON'){
       hint.textContent='🪙 '+coins+' Xu · '+ledger.total+'/'+core.PURCHASE_TOTAL_PER_DAY+
         ' lượt mua hôm nay · Mua hàng không cộng EXP';
     }else if(tab==='REALM'){
       hint.textContent='Vật phẩm vị diện chỉ rơi ở chương được tác giả gắn đúng thế giới. Chưa bán bằng Xu.';
     }else if(tab==='DUDU'){
       hint.textContent='Kỷ vật hệ thống: xem nguồn gốc, không mở bán. Quyền sở hữu phải được máy chủ xác nhận.';
     }else if(tab==='STORY'){
       hint.textContent='Kỷ vật truyện/chương do tác giả quản lý. Chỉ hiển thị sau khi phát hành an toàn, không bán tự động.';
     }else{
       hint.textContent='Vật phẩm tiêu hao và Bộ Nạp Tần Số đang chuẩn bị. Chưa mở mua hoặc dùng để tránh farm lượt.';
     }
     collection.replaceChildren();
     if(tab==='STORY'||tab==='TOOLS'){
       const empty=make('div','dudu-v43-market-placeholder',
         tab==='STORY'?'📖 Vật phẩm truyện/chương được phát hành theo sự kiện hoặc nhiệm vụ đã xác nhận.':
         '🔋 Sắp có: vật phẩm hồi lượt nhặt, hộp quà giao lưu và vật phẩm tiêu hao.');
       collection.append(empty);return;
     }
     const items=core.preview({tab,realmTag:realm,query});
     if(!items.length){
       collection.append(make('p','dudu-v43-market-empty','Không có vật phẩm khớp bộ lọc.'));
       return;
     }
     for(const item of items){
       const card=make('article','dudu-v43-market-item');
       card.dataset.itemId=item.id;
       card.dataset.scope=item.scope;
       const artwork=make('span','dudu-v43-market-icon',item.icon||'🎁');
       artwork.setAttribute('aria-hidden','true');
       const info=make('div','dudu-v43-market-copy');
       info.append(make('strong','',item.name));
       const meta=make('span','',item.rank+' · '+
         (item.scope==='COMMON'?'Phổ thông':
          item.scope==='REALM'?'Vị diện '+REALMS[item.realmTag]:
          'Kỷ vật DUDU'));
       const description=make('small','',item.desc||item.description||'');
       info.append(meta,description);
       const right=make('div','dudu-v43-market-buy');
       if(tab==='COMMON'){
         const n=ledger.counts[item.id]||0;
         right.append(make('strong','',item.price+' Xu'));
         const button=make('button','btn','Mua');
         button.type='button';
         button.disabled=ledger.total>=core.PURCHASE_TOTAL_PER_DAY||
           n>=core.PURCHASE_PER_ITEM_PER_DAY||coins<item.price;
         button.setAttribute('aria-label','Mua '+item.name+' giá '+item.price+' Xu');
         button.addEventListener('click',()=>onBuy(item.id));
         right.append(button,make('small','',n+'/'+core.PURCHASE_PER_ITEM_PER_DAY+' hôm nay'));
       }else{
         right.append(make('span','dudu-v43-market-not-sale',
           tab==='REALM'?'Nhặt theo chương':'Không bán'));
       }
       card.append(artwork,info,right);
       collection.append(card);
     }
   }
   draw();
   return true;
 }
 root.DuduMarketUIV43=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
