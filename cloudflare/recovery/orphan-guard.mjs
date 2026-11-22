// New recovery module, not a copy of the deployed Worker. No Firestore/R2 writes here.
const BOOK=/^epub-[a-f0-9]{32}$/,REV=/^r-[a-f0-9]{32}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const ROOT='/v1/library/r2/',ORPHAN=/^\/v1\/library\/r2\/catalog\/(epub-[a-f0-9]{32})\/orphan\/(inspect|close)$/;
export const isRecoveryPath=path=>ORPHAN.test(path);
export async function boundedJson(request,max=2048){
 const reader=request.body?.getReader();if(!reader)throw Error('BODY');let text='',size=0;const decoder=new TextDecoder();
 try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>max)throw Error('BODY');text+=decoder.decode(r.value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function createGuard({storage,legacy,verifyIdentity,readCatalog,bucket,owner,env,now=Date.now,random=()=>crypto.randomUUID()}){
 let tail=Promise.resolve();
 const reply=(status,code,data={})=>Response.json({ok:status<300,code,...data},{status,headers:{'Cache-Control':'private, no-store','Vary':'Origin','Access-Control-Allow-Origin':env.ALLOWED_ORIGIN,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 const serial=fn=>{const task=tail.then(fn);tail=task.catch(()=>{});return task;};
 async function absence(book,revision){
  const classify=d=>{
   if(d?.found===false)return null;
   if(d?.found!==true||d.ownerUid!==owner||d.backend!=='r2')return 'UNKNOWN';
   if(d.revision!==revision)return 'REVISION_MISMATCH';
   return ['draft','importing','published'].includes(d.status)?d.status.toUpperCase():'UNKNOWN';
  };
  const first=await readCatalog(book),status=classify(first);if(status)return {classification:status};
  // A conflicting revision under this book also blocks closure; never fence a book with orphaned data.
  const prefixes=[`quarantine/epub/${owner}/${book}/`,...['originals','chapters','layouts','assets'].map(p=>`${p}/${book}/`)];
  for(const prefix of prefixes){const page=await bucket.list({prefix,limit:1});if(!Array.isArray(page?.objects)||page.truncated!==false||(page.delimitedPrefixes?.length||0))return {classification:'UNKNOWN'};if(page.objects.length)return {classification:'UNKNOWN',reason:'OBJECTS_PRESENT'};}
  const last=classify(await readCatalog(book));return {classification:last||'NOT_FOUND',...(last?{}:{emptyPrefixes:5})};
 }
 async function handle(request){
  const url=new URL(request.url),match=ORPHAN.exec(url.pathname);
  if(request.headers.get('Origin')!==env.ALLOWED_ORIGIN)return reply(403,'origin-blocked');
  if(match&&request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':env.ALLOWED_ORIGIN,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin'}});
  let identity;try{identity=await verifyIdentity(request,env.PROJECT_ID);}catch{}
  if(!identity?.uid)return reply(401,'unauthenticated');
  if(identity.uid!==owner||identity.admin!==true||env.LIBRARY_R2_PILOT_OWNER_UID!==owner)return reply(403,'owner-only');
  if(env.LIBRARY_R2_ENABLED!=='true')return reply(503,'library-r2-disabled');
  if(request.method!=='POST')return reply(405,'method-not-allowed');
  if(await storage.get('active'))return reply(503,'write-outcome-unknown');
  if(match){
   if(env.LIBRARY_R2_ORPHAN_CLOSE_ENABLED!=='true'||env.LIBRARY_R2_ORPHAN_LEGACY_DRAIN_VERIFIED!=='true')return reply(503,'recovery-not-activated');
   if(url.search||!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return reply(400,'bad-request');
   let data;try{data=await boundedJson(request);}catch{return reply(400,'bad-request');}
   const [_,book,action]=match;
   if(!data||!REV.test(data.revisionId||'')||data.phase!=='draft')return reply(400,'bad-session');
   const keys=action==='inspect'?'phase,revisionId':'action,phase,proofId,revisionId';
   if(Object.keys(data).sort().join(',')!==keys)return reply(400,'bad-request');
   const closed=await storage.get('closed:'+book);
   if(closed&&(closed.revisionId!==data.revisionId||closed.phase!==data.phase))return reply(409,'session-mismatch');
   if(action==='close'&&data.action!=='CLOSE_ORPHAN_PENDING')return reply(400,'confirmation-required');
   if(action==='close'&&closed&&data.proofId===closed.proofId){const evidence=await absence(book,data.revisionId);return evidence.classification==='NOT_FOUND'?reply(200,'orphan-closed',{receipt:closed}):reply(409,'orphan-not-proven',evidence);}
   const epoch=(await storage.get('epoch'))||0;
   if(action==='close'){
    if(!UUID.test(data.proofId||''))return reply(400,'bad-proof');
    const proof=await storage.get('proof:'+data.proofId);
    if(!proof||proof.uid!==identity.uid||proof.bookId!==book||proof.revisionId!==data.revisionId||proof.phase!==data.phase||proof.epoch!==epoch||now()>=proof.expiresAt)return reply(409,'proof-expired-or-stale');
   }
   const evidence=await absence(book,data.revisionId);
   if(evidence.classification!=='NOT_FOUND')return reply(409,'orphan-not-proven',evidence);
   if(action==='inspect'){
    const proof=closed||{uid:identity.uid,bookId:book,revisionId:data.revisionId,phase:data.phase,proofId:random(),epoch,verifiedAt:now(),expiresAt:now()+60000};
    if(!closed){const proofs=await storage.list({prefix:'proof:',limit:65});for(const [key,p]of proofs)if(p.expiresAt<=now())await storage.delete(key);if((await storage.list({prefix:'proof:',limit:65})).size>=64)return reply(503,'recovery-capacity');await storage.put('proof:'+proof.proofId,proof);}
    return reply(200,'orphan-inspected',{classification:'NOT_FOUND',emptyPrefixes:5,proof});
   }
   const freshProof=await storage.get('proof:'+data.proofId);if(!freshProof||now()>=freshProof.expiresAt)return reply(409,'proof-expired-or-stale');
   const receipt={uid:identity.uid,bookId:book,revisionId:data.revisionId,phase:data.phase,proofId:data.proofId,action:'CLOSE_ORPHAN_PENDING',closedAt:now(),emptyPrefixes:5};
   await storage.put('closed:'+book,receipt); // Permanent fence; never remove on retry or rollback.
   return reply(200,'orphan-closed',{receipt});
  }
  // Every legacy POST is serialized through this same owner actor.
  if(!url.pathname.startsWith(ROOT)||url.search)return reply(404,'not-found');
  let book;
  if(url.pathname===ROOT+'catalog/draft'){
   let body;try{body=await boundedJson(request.clone(),1048576);}catch{return reply(400,'bad-draft');}
   book=body?.manifest?.bookId;
   // This is only a fence routing check. The legacy handler STILL verifies the signed ticket.
   let issued;try{const raw=body.ticket.split('.')[0].replaceAll('-','+').replaceAll('_','/');issued=JSON.parse(atob(raw));}catch{return reply(400,'bad-draft');}
   if(!BOOK.test(book||'')||issued.bookId!==book||issued.revisionId!==body.manifest?.revisionId)return reply(400,'bad-draft');
  }else{book=url.pathname.match(/\/(epub-[a-f0-9]{32})(?:\/|$)/)?.[1];}
  if(book&&await storage.get('closed:'+book))return reply(409,'session-closed');
  await storage.put('active',{operation:random(),startedAt:now()});
  await storage.put('epoch',((await storage.get('epoch'))||0)+1);
  let response;try{response=await legacy(request,env);}catch{return reply(503,'write-outcome-unknown');}
  // Non-success may hide a committed backend write. Retain the intent on uncertainty.
  if(response.status>=200&&response.status<300)await storage.delete('active');
  return response;
 }
 return {fetch:request=>serial(()=>handle(request)).catch(()=>reply(503,'recovery-unavailable'))};
}
