/* DUDU personal NPC gifts and virtual-Xu red envelopes on Firestore Spark.
 * One UID, one profile transaction. No payment, other-user transfer or reward.
 * Firestore Rules still need a separately reviewed/deployed production policy.
 */
(function(root,factory){
 'use strict';
 const api=factory(
  root?.DuduNpcRelationshipV2||(typeof require==='function'?require('./npc-relationship-v2-r1.js'):null),
  root?.DuduNpcGiftR2||(typeof require==='function'?require('./npc-gift-v2-r2.js'):null),
  root?.DuduNpcPersonaR6||(typeof require==='function'?require('./npc-persona-v2-r6.js'):null),
  root?.DuduInventoryTradeV439||(typeof require==='function'?require('./inventory-trade-v43-9.js'):null),
  root?.DuduNpcBondV43||(typeof require==='function'?require('./npc-bond-v43.js'):null),
  root?.DuduRedPacketV32||(typeof require==='function'?require('./red-packet-v32.js'):null),
  root?.DuduPersonalCollectionC24||(typeof require==='function'?require('./personal-collection-c24.js'):null),
  root?.DuduPersonalQuestEventsC45||(typeof require==='function'?require('./personal-quest-events-c45.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalNpcExchangeV1=api;
})(typeof window!=='undefined'?window:null,function(relation,gifts,personas,trade,bonds,packets,collection,questEvents){
 'use strict';
 const isRecord=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const idPattern=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/;
 const requestPattern=/^(gift|rp)-[0-9a-f-]{36}$/;
 const fail=reason=>Object.assign(new Error(reason),{code:reason});
 function requestId(kind,cryptoApi=typeof crypto!=='undefined'?crypto:null){
  if(!['gift','rp'].includes(kind)||typeof cryptoApi?.randomUUID!=='function')
   throw fail('request-id-unavailable');
  return kind+'-'+cryptoApi.randomUUID();
 }
 function safeInventory(inventory){return Array.isArray(inventory)&&inventory.length<=500;}
 async function run({db,auth,uid,storyId,npcId,npc,kind,eventId,instanceId,
  amount,note='',now=Date.now()}={}){
  if(!['gift','rp'].includes(kind)||!relation?.validScope(uid,storyId,npcId)||
   !requestPattern.test(eventId||'')||!eventId.startsWith(kind+'-')||
   !db?.collection||!db?.runTransaction||auth?.currentUser?.uid!==uid||
   !Number.isSafeInteger(now)||now<=0||!isRecord(npc)||npc.id!==npcId||
   !idPattern.test(npc.id))throw fail('invalid-session');
  if(kind==='gift'&&(!idPattern.test(instanceId||'')||!gifts||!trade||!personas))
   throw fail('invalid-gift');
  if(kind==='rp'&&(!packets||!packets.DENOMINATIONS.includes(amount)||
   typeof note!=='string'))throw fail('invalid-envelope');
  const session=auth.currentUser,ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==session||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),states=isRecord(data.storyStates)?data.storyStates:{};
   const story=states[storyId],contacts=isRecord(story?.collectedCharacters)?story.collectedCharacters:{};
   const progress=contacts[npcId];
   if(!isRecord(progress))throw fail('npc-not-unlocked');
   if(kind==='gift'){
    const inventory=data.inventory;
    if(!safeInventory(inventory))throw fail('inventory-invalid');
    const previous=relation.previewRelationship(progress,uid,storyId,npcId);
    if(!previous)throw fail('relationship-invalid');
    if(previous.relationshipV2.acceptedGiftEventIds.includes(eventId))
     return {status:'already-applied',kind,storyId,npcId,inventory,progress,
      collectionState:states[collection.META]};
    const owned=inventory.filter(x=>x?.instanceId===instanceId);
    if(owned.length!==1)throw fail('item-not-owned');
    const item=owned[0],canonical=trade.known(item);
    if(!canonical||canonical.giftable!==true)throw fail('item-not-giftable');
    const persona=personas.previewNpc(npc);
    if(!persona)throw fail('npc-preferences-invalid');
    const plan=gifts.evaluateGift({npc:persona,item:canonical,
     relationship:{...previous,unlocked:true},now,instanceId,giftEventId:eventId});
    if(plan.status!=='ACCEPT')throw fail('gift-'+(plan.reason||'refused'));
    const relationshipV2={...previous.relationshipV2,lastGiftAt:plan.lastGiftAt,
     giftDayUtc:plan.day,acceptedGiftCountUtc:plan.nextCount,
     acceptedInstanceIds:[...previous.relationshipV2.acceptedInstanceIds,instanceId].slice(-100),
     acceptedGiftEventIds:[...previous.relationshipV2.acceptedGiftEventIds,eventId].slice(-100),
     trust:Math.min(100,previous.relationshipV2.trust+plan.delta.trust)};
    const updated={affinity:Math.min(100,previous.affinity+plan.delta.affinity),relationshipV2};
    const bond=bonds?.record(progress.npcBondV43,{type:'gift',day:plan.day});
    if(bond?.ok)updated.npcBondV43=bond.state;
    const nextInventory=inventory.filter(x=>x!==item);
    const journal=collection.append(states[collection.META],{
     eventId,kind:'NPC_GIFT',item,at:now,
     instanceId,inventory});
    if(!journal.ok)throw fail('collection-write-failed');
    const quest=questEvents.record(data,{type:'NPC_GIFT',eventId,
     day:new Date(now).toISOString().slice(0,10)});
    const {storyStates:questStates,...questFields}=quest.patch;
    // Merge only the target NPC and inventory. Never overwrite other story
    // branches, balances, quests or the authored catalog.
    tx.set(ref,{inventory:nextInventory,...questFields,storyStates:{[storyId]:{
     collectedCharacters:{[npcId]:updated}},
     [collection.META]:journal.state,
     [questEvents.META]:questStates[questEvents.META]}},{merge:true});
    return {status:'applied',kind,storyId,npcId,inventory:nextInventory,
     progress:{...progress,...updated},itemName:canonical.name,itemRank:canonical.rank,
     affinityGain:plan.delta.affinity,trustGain:plan.delta.trust,
     collectionState:journal.state,...questFields};
   }
   const balance=data.currency,record=story.redPacketsV32?.[npcId];
   if(!Number.isSafeInteger(balance)||balance<0||balance>1000000000)
    throw fail('wallet-invalid');
   if(packets.normalizeRecord(record).events.some(x=>x.id===eventId))
    return {status:'already-applied',kind,storyId,npcId,
     balance,redPacket:packets.normalizeRecord(record)};
   const plan=packets.evaluate({amount,balance,record,unlocked:true,now});
   if(!plan.ok)throw fail('envelope-'+plan.reason);
   const next=packets.nextRecord(record,plan,{id:eventId,at:now,note});
   if(!next)throw fail('invalid-envelope');
   tx.set(ref,{currency:plan.balanceAfter,
    storyStates:{[storyId]:{redPacketsV32:{[npcId]:next}}}},{merge:true});
   return {status:'applied',kind,storyId,npcId,
    balance:plan.balanceAfter,redPacket:next,amount};
  });
  if(auth.currentUser!==session||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return Object.freeze(result);
 }
 return Object.freeze({requestId,run});
});
