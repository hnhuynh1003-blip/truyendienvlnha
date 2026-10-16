/* DUDU V28 R5: visual assets registry + per-account local wallpaper mode.
 * Never changes story/NPC IDs, Firebase data, or author permissions.
 * Binary WebP files are distributed separately in the V28 asset package.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduMultiverseArtV28=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const WORLDS=Object.freeze([
    Object.freeze({id:'xianxia',label:'Tiên hiệp · Huyền huyễn',image:'assets/wallpapers/worlds/xianxia.webp'}),
    Object.freeze({id:'modern',label:'Đô thị · Học đường',image:'assets/wallpapers/worlds/modern.webp'}),
    Object.freeze({id:'cyberpunk',label:'Khoa học viễn tưởng',image:'assets/wallpapers/worlds/cyberpunk.webp'}),
    Object.freeze({id:'gothic',label:'Kinh dị · Bí ẩn',image:'assets/wallpapers/worlds/gothic.webp'})
  ]);
  const NPC=Object.freeze([
    Object.freeze({id:'V01',label:'Nữ thám tử noir',portraitPath:'assets/npc/v28-v01-noir.webp',avatarPath:'assets/npc/v28-v01-noir-avatar.webp'}),
    Object.freeze({id:'V02',label:'Nữ thuyền trưởng',portraitPath:'assets/npc/v28-v02-seafarer.webp',avatarPath:'assets/npc/v28-v02-seafarer-avatar.webp'}),
    Object.freeze({id:'V03',label:'Hồ ly bí ẩn',portraitPath:'assets/npc/v28-v03-kitsune.webp',avatarPath:'assets/npc/v28-v03-kitsune-avatar.webp'}),
    Object.freeze({id:'V04',label:'Nữ kỹ sư steampunk',portraitPath:'assets/npc/v28-v04-steampunk.webp',avatarPath:'assets/npc/v28-v04-steampunk-avatar.webp'}),
    Object.freeze({id:'V05',label:'Nhà nghiên cứu sinh học',portraitPath:'assets/npc/v28-v05-biotech.webp',avatarPath:'assets/npc/v28-v05-biotech-avatar.webp'}),
    Object.freeze({id:'V06',label:'Nam nghệ sĩ violin',portraitPath:'assets/npc/v28-v06-violin.webp',avatarPath:'assets/npc/v28-v06-violin-avatar.webp'})
  ]);
  const WORLD_IDS=new Set(WORLDS.map(x=>x.id));
  const MODES=Object.freeze(['personal','world']);
  const PREFIX='dudu-sandbox:phone-wallpaper-mode:v28-r5:';
  function keyFor(uid){
    return typeof uid==='string'&&/^[a-zA-Z0-9_-]{1,160}$/.test(uid)?PREFIX+uid:null;
  }
  function readMode(storage,uid){
    const k=keyFor(uid);if(!k||!storage)return 'personal';
    try{return storage.getItem(k)==='world'?'world':'personal';}catch(_){return 'personal';}
  }
  function writeMode(storage,uid,mode){
    const k=keyFor(uid);
    if(!k||!MODES.includes(mode)||!storage||typeof storage.setItem!=='function')return false;
    try{storage.setItem(k,mode);return true;}catch(_){return false;}
  }
  function fold(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase();
  }
  function worldForStory(story){
    if(!story||typeof story!=='object')return null;
    if(typeof story.worldArtId==='string'&&WORLD_IDS.has(story.worldArtId))
      return story.worldArtId;
    const parts=[story.genre,story.category,story.worldType,story.tags]
      .flat().filter(x=>typeof x==='string').map(fold).join(' ');
    if(/tien hiep|huyen huyen|tu tien|tu chan|kiem hiep|vo hiep/.test(parts))return 'xianxia';
    if(/khoa hoc vien tuong|cyberpunk|sci-fi|sci fi|tuong lai|cong nghe/.test(parts))return 'cyberpunk';
    if(/kinh di|huyen bi|bi an|ma quy|gothic|vo han luu/.test(parts))return 'gothic';
    if(/hien dai|do thi|hoc duong|tinh cam|doi thuong|romance/.test(parts))return 'modern';
    return null;
  }
  function resolve({mode='personal',personal='midnight',story=null}={}){
    const world=mode==='world'?worldForStory(story):null;
    return Object.freeze({mode:MODES.includes(mode)?mode:'personal',
      worldId:world,wallpaperId:world?'world-'+world:personal,
      usedFallback:mode==='world'&&!world});
  }
  function portraitById(id){return NPC.find(x=>x.id===id)||null;}
  return Object.freeze({WORLDS,NPC,MODES,readMode,writeMode,keyFor,
    worldForStory,resolve,portraitById});
});
