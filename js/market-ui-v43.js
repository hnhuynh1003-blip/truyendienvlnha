/* V43.5.2 — compact, data-driven shop UI for Sandbox and personal accounts.
 * Purchases are delegated to the caller; this renderer never grants items.
 */
(function(root){
 'use strict';
 const core=root.DuduEconomyCoreV43;
 const storyCatalog=root.DuduStoryMarketV43;
 if(!core)return;
 let tab='COMMON',realm='URBAN',query='',storyId='';
 let quickRanks=['F','E','D'],quickKeepOne=false,quickSelectedIds=new Set();
 const REALMS={URBAN:'Hiện đại',APOCALYPSE:'Tận thế',CULTIVATION:'Tu tiên',
  FANTASY:'Huyền huyễn',SCIFI:'Viễn tưởng',HORROR:'Kinh dị'};
 const make=(tag,cls,copy)=>{
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(copy!==undefined)node.textContent=String(copy);
   return node;
 };
 function render({host,coins,state,onBuy,stories=[],readRewards={},
   functionalState=null,readOnly=false,saleIds=null,personalMode=false,
   inventory=[],storyStates={},onBulkSell=null,bulkBusy=false}={}){
   if(!host||typeof onBuy!=='function')return false;
   host.replaceChildren();
   const toolbar=make('section','dudu-v43-market-toolbar');
   const intro=make('div','dudu-v43-market-intro');
   intro.append(make('strong','','✦ DUDU MARKET'),
     make('small','','Chung kho đồ · riêng nguồn nhận'));
   // The phone already presents the coin mark and wallet balance.
   if(!personalMode)toolbar.append(intro);
   const tabs=make('div','dudu-v43-market-tabs');
   const tabOptions=[['COMMON','Mua sắm']];
   if(personalMode&&typeof onBulkSell==='function')
    tabOptions.push(['SELL','Bán nhanh']);
   tabOptions.push(['REALM','Vị diện'],['DUDU','Kỷ vật'],
    ['STORY','Theo truyện'],['TOOLS','Chức năng']);
   if(tab==='SELL'&&!personalMode)tab='COMMON';
   for(const [id,label] of tabOptions){
     const button=make('button','dudu-v43-market-tab'+(id===tab?' is-active':''),label);
     button.type='button';button.setAttribute('aria-pressed',String(tab===id));
     button.addEventListener('click',()=>{
       tab=id;render({host,coins,state,onBuy,stories,readRewards,functionalState,
        readOnly,saleIds,personalMode,inventory,storyStates,onBulkSell,bulkBusy});
     });
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
   const storySelector=make('select','dudu-v43-market-story');
   storySelector.setAttribute('aria-label','Chọn truyện để xem danh mục vật phẩm');
   const storyOptions=storyCatalog?.options(stories)||[];
   if(!storyOptions.some(s=>s.id===storyId))storyId=storyOptions[0]?.id||'';
   for(const source of storyOptions){
     const option=make('option','',source.title);option.value=source.id;
     storySelector.append(option);
   }
   if(storyId)storySelector.value=storyId;
   storySelector.addEventListener('change',()=>{
     storyId=storySelector.value;draw();
   });
   filters.append(storySelector);
   const hint=make('p','dudu-v43-market-hint');
   const funEntry=make('button','dudu-v43-market-fun-entry','✦ Đến Hộp Mù Vạn Bảo ›');
   funEntry.type='button';funEntry.hidden=true;
   funEntry.addEventListener('click',()=>root.openPhoneApp?.('fun'));
   const collection=make('div','dudu-v43-market-grid');
   const footer=make('small','dudu-v43-market-footer',
     readOnly?'Chỉ xem trước · Chưa thể mua các món này.':
     personalMode?'Đồ hiếm đang chờ ngày mở bán.':
     'Khám phá vật phẩm và kỷ vật của DUDU.');
   toolbar.append(tabs,filters,hint,funEntry);
   host.append(toolbar,collection,footer);
   function draw(){
     funEntry.hidden=tab!=='DUDU';
     realmSelector.hidden=tab!=='REALM';
     storySelector.hidden=tab!=='STORY'||!storyOptions.length;
     input.hidden=tab==='SELL';
     hint.hidden=personalMode&&tab==='COMMON';
     if(tab==='SELL'){
       hint.hidden=true;collection.replaceChildren();
       const engine=root.DuduPersonalBulkSaleF34;
       const heading=make('div','f34-quick-head');
       heading.append(make('strong','','BÁN NHANH · F / E / D'),
        make('small','','Tích từng món muốn bán · đồ đã khóa tự động được giữ lại'));
       const rankBar=make('div','f34-quick-ranks');
       for(const rank of ['F','E','D']){
         const label=make('label','f34-quick-rank');
         const cb=make('input');cb.type='checkbox';cb.checked=quickRanks.includes(rank);
         cb.addEventListener('change',()=>{
           quickRanks=cb.checked?[...quickRanks,rank]:quickRanks.filter(x=>x!==rank);
           quickSelectedIds.clear();
           draw();
         });label.append(cb,make('span','',rank));rankBar.append(label);
       }
       const keepLabel=make('label','f34-quick-keep');
       const keep=make('input');keep.type='checkbox';keep.checked=quickKeepOne;
       keep.addEventListener('change',()=>{quickKeepOne=keep.checked;
        quickSelectedIds.clear();draw();});
       keepLabel.append(keep,make('span','','Giữ lại 1 bản mỗi loại'));
       const all=engine?.candidates(inventory,storyStates,quickRanks,quickKeepOne)||[];
       const max=engine?.MAX_BATCH||100;
       const selectionBar=make('div','f36-quick-choose');
       const chooseAll=make('button','','✓ Chọn tất cả');chooseAll.type='button';
       const clearAll=make('button','','Bỏ chọn');clearAll.type='button';
       selectionBar.append(chooseAll,clearAll);
       const count=make('div','f34-quick-total');
       const countText=make('span','','0 món được chọn'),
        sumText=make('strong','dudu-money-display--gold','+0');
       count.append(countText,sumText);
       const rows=make('div','f34-quick-list');
       const boxes=[];
       for(const item of all){
         const row=make('label','f34-quick-row f36-quick-item');
         const cb=make('input');cb.type='checkbox';
         cb.checked=quickSelectedIds.has(item.instanceId);
         cb.setAttribute('aria-label','Chọn bán '+item.name+' giá '+item.price+' Xu');
         const art=make('span','f36-quick-art');
         const owned=inventory.find(x=>x?.instanceId===item.instanceId);
         if(owned&&!root.DuduItemArtV13?.mount?.(art,owned))
          art.textContent=owned.icon||'✦';
         const name=make('span','f34-quick-name');
         name.append(make('b','',item.name),make('small','',item.rank));
         row.append(cb,art,name,
          make('b','dudu-money-display--gold','+'+item.price));
         cb.addEventListener('change',()=>{
           if(cb.checked){
             const picked=all.filter(x=>quickSelectedIds.has(x.instanceId)).length;
             if(picked>=max){cb.checked=false;return;}
             quickSelectedIds.add(item.instanceId);
           }else quickSelectedIds.delete(item.instanceId);
           refreshSelection();
         });
         boxes.push(cb);
         rows.append(row);
       }
       if(!all.length)rows.append(make('p','dudu-v43-market-empty',
         'Không có món F/E/D phù hợp. Đồ khóa và công cụ đang dùng được giữ lại.'));
       const action=make('button','f34-quick-confirm');action.type='button';
       function picked(){return all.filter(x=>quickSelectedIds.has(x.instanceId)).slice(0,max);}
       function refreshSelection(){
         const chosen=picked(),total=chosen.reduce((n,x)=>n+x.price,0);
         countText.textContent=chosen.length+' món được chọn';sumText.textContent='+'+total;
         action.textContent=bulkBusy?'Đang xác nhận…':
          'Bán '+chosen.length+' món · +'+total+' Xu';
         action.disabled=bulkBusy||!chosen.length||readOnly;
       }
       chooseAll.addEventListener('click',()=>{
         quickSelectedIds.clear();
         for(const item of all.slice(0,max))quickSelectedIds.add(item.instanceId);
         boxes.forEach((cb,i)=>{cb.checked=quickSelectedIds.has(all[i].instanceId);});
         refreshSelection();
       });
       clearAll.addEventListener('click',()=>{
         quickSelectedIds.clear();boxes.forEach(cb=>{cb.checked=false;});
         refreshSelection();
       });
       action.addEventListener('click',()=>{
         if(action.disabled)return;
         const selected=picked(),total=selected.reduce((n,x)=>n+x.price,0);
         if(!root.confirm?.('Bán '+selected.length+' món F/E/D để nhận '+total+
          ' Xu Vàng? Không thể hoàn tác.'))return;
         void onBulkSell(selected.map(x=>x.instanceId));
       });
       refreshSelection();
       collection.append(heading,rankBar,keepLabel,selectionBar,count,rows,action);
       if(all.length>max)collection.append(make('small','f34-quick-note',
        'Mỗi giao dịch tối đa '+max+' món. Bán xong có thể tiếp tục.'));
       footer.textContent='Giao dịch một lần · Có biên nhận · Không cộng Xu lặp.';
       return;
     }
     footer.textContent=readOnly?'Chỉ xem trước · Chưa thể mua các món này.':
      personalMode?'Đồ hiếm đang chờ ngày mở bán.':'Khám phá vật phẩm và kỷ vật của DUDU.';
     const ledger=core.norm(state);
     const utility=root.DuduFunctionalItemsV438;
     const pending=utility?.norm(functionalState).pending;
     if(tab==='COMMON'){
       hint.className='dudu-v43-market-hint'+(personalMode?'':' dudu-money-display--gold');
       hint.textContent=personalMode?'':
        coins+' · '+ledger.total+'/'+core.PURCHASE_TOTAL_PER_DAY+
         ' lượt mua hôm nay · Mua hàng không cộng EXP'+
         (pending?' · 🎟️ Phiếu -25% đang chờ áp dụng':'');
     }else if(tab==='REALM'){
       hint.className='dudu-v43-market-hint';
       hint.textContent='Vật phẩm vị diện chỉ rơi ở chương được tác giả gắn đúng thế giới. Chưa bán bằng Xu Vàng.';
     }else if(tab==='DUDU'){
       hint.className='dudu-v43-market-hint';
       hint.textContent='Kỷ vật hiếm · Chưa mở bán.';
     }else if(tab==='STORY'){
       hint.className='dudu-v43-market-hint';
       hint.textContent='Vật phẩm trong truyện · Xem trước.';
     }else{
       hint.className='dudu-v43-market-hint';
       hint.textContent=(personalMode?'Công cụ hỗ trợ: ':'Công cụ Sandbox: ')+
        'nạp hồi chiêu, gia tốc 60 giây, gói tiếp tế và phiếu giảm giá. Không tạo thêm Nhặt bảo trong chương.';
     }
     collection.replaceChildren();
     const storyIndex=tab==='STORY'?storyCatalog?.index({stories,storyId,readRewards}):null;
     if(tab==='STORY'&&storyIndex?.hidden){
       const shield=make('p','dudu-v43-market-locked',
         '🔒 '+storyIndex.hidden+' vật phẩm gắn chương chưa đọc được ẩn tên.');
       collection.append(shield);
     }
     const items=tab==='STORY'?(storyIndex?.items||[]):
       core.preview({tab,realmTag:realm,query});
     const searchText=query.trim().toLocaleLowerCase('vi');
     // Archived drafts must never return to a sale/preview shelf. They can
     // still be inspected in the owner's warehouse using their permanent ID.
     const activeItems=items.filter(x=>!x.archived&&x.published!==false);
     const visible=tab==='STORY'&&searchText?
       activeItems.filter(x=>(x.name+' '+x.desc+' '+x.rank).toLocaleLowerCase('vi').includes(searchText)):activeItems;
     if(!visible.length){
       collection.append(make('p','dudu-v43-market-empty',
         tab==='STORY'?'Chưa có vật phẩm công khai cho truyện này hoặc bạn chưa mở chương liên quan.':
         'Không có vật phẩm khớp bộ lọc.'));
       return;
     }
     for(const item of visible){
       const card=make('article','dudu-v43-market-item');
       card.dataset.itemId=item.id;
       card.dataset.scope=item.scope;
       const artwork=make('span','dudu-v43-market-icon',item.icon||'🎁');
       artwork.setAttribute('aria-hidden','true');
       const canonical=root.DuduItemCatalog?.byId(item.id);
       const rarity=root.DuduItemArtV13?.visual(canonical||item);
       if(rarity)card.style.setProperty('--rarity-glow',rarity.light);
       root.DuduItemArtV13?.mount(artwork,canonical||item);
       const info=make('div','dudu-v43-market-copy');
       info.append(make('strong','',item.name));
       const meta=make('span','',item.rank+' · '+
         (item.scope==='COMMON'?'Phổ thông':
          item.scope==='REALM'?'Vị diện '+REALMS[item.realmTag]:
          item.scope==='STORY'?'Riêng truyện':
          item.scope==='CHAPTER'?'Riêng chương':
          item.scope==='FUNCTIONAL'?'Công cụ tiêu hao':
          'Kỷ vật DUDU'));
       const description=make('small','',item.desc||item.description||'');
       info.append(meta,description);
       if(tab==='STORY'){
         const context=make('small','dudu-v43-market-provenance',
           item.scope==='CHAPTER'?
             '📖 '+item.chapterTitle+' · '+item.sourceLabel:
             '📖 '+item.storyTitle+' · '+item.sourceLabel);
         info.append(context);
       }
       const right=make('div','dudu-v43-market-buy');
       if(tab==='COMMON'||tab==='TOOLS'){
         const n=ledger.counts[item.id]||0;
         const limit=core.TOOL_LIMITS[item.id]||core.PURCHASE_PER_ITEM_PER_DAY;
         const save=!personalMode&&tab==='COMMON'?(utility?.discount(functionalState,{
           itemId:item.id,price:item.price}).amount||0):0;
         right.append(make('strong','dudu-money-display--gold',item.price-save));
         if(save)right.append(make('small','dudu-v438-discount dudu-money-display--gold',
           '−'+save+' (phiếu)'));
         const button=make('button','btn','Mua');
         button.type='button';
         button.disabled=readOnly||(Array.isArray(saleIds)&&!saleIds.includes(item.id))||
           (!personalMode&&(ledger.total>=core.PURCHASE_TOTAL_PER_DAY||n>=limit))||
           coins<item.price-save;
         if(readOnly||(Array.isArray(saleIds)&&!saleIds.includes(item.id))){
           button.textContent='Chưa mở';
           button.title='Vật phẩm này chưa hỗ trợ mua trên máy chủ';
         }
         button.setAttribute('aria-label',readOnly?'Xem '+item.name+'; chưa hỗ trợ mua':'Mua '+item.name+' giá '+(item.price-save)+' Xu Vàng');
         button.addEventListener('click',()=>onBuy(item.id));
         right.append(button);
         if(!personalMode)right.append(make('small','',n+'/'+limit+' hôm nay'));
       }else{
         right.append(make('span','dudu-v43-market-not-sale',
           tab==='REALM'?'Nhặt theo chương':tab==='STORY'?'Chưa cấp':'Không bán'));
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
