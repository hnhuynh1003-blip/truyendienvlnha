/* Client-only diagnostic; Worker must verify the Firebase JWT independently. */
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
  const diagnostic=document.createElement('div');
  diagnostic.id='firebase-owner-check-diagnostic';
  diagnostic.setAttribute('aria-live','polite');
  results.appendChild(diagnostic);
  function show(values,code=''){
    for(const key of fields)document.getElementById('firebase-owner-check-'+key).textContent=values[key]===true?'PASS':'FAIL';
    diagnostic.textContent=code?'Mã chẩn đoán: '+code:'';
    results.hidden=false;
  }
  function clear(){
    clearTimeout(expiryTimer);expiryTimer=null;checks=null;expiresAt=0;
    results.hidden=true;diagnostic.textContent='';
    for(const key of fields)document.getElementById('firebase-owner-check-'+key).textContent='';
  }
  function sessionChanged(){
    generation++;busy=false;button.disabled=false;button.removeAttribute('aria-busy');
    clear();panel.hidden=!owner();
  }
  function expire(){
    if(checks&&Date.now()>=expiresAt){checks={...checks,valid:false};show(checks,'TOKEN_EXPIRED_AFTER_CHECK');}
  }
  // Accept only a safe integer NumericDate or its exact decimal-digit representation.
  // Firebase's ParsedToken type documents exp as string; JWT payloads often use number.
  function expiryFromClaim(value){
    if(typeof value==='string'&&!/^[0-9]+$/.test(value))return NaN;
    if(typeof value!=='number'&&typeof value!=='string')return NaN;
    const seconds=Number(value);
    return Number.isSafeInteger(seconds)&&seconds>0&&Number.isSafeInteger(seconds*1000)
      ?seconds*1000:NaN;
  }
  // Only disclose coarse clock-offset bands; never the token timestamps.
  function issuedFutureCode(aheadMs){
    if(aheadMs<5000)return 'ISSUED_IN_FUTURE_LT_5S';
    if(aheadMs<60000)return 'ISSUED_IN_FUTURE_5S_TO_1M';
    if(aheadMs<300000)return 'ISSUED_IN_FUTURE_1M_TO_5M';
    return 'ISSUED_IN_FUTURE_GE_5M';
  }
  function checkTimes(claims,result,now){
    const jwtExpiry=expiryFromClaim(claims.exp);
    const sdkExpiry=Date.parse(result.expirationTime);
    const issued=Date.parse(result.issuedAtTime);
    let code='';
    if(!Number.isFinite(jwtExpiry))code='EXP_FORMAT';
    else if(jwtExpiry<=now)code='JWT_EXPIRED';
    else if(!Number.isFinite(sdkExpiry))code='SDK_EXP_FORMAT';
    else if(sdkExpiry<=now)code='SDK_EXPIRED';
    else if(!Number.isFinite(issued))code='ISSUED_FORMAT';
    else if(issued>now)code=issuedFutureCode(issued-now);
    else if(issued>=sdkExpiry)code='ISSUED_AFTER_EXP';
    return {valid:code==='',code,expiresAt:Math.min(jwtExpiry,sdkExpiry)};
  }
  button.addEventListener('click',async()=>{
    if(busy||!owner())return;
    const user=auth.currentUser,request=++generation;
    clear();busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
    try{
      // Firebase SDK handles token refresh internally; never access result.token.
      const result=await user.getIdTokenResult(true);
      if(request!==generation||auth.currentUser!==user||!owner())return;
      const claims=result.claims||{};
      const time=checkTimes(claims,result,Date.now());
      checks={
        uid:user.uid===OWNER&&claims.sub===OWNER,
        admin:claims.admin===true,
        project:auth.app?.options?.projectId===PROJECT&&claims.aud===PROJECT&&
          claims.iss==='https://securetoken.google.com/'+PROJECT,
        valid:time.valid
      };
      show(checks,time.code);
      // Retain only booleans and expiry milliseconds; never the result or claims.
      expiresAt=time.valid?time.expiresAt:0;
      if(checks.valid)expiryTimer=setTimeout(expire,Math.min(expiresAt-Date.now(),2147483647));
    }catch{
      if(request===generation&&auth.currentUser===user&&owner())show({},'REFRESH_FAILED');
    }finally{
      if(request===generation){busy=false;button.disabled=false;button.removeAttribute('aria-busy');}
    }
  });
  document.addEventListener('visibilitychange',expire);
  window.addEventListener('focus',expire);
  sessionChanged();
  auth.onAuthStateChanged(sessionChanged,()=>{sessionChanged();panel.hidden=true;});
})();
