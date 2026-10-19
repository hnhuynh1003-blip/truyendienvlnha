/* DUDU V65 — optional world dossiers and offline author blueprint tools.
 * Never starts gameplay, saves a storyline, or writes to Firestore.
 */
(function () {
 'use strict';
 const id=x=>document.getElementById(x);
 const registry=()=>window.DuduWorldRegistryV63;
 const blueprint=()=>window.DuduWorldBlueprintV65;
 const worldFor=worldId=>(registry()?.starterWorlds||[]).find(w=>w.worldId===worldId)||null;
 const node=(tag,cls,text)=>{
   const el=document.createElement(tag);if(cls)el.className=cls;
   if(text!==undefined)el.textContent=String(text);
   return el;
 };
 let dialog=null;
 function ensureDialog(){
   if(dialog)return dialog;
   dialog=node('dialog','d65-dialog');
   dialog.id='d65-world-dialog';
   dialog.setAttribute('aria-labelledby','d65-world-dialog-title');
   dialog.addEventListener('click',e=>{
     // Clicking the native dialog backdrop closes it; interior clicks do not.
     if(e.target===dialog)closeDialog();
   });
   document.body.append(dialog);
   return dialog;
 }
 function closeDialog(){
   if(!dialog)return;
   if(typeof dialog.close==='function'&&dialog.open)dialog.close();
   else dialog.removeAttribute('open');
 }
 function showDialog(contents){
   const d=ensureDialog();
   d.replaceChildren(...contents);
   if(typeof d.showModal==='function'){
     if(!d.open)d.showModal();
   }else{
     d.setAttribute('open','');
     d.setAttribute('role','dialog');
     d.setAttribute('aria-modal','true');
   }
   d.querySelector('.d65-close')?.focus();
 }
 function dialogTop(eyebrow,title){
   const head=node('div','d65-dialog-head');
   const titles=node('div','d65-dialog-titles');
   const titleNode=node('h2','d65-dialog-title',title);
   titleNode.id='d65-world-dialog-title';
   titles.append(node('span','d65-kicker',eyebrow),titleNode);
   const close=node('button','d65-close','×');
   close.type='button';close.setAttribute('aria-label','Đóng');
   close.addEventListener('click',closeDialog);
   head.append(titles,close);
   return head;
 }
 function openDossier(worldId){
   const w=worldFor(worldId);if(!w)return false;
   const section=node('section','d65-dossier d63-tone-'+w.tone);
   section.dataset.worldId=w.worldId;
   const medallion=node('div','d65-dossier-mark',w.symbol);
   medallion.setAttribute('aria-hidden','true');
   const level=node('div','d65-dossier-level','Cấp '+w.tier+' · '+w.kind);
   const lore=node('p','d65-dossier-lore',w.teaser);
   const lock=node('div','d65-dossier-locked');
   lock.append(node('span','d65-lock-mark','◇'),
     node('span','','Cổng thế giới chưa mở'));
   section.append(medallion,level,lore,lock);
   showDialog([dialogTop(w.worldId.toUpperCase(),w.name),section]);
   return true;
 }
 function decorateTiles(){
   const root=id('d60-worlds-list');if(!root)return;
   root.querySelectorAll('.d64-world-card').forEach(card=>{
     card.tabIndex=0;
     card.setAttribute('role','button');
     card.setAttribute('aria-haspopup','dialog');
     const w=worldFor(card.dataset.worldId);
     if(w)card.setAttribute('aria-label','Xem hồ sơ '+w.name+', cấp '+w.tier);
   });
 }
 function authorizeAuthor(){
   return typeof canEditStories==='function'&&canEditStories();
 }
 function downloadDraft(draft){
   const payload=JSON.stringify(draft,null,2)+'\n';
   const file=new Blob([payload],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(file);
   const a=document.createElement('a');
   a.href=url;a.download='dudu-'+draft.worldId+'-scenario-draft.json';
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function openAuthorStudio(){
   if(!authorizeAuthor())return false;
   const service=blueprint(),worlds=registry()?.starterWorlds;
   if(!service||!Array.isArray(worlds))return false;
   const body=node('section','d65-studio');
   const pickerLabel=node('label','d65-label','Thế giới');
   const picker=node('select','d65-select');
   picker.id='d65-world-picker';
   worlds.forEach(w=>{
     const option=node('option','',w.name+' · Cấp '+w.tier);
     option.value=w.worldId;picker.append(option);
   });
   pickerLabel.htmlFor=picker.id;
   const tools=node('div','d65-studio-controls');
   const download=node('button','d65-studio-action','Tải mẫu JSON');
   download.type='button';
   download.addEventListener('click',()=>{
     const draft=service.makeDraft(picker.value);
     if(draft)downloadDraft(draft);
   });
   const uploadTrigger=node('button','d65-studio-import','Kiểm tra tệp JSON');
   uploadTrigger.type='button';
   const upload=node('input','d65-studio-file');
   upload.type='file';upload.id='d65-world-file';upload.accept='.json,application/json';
   upload.tabIndex=-1;
   uploadTrigger.addEventListener('click',()=>upload.click());
   const result=node('p','d65-studio-result');
   result.setAttribute('role','status');result.setAttribute('aria-live','polite');
   upload.addEventListener('change',async()=>{
     const file=upload.files?.[0];
     result.textContent='';
     if(!file)return;
     if(file.size>262144){result.textContent='Tệp lớn hơn giới hạn kiểm tra 256 KB.';upload.value='';return;}
     try{
       const data=JSON.parse(await file.text());
       const errors=service.validateDraft(data);
       if(data?.worldId!==picker.value)errors.push('world_does_not_match_selection');
       result.textContent=errors.length?
         'Bản thảo chưa hợp lệ: '+[...new Set(errors)].join(', '):
         'Mẫu hợp lệ. Chưa lưu hoặc xuất bản.';
     }catch{
       result.textContent='Không đọc được tệp JSON.';
     }finally{upload.value='';}
   });
   tools.append(download,uploadTrigger,upload);
   body.append(pickerLabel,picker,tools,result);
   showDialog([dialogTop('DUDU / AUTHOR','Khung kịch bản'),body]);
   return true;
 }
 const root=id('d60-worlds-list');
 if(root){
   root.addEventListener('click',e=>{
     const card=e.target.closest('.d64-world-card');
     if(card&&root.contains(card))openDossier(card.dataset.worldId);
   });
   root.addEventListener('keydown',e=>{
     if(e.key!=='Enter'&&e.key!==' ')return;
     const card=e.target.closest('.d64-world-card');
     if(!card||e.target!==card||!root.contains(card))return;
     e.preventDefault();openDossier(card.dataset.worldId);
   });
   new MutationObserver(decorateTiles).observe(root,{childList:true,subtree:true});
   decorateTiles();
 }
 window.DuduWorldUXV65=Object.freeze({openDossier,openAuthorStudio,decorateTiles});
})();
