/* DUDU Spark personal arcade exchange.
 * Small-account model: the browser reports its local game balance honestly;
 * Firestore atomically credits the existing personal wallet and records a
 * one-use receipt. NOT suitable for a public, tamper-proof game economy.
 * The UI must keep this disabled until the matching Rules are deployed.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalSparkExchangeV1=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const policy=root?.DuduPersonalArcadeExchangeV1 ||
  (typeof require==='function'?require('./personal-arcade-exchange-v1.js'):null);
 const MAX_WALLET=1000000000;
 const validId=s=>typeof s==='string'&&/^ex-[0-9a-f-]{36}$/.test(s);
 const validUid=s=>typeof s==='string'&&s.length>0&&s.length<=128;
 const validWallet=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_WALLET;
 function requestId(cryptoApi=root?.crypto){
  if(typeof cryptoApi?.randomUUID!=='function')throw Error('Thiết bị chưa hỗ trợ mã giao dịch an toàn');
  return 'ex-'+cryptoApi.randomUUID();
 }
 function quote(availableTenths,gameXu){
  if(!policy?.quote)throw Error('Chưa có bộ quy đổi Xu');
  const result=policy.quote({availableTenths,requestedGameXu:gameXu});
  if(!result.ok)throw Error('Số Xu muốn đổi không hợp lệ hoặc vượt số dư');
  return result;
 }
 async function transfer({db,auth,uid,id,gameXu,availableTenths,now=()=>new Date()}={}){
  if(!validUid(uid)||!validId(id)||!db?.collection||!db?.runTransaction||
     auth?.currentUser?.uid!==uid)throw Error('Chưa xác nhận được phiên tài khoản hoặc kết nối Firestore');
  const q=quote(availableTenths,gameXu);
  const user=auth.currentUser;
  const profile=db.collection('profiles_v2').doc(uid);
  const receipt=profile.collection('arcade_receipts_v1').doc(id);
  const stamp=now().toISOString();
  const result=await db.runTransaction(async tx=>{
   const [profileSnap,receiptSnap]=await Promise.all([tx.get(profile),tx.get(receipt)]);
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
    throw Error('Tài khoản đã thay đổi trong khi chuyển Xu');
   if(!profileSnap.exists)throw Error('Hồ sơ chưa có trên máy chủ');
   const balance=profileSnap.data()?.currency;
   if(!validWallet(balance))throw Error('Số dư ví hệ thống không hợp lệ');
   if(receiptSnap.exists){
    const prior=receiptSnap.data();
    if(prior?.id!==id||prior?.uid!==uid||prior?.gameXu!==q.gameXu||
       prior?.walletXu!==q.walletXu||prior?.rate!==10)
     throw Error('Mã giao dịch đã được sử dụng cho lệnh khác');
    return {status:'already-credited',balance,gameXu:q.gameXu,walletXu:q.walletXu,id};
   }
   if(balance>MAX_WALLET-q.walletXu)throw Error('Ví hệ thống đã đạt giới hạn Xu');
   const nextBalance=balance+q.walletXu;
   tx.set(receipt,{id,uid,gameXu:q.gameXu,walletXu:q.walletXu,rate:10,
    gameBalanceTenthsBefore:availableTenths,createdAt:stamp});
   tx.update(profile,{currency:nextBalance,arcadeLastReceiptV1:id});
   return {status:'credited',balance:nextBalance,gameXu:q.gameXu,walletXu:q.walletXu,id};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
   throw Error('Tài khoản đã đổi; cần tải lại ví trước khi hiển thị');
  return Object.freeze(result);
 }
 return Object.freeze({transfer,requestId,quote,MAX_WALLET});
});
