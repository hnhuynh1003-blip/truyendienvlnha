// G2B: operator-only full-set permit projection audit against a fixture replica.
// Read-only on both sides; no sink, Firestore, consumer or live admission wiring.
import {verifyFirebaseIdToken} from './auth.mjs';

const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const short=v=>typeof v==='string'&&!!v.trim()&&v.length<=160&&!/[\p{C}]/u.test(v);
const only=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const fail=(code='forbidden')=>({ok:false,code});
const same=(a,b)=>a.storyId===b.storyId&&a.contentHash===b.contentHash&&
 a.status===b.status&&a.revision===b.revision;
const key=r=>r.storyId+'\u0000'+r.contentHash;

export function createSqlPermitProjectionAudit({storage,projectId,verify=verifyFirebaseIdToken,
 readReplicaSnapshot,environment='fixture',maxRows=1000}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||
  typeof readReplicaSnapshot!=='function'||environment!=='fixture'||
  !Number.isSafeInteger(maxRows)||maxRows<1||maxRows>10000)
  throw new TypeError('G2B requires a trusted bounded offline projection fixture');
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray();
 const one=(q,...args)=>all(q,...args)[0]||null;
 const operator=user=>!!one("SELECT uid FROM vg_authoring_registry_operators_v1 WHERE uid=? AND status='active'",user);

 function authority(user){
  return storage.transactionSync(()=>{
   if(!operator(user))return fail();
   // A copied checkpoint must not hide permits predating G1U's outbox.
   const missing=one(`SELECT story_id FROM vg_authoring_adaptation_permits_v1 p WHERE
    NOT EXISTS(SELECT 1 FROM vg_authoring_permit_outbox_v1 o WHERE
     o.story_id=p.story_id AND o.content_hash=p.content_hash AND o.permit_revision=1 AND o.status='active')
    OR (p.status='revoked' AND NOT EXISTS(SELECT 1 FROM vg_authoring_permit_outbox_v1 o WHERE
     o.story_id=p.story_id AND o.content_hash=p.content_hash AND o.permit_revision=p.revision AND o.status='revoked')) LIMIT 1`);
   if(missing)return fail('baseline-required');
   const count=one('SELECT COUNT(*) AS n FROM vg_authoring_adaptation_permits_v1')?.n;
   if(!Number.isSafeInteger(count)||count<0)return fail('invalid-authority');
   if(count>maxRows)return fail('audit-limit');
   const head=one('SELECT COALESCE(MAX(seq),0) AS seq FROM vg_authoring_permit_outbox_v1')?.seq;
   if(!Number.isSafeInteger(head)||head<0)return fail('invalid-authority');
   const rows=all('SELECT story_id,content_hash,status,revision FROM vg_authoring_adaptation_permits_v1 ORDER BY story_id,content_hash')
    .map(r=>({storyId:r.story_id,contentHash:r.content_hash,status:r.status,revision:r.revision}));
   if(rows.length!==count||rows.some(r=>!short(r.storyId)||!hash(r.contentHash)||
    !['active','revoked'].includes(r.status)||!Number.isSafeInteger(r.revision)||r.revision<1))
    return fail('invalid-authority');
   return {ok:true,head,rows};
  });
 }

 function validReplica(snapshot){
  if(!only(snapshot,['projectId','environment','checkpoint','entries'])||
   snapshot.projectId!==projectId||snapshot.environment!=='fixture'||
   !Number.isSafeInteger(snapshot.checkpoint)||snapshot.checkpoint<0||
   !Array.isArray(snapshot.entries)||snapshot.entries.length>maxRows)return false;
  const seen=new Set();
  for(const entry of snapshot.entries){
   if(!only(entry,['storyId','contentHash','status','revision'])||!short(entry.storyId)||
    !hash(entry.contentHash)||!['active','revoked'].includes(entry.status)||
    !Number.isSafeInteger(entry.revision)||entry.revision<1||seen.has(key(entry)))return false;
   seen.add(key(entry));
  }
  return true;
 }

 async function auditProjection(request){
  let user;
  try{const who=await verify(request,projectId);if(uid(who?.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   if(!operator(user))return fail();
   const before=authority(user);
   if(!before.ok)return before;
   // This callback is supplied by a trusted fixture host and must read the
   // replica's checkpoint AND entries in one consistent read-only snapshot.
   const replica=await readReplicaSnapshot({projectId,environment:'fixture'});
   if(!validReplica(replica))return fail('invalid-projection');
   const after=authority(user);
   if(!after.ok)return after;
   if(after.head!==before.head||after.rows.length!==before.rows.length||
    after.rows.some((r,i)=>!same(r,before.rows[i])))return fail('authority-changed');
   if(replica.checkpoint<after.head)return fail('checkpoint-lag');
   if(replica.checkpoint>after.head)return fail('checkpoint-ahead');
   if(replica.entries.length!==after.rows.length)return fail('projection-mismatch');
   const entries=new Map(replica.entries.map(r=>[key(r),r]));
   if(after.rows.some(r=>!entries.has(key(r))||!same(r,entries.get(key(r)))))
    return fail('projection-mismatch');
   return {ok:true,fixtureAuditPassed:true,projectId,environment:'fixture',
    checkpoint:after.head,permitCount:after.rows.length,auditVersion:'permit-projection-1'};
  }catch{return fail('projection-audit-unavailable');}
 }
 return Object.freeze({auditProjection});
}
