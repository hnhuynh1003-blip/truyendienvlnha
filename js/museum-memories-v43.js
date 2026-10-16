/* V43.5 read-only friendship keepsake catalog.
 * Derives PREVIEW ONLY from scoped client progress. No inventory, coins,
 * grants, verified collectibles, chat history or Firebase mutations.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
   require('./companion-rules-v43.js'):root?.DuduCompanionRulesV43,
   typeof module==='object'&&module.exports?
   require('./npc-bond-v43.js'):root?.DuduNpcBondV43);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduMuseumMemoriesV43=api;
})(typeof window!=='undefined'?window:null,function(companion,bond){
 'use strict';
 const NPC_TITLES=Object.freeze({
   3:Object.freeze({icon:'✉️',name:'Lời Chào Thân Quen'}),
   7:Object.freeze({icon:'🌷',name:'Một Tuần Đồng Hành'}),
   14:Object.freeze({icon:'🎀',name:'Dấu Ấn Kỷ Niệm'}),
   30:Object.freeze({icon:'💞',name:'Tháng Gắn Kết'})
 });
 const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
 const ownerKey=(storyId,npcId)=>valid(storyId)&&valid(npcId)?
   'npc:'+encodeURIComponent(storyId)+'::'+encodeURIComponent(npcId):null;
 const preview=(kind,id,day,icon,name,earned)=>Object.freeze({
   id:'preview-v43:'+kind+':'+id+':'+day,
   day,icon,name,earned:earned===true,
   source:kind==='dudu'?'sandbox-dudu-chat':'sandbox-npc-bond',
   verified:false,collectible:false
 });
 function dudu(raw){
   const s=companion.norm(raw);
   const owned=new Set(s.milestones);
   const items=companion.MILESTONES.map(m=>preview('dudu',companion.ID,m.day,
     m.icon,m.name,owned.has(m.id)));
   return Object.freeze({key:'dudu',type:'dudu',title:'DUDU · Người bạn đầu tiên',
     earned:items.filter(x=>x.earned).length,total:items.length,items});
 }
 function npc(storyId,npcId,name,progress){
   const id=ownerKey(storyId,npcId);
   if(!id||!progress||typeof progress!=='object'||Array.isArray(progress))return null;
   const s=bond.norm(progress.npcBondV43);
   const items=bond.MILESTONES.map(day=>{
     const label=NPC_TITLES[day];
     return preview('npc',id,day,label.icon,label.name,s.best>=day);
   });
   return Object.freeze({key:id,type:'npc',
     title:typeof name==='string'&&name.trim()?name.slice(0,90):'NPC',
     storyId,npcId,record:s,earned:items.filter(x=>x.earned).length,
     total:items.length,items});
 }
 function catalog({companionState,novels,storyStates}={}){
   const groups=[dudu(companionState)];
   const seen=new Set();
   if(!Array.isArray(novels)||!storyStates||typeof storyStates!=='object')return groups;
   // Render only real canonical NPC IDs unlocked by the current reader.
   // An archived NPC that was already unlocked retains its journal.
   for(const story of novels.slice(0,120)){
     if(!valid(story?.id)||!Array.isArray(story.characters))continue;
     const linked=storyStates[story.id]?.collectedCharacters;
     if(!linked||typeof linked!=='object')continue;
     for(const char of story.characters.slice(0,300)){
       if(!valid(char?.id)||!Object.prototype.hasOwnProperty.call(linked,char.id))continue;
       const record=linked[char.id],key=ownerKey(story.id,char.id);
       if(!record||typeof record!=='object'||Array.isArray(record)||seen.has(key))continue;
       seen.add(key);
       const result=npc(story.id,char.id,char.name,record);
       if(result)groups.push(Object.freeze({...result,
         storyTitle:typeof story.title==='string'?story.title.slice(0,90):'Tác phẩm',
         archived:char.archived===true}));
       if(groups.length>=151)return groups;
     }
   }
   return groups;
 }
 return Object.freeze({NPC_TITLES,ownerKey,dudu,npc,catalog});
});
