/* V38 cosmetic catalogue. Gift receipts are scoped to this device/account;
 * premium entries are previews until an approved wallet purchase service exists.
 * No writes to balances, inventory or Firestore.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduWallpaperCatalogV38=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ITEMS=Object.freeze([
  {id:'v38-jade',name:'Thiên Cung',category:'Huyền ảo',tag:'QUÀ TẶNG',kind:'gift',price:0,asset:'jade-palace.webp'},
  {id:'v38-moon',name:'Vườn Trăng',category:'Thiên nhiên',tag:'FREE',kind:'free',price:0,asset:'moon-garden.webp'},
  {id:'v38-neon',name:'Neon Vũ',category:'Neon',tag:'FREE',kind:'free',price:0,asset:'neon-rain.webp'},
  {id:'v38-lantern',name:'Đế Đô',category:'Cổ phong',tag:'GOLD',kind:'premium',price:45,asset:'lantern-imperial.webp'},
  {id:'v38-fox',name:'Cửu Vĩ',category:'Linh thú',tag:'GOLD',kind:'premium',price:75,asset:'spirit-fox.webp'},
  {id:'v38-abyss',name:'Hải Điện',category:'Huyền ảo',tag:'FREE',kind:'free',price:0,asset:'abyss-sanctuary.webp'},
  {id:'v39-mage',name:'Nguyệt Sư',category:'Chân dung',tag:'FREE',kind:'free',price:0,asset:'moon-mage.webp',folder:'v39'},
  {id:'v39-swordsman',name:'Kiếm Khách',category:'Chân dung',tag:'QUÀ TẶNG',kind:'gift',price:0,asset:'jade-swordsman.webp',folder:'v39'},
  {id:'v39-wanderer',name:'Dạ Hành',category:'Neon',tag:'FREE',kind:'free',price:0,asset:'neon-wanderer.webp',folder:'v39'},
  {id:'v39-whitefox',name:'Bạch Hồ',category:'Linh thú',tag:'GOLD',kind:'premium',price:95,asset:'white-fox.webp',folder:'v39'}
 ].map(x=>Object.freeze(x)));
 const FONTS=Object.freeze([
  {id:'be',name:'Be Vietnam',kind:'free',price:0,sample:'Đơn giản · thanh thoát'},
  {id:'outfit',name:'Outfit',kind:'free',price:0,sample:'Hiện đại · tinh tế'},
  {id:'cormorant',name:'Cormorant',kind:'gift',price:0,sample:'Cổ điển · lãng mạn'},
  {id:'prata',name:'Prata',kind:'premium',price:35,sample:'Sang trọng · vương giả'},
  {id:'marcellus',name:'Marcellus',kind:'premium',price:65,sample:'Quý tộc · huyền ảo'}
 ].map(x=>Object.freeze(x)));
 const PREFIX='dudu-sandbox:phone-studio:v38:';
 function keyFor(owner,kind){return typeof owner==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(owner)&&
  ['gift','signature'].includes(kind)?PREFIX+kind+':'+owner:null;}
 function readGifts(storage,owner){
  const key=keyFor(owner,'gift');if(!key)return [];
  try{const a=JSON.parse(storage.getItem(key)||'[]');
   return Array.isArray(a)?a.filter(id=>ITEMS.some(x=>x.id===id&&x.kind==='gift')||
    FONTS.some(x=>x.id===id&&x.kind==='gift')).slice(0,20):[];
  }catch(_){return [];}
 }
 function claimGift(storage,owner,id){
  const key=keyFor(owner,'gift');if(!key||!(ITEMS.some(x=>x.id===id&&x.kind==='gift')||
   FONTS.some(x=>x.id===id&&x.kind==='gift')))return false;
  const gifts=readGifts(storage,owner);if(gifts.includes(id))return true;
  try{storage.setItem(key,JSON.stringify([...gifts,id]));return true;}catch(_){return false;}
 }
 function allowed(kind,id,storage,owner){
  const found=(kind==='wallpaper'?ITEMS:FONTS).find(x=>x.id===id);
  return !!found&&(found.kind==='free'||found.kind==='gift'&&readGifts(storage,owner).includes(id));
 }
 function cleanSignature(value){
  const str=typeof value?.text==='string'?value.text.replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,22):'Du';
  return Object.freeze({text:str||'Du',style:['script','royal','neon'].includes(value?.style)?value.style:'script',
   visible:value?.visible===true});
 }
 function readSignature(storage,owner){
  const key=keyFor(owner,'signature');if(!key)return cleanSignature(null);
  try{return cleanSignature(JSON.parse(storage.getItem(key)||'null'));}
  catch(_){return cleanSignature(null);}
 }
 function writeSignature(storage,owner,value){
  const key=keyFor(owner,'signature');if(!key)return false;
  try{storage.setItem(key,JSON.stringify(cleanSignature(value)));return true;}catch(_){return false;}
 }
 return Object.freeze({ITEMS,FONTS,keyFor,readGifts,claimGift,allowed,cleanSignature,readSignature,writeSignature});
});
