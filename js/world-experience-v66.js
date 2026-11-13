/* DUDU V66: six genre portals, many read-only mission previews.
 * No pact signing, progress mutations, rewards or client-authorized gameplay.
 */
(function(){
 'use strict';
 const id=x=>document.getElementById(x);
 const taxonomy=()=>window.DuduWorldTaxonomyV66;
 const blueprints=()=>window.DuduWorldBlueprintV66;
 const genreFor=k=>taxonomy()?.genres.find(g=>g.genreId===k)||null;
 const el=(tag,cls,text)=>{
   const n=document.createElement(tag);if(cls)n.className=cls;
   if(text!==undefined)n.textContent=String(text);
   return n;
 };
 let dialog=null;
 const seen=new Map(); // temporary preview rotation; not account progress.
 function ensureDialog(){
   if(dialog)return dialog;
   dialog=el('dialog','d65-dialog d66-dialog');dialog.id='d65-world-dialog';
   dialog.setAttribute('aria-labelledby','d65-world-dialog-title');
   dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog();});
   document.body.append(dialog);return dialog;
 }
 function closeDialog(){
   if(!dialog)return;
   if(typeof dialog.close==='function'&&dialog.open)dialog.close();
   else dialog.removeAttribute('open');
 }
 function header(code,title){
   const h=el('div','d65-dialog-head'),info=el('div','d65-dialog-titles');
   const titleEl=el('h2','d65-dialog-title',title);titleEl.id='d65-world-dialog-title';
   info.append(el('span','d65-kicker',code),titleEl);
   const close=el('button','d65-close','×');close.type='button';
   close.setAttribute('aria-label','Đóng');close.addEventListener('click',closeDialog);
   h.append(info,close);return h;
 }
 function show(children){
   const d=ensureDialog();d.replaceChildren(...children);
   if(typeof d.showModal==='function'&&!d.open)d.showModal();
   else if(typeof d.showModal!=='function'){d.setAttribute('open','');d.setAttribute('role','dialog');}
   d.querySelector('.d65-close')?.focus();
 }
 function rotate(genreId,tier,output){
   const api=taxonomy(),key=genreId+':'+tier;
   const seenIds=seen.get(key)||[];
   const sample=api.pickPreview({genreId,tier,seenMissionIds:seenIds});
   if(!sample)return;
   let next=seenIds.filter(x=>x!==sample.missionId);
   if(next.length>=api.byGenre(genreId).filter(m=>m.tier===tier).length)next=[];
   next.push(sample.missionId);seen.set(key,next);
   output.replaceChildren();
   const title=el('strong','d66-preview-name',sample.name);
   const line=el('span','d66-preview-tag',sample.subgenre+' · '+sample.tier);
   output.append(title,line,el('span','d66-preview-hook',sample.premise));
   output.dataset.missionId=sample.missionId;
 }
 function openDossier(genreId){
   const genre=genreFor(genreId);if(!genre)return false;
   const all=taxonomy().byGenre(genreId),body=el('section','d65-dossier d66-dossier d63-tone-'+genre.tone);
   const crest=el('div','d65-dossier-mark',genre.symbol);crest.setAttribute('aria-hidden','true');
   const headerLine=el('div','d66-gate-summary');
   headerLine.append(el('span','','F '+all.filter(m=>m.tier==='F').length),
     el('span','','E '+all.filter(m=>m.tier==='E').length),
     el('span','d66-gate-locked','Khế ước bắt buộc'));
   const excerpt=el('p','d65-dossier-lore',genre.summary);
   const previewTitle=el('div','d66-preview-title','Tín hiệu phó bản');
   const previews=el('div','d66-preview-columns');
   for(const tier of ['F','E']){
     const panel=el('div','d66-preview-panel');
     const head=el('div','d66-preview-head');
     head.append(el('span','', 'Cấp '+tier));
     const shuffle=el('button','d66-shuffle','↻');
     shuffle.type='button';shuffle.setAttribute('aria-label','Đổi phó bản cấp '+tier);
     head.append(shuffle);
     const result=el('div','d66-preview-result');
     shuffle.addEventListener('click',()=>rotate(genreId,tier,result));
     panel.append(head,result);previews.append(panel);
     rotate(genreId,tier,result);
   }
   const list=el('details','d66-catalog');
   const summary=el('summary','','Kho '+all.length+' phó bản');
   const ul=el('ul','d66-catalog-list');
   for(const m of all){
     const item=el('li','');
     item.append(el('span','d66-catalog-tier',m.tier),el('span','',m.name));
     ul.append(item);
   }
   list.append(summary,ul);
   const lock=el('div','d65-dossier-locked','Khế ước → Nhiệm vụ F/E → Thăng cấp hệ thống');
   body.append(crest,headerLine,excerpt,previewTitle,previews,list,lock);
   show([header('DUDU / GENRE GATE',genre.name),body]);return true;
 }
 const globalSeen=[];
 const recentGenres=[];
 function openRandomSignal(){
   const api=taxonomy();if(!api)return false;
   const body=el('section','d65-dossier d66-random-dossier');
   const content=el('div','d66-random-result');
   const button=el('button','d65-studio-action d66-random-next','↻ Tín hiệu khác');
   button.type='button';
   function draw(){
     const candidate=api.pickPreview({
       tier:'F',seenMissionIds:globalSeen,recentGenreIds:recentGenres
     });
     if(!candidate)return;
     // Preserve a full F-tier rotation before allowing repeats; favor genre diversity.
     if(globalSeen.length>=api.missions.filter(m=>m.tier==='F').length)globalSeen.length=0;
     globalSeen.push(candidate.missionId);
     recentGenres.push(candidate.genreId);
     if(recentGenres.length>2)recentGenres.shift();
     const genre=genreFor(candidate.genreId);
     content.replaceChildren(
       el('span','d65-kicker',genre?.name||candidate.genreId),
       el('h3','d66-random-name',candidate.name),
       el('p','d66-random-hook',candidate.premise),
       el('span','d66-random-tier','NHIỆM VỤ F · XEM TRƯỚC')
     );
     content.dataset.missionId=candidate.missionId;
   }
   button.addEventListener('click',draw);
   draw();
   const footer=el('div','d65-dossier-locked','Cần khế ước đã xác minh trước khi nhận nhiệm vụ');
   body.append(content,button,footer);
   show([header('DUDU / SIGNAL SCAN','Tín hiệu sơ cấp'),body]);
   return true;
 }
 function decorateTiles(){
   const root=id('d60-worlds-list');if(!root)return;
   root.querySelectorAll('.d64-world-card').forEach(card=>{
     card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-haspopup','dialog');
     const genre=genreFor(card.dataset.genreId);
     if(genre)card.setAttribute('aria-label','Khám phá thể loại '+genre.name);
   });
 }
 function canAuthor(){return typeof canEditStories==='function'&&canEditStories();}
 function download(draft){
   const payload=JSON.stringify(draft,null,2)+'\n';
   const url=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));
   const a=el('a','');a.href=url;a.download=draft.missionId+'-plot-draft.json';
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function openAuthorStudio(){
   if(!canAuthor())return false;
   const api=taxonomy(),drafts=blueprints();
   if(!api||!drafts)return false;
   const body=el('section','d65-studio');
   const genreLabel=el('label','d65-label','Thể loại');
   const genreSelect=el('select','d65-select');genreSelect.id='d66-genre-select';
   genreLabel.htmlFor=genreSelect.id;
   api.genres.forEach(g=>{const o=el('option','',g.name);o.value=g.genreId;genreSelect.append(o);});
   const missionLabel=el('label','d65-label d66-second-label','Phó bản');
   const missionSelect=el('select','d65-select');missionSelect.id='d66-mission-select';
   missionLabel.htmlFor=missionSelect.id;
   function syncMissions(){
     missionSelect.replaceChildren();
     api.byGenre(genreSelect.value).forEach(m=>{
       const o=el('option','',m.tier+' · '+m.name);o.value=m.missionId;missionSelect.append(o);
     });
   }
   genreSelect.addEventListener('change',syncMissions);syncMissions();
   const actions=el('div','d65-studio-controls');
   const downloadBtn=el('button','d65-studio-action','Tải mẫu JSON');
   downloadBtn.type='button';
   downloadBtn.addEventListener('click',()=>{
     const draft=drafts.makeDraft(missionSelect.value);if(draft)download(draft);
   });
   const checkBtn=el('button','d65-studio-import','Kiểm tra JSON');
   checkBtn.type='button';
   const upload=el('input','d65-studio-file');
   upload.type='file';upload.id='d66-world-file';upload.accept='.json,application/json';upload.tabIndex=-1;
   checkBtn.addEventListener('click',()=>upload.click());
   const result=el('p','d65-studio-result');
   result.setAttribute('role','status');result.setAttribute('aria-live','polite');
   upload.addEventListener('change',async()=>{
     const file=upload.files?.[0];result.textContent='';if(!file)return;
     if(file.size>262144){result.textContent='Tệp quá 256 KB.';upload.value='';return;}
     try{
       const data=JSON.parse(await file.text());
       const errors=drafts.validateDraft(data);
       if(data?.missionId!==missionSelect.value)errors.push('mission_does_not_match_selection');
       result.textContent=errors.length?'Bản thảo chưa hợp lệ: '+[...new Set(errors)].join(', '):
         'Bản thảo hợp lệ · chưa lưu hoặc xuất bản.';
     }catch{result.textContent='Không đọc được tệp JSON.';}
     finally{upload.value='';}
   });
   actions.append(downloadBtn,checkBtn,upload);
   body.append(genreLabel,genreSelect,missionLabel,missionSelect,actions,result);
   show([header('DUDU / AUTHOR','Khung kịch bản F–E'),body]);return true;
 }
 const root=id('d60-worlds-list');
 if(root){
   root.addEventListener('click',e=>{
     const card=e.target.closest('.d64-world-card');
     if(card&&root.contains(card))openDossier(card.dataset.genreId);
   });
   root.addEventListener('keydown',e=>{
     if(e.key!=='Enter'&&e.key!==' ')return;
     const card=e.target.closest('.d64-world-card');
     if(!card||card!==e.target||!root.contains(card))return;
     e.preventDefault();openDossier(card.dataset.genreId);
   });
   new MutationObserver(decorateTiles).observe(root,{childList:true,subtree:true});
   decorateTiles();
 }
 window.DuduWorldUXV66=Object.freeze({openDossier,openRandomSignal,openAuthorStudio,decorateTiles});
})();