/* C2.5 — UID-scoped DUDU FUN rounds and honest-play rewards on Firestore Standard.
 * Every click is checked against the round committed to the owner profile.
 * These client-side rules are NOT a server-attested anti-cheat mechanism.
 */
(function(root,factory){
 'use strict';
 const node=typeof module==='object'&&module.exports;
 const api=factory(
  node?require('./dudu-fun-rules-v43.js'):root?.DuduFunRulesV43,
  node?require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
  node?require('./quest-engine-v43-7.js'):root?.DuduQuestEngineV437,
  node?require('./personal-collection-c24.js'):root?.DuduPersonalCollectionC24);
 if(node)module.exports=api;
 if(root)root.DuduPersonalFunC25=api;
})(typeof window!=='undefined'?window:null,function(fun,core,questsEngine,collection){
 'use strict';
 const META='__duduFunLiveC25',MAX_WALLET=1000000000,MAX_ITEMS=500;
 const validUid=s=>typeof s==='string'&&s.length>0&&s.length<=128;
 const validAction=s=>typeof s==='string'&&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
 const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const fail=reason=>Object.assign(new Error(reason),{reason});
 function utcDay(at=Date.now()){
  if(!Number.isSafeInteger(at)||at<1||at>8640000000000000)return '';
  return new Date(at).toISOString().slice(0,10);
 }
 function stateOf(data,day){
  const states=isObject(data?.storyStates)?data.storyStates:{};
  return fun.norm(states[META],day);
 }
 function questAward(data,day,type){
  const rows=questsEngine.ensure(core.ensureQuests(data.quests||[]));
  const daily=core.rolloverQuests(rows,data.questsDayV43,day);
  if(!daily.ok||data.questsDayV43&&data.questsDayV43>day)
   throw fail('clock-backwards');
  const weekly=questsEngine.rotate(daily.quests,data.questV437,
   {day,previousDay:data.questsDayV43});
  if(!weekly.ok)throw fail('invalid-quests');
  const advanced=questsEngine.progress(
   core.applyQuestProgress(weekly.quests,'q_daily_fun'),weekly.state,
   {type:'FUN_CLAIM',eventId:'fun-'+type+'-'+day,day});
  if(!advanced)throw fail('invalid-quests');
  return {quests:advanced.quests,questV437:advanced.state,questsDayV43:daily.day};
 }
 async function load({db,auth,uid,now=()=>Date.now()}={}){
  if(!validUid(uid)||!db?.collection||auth?.currentUser?.uid!==uid)
   throw fail('invalid-account');
  const user=auth.currentUser,at=now(),day=utcDay(at);
  if(!day)throw fail('invalid-day');
  const snap=await db.collection('profiles_v2').doc(uid).get();
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  if(!snap.exists)throw fail('profile-missing');
  return {day,state:stateOf(snap.data(),day)};
 }
 async function run({db,auth,uid,kind,type,theme='star',choice,roll,seed,
  actionId,now=()=>Date.now()}={}){
  if(!validUid(uid)||auth?.currentUser?.uid!==uid||
   !db?.collection||!db?.runTransaction||
   !['begin','advance','claim'].includes(kind)||
   ![fun.TYPE_BOX,fun.TYPE_TICKET].includes(type)||
   (kind==='advance'&&!validAction(actionId)))throw fail('invalid-account');
  const user=auth.currentUser,at=now(),day=utcDay(at);
  if(!day)throw fail('invalid-day');
  const ref=db.collection('profiles_v2').doc(uid);
  const outcome=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
    throw fail('account-changed');
   const data=snap.data(),states=isObject(data.storyStates)?data.storyStates:{},
    raw=states[META],rounds=fun.norm(raw,day);
   if(raw?.version===fun.VERSION&&typeof raw.day==='string'&&raw.day>day)
    throw fail('clock-backwards');
   const actions=Array.isArray(raw?.actionIds)?
    raw.actionIds.filter(validAction).slice(-40):[];
   if(kind==='advance'&&actions.includes(actionId))
    return {status:'already-applied',kind,day,state:rounds};
   if(kind==='claim'&&rounds.rounds[type]?.status==='claimed')
    return {status:'already-applied',kind,day,state:rounds};
   let plan;
   if(kind==='begin')plan=fun.begin(raw,{type,theme,day,roll,seed});
   else if(kind==='advance')plan=fun.advance(raw,{type,choice,day});
   else{
    if(!Number.isSafeInteger(data.currency)||data.currency<0||
       data.currency>MAX_WALLET||!Array.isArray(data.inventory)||
       data.inventory.length>MAX_ITEMS)throw fail('invalid-profile');
    plan=fun.claim(raw,{type,day,coins:data.currency,inventory:data.inventory});
   }
   if(!plan.ok)throw fail(plan.reason);
   const next={...plan.state,actionIds:kind==='advance'?[
    ...actions,actionId].slice(-40):actions};
   const patch={storyStates:{...states,[META]:next}};
   let result={status:'applied',kind,day,state:next,
    ...(kind==='advance'?{correct:plan.correct}:{})};
   if(kind==='claim'){
    const quest=questAward(data,day,type);
    Object.assign(patch,quest,{currency:plan.coins,inventory:plan.inventory});
    if(plan.reward.kind==='ITEM'){
     const gained=plan.inventory.find(x=>x?.instanceId==='fun-'+type+'-'+day);
     const entry=collection.append(states[collection.META],{
      eventId:gained?.instanceId,kind:'FUN',item:gained,at,
      instanceId:gained?.instanceId,inventory:data.inventory});
     if(!entry.ok)throw fail('collection-write-failed');
     patch.storyStates[collection.META]=entry.state;
    }
    result={...result,reward:plan.reward,currency:plan.coins,
     inventory:plan.inventory,quests:quest.quests,questV437:quest.questV437,
     questsDayV43:quest.questsDayV43,storyStates:patch.storyStates};
   }
   tx.update(ref,patch);
   return result;
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)
   throw fail('account-changed');
  return Object.freeze(outcome);
 }
 return Object.freeze({META,utcDay,stateOf,load,run});
});
