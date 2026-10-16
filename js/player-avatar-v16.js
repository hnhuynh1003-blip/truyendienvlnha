/* DUDU Player Avatar V16 — Sandbox only.
 * Identity-scoped local uploads; never grants frames, items, currency or XP.
 * Default avatar is initials. Legacy profiles need no migration.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPlayerAvatarV16=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCOPE='__dudu_player_avatar_v16__';
 const FREE=Object.freeze([
   {id:'none',name:'Không khung',color:'#77829b',tier:'F',effect:'none'},
   {id:'moon',name:'Ánh Trăng',color:'#a8dfff',tier:'C',effect:'moon'},
   {id:'violet',name:'Huyền Tím',color:'#dbaaff',tier:'B',effect:'violet'},
   {id:'sakura',name:'Hoa Đào',color:'#ffb7d6',tier:'B',effect:'sakura'},
   {id:'cyber',name:'Cyber Link',color:'#79efec',tier:'A',effect:'cyber'},
   {id:'starlight',name:'Tinh Tú',color:'#ffe4a5',tier:'A',effect:'starlight'}
 ]);
 const RESTRICTED=Object.freeze([
   {id:'legend',name:'Huyền Thoại',color:'#ffd17d',tier:'S',effect:'legend',unlock:'EVENT'},
   {id:'soulbond',name:'Tri Kỷ',color:'#ff95d4',tier:'S',effect:'soulbond',unlock:'RELATIONSHIP'},
   {id:'author',name:'Tác Giả',color:'#c5a6ff',tier:'SS',effect:'author',unlock:'AUTHOR'}
 ]);
 const FRAMES=Object.freeze([...FREE,...RESTRICTED].map(x=>Object.freeze(x)));
 const BY_FRAME=Object.freeze(Object.fromEntries(FRAMES.map(x=>[x.id,x])));
 const SELECTABLE=Object.freeze(FREE.map(x=>x.id));
 const ANIME=Object.freeze(['anime-moon-blue','anime-moon-violet','anime-peach-court','anime-adventurer']);
 const ID=/^[a-zA-Z0-9_-]{1,96}$/;
 function frame(id){
   return typeof id==='string'&&Object.hasOwn(BY_FRAME,id)?BY_FRAME[id]:null;
 }
 function canChooseFrame(id){
   return SELECTABLE.includes(id);
 }
 function validate(value,{animeIds=ANIME,vectorIds=[]}={}){
   if(!value||typeof value!=='object'||Array.isArray(value))return null;
   const kind=value.kind;
   if(!['initials','anime','vector','upload'].includes(kind))return null;
   const frameId=typeof value.frameId==='string'?value.frameId:'none';
   if(!canChooseFrame(frameId))return null;
   const presetId=typeof value.presetId==='string'?value.presetId:'';
   const uploadId=typeof value.uploadId==='string'?value.uploadId:'';
   if(kind==='anime'&&!animeIds.includes(presetId))return null;
   if(kind==='vector'&&!vectorIds.includes(presetId))return null;
   if(kind==='upload'&&!/^own-[a-zA-Z0-9-]{1,60}$/.test(uploadId))return null;
   return Object.freeze({
     kind,frameId,
     presetId:kind==='anime'||kind==='vector'?presetId:'',
     uploadId:kind==='upload'?uploadId:''
   });
 }
 function safeState(profile,{vectorIds=[]}={}){
   const config=validate(profile?.playerAvatar,{vectorIds});
   return config||Object.freeze({kind:'initials',presetId:'',uploadId:'',frameId:'none'});
 }
 function initials(name){
   const clean=String(name||'DU').trim();
   return (clean.split(/\s+/).slice(-2).map(x=>Array.from(x)[0]||'').join('')||'DU')
     .toLocaleUpperCase('vi').slice(0,3);
 }
 function uploadIdentity(uid){
   return typeof uid==='string'&&ID.test(uid)?uid:null;
 }
 function isValidImageDataURL(input){
   return typeof input==='string'&&input.length<=180000&&
     /^data:image\/jpeg;base64,[A-Za-z0-9+/=]{100,}$/.test(input);
 }
 return Object.freeze({SCOPE,FRAMES,FREE,RESTRICTED,ANIME,frame,canChooseFrame,
   validate,safeState,initials,uploadIdentity,isValidImageDataURL});
});
