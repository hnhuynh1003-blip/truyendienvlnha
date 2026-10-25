// G1E isolated provisioning. No HTTP route, live binding or entitlement issuer.
import {verifyFirebaseIdToken} from './auth.mjs';
import {initializeAuthoringSchema} from './vangioi-authoring-sql.mjs';
import {AUTHORING_FIELDS,copyAuthoringContent,copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
import {validateDraftContent} from './vangioi-content.mjs';

const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const rev=v=>Number.isSafeInteger(v)&&v>=1;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...list].sort().join(',');
const fail=(code='forbidden')=>({ok:false,code});

export function createSqlProvisioningService({storage,projectId,verify=verifyFirebaseIdToken,now=Date.now}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||typeof now!=='function')
  throw new TypeError('Provisioning requires trusted storage and identity adapters');
 initializeAuthoringSchema(storage);
 storage.transactionSync(()=>{
  // Only a future trusted platform adapter may issue/revoke entitlements. JWT
  // admin, browser canEditStories and author JSON do not populate this table.
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_entitlements_v1(
   uid TEXT PRIMARY KEY,status TEXT NOT NULL CHECK(status IN ('active','revoked')),
   can_create_world INTEGER NOT NULL CHECK(can_create_world IN (0,1)),
   entitlement_revision INTEGER NOT NULL CHECK(entitlement_revision>=1))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_access_events_v1(
   event_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,actor_uid TEXT NOT NULL,target_uid TEXT NOT NULL,
   request_id TEXT NOT NULL,from_access_revision INTEGER NOT NULL,to_access_revision INTEGER NOT NULL,
   status TEXT NOT NULL,sections_json TEXT NOT NULL,happened_at INTEGER NOT NULL,
   UNIQUE(world_id,actor_uid,request_id))`);
  for(const op of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS
   vg_authoring_access_events_${op.toLowerCase()}_v1 BEFORE ${op} ON vg_authoring_access_events_v1
   BEGIN SELECT RAISE(ABORT,'immutable-authoring-record'); END`);
 });
 const one=(q,...args)=>storage.sql.exec(q,...args).toArray()[0]||null;
 const clock=()=>{const t=now();if(!Number.isSafeInteger(t)||t<0)throw Error('invalid-clock');return t;};
 function receipt(worldId,actorUid,requestId,action,digest){
  const r=one(`SELECT * FROM vg_authoring_operations_v1 WHERE world_id=? AND actor_uid=? AND request_id=?`,worldId,actorUid,requestId);
  if(!r)return null;
  if(r.action!==action||r.request_hash!==digest)return fail('idempotency-conflict');
  return {...JSON.parse(r.result_json),replayed:true};
 }
 function record(data,actorUid,action,digest,result,from,to,timestamp){
  storage.sql.exec(`INSERT INTO vg_authoring_operations_v1 VALUES(?,?,?,?,?,?)`,
   result.worldId,actorUid,data.requestId,action,digest,JSON.stringify(result));
  storage.sql.exec(`INSERT INTO vg_authoring_audit_v1 VALUES(?,?,?,?,?,?,?,?,?)`,
   crypto.randomUUID(),result.worldId,actorUid,data.requestId,action,from,to,null,timestamp);
  return {...result,replayed:false};
 }
 async function mutate(request,input,action){
  let data;
  try{
   data=copyAuthoringJson(input);
   if(action==='create_world'){
    if(!keys(data,['requestId','content'])||!uuid(data.requestId))return fail('invalid-request');
    data.content=copyAuthoringContent(data.content);
    if(!validateDraftContent(data.content).valid)return fail('invalid-content');
   }else{
    if(!keys(data,['worldId','requestId','expectedAccessRevision','memberUid','status','editSections'])||
     !id(data.worldId)||!uuid(data.requestId)||!rev(data.expectedAccessRevision)||!uid(data.memberUid)||
     !['active','revoked'].includes(data.status)||!Array.isArray(data.editSections)||
     data.editSections.some(k=>!AUTHORING_FIELDS.includes(k))||new Set(data.editSections).size!==data.editSections.length||
     (data.status==='active'?data.editSections.length===0:data.editSections.length!==0))return fail('invalid-request');
    data.editSections.sort();
   }
  }catch{return fail('invalid-request');}
  let actorUid;
  try{const who=await verify(request,projectId);if(who&&uid(who.uid))actorUid=who.uid;}catch{}
  if(!actorUid)return fail('unauthenticated');
  try{
   const digest=await hashAuthoringJson({action,...data});
   // Stable server-generated ID: different UIDs never share a creation receipt.
   const worldId=action==='create_world'?'world-'+(await hashAuthoringJson({actorUid,requestId:data.requestId})).slice(0,40):data.worldId;
   return storage.transactionSync(()=>{
    const w=one('SELECT * FROM vg_authoring_worlds_v1 WHERE world_id=?',worldId);
    if(action==='create_world'){
     const e=one('SELECT * FROM vg_authoring_entitlements_v1 WHERE uid=?',actorUid);
     if(!e||e.status!=='active'||e.can_create_world!==1||!rev(e.entitlement_revision))return fail();
     if(w&&w.owner_uid!==actorUid)return fail();
     const prior=receipt(worldId,actorUid,data.requestId,action,digest);if(prior)return prior;
     if(w)return fail('world-conflict');
     const t=clock();
     storage.sql.exec(`INSERT INTO vg_authoring_worlds_v1 VALUES(?,?,1,1,'draft',?)`,worldId,actorUid,JSON.stringify([actorUid]));
     storage.sql.exec(`INSERT INTO vg_authoring_drafts_v1 VALUES(?,1,?)`,worldId,JSON.stringify(data.content));
     return record(data,actorUid,action,digest,{ok:true,worldId,revision:1,accessRevision:1,state:'draft'},0,1,t);
    }
    // The verified owner alone manages collaborator scopes, never platform roles.
    // Recheck inside the same transaction used for receipt and membership writes.
    if(!w||w.owner_uid!==actorUid||data.memberUid===actorUid)return fail();
    const prior=receipt(worldId,actorUid,data.requestId,action,digest);if(prior)return prior;
    if(w.access_revision!==data.expectedAccessRevision||!rev(w.access_revision+1))return fail('revision-conflict');
    const m=one('SELECT * FROM vg_authoring_members_v1 WHERE world_id=? AND uid=?',worldId,data.memberUid);
    if(m&&JSON.stringify(JSON.parse(m.roles_json))!==JSON.stringify(['collaborator']))return fail();
    if(!m&&data.status==='revoked')return fail('member-conflict');
    const t=clock(),next=w.access_revision+1;
    storage.sql.exec(`INSERT INTO vg_authoring_members_v1 VALUES(?,?,?,?,?) ON CONFLICT(world_id,uid)
     DO UPDATE SET status=excluded.status,roles_json=excluded.roles_json,sections_json=excluded.sections_json`,
     worldId,data.memberUid,data.status,JSON.stringify(['collaborator']),JSON.stringify(data.editSections));
    storage.sql.exec('UPDATE vg_authoring_worlds_v1 SET access_revision=? WHERE world_id=?',next,worldId);
    storage.sql.exec(`INSERT INTO vg_authoring_access_events_v1 VALUES(?,?,?,?,?,?,?,?,?,?)`,
     crypto.randomUUID(),worldId,actorUid,data.memberUid,data.requestId,w.access_revision,next,
     data.status,JSON.stringify(data.editSections),t);
    return record(data,actorUid,action,digest,{ok:true,worldId,accessRevision:next},w.draft_revision,w.draft_revision,t);
   });
  }catch{return fail('authoring-unavailable');}
 }
 return Object.freeze({
  createWorld:(request,input)=>mutate(request,input,'create_world'),
  setCollaborator:(request,input)=>mutate(request,input,'set_collaborator')
 });
}
