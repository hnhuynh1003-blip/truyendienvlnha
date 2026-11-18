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
   const data=await jsonBounded(response);
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
  zipLib,Parser,textV57,cryptoApi=globalThis.crypto,batchSize=4}={}){
  if(enabled!==true)fail('import-feature-off');
  if(typeof getCurrentUser!=='function'||typeof send!=='function'||
   typeof parseV48!=='function'||typeof sidecar?.buildPackage!=='function'||
   typeof uploader?.buildPlan!=='function'||typeof uploader?.stageBatch!=='function'||
   typeof zipLib?.loadAsync!=='function'||typeof Parser!=='function'||
   typeof textV57?.getText!=='function'||typeof cryptoApi?.subtle?.digest!=='function'||
   !Number.isSafeInteger(batchSize)||batchSize<1||batchSize>8)fail('missing-prerequisites');
  let status='idle', uid=null, bookId=null, revisionId=null, receipts=[],total=0, busy=false;
  const statusView=()=>freeze({status,bookId,revisionId,quarantined:receipts.length,total,
   readyForOwnerConfirmation:status==='quarantined',publishAuthorized:false,
   published:status==='published',eligibleForDeletion:false,canMigrateBookmarks:false,
   canAwardExp:false});
  const requireUser=()=>{
   const user=getCurrentUser();
   if(!UID.test(user?.uid||'')||typeof user.getIdToken!=='function'||
     (uid!==null&&user.uid!==uid))fail('account-changed');
   return user;
  };
  const token=async()=>{
   const user=requireUser();let value;
   try{value=await user.getIdToken(false);}catch{fail('token-unavailable');}
   if(getCurrentUser()!==user||!BEARER.test(value||''))fail('token-or-account-changed');
   return value;
  };
  const post=async(route,{body,mime,signal}={})=>{
   if(signal?.aborted)fail('aborted');
   const jwt=await token();if(signal?.aborted)fail('aborted');
   let response;
   try{response=await send({route,method:'POST',token:jwt,body,mime,signal});}
   catch{fail('request-outcome-unknown');}
   requireUser();if(signal?.aborted)fail('aborted');
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
    status='packaging';
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
     }
     offset=batch.next;
    }
    if(receipts.length!==total)fail('partial-stage');
    status='quarantined';return statusView();
   }catch(e){status='blocked';throw e;}
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
    status='published';receipts=[];
    return statusView();
   }catch(e){status='blocked';throw e;}
   finally{busy=false;}
  }
  return freeze({start,publish,status:statusView});
 }
 return freeze({createTransport,createController});
});
