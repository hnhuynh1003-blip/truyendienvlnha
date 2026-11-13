/* F3.4 · personal quick-sale. One Firestore transaction, one durable receipt.
 * All selected physical instances must still be owned and sellable at commit.
 * No direct client wallet write, no best-effort partial payout.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./personal-spark-items-v1.js'):root?.DuduPersonalSparkItemsV1,
  node?require('./personal-collection-c24.js'):root?.DuduPersonalCollectionC24);
 if(node)module.exports=api;
 if(root)root.DuduPersonalBulkSaleF34=api;
})(typeof window!=='undefined'?window:null,function(spark,collection){
 'use strict';
 const MAX_BATCH=100,MAX_WALLET=1000000000;
 const lowRank=new Set(['F','E','D']);
 const validInstance=id=>typeof id==='string'&&id.length>0&&id.length<=120&&
  !/[\u0000-\u001f]/.test(id);
 const validRequest=id=>typeof id==='string'&&/^sell-[0-9a-f-]{36}$/.test(id);
 function protectedIds(states){
  return new Set(Array.isArray(states?.__duduVantVatF33?.lockedIds)?
   states.__duduVantVatF33.lockedIds:[]);
 }
 function candidates(inventory,states,rankFilter=['F','E','D'],keepOne=false){
  const ranks=new Set((Array.isArray(rankFilter)?rankFilter:[]).filter(x=>lowRank.has(x)));
  const locked=protectedIds(states),seen=new Set(),result=[];
  for(const item of Array.isArray(inventory)?inventory:[]){
   const id=item?.instanceId,price=spark?.sellPrice(item)||0;
   if(!validInstance(id)||!lowRank.has(item?.rank)||!ranks.has(item.rank)||
      !Number.isSafeInteger(price)||price<=0||locked.has(id)||
      spark?.canUse(item)===true)continue;
   if(keepOne&&!seen.has(item.id)){seen.add(item.id);continue;}
   result.push({instanceId:id,itemId:item.id,rank:item.rank,price,name:item.name});
  }
  return result;
 }
 async function run({db,auth,uid,requestId,instanceIds,now=()=>new Date()}={}){
  if(!uid||uid.length>128||auth?.currentUser?.uid!==uid||!db?.collection||
    !db?.runTransaction||!validRequest(requestId)||!Array.isArray(instanceIds)||
    !instanceIds.length||instanceIds.length>MAX_BATCH||
    new Set(instanceIds).size!==instanceIds.length||!instanceIds.every(validInstance))
   throw Error('Danh sách bán nhanh không hợp lệ');
  const user=auth.currentUser,ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw Error('Không tìm thấy Kho trên máy chủ');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
    throw Error('Tài khoản đã thay đổi');
   const data=snap.data(),balance=data.currency,inventory=data.inventory;
   if(!Number.isSafeInteger(balance)||balance<0||balance>MAX_WALLET||
      !Array.isArray(inventory)||inventory.length>spark.MAX_ITEMS)
    throw Error('Số dư hoặc Kho không hợp lệ');
   const states=data.storyStates&&typeof data.storyStates==='object'&&
    !Array.isArray(data.storyStates)?data.storyStates:{};
   const meta=states[spark.META]&&typeof states[spark.META]==='object'?
    states[spark.META]:{},receipts={...meta.receipts};
   const prior=receipts[requestId];
   if(prior){
    if(prior.kind!=='bulk-sell'||!Array.isArray(prior.instanceIds)||
       prior.instanceIds.length!==instanceIds.length||
       prior.instanceIds.some((id,i)=>id!==instanceIds[i]))
     throw Error('Mã giao dịch đã dùng cho lệnh bán khác');
    return {status:'already-applied',balance,inventory,storyStates:states,
     count:prior.instanceIds.length,price:prior.price};
   }
   const byId=new Map(),locked=protectedIds(states);
   for(const item of inventory){
    if(!validInstance(item?.instanceId))continue;
    if(byId.has(item.instanceId))byId.set(item.instanceId,null);
    else byId.set(item.instanceId,item);
   }
   const sold=[];let price=0;
   for(const id of instanceIds){
    const item=byId.get(id),value=spark.sellPrice(item);
    if(!item||!lowRank.has(item.rank)||!value||locked.has(id)||spark.canUse(item))
     throw Error('Có vật phẩm đã đổi, bị khóa hoặc không thể bán. Hãy xem lại danh sách.');
    price+=value;sold.push(item);
   }
   if(!Number.isSafeInteger(price)||price<=0||balance>MAX_WALLET-price)
    throw Error('Giao dịch vượt giới hạn Xu');
   const nowDate=now(),at=nowDate.valueOf();
   if(!Number.isSafeInteger(at)||at<=0)throw Error('Ngày giao dịch không hợp lệ');
   const receipt={kind:'bulk-sell',instanceIds:[...instanceIds],price,
    count:sold.length,at:nowDate.toISOString()};
   receipts[requestId]=receipt;
   const keys=Object.keys(receipts);
   for(const old of keys.slice(0,Math.max(0,keys.length-spark.MAX_RECEIPTS)))delete receipts[old];
   let journal=states[collection.META];
   for(const item of sold){
    const row=collection.append(journal,{eventId:requestId+':'+item.instanceId,
     kind:'SELL',item,at,price:spark.sellPrice(item),instanceId:item.instanceId,
     inventory});
    if(!row.ok)throw Error('Chưa ghi đủ lịch sử bán bảo vật');
    journal=row.state;
   }
   const soldSet=new Set(instanceIds),nextInventory=inventory.filter(x=>
    !soldSet.has(x?.instanceId));
   const nextStates={...states,[spark.META]:{...meta,version:1,receipts},
    [collection.META]:journal};
   tx.update(ref,{currency:balance+price,inventory:nextInventory,storyStates:nextStates});
   return {status:'applied',balance:balance+price,inventory:nextInventory,
    storyStates:nextStates,count:sold.length,price};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
   throw Error('Tài khoản đã đổi, vui lòng tải lại Kho');
  return Object.freeze(result);
 }
 return Object.freeze({MAX_BATCH,candidates,run});
});
