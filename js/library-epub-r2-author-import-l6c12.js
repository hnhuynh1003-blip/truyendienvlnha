/* DUDU STUDIO L6-C12 — Author import coordinator, REVIEW ONLY.
 * No inclusion in index.html, no default Worker URL, no persistence, no deployment.
 * Browser-supplied metadata/receipts NEVER grant catalog publish authority.
 * The server must verify Firebase JWT/admin, issued ticket, create-only draft,
 * quarantine, immutable promotion, STAGED audit, Firestore CAS and account ACL.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibraryR2AuthorImportL6C12=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BOOK=/^epub-[a-f0-9]{32}$/;
 const REV=/^r-[a-f0-9]{32}$/;
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const BEARER=/^[A-Za-z0-9_.-]{100,12000}$/;
 const UID=/^[A-Za-z0-9_-]{1,128}$/;
 const KINDS=new Set(['original','chapter','layout','asset']);
 const MAX_RESP=8192;
 const fail=(reason)=>{const error=new Error('L6-C12 blocked: '+reason);error.code=reason;throw error;};
 const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const exact=(v,fields)=>rec(v)&&Object.keys(v).sort().join(',')===fields.slice().sort().join(',');
 const freeze=record=>Object.freeze(record);
 const routes={ticket:'/v1/library/r2/catalog/ticket',draft:'/v1/library/r2/catalog/draft'};
 const safeRoute=r=>typeof r==='string'&&(Object.values(routes).includes(r)||
  /^\/v1\/library\/r2\/catalog\/epub-[a-f0-9]{32}\/(?:promote|publish)$/.test(r)||
  /^\/v1\/library\/r2\/stage\/(?:chapter|asset|layout|original)\/epub-[a-f0-9]{32}(?:\/[A-Za-z0-9][A-Za-z0-9_-]{3,120})?$/.test(r));
 async function jsonBounded(response){
  const declared=response.headers?.get?.('Content-Length');
  if(declared!==null&&declared!==undefined&&(!/^\d+$/.test(declared)||Number(declared)>MAX_RESP))fail('oversize-response');
  if(!response.body){return null;}
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    if(!(value instanceof Uint8Array))fail('bad-response-stream');
    size+=value.length;if(size>MAX_RESP){await reader.cancel();fail('oversize-response');}
    chunks.push(value);
   }
  }finally{reader.releaseLock();}
  const out=new Uint8Array(size);let pos=0;
  for(const item of chunks){out.set(item,pos);pos+=item.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(out));}
  catch{fail('invalid-response-json');}
 }
 /** Browser transport helper. This is inert until explicitly called.
  * Worker origin MUST be a separately approved HTTPS staging endpoint.
  */
 function createTransport({workerBaseUrl,fetchFn=globalThis.fetch}={}){
  let endpoint;
  try{endpoint=new URL(workerBaseUrl);}catch{fail('worker-url-unavailable');}
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||
    endpoint.search||endpoint.hash||endpoint.pathname!=='/'||
    !endpoint.hostname||typeof fetchFn!=='function')fail('worker-url-unapproved');
  return async function send({route,method='POST',token,body,mime,signal}={}){
   if(!safeRoute(route)||method!=='POST'||!BEARER.test(token||''))fail('invalid-request');
   const headers={Authorization:'Bearer '+token,Accept:'application/json'};
   if(body!==undefined){
    if(mime==='application/json'){
     if(!(rec(body)||Array.isArray(body)))fail('invalid-json-body');
     headers['Content-Type']='application/json';body=JSON.stringify(body);
    }else if(typeof mime==='string'&&/^(?:application\/epub\+zip|application\/json; charset=utf-8|text\/plain; charset=utf-8|image\/(?:png|jpeg|webp|gif))$/.test(mime)&&body instanceof Uint8Array){
     headers['Content-Type']=mime;
    }else fail('invalid-upload-body');
   }else if(mime!==undefined)fail('unexpected-mime');
   const response=await fetchFn(new URL(route,endpoint).href,{method,headers,
    ...(body===undefined?{}:{body}),cache:'no-store',redirect:'error',
    credentials:'omit',mode:'cors',signal});
   let data;try{data=await jsonBounded(response);}catch(e){e.http=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:null;throw e;}
   return freeze({status:response.status,data});
  };
 }
 function validMetadata(m){
  return exact(m,['title','author','description','genre','publicationState'])&&
   typeof m.title==='string'&&!!m.title.trim()&&m.title.length<=140&&
   typeof m.author==='string'&&!!m.author.trim()&&m.author.length<=140&&
   typeof m.description==='string'&&m.description.length<=3000&&
   typeof m.genre==='string'&&m.genre.length<=220&&
   !/[\u0000-\u001F<>]/u.test(Object.values(m).join(''))&&
   ['Đang ra','Hoàn thành'].includes(m.publicationState);
 }
 function createController({enabled=false,getCurrentUser,send,parseV48,sidecar,uploader,
  zipLib,Parser,textV57,cryptoApi=globalThis.crypto,batchSize=4,onState}={}){
  if(enabled!==true)fail('import-feature-off');
  if(typeof getCurrentUser!=='function'||typeof send!=='function'||
   typeof parseV48!=='function'||typeof sidecar?.buildPackage!=='function'||
   typeof uploader?.buildPlan!=='function'||typeof uploader?.stageBatch!=='function'||
   typeof zipLib?.loadAsync!=='function'||typeof Parser!=='function'||
   typeof textV57?.getText!=='function'||typeof cryptoApi?.subtle?.digest!=='function'||
   !Number.isSafeInteger(batchSize)||batchSize<1||batchSize>8)fail('missing-prerequisites');
  let status='idle', uid=null, bookId=null, revisionId=null, receipts=[],checkpoints=[],total=0, busy=false,requestsDispatched=0,lastRequest=null,failurePhase=null;
  const statusView=()=>freeze({status,bookId,revisionId,requestsDispatched,quarantined:checkpoints.length,total,
   readyForOwnerConfirmation:status==='quarantined',publishAuthorized:false,
   published:status==='published',lastRequest:lastRequest?freeze({...lastRequest}):null,failurePhase,
   receipts:freeze(checkpoints.map(r=>freeze({...r}))),eligibleForDeletion:false,canMigrateBookmarks:false,
   canAwardExp:false});
  const requireUser=()=>{
   const user=getCurrentUser();
   if(!UID.test(user?.uid||'')||typeof user.getIdToken!=='function'||
     (uid!==null&&user.uid!==uid))fail('account-changed');
   return user;
  };
  const token=async()=>{
   const user=requireUser();let value;
   try{value=await user.getIdToken(false);}catch{if(status==='staging')lastRequest={operation:'stage',state:'not-dispatched',http:null,code:'AUTH_UNAVAILABLE',at:Date.now()};fail('token-unavailable');}
   if(getCurrentUser()!==user||!BEARER.test(value||''))fail('token-or-account-changed');
   return value;
  };
  const post=async(route,{body,mime,signal}={})=>{
   if(signal?.aborted)fail('aborted');
   const operation=route===routes.ticket?'ticket':route===routes.draft?'draft':route.includes('/stage/')?'stage':route.endsWith('/promote')?'promote':'publish';
   let jwt;try{jwt=await token();}catch(e){lastRequest={operation,state:'not-dispatched',http:null,code:'AUTH_UNAVAILABLE',at:Date.now()};throw e;}if(signal?.aborted)fail('aborted');
   lastRequest={operation,state:'dispatching',http:null,code:'NETWORK_OR_UNKNOWN',at:Date.now()};
   // Persist only metadata before dispatch. Failure to persist must stop the request.
   if(typeof onState==='function')onState(statusView());
   let response;
   try{requestsDispatched++;response=await send({route,method:'POST',token:jwt,body,mime,signal});}
   catch(e){const http=Number.isInteger(e?.http)&&e.http>=100&&e.http<=599?e.http:null;lastRequest={operation,state:'unknown',http,code:http?'INVALID_RESPONSE':'NETWORK_OR_UNKNOWN',at:Date.now()};fail('request-outcome-unknown');}
   requireUser();if(signal?.aborted)fail('aborted');
   const known=new Set(['ticket-issued','draft-created','quarantined','promotion-verified','catalog-published','unauthenticated','owner-only','invalid-request','invalid-manifest','invalid-metadata','invalid-body','invalid-json','draft-unavailable','request-unavailable','pipeline-disabled','publish-unavailable-or-unknown','not-found','origin-blocked','catalog-disabled','method-not-allowed','auth-unavailable','server-unavailable','unexpected-body','ticket-denied','invalid-media','invalid-fields','writer-unavailable','already-exists','writer-unavailable-or-unknown','draft-denied']);
   lastRequest={operation,state:'response',http:Number.isInteger(response?.status)&&response.status>=100&&response.status<=599?response.status:null,code:known.has(response?.data?.code)?response.data.code:'OTHER_SERVER_CODE',at:Date.now()};
   if(typeof onState==='function')onState(statusView());
   if(!rec(response)||!Number.isSafeInteger(response.status)||!rec(response.data)||
     typeof response.data.code!=='string')fail('response-unverifiable');
   return response;
  };
  async function start({file,metadata,signal,onProgress}={}){
   if(status!=='idle'||busy)fail('already-started');
   if(!validMetadata(metadata))fail('owner-metadata-required');
   uid=requireUser().uid;
   busy=true;status='parsing';
   try{
    if(signal?.aborted)fail('aborted');
    const parsed=await parseV48(file,{zipLib,Parser});requireUser();
    if(signal?.aborted)fail('aborted');
    status='ticket';
    const issue=await post(routes.ticket,{signal});
    if(issue.status!==200||issue.data.ok!==true||issue.data.code!=='ticket-issued'||
      !BOOK.test(issue.data.bookId||'')||!REV.test(issue.data.revisionId||'')||
      typeof issue.data.ticket!=='string'||issue.data.ticket.length<50||
      issue.data.publishable!==false)fail('ticket-not-issued');
    bookId=issue.data.bookId;revisionId=issue.data.revisionId;
    status='packaging';if(typeof onState==='function')onState(statusView());
    const pack=await sidecar.buildPackage({file,parsed,bookId,revisionId,
      zipLib,Parser,textV57,cryptoApi});requireUser();
    if(pack.manifest?.bookId!==bookId||pack.manifest?.revisionId!==revisionId||
      pack.authorizedToPublish!==false||pack.canWriteFirestore!==false||
      pack.eligibleForDeletion!==false||pack.eligibleForStaging!==false||
      pack.requiresTrustedServerDraft!==true)fail('package-untrusted');
    const plan=await uploader.buildPlan({manifest:pack.manifest,layouts:pack.layouts,
      parts:pack.parts,cryptoApi});requireUser();
    if(plan.bookId!==bookId||plan.revisionId!==revisionId||
      plan.readyForPublication!==false||!Array.isArray(plan.items)||!plan.items.length)
      fail('upload-plan-untrusted');
    status='draft';
    const drafted=await post(routes.draft,{body:{ticket:issue.data.ticket,
      manifest:pack.manifest,layouts:pack.layouts,metadata},mime:'application/json',signal});
    if(drafted.status!==201||drafted.data.ok!==true||drafted.data.code!=='draft-created'||
      drafted.data.bookId!==bookId||drafted.data.revisionId!==revisionId||
      drafted.data.status!=='importing'||drafted.data.publishable!==false)fail('draft-not-confirmed');
    status='staging';total=plan.items.length;
    for(let offset=0;offset<total;){
     if(signal?.aborted)fail('aborted');
     // Canonical uploader does byte/hash validation and gives one receipt per part.
     const batch=await uploader.stageBatch({plan,start:offset,batchSize,
      send:async({route,method,mime,body})=>{
       const received=await post(route,{body,mime,signal});
       if(received.status!==201||received.data.ok!==true||
         received.data.code!=='quarantined')fail('quarantine-not-confirmed');
       return {status:received.status,data:received.data};
      },tokenProvider:token,signal,cryptoApi,
      onReceipt:r=>{const expected=plan.items[checkpoints.length];if(!expected||!exact(r,['kind','id','uploadId'])||r.kind!==expected.kind||r.id!==expected.id||!UUID.test(r.uploadId||''))fail('receipt-mismatch');checkpoints.push(freeze({...r}));if(typeof onState==='function')onState(statusView());},
      onProgress:typeof onProgress==='function'?onProgress:undefined});
     requireUser();
     if(!Array.isArray(batch?.receipts)||batch.next!==offset+batch.receipts.length||
       !batch.receipts.length||batch.receipts.length>batchSize||
       batch.publishable!==false||batch.eligibleForDeletion!==false)fail('stage-receipts-untrusted');
     for(const r of batch.receipts){
      const expected=plan.items[receipts.length];
      if(!exact(r,['kind','id','uploadId'])||r.kind!==expected.kind||r.id!==expected.id||
       !KINDS.has(r.kind)||!UUID.test(r.uploadId||'')||
       receipts.some(x=>x.uploadId===r.uploadId))fail('receipt-mismatch');
      receipts.push(freeze({kind:r.kind,id:r.id,uploadId:r.uploadId}));
      if(checkpoints.length<receipts.length)checkpoints.push(freeze({...r}));
      else if(checkpoints[receipts.length-1].uploadId!==r.uploadId)fail('receipt-mismatch');
     }
     offset=batch.next;
     if(typeof onState==='function')onState(statusView());
    }
    if(receipts.length!==total)fail('partial-stage');
    status='quarantined';return statusView();
   }catch(e){failurePhase=status;status='blocked';try{if((requestsDispatched>0||bookId!==null)&&typeof onState==='function')onState(statusView());}catch{}throw e;}
   finally{busy=false;}
  }
  async function publish({approve=false,expectedBookId,signal}={}){
   if(approve!==true||status!=='quarantined'||busy||expectedBookId!==bookId)
    fail('explicit-publication-approval-required');
   if(receipts.length!==total||total<1)fail('incomplete-upload');
   requireUser();busy=true;status='promoting';
   try{
    for(let i=0;i<receipts.length;i+=8){
     const block=receipts.slice(i,i+8);
     const result=await post('/v1/library/r2/catalog/'+bookId+'/promote',{
      body:{uploads:block},mime:'application/json',signal});
     if(result.status!==200||result.data.ok!==true||
       result.data.code!=='promotion-verified'||
       !Number.isSafeInteger(result.data.copied)||!Number.isSafeInteger(result.data.reused)||
       result.data.copied+result.data.reused!==block.length||
       result.data.publishable!==false)fail('promotion-not-confirmed');
    }
    status='publishing';
    const result=await post('/v1/library/r2/catalog/'+bookId+'/publish',{signal});
    if(result.status!==200||result.data.ok!==true||
      result.data.code!=='catalog-published'||result.data.bookId!==bookId||
      !Number.isSafeInteger(result.data.verifiedObjects)||
      result.data.verifiedObjects!==total)fail('publication-unverified');
    status='published';receipts=[];checkpoints=[];if(typeof onState==='function')onState(statusView());
    return statusView();
   }catch(e){failurePhase=status;status='blocked';try{if((requestsDispatched>0||bookId!==null)&&typeof onState==='function')onState(statusView());}catch{}throw e;}
   finally{busy=false;}
  }
  return freeze({start,publish,status:statusView});
 }
 return freeze({createTransport,createController,validateMetadata:validMetadata});
});
