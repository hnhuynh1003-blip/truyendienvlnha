/* DUDU V56: player identities PER signed-in UID and story.
 * Local-only roleplay state. No Firestore writes, privilege changes or rewards.
 * V55 story/NPC history is deliberately NOT migrated automatically.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduRoleplayV56=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MODES=Object.freeze({main:'Hóa thân nhân vật chính',
   traveler:'Người lạc giới / qua đường',observer:'Người quan sát ngoài cuộc'});
 const PRONOUNS=Object.freeze({male:'Nam',female:'Nữ',neutral:'Không cố định'});
 const MAX_PROFILES=6;
 const AVATAR_IDS=Object.freeze(['account','initials','anime-moon-blue',
   'anime-moon-violet','anime-peach-court','anime-adventurer',
   ...Array.from({length:60},(_,i)=>'portrait-f-'+String(i+1).padStart(2,'0')),
   ...Array.from({length:12},(_,i)=>'portrait-m-'+String(i+1).padStart(2,'0'))]);
 const clean=(v,n)=>String(typeof v==='string'?v:'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().replace(/\s+/g,' ').slice(0,n);
 const validId=s=>typeof s==='string'&&/^[a-z0-9_-]{1,64}$/.test(s);
 const validScope=s=>typeof s==='string'&&s.length>0&&s.length<=160;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function key(uid,storyId,sandbox=false){
   if(!validScope(uid)||!validScope(storyId))return null;
   return (sandbox?'dudu-sandbox-v2:':'dudu-v2:')+
     encodeURIComponent(uid)+':'+encodeURIComponent(storyId)+':roleplay-v56';
 }
 function allowedModes(novel){
   const value=novel?.roleplayPolicy?.allowedModes;
   return Array.isArray(value)?Object.keys(MODES).filter(x=>value.includes(x)):Object.keys(MODES);
 }
 function candidates(novel){
   const chars=Array.isArray(novel?.characters)?novel.characters:[];
   const ids=novel?.roleplayPolicy?.mainCharacterIds;
   const hasIds=Array.isArray(ids);
   return chars.filter(ch=>ch&&!ch.archived&&validScope(ch.id)&&
     (hasIds?ids.includes(ch.id):ch.isProtagonist===true||
       /nhân vật chính|vai chính|main character|protagonist/i.test(String(ch.role||''))))
     .map(ch=>({id:ch.id,name:clean(ch.name,60)})).filter(x=>x.name);
 }
 function empty(){return {version:56,activeId:null,profiles:[],relations:{}};}
 function normalizeProfile(item,novel){
   if(!item||!validId(item.id)||!Object.hasOwn(MODES,item.mode))return null;
   const name=clean(item.name,40),backstory=clean(item.backstory,240);
   if(!name)return null;
   if(!allowedModes(novel).includes(item.mode))return null;
   const protagonistId=item.mode==='main'?item.protagonistId:null;
   if(item.mode==='main'){
     const char=candidates(novel).find(c=>c.id===protagonistId);
     if(!char||char.name!==name)return null;
   }
   return {id:item.id,mode:item.mode,name,
     avatar:AVATAR_IDS.includes(item.avatar)?item.avatar:'account',pronouns:
     Object.hasOwn(PRONOUNS,item.pronouns)?item.pronouns:'neutral',
     backstory:item.mode==='main'?'':backstory,
     protagonistId:protagonistId||null};
 }
 function load(storage,uid,novel,sandbox=false){
   const storageKey=key(uid,novel?.id,sandbox);
   if(!storageKey||!storage)return empty();
   let raw;
   try{raw=JSON.parse(storage.getItem(storageKey)||'null');}catch(_){return empty();}
   if(!raw||raw.version!==56||!Array.isArray(raw.profiles))return empty();
   const profiles=[],seen=new Set();
   for(const item of raw.profiles.slice(0,MAX_PROFILES*2)){
     const p=normalizeProfile(item,novel);
     if(p&&!seen.has(p.id)&&profiles.length<MAX_PROFILES){
       profiles.push(p);seen.add(p.id);
     }
   }
   const relations={};
   if(raw.relations&&typeof raw.relations==='object'&&!Array.isArray(raw.relations)){
     for(const p of profiles){
       const per=raw.relations[p.id];
       if(!per||typeof per!=='object'||Array.isArray(per))continue;
       relations[p.id]={};
       for(const [npcId,v] of Object.entries(per).slice(0,200)){
         if(!validScope(npcId)||!v||typeof v!=='object')continue;
         relations[p.id][npcId]={
           affinity:clamp(v.affinity,10),trust:clamp(v.trust,0),
           day:typeof v.day==='string'?v.day.slice(0,10):'',
           repliesToday:Math.min(3,Math.max(0,Math.floor(Number(v.repliesToday)||0)))
         };
       }
     }
   }
   const activeId=profiles.some(x=>x.id===raw.activeId)?raw.activeId:null;
   return {version:56,activeId,profiles,relations};
 }
 function clamp(value,fallback){
   const n=Number(value);return Number.isFinite(n)?Math.min(100,Math.max(0,Math.floor(n))):fallback;
 }
 function save(storage,uid,novel,sandbox,state){
   const storageKey=key(uid,novel?.id,sandbox);
   if(!storageKey||!storage||!state)return false;
   try{storage.setItem(storageKey,JSON.stringify(state));return true;}
   catch(_){return false;}
 }
 function active(state){
   return state?.profiles?.find(x=>x.id===state.activeId)||null;
 }
 function freshId(){
   const cryptoObj=typeof crypto!=='undefined'?crypto:null;
   if(cryptoObj?.randomUUID)return 'rp'+cryptoObj.randomUUID().replace(/-/g,'').slice(0,20);
   return 'rp'+Date.now().toString(36)+Math.random().toString(36).slice(2,11);
 }
 function upsert(state,input,novel){
   if(!state||!input)return {error:'Hồ sơ không hợp lệ.'};
   const id=input.id||freshId();
   const old=state.profiles.find(x=>x.id===id);
   if(old&&old.mode!==input.mode)return {error:'Không thể đổi loại vai cũ; hãy tạo vai mới để tránh lẫn ký ức.'};
   const draft=normalizeProfile({...input,id},novel);
   if(!draft)return {error:'Tên, chế độ hoặc nhân vật chính chưa hợp lệ theo truyện.'};
   if(!old&&state.profiles.length>=MAX_PROFILES)return {error:'Mỗi truyện tối đa 6 vai.'};
   const next=clone(state);
   const i=next.profiles.findIndex(p=>p.id===id);
   if(i>=0)next.profiles[i]=draft;else next.profiles.push(draft);
   next.activeId=id;
   return {state:next,profile:draft};
 }
 function select(state,id){
   if(!state?.profiles?.some(p=>p.id===id))return null;
   return {...state,activeId:id};
 }
 function chatKey(storyId,profileId,npcId){
   if(!validScope(storyId)||!validId(profileId)||!validScope(npcId))return null;
   return storyId+'::role56:'+profileId+'::'+npcId;
 }
 function legacyChatKey(storyId,npcId){return storyId+'::'+npcId;}
 function memoryNpcId(profileId,npcId){
   if(!validId(profileId)||!validScope(npcId))return null;
   return npcId.slice(0,78)+'~role56~'+profileId;
 }
 function relationship(state,profileId,npcId){
   const r=state?.relations?.[profileId]?.[npcId];
   return {affinity:clamp(r?.affinity,10),trust:clamp(r?.trust,0)};
 }
 function recordReply(state,profileId,npcId,now=Date.now()){
   if(!state?.profiles?.some(p=>p.id===profileId)||!validScope(npcId))return null;
   const day=new Date(now).toISOString().slice(0,10);
   const old=state.relations?.[profileId]?.[npcId]||{};
   const count=old.day===day?(Number(old.repliesToday)||0):0;
   // Cosmetic bond only: no canonical milestone, unlock, XP, gift, or economy mutation.
   const fresh=count<3;
   const next=clone(state);
   if(!next.relations)next.relations={};
   if(!next.relations[profileId])next.relations[profileId]={};
   next.relations[profileId][npcId]={
     affinity:Math.min(100,clamp(old.affinity,10)+(fresh?1:0)),
     trust:Math.min(100,clamp(old.trust,0)+(fresh&&count===2?1:0)),
     day,repliesToday:Math.min(3,count+1)
   };
   return next;
 }
 function prompt(profile,novel){
   if(!profile||!novel)return '';
   const mode=profile.mode;
   const prefix='DANH TÍNH NGƯỜI ĐỌC ĐÃ XÁC NHẬN (dành riêng cho truyện này; không cho NPC tự gán vai khác):';
   const lines=[prefix,'- Tên người liên lạc: '+profile.name,
     '- Cách xưng hô người đọc chọn: '+(PRONOUNS[profile.pronouns]||PRONOUNS.neutral),
     '- Chế độ: '+MODES[mode]+'.'];
   if(mode==='main'){
     lines.push('- Người đọc hóa thân vào nhân vật chính có ID '+profile.protagonistId+
       '; nhận diện bằng tên tác giả đã ghi, không bịa quan hệ, ký ức hoặc sự kiện chưa đọc.');
   }else if(mode==='traveler'){
     lines.push('- Đây là người mới bước vào thế giới, không phải nhân vật chính; nếu chưa gặp, NPC không biết hoặc quen họ từ trước.');
     if(profile.backstory)lines.push('- Tiểu sử người đọc tự khai (KHÔNG phải sự thật cốt truyện): '+profile.backstory);
   }else{
     lines.push('- Đây là người quan sát ngoài cốt truyện, liên lạc qua kênh đặc biệt; không hiện diện trong cảnh truyện hoặc thay thế nhân vật.');
     lines.push('- Không tự thay đổi diễn biến truyện, không suy đoán họ là nhân vật chính.');
     if(profile.backstory)lines.push('- Lời giới thiệu của người quan sát: '+profile.backstory);
   }
   lines.push('- Tôn trọng tiến độ đọc; nếu chưa có bằng chứng, không khẳng định NPC đã quen biết người này.');
   return lines.join('\n');
 }
 return Object.freeze({MODES,PRONOUNS,AVATAR_IDS,MAX_PROFILES,key,empty,load,save,active,
   candidates,allowedModes,upsert,select,chatKey,legacyChatKey,memoryNpcId,
   relationship,recordReply,prompt});
});
