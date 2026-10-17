'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const crypto=require('node:crypto');
const EconomyV52=require('./lib/economy-v52');

const {
  MAX_USER_DAILY,MAX_GLOBAL_DAILY,LEASE_MS,dayUTC,validateRequest,quotaFailure
}=require('./lib/ai-limits');

initializeApp();
const db=getFirestore();
const GEMINI_API_KEY=defineSecret('GEMINI_API_KEY');
const REGION='asia-southeast1';

// Fail closed until Firebase App Check is configured on GitHub Pages.
// Maximum cost exposure also bounded by transaction-based per-user + global quotas.
const baseOptions={region:REGION,enforceAppCheck:true,maxInstances:2,memory:'256MiB',timeoutSeconds:45};

function requireUser(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated','Hãy đăng nhập DUDU Studio trước khi dùng AI.');
  return request.auth.uid;
}
function quotaRefs(uid,day) {
  return {
    user:db.collection('ai_usage_v2').doc(uid).collection('days').doc(day),
    global:db.collection('ai_global_usage_v2').doc(day)
  };
}
function quotaMessage(code) {
  switch(code) {
    case 'daily-user':return 'Bạn đã hết 25 lượt AI hôm nay (tính theo UTC). Hãy quay lại vào ngày mai.';
    case 'daily-global':return 'DUDU Studio đã đạt ngân sách 200 yêu cầu AI trong ngày. Vui lòng quay lại sau.';
    case 'cooldown':return 'Vui lòng chờ 10 giây giữa hai lần gọi AI.';
    default:return 'Yêu cầu AI trước đang được xử lý. Vui lòng đợi một chút.';
  }
}
async function reserve(uid) {
  const now=Date.now();
  const day=dayUTC(now);
  const refs=quotaRefs(uid,day);
  const id=crypto.randomUUID();
  await db.runTransaction(async tx => {
    const [userSnap,globalSnap]=await Promise.all([tx.get(refs.user),tx.get(refs.global)]);
    const user=userSnap.exists?userSnap.data():{};
    const global=globalSnap.exists?globalSnap.data():{};
    const failure=quotaFailure(user,global,now);
    if (failure) throw new HttpsError('resource-exhausted',quotaMessage(failure));
    tx.set(refs.user,{calls:(user.calls||0)+1,lastAt:now,activeUntil:now+LEASE_MS,activeId:id},{merge:true});
    tx.set(refs.global,{calls:(global.calls||0)+1,updatedAt:now},{merge:true});
  });
  return {id,refs};
}
async function release(reservation) {
  try {
    await db.runTransaction(async tx => {
      const snapshot=await tx.get(reservation.refs.user);
      if (snapshot.exists && snapshot.data()?.activeId===reservation.id) {
        tx.update(reservation.refs.user,{activeUntil:0,activeId:null});
      }
    });
  } catch(error) {
    console.error('AI quota lease cleanup failed',error?.code || 'unknown');
  }
}
async function generateGemini(payload) {
  const secret=GEMINI_API_KEY.value();
  if (!secret) throw new HttpsError('failed-precondition','Máy chủ AI chưa được cấu hình khóa bí mật.');
  const body={
    systemInstruction:payload.systemInstruction,
    contents:payload.contents,
    generationConfig:{
      temperature:payload.purpose==='chat'?0.8:0.65,
      maxOutputTokens:payload.purpose==='chat'?320:850
    }
  };
  const model='gemini-2.5-flash-lite';
  let response;
  try {
    response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':secret},
      body:JSON.stringify(body),signal:AbortSignal.timeout(30000)
    });
  } catch(e) {
    console.error('Gemini connection failed',e?.name);
    throw new HttpsError('unavailable','Máy chủ AI đang không phản hồi. Vui lòng thử lại sau.');
  }
  if (!response.ok) {
    // Do not leak key, response bodies or backend traces to browsers.
    console.error('Gemini upstream status:',response.status);
    if ([429,503].includes(response.status)) throw new HttpsError('resource-exhausted','Gemini đang quá tải hoặc đã hết hạn mức dự án AI.');
    throw new HttpsError('unavailable','Không thể nhận phản hồi từ Gemini lúc này.');
  }
  const data=await response.json();
  const text=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
  if (!text) throw new HttpsError('unavailable','Gemini chưa tạo được phản hồi phù hợp.');
  return {text,model};
}
exports.duduAiGenerate=onCall({...baseOptions,secrets:[GEMINI_API_KEY]},async request=>{
  const uid=requireUser(request);
  const payload=validateRequest(request.data);
  if (!payload) throw new HttpsError('invalid-argument','Nội dung AI không hợp lệ hoặc quá dài (tối đa 12.000 ký tự).');
  const lease=await reserve(uid);
  try { return await generateGemini(payload); }
  finally { await release(lease); }
});
exports.duduAiStatus=onCall(baseOptions,async request=>{
  const uid=requireUser(request);
  const day=dayUTC(Date.now());
  const refs=quotaRefs(uid,day);
  const [userSnap,globalSnap]=await Promise.all([refs.user.get(),refs.global.get()]);
  return {
    configured:true,
    region:REGION,
    dailyLimit:MAX_USER_DAILY,
    remaining:Math.max(0,MAX_USER_DAILY-(userSnap.data()?.calls||0)),
    globalRemaining:Math.max(0,MAX_GLOBAL_DAILY-(globalSnap.data()?.calls||0))
  };
});

/* V52 trusted economy — defaults to DISABLED until project admin explicitly
 * configures App Check, deploys Functions and sets
 * system_config/economy_v52 {enabled:true,schemaVersion:52}.
 * Does not read or migrate mutable profiles_v2 Xu/EXP/inventory.
 */
const ECONOMY_COLLECTION='economy_accounts_v52';
const economyOptions={...baseOptions,maxInstances:2,timeoutSeconds:30};
function economyAccountRef(uid){return db.collection(ECONOMY_COLLECTION).doc(uid);}
function economyGateRef(){return db.doc('system_config/economy_v52');}
function economyEnabled(snap){
 return !!snap.exists&&snap.data()?.enabled===true&&snap.data()?.schemaVersion===52;
}
function economyFailure(reason){
 const messages={
  'already-claimed':'Bạn đã điểm danh hôm nay.',
  'daily-limit':'Bạn đã đạt giới hạn mua hàng hôm nay.',
  'inventory-full':'Kho máy chủ đã đầy.',
  'not-enough-coins':'Ví Xu máy chủ chưa đủ.',
  'wallet-cap':'Ví đã đạt giới hạn Xu.',
  'not-for-sale':'Vật phẩm này chưa được mở bán.',
  'clock-backwards':'Ngày trên máy chủ không hợp lệ.'
 };
 throw new HttpsError(reason==='not-enough-coins'?'failed-precondition':'failed-precondition',
  messages[reason]||'Giao dịch chưa hợp lệ.');
}
function safeEconomyAccount(snap){
 try{return EconomyV52.account(snap.exists?snap.data():null);}
 catch(_){throw new HttpsError('failed-precondition','Dữ liệu ví máy chủ cần được quản trị viên kiểm tra.');}
}
exports.duduEconomyStatus=onCall(economyOptions,async request=>{
 const uid=requireUser(request);
 const gate=await economyGateRef().get();
 if(!economyEnabled(gate))return {enabled:false,mode:'server-disabled',schemaVersion:52};
 const ref=economyAccountRef(uid);
 const [snap,items]=await Promise.all([
  ref.get(),ref.collection('items').orderBy('createdAt','desc').limit(30).get()
 ]);
 const account=safeEconomyAccount(snap);
 return {enabled:true,schemaVersion:52,uid,serverDay:EconomyV52.utcDay(Date.now()),
  balance:account.balance,level:account.level,exp:account.exp,
  inventoryCount:account.inventoryCount,checkinDay:account.checkinDay,
  daily:account.daily,
  saleIds:Object.keys(EconomyV52.PRICES),
  items:items.docs.map(doc=>({instanceId:doc.id,
   itemId:doc.data().itemId,source:'SERVER_SHOP',createdAt:doc.data().createdAt}))};
});
exports.duduEconomyDailyCheckIn=onCall(economyOptions,async request=>{
 const uid=requireUser(request);
 // Ignore all client-submitted progress, dates, currency, and credentials.
 if(request.data&&Object.keys(request.data).length)
  throw new HttpsError('invalid-argument','Yêu cầu điểm danh không hợp lệ.');
 const now=Date.now(),day=EconomyV52.utcDay(now),user=economyAccountRef(uid);
 const receipt=user.collection('receipts').doc('checkin-'+day);
 return db.runTransaction(async tx=>{
  const [gate,old,prior]=await Promise.all([
   tx.get(economyGateRef()),tx.get(user),tx.get(receipt)
  ]);
  if(!economyEnabled(gate))
   throw new HttpsError('failed-precondition','Kinh tế máy chủ chưa được quản trị viên kích hoạt.');
  const before=safeEconomyAccount(old);
  if(prior.exists)return {ok:true,alreadyClaimed:true,
   balance:before.balance,level:before.level,exp:before.exp,serverDay:day};
  let plan;
  try{plan=EconomyV52.checkinPlan(before,day);}
  catch(_){throw new HttpsError('failed-precondition','Hồ sơ kinh tế không hợp lệ.');}
  if(!plan.ok)economyFailure(plan.reason);
  tx.set(user,{...plan.account,schemaVersion:52,updatedAt:now},{merge:true});
  tx.create(receipt,{action:'DAILY_CHECKIN',day,coins:plan.award.coins,
   exp:plan.award.exp,createdAt:now});
  return {ok:true,alreadyClaimed:false,balance:plan.account.balance,
   level:plan.account.level,exp:plan.account.exp,
   serverDay:day,award:plan.award};
 });
});
exports.duduEconomyPurchase=onCall(economyOptions,async request=>{
 const uid=requireUser(request);
 const data=request.data;
 if(!data||typeof data!=='object'||Array.isArray(data)||
  Object.keys(data).length!==2||
  typeof data.itemId!=='string'||!EconomyV52.validRequestId(data.requestId))
  throw new HttpsError('invalid-argument','Mã vật phẩm hoặc yêu cầu mua không hợp lệ.');
 // Only an ID and an idempotency key are accepted. Never trust client price.
 const itemId=data.itemId,requestId=data.requestId,price=EconomyV52.PRICES[itemId];
 if(!Number.isSafeInteger(price))
  throw new HttpsError('failed-precondition','Vật phẩm không được bán bằng Xu máy chủ.');
 const user=economyAccountRef(uid),receipt=user.collection('receipts').doc('buy-'+requestId);
 const instanceId='p-'+requestId;
 const itemRef=user.collection('items').doc(instanceId);
 const now=Date.now(),day=EconomyV52.utcDay(now);
 return db.runTransaction(async tx=>{
  const [gate,old,prior]=await Promise.all([
   tx.get(economyGateRef()),tx.get(user),tx.get(receipt)
  ]);
  if(!economyEnabled(gate))
   throw new HttpsError('failed-precondition','Kinh tế máy chủ chưa được kích hoạt.');
  const before=safeEconomyAccount(old);
  if(prior.exists){
   const logged=prior.data();
   if(logged.itemId!==itemId)
    throw new HttpsError('already-exists','Mã giao dịch đã dùng cho một sản phẩm khác.');
   return {ok:true,replayed:true,itemId,instanceId,
    price:logged.price,balance:logged.balanceAfter,
    inventoryCount:logged.inventoryCountAfter,serverDay:logged.day};
  }
  let plan;
  try{plan=EconomyV52.purchasePlan(before,itemId,day);}
  catch(_){throw new HttpsError('failed-precondition','Hồ sơ kinh tế không hợp lệ.');}
  if(!plan.ok)economyFailure(plan.reason);
  tx.set(user,{...plan.account,schemaVersion:52,updatedAt:now},{merge:true});
  tx.create(itemRef,{itemId,source:'SERVER_SHOP',createdAt:now,
   receiptId:receipt.id,price:plan.price});
  tx.create(receipt,{action:'SHOP_PURCHASE',itemId,price:plan.price,day,
   balanceAfter:plan.account.balance,inventoryCountAfter:plan.account.inventoryCount,
   createdAt:now});
  return {ok:true,replayed:false,itemId,instanceId,
   price:plan.price,balance:plan.account.balance,
   inventoryCount:plan.account.inventoryCount,serverDay:day};
 });
});
