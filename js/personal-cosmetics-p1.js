/* P1: Personal cosmetic ownership, one purchase per account and SKU.
 * Uses the existing Spark profile wallet. No new backend, no EXP, no inventory slot.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./phone-wallpaper-v38-catalog.js'):root?.DuduWallpaperCatalogV38);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalCosmeticsP1=api;
})(typeof window!=='undefined'?window:null,function(catalog){
 'use strict';
 const META='_cosmeticsP1';
 function product(kind,id){
  const list=kind==='wallpaper'?catalog?.ITEMS:kind==='font'?catalog?.FONTS:null;
  return list?.find(x=>x.id===id&&x.kind==='premium'&&Number.isSafeInteger(x.price)&&x.price>0)||null;
 }
 function owns(states,kind,id){
  return !!product(kind,id)&&states?.[META]?.owned?.[kind+':'+id]===true;
 }
 async function purchase({db,auth,uid,kind,id}={}){
  const item=product(kind,id);
  if(!item)throw Error('Hình nền hoặc font không hợp lệ.');
  if(typeof uid!=='string'||!uid||!db?.runTransaction||!db?.collection||auth?.currentUser?.uid!==uid)
   throw Error('Hãy đăng nhập để mua.');
  const ref=db.collection('profiles_v2').doc(uid);
  const active=()=>auth.currentUser?.uid===uid;
  return db.runTransaction(async tx=>{
   if(!active())throw Error('Tài khoản đã thay đổi.');
   const snap=await tx.get(ref);
   if(!active())throw Error('Tài khoản đã thay đổi.');
   if(!snap.exists)throw Error('Hồ sơ chưa sẵn sàng.');
   const data=snap.data(),balance=data.currency;
   if(!Number.isSafeInteger(balance)||balance<0||balance>1000000000)throw Error('Số dư không hợp lệ.');
   const states=data.storyStates??{};
   if(!states||typeof states!=='object'||Array.isArray(states))throw Error('Hồ sơ không hợp lệ.');
   if(owns(states,kind,id))return {status:'already-owned',balance,storyStates:states};
   if(balance<item.price)throw Error('Không đủ Xu Vàng.');
   const previous=states[META];
   const owned={};
   for(const type of ['wallpaper','font']){
    for(const x of (type==='wallpaper'?catalog.ITEMS:catalog.FONTS)){
     if(owns(states,type,x.id))owned[type+':'+x.id]=true;
    }
   }
   owned[kind+':'+id]=true;
   const next={...states,[META]:{...previous,version:1,owned}};
   const nextBalance=balance-item.price;
   tx.update(ref,{currency:nextBalance,storyStates:next});
   return {status:'applied',balance:nextBalance,storyStates:next};
  });
 }
 return Object.freeze({META,product,owns,purchase});
});
