/* F3.3 · owner-only collectible favorites. No currency or inventory mint. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./fun-vantvat-f31.js'):root?.DuduFunVantVatF31);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalVantVatF33=api;
})(typeof window!=='undefined'?window:null,function(rule){
 'use strict';
 const META='__duduVantVatF33',MAX_LOCKS=100;
 const idOk=id=>typeof id==='string'&&/^fun-(?:box|vantvat)-[0-9a-f-]{36}$/.test(id);
 const fail=reason=>Object.assign(new Error(reason),{reason});
 function norm(raw){
  return {version:1,lockedIds:[...new Set((Array.isArray(raw?.lockedIds)?raw.lockedIds:[])
   .filter(idOk))].slice(-MAX_LOCKS)};
 }
 function locked(states,instanceId){return norm(states?.[META]).lockedIds.includes(instanceId);}
 async function run({db,auth,uid,kind,instanceId}={}){
  if(!uid||auth?.currentUser?.uid!==uid||!db?.collection||!db?.runTransaction||
   !['lock','unlock'].includes(kind)||!idOk(instanceId))throw fail('invalid-request');
  const user=auth.currentUser,ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),inventory=data.inventory,
    states=data.storyStates&&typeof data.storyStates==='object'&&!Array.isArray(data.storyStates)?data.storyStates:{};
   if(!Array.isArray(inventory)||inventory.length>500)throw fail('invalid-inventory');
   const matches=inventory.filter(item=>item?.instanceId===instanceId);
   if(matches.length!==1||rule.valueOf(matches[0])<=0)throw fail('not-owned');
   const s=norm(states[META]),has=s.lockedIds.includes(instanceId);
   if((kind==='lock'&&has)||(kind==='unlock'&&!has))
    return {status:'already-applied',state:s,storyStates:states};
   if(kind==='lock'&&s.lockedIds.length>=MAX_LOCKS)throw fail('lock-limit');
   const next={version:1,lockedIds:kind==='lock'?[...s.lockedIds,instanceId]:
    s.lockedIds.filter(id=>id!==instanceId)};
   const nextStates={...states,[META]:next};
   tx.update(ref,{storyStates:nextStates});
   return {status:'applied',state:next,storyStates:nextStates};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return Object.freeze(result);
 }
 return Object.freeze({META,norm,locked,run});
});
