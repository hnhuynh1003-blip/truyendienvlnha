/* C4.5 — account-backed daily companion check-in: records only quest progress.
 * The companion diary and its friendship badges remain device-local.
 */
(function(root,factory){
 'use strict';
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./personal-quest-events-c45.js'):
  root?.DuduPersonalQuestEventsC45);
 if(node)module.exports=api;
 if(root)root.DuduPersonalCompanionCheckinC45=api;
})(typeof window!=='undefined'?window:null,function(events){
 'use strict';
 const META='__duduCompanionCheckinC45';
 const fail=reason=>Object.assign(new Error(reason),{reason});
 async function run({db,auth,uid,now=()=>Date.now()}={}){
  if(!db?.runTransaction||!db?.collection||!uid||auth?.currentUser?.uid!==uid)
   throw fail('invalid-account');
  const owner=auth.currentUser,at=now();
  if(!Number.isSafeInteger(at)||at<=0)throw fail('invalid-time');
  const day=new Date(at).toISOString().slice(0,10),ref=db.collection('profiles_v2').doc(uid);
  const outcome=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),states=data.storyStates&&typeof data.storyStates==='object'?
    data.storyStates:{};
   if(states[META]?.day===day)return {status:'already-applied',day};
   if(states[META]?.day>day)throw fail('clock-backwards');
   const quest=events.record({...data,storyStates:{...states,[META]:{day}}},
    {type:'DUDU_CHECKIN',eventId:'dudu-'+day,day});
   if(!quest.applied)throw fail('duplicate-checkin');
   tx.update(ref,quest.patch);
   return {status:'applied',day,...quest.patch};
  });
  if(auth.currentUser!==owner||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return outcome;
 }
 return Object.freeze({META,run});
});
