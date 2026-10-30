/* C2.3c — personal reading, quest and loot receipts on Spark accounts.
 * Uses owner-scoped Firestore transactions and existing gameplay catalogs.
 * These are client-side honest-play rules, NOT server-attested anti-cheat.
 */
(function(root,factory){
 'use strict';
 const commonjs=typeof module==='object'&&module.exports;
 const api=factory(
  commonjs?require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
  commonjs?require('./quest-engine-v43-7.js'):root?.DuduQuestEngineV437,
  commonjs?require('./loot-rules-v2.js'):root?.DuduLootRules,
  commonjs?require('./loot-cadence-v42.js'):root?.DuduLootCadenceV42,
  commonjs?require('./chapter-loot-encounter-v1.js'):root?.DuduChapterLootEncounterV1,
  commonjs?require('./personal-collection-c24.js'):root?.DuduPersonalCollectionC24);
 if(commonjs)module.exports=api;
 if(root)root.DuduPersonalProgressC23=api;
})(typeof window!=='undefined'?window:null,function(core,questsEngine,lootRules,cadence,encounter,collection){
 'use strict';
 const META='__duduPersonalProgressC23',MAX_ITEMS=500,MAX_WALLET=1e9,
  MAX_RECEIPTS=64;
 const LEGACY=Object.freeze([
  {id:'q_daily_read',type:'DAILY',target:2,rewardCoin:25,rewardExp:30},
  {id:'q_daily_loot',type:'DAILY',target:2,rewardCoin:20,rewardExp:25},
  {id:'q_main_intro',type:'MAIN',target:1,rewardCoin:50,rewardExp:50},
  {id:'q_main_write',type:'MAIN',target:1,rewardCoin:60,rewardExp:60}
 ]);
 const KNOWN=new Map([...LEGACY,...core.EXTRA_DAILY_QUESTS,
  ...questsEngine.DEFINITIONS].map(row=>[row.id,row]));
 const validId=value=>typeof value==='string'&&value.length>0&&value.length<=120&&
  !/[\u0000-\u001f]/.test(value)&&
  !['__proto__','constructor','prototype'].includes(value);
 const validDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&
  !Number.isNaN(Date.parse(day+'T00:00:00Z'))&&
  new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
 const today=()=>new Date().toISOString().slice(0,10);
 const validWallet=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_WALLET;
 const validLevel=n=>Number.isSafeInteger(n)&&n>=1&&n<=999;
 const validExp=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
 const fail=reason=>Object.assign(new Error(reason),{reason});
 function expPlan(data,amount){
  let coins=data.currency,exp=data.exp,level=data.level,levelUps=0;
  if(!validWallet(coins)||!validExp(exp)||!validLevel(level)||
   !Number.isSafeInteger(amount)||amount<0||amount>500)throw fail('invalid-progress');
  exp+=amount;
  while(level<999&&exp>=level*100){
   exp-=level*100;level++;coins+=30;levelUps++;
  }
  if(!validWallet(coins)||!validExp(exp))throw fail('wallet-cap');
  return {currency:coins,exp,level,levelUps};
 }
 function questBase(data,day){
  const rows=questsEngine.ensure(core.ensureQuests(data.quests||[]));
  const daily=core.rolloverQuests(rows,data.questsDayV43,day);
  if(!daily.ok||data.questsDayV43&&data.questsDayV43>day)
   throw fail('clock-backwards');
  const weekly=questsEngine.rotate(daily.quests,data.questV437,
   {day,previousDay:data.questsDayV43});
  if(!weekly.ok)throw fail('invalid-quests');
  return {quests:weekly.quests,questV437:weekly.state,questsDayV43:daily.day};
 }
 function increment(rows,id){return core.applyQuestProgress(rows,id);}
 function progressForEvent(state,type,eventId,day){
  const result=questsEngine.progress(state.quests,state.questV437,{type,eventId,day});
  if(!result)throw fail('invalid-quest-event');
  return {...state,quests:result.quests,questV437:result.state};
 }
 function seedRandom(seed){
  let value=encounter.hash(seed)>>>0;
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;
   return value/4294967296;};
 }
 function resultFrom(doc,status,details={}){
  return {status,currency:doc.currency,balance:doc.currency,exp:doc.exp,level:doc.level,
   inventory:doc.inventory,quests:doc.quests,questV437:doc.questV437,
   questsDayV43:doc.questsDayV43,readRewards:doc.readRewards,
   dailyReadLog:doc.dailyReadLog,lootedChapters:doc.lootedChapters,
   storyStates:doc.storyStates,...details};
 }
 function bookEvent({data,storyId,chapterId,day}){
  const readKey=storyId+'_'+chapterId;
  const oldRewards=data.readRewards&&typeof data.readRewards==='object'?
   data.readRewards:{};
  const oldLog=data.dailyReadLog&&typeof data.dailyReadLog==='object'?
   data.dailyReadLog:{day:'',chapters:[]};
  if(typeof oldLog.day==='string'&&oldLog.day>day)throw fail('clock-backwards');
  const firstEver=oldRewards[readKey]!==true;
  const sameDay=oldLog.day===day&&Array.isArray(oldLog.chapters);
  const dailyList=sameDay?oldLog.chapters:[];
  const firstToday=!dailyList.includes(readKey);
  if(!firstEver&&!firstToday)return resultFrom(data,'already-read');
  let q=questBase(data,day);
  const earned=firstEver?expPlan(data,5):expPlan(data,0);
  if(firstEver&&storyId==='truyen-dien-vl'&&chapterId==='ch-1')
   q.quests=increment(q.quests,'q_main_intro');
  if(firstToday){
   q.quests=increment(q.quests,'q_daily_read');
   const eventId=readKey.length<=96?readKey:readKey.slice(0,72)+'-'+
    encounter.hash(readKey);
   q=progressForEvent(q,'READ_CHAPTER',eventId,day);
  }
  const next={...data,...earned,...q,
   readRewards:firstEver?{...oldRewards,[readKey]:true}:oldRewards,
   dailyReadLog:{day,chapters:firstToday?[...dailyList,readKey]:dailyList}};
  return resultFrom(next,'applied',{firstEver,firstToday,awardExp:firstEver?5:0,
   levelUps:earned.levelUps});
 }
 function questClaim({data,questId,day,at=Date.now()}){
  const definition=KNOWN.get(questId);
  if(!definition)throw fail('unknown-quest');
  const q=questBase(data,day),row=q.quests.find(item=>item?.id===questId);
  if(!row)throw fail('unknown-quest');
  const normalized=q.quests.map(item=>item?.id===questId?
   {...item,target:definition.target,type:definition.type,
    rewardCoin:definition.rewardCoin,rewardExp:definition.rewardExp}:item);
  const plan=questsEngine.reward({quests:normalized,questState:q.questV437,
   id:questId,coins:data.currency,exp:data.exp,level:data.level,
   inventory:data.inventory||[],day});
  if(!plan.ok)throw fail(plan.reason);
  const next={...data,...q,quests:plan.quests,questV437:plan.state,
   currency:plan.coins,exp:plan.exp,level:plan.level,inventory:plan.inventory};
  if(plan.award.itemId){
   const gained=plan.inventory.find(x=>x?.obtainedFrom?.source==='DUDU_QUEST'&&
    x?.obtainedFrom?.eventId?.startsWith('quest-'+questId+'-'));
   const event=collection.append(data.storyStates?.[collection.META],{
    eventId:gained?.instanceId,kind:'QUEST',item:gained,at,
    instanceId:gained?.instanceId,inventory:data.inventory});
   if(!event.ok)throw fail('collection-write-failed');
   next.storyStates={...(data.storyStates||{}),[collection.META]:event.state};
  }
  return resultFrom(next,'applied',{award:plan.award,levelUps:plan.levelUps});
 }
 function lootEvent({data,uid,kind,requestId,storyId,chapterId,
  paragraphCount,realmTag,day,at}){
  const chapter=kind==='chapter-loot',key=chapter?
   encounter.lootKey(storyId,chapterId):null;
  const claims=data.lootedChapters&&typeof data.lootedChapters==='object'?
   data.lootedChapters:{};
  const states=data.storyStates&&typeof data.storyStates==='object'?
   data.storyStates:{};
  const meta=states[META]&&typeof states[META]==='object'?states[META]:{};
  const receipts=meta.globalReceipts&&typeof meta.globalReceipts==='object'?
   meta.globalReceipts:{};
  if(chapter&&encounter.attempted(claims[key]))return resultFrom(data,'already-looted');
  if(!chapter&&Object.hasOwn(receipts,requestId))
   return resultFrom(data,'already-looted',{receipt:receipts[requestId],
    lastGlobalLootAt:meta.lastGlobalLootAt});
  if(!Array.isArray(data.inventory)||data.inventory.length>=MAX_ITEMS)
   throw fail('inventory-full');
  if(chapter){
   if(!encounter.encounter({accountId:uid,storyId,chapterId,
    paragraphCount,claim:claims[key]}).visible)throw fail('no-encounter');
  }else if(Number.isSafeInteger(meta.lastGlobalLootAt)&&
     at-meta.lastGlobalLootAt<cadence.PHONE_COOLDOWN_MS)
   throw fail('cooldown');
  const passed=!chapter||encounter.hash('success:'+uid+'\0'+storyId+'\0'+chapterId)%100<
   encounter.SUCCESS_PERCENT;
  const newClaims=chapter?{...claims,[key]:passed?
   cadence.nextClaimValue(at):encounter.missMarker(at)}:claims;
  if(!passed){
   const next={...data,lootedChapters:newClaims};
   return resultFrom(next,'miss',{lootKey:key});
  }
  const rng=seedRandom(chapter?'chapter:'+uid+':'+key:'global:'+uid+':'+requestId);
  const seen=data.inventory.map(item=>item?.id).filter(Boolean);
  const drop=lootRules.pick({realmTag:chapter?realmTag:null,seenIds:seen,random:rng});
  const reward=drop&&lootRules.rewardFor(drop.rank,rng);
  if(!drop||!reward)throw fail('no-drop');
  const instanceId='loot-'+(chapter?encounter.hash('item:'+uid+':'+key):requestId);
  if(data.inventory.some(item=>item?.instanceId===instanceId))
   throw fail('duplicate-item');
  const item={...drop.item,instanceId,obtainedFrom:chapter?
   {kind:'CHAPTER',storyId,chapterId}:{kind:'GLOBAL'}};
  const earned=expPlan({...data,currency:data.currency+reward.coins},reward.exp);
  let q=questBase(data,day);
  q.quests=increment(q.quests,'q_daily_loot');
  q=progressForEvent(q,'LOOT_SUCCESS',instanceId,day);
  const record={itemId:item.id,instanceId,coins:reward.coins,exp:reward.exp,at};
  const keys=[...Object.keys(receipts),requestId];
  const trimmed={...receipts,[requestId]:record};
  for(const old of keys.slice(0,Math.max(0,keys.length-MAX_RECEIPTS)))delete trimmed[old];
  const nextStates=chapter?{...states}:{...states,[META]:{
   ...meta,lastGlobalLootAt:at,globalReceipts:trimmed}};
  const entry=collection.append(states[collection.META],{
   eventId:chapter?'chapter-'+instanceId:requestId,
   kind:chapter?'CHAPTER':'GLOBAL',item,at,
   instanceId,inventory:data.inventory});
  if(!entry.ok)throw fail('collection-write-failed');
  nextStates[collection.META]=entry.state;
  const next={...data,...earned,...q,inventory:[item,...data.inventory],
   lootedChapters:newClaims,storyStates:nextStates};
  return resultFrom(next,'applied',{receipt:record,item,award:{...reward},
   levelUps:earned.levelUps,lastGlobalLootAt:chapter?null:at});
 }
 async function run({db,auth,uid,kind,storyId,chapterId,paragraphCount=0,
  realmTag=null,questId,requestId,now=()=>Date.now()}={}){
  if(!db?.runTransaction||!db?.collection||!auth?.currentUser||
   auth.currentUser.uid!==uid||!validId(uid)||
   !['read','quest','chapter-loot','global-loot'].includes(kind))
   throw fail('invalid-account');
  if((kind==='read'||kind==='chapter-loot')&&(!validId(storyId)||!validId(chapterId)))
   throw fail('invalid-chapter');
  if(kind==='chapter-loot'&&(!Number.isSafeInteger(paragraphCount)||
    paragraphCount<1||paragraphCount>100000))throw fail('invalid-chapter');
  if(kind==='quest'&&!KNOWN.has(questId))throw fail('unknown-quest');
  if(kind==='global-loot'&&(!validId(requestId)||
    !/^global-[0-9a-f-]{36}$/.test(requestId)))throw fail('invalid-receipt');
  const at=now(),day=new Date(at).toISOString().slice(0,10);
  if(!Number.isSafeInteger(at)||at<=0||!validDay(day))throw fail('invalid-time');
  const owner=auth.currentUser,doc=db.collection('profiles_v2').doc(uid);
  const outcome=await db.runTransaction(async tx=>{
   const snap=await tx.get(doc);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data();
   if(!validWallet(data.currency)||!validExp(data.exp)||!validLevel(data.level))
    throw fail('invalid-progress');
   let result;
   if(kind==='read')result=bookEvent({data,storyId,chapterId,day});
   else if(kind==='quest')result=questClaim({data,questId,day,at});
   else result=lootEvent({data,uid,kind,storyId,chapterId,
    paragraphCount,realmTag,requestId,day,at});
   if(result.status==='already-read'||result.status==='already-looted')return result;
   const patch={};
   const relevant=kind==='read'?['currency','exp','level','readRewards',
    'dailyReadLog','quests','questV437','questsDayV43']:
    kind==='quest'?['currency','exp','level','inventory','quests',
     'questV437','questsDayV43','storyStates']:
    ['currency','exp','level','inventory','lootedChapters','storyStates',
     'quests','questV437','questsDayV43'];
   for(const field of relevant)if(result[field]!==undefined&&
     (field!=='storyStates'||result[field]!==data.storyStates))patch[field]=result[field];
   tx.update(doc,patch);
   return result;
  });
  if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return Object.freeze(outcome);
 }
 return Object.freeze({run,META,LEGACY,KNOWN,expPlan,bookEvent,questClaim,lootEvent});
});
