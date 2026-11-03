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
 const META='__duduVantVatF31',MAX_IDS=100,MAX_HISTORY=60;
 const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
 const fail=reason=>Object.assign(new Error(reason),{reason});
 function norm(raw){
  const ids=[...new Set((Array.isArray(raw?.ids)?raw.ids:[]).filter(validId))].slice(-MAX_IDS);
  const history=(Array.isArray(raw?.history)?raw.history:[]).filter(row=>
   validId(row?.id)&&rule.POOL.some(p=>p.itemId===row.itemId)).slice(-MAX_HISTORY);
  const a=raw?.active;
  const active=a&&validId(a.id)&&rule.POOL.some(p=>p.itemId===a.itemId)&&
   ['sealed','claimed'].includes(a.status)?
   {id:a.id,itemId:a.itemId,status:a.status}:null;
  return {version:1,ids,history,active};
 }
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
    if(inventory.length>=500&&rule.draw(roll).rank!=='COIN')throw fail('inventory-full');
    const prize=rule.draw(roll),next={...s,
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
    const next={...s,active:{...active,status:'claimed'},
     history:[...s.history,{id,itemId:active.itemId}].slice(-MAX_HISTORY)};
    const nextStates={...states,[META]:next};
    tx.update(ref,{currency:currency+prize.amount,storyStates:nextStates});
    return {status:'applied',kind,currency:currency+prize.amount,inventory,
     state:next,storyStates:nextStates,reward:{kind:'COIN',amount:prize.amount}};
   }
   if(inventory.length>=500)throw fail('inventory-full');
   const approved=catalog.byId(active.itemId);
   if(!approved||approved.collectionSet!=='VAN_VAT')throw fail('invalid-prize');
   const instanceId='fun-vantvat-'+id;
   if(inventory.some(x=>x.instanceId===instanceId))throw fail('duplicate-instance');
   const item={...approved,instanceId,obtainedFrom:{kind:'EVENT',source:'DUDU_FUN_VANTUONG',eventId:id}};
   const journal=collection.append(states[collection.META],{eventId:instanceId,
    kind:'FUN',item,at,instanceId,inventory});
   if(!journal.ok)throw fail('journal-failed');
   const next={...s,active:{...active,status:'claimed'},
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
 return Object.freeze({META,norm,load,run});
});
