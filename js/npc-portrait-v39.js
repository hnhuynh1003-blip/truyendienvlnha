/* DUDU V39: single compact ID-only NPC portrait gallery (Sandbox author).
 * This file intentionally leaves canonical character personality and NPC IDs alone.
 * The V01-V06 low-resolution paths remain readable for existing saved NPCs,
 * but are not offered as new choices.
 */
(function(){
 'use strict';
 const library=window.DuduNpcPortraitLibrary;
 const anime=window.DuduNpcAnimeCandidatesV14;
 if(!library||!anime)return;
 let pageSize=24;
 const el=id=>document.getElementById(id);
 const picker=()=>el('npc-r8-gallery-panel');
 function paint(node,id,customSrc){
   if(!node)return;
   node.dataset.duduPortraitId=id||'';
   node.style.backgroundImage='none';
   node.style.backgroundSize='cover';
   node.style.backgroundPosition='center';
   node.style.backgroundRepeat='no-repeat';
   const item=library.preset(id);
   if(item?.animeId){
     const lo=anime.styleFor(item.animeId);
     if(lo){
       node.style.backgroundImage=lo.image;
       node.style.backgroundSize=lo.size;
       node.style.backgroundPosition=lo.position;
     }
     anime.ensureHiRes().then(ok=>{
       if(!ok||!node.isConnected||node.dataset.duduPortraitId!==id)return;
       const hi=anime.hiResStyleFor(item.animeId);
       if(hi){
         node.style.backgroundImage=hi.image;
         node.style.backgroundSize=hi.size;
         node.style.backgroundPosition=hi.position;
       }
     }).catch(()=>{});
   }else{
     const source=customSrc||library.sourceFor(id);
     if(source)node.style.backgroundImage='url('+JSON.stringify(source)+')';
   }
 }
 function selected(id,label,source){
   paint(el('npc-v39-selected-thumb'),id,source);
   paint(el('npc-r8-preview'),id,source);
   if(el('npc-v39-current-id'))el('npc-v39-current-id').textContent=label||'Chưa chọn ảnh · Mở thư viện để chọn';
   if(el('npc-r8-selection-label'))el('npc-r8-selection-label').textContent=label||'Chưa chọn ảnh';
 }
 window.npcSelectPortraitPreset=function(id){
   if(typeof IS_SANDBOX_MODE==='undefined'||!IS_SANDBOX_MODE)return;
   if(id&&!library.preset(id))return;
   const host=picker();
   if(host)host.dataset.uploadRequest=''; // Cancel stale async upload.
   el('npc-r8-preset-id').value=id||'';
   el('npc-r8-upload-id').value='';
   el('npc-v14-anime-id').value='';
   el('npc-r7-portrait').value='';
   const p=library.preset(id);
   selected(id,p?'Mã ảnh '+p.id:'');
   if(host?.open&&id)host.open=false;
   if(host?.open)window.npcRenderPortraitChoices();
 };
 window.npcRenderPortraitChoices=function(){
   if(typeof IS_SANDBOX_MODE==='undefined'||!IS_SANDBOX_MODE||!picker()?.open)return;
   const grid=el('npc-r8-gallery');
   if(!grid)return;
   const gender=el('npc-r9-gender').value;
   const world=el('npc-r9-world').value;
   const query=el('npc-r9-search').value;
   const all=library.search({gender,world,query,limit:100});
   const shown=all.slice(0,pageSize);
   const active=el('npc-r8-preset-id').value;
   grid.replaceChildren();
   for(const art of shown){
     const button=document.createElement('button');
     button.type='button';button.className='dudu-v39-tile';
     button.dataset.portraitId=art.id;
     button.setAttribute('aria-label','Chọn ảnh mã '+art.id);
     button.setAttribute('aria-pressed',String(active===art.id));
     const image=document.createElement('span');image.className='dudu-v39-tile-art';
     const name=document.createElement('span');name.textContent=art.id;
     button.append(image,name);grid.append(button);
     paint(image,art.id);
     button.addEventListener('click',()=>window.npcSelectPortraitPreset(art.id));
   }
   el('npc-r9-results').textContent=
     'Hiển thị '+shown.length+' / '+all.length+' mẫu · mã ảnh độc lập với tính cách';
   const more=el('npc-v39-more');
   more.style.display=pageSize<all.length?'block':'none';
   more.textContent='Xem thêm '+Math.min(24,Math.max(0,all.length-pageSize))+' ảnh';
   if(!all.length){
     const msg=document.createElement('p');msg.className='dudu-v39-empty';
     msg.textContent='Không tìm thấy ID phù hợp. Thử tìm theo portrait-f-01 hoặc portrait-a-01.';
     grid.append(msg);
   }
 };
 window.npcResetPortraitPageV39=function(){pageSize=24;window.npcRenderPortraitChoices();};
 window.npcMorePortraitV39=function(){pageSize+=24;window.npcRenderPortraitChoices();};
 window.npcPortraitToggleV39=function(){if(picker()?.open)window.npcRenderPortraitChoices();};
 window.npcRenderPortraitGallery=function(npc){
   if(typeof IS_SANDBOX_MODE==='undefined'||!IS_SANDBOX_MODE)return;
   const original=library.preset(npc?.portraitPresetId);
   const migrated=library.ANIME.find(p=>p.animeId===npc?.portraitAnimeId);
   const preset=original||migrated||null;
   const host=picker();host.open=false;host.dataset.uploadRequest='';
   el('npc-r8-gallery').replaceChildren();
   el('npc-r9-gender').value='all';
   el('npc-r9-world').value='all';
   el('npc-r9-search').value='';
   pageSize=24;
   el('npc-r8-preset-id').value=preset?.id||'';
   el('npc-r8-upload-id').value=npc?.portraitUploadId||'';
   el('npc-v14-anime-id').value='';
   if(el('npc-v39-upload-feedback'))el('npc-v39-upload-feedback').textContent='';
   if(npc?.portraitUploadId){
     selected('','Ảnh đã tải lên trên thiết bị');
     const storyId=editingCharNovelId;
     const uid=currentUsername||'sandbox-guest';
     const uploadId=npc.portraitUploadId;
     library.readUpload(uid,storyId,uploadId).then(source=>{
       if(!source||el('npc-r8-upload-id')?.value!==uploadId||
          editingCharNovelId!==storyId||uid!==(currentUsername||'sandbox-guest'))return;
       selected('','Ảnh đã tải lên trên thiết bị',source);
     }).catch(()=>{});
   }else if(preset) selected(preset.id,'Mã ảnh '+preset.id);
   else if(npc?.portraitPath){
     const old=window.DuduMultiverseArtV28?.NPC.find(p=>p.portraitPath===npc.portraitPath);
     selected('',old?'Ảnh V'+old.id.slice(1)+' cũ (giữ cho NPC hiện tại)':'Ảnh theo đường dẫn đã lưu','./'+npc.portraitPath);
   }else selected('','');
 };
 // The two obsolete repeated art strips must no longer render or overwrite
 // the canonical V39 selection. Old V14 fields remain for save compatibility.
 window.npcRenderAnimeChoices=function(){};
 window.renderNpcArtPackV28=function(){};
 window.npcPortraitUploadedV39=function(dataUrl,file){
   selected('','Ảnh riêng của bạn · lưu trên thiết bị',dataUrl);
   const feedback=el('npc-v39-upload-feedback');
   if(feedback){
     const after=Math.round(dataUrl.length*0.75/1024);
     feedback.textContent='Đã xử lý ảnh '+(file.size/1024/1024).toFixed(1)+
       ' MB → khoảng '+after+' KB; chỉ lưu trên thiết bị này.';
   }
   if(picker())picker().open=false;
 };
 // Existing runtime renderer is still the authoritative display for saved
 // HD anime atlas and uploaded portraits: adapt only unified IDs.
 const originalRenderer=window.renderNpcPortraitPreview;
 if(typeof originalRenderer==='function'){
   window.renderNpcPortraitPreview=function(node,npc,storyId){
     const stored=library.preset(npc?.portraitPresetId);
     if(stored?.animeId){
       return originalRenderer(node,{...npc,portraitAnimeId:stored.animeId},storyId);
     }
     // No personality-based automatic portrait: unassigned NPCs show initials.
     if(!npc?.portraitPresetId&&!npc?.portraitAnimeId&&!npc?.portraitPath&&!npc?.portraitUploadId){
       if(!node)return;
       node.dataset.portraitToken='v39-unassigned';
       node.style.backgroundImage='none';
       node.textContent=String(npc?.name||'NPC').trim().split(/\\s+/)
         .slice(-2).map(part=>part.charAt(0)).join('').toUpperCase();
       return;
     }
     return originalRenderer(node,npc,storyId);
   };
 }
})();
