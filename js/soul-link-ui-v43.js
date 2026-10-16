/* V43.3 — Sandbox-only soul fragments, link keys and an introductory quest.
 * Wrap existing page actions. Production unlock, storage, loot and server remain unchanged.
 */
(function(root){
 'use strict';
 const rules=root.DuduSoulLinkV43;
 if(!rules)return;
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE&&
   typeof currentUsername==='string'&&!!currentUsername;
 const state=()=>rules.norm(userProfile?.soulLinkV43);
 const node=(tag,cls,content)=>{
   const element=document.createElement(tag);
   if(cls)element.className=cls;
   if(content!==undefined)element.textContent=String(content);
   return element;
 };
 function persist(plan){
   if(!sandbox()||!plan?.ok)return false;
   const prior=userProfile.soulLinkV43,balance=userProfile.currency;
   try{
     userProfile.soulLinkV43=plan.state;
     if(Object.hasOwn(plan,'coins'))userProfile.currency=plan.coins;
     saveCurrentAccount();
     return true;
   }catch(_){
     if(prior===undefined)delete userProfile.soulLinkV43;
     else userProfile.soulLinkV43=prior;
     userProfile.currency=balance;
     return false;
   }
 }
 function feedback(title,message){if(typeof showSystemAlert==='function')showSystemAlert(title,message);}
 function refresh(){
   if(document.getElementById('phone-app-codex')?.style.display==='flex')root.renderCodexList?.();
 }
 function buyKey(){
   if(!sandbox())return false;
   const plan=rules.buyKey(state(),userProfile.currency);
   if(!persist(plan)){
     feedback('CHƯA MUA ĐƯỢC','Khóa Liên Kết giá 25 Xu thử nghiệm; chỉ giữ tối đa 20 khóa.');
     return false;
   }
   feedback('ĐÃ NHẬN KHÓA','Đã mua 1 Khóa Liên Kết bằng 25 Xu thử nghiệm.');
   refresh();return true;
 }
 function claimQuest(){
   if(!sandbox())return false;
   const plan=rules.claimQuest(state());
   if(!persist(plan)){
     feedback('NHIỆM VỤ CHƯA ĐẠT','Hãy nhặt đồ ở hai chương khác nhau có NPC chưa kết nối.');
     return false;
   }
   feedback('TÍN HIỆU ĐẦU TIÊN','Hoàn thành nhiệm vụ và nhận 1 Khóa Liên Kết (Sandbox).');
   refresh();return true;
 }
 function scope(storyId,npcId){
   const story=novels.find(n=>n?.id===storyId);
   const npc=story?.characters?.find(n=>n?.id===npcId&&!n.archived);
   if(!story||!npc||!story.chapters?.some(ch=>Array.isArray(ch.characterIds)&&ch.characterIds.includes(npcId)))
     return null;
   return {story,npc};
 }
 function link(storyId,npcId){
   if(!sandbox())return false;
   const selected=scope(storyId,npcId);
   if(!selected)return false;
   const progress=getStoryProgress(storyId).collectedCharacters;
   if(progress[npcId])return false; // Preserve legacy progress exactly.
   const plan=rules.link(state(),{storyId,npcId,coins:userProfile.currency,
     alreadyUnlocked:!!progress[npcId]});
   if(!plan.ok){
     const message=plan.reason==='missing-fragments'?'Cần 3 mảnh linh hồn từ các lượt nhặt đồ ở chương có NPC.':
       plan.reason==='missing-key'?'Thiếu Khóa Liên Kết. Nhận ở nhiệm vụ hoặc mua bằng Xu.':
       plan.reason==='missing-coins'?'Cần thêm 20 Xu thử nghiệm.':
       'NPC chưa đủ điều kiện liên kết.';
     feedback('CHƯA THỂ KẾT NỐI',message);
     return false;
   }
   const prior=userProfile.soulLinkV43,coins=userProfile.currency;
   try{
     userProfile.soulLinkV43=plan.state;userProfile.currency=plan.coins;
     const {story,npc}=selected;
     progress[npcId]={id:npc.id,name:npc.name,role:npc.role,note:npc.note,
       novelTitle:story.title,affinity:20,linkedVia:'sandbox-soul-v43'};
     saveCurrentAccount();
   }catch(_){
     delete progress[npcId];
     if(prior===undefined)delete userProfile.soulLinkV43;
     else userProfile.soulLinkV43=prior;
     userProfile.currency=coins;
     feedback('KHÔNG THỂ LƯU','Chưa ghi được dữ liệu liên kết trên thiết bị.');
     return false;
   }
   feedback('KẾT NỐI LINH HỒN','Đã liên kết '+selected.npc.name+' (-1 khóa, -20 Xu thử nghiệm).');
   if(selectedNovelIndex>=0&&novels[selectedNovelIndex]?.id===storyId){
     const chapter=selected.story.chapters[selectedChapterIndex];
     if(chapter)root.renderReaderChapterNpcs?.(chapter,selected.story);
   }
   refresh();
   if(typeof root.renderChatDropdown==='function')root.renderChatDropdown();
   return true;
 }
 function recordChapter(story,chapter,now=Date.now()){
   if(!sandbox()||!story||!chapter||!Array.isArray(story.chapters)||
      !story.chapters.includes(chapter))return 0;
   const ids=new Set((story.characters||[]).filter(c=>c&&!c.archived).map(c=>c.id));
   const eligible=Array.isArray(chapter.characterIds)?
     [...new Set(chapter.characterIds.filter(id=>ids.has(id)))]:[];
   if(!eligible.length)return 0;
   const plan=rules.earn(state(),{
     storyId:story.id,chapterId:String(chapter.id||story.chapters.indexOf(chapter)),
     day:root.DuduLootCadenceV42.dayKey(now),npcIds:eligible,
     unlockedIds:eligible.filter(id=>isNpcUnlocked(story.id,id))
   });
   if(!plan.ok)return 0;
   // Original chapter reward and this optional preview are persisted separately.
   if(!persist(plan))return 0;
   return plan.granted;
 }
 function summary(host){
   if(!sandbox())return;
   const s=state();
   // Keep the economy accessible without making it the first giant Sổ Tay card.
   const section=node('details','dudu-v43-soul-summary');
   section.id='dudu-v43-soul-summary';
   const title=node('summary','dudu-v43-soul-heading');
   title.append(node('span','', '✦ Liên kết linh hồn'),
     node('strong','', '🔑 '+s.keys+' khóa'));
   const body=node('div','dudu-v43-soul-content');
   const description=node('p','', 'Nhặt đồ ở chương có NPC để lấy 3 mảnh. Liên kết cần 1 khóa + 20 Xu.');
   const progress=node('p','',s.questClaimed?'✓ Đã nhận Khóa Liên Kết từ nhiệm vụ':
     'Tín Hiệu Đầu Tiên: '+Math.min(2,s.chapters.length)+'/2 chương có mảnh');
   const buttons=node('div','dudu-v43-soul-buttons');
   const buy=node('button','', 'Mua khóa · 25 Xu');
   buy.type='button';buy.addEventListener('click',buyKey);buttons.append(buy);
   if(!s.questClaimed){
     const claim=node('button','', 'Nhận khóa nhiệm vụ');
     claim.type='button';claim.disabled=s.chapters.length<rules.QUEST_CHAPTERS;
     claim.addEventListener('click',claimQuest);buttons.append(claim);
   }
   body.append(description,progress,buttons);
   section.append(title,body);
   const overview=host.querySelector('#dudu-v43-bond-overview');
   if(overview)overview.after(section);
   else host.prepend(section);
 }
 const oldCodex=root.renderCodexList;
 if(typeof oldCodex==='function')root.renderCodexList=function(){
   const outcome=oldCodex.apply(this,arguments);
   if(!sandbox())return outcome;
   const story=getSelectedCodexNovel();
   const host=document.getElementById('codex-container');
   if(!story||!host)return outcome;
   summary(host);
   const cards=[...host.children].filter(x=>x.classList?.contains('character-card'));
   const characters=(story.characters||[]).filter(c=>!c.archived||
     (typeof showArchivedNpcs!=='undefined'&&showArchivedNpcs&&canEditStories()));
   characters.forEach((npc,i)=>{
     const card=cards[i];
     if(!card||npc.archived||isNpcUnlocked(story.id,npc.id))return;
     const count=rules.count(state(),story.id,npc.id);
     const footer=node('div','dudu-v43-soul-footer');
     footer.append(node('span','', '✦ Mảnh '+count+'/'+rules.FRAGMENTS));
     const button=node('button','', 'Liên kết');
     button.type='button';button.addEventListener('click',()=>link(story.id,npc.id));
     footer.append(button);card.append(footer);
   });
   return outcome;
 };
 const oldReader=root.renderReaderChapterNpcs;
 if(typeof oldReader==='function')root.renderReaderChapterNpcs=function(chapter,story){
   const outcome=oldReader.apply(this,arguments);
   if(!sandbox()||!chapter||!story)return outcome;
   const ids=chapter.characterIds||[];
   const npcs=(story.characters||[]).filter(c=>ids.includes(c.id));
   const cards=[...document.querySelectorAll('#reader-soul-npc-list > .soul-npc-card')];
   npcs.forEach((npc,i)=>{
     const card=cards[i];
     if(!card||npc.archived||isNpcUnlocked(story.id,npc.id))return;
     const counter=rules.count(state(),story.id,npc.id),s=state();
     const details=card.querySelector('.dudu-v38-soul-details');
     details?.append(node('small','dudu-v43-soul-chapter-hint',
       '✦ '+counter+'/'+rules.FRAGMENTS+' mảnh · '+s.keys+' khóa · cần 20 Xu'));
     const actions=card.lastElementChild;
     if(actions){
       const button=node('button','btn btn-gold','✦ Liên kết');
       button.type='button';button.addEventListener('click',()=>link(story.id,npc.id));
       actions.replaceChildren(button);
     }
   });
   return outcome;
 };
 const oldUnlock=root.unlockChapterCharacter;
 if(typeof oldUnlock==='function')root.unlockChapterCharacter=function(charId,novelTitle){
   if(!sandbox())return oldUnlock.apply(this,arguments);
   const story=novels[selectedNovelIndex];
   return story?link(story.id,charId):false;
 };
 const oldLoot=root.rollLootDrop;
 if(typeof oldLoot==='function')root.rollLootDrop=function(isFreeFromChapter=false,story=null,chapter=null){
   const result=oldLoot.apply(this,arguments);
   if(result&&isFreeFromChapter&&sandbox()){
     const earned=recordChapter(story,chapter);
     if(earned)feedback('MẢNH LINH HỒN','+ '+earned+' mảnh từ chương này. Vào Sổ Tay để xem tiến độ kết nối.');
   }
   return result;
 };
 root.DuduSoulLinkUIV43=Object.freeze({link,buyKey,claimQuest,recordChapter});
})(typeof window!=='undefined'?window:{});
