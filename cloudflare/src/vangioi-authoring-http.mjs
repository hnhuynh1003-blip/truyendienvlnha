// G1K: opt-in local transport. Not imported by the live Worker or exported as a DO.
import {verifyFirebaseIdToken} from './auth.mjs';
import {createSqlAuthoringService} from './vangioi-authoring-sql.mjs';
import {createSqlRegistryService} from './vangioi-registry.mjs';
import {createSqlProvisioningService} from './vangioi-provisioning.mjs';

export const AUTHORING_HTTP_MAX_BYTES=2*1024*1024;
const BASE='/api/vangioi/authoring/v1';
const WORLD='([a-z][a-z0-9-]{1,63})',HASH='([a-f0-9]{64})';
const sourceActions=new Set(['listSources','sourceManifest','sourceRange']);
const routes=[
 ['POST',new RegExp(`^${BASE}/worlds/${WORLD}/sources/query$`),'listSources'],
 ['POST',new RegExp(`^${BASE}/worlds/${WORLD}/sources/manifest$`),'sourceManifest'],
 ['POST',new RegExp(`^${BASE}/worlds/${WORLD}/sources/range$`),'sourceRange'],
 ['POST',new RegExp(`^${BASE}/worlds$`),'createWorld'],
 ['GET',new RegExp(`^${BASE}/worlds/${WORLD}/draft$`),'viewDraft'],
 ['PATCH',new RegExp(`^${BASE}/worlds/${WORLD}/draft$`),'saveDraft'],
 ['PUT',new RegExp(`^${BASE}/worlds/${WORLD}/collaborators$`),'setCollaborator'],
 ['POST',new RegExp(`^${BASE}/worlds/${WORLD}/submissions$`),'submitDraft'],
 ['GET',new RegExp(`^${BASE}/worlds/${WORLD}/submissions/${HASH}$`),'viewSubmission'],
 ['GET',new RegExp(`^${BASE}/worlds/${WORLD}/submissions/${HASH}/review$`),'reviewSubmission'],
 ['POST',new RegExp(`^${BASE}/worlds/${WORLD}/submissions/${HASH}/decisions$`),'recordReview'],
 ['GET',new RegExp(`^${BASE}/worlds/${WORLD}/submissions/${HASH}/decisions$`),'viewReviewDecision'],
 ['POST',new RegExp(`^${BASE}/worlds/${WORLD}/submissions/${HASH}/reopen$`),'reopenDraft']
];
const statuses={'registry-unavailable':503,'payload-integrity-conflict':409,'invalid-chapter-range':422,unauthenticated:401,forbidden:403,'invalid-request':400,'invalid-content':422,
 'content-not-ready':422,'revision-conflict':409,'idempotency-conflict':409,'world-conflict':409,
 'member-conflict':409,'review-conflict':409,'dependency-conflict':409,'invalid-submission':409,'authoring-unavailable':503,'validator-unavailable':503};
class TransportError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
const reject=(code,status)=>{throw new TransportError(code,status);};
async function readJson(request){
 if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))
  reject('unsupported-media-type',415);
 if(request.headers.has('content-encoding'))reject('unsupported-content-encoding',415);
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||!Number.isSafeInteger(Number(declared))))reject('invalid-request',400);
 if(Number(declared)>AUTHORING_HTTP_MAX_BYTES)reject('payload-too-large',413);
 if(!request.body)reject('invalid-request',400);
 const reader=request.body.getReader(),chunks=[];let length=0,finished=false;
 try{
  while(true){
   const part=await reader.read();if(part.done){finished=true;break;}
   length+=part.value.byteLength;
   if(length>AUTHORING_HTTP_MAX_BYTES)reject('payload-too-large',413);
   chunks.push(part.value);
  }
  if(declared!==null&&Number(declared)!==length)reject('invalid-request',400);
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let data;
  try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{reject('invalid-json',400);}
  if(!data||typeof data!=='object'||Array.isArray(data))reject('invalid-request',400);
  return data;
 }finally{
  if(!finished)try{await reader.cancel();}catch{}
  reader.releaseLock();
 }
}

export function createAuthoringHttpHandler({storage,projectId,allowedOrigins,
 verify=verifyFirebaseIdToken,now=Date.now}={}){
 if(!Array.isArray(allowedOrigins)||allowedOrigins.length===0||allowedOrigins.some(origin=>{
  try{return new URL(origin).origin!==origin||!/^https:\/\//.test(origin);}catch{return true;}
 }))throw new TypeError('Explicit HTTPS authoring origins required');
 const origins=new Set(allowedOrigins);
 const options={storage,projectId,verify,now};
 const authoring=createSqlAuthoringService(options),provisioning=createSqlProvisioningService(options);
 let registry; // Initialize the isolated registry only for an explicit source request.
 return async function handle(request){
  let origin;
  function reply(body,status=200,extra={}){
   return new Response(body===null?null:JSON.stringify(body),{status,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff','Vary':'Origin',
    ...(origin?{'Access-Control-Allow-Origin':origin}:{}),...extra}});
  }
  try{
   const url=new URL(request.url),suppliedOrigin=request.headers.get('origin');
   if(suppliedOrigin!==null){
    if(!origins.has(suppliedOrigin))return reply({ok:false,code:'origin-forbidden'},403);
    origin=suppliedOrigin;
   }
   const matches=routes.map(([method,re,action])=>({method,action,match:re.exec(url.pathname)})).filter(r=>r.match);
   if(!matches.length)return reply({ok:false,code:'not-found'},404);
   if(url.search)return reply({ok:false,code:'invalid-request'},400);
   const methods=matches.map(r=>r.method),allow=[...methods,'OPTIONS'].join(', ');
   if(request.method==='OPTIONS'){
    const requested=request.headers.get('access-control-request-method');
    const headers=(request.headers.get('access-control-request-headers')||'').split(',').map(h=>h.trim().toLowerCase()).filter(Boolean);
    if(!origin||!methods.includes(requested)||headers.some(h=>!['authorization','content-type'].includes(h)))
     return reply({ok:false,code:'preflight-forbidden'},403);
    return reply(null,204,{'Allow':allow,'Access-Control-Allow-Methods':methods.join(', '),
     'Access-Control-Allow-Headers':'Authorization, Content-Type'});
   }
   const route=matches.find(r=>r.method===request.method);
   if(!route)return reply({ok:false,code:'method-not-allowed'},405,{Allow:allow});
   const token=request.headers.get('authorization')||'';
   if(token.length>8192||!/^Bearer [^\s]+$/.test(token))return reply({ok:false,code:'unauthenticated'},401);
   // Bound memory before parsing; authenticate before even reading the stream.
   // Services independently recheck the original token and live membership at commit.
   const who=await verify(request,projectId);
   if(typeof who?.uid!=='string'||!who.uid||who.uid.length>128||/[\p{C}]/u.test(who.uid))
    return reply({ok:false,code:'unauthenticated'},401);
   let input={};
   if(route.method==='GET'){
    if(request.body!==null)return reply({ok:false,code:'invalid-request'},400);
   }else input=await readJson(request);
   // URL identity is authoritative. Do not overwrite an identity smuggled in JSON.
   if(Object.hasOwn(input,'worldId')||Object.hasOwn(input,'snapshotHash')||Object.hasOwn(input,'forReview'))
    return reply({ok:false,code:'invalid-request'},400);
   if(route.match[1])input.worldId=route.match[1];
   if(route.match[2])input.snapshotHash=route.match[2];
   let result;
   if(sourceActions.has(route.action)){
    registry ||= createSqlRegistryService(options);
    result=await registry[route.action](request,input);
   }else if(route.action==='reviewSubmission')result=await authoring.viewSubmission(request,{...input,forReview:true});
   else if(route.action==='recordReview')result=await authoring.reviewSubmission(request,input);
   else if(['createWorld','setCollaborator'].includes(route.action))result=await provisioning[route.action](request,input);
   else result=await authoring[route.action](request,input);
   if(result?.ok===true)return reply(result);
   // Return only public service codes; never exception text or storage diagnostics.
   const status=statuses[result?.code];
   return reply({ok:false,code:status?result.code:'authoring-unavailable'},status||503);
  }catch(error){
   if(error instanceof TransportError)return reply({ok:false,code:error.code},error.status);
   return reply({ok:false,code:'authoring-unavailable'},503);
  }
 };
}
