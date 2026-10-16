'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const crypto=require('node:crypto');
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
