/* V43.5 — read-only Sandbox album inside existing Museum.
 * This is NOT the server collectible book. Never calls grant or save.
 */
(function(root){
 'use strict';
 const rules=root.DuduMuseumMemoriesV43;
 const byId=id=>document.getElementById(id);
 const ready=()=>!!rules&&typeof IS_SANDBOX_MODE!=='undefined'&&
   IS_SANDBOX_MODE&&typeof currentUsername==='string'&&!!currentUsername;
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
   if(!ready()){
     existing?.remove();
     return;
   }
   const previousOwner=existing?.dataset.owner;
   const previousSelection=previousOwner===currentUsername?
     existing.querySelector('#dudu-v43-memory-source')?.value:null;
   existing?.remove();
   const groups=rules.catalog({
     companionState:userProfile.duduCompanionV43,
     novels,storyStates:userProfile.storyStates
   });
   const album=node('section','dudu-v43-memory-album');
   album.id='dudu-v43-memory-album';
   album.dataset.owner=currentUsername;
   album.setAttribute('aria-label','Album kỷ niệm tình bạn thử nghiệm');
   const header=node('div','dudu-v43-memory-head');
   header.append(node('strong','','✦ Album kỷ niệm'),
     node('span','dudu-v43-memory-tag','Sandbox · xem trước'));
   const description=node('p','dudu-v43-memory-description',
     'Kỷ niệm từ các ngày gắn kết. Chỉ xem, không phải kỷ vật đã cấp.');
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
     'Các dấu mốc này lưu trên thiết bị và không xác minh được quyền sở hữu kỷ vật. Bảo Tàng chính thức vẫn kiểm tra máy chủ ở mục bên dưới.');
   function update(){
     if(!ready()||album.dataset.owner!==currentUsername)return;
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
   serverContainer.before(album);
   update();
 }
 root.DuduMuseumMemoriesUIV43=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
