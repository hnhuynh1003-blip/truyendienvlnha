/* P2B draft transaction contract, NOT wired into production.
 * Client honest-play observations, never server-attested evidence.
 * Policy must be explicit; no gameplay rate or Tu Vi conversion is enabled here.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./personal-progress-c23.js'):root?.DuduPersonalProgressC23);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalReadingRewardP2B=api;
})(typeof window!=='undefined'?window:null,function(progress){
 'use strict';
 const META='__duduReadingP2B',SLOT_MS=10000,DAY_MS=86400000,SLOTS_PER_DAY=8640,
  HEX_LENGTH=SLOTS_PER_DAY/4,MAX_BATCH=60,RETRY_MS=DAY_MS;
 const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(x);
 const fail=reason=>Object.assign(Error(reason),{reason});
 function policyOf(policy){
  if(!policy||!validId(policy.id)||!Number.isSafeInteger(policy.expPerMinute)||
   policy.expPerMinute<1||policy.expPerMinute>20||!Number.isSafeInteger(policy.dailyMaxMinutes)||
   policy.dailyMaxMinutes<1||policy.dailyMaxMinutes>1440)throw fail('explicit-policy-required');
  return policy;
 }
 const dayKey=ms=>new Date(ms).toISOString().slice(0,10);
 function decode(row){
  if(row===undefined)return Array(HEX_LENGTH).fill(0);
  if(typeof row?.bits!=='string'||row.bits.length!==HEX_LENGTH||!/^[0-9a-f]+$/.test(row.bits))
   throw fail('invalid-reading-history');
  return Array.from(row.bits,x=>parseInt(x,16));
 }
 const count=bits=>bits.reduce((n,v)=>n+(v&1)+((v>>1)&1)+((v>>2)&1)+((v>>3)&1),0);
 function plan({data,policy,slots,nowMs}={}){
  const p=policyOf(policy);
  if(!Number.isSafeInteger(nowMs)||nowMs<DAY_MS||!Array.isArray(slots)||!slots.length||
    slots.length>MAX_BATCH||slots.some(s=>!Number.isSafeInteger(s)||s%SLOT_MS!==0||
    s<nowMs-RETRY_MS||s+SLOT_MS>nowMs))throw fail('invalid-reading-window');
  if(!data||!progress?.expPlan)throw fail('invalid-profile');
  const states=data.storyStates??{};
  if(!states||typeof states!=='object'||Array.isArray(states))throw fail('invalid-profile');
  const meta=states[META]??{},oldDays=meta.days??{};
  if(!meta||typeof meta!=='object'||Array.isArray(meta)||!oldDays||typeof oldDays!=='object'||Array.isArray(oldDays))throw fail('invalid-reading-history');
  const lifetime=meta.lifetimeObservedMs??0;
  if(!Number.isSafeInteger(lifetime)||lifetime<0||lifetime%SLOT_MS!==0||lifetime>Number.MAX_SAFE_INTEGER-MAX_BATCH*SLOT_MS)
   throw fail('invalid-reading-history');
  if(meta.policyId!==undefined&&meta.policyId!==p.id)throw fail('policy-migration-required');
  if(meta.policyId!==undefined&&(meta.expPerMinute!==p.expPerMinute||meta.dailyMaxMinutes!==p.dailyMaxMinutes))
   throw fail('policy-migration-required');
  const lastNow=meta.lastNowMs??nowMs;
  if(!Number.isSafeInteger(lastNow)||lastNow<DAY_MS||nowMs<lastNow-300000)throw fail('clock-backwards');
  const highWater=Math.max(nowMs,lastNow);
  if(slots.some(s=>s<highWater-RETRY_MS))throw fail('invalid-reading-window');
  const days={};
  for(const day of [dayKey(highWater-DAY_MS),dayKey(highWater)])if(Object.hasOwn(oldDays,day)){
   const bits=decode(oldDays[day]);days[day]={bits,used:count(bits)};
  }
  let newSlots=0;
  for(const start of [...new Set(slots)].sort((a,b)=>a-b)){
   const day=dayKey(start),index=Math.floor((start%DAY_MS)/SLOT_MS);
   const row=days[day]??(days[day]={bits:decode(undefined),used:0});
   const pos=Math.floor(index/4),mask=1<<(index%4);
   if(row.bits[pos]&mask||row.used>=p.dailyMaxMinutes*6)continue;
   row.bits[pos]|=mask;row.used++;newSlots++;
  }
  const nextLifetime=lifetime+newSlots*SLOT_MS;
  const awardExp=(Math.floor(nextLifetime/60000)-Math.floor(lifetime/60000))*p.expPerMinute;
  const earned=progress.expPlan(data,awardExp);
  if(newSlots===0)return {status:'already-credited',newSlots:0,awardExp:0,observedMs:0,
   currency:data.currency,exp:data.exp,level:data.level,levelUps:0,storyStates:states};
  const encoded=Object.fromEntries(Object.entries(days).map(([day,row])=>[day,{bits:row.bits.map(v=>v.toString(16)).join('')}]));
  return {status:'applied',newSlots,awardExp,observedMs:newSlots*SLOT_MS,...earned,
   storyStates:{...states,[META]:{version:1,policyId:p.id,expPerMinute:p.expPerMinute,
    dailyMaxMinutes:p.dailyMaxMinutes,lifetimeObservedMs:nextLifetime,lastNowMs:highWater,days:encoded}}};
 }
 async function run({db,auth,uid,policy,slots,now=()=>Date.now()}={}){
  if(!db?.runTransaction||!db?.collection||!validId(uid)||auth?.currentUser?.uid!==uid)throw fail('invalid-account');
  policyOf(policy);
  const ref=db.collection('profiles_v2').doc(uid),owner=auth.currentUser,at=now();
  const result=await db.runTransaction(async tx=>{
   if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const result=plan({data:snap.data(),policy,slots,nowMs:at});
   if(result.status==='applied')tx.update(ref,{currency:result.currency,exp:result.exp,level:result.level,storyStates:result.storyStates});
   return result;
  });
  if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return Object.freeze(result);
 }
 return Object.freeze({META,SLOT_MS,MAX_BATCH,plan,run});
});
