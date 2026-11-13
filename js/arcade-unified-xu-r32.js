/* Arcade R3.2 — personal-mode unified Xu.
 * The existing profiles_v2 currency is the ONLY spendable Xu balance.
 * Game state + fractional Xu are committed with currency in one Firestore tx.
 * No retroactive grant from localStorage Arcade coins. No public anti-cheat claim.
 */
(function(root,factory){
 'use strict';
 const api=factory(root?.DuduPersonalArcadeCoreV1||
  (typeof require==='function'?require('./personal-arcade-core-v1.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduArcadeUnifiedXuR32=api;
})(typeof window!=='undefined'?window:null,function(core){
 'use strict';
 const META='__duduArcadeUnifiedXuR32';
 const TENTHS=10,MAX_WALLET=1000000000,MAX_ARCADE_TENTHS=1000000000;
 const MAX_ACTIVE_MS=60000,MAX_IDS=32;
 const validUid=s=>typeof s==='string'&&s.length>0&&s.length<=128;
 const validMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_WALLET;
 const validId=s=>typeof s==='string'&&/^ax-[0-9a-f-]{36}$/.test(s);
 const validMode=x=>['init','tick','action'].includes(x);
 const validTime=n=>Number.isSafeInteger(n)&&n>0;
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 function requestId(cryptoApi=typeof crypto!=='undefined'?crypto:null){
  if(typeof cryptoApi?.randomUUID!=='function')throw Error('Chưa tạo được mã giao dịch Arcade');
  return 'ax-'+cryptoApi.randomUUID();
 }
 function safeState(raw,now){
  // core.norm sanitizes all game-specific fields; local wallet is discarded.
  const state=core.norm(object(raw)?raw:null,now);
  state.coins=0;
  return state;
 }
 async function run({db,auth,uid,id,mode,action='',seed=null,now=Date.now(),
   elapsedMs=0,roll=0.5}={}){
  if(!core?.act||!core?.advance||!validUid(uid)||!validId(id)||!validMode(mode)||
     !validTime(now)||!Number.isSafeInteger(elapsedMs)||elapsedMs<0||
     typeof action!=='string'||action.length>100||
     (mode==='action'?!action:!!action)||
     !Number.isFinite(roll)||roll<0||roll>=1||
     !db?.collection||!db?.runTransaction||auth?.currentUser?.uid!==uid)
   throw Error('Phiên đồng bộ Arcade không hợp lệ');
  const user=auth.currentUser;
  const ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const doc=await tx.get(ref);
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw Error('Tài khoản đã thay đổi');
   if(!doc.exists)throw Error('Chưa có hồ sơ trên Firebase');
   const profile=doc.data(),wallet=profile.currency;
   if(!validMoney(wallet))throw Error('Số dư Ví Xu không hợp lệ');
   const allStates=object(profile.storyStates)?profile.storyStates:{};
   const saved=object(allStates[META])?allStates[META]:null;
   const priorIds=Array.isArray(saved?.recentIds)?saved.recentIds.filter(validId).slice(-MAX_IDS):[];
   if(priorIds.includes(id)){
    const cached=core.norm(saved?.game,now);
    // No replays of rewards or purchases, even after transaction retries.
    return {ok:true,duplicate:true,committed:false,mode,balance:wallet,
     state:cached,label:'Giao dịch đã được ghi nhận'};
   }
   const remainder=Number.isSafeInteger(saved?.remainder)&&saved.remainder>=0&&saved.remainder<10?
    saved.remainder:0;
   const start=core.norm(saved?.game??safeState(seed,now),now);
   if(wallet>MAX_ARCADE_TENTHS/TENTHS)throw Error('Ví vượt giới hạn hỗ trợ của Arcade');
   const beforeTenths=wallet*TENTHS+remainder;
   if(beforeTenths>MAX_ARCADE_TENTHS)throw Error('Số dư Xu đạt giới hạn Arcade');
   start.coins=beforeTenths;
   const advanced=core.advance(start,now,mode==='init'?0:Math.min(elapsedMs,MAX_ACTIVE_MS));
   let outcome={ok:true,label:'Đã đồng bộ Xu',state:advanced};
   if(mode==='action')outcome=core.act(advanced,action,now,roll);
   if(!outcome.ok)return {ok:false,committed:false,mode,balance:wallet,
    state:start,reason:outcome.reason};
   const spentOrEarned=outcome.state.coins-beforeTenths;
   const netTenths=beforeTenths+spentOrEarned;
   if(!Number.isSafeInteger(netTenths)||netTenths<0||netTenths>MAX_ARCADE_TENTHS)
    throw Error('Biến động Xu vượt giới hạn');
   const nextWallet=Math.floor(netTenths/TENTHS),nextRemainder=netTenths%TENTHS;
   if(!validMoney(nextWallet))throw Error('Số dư Xu mới không hợp lệ');
   const snapshot={...outcome.state,coins:netTenths};
   const nextMeta={version:1,game:snapshot,remainder:nextRemainder,
    recentIds:[...priorIds,id].slice(-MAX_IDS)};
   tx.set(ref,{currency:nextWallet,storyStates:{[META]:nextMeta}},{merge:true});
   return {...outcome,ok:true,committed:true,mode,balance:nextWallet,
    remainder:nextRemainder,state:snapshot};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
   throw Error('Tài khoản đã thay đổi sau giao dịch');
  return Object.freeze(result);
 }
 return Object.freeze({META,TENTHS,MAX_WALLET,MAX_ACTIVE_MS,requestId,run,safeState});
});