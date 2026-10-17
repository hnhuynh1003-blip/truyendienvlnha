/* DUDU V54: explicit, account-scoped progress reset. NOT automatic.
 * Preserves novels, chapters, canonical characters, author data, Auth account,
 * app-check and Firebase rules. Writes only the signed-in user's profile doc.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalResetV54=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BASELINE=Object.freeze({level:1,exp:0,currency:50});
 function freshProfile(uid,name,isAuthor,defaultQuests=[]){
  if(typeof uid!=='string'||!uid||uid.length>128)throw Error('Firebase UID không hợp lệ');
  const quests=(Array.isArray(defaultQuests)?defaultQuests:[]).map(q=>{
   if(!q||typeof q!=='object')return null;
   return {...q,current:0,claimed:false};
  }).filter(Boolean);
  return {
   username:uid,name:typeof name==='string'?name.slice(0,140):'Độc giả',
   title:'Thực Thể Ký Tự',role:isAuthor?'admin':'reader',
   level:1,exp:0,currency:50,
   inventory:[],quests,
   lootedChapters:{},readRewards:{},dailyReadLog:{day:'',chapters:[]},
   collectedCharacters:{},storyStates:{}
  };
 }
 function ownedKeys(storage,uid){
  if(!uid||typeof uid!=='string'||!storage)return [];
  const encoded=encodeURIComponent(uid),start='profile_'+uid;
  const accepted=[
   'dudu-v2:'+encoded+':',
   'dudu-v3:npc-memory:'+encoded+':',
   'dudu-fun:practice:v51:'+uid,
   'dudu:companion:local:v51:'+uid
  ];
  const list=[];
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i);
   if(typeof key!=='string')continue;
   if(key===start||accepted.some(prefix=>key===prefix||key.startsWith(prefix))||
     (!key.startsWith('dudu-sandbox')&&
      (key.startsWith('dudu-')||key.startsWith('dudu:'))&&
      (key.includes(':'+encoded+':')||key.endsWith(':'+encoded))))
    list.push(key);
  }
  // Legacy unscoped chat belongs to the previous version on this device.
  if(storage.getItem('my_chat_roleplay_histories')!==null)list.push('my_chat_roleplay_histories');
  return [...new Set(list)].sort();
 }
 function backup(uid,oldCloud,storage){
  const local={};
  for(const k of ownedKeys(storage,uid))local[k]=storage.getItem(k);
  return {version:54,purpose:'user-initiated-progress-backup',
    uid,createdAt:new Date().toISOString(),cloudProfile:oldCloud||null,local};
 }
 function safetyCheck(uid,auth){
  if(!uid||!auth?.currentUser||auth.currentUser.uid!==uid)
   throw Error('Phiên Firebase đã thay đổi; chưa xóa dữ liệu nào.');
 }
 return Object.freeze({BASELINE,freshProfile,ownedKeys,backup,safetyCheck});
});
