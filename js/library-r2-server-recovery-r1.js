(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduR2ServerRecoveryR1=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BOOK=/^epub-[a-f0-9]{32}$/,REV=/^r-[a-f0-9]{32}$/;
 const phases=new Set(['idle','parsing','ticket','packaging','draft','staging','quarantined','promoting','publishing','published','blocked']);
 const classifications=new Set(['PUBLISHED_EXACT','IMPORTING_COMPLETE','IMPORTING_INCOMPLETE','NOT_FOUND_EMPTY','NOT_FOUND_WITH_OBJECTS','DRAFT','REVISION_MISMATCH','UNKNOWN']);
 function fail(code){throw Object.assign(new Error(code),{code});}
 async function safeError(response){
  const map={'recovery-not-enabled':'RECOVERY_NOT_ENABLED','recovery-audit-budget-exceeded':'RECOVERY_AUDIT_LIMIT','recovery-identity-or-revision-mismatch':'RECOVERY_REVISION_MISMATCH','recovery-state-changed':'RECOVERY_STATE_CHANGED','recovery-firestore-unavailable':'RECOVERY_BACKEND_UNAVAILABLE','library-r2-write-disabled':'RECOVERY_WRITE_DISABLED','not-found':'RECOVERY_NOT_DEPLOYED'};
  const reader=response.body?.getReader();if(!reader)return null;const chunks=[];let size=0;
  try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>4096){await reader.cancel();return null;}chunks.push(x.value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return map[d?.code]||null;}catch{return null;}finally{reader.releaseLock();}
 }
 function create({config,getUser,isAllowed,getPendingRaw,saveAttempt,preflight,fetchFn=globalThis.fetch,now=Date.now,timeoutMs=90000}={}){
  let base;try{base=new URL(config.workerBaseUrl);}catch{fail('RECOVERY_CONFIGURATION');}
  if(base.origin!=='https://dudu-library-l6-development.dudu-studio-ai.workers.dev'||base.username||base.password||base.search||base.hash||base.pathname!=='/'||[getUser,isAllowed,getPendingRaw,saveAttempt,preflight,fetchFn].some(f=>typeof f!=='function'))fail('RECOVERY_CONFIGURATION');
  let busy=false,last=null;
  function capture(){if(config.serverRecoveryEnabled!==true)fail('RECOVERY_NOT_ENABLED');const user=getUser(),raw=getPendingRaw();if(!isAllowed()||!user||user.uid!==config.pilotOwnerUid)fail('RECOVERY_OWNER_REQUIRED');let p;try{p=JSON.parse(raw);}catch{fail('RECOVERY_PENDING_INVALID');}if(p?.schema!==1||!phases.has(p.phase)||!BOOK.test(p?.bookId||'')||!REV.test(p?.revisionId||''))fail('RECOVERY_PENDING_INVALID');return {user,raw,p,at:now()};}
  function check(t){if(!isAllowed()||getUser()!==t.user||getPendingRaw()!==t.raw)fail('RECOVERY_SESSION_CHANGED');}
  async function token(t){let jwt;try{jwt=await t.user.getIdToken(false);}catch{fail('RECOVERY_AUTH_UNAVAILABLE');}check(t);if(typeof jwt!=='string'||!/^[A-Za-z0-9_.-]{100,12000}$/.test(jwt))fail('RECOVERY_AUTH_UNAVAILABLE');return jwt;}
  async function request(t,method,path,body,jwt){check(t);jwt=jwt||await token(t);check(t);const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);try{const r=await fetchFn(new URL(path,base).href,{method,headers:{Authorization:'Bearer '+jwt,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',redirect:'error',cache:'no-store',signal:abort.signal});if(r.status!==200){const code=await safeError(r);fail(r.status===429?'RECOVERY_RATE_LIMITED':code||(r.status===404||r.status===503?'RECOVERY_UNAVAILABLE':'RECOVERY_HTTP_'+r.status));}const reader=r.body?.getReader();if(!reader)fail('RECOVERY_RESPONSE_INVALID');const chunks=[];let size=0;try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>4096){await reader.cancel();fail('RECOVERY_RESPONSE_INVALID');}chunks.push(r.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));check(t);return d;}catch(e){if(e?.code)throw e;fail('RECOVERY_NETWORK_OR_UNKNOWN');}finally{clearTimeout(timer);}}
  function validate(t,d){if(d?.ok!==true||d.bookId!==t.p.bookId||d.revision!==t.p.revisionId||!classifications.has(d.classification)||d.closeAllowed!==false||d.retryAllowed!==false)fail('RECOVERY_RESPONSE_INVALID');if(d.canPublish===true&&(d.classification!=='IMPORTING_COMPLETE'||!Number.isInteger(d.expectedObjects)||d.expectedObjects<3||d.verifiedObjects!==d.expectedObjects||d.issueCount!==0||typeof d.bookSummary?.title!=='string'||typeof d.bookSummary?.author!=='string'))fail('RECOVERY_RESPONSE_INVALID');return d;}
  const path=t=>'/v1/library/r2/catalog/'+t.p.bookId;
  return Object.freeze({
   async inspect(){if(busy)fail('RECOVERY_BUSY');busy=true;last=null;try{const t=capture(),d=validate(t,await request(t,'GET',path(t)+'/recovery?revision='+encodeURIComponent(t.p.revisionId)));last={t,d,at:now()};return d;}finally{busy=false;}},
   async publish({approve=false}={}){if(busy)fail('RECOVERY_BUSY');if(approve!==true)fail('RECOVERY_CONFIRMATION_REQUIRED');const previous=last;last=null;if(!previous||previous.d.classification!=='IMPORTING_COMPLETE'||previous.d.canPublish!==true||now()<previous.at||now()-previous.at>120000)fail('RECOVERY_FRESH_INSPECTION_REQUIRED');busy=true;let dispatched=false;try{const {t,d}=previous;check(t);await preflight(d,t.p);check(t);const jwt=await token(t);check(t);if(now()-previous.at>120000)fail('RECOVERY_FRESH_INSPECTION_REQUIRED');if(saveAttempt({status:'publishing',bookId:t.p.bookId,revisionId:t.p.revisionId,total:d.expectedObjects,quarantined:0,requestsDispatched:0,lastRequest:{operation:'publish',state:'dispatching',code:'NETWORK_OR_UNKNOWN',http:null,at:now()}})!==true)fail('RECOVERY_JOURNAL_REQUIRED');check(t);dispatched=true;
    try{validate(t,await request(t,'POST',path(t)+'/recovery/publish',{revisionId:t.p.revisionId},jwt));}catch{}
    // A write can have completed despite a lost response. GET only, never POST retry.
    check(t);const status=await request(t,'GET',path(t)+'/status');check(t);
    const published=status?.code==='import-status'&&status.found===true&&status.bookId===t.p.bookId&&status.revision===t.p.revisionId&&status.status==='published';
    saveAttempt({status:published?'published':'blocked',bookId:t.p.bookId,revisionId:t.p.revisionId,total:d.expectedObjects,requestsDispatched:1,published,lastRequest:{operation:'publish',state:published?'response':'unknown',code:published?'catalog-published':'NETWORK_OR_UNKNOWN',http:published?200:null,at:now()}});
    return {classification:published?'PUBLISHED_EXACT':'UNKNOWN',pendingCleared:false};
   }catch(e){if(dispatched&&isAllowed()&&getUser()===previous.t.user&&getPendingRaw()===previous.t.raw)saveAttempt({status:'blocked',bookId:previous.t.p.bookId,revisionId:previous.t.p.revisionId,requestsDispatched:1,lastRequest:{operation:'publish',state:'unknown',code:'NETWORK_OR_UNKNOWN',http:null,at:now()}});throw e;}finally{busy=false;}},
   invalidate(){last=null;},state:()=>({busy,hasInspection:!!last})
  });
 }
 return Object.freeze({create});
});
