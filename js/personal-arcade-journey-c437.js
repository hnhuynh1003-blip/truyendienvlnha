/* C4.37 — device-only Arcade journey tracking. This is a display preference,
 * not an achievement ledger, a proof of play or a reward entitlement.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduArcadeJourneyC437=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1,MAX_TRACKED=3,PREFIX='dudu-arcade-journey-c437:v1:';
 const IDS=Object.freeze(['neon','mine','garden','jade']);
 const idSet=new Set(IDS);
 function validOwner(owner){
  return typeof owner==='string'&&owner.length>0&&owner.length<=200&&
   /^(uid:|sandbox:)/.test(owner)&&!/[\u0000-\u001f]/.test(owner);
 }
 function keyFor(owner){return validOwner(owner)?PREFIX+encodeURIComponent(owner):null;}
 const fresh=owner=>({version:VERSION,owner:validOwner(owner)?owner:'',tracked:[]});
 function norm(raw,owner){
  const state=fresh(owner);
  if(!state.owner||!raw||typeof raw!=='object'||raw.version!==VERSION||
    raw.owner!==owner||!Array.isArray(raw.tracked))return state;
  state.tracked=[...new Set(raw.tracked.filter(id=>idSet.has(id)))].slice(0,MAX_TRACKED);
  return state;
 }
 function read(storage,owner){
  const key=keyFor(owner);
  if(!key)return fresh(owner);
  try{return norm(JSON.parse(storage?.getItem?.(key)||'null'),owner);}
  catch(_){return fresh(owner);}
 }
 function toggle(raw,id){
  const state=norm(raw,raw?.owner);
  if(!state.owner||!idSet.has(id))return {ok:false,reason:'invalid',state};
  if(state.tracked.includes(id)){
   state.tracked=state.tracked.filter(value=>value!==id);
   return {ok:true,added:false,state};
  }
  if(state.tracked.length>=MAX_TRACKED)return {ok:false,reason:'full',state};
  state.tracked.push(id);
  return {ok:true,added:true,state};
 }
 function save(storage,owner,raw){
  const key=keyFor(owner);
  if(!key||raw?.owner!==owner)return false;
  try{storage?.setItem?.(key,JSON.stringify(norm(raw,owner)));
   return typeof storage?.setItem==='function';}
  catch(_){return false;}
 }
 return Object.freeze({VERSION,MAX_TRACKED,IDS,keyFor,fresh,norm,read,toggle,save});
});
