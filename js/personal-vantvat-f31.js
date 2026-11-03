/* F3.1 Vạn Tượng: atomic UID-scoped spin / claim with one immutable prize. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./fun-vantvat-f31.js'):root?.DuduFunVantVatF31,
  typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog,
  typeof module==='object'&&module.exports?
  require('./personal-collection-c24.js'):root?.DuduPersonalCollectionC24);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalVantVatF31=api;
})(typeof window!=='undefined'?window:null,function(rule,catalog,collection){
 'use strict';
 const META='__duduVantVatF31',MAX_IDS=100,MAX_HISTORY=60,MAX_BATCH_RECEIPTS=24;
 const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
 const fail=reason=>Object.assign(new Error(reason),{reason});
 function norm(raw){
  const ids=[...new Set((Array.isArray(raw?.ids)?raw.ids:[]).filter(validId))].slice(-MAX_IDS);
  const history=(Array.isArray(raw?.history)?raw.history:[]).filter(row=>
   validId(row?.id)&&rule.POOL.some(p=>p.itemId===row.itemId)).slice(-MAX_HISTORY);
  const a=raw?.active;
  const active=a&&validId(a.id)&&rule.POOL.some(p=>p.itemId===a.itemId)&&
   ['sealed','claimed'].includes(a.status)?
   {id:a.id,itemId:a.itemId,status:a.status,
    duplicate:a.status==='claimed'&&a.duplicate===true,
    returned:Number.isSafeInteger(a.returned)&&a.returned>=0?a.returned:0}:null;
  const permitted=new Set(catalog.funVantVat.map(item=>item.id));
  const album=[...new Set([...(Array.isArray(raw?.album)?raw.album:[]),
   ...history.map(row=>row.itemId),
   ...(active?.status==='claimed'?[active.itemId]:[])]
   .filter(id=>permitted.has(id)))];
  const receipts={};
  const source=raw?.batchReceipts&&typeof raw.batchReceipts==='object'&&
   !Array.isArray(raw.batchReceipts)?raw.batchReceipts:{};
  for(const [id,entry] of Object.entries(source).slice(-MAX_BATCH_RECEIPTS)){
   if(validId(id)&&[1,5,10].includes(entry?.count)&&
    Array.isArray(entry.results)&&entry.results.length===entry.count&&
    Array.isArray(entry.spinIds)&&entry.spinIds.length===entry.count&&
    Array.isArray(entry.rolls)&&entry.rolls.length===entry.count&&
    Array.isArray(entry.guaranteeRolls)&&entry.guaranteeRolls.length===entry.count)
    receipts[id]=entry;
  }
  const pity=Number.isSafeInteger(raw?.pity)&&raw.pity>=0&&raw.pity<=99?raw.pity:0;
  const totalSpins=Number.isSafeInteger(raw?.totalSpins)&&raw.totalSpins>=0?
   Math.min(raw.totalSpins,100000000):0;
  return {version:1,ids,history,album,active,pity,totalSpins,batchReceipts:receipts};
 }
 const nextPity=(pity,prize)=>rule.HIGH_RANKS.includes(prize?.rank)?0:
  Math.min(99,pity+1);
 function session(db,auth,uid){
  if(!uid||auth?.currentUser?.uid!==uid||!db?.collection||!db?.runTransaction)
   throw fail('invalid-account');
  return auth.currentUser;
 }
 async function load({db,auth,uid}={}){
  const user=session(db,auth,uid),snap=await db.collection('profiles_v2').doc(uid).get();
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  if(!snap.exists)throw fail('profile-missing');
  return {state:norm(snap.data()?.storyStates?.[META]),currency:snap.data()?.currency};
 }
 async function run({db,auth,uid,kind,id,roll,now=()=>Date.now()}={}){
  const user=session(db,auth,uid);
  if(!validId(id)||!['start','claim'].includes(kind)||
   (kind==='start'&&!rule.draw(roll)))throw fail('invalid-spin');
  const at=now(),ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),currency=data.currency,inventory=data.inventory,
    states=data.storyStates&&typeof data.storyStates==='object'&&!Array.isArray(data.storyStates)?data.storyStates:{},
    s=norm(states[META]);
   if(!Number.isSafeInteger(currency)||currency<0||currency>rule.MAX_WALLET||
    !Array.isArray(inventory)||inventory.length>500)throw fail('invalid-profile');
   if(kind==='start'){
    if(s.ids.includes(id))return {status:'already-applied',kind,currency,inventory,state:s,storyStates:states};
    if(s.active?.status==='sealed')throw fail('unfinished-spin');
    if(currency<rule.PRICE)throw fail('not-enough-xu');
    const prize=rule.draw(roll);
    if(inventory.length>=500&&prize.rank!=='COIN'&&
     !inventory.some(item=>item.id===prize.itemId))throw fail('inventory-full');
    const next={...s,
     ids:[...s.ids,id].slice(-MAX_IDS),active:{id,itemId:prize.itemId,status:'sealed'}};
    const nextStates={...states,[META]:next};
    tx.update(ref,{currency:currency-rule.PRICE,storyStates:nextStates});
    return {status:'applied',kind,currency:currency-rule.PRICE,inventory,
     state:next,storyStates:nextStates};
   }
   const active=s.active;
   if(!active||active.id!==id){
    if(s.history.some(h=>h.id===id))return {status:'already-applied',kind,currency,inventory,state:s,storyStates:states};
    throw fail('spin-not-found');
   }
   if(active.status==='claimed')return {status:'already-applied',kind,currency,inventory,state:s,storyStates:states};
   const prize=rule.POOL.find(p=>p.itemId===active.itemId);
   if(prize?.rank==='COIN'){
    if(currency>rule.MAX_WALLET-prize.amount)throw fail('wallet-cap');
    const next={...s,pity:nextPity(s.pity,prize),totalSpins:Math.min(100000000,s.totalSpins+1),
     active:{...active,status:'claimed'},
     history:[...s.history,{id,itemId:active.itemId}].slice(-MAX_HISTORY)};
    const nextStates={...states,[META]:next};
    tx.update(ref,{currency:currency+prize.amount,storyStates:nextStates});
    return {status:'applied',kind,currency:currency+prize.amount,inventory,
     state:next,storyStates:nextStates,reward:{kind:'COIN',amount:prize.amount}};
   }
   const approved=catalog.byId(active.itemId);
   if(!approved||approved.collectionSet!=='VAN_VAT')throw fail('invalid-prize');
   if(inventory.some(x=>x.id===approved.id)){
    const returned=rule.VALUES[approved.rank];
    if(!returned||currency>rule.MAX_WALLET-returned)throw fail('wallet-cap');
    const next={...s,pity:nextPity(s.pity,prize),totalSpins:Math.min(100000000,s.totalSpins+1),
     album:[...new Set([...s.album,active.itemId])],
     active:{...active,status:'claimed',duplicate:true,returned},
     history:[...s.history,{id,itemId:active.itemId,duplicate:true,returned}].slice(-MAX_HISTORY)};
    const nextStates={...states,[META]:next};
    tx.update(ref,{currency:currency+returned,storyStates:nextStates});
    return {status:'applied',kind,currency:currency+returned,inventory,
     state:next,storyStates:nextStates,
     reward:{kind:'DUPLICATE',amount:returned,itemId:active.itemId}};
   }
   if(inventory.length>=500)throw fail('inventory-full');
   const instanceId='fun-vantvat-'+id;
   if(inventory.some(x=>x.instanceId===instanceId))throw fail('duplicate-instance');
   const item={...approved,instanceId,obtainedFrom:{kind:'EVENT',source:'DUDU_FUN_VANTUONG',eventId:id}};
   const journal=collection.append(states[collection.META],{eventId:instanceId,
    kind:'FUN',item,at,instanceId,inventory});
   if(!journal.ok)throw fail('journal-failed');
   const next={...s,pity:nextPity(s.pity,prize),totalSpins:Math.min(100000000,s.totalSpins+1),
    album:[...new Set([...s.album,approved.id])],
    active:{...active,status:'claimed'},
    history:[...s.history,{id,itemId:approved.id}].slice(-MAX_HISTORY)};
   const nextStates={...states,[META]:next,[collection.META]:journal.state};
   const nextInventory=[item,...inventory];
   tx.update(ref,{inventory:nextInventory,storyStates:nextStates});
   return {status:'applied',kind,currency,inventory:nextInventory,
    state:next,storyStates:nextStates,reward:item};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return Object.freeze(result);
 }
 // F3.6 · one atomic batch for 1/5/10 spins. A single UUID is a durable
 // receipt; each item gets its own UUID so the physical Kho remains auditable.
 async function runBatch({db,auth,uid,id,count,rolls,guaranteeRolls,spinIds,
  now=()=>Date.now()}={}){
  const user=session(db,auth,uid);
  if(!validId(id)||![1,5,10].includes(count)||
   ![rolls,guaranteeRolls,spinIds].every(a=>Array.isArray(a)&&a.length===count)||
   !rolls.every(x=>!!rule.draw(x))||
   !guaranteeRolls.every(x=>Number.isSafeInteger(x)&&x>=0&&x<rule.RARE_TOTAL)||
   !spinIds.every(validId)||new Set(spinIds).size!==count||spinIds.includes(id))
   throw fail('invalid-batch');
  const at=now(),ref=db.collection('profiles_v2').doc(uid);
  if(!Number.isSafeInteger(at)||at<=0)throw fail('invalid-time');
  const cost=count*rule.PRICE;
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),currency=data.currency,inventory=data.inventory,
    states=data.storyStates&&typeof data.storyStates==='object'&&
     !Array.isArray(data.storyStates)?data.storyStates:{},s=norm(states[META]);
   if(!Number.isSafeInteger(currency)||currency<0||currency>rule.MAX_WALLET||
    !Array.isArray(inventory)||inventory.length>500)throw fail('invalid-profile');
   const prior=s.batchReceipts[id];
   if(prior){
    if(prior.count!==count||
     !['rolls','guaranteeRolls','spinIds'].every(key=>
       prior[key].every((value,i)=>value===({rolls,guaranteeRolls,spinIds})[key][i])))
     throw fail('batch-id-reused');
    return {status:'already-applied',currency,inventory,state:s,storyStates:states,
     results:prior.results,cost:prior.cost};
   }
   if(s.active?.status==='sealed')throw fail('unfinished-spin');
   if(currency<cost)throw fail('not-enough-xu');
   let balance=currency-cost,pity=s.pity,journal=states[collection.META];
   const owned=[...inventory],album=new Set(s.album),results=[];
   for(let i=0;i<count;i++){
    const randomPrize=rule.draw(rolls[i]);
    const guaranteed=pity===99&&!rule.HIGH_RANKS.includes(randomPrize.rank);
    const prize=guaranteed?rule.guaranteed(guaranteeRolls[i],owned.map(x=>x.id)):
     randomPrize;
    if(!prize)throw fail('invalid-prize');
    pity=nextPity(pity,prize);
    if(prize.rank==='COIN'){
     if(balance>rule.MAX_WALLET-prize.amount)throw fail('wallet-cap');
     balance+=prize.amount;
     results.push({kind:'COIN',itemId:prize.itemId,rank:'COIN',amount:prize.amount,
      pityTriggered:false,spinId:spinIds[i]});
     continue;
    }
    const approved=catalog.byId(prize.itemId);
    if(!approved||approved.collectionSet!=='VAN_VAT')throw fail('invalid-prize');
    album.add(approved.id);
    if(owned.some(item=>item.id===approved.id)){
     const returned=rule.VALUES[approved.rank];
     if(!returned||balance>rule.MAX_WALLET-returned)throw fail('wallet-cap');
     balance+=returned;
     results.push({kind:'DUPLICATE',itemId:approved.id,rank:approved.rank,
      amount:returned,pityTriggered:guaranteed,spinId:spinIds[i]});
     continue;
    }
    if(owned.length>=500)throw fail('inventory-full');
    const instanceId='fun-vantvat-'+spinIds[i];
    if(owned.some(x=>x.instanceId===instanceId))throw fail('duplicate-instance');
    const item={...approved,instanceId,obtainedFrom:{kind:'EVENT',
     source:'DUDU_FUN_VANTUONG',eventId:spinIds[i]}};
    const row=collection.append(journal,{eventId:instanceId,kind:'FUN',item,at,
     instanceId,inventory:owned});
    if(!row.ok)throw fail('journal-failed');
    journal=row.state;owned.unshift(item);
    results.push({kind:'ITEM',itemId:item.id,rank:item.rank,amount:0,
     pityTriggered:guaranteed,spinId:spinIds[i]});
   }
   const entry={count,cost,rolls:[...rolls],guaranteeRolls:[...guaranteeRolls],
    spinIds:[...spinIds],results,at};
   const receipts={...s.batchReceipts,[id]:entry};
   for(const old of Object.keys(receipts).slice(0,
    Math.max(0,Object.keys(receipts).length-MAX_BATCH_RECEIPTS)))delete receipts[old];
   const next={...s,album:[...album],pity,
    totalSpins:Math.min(100000000,s.totalSpins+count),batchReceipts:receipts};
   const nextStates={...states,[META]:next};
   if(journal!==undefined)nextStates[collection.META]=journal;
   tx.update(ref,{currency:balance,inventory:owned,storyStates:nextStates});
   return {status:'applied',currency:balance,inventory:owned,state:next,
    storyStates:nextStates,results,cost};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return Object.freeze(result);
 }
 return Object.freeze({META,norm,load,run,runBatch});
});
