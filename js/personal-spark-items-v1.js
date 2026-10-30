/* Personal Spark shop: one-owner profile transactions, no Functions/Blaze.
 * Receipts live in reserved storyStates metadata already permitted by legacy
 * profile Rules. This is a PERSONAL economy, not a public anti-cheat ledger.
 */
(function(root,factory){
 const api=factory(
  root?.DuduEconomyCoreV43||(typeof require==='function'?require('./economy-core-v43.js'):null),
  root?.DuduInventoryTradeV439||(typeof require==='function'?require('./inventory-trade-v43-9.js'):null),
  root?.DuduFunctionalItemsV438||(typeof require==='function'?require('./functional-items-v43-8.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalSparkItemsV1=api;
})(typeof window!=='undefined'?window:null,function(economy,trade,functional){
 'use strict';
 const META='__duduPersonalItemsV1',PROGRESS_META='__duduPersonalProgressC23',
  MAX_RECEIPTS=80,MAX_WALLET=1000000000,MAX_ITEMS=500;
 const products=new Map([...economy.shopCatalog(),...economy.FUNCTIONAL_TOOLS].map(x=>[x.id,x]));
 const validId=s=>typeof s==='string'&&/^(shop|use|sell)-[0-9a-f-]{36}$/.test(s);
 const validUid=s=>typeof s==='string'&&s.length>0&&s.length<=128;
 const safeWallet=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_WALLET;
 const safeItems=a=>Array.isArray(a)&&a.length<=MAX_ITEMS;
 function requestId(kind,cryptoApi=typeof crypto!=='undefined'?crypto:null){
  if(!['shop','use','sell'].includes(kind)||typeof cryptoApi?.randomUUID!=='function')
   throw Error('Thiết bị chưa tạo được mã giao dịch');
  return kind+'-'+cryptoApi.randomUUID();
 }
 function normReceipts(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  const result={};
  for(const [key,value] of Object.entries(raw).slice(-MAX_RECEIPTS)){
   if(validId(key)&&value&&typeof value==='object')result[key]=value;
  }
  return result;
 }
 function sellPrice(item){
  const commonPrice=trade?.saleValue?.(item)||0;
  if(commonPrice)return commonPrice;
  // Personal accounts may resell a verified, unused SHOP functional tool.
  // This deliberately does not expand Sandbox, chapter loot or collectibles.
  const product=products.get(item?.id);
  if(!product||product.scope!=='FUNCTIONAL'||product.discardable===false||
     item.itemId!==product.id||item.name!==product.name||
     item.rank!==product.rank||item.type!==product.type||
     item.scope!==product.scope||item.obtainedFrom?.kind!=='SHOP'||
     item.obtainedFrom?.source!=='DUDU_MARKET'||
     !/^shop-[0-9a-f-]{36}$/.test(item.instanceId||''))return 0;
  return Math.max(1,Math.floor(product.price*.35));
 }
 function canUse(item){
  return (!!item&&[economy.SUPPLY_ID,economy.PULSE_ID].includes(item.id)&&
   typeof item.instanceId==='string'&&/^shop-[0-9a-f-]{36}$/.test(item.instanceId)&&
   functional?.trusted?.(item)===true) || (!!item&&item.id===economy.TOOL_ID&&
   item.itemId===economy.TOOL_ID&&item.scope==='FUNCTIONAL'&&
   item.obtainedFrom?.kind==='SHOP'&&item.obtainedFrom?.source==='DUDU_MARKET'&&
   /^shop-[0-9a-f-]{36}$/.test(item.instanceId||''));
 }
 async function run({db,auth,uid,requestId:rid,kind,itemId,instanceId,
  cooldownRemainingMs=0,lastLootTimestamp=0,now=()=>new Date()}={}){
  const prefix=kind==='purchase'?'shop':kind;
  if(!validUid(uid)||!validId(rid)||!['purchase','use','sell'].includes(kind)||
     !rid.startsWith(prefix+'-')||
     !db?.collection||!db?.runTransaction||auth?.currentUser?.uid!==uid)
   throw Error('Chưa xác nhận được tài khoản hoặc kết nối Firestore');
  if(kind==='purchase'&&!products.has(itemId))throw Error('Vật phẩm không bán trong DUDU Market');
  if(kind!=='purchase'&&(typeof instanceId!=='string'||instanceId.length>120))
   throw Error('Chưa chọn vật phẩm');
  if(!Number.isSafeInteger(cooldownRemainingMs)||cooldownRemainingMs<0||
     !Number.isSafeInteger(lastLootTimestamp)||lastLootTimestamp<0)
   throw Error('Thời gian hồi chiêu không hợp lệ');
  const user=auth.currentUser,profile=db.collection('profiles_v2').doc(uid);
  const outcome=await db.runTransaction(async tx=>{
   const snap=await tx.get(profile);
   if(!snap.exists)throw Error('Tài khoản chưa có hồ sơ trên máy chủ');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
    throw Error('Tài khoản thay đổi khi giao dịch');
   const data=snap.data(),balance=data.currency,inventory=data.inventory||[];
   if(!safeWallet(balance)||!safeItems(inventory))throw Error('Số dư hoặc Kho không hợp lệ');
   const storyStates=data.storyStates&&typeof data.storyStates==='object'&&
    !Array.isArray(data.storyStates)?data.storyStates:{};
   const progressState=storyStates[PROGRESS_META]&&
    typeof storyStates[PROGRESS_META]==='object'?storyStates[PROGRESS_META]:{};
   const ledger=storyStates[META]&&typeof storyStates[META]==='object'?
    storyStates[META]:{};
   const receipts=normReceipts(ledger.receipts),prior=receipts[rid];
   if(prior){
    if(prior.kind!==kind||prior.itemId!==itemId||
       prior.instanceId!==(instanceId||''))
     throw Error('Mã giao dịch đã được dùng cho thao tác khác');
    return {status:'already-applied',balance,inventory,storyStates,
     ...prior,result:prior};
   }
   let nextBalance=balance,nextInventory=inventory,price=0,effect='',cooldownAt=null,
    target=null,product=null;
   if(kind==='purchase'){
    product=products.get(itemId);
    price=product.price;
    if(!Number.isSafeInteger(price)||price<=0||price>balance)
     throw Error('Không đủ Xu để mua món này');
    if(inventory.length>=MAX_ITEMS)throw Error('Kho đã đầy 500 món');
    if(inventory.some(x=>x?.instanceId===rid))throw Error('Mã vật phẩm trùng trong Kho');
    const instance=economy.instance(product,rid);
    if(!instance)throw Error('Không tạo được vật phẩm');
    nextInventory=[instance,...inventory];nextBalance=balance-price;
   }else{
    const matches=inventory.filter(x=>x?.instanceId===instanceId);
    if(matches.length!==1)throw Error('Vật phẩm không còn trong Kho');
    target=matches[0];
    if(target.id!==itemId)throw Error('Vật phẩm đã bị đổi');
    if(kind==='sell'){
     price=sellPrice(target);
     if(!price||balance>MAX_WALLET-price)throw Error('Món này không thể bán');
     nextBalance=balance+price;
     nextInventory=inventory.filter(x=>x!==target);
    }else{
     if(!canUse(target))throw Error('Món này chưa có chức năng để dùng');
     if(target.id===economy.SUPPLY_ID){
      const plan=functional.quoteUse({inventory,state:null,
       itemInstanceId:instanceId,day:economy.localDay(),now:Date.now()});
      if(!plan.ok)throw Error('Chưa dùng được Gói Tiếp Tế');
      nextInventory=plan.inventory;effect='open-supply';
     }else{
      if(cooldownRemainingMs<=0)throw Error('Nhặt đồ đã hồi chiêu, chưa cần dùng công cụ');
      nextInventory=inventory.filter(x=>x!==target);
      effect=target.id===economy.TOOL_ID?'reset-cooldown':'reduce-cooldown-60s';
      const recordedAt=Number.isSafeInteger(progressState.lastGlobalLootAt)?
       progressState.lastGlobalLootAt:lastLootTimestamp;
      cooldownAt=target.id===economy.TOOL_ID?0:Math.max(0,recordedAt-60000);
     }
    }
   }
   const receipt={kind,itemId,instanceId:instanceId||'',price,effect,cooldownAt,
    at:now().toISOString()};
   const nextReceipts={...receipts,[rid]:receipt};
   const keys=Object.keys(nextReceipts);
   for(const old of keys.slice(0,Math.max(0,keys.length-MAX_RECEIPTS)))delete nextReceipts[old];
   const nextStates={...storyStates,[META]:{version:1,receipts:nextReceipts},
    ...(cooldownAt!==null?{[PROGRESS_META]:{
      ...progressState,lastGlobalLootAt:cooldownAt}}:{})};
   tx.update(profile,{currency:nextBalance,inventory:nextInventory,storyStates:nextStates});
   return {status:'applied',balance:nextBalance,inventory:nextInventory,
    storyStates:nextStates,...receipt,result:receipt};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
   throw Error('Tài khoản đã đổi, hãy tải lại Kho');
  return Object.freeze(outcome);
 }
 return Object.freeze({run,requestId,sellPrice,canUse,META,MAX_ITEMS,MAX_RECEIPTS});
});
