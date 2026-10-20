/* DUDU V70 — Passport VIEW gate and non-authoritative Sandbox demo.
 * There is NO real pass minting/verification endpoint yet.
 * A public demo code grants only temporary cosmetic UI visibility in Sandbox.
 * Never derive server entitlements, system provenance, pact or rewards here.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduSystemGateV70=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const DEMO_CODE='DUDU-THU-2026';
 const STORAGE_PREFIX='dudu:v70:demo-pass:';
 const attributes=Object.freeze([
  {id:'fortune',label:'Khí vận',value:67},
  {id:'luck',label:'May mắn',value:54},
  {id:'agility',label:'Nhanh nhẹn',value:48},
  {id:'strength',label:'Sức mạnh',value:38},
  {id:'appearance',label:'Nhan sắc',value:62},
  {id:'intelligence',label:'Trí tuệ',value:76},
  {id:'stamina',label:'Thể lực',value:45},
  {id:'spirit',label:'Tinh thần',value:71}
 ].map(Object.freeze));
 function hostId(accountId){
  // Visual pseudonym ONLY; not a unique server identity or a security hash.
  let h=2166136261;
  for(const c of String(accountId||'unknown'))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
  return 'KC-'+h.toString(16).toUpperCase().padStart(8,'0');
 }
 function storageKey(accountId){return STORAGE_PREFIX+String(accountId||'');}
 function validDemoCode(code,opts={}){
  return opts.sandbox===true&&typeof opts.accountId==='string'&&
   opts.accountId.startsWith('sandbox:')&&opts.accountId.length>8&&
   typeof code==='string'&&code.trim().toUpperCase()===DEMO_CODE;
 }
 function admit(code,{sandbox=false,accountId='',session=null}={}){
  if(!validDemoCode(code,{sandbox,accountId})||!session||
      typeof session.setItem!=='function')return {ok:false,kind:'invalid'};
  try{
   session.setItem(storageKey(accountId),'demo-only-v1');
   return {ok:true,kind:'sandbox-demo',verified:false,authoritative:false};
  }catch(_){return {ok:false,kind:'unavailable'};}
 }
 function state({sandbox=false,accountId='',session=null}={}){
  if(!sandbox||!accountId.startsWith('sandbox:')||!session)return 'locked';
  try{return session.getItem(storageKey(accountId))==='demo-only-v1'?'demo':'locked';}
  catch(_){return 'locked';}
 }
 function revoke({accountId='',session=null}={}){
  try{session?.removeItem?.(storageKey(accountId));return true;}
  catch(_){return false;}
 }
 function demoProjection({accountId,name}={}){
  const nickname=String(name||'Ký chủ thử nghiệm').trim().slice(0,50)||'Ký chủ thử nghiệm';
  return Object.freeze({
   mode:'sandbox-demo',verified:false,authoritative:false,
   host:Object.freeze({id:hostId(accountId),name:nickname,level:1,exp:0}),
   system:Object.freeze({
    displayId:'SYS-F-7A41',rank:'F',level:1,exp:0,
    temperament:'Quan sát · Cẩn trọng',identity:'CHƯA XÁC THỰC',
    origin:'Không xác định',isRegular:null,isCounterfeit:null,
    label:'Hệ thống con chưa định danh'
   }),
   stats:attributes,
   journey:Object.freeze({worlds:0,achievements:0,rewards:0,items:0}),
   pact:Object.freeze({status:'demo_preview_only',signed:false}),
   capabilities:Object.freeze({
    enterWorld:false,signPact:false,grantLoot:false,promote:false
   })
  });
 }
 return Object.freeze({
  version:1,DEMO_CODE,attributes,hostId,validDemoCode,
  admit,state,revoke,demoProjection
 });
});
