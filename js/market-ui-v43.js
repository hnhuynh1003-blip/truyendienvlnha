/* V43.5.1 — compact, data-driven shop UI. Sandbox only.
 * No privileged actions; purchases delegated to original page after validation.
 */
(function(root){
 'use strict';
 const core=root.DuduEconomyCoreV43;
 const storyCatalog=root.DuduStoryMarketV43;
 if(!core)return;
 let tab='COMMON',realm='URBAN',query='',storyId='';
 const REALMS={URBAN:'Hiện đại',APOCALYPSE:'Tận thế',CULTIVATION:'Tu tiên',
  FANTASY:'Huyền huyễn',SCIFI:'Viễn tưởng',HORROR:'Kinh dị'};
 const make=(tag,cls,copy)=>{
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(copy!==undefined)node.textContent=String(copy);
   return node;
 };
 function render({host,coins,state,onBuy,stories=[],readRewards={},
   functionalState=null,readOnly=false,saleIds=null}={}){
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
     button.addEventListener('click',()=>{
       tab=id;render({host,coins,state,onBuy,stories,readRewards,functionalState,readOnly,saleIds});
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
   const collection=make('div','dudu-v43-market-grid');
   const footer=make('small','dudu-v43-market-footer',
     readOnly?'Chế độ tham khảo · Không trừ Xu, không cấp vật phẩm. Giao dịch thật cần máy chủ xác nhận.':
     'Vật phẩm có nguồn gốc và ID cố định. Kỷ vật thật chỉ do máy chủ xác nhận.');
   toolbar.append(tabs,filters,hint);
   host.append(toolbar,collection,footer);
   function draw(){
     realmSelector.hidden=tab!=='REALM';
     storySelector.hidden=tab!=='STORY'||!storyOptions.length;
     input.hidden=false;
     const ledger=core.norm(state);
     const utility=root.DuduFunctionalItemsV438;
     const pending=utility?.norm(functionalState).pending;
     if(tab==='COMMON'){
       hint.textContent='🪙 '+coins+' Xu · '+ledger.total+'/'+core.PURCHASE_TOTAL_PER_DAY+
         ' lượt mua hôm nay · Mua hàng không cộng EXP'+
         (pending?' · 🎟️ Phiếu -25% đang chờ áp dụng':'');
     }else if(tab==='REALM'){
       hint.textContent='Vật phẩm vị diện chỉ rơi ở chương được tác giả gắn đúng thế giới. Chưa bán bằng Xu.';
     }else if(tab==='DUDU'){
       hint.textContent='Kỷ vật hệ thống: xem nguồn gốc, không mở bán. Quyền sở hữu phải được máy chủ xác nhận.';
     }else if(tab==='STORY'){
       hint.textContent='Danh mục tác giả (chỉ xem) · không phải đồ sở hữu hoặc phần thưởng được cấp.';
     }else{
       hint.textContent='Công cụ Sandbox: nạp hồi chiêu, gia tốc 60 giây, gói tiếp tế và phiếu giảm giá. Không tạo thêm Nhặt bảo trong chương.';
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
     const visible=tab==='STORY'&&searchText?
       items.filter(x=>(x.name+' '+x.desc+' '+x.rank).toLocaleLowerCase('vi').includes(searchText)):items;
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
         const save=tab==='COMMON'?(utility?.discount(functionalState,{
           itemId:item.id,price:item.price}).amount||0):0;
         right.append(make('strong','',save?
           (item.price-save)+' Xu':item.price+' Xu'));
         if(save)right.append(make('small','dudu-v438-discount',
           '−'+save+' Xu (phiếu)'));
         const button=make('button','btn','Mua');
         button.type='button';
         button.disabled=readOnly||(Array.isArray(saleIds)&&!saleIds.includes(item.id))||
           ledger.total>=core.PURCHASE_TOTAL_PER_DAY||
           n>=limit||coins<item.price-save;
         if(readOnly||(Array.isArray(saleIds)&&!saleIds.includes(item.id))){
           button.textContent='Chưa mở';
           button.title='Vật phẩm này chưa hỗ trợ mua trên máy chủ';
         }
         button.setAttribute('aria-label',readOnly?'Xem '+item.name+'; chưa hỗ trợ mua':'Mua '+item.name+' giá '+(item.price-save)+' Xu');
         button.addEventListener('click',()=>onBuy(item.id));
         right.append(button,make('small','',n+'/'+limit+' hôm nay'));
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
