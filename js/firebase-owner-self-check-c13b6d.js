/* Local session diagnostics only. The Worker must independently verify JWT/owner authorization. */
(function(){
  'use strict';
  const OWNER='B2yP6xL5rZPcj1GjHUJ5cINx1eT2',PROJECT='truyendienvl';
  const panel=document.getElementById('firebase-owner-check');
  const button=document.getElementById('firebase-owner-check-button');
  const results=document.getElementById('firebase-owner-check-results');
  if(!panel||!button||!results||typeof firebase==='undefined'||
    (typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE))return;
  let auth;
  try{auth=firebase.auth();}catch{return;}
  let generation=0,busy=false,expiryTimer=null,checks=null,expiresAt=0;
  const fields=['uid','admin','project','valid'];
  const owner=()=>auth.currentUser?.uid===OWNER;
  function show(values){
    for(const key of fields)document.getElementById('firebase-owner-check-'+key).textContent=values[key]===true?'PASS':'FAIL';
    results.hidden=false;
  }
  function clear(){
    clearTimeout(expiryTimer);expiryTimer=null;checks=null;expiresAt=0;
    results.hidden=true;
    for(const key of fields)document.getElementById('firebase-owner-check-'+key).textContent='';
  }
  function sessionChanged(){
    generation++;busy=false;button.disabled=false;button.removeAttribute('aria-busy');
    clear();panel.hidden=!owner();
  }
  function expire(){
    if(checks&&Date.now()>=expiresAt){checks={...checks,valid:false};show(checks);}
  }
  button.addEventListener('click',async()=>{
    if(busy||!owner())return;
    const user=auth.currentUser,request=++generation;
    clear();busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
    try{
      // Never read, display, persist, transmit or log the result.token field.
      const result=await user.getIdTokenResult(true);
      if(request!==generation||auth.currentUser!==user||!owner())return;
      const claims=result.claims||{},now=Date.now();
      const expiry=Date.parse(result.expirationTime),issued=Date.parse(result.issuedAtTime);
      checks={
        uid:user.uid===OWNER&&claims.sub===OWNER,
        admin:claims.admin===true,
        project:auth.app?.options?.projectId===PROJECT&&claims.aud===PROJECT&&
          claims.iss==='https://securetoken.google.com/'+PROJECT,
        valid:typeof claims.exp==='number'&&Number.isFinite(claims.exp)&&claims.exp*1000>now&&
          Number.isFinite(expiry)&&expiry>now&&Number.isFinite(issued)&&issued<=now&&issued<expiry
      };
      show(checks);
      // Retain only booleans and expiry time, never the token result or decoded claims.
      expiresAt=Math.min(expiry,typeof claims.exp==='number'?claims.exp*1000:now);
      if(checks.valid)expiryTimer=setTimeout(expire,Math.min(expiresAt-now,2147483647));
    }catch{
      if(request===generation&&auth.currentUser===user&&owner())show({});
    }finally{
      if(request===generation){busy=false;button.disabled=false;button.removeAttribute('aria-busy');}
    }
  });
  document.addEventListener('visibilitychange',expire);
  window.addEventListener('focus',expire);
  sessionChanged();
  auth.onAuthStateChanged(sessionChanged,()=>{sessionChanged();panel.hidden=true;});
})();
