// G1W: isolated operator-only immutable COPY of a licensed, content-pinned
// V49 source. Not imported by public Worker or author HTTP. No Firebase SDK.
import {verifyFirebaseIdToken} from './auth.mjs';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const storyId=v=>typeof v==='string'&&!!v.trim()&&v.length<=160&&!/[\p{C}]/u.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const keys=(v,w)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...w].sort().join(',');
const fail=(code='forbidden')=>({ok:false,code});
const MAX_SOURCE_BYTES=1024*1024;

function checkedPlan(p){
 if(!keys(p,['ok','reference','permitRevision','registryInput'])||p.ok!==true||
  !keys(p.reference,['kind','storyId','storyVersion','contentHash'])||p.reference.kind!=='library'||
  !storyId(p.reference.storyId)||!hash(p.reference.contentHash)||
  p.reference.storyVersion!=='sha256-'+p.reference.contentHash||
  !Number.isSafeInteger(p.permitRevision)||p.permitRevision!==1||
  !keys(p.registryInput,['requestId','kind','storyId','storyVersion','authorizedUid','license','sourceNote','proofRef','payload']))
  throw Error('invalid-source-plan');
 const d=p.registryInput;
 if(!uuid(d.requestId)||d.kind!=='library'||d.storyId!==p.reference.storyId||
  d.storyVersion!==p.reference.storyVersion||!uid(d.authorizedUid)||
  !['original','licensed','public_domain'].includes(d.license)||
  typeof d.sourceNote!=='string'||!d.sourceNote.trim()||d.sourceNote.length>2000||
  !(d.proofRef===null||(typeof d.proofRef==='string'&&!!d.proofRef.trim()&&d.proofRef.length<=500))||
  (d.license==='licensed'&&d.proofRef===null)||
  !keys(d.payload,['format','title','chapters'])||d.payload.format!=='story-source-1'||
  typeof d.payload.title!=='string'||!d.payload.title.trim()||!Array.isArray(d.payload.chapters)||
  d.payload.chapters.length<1||d.payload.chapters.length>5000||
  d.payload.chapters.some(c=>!keys(c,['chapterId','title','text'])||
   !storyId(c.chapterId)||typeof c.title!=='string'||!c.title.trim()||c.title.length>500||
   typeof c.text!=='string'||!c.text.trim())||
  new Set(d.payload.chapters.map(c=>c.chapterId)).size!==d.payload.chapters.length)
  throw Error('invalid-source-plan');
 const json=JSON.stringify(d.payload);
 if(new TextEncoder().encode(json).byteLength>MAX_SOURCE_BYTES)throw Error('source-too-large');
 return {d,json};
}

/**
 * Requires existing G1R/G1U registry tables and one shared SQLite authority.
 * Invoking the factory creates an OFFLINE table; do not bind to live storage.
 */
export function createSqlFrozenSourceService({storage,projectId,verify=verifyFirebaseIdToken,
 registerSource,now=Date.now}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||
  typeof registerSource!=='function'||typeof now!=='function')
  throw new TypeError('G1W requires trusted SQLite registry and identity adapters');
 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_source_freezes_v1(
   story_id TEXT NOT NULL,content_hash TEXT NOT NULL,authorized_uid TEXT NOT NULL,
   payload_json TEXT NOT NULL,created_at INTEGER NOT NULL CHECK(created_at>=0),
   PRIMARY KEY(story_id,content_hash))`);
  for(const op of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_authoring_source_freezes_${op.toLowerCase()}_v1
   BEFORE ${op} ON vg_authoring_source_freezes_v1 BEGIN SELECT RAISE(ABORT,'immutable-source-freeze'); END`);
 });
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray(),one=(q,...args)=>all(q,...args)[0]||null;
 const isOperator=user=>!!one("SELECT uid FROM vg_authoring_registry_operators_v1 WHERE uid=? AND status='active'",user);
 async function operator(request){
  try{const who=await verify(request,projectId);return uid(who?.uid)?who.uid:null;}catch{return null;}
 }
 function permit(story,contentHash){
  const row=one('SELECT * FROM vg_authoring_adaptation_permits_v1 WHERE story_id=? AND content_hash=?',story,contentHash);
  if(!row||row.status!=='active'||row.revision!==1)return null;
  const p=JSON.parse(row.permit_json);
  return p.storyId===story&&p.contentHash===contentHash&&uid(p.authorizedUid)&&
   ['original','licensed','public_domain'].includes(p.license)&&
   typeof p.sourceNote==='string'&&(p.proofRef===null||typeof p.proofRef==='string')?p:null;
 }

 async function freezePrepared(request,input){
  let p,d,json;
  try{p=copyAuthoringJson(input);({d,json}=checkedPlan(p));}catch{return fail('invalid-plan');}
  const user=await operator(request);if(!user)return fail('unauthenticated');
  try{
   if(!isOperator(user))return fail();
   if(await hashAuthoringJson(d.payload)!==p.reference.contentHash)return fail('invalid-plan');
   const digest=await hashAuthoringJson({action:'source:freeze',plan:p});
   return storage.transactionSync(()=>{
    if(!isOperator(user))return fail();
    const current=permit(p.reference.storyId,p.reference.contentHash);
    if(!current||current.authorizedUid!==d.authorizedUid||current.license!==d.license||
     current.sourceNote!==d.sourceNote||current.proofRef!==d.proofRef)return fail();
    const prior=one("SELECT * FROM vg_authoring_registry_operations_v1 WHERE scope='source-freeze' AND actor_uid=? AND request_id=?",user,d.requestId);
    if(prior)return prior.action==='source:freeze'&&prior.request_hash===digest?
     {...JSON.parse(prior.result_json),replayed:true}:fail('idempotency-conflict');
    if(one('SELECT content_hash FROM vg_authoring_source_freezes_v1 WHERE story_id=? AND content_hash=?',p.reference.storyId,p.reference.contentHash))
     return fail('version-conflict');
    const t=now();if(!Number.isSafeInteger(t)||t<0)throw Error('invalid-clock');
    storage.sql.exec('INSERT INTO vg_authoring_source_freezes_v1 VALUES(?,?,?,?,?)',
     p.reference.storyId,p.reference.contentHash,d.authorizedUid,json,t);
    const result={ok:true,storyId:p.reference.storyId,contentHash:p.reference.contentHash,
     storyVersion:p.reference.storyVersion};
    storage.sql.exec('INSERT INTO vg_authoring_registry_operations_v1 VALUES(?,?,?,?,?,?)',
     'source-freeze',user,d.requestId,'source:freeze',digest,JSON.stringify(result));
    storage.sql.exec('INSERT INTO vg_authoring_registry_events_v1 VALUES(?,?,?,?,?,?,?,?,?)',
     crypto.randomUUID(),'source-freeze',user,d.requestId,'source:freeze',p.reference.contentHash,0,1,t);
    return {...result,replayed:false};
   });
  }catch{return fail('freeze-unavailable');}
 }

 async function registerFrozen(request,input){
  let d;
  try{d=copyAuthoringJson(input);
   if(!keys(d,['requestId','storyId','contentHash'])||!uuid(d.requestId)||!storyId(d.storyId)||!hash(d.contentHash))
    return fail('invalid-request');
  }catch{return fail('invalid-request');}
  const user=await operator(request);if(!user)return fail('unauthenticated');
  let state;
  try{
   if(!isOperator(user))return fail();
   state=storage.transactionSync(()=>{
    if(!isOperator(user))return null;
    const source=one('SELECT * FROM vg_authoring_source_freezes_v1 WHERE story_id=? AND content_hash=?',d.storyId,d.contentHash);
    const current=permit(d.storyId,d.contentHash);
    return source&&current&&source.authorized_uid===current.authorizedUid?{source,current}:null;
   });
   if(!state)return fail();
   const payload=copyAuthoringJson(JSON.parse(state.source.payload_json));
   if(await hashAuthoringJson(payload)!==d.contentHash)return fail('snapshot-corrupt');
   const p=state.current;
   // G1F rechecks the permit inside its SQL register transaction. Its
   // receipt/revocation semantics remain authoritative during races.
   return await registerSource(request,{requestId:d.requestId,kind:'library',storyId:d.storyId,
    storyVersion:'sha256-'+d.contentHash,authorizedUid:p.authorizedUid,license:p.license,
    sourceNote:p.sourceNote,proofRef:p.proofRef,payload});
  }catch{return fail('freeze-unavailable');}
 }

 return Object.freeze({freezePrepared,registerFrozen});
}
