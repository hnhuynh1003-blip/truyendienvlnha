/* V43.5 — read-only Sandbox album inside existing Museum.
 * This is NOT the server collectible book. Never calls grant or save.
 */
(function(root){
 'use strict';
 const rules=root.DuduMuseumMemoriesV43;
 const byId=id=>document.getElementById(id);
 // The preview must remain visible to Sandbox guests. Guest mode is always
 // EMPTY: no cached profile, NPCs, hidden account data or achievements leak.
 const sandbox=()=>!!rules&&typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const signedIn=()=>sandbox()&&typeof currentUsername==='string'&&!!currentUsername;
 const node=(tag,cls,label)=>{
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(label!==undefined)el.textContent=String(label);
   return el;
 };
 function render(){
   const serverContainer=byId('museum-items');
   if(!serverContainer)return;
   const existing=byId('dudu-v43-memory-album');
   if(!sandbox()){
     existing?.remove();
     return;
   }
   const owner=signedIn()?currentUsername:'';
   const previousOwner=existing?.dataset.owner;
   const previousSelection=owner&&previousOwner===owner?
     existing.querySelector('#dudu-v43-memory-source')?.value:null;
   existing?.remove();
   const groups=owner?
     rules.catalog({companionState:userProfile?.duduCompanionV43,
       novels,storyStates:userProfile?.storyStates}):
     [rules.dudu(null)];
   const album=node('section','dudu-v43-memory-album');
   album.id='dudu-v43-memory-album';
   album.dataset.owner=owner;
   album.setAttribute('aria-label','Album kỷ niệm tình bạn thử nghiệm');
   const header=node('div','dudu-v43-memory-head');
   header.append(node('strong','','✦ Album kỷ niệm'),
     node('span','dudu-v43-memory-tag','Sandbox · xem trước'));
   const description=node('p','dudu-v43-memory-description',
     owner?'Kỷ niệm từ các ngày gắn kết. Chỉ xem, không phải kỷ vật đã cấp.':
       'Chưa đăng nhập Sandbox. Đăng nhập để xem kỷ niệm của bạn; các mốc bên dưới chỉ là hình mẫu.');
   const chooser=node('select','dudu-v43-memory-select');
   chooser.id='dudu-v43-memory-source';
   chooser.setAttribute('aria-label','Xem kỷ niệm DUDU hoặc NPC đã liên kết');
   const system=node('option','','✦ DUDU · Người bạn đầu tiên');
   system.value='dudu';chooser.append(system);
   const byStory=new Map();
   for(const group of groups.slice(1)){
     let holder=byStory.get(group.storyId);
     if(!holder){
       holder=node('optgroup');
       holder.label=group.storyTitle;
       chooser.append(holder);byStory.set(group.storyId,holder);
     }
     const opt=node('option','',group.title+(group.archived?' · đã lưu trữ':''));
     opt.value=group.key;
     holder.append(opt);
   }
   if(previousSelection&&groups.some(g=>g.key===previousSelection))
     chooser.value=previousSelection;
   const counter=node('p','dudu-v43-memory-counter');
   const progress=node('div','dudu-v43-memory-progress');
   progress.setAttribute('role','progressbar');
   progress.setAttribute('aria-valuemin','0');
   progress.setAttribute('aria-label','Tiến độ kỷ niệm đã ghi nhận');
   const progressFill=node('span','dudu-v43-memory-fill');progress.append(progressFill);
   const cards=node('div','dudu-v43-memory-grid');
   const note=node('p','dudu-v43-memory-note',
     'Kỷ niệm chỉ là tiến độ thử nghiệm, không phải kỷ vật đã xác minh. Bảo Tàng chính thức kiểm tra quyền sở hữu tại máy chủ.');
   function update(){
     if(!sandbox()||album.dataset.owner!==(signedIn()?currentUsername:''))return;
     const entry=groups.find(g=>g.key===chooser.value)||groups[0];
     counter.textContent=entry.earned+'/'+entry.total+' mốc đã ghi nhận'+
       (entry.type==='npc'?' · '+entry.storyTitle:'');
     progress.setAttribute('aria-valuemax',String(entry.total));
     progress.setAttribute('aria-valuenow',String(entry.earned));
     progressFill.style.width=(entry.total?entry.earned/entry.total*100:0)+'%';
     cards.replaceChildren();
     for(const item of entry.items){
       const card=node('div','dudu-v43-memory-card'+(item.earned?' is-earned':' is-locked'));
       card.dataset.milestoneDay=String(item.day);
       card.dataset.earned=String(item.earned);
       const icon=node('span','dudu-v43-memory-icon',item.earned?item.icon:'◇');
       icon.setAttribute('aria-hidden','true');
       const label=node('div','dudu-v43-memory-card-copy');
       label.append(node('strong','',item.name),
         node('small','',item.day+' ngày · '+(item.earned?'Đã ghi nhận':'Chưa đạt')));
       card.append(icon,label);
       cards.append(card);
     }
   }
   chooser.addEventListener('change',update);
   album.append(header,description,chooser,counter,progress,cards,note);
   // The C4.26 museum keeps Sandbox memories in their own accessible wing.
   // The previous insertion remains a fallback if the new gallery fails to load.
   const museum=serverContainer.closest('#phone-app-museum');
   const newSlot=museum?.querySelector('#dudu-museum-memory-slot');
   const verified=museum?.querySelector('.dudu-v27-museum-help');
   if(newSlot)newSlot.append(album);
   else (verified||serverContainer).before(album);
   update();
 }
 root.DuduMuseumMemoriesUIV43=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
