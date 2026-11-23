const BOOK=/^epub-[a-f0-9]{32}$/,REV=/^r-[a-f0-9]{32}$/,UID=/^[A-Za-z0-9_-]{1,128}$/;
const PATH=/^\/v1\/library\/r2\/catalog\/(epub-[a-f0-9]{32})\/recovery(?:\/(publish))?$/;
export function isRecoveryPath(path){return PATH.test(path);}
function headers(origin,env){return {'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(origin===env.ALLOWED_ORIGIN?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin'}:{})};}
function reply(status,code,origin,env,data={}){return new Response(JSON.stringify({ok:status<300,code,...data}),{status,headers:headers(origin,env)});}
export async function boundedJson(response,max=1200000){const declared=response.headers?.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>max))throw Error('RESPONSE_LIMIT');const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_RESPONSE');const chunks=[];let size=0;try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max){await reader.cancel();throw Error('RESPONSE_LIMIT');}chunks.push(r.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
function sameDocument(a,b){return a?.name===b?.name&&typeof a?.updateTime==='string'&&a.updateTime===b?.updateTime;}
function identityDoc(doc,owner,rev){const f=doc?.fields;return f?.backend?.stringValue==='r2'&&f.ownerUid?.stringValue===owner&&REV.test(f.revision?.stringValue||'')&&f.revision.stringValue===rev;}
export function createRecoveryHandler({ownerUid,verifyIdentity,readCatalog,parseCatalog,expectedItems,audit,publish,now=Date.now,maxAuditItems=500,maxAuditBytes=32*1024*1024}={}){
 if(!UID.test(ownerUid||'')||[verifyIdentity,readCatalog,parseCatalog,expectedItems,audit,publish].some(f=>typeof f!=='function'))throw Error('RECOVERY_DEPENDENCIES_REQUIRED');
 return async function handle(request,env){
  const url=new URL(request.url),route=PATH.exec(url.pathname),origin=request.headers.get('Origin');
  if(!route)return reply(404,'not-found',origin,env);
  if(origin!==env.ALLOWED_ORIGIN)return reply(403,'origin-blocked',origin,env);
  if(env.LIBRARY_R2_RECOVERY_ENABLED!=='true')return reply(503,'recovery-not-enabled',origin,env);
  if(env.LIBRARY_R2_ENABLED!=='true')return reply(503,'library-r2-disabled',origin,env);
  if(route[2]&&(env.LIBRARY_R2_WRITE_ENABLED!=='true'||env.LIBRARY_R2_PIPELINE_ENABLED!=='true'))return reply(503,'library-r2-write-disabled',origin,env);
  if(env.PROJECT_ID!=='truyendienvl'||env.LIBRARY_R2_PILOT_OWNER_UID!==ownerUid)return reply(503,'recovery-configuration-unavailable',origin,env);
  const method=route[2]?'POST':'GET';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin,env)});
  if(request.method!==method)return reply(405,'method-not-allowed',origin,env);
  if(!/^Bearer [A-Za-z0-9_.-]{100,12000}$/.test(request.headers.get('Authorization')||''))return reply(401,'unauthenticated',origin,env);
  let identity;try{identity=await verifyIdentity(request,env.PROJECT_ID);}catch{}
  if(!identity)return reply(401,'unauthenticated',origin,env);
  if(identity.admin!==true||identity.uid!==env.LIBRARY_R2_PILOT_OWNER_UID)return reply(403,'owner-only',origin,env);
  let revision;
  if(method==='GET'){if([...url.searchParams.keys()].join(',')!=='revision')return reply(400,'expected-revision-required',origin,env);revision=url.searchParams.get('revision');}
  else {if(url.search)return reply(400,'unexpected-query',origin,env);try{const body=await boundedJson(request,512);if(Object.keys(body).join(',')!=='revisionId')throw Error('FIELDS');revision=body.revisionId;}catch{return reply(400,'invalid-recovery-body',origin,env);}}
  if(!REV.test(revision||''))return reply(400,'expected-revision-required',origin,env);
  const book=route[1],scope={bookId:book,revision,checkedAt:now(),retryAllowed:false,closeAllowed:false,oldWriterDrainProven:false};
  try{
   const before=await readCatalog(env,book);
   if(before.http===404){
    if(method==='POST')return reply(409,'recovery-not-importing',origin,env,{...scope,classification:'NOT_FOUND'});
    const bucket=env.DUDU_LIBRARY_EPUB_BUCKET;if(typeof bucket?.list!=='function')throw Error('BUCKET');
    let any=false;
    for(const prefix of [`quarantine/epub/${identity.uid}/${book}/`,...['originals','chapters','layouts','assets'].map(p=>`${p}/${book}/`)]){
     const result=await bucket.list({prefix,limit:1});if(!result||!Array.isArray(result.objects)||typeof result.truncated!=='boolean')throw Error('R2_LIST');
     if(result.objects.length)any=true;else if(result.truncated||result.cursor)throw Error('R2_LIST_INCOMPLETE');
    }
    const after=await readCatalog(env,book);if(after.http!==404)return reply(409,'recovery-state-changed',origin,env,{...scope,classification:'UNKNOWN'});
    return reply(200,'recovery-inspection',origin,env,{...scope,classification:any?'NOT_FOUND_WITH_OBJECTS':'NOT_FOUND_EMPTY',objectsEmpty:!any,canPublish:false});
   }
   if(before.http!==200)return reply(before.http===429?429:503,'recovery-firestore-unavailable',origin,env,{...scope,classification:'UNKNOWN'});
   const doc=before.doc;if(doc?.name!==`projects/${env.PROJECT_ID}/databases/(default)/documents/epub_catalog_r2_v1/${book}`||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(doc?.updateTime||''))throw Error('DOCUMENT_SCHEMA');if(!identityDoc(doc,identity.uid,revision))return reply(409,'recovery-identity-or-revision-mismatch',origin,env,{...scope,classification:'REVISION_MISMATCH'});
   const status=doc.fields.status?.stringValue;
   if(status==='published')return reply(200,'recovery-inspection',origin,env,{...scope,classification:'PUBLISHED_EXACT',canPublish:false});
   if(status!=='importing')return reply(409,'recovery-not-importing',origin,env,{...scope,classification:status==='draft'?'DRAFT':'UNKNOWN'});
   const catalog=parseCatalog(doc.fields);if(catalog.ownerUid!==identity.uid||catalog.revision!==revision||catalog.status!=='importing')throw Error('CATALOG');
   const title=doc.fields.title?.stringValue,author=doc.fields.author?.stringValue;
   if(typeof title!=='string'||!title.trim()||title.length>140||typeof author!=='string'||!author.trim()||author.length>140||/[\u0000-\u001f<>]/.test(title+author))throw Error('BOOK_METADATA');
   const bookSummary={title,author};
   const plan=expectedItems(book,catalog);if(!Array.isArray(plan.items)||plan.items.length<3)throw Error('MANIFEST');
   const totalBytes=plan.items.reduce((n,x)=>n+x.meta.bytes,0);
   if(plan.items.length>maxAuditItems||!Number.isSafeInteger(totalBytes)||totalBytes>maxAuditBytes)return reply(409,'recovery-audit-budget-exceeded',origin,env,{...scope,classification:'UNKNOWN',expectedObjects:plan.items.length,canPublish:false});
   if(method==='POST'){
    // Original server validator re-reads and audits bytes, then CAS commits.
    // Caller revision is independently checked inside that same validator.
    const result=await publish({env,bookId:book,identity,expectedRevision:revision});
    if(result?.published!==true)return reply(409,'recovery-not-published',origin,env,{...scope,classification:result?.reason==='revision-mismatch'?'REVISION_MISMATCH':'UNKNOWN'});
    const after=await readCatalog(env,book);
    if(after.http!==200||!identityDoc(after.doc,identity.uid,revision)||after.doc.fields.status?.stringValue!=='published')return reply(503,'recovery-publish-outcome-unknown',origin,env,{...scope,classification:'UNKNOWN'});
    return reply(200,'recovery-published',origin,env,{...scope,classification:'PUBLISHED_EXACT',verifiedObjects:result.verifiedObjects});
   }
   const result=await audit({bucket:env.DUDU_LIBRARY_EPUB_BUCKET,identity,bookId:book,catalog});
   if(!result||result.checked!==plan.items.length||!Number.isSafeInteger(result.verified)||result.verified<0||result.verified>result.checked||!Array.isArray(result.issues))throw Error('AUDIT');
   if(result.issues.some(issue=>typeof issue!=='string'||/:(?:storage|unreadable)$/.test(issue)))throw Error('AUDIT_UNAVAILABLE');
   const after=await readCatalog(env,book);if(after.http!==200||!sameDocument(doc,after.doc)||!identityDoc(after.doc,identity.uid,revision))return reply(409,'recovery-state-changed',origin,env,{...scope,classification:'UNKNOWN'});
   const complete=result.complete===true&&result.verified===result.checked&&result.issues.length===0;
   return reply(200,'recovery-inspection',origin,env,{...scope,classification:complete?'IMPORTING_COMPLETE':'IMPORTING_INCOMPLETE',expectedObjects:result.checked,verifiedObjects:result.verified,issueCount:result.issues.length,bookSummary,canPublish:complete&&env.LIBRARY_R2_WRITE_ENABLED==='true'&&env.LIBRARY_R2_PIPELINE_ENABLED==='true'});
  }catch{return reply(503,method==='POST'?'recovery-publish-outcome-unknown':'recovery-inspection-unavailable',origin,env,{...scope,classification:'UNKNOWN'});}
 };
}
