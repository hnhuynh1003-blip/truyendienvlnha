/* V43.3 — Sandbox-only soul-link economy.
 * Fragments come from a successful chapter loot claim containing the NPC.
 * No Firebase, Worker, inventory, collectible or production writes.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduSoulLinkV43=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const FRAGMENTS=3,KEY_COST=25,LINK_COST=20,QUEST_CHAPTERS=2;
 const MAX_KEYS=20,MAX_CLAIMS=500,MAX_CHAPTERS=150,MAX_NPCS=250;
 const valid=id=>typeof id==='string'&&id.length>0&&id.length<=160&&
   !/[\x00-\x1f\x7f]/.test(id);
 const key=(storyId,npcId)=>valid(storyId)&&valid(npcId)?
   encodeURIComponent(storyId)+'::'+encodeURIComponent(npcId):null;
 const chapterKey=(storyId,chapterId)=>valid(storyId)&&valid(chapterId)?
   encodeURIComponent(storyId)+'::'+encodeURIComponent(chapterId):null;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const empty=()=>({version:1,keys:0,questClaimed:false,fragments:{},claims:[],chapters:[]});
 function norm(input){
   const out=empty();
   if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1)return out;
   const k=Number(input.keys);
   out.keys=Number.isSafeInteger(k)?Math.min(MAX_KEYS,Math.max(0,k)):0;
   out.questClaimed=input.questClaimed===true;
   const f=input.fragments;
   if(f&&typeof f==='object'&&!Array.isArray(f)){
     const entries=Object.entries(f).slice(0,MAX_NPCS);
     for(const [name,count] of entries)
       if(typeof name==='string'&&name.length<=1000&&name.includes('::')&&
          Number.isSafeInteger(count)&&count>0)
         Object.defineProperty(out.fragments,name,{value:Math.min(FRAGMENTS,count),
           enumerable:true,writable:true,configurable:true});
   }
   const safeList=(a,max)=>Array.isArray(a)?[...new Set(a.filter(s=>
     typeof s==='string'&&s.length>0&&s.length<=1000))].slice(-max):[];
   out.claims=safeList(input.claims,MAX_CLAIMS);
   out.chapters=safeList(input.chapters,MAX_CHAPTERS);
   return out;
 }
 function count(state,storyId,npcId){
   const id=key(storyId,npcId),s=norm(state);
   return id&&own(s.fragments,id)?s.fragments[id]:0;
 }
 function dayValid(day){return typeof day==='string'&&/^\d{4}-\d\d-\d\d$/.test(day)&&
   !Number.isNaN(Date.parse(day+'T00:00:00Z'))&&
   new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;}
 function earn(state,{storyId,chapterId,npcIds,unlockedIds=[],day}={}){
   const s=norm(state),ch=chapterKey(storyId,chapterId);
   if(!ch||!dayValid(day)||!Array.isArray(npcIds)||!Array.isArray(unlockedIds))
     return {ok:false,state:s,reason:'invalid-chapter'};
   const claim=ch+'::'+day;
   if(s.claims.includes(claim))return {ok:false,state:s,reason:'already-claimed'};
   // Only canonical chapter NPCs; never create names or inventory items.
   const unlocked=new Set(unlockedIds.filter(valid));
   const targets=[...new Set(npcIds.filter(valid))].filter(id=>!unlocked.has(id));
   if(!targets.length)return {ok:false,state:s,reason:'no-locked-npc'};
   let changed=0;
   for(const id of targets){
     const k=key(storyId,id);
     if(!own(s.fragments,k)&&Object.keys(s.fragments).length>=MAX_NPCS)continue;
     const old=s.fragments[k]||0;
     if(old<FRAGMENTS){s.fragments[k]=old+1;changed++;}
   }
   if(!changed)return {ok:false,state:s,reason:'fragments-full'};
   s.claims=[...s.claims,claim].slice(-MAX_CLAIMS);
   if(!s.chapters.includes(ch))s.chapters=[...s.chapters,ch].slice(-MAX_CHAPTERS);
   return {ok:true,state:s,granted:changed,questReady:!s.questClaimed&&s.chapters.length>=QUEST_CHAPTERS};
 }
 function claimQuest(state){
   const s=norm(state);
   if(s.questClaimed||s.chapters.length<QUEST_CHAPTERS||s.keys>=MAX_KEYS)
     return {ok:false,state:s,reason:'quest-unavailable'};
   s.questClaimed=true;s.keys++;
   return {ok:true,state:s};
 }
 function currency(value){return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;}
 function buyKey(state,coins){
   const s=norm(state);
   if(!currency(coins)||s.keys>=MAX_KEYS||coins<KEY_COST)
     return {ok:false,state:s,reason:'not-enough-coins-or-cap'};
   s.keys++;
   return {ok:true,state:s,coins:coins-KEY_COST};
 }
 function link(state,{storyId,npcId,coins,alreadyUnlocked=false}={}){
   const s=norm(state),k=key(storyId,npcId);
   if(!k||alreadyUnlocked||!currency(coins))return {ok:false,state:s,reason:'invalid-or-unlocked'};
   if((s.fragments[k]||0)<FRAGMENTS)return {ok:false,state:s,reason:'missing-fragments'};
   if(s.keys<1)return {ok:false,state:s,reason:'missing-key'};
   if(coins<LINK_COST)return {ok:false,state:s,reason:'missing-coins'};
   s.fragments[k]-=FRAGMENTS;s.keys--;
   return {ok:true,state:s,coins:coins-LINK_COST};
 }
 return Object.freeze({FRAGMENTS,KEY_COST,LINK_COST,QUEST_CHAPTERS,
   empty,norm,key,count,earn,claimQuest,buyKey,link});
});
