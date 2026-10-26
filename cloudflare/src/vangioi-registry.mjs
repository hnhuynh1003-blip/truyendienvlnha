// G1F: isolated trusted intake + per-world registry grants. No public routes.
import {parseRegistryPng as png} from './vangioi-png.mjs';
import {verifyFirebaseIdToken} from './auth.mjs';
import {initializeAuthoringSchema} from './vangioi-authoring-sql.mjs';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const short=(v,max)=>typeof v==='string'&&!!v.trim()&&v.length<=max&&!/[\p{C}]/u.test(v);
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const rev=v=>Number.isSafeInteger(v)&&v>=0&&v<Number.MAX_SAFE_INTEGER;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...list].sort().join(',');
const sourceRef=r=>keys(r,['kind','storyId','storyVersion','contentHash'])&&['original','library','manuscript'].includes(r.kind)&&
 short(r.storyId,160)&&short(r.storyVersion,100)&&/^[a-f0-9]{64}$/.test(r.contentHash);
const assetKinds=new Set(['other','worldCover','sceneBackground','sceneVariant','itemIcon',
 'characterPortrait','npcPortrait','characterSprite','characterIllustration','characterSilhouette','characterAvatar']);
const assetRef=r=>keys(r,['assetId','assetVersion','kind','contentHash'])&&id(r.assetId)&&short(r.assetVersion,100)&&
 assetKinds.has(r.kind)&&/^[a-f0-9]{64}$/.test(r.contentHash);
const fail=(code='forbidden')=>({ok:false,code});
const rights=d=>uid(d.authorizedUid)&&['original','licensed','public_domain'].includes(d.license)&&
 short(d.sourceNote,2000)&&(d.proofRef===null||short(d.proofRef,500))&&(d.license!=='licensed'||d.proofRef!==null);
const bytesHash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');


export function createSqlRegistryService({storage,projectId,verify=verifyFirebaseIdToken,now=Date.now}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||typeof now!=='function')
  throw new TypeError('Registry requires trusted storage and identity adapters');
 initializeAuthoringSchema(storage);
 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_adaptation_permits_v1(
   story_id TEXT NOT NULL,content_hash TEXT NOT NULL,permit_json TEXT NOT NULL,
   status TEXT NOT NULL CHECK(status IN ('active','revoked')),revision INTEGER NOT NULL,
   PRIMARY KEY(story_id,content_hash))`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_permit_delete_v1 BEFORE DELETE ON vg_authoring_adaptation_permits_v1
   BEGIN SELECT RAISE(ABORT,'immutable-permit'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_permit_update_v1 BEFORE UPDATE ON vg_authoring_adaptation_permits_v1
   WHEN NEW.story_id IS NOT OLD.story_id OR NEW.content_hash IS NOT OLD.content_hash OR NEW.permit_json IS NOT OLD.permit_json
    OR OLD.status!='active' OR NEW.status!='revoked' OR NEW.revision!=OLD.revision+1
   BEGIN SELECT RAISE(ABORT,'immutable-permit'); END`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_registry_operators_v1(
   uid TEXT PRIMARY KEY,status TEXT NOT NULL CHECK(status IN ('active','revoked')))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_registry_objects_v1(
   object_key TEXT PRIMARY KEY,category TEXT NOT NULL CHECK(category IN ('source','asset')),reference_json TEXT NOT NULL,authorized_uid TEXT NOT NULL,
   license TEXT NOT NULL,source_note TEXT NOT NULL,proof_ref TEXT,status TEXT NOT NULL CHECK(status IN ('active','revoked')),
   authority_revision INTEGER NOT NULL CHECK(authority_revision>=1))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_registry_payloads_v1(
   object_key TEXT PRIMARY KEY,payload BLOB NOT NULL,media_type TEXT NOT NULL,width INTEGER,height INTEGER)`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_registry_operations_v1(
   scope TEXT NOT NULL,actor_uid TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,
   request_hash TEXT NOT NULL,result_json TEXT NOT NULL,PRIMARY KEY(scope,actor_uid,request_id))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_registry_events_v1(
   event_id TEXT PRIMARY KEY,scope TEXT NOT NULL,actor_uid TEXT NOT NULL,request_id TEXT NOT NULL,
   action TEXT NOT NULL,object_key TEXT NOT NULL,from_revision INTEGER NOT NULL,to_revision INTEGER NOT NULL,
   happened_at INTEGER NOT NULL,UNIQUE(scope,actor_uid,request_id))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_permit_outbox_v1(
   seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL UNIQUE,
   story_id TEXT NOT NULL,content_hash TEXT NOT NULL,
   permit_revision INTEGER NOT NULL CHECK(permit_revision>=1),
   status TEXT NOT NULL CHECK(status IN ('active','revoked')),
   happened_at INTEGER NOT NULL CHECK(happened_at>=0),
   UNIQUE(story_id,content_hash,permit_revision))`);
  for(const op of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_authoring_permit_outbox_${op.toLowerCase()}_v1
   BEFORE ${op} ON vg_authoring_permit_outbox_v1 BEGIN SELECT RAISE(ABORT,'immutable-permit-outbox'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_authoring_registry_objects_delete_v1
   BEFORE DELETE ON vg_authoring_registry_objects_v1 BEGIN SELECT RAISE(ABORT,'immutable-authoring-record'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_authoring_registry_objects_update_v1
   BEFORE UPDATE ON vg_authoring_registry_objects_v1 WHEN
   NEW.object_key IS NOT OLD.object_key OR NEW.category IS NOT OLD.category OR
   NEW.reference_json IS NOT OLD.reference_json OR NEW.authorized_uid IS NOT OLD.authorized_uid OR
   NEW.license IS NOT OLD.license OR NEW.source_note IS NOT OLD.source_note OR NEW.proof_ref IS NOT OLD.proof_ref OR
   OLD.status!='active' OR NEW.status!='revoked' OR NEW.authority_revision!=OLD.authority_revision+1
   BEGIN SELECT RAISE(ABORT,'immutable-authoring-record'); END`);
  for(const table of ['registry_payloads','registry_operations','registry_events'])for(const op of ['UPDATE','DELETE'])
   storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_authoring_${table}_${op.toLowerCase()}_v1
    BEFORE ${op} ON vg_authoring_${table}_v1 BEGIN SELECT RAISE(ABORT,'immutable-authoring-record'); END`);
 });
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray(),one=(q,...args)=>all(q,...args)[0]||null;
 const isOperator=user=>one("SELECT uid FROM vg_authoring_registry_operators_v1 WHERE uid=? AND status='active'",user)!==null;
 const held=(story,contentHash)=>one(`SELECT notice_id FROM vg_authoring_source_notices_v1
  WHERE story_id=? AND content_hash=? AND status='open' LIMIT 1`,story,contentHash)!==null;
 function receipt(scope,user,d,action,digest){
  const r=one('SELECT * FROM vg_authoring_registry_operations_v1 WHERE scope=? AND actor_uid=? AND request_id=?',scope,user,d.requestId);
  if(!r)return null;if(r.action!==action||r.request_hash!==digest)return fail('idempotency-conflict');
  return {...JSON.parse(r.result_json),replayed:true};
 }
 function record(scope,user,d,action,digest,key,from,to,result){
  const t=now();if(!Number.isSafeInteger(t)||t<0)throw Error('invalid-clock');
  storage.sql.exec('INSERT INTO vg_authoring_registry_operations_v1 VALUES(?,?,?,?,?,?)',scope,user,d.requestId,action,digest,JSON.stringify(result));
  const eventId=crypto.randomUUID();
  storage.sql.exec('INSERT INTO vg_authoring_registry_events_v1 VALUES(?,?,?,?,?,?,?,?,?)',eventId,scope,user,d.requestId,action,key,from,to,t);
  if(scope==='permits')storage.sql.exec('INSERT INTO vg_authoring_permit_outbox_v1(event_id,story_id,content_hash,permit_revision,status,happened_at) VALUES(?,?,?,?,?,?)',
   eventId,result.storyId,result.contentHash,result.revision,result.status,t);
  return {...result,replayed:false};
 }
 async function mutate(request,input,category,action){
  let d,reference,payload,mediaType,width=null,height=null;
  try{
   d=copyAuthoringJson(input);
   if(action==='register'){
    const common=['requestId','authorizedUid','license','sourceNote','proofRef'];
    if(!keys(d,[...common,...(category==='source'?['kind','storyId','storyVersion','payload']:['assetId','assetVersion','kind','pngBase64'])])||!uuid(d.requestId)||!rights(d))return fail('invalid-request');
    if(category==='source'){
     reference={kind:d.kind,storyId:d.storyId,storyVersion:d.storyVersion,contentHash:'0'.repeat(64)};
     if(!sourceRef(reference)||!keys(d.payload,['format','title','chapters'])||d.payload.format!=='story-source-1'||
      !short(d.payload.title,500)||!Array.isArray(d.payload.chapters)||!d.payload.chapters.length||d.payload.chapters.length>5000||
      d.payload.chapters.some(c=>!keys(c,['chapterId','title','text'])||!short(c.chapterId,160)||!short(c.title,500)||
       typeof c.text!=='string'||!c.text.trim())||new Set(d.payload.chapters.map(c=>c.chapterId)).size!==d.payload.chapters.length)return fail('invalid-request');
     payload=new TextEncoder().encode(JSON.stringify(d.payload));
     if(payload.byteLength>1024*1024)return fail('payload-limit');
     mediaType='application/vnd.dudu.story-source+json';
    }else{
     reference={assetId:d.assetId,assetVersion:d.assetVersion,kind:d.kind,contentHash:'0'.repeat(64)};
     if(!assetRef(reference))return fail('invalid-request');
     if(typeof d.pngBase64!=='string'||d.pngBase64.length>1400000)return fail('invalid-request');
    }
   }else{
    const wanted=action==='grant'?['worldId','requestId','expectedAccessRevision','expectedGrantRevision','reference','status']:
     ['requestId','expectedAuthorityRevision','reference'];
    if(!keys(d,wanted)||!uuid(d.requestId)||!(category==='source'?sourceRef(d.reference):assetRef(d.reference)))return fail('invalid-request');
    reference=d.reference;
    if(action==='grant'&&(!id(d.worldId)||!rev(d.expectedAccessRevision)||!d.expectedAccessRevision||
     !rev(d.expectedGrantRevision)||!['active','revoked'].includes(d.status)))return fail('invalid-request');
    if(action==='revoke'&&(!rev(d.expectedAuthorityRevision)||!d.expectedAuthorityRevision))return fail('invalid-request');
   }
  }catch{return fail('invalid-request');}
  let user;
  try{const who=await verify(request,projectId);if(who&&uid(who.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   // Do not decode image bytes or hash payloads for an unassigned account.
   if(action!=='grant'&&!isOperator(user))return fail();
   if(action==='register'){
    if(category==='asset'){
     let image;try{image=png(d.pngBase64);}catch{return fail('invalid-image');}
     payload=image.bytes;width=image.width;height=image.height;mediaType='image/png';
    }
    reference={...reference,contentHash:await bytesHash(payload)};
   }
   const {contentHash,kind,...refId}=reference;
   const objectKey=await hashAuthoringJson({category,...refId,...(category==='source'?{kind}:{})});
   const digest=await hashAuthoringJson({category,action,...d});
   const scope=action==='grant'?'world:'+d.worldId:'catalog';
   return storage.transactionSync(()=>{
    const obj=one('SELECT * FROM vg_authoring_registry_objects_v1 WHERE object_key=?',objectKey);
    let world;
    if(action==='grant'){
     world=one('SELECT * FROM vg_authoring_worlds_v1 WHERE world_id=?',d.worldId);
     if(!world||world.owner_uid!==user)return fail();
     if(d.status==='active'&&(!obj||obj.status!=='active'||obj.authorized_uid!==user))return fail();
    }else if(!isOperator(user))return fail();
    if(action==='register'&&obj?.status==='revoked')return fail();
    if(category==='source'&&kind==='library'&&
     ((action==='register')||(action==='grant'&&d.status==='active'))&&held(reference.storyId,contentHash))return fail('source-held');
    if(category==='source'&&action==='register'&&kind==='library'){
     const permit=one('SELECT * FROM vg_authoring_adaptation_permits_v1 WHERE story_id=? AND content_hash=?',reference.storyId,contentHash);
     if(permit){const p=JSON.parse(permit.permit_json);
      if(permit.status!=='active'||reference.storyVersion!=='sha256-'+contentHash||p.authorizedUid!==d.authorizedUid||
       p.license!==d.license||p.sourceNote!==d.sourceNote||p.proofRef!==d.proofRef)return fail();
     }
    }
    const prior=receipt(scope,user,d,category+':'+action,digest);if(prior)return prior;
    if(action==='register'){
     if(obj)return fail('version-conflict');
     // A pre-existing G1D version is not adopted/relabelled as trusted intake.
     if(category==='source'){
      if(one('SELECT kind FROM vg_authoring_source_versions_v1 WHERE kind=? AND story_id=? AND story_version=?',kind,reference.storyId,reference.storyVersion))return fail('version-conflict');
      storage.sql.exec('INSERT INTO vg_authoring_source_versions_v1 VALUES(?,?,?,?)',kind,reference.storyId,reference.storyVersion,contentHash);
     }else{
      if(one('SELECT asset_id FROM vg_authoring_asset_versions_v1 WHERE asset_id=? AND asset_version=?',reference.assetId,reference.assetVersion))return fail('version-conflict');
      storage.sql.exec('INSERT INTO vg_authoring_asset_versions_v1 VALUES(?,?,?,?)',reference.assetId,reference.assetVersion,contentHash,kind);
     }
     storage.sql.exec('INSERT INTO vg_authoring_registry_objects_v1 VALUES(?,?,?,?,?,?,?,\'active\',1)',
      objectKey,category,JSON.stringify(copyAuthoringJson(reference)),d.authorizedUid,d.license,d.sourceNote,d.proofRef);
     storage.sql.exec('INSERT INTO vg_authoring_registry_payloads_v1 VALUES(?,?,?,?,?)',objectKey,payload.buffer.slice(payload.byteOffset,payload.byteOffset+payload.byteLength),mediaType,width,height);
     return record(scope,user,d,category+':'+action,digest,objectKey,0,1,{ok:true,reference,authorityRevision:1});
    }
    if(!obj||obj.category!==category||obj.reference_json!==JSON.stringify(copyAuthoringJson(reference)))return fail('reference-conflict');
    const source=category==='source',args=source?[reference.kind,reference.storyId,reference.storyVersion]:[reference.assetId,reference.assetVersion];
    const table=source?'vg_authoring_source_grants_v1':'vg_authoring_asset_grants_v1';
    const clause=source?'kind=? AND story_id=? AND story_version=?':'asset_id=? AND asset_version=?';
    if(action==='revoke'){
     if(obj.authority_revision!==d.expectedAuthorityRevision||obj.status!=='active'||!rev(obj.authority_revision))return fail('revision-conflict');
     const grants=all(`SELECT grant_revision FROM ${table} WHERE ${clause}`,...args);
     if(grants.some(g=>!rev(g.grant_revision)))return fail('revision-conflict');
     storage.sql.exec("UPDATE vg_authoring_registry_objects_v1 SET status='revoked',authority_revision=authority_revision+1 WHERE object_key=?",objectKey);
     storage.sql.exec(`UPDATE ${table} SET status='revoked',grant_revision=grant_revision+1 WHERE ${clause}`,...args);
     return record(scope,user,d,category+':'+action,digest,objectKey,obj.authority_revision,obj.authority_revision+1,
      {ok:true,authorityRevision:obj.authority_revision+1,status:'revoked'});
    }
    if(world.access_revision!==d.expectedAccessRevision)return fail('revision-conflict');
    const grant=one(`SELECT * FROM ${table} WHERE world_id=? AND ${clause}`,d.worldId,...args);
    const previous=grant?.grant_revision||0;
    if(previous!==d.expectedGrantRevision||!rev(previous)||(!grant&&d.status==='revoked'))return fail('revision-conflict');
    const next=previous+1;
    if(source)storage.sql.exec(`INSERT INTO vg_authoring_source_grants_v1 VALUES(?,?,?,?,?,?)
     ON CONFLICT(world_id,kind,story_id,story_version) DO UPDATE SET status=excluded.status,grant_revision=excluded.grant_revision`,
     d.worldId,...args,d.status,next);
    else storage.sql.exec(`INSERT INTO vg_authoring_asset_grants_v1 VALUES(?,?,?,?,?,'pending',?,?,?)
     ON CONFLICT(world_id,asset_id,asset_version) DO UPDATE SET status=excluded.status,grant_revision=excluded.grant_revision`,
     d.worldId,...args,d.status,next,obj.license,obj.source_note,obj.proof_ref);
    return record(scope,user,d,category+':'+action,digest,objectKey,previous,next,
     {ok:true,worldId:d.worldId,grantRevision:next,status:d.status});
   });
  }catch{return fail('registry-unavailable');}
 }
 async function read(request,input,category){
  let d;
  try{
   d=copyAuthoringJson(input);
   if(!keys(d,['worldId','reference'])||!id(d.worldId)||
    !(category==='source'?sourceRef(d.reference):assetRef(d.reference)))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  let user;
  try{const who=await verify(request,projectId);if(who&&uid(who.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   const {contentHash,kind,...refId}=d.reference;
   const objectKey=await hashAuthoringJson({category,...refId,...(category==='source'?{kind}:{})});
   function authorized(){
    if(category==='source'&&kind==='library'&&held(d.reference.storyId,contentHash))return null;
    const w=one('SELECT * FROM vg_authoring_worlds_v1 WHERE world_id=?',d.worldId);
    const o=one('SELECT * FROM vg_authoring_registry_objects_v1 WHERE object_key=?',objectKey);
    if(!w||w.owner_uid!==user||!o||o.status!=='active'||o.authorized_uid!==user||
     o.reference_json!==JSON.stringify(copyAuthoringJson(d.reference)))return null;
    const g=category==='source'?one(`SELECT * FROM vg_authoring_source_grants_v1
     WHERE world_id=? AND kind=? AND story_id=? AND story_version=?`,d.worldId,kind,d.reference.storyId,d.reference.storyVersion):
     one(`SELECT * FROM vg_authoring_asset_grants_v1 WHERE world_id=? AND asset_id=? AND asset_version=?`,
      d.worldId,d.reference.assetId,d.reference.assetVersion);
    if(!g||g.status!=='active')return null;
    return {accessRevision:w.access_revision,authorityRevision:o.authority_revision,grantRevision:g.grant_revision};
   }
   const stored=storage.transactionSync(()=>{
    const access=authorized();if(!access)return null;
    const p=one('SELECT * FROM vg_authoring_registry_payloads_v1 WHERE object_key=?',objectKey);
    return p?{access,bytes:p.payload instanceof ArrayBuffer?new Uint8Array(p.payload.slice(0)):Uint8Array.from(p.payload),mediaType:p.media_type,width:p.width,height:p.height}:null;
   });
   if(!stored)return fail();
   if(await bytesHash(stored.bytes)!==contentHash)return fail('payload-integrity-conflict');
   // Hashing yields. Recheck rights/revisions before returning private bytes.
   return storage.transactionSync(()=>{
    const current=authorized();
    if(!current||JSON.stringify(current)!==JSON.stringify(stored.access))return fail();
    if(category==='source')return {ok:true,reference:d.reference,
     payload:copyAuthoringJson(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(stored.bytes)))};
    return {ok:true,reference:d.reference,mediaType:stored.mediaType,bytes:stored.bytes,width:stored.width,height:stored.height};
   });
  }catch{return fail('registry-unavailable');}
 }

 // G1O: owner-only source discovery; references are hints, not transferable rights.
 async function listSources(request,input){
  let d;
  try{d=copyAuthoringJson(input);
   if(!keys(d,['worldId','after'])||!id(d.worldId)||typeof d.after!=='string'||
    (d.after!==''&&!/^[a-f0-9]{64}$/.test(d.after)))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  let user;
  try{const who=await verify(request,projectId);if(who&&uid(who.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{return storage.transactionSync(()=>{
   const w=one('SELECT * FROM vg_authoring_worlds_v1 WHERE world_id=?',d.worldId);
   if(!w||w.owner_uid!==user)return fail();
   const rows=all(`SELECT o.object_key,o.reference_json,o.authority_revision,g.grant_revision
    FROM vg_authoring_registry_objects_v1 o
    JOIN vg_authoring_source_grants_v1 g ON
     g.kind=json_extract(o.reference_json,'$.kind') AND
     g.story_id=json_extract(o.reference_json,'$.storyId') AND
     g.story_version=json_extract(o.reference_json,'$.storyVersion')
    JOIN vg_authoring_source_versions_v1 v ON v.kind=g.kind AND v.story_id=g.story_id AND v.story_version=g.story_version
    WHERE g.world_id=? AND g.status='active' AND o.category='source' AND o.status='active'
     AND o.authorized_uid=? AND o.object_key>? AND v.content_hash=json_extract(o.reference_json,'$.contentHash')
     AND (g.kind!='library' OR NOT EXISTS(SELECT 1 FROM vg_authoring_source_notices_v1 n
      WHERE n.story_id=g.story_id AND n.content_hash=v.content_hash AND n.status='open'))
    ORDER BY o.object_key LIMIT 51`,d.worldId,user,d.after);
   const sources=rows.slice(0,50).map(row=>{
    const reference=copyAuthoringJson(JSON.parse(row.reference_json));
    if(!sourceRef(reference))throw Error('invalid-reference');
    return {reference,authorityRevision:row.authority_revision,grantRevision:row.grant_revision};
   });
   return {ok:true,worldId:d.worldId,accessRevision:w.access_revision,sources,
    nextCursor:rows.length>50?rows[49].object_key:null};
  });}catch{return fail('registry-unavailable');}
 }
 async function sourceManifest(request,input){
  const r=await read(request,input,'source');if(!r.ok)return r;
  // No await after the underlying read's hash and transaction permission recheck.
  return {ok:true,reference:r.reference,manifest:{format:'source-manifest-1',title:r.payload.title,
   chapters:r.payload.chapters.map((c,order)=>({chapterId:c.chapterId,title:c.title,order}))}};
 }
 async function sourceRange(request,input){
  let d;
  try{d=copyAuthoringJson(input);
   if(!keys(d,['worldId','reference','startChapterId','endChapterId'])||
    !short(d.startChapterId,160)||!short(d.endChapterId,160))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  const r=await read(request,{worldId:d.worldId,reference:d.reference},'source');if(!r.ok)return r;
  const chapters=r.payload.chapters,start=chapters.findIndex(c=>c.chapterId===d.startChapterId),
   end=chapters.findIndex(c=>c.chapterId===d.endChapterId);
  if(start<0||end<0||end<start)return fail('invalid-chapter-range');
  // Inclusive range is ordered by the immutable payload, never lexicographic IDs.
  return {ok:true,reference:r.reference,startChapterId:d.startChapterId,endChapterId:d.endChapterId,
   chapters:chapters.slice(start,end+1)};
 }

 async function permitAction(request,input,action){
  let d;
  try{d=copyAuthoringJson(input);
   const wanted=action==='issue'?['requestId','storyId','contentHash','authorizedUid','license','sourceNote','proofRef']:
    action==='revoke'?['requestId','storyId','contentHash','expectedRevision']:['storyId','contentHash'];
   if(!keys(d,wanted)||!short(d.storyId,160)||typeof d.contentHash!=='string'||!/^[a-f0-9]{64}$/.test(d.contentHash)||
    (action!=='read'&&!uuid(d.requestId))||(action==='issue'&&!rights(d))||
    (action==='revoke'&&(!rev(d.expectedRevision)||!d.expectedRevision)))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  let user;try{const who=await verify(request,projectId);if(uid(who?.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   if(!isOperator(user))return fail();
   const digest=action==='read'?null:await hashAuthoringJson({action,...d});
   return storage.transactionSync(()=>{
    if(!isOperator(user))return fail();
    const row=one('SELECT * FROM vg_authoring_adaptation_permits_v1 WHERE story_id=? AND content_hash=?',d.storyId,d.contentHash);
    if(action==='read')return row?{ok:true,permit:{...JSON.parse(row.permit_json),status:row.status,revision:row.revision}}:fail();
    if(action==='issue'&&held(d.storyId,d.contentHash))return fail('source-held');
    const prior=receipt('permits',user,d,'permit:'+action,digest);if(prior)return prior;
    const version='sha256-'+d.contentHash;
    if(action==='issue'){
     if(row||one("SELECT story_id FROM vg_authoring_source_versions_v1 WHERE kind='library' AND story_id=? AND content_hash=?",d.storyId,d.contentHash))return fail('version-conflict');
     const {requestId,...permit}=d;
     storage.sql.exec("INSERT INTO vg_authoring_adaptation_permits_v1 VALUES(?,?,?,'active',1)",d.storyId,d.contentHash,JSON.stringify(permit));
    }else{
     if(!row||row.status!=='active'||row.revision!==d.expectedRevision||!rev(row.revision))return fail('revision-conflict');
     const grants=all("SELECT grant_revision FROM vg_authoring_source_grants_v1 WHERE kind='library' AND story_id=? AND story_version=?",d.storyId,version);
     if(grants.some(g=>!rev(g.grant_revision)))return fail('revision-conflict');
     const objects=all("SELECT object_key,authority_revision FROM vg_authoring_registry_objects_v1 WHERE category='source' AND json_extract(reference_json,'$.kind')='library' AND json_extract(reference_json,'$.storyId')=? AND json_extract(reference_json,'$.contentHash')=? AND status='active'",d.storyId,d.contentHash);
     if(objects.some(o=>!rev(o.authority_revision)))return fail('revision-conflict');
     storage.sql.exec("UPDATE vg_authoring_adaptation_permits_v1 SET status='revoked',revision=revision+1 WHERE story_id=? AND content_hash=?",d.storyId,d.contentHash);
     for(const o of objects)storage.sql.exec("UPDATE vg_authoring_registry_objects_v1 SET status='revoked',authority_revision=authority_revision+1 WHERE object_key=?",o.object_key);
     storage.sql.exec("UPDATE vg_authoring_source_grants_v1 SET status='revoked',grant_revision=grant_revision+1 WHERE kind='library' AND story_id=? AND story_version=?",d.storyId,version);
    }
    const from=row?.revision||0,result={ok:true,storyId:d.storyId,contentHash:d.contentHash,revision:from+1,status:action==='issue'?'active':'revoked'};
    return record('permits',user,d,'permit:'+action,digest,d.contentHash,from,from+1,result);
   });
  }catch{return fail('registry-unavailable');}
 }

 async function listPermitEvents(request,input){
  let d;
  try{
   d=copyAuthoringJson(input);
   if(!keys(d,['after'])||!rev(d.after))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  let user;try{const who=await verify(request,projectId);if(uid(who?.uid))user=who.uid;}catch{}
  if(!user)return fail('unauthenticated');
  try{
   if(!isOperator(user))return fail();
   return storage.transactionSync(()=>{
    if(!isOperator(user))return fail();
    // Existing G1R permits may predate the outbox. Never silently start mid-stream.
    const gap=one(`SELECT 1 AS missing FROM vg_authoring_adaptation_permits_v1 p WHERE
     NOT EXISTS(SELECT 1 FROM vg_authoring_permit_outbox_v1 o WHERE
      o.story_id=p.story_id AND o.content_hash=p.content_hash AND o.permit_revision=1 AND o.status='active')
     OR (p.status='revoked' AND NOT EXISTS(SELECT 1 FROM vg_authoring_permit_outbox_v1 o WHERE
      o.story_id=p.story_id AND o.content_hash=p.content_hash AND o.permit_revision=p.revision AND o.status='revoked')) LIMIT 1`);
    if(gap)return fail('baseline-required');
    const rows=all('SELECT seq,event_id,story_id,content_hash,permit_revision,status,happened_at FROM vg_authoring_permit_outbox_v1 WHERE seq>? ORDER BY seq LIMIT 51',d.after);
    const events=rows.slice(0,50).map(r=>({seq:r.seq,eventId:r.event_id,storyId:r.story_id,
     contentHash:r.content_hash,revision:r.permit_revision,status:r.status,happenedAt:r.happened_at}));
    const checkpoint=events.at(-1)?.seq??d.after;
    return {ok:true,events,checkpoint,nextCursor:rows.length>50?checkpoint:null};
   });
  }catch{return fail('registry-unavailable');}
 }

 return Object.freeze({
  issueAdaptationPermit:(r,d)=>permitAction(r,d,'issue'),
  revokeAdaptationPermit:(r,d)=>permitAction(r,d,'revoke'),
  readAdaptationPermit:(r,d)=>permitAction(r,d,'read'),
  listPermitEvents,
  listSources,sourceManifest,sourceRange,
  readSource:(r,d)=>read(r,d,'source'),readAsset:(r,d)=>read(r,d,'asset'),
  registerSource:(r,d)=>mutate(r,d,'source','register'),registerAsset:(r,d)=>mutate(r,d,'asset','register'),
  setSourceGrant:(r,d)=>mutate(r,d,'source','grant'),setAssetGrant:(r,d)=>mutate(r,d,'asset','grant'),
  revokeSourceVersion:(r,d)=>mutate(r,d,'source','revoke'),revokeAssetVersion:(r,d)=>mutate(r,d,'asset','revoke')
 });
}
