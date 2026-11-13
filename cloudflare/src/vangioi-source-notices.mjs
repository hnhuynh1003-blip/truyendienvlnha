// G1X: offline, operator-only rights-notice journal. An open notice is a
// temporary access hold, NOT a license finding or automatic G1R revocation.
import {verifyFirebaseIdToken} from './auth.mjs';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const short=(v,n)=>typeof v==='string'&&!!v.trim()&&v.length<=n&&!/[\p{C}]/u.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const keys=(v,w)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...w].sort().join(',');
const fail=(code='forbidden')=>({ok:false,code});
const reasons=new Set(['rights_dispute','source_unpublished','owner_report']);

export function createSqlSourceNoticeService({storage,projectId,verify=verifyFirebaseIdToken,now=Date.now}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||typeof now!=='function')
  throw new TypeError('G1X requires existing trusted G1R/G1U SQL authority');
 // Registry schema (including notices/receipts/audit) must be initialized by
 // the trusted host. No live binding or migration is created here.
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray();
 const one=(q,...args)=>all(q,...args)[0]||null;
 const isOperator=user=>!!one("SELECT uid FROM vg_authoring_registry_operators_v1 WHERE uid=? AND status='active'",user);
 async function operator(request){
  try{const who=await verify(request,projectId);return uid(who?.uid)?who.uid:null;}catch{return null;}
 }
 function receipt(user,d,action,digest){
  const r=one("SELECT * FROM vg_authoring_registry_operations_v1 WHERE scope='notices' AND actor_uid=? AND request_id=?",user,d.requestId);
  if(!r)return null;
  return r.action===action&&r.request_hash===digest?{...JSON.parse(r.result_json),replayed:true}:fail('idempotency-conflict');
 }
 function record(user,d,action,digest,noticeId,from,to,result){
  const t=now();if(!Number.isSafeInteger(t)||t<0)throw Error('invalid-clock');
  storage.sql.exec('INSERT INTO vg_authoring_registry_operations_v1 VALUES(?,?,?,?,?,?)',
   'notices',user,d.requestId,action,digest,JSON.stringify(result));
  storage.sql.exec('INSERT INTO vg_authoring_registry_events_v1 VALUES(?,?,?,?,?,?,?,?,?)',
   crypto.randomUUID(),'notices',user,d.requestId,action,noticeId,from,to,t);
  return {...result,replayed:false};
 }

 async function action(request,input,mode){
  let d;
  try{
   d=copyAuthoringJson(input);
   if(mode==='open'){
    if(!keys(d,['requestId','storyId','contentHash','reason','evidenceRef'])||
     !uuid(d.requestId)||!short(d.storyId,160)||!hash(d.contentHash)||!reasons.has(d.reason)||
     !(d.evidenceRef===null||short(d.evidenceRef,500))||
     (d.reason!=='source_unpublished'&&d.evidenceRef===null))return fail('invalid-request');
   }else if(!keys(d,['requestId','noticeId','expectedRevision','decision','note'])||
    !uuid(d.requestId)||!uuid(d.noticeId)||d.expectedRevision!==1||
    !['release','confirm_revoke'].includes(d.decision)||!short(d.note,2000))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  const user=await operator(request);if(!user)return fail('unauthenticated');
  try{
   if(!isOperator(user))return fail();
   const name=mode==='open'?'notice:open':'notice:'+d.decision;
   const digest=await hashAuthoringJson({action:name,...d});
   return storage.transactionSync(()=>{
    if(!isOperator(user))return fail();
    const prior=receipt(user,d,name,digest);if(prior)return prior;
    if(mode==='open'){
     const noticeId=crypto.randomUUID(),t=now();if(!Number.isSafeInteger(t)||t<0)throw Error('invalid-clock');
     storage.sql.exec(`INSERT INTO vg_authoring_source_notices_v1
      (notice_id,story_id,content_hash,reason,evidence_ref,opened_by,opened_at,status,revision,resolution_note)
      VALUES(?,?,?,?,?,?,?,'open',1,NULL)`,noticeId,d.storyId,d.contentHash,d.reason,d.evidenceRef,user,t);
     return record(user,d,name,digest,noticeId,0,1,{ok:true,noticeId,
      storyId:d.storyId,contentHash:d.contentHash,status:'open',revision:1});
    }
    const n=one('SELECT * FROM vg_authoring_source_notices_v1 WHERE notice_id=?',d.noticeId);
    if(!n||n.status!=='open'||n.revision!==d.expectedRevision)return fail('revision-conflict');
    if(d.decision==='confirm_revoke'){
     // Rights revocation must have committed through G1R FIRST. This call
     // only closes the notice and cannot alter permits or grant rights.
     const p=one('SELECT status FROM vg_authoring_adaptation_permits_v1 WHERE story_id=? AND content_hash=?',n.story_id,n.content_hash);
     if(p?.status!=='revoked')return fail('revoke-required');
    }
    const status=d.decision==='release'?'released':'revoked';
    storage.sql.exec('UPDATE vg_authoring_source_notices_v1 SET status=?,revision=2,resolution_note=? WHERE notice_id=?',
     status,d.note,d.noticeId);
    return record(user,d,name,digest,d.noticeId,1,2,{ok:true,noticeId:d.noticeId,
     storyId:n.story_id,contentHash:n.content_hash,status,revision:2});
   });
  }catch{return fail('notices-unavailable');}
 }

 async function readNotice(request,input){
  let d;
  try{d=copyAuthoringJson(input);if(!keys(d,['noticeId'])||!uuid(d.noticeId))return fail('invalid-request');}
  catch{return fail('invalid-request');}
  const user=await operator(request);if(!user)return fail('unauthenticated');
  try{return storage.transactionSync(()=>{
   if(!isOperator(user))return fail();
   const n=one('SELECT * FROM vg_authoring_source_notices_v1 WHERE notice_id=?',d.noticeId);
   return n?{ok:true,notice:{noticeId:n.notice_id,storyId:n.story_id,contentHash:n.content_hash,
    reason:n.reason,status:n.status,revision:n.revision}}:fail();
  });}catch{return fail('notices-unavailable');}
 }

 return Object.freeze({openNotice:(r,d)=>action(r,d,'open'),
  resolveNotice:(r,d)=>action(r,d,'resolve'),readNotice});
}
