/* DUDU Cyber Phone — real per-UID NPC favorites and daily check-ins.
 * Uses the existing owner-writable profiles_v2 document on Firestore Spark.
 * Never writes Xu, inventory, EXP, quests, authored NPCs or AI transcripts.
 * These personal progress fields are NOT proof of server-authorized milestones.
 */
(function(root,factory){
 'use strict';
 const api=factory(
  root?.DuduNpcRelationshipV2||(typeof require==='function'?require('./npc-relationship-v2-r1.js'):null),
  root?.DuduNpcTrustR5||(typeof require==='function'?require('./npc-trust-v2-r5.js'):null),
  root?.DuduNpcBondV43||(typeof require==='function'?require('./npc-bond-v43.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalNpcSocialV1=api;
})(typeof window!=='undefined'?window:null,function(relationRules,trustRules,bondRules){
 'use strict';
 const fail=reason=>Object.assign(new Error(reason),{code:reason});
 const actions=Object.freeze(['favorite','checkin']);
 const isRecord=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 async function run({db,auth,uid,storyId,npcId,action,choiceId='thoughtful',
  now=Date.now(),eventId}={}){
  if(!actions.includes(action)||!relationRules?.validScope(uid,storyId,npcId)||
     auth?.currentUser?.uid!==uid||!db?.collection||!db?.runTransaction)
   throw fail('invalid-session');
  if(action==='checkin'&&(!Number.isFinite(now)||now<0||
      !['thoughtful','casual'].includes(choiceId)||typeof eventId!=='string'||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(eventId)))
   throw fail('invalid-request');
  const session=auth.currentUser,ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==session||auth.currentUser?.uid!==uid)
    throw fail('account-changed');
   const data=snap.data(),states=isRecord(data.storyStates)?data.storyStates:{};
   const story=states[storyId];
   const contacts=isRecord(story?.collectedCharacters)?story.collectedCharacters:{};
   const npc=contacts[npcId];
   if(!isRecord(npc))throw fail('npc-not-unlocked');
   if(action==='favorite'){
    const selected=bondRules.favoriteChoice(story.favoriteNpcV43,npcId,Object.keys(contacts));
    if(!selected.ok)throw fail('favorite-unavailable');
    // Narrow nested merge: preserves every other NPC, story and wallet field.
    tx.set(ref,{storyStates:{[storyId]:{favoriteNpcV43:selected.selected}}},{merge:true});
    return {action,storyId,npcId,favoriteNpcV43:selected.selected};
   }
   const view=relationRules.previewRelationship(npc,uid,storyId,npcId);
   if(!view)throw fail('relationship-invalid');
   const plan=trustRules.evaluateCheckin({uid,storyId,npcId,unlocked:true,
    relationship:view,now,eventId,choiceId});
   let relationship,trustGain=0;
   if(plan.ok){
    relationship=trustRules.applyCheckin(view,plan);
    if(!relationship)throw fail('already-checked-in');
    trustGain=plan.gain;
   }else if(plan.reason==='max-trust'&&view.relationshipV2.lastCheckinUtc!==
      new Date(now).toISOString().slice(0,10)){
    relationship={...view.relationshipV2,lastCheckinUtc:new Date(now).toISOString().slice(0,10)};
   }else throw fail(plan.reason==='daily-limit'?'already-checked-in':plan.reason);
   const bond=bondRules.record(npc.npcBondV43,{type:'checkin',
    day:new Date(now).toISOString().slice(0,10)});
   const updated={relationshipV2:relationship};
   if(bond.ok)updated.npcBondV43=bond.state;
   tx.set(ref,{storyStates:{[storyId]:{collectedCharacters:{[npcId]:updated}}}},{merge:true});
   return {action,storyId,npcId,relationshipV2:relationship,
    npcBondV43:bond.ok?bond.state:undefined,trustGain};
  });
  if(auth.currentUser!==session||auth.currentUser?.uid!==uid)
   throw fail('account-changed');
  return Object.freeze(result);
 }
 return Object.freeze({run});
});
