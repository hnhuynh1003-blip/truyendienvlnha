// G1C: isolated SQLite persistence using the existing DO SQL transaction shape.
// No DurableObject export, Worker import, HTTP route or live binding is added.
import {verifyFirebaseIdToken} from './auth.mjs';
import {createAuthoringService,isAuthoringActionAllowed,copyAuthoringContent,
 copyAuthoringJson,hashAuthoringJson,verifySubmissionIntegrity} from './vangioi-authoring.mjs';
import {createContentValidator,validateDraftContent} from './vangioi-content.mjs';

const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const rev=v=>Number.isSafeInteger(v)&&v>=1;
const requestId=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const fail=(code='forbidden')=>({ok:false,code});
const equalKeys=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...keys].sort().join(',');

export function initializeAuthoringSchema(storage){
 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_worlds_v1(
   world_id TEXT PRIMARY KEY,owner_uid TEXT NOT NULL,
   draft_revision INTEGER NOT NULL CHECK(draft_revision>=1),
   access_revision INTEGER NOT NULL CHECK(access_revision>=1),
   draft_state TEXT NOT NULL CHECK(draft_state IN ('draft','submitted','inReview','approved')),
   contributors_json TEXT NOT NULL)`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_members_v1(
   world_id TEXT NOT NULL,uid TEXT NOT NULL,status TEXT NOT NULL,
   roles_json TEXT NOT NULL,sections_json TEXT NOT NULL,PRIMARY KEY(world_id,uid))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_drafts_v1(
   world_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>=1),
   content_json TEXT NOT NULL,PRIMARY KEY(world_id,revision))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_submissions_v1(
   world_id TEXT NOT NULL,revision INTEGER NOT NULL,snapshot_hash TEXT NOT NULL,
   snapshot_json TEXT NOT NULL,PRIMARY KEY(world_id,revision),UNIQUE(world_id,snapshot_hash))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_operations_v1(
   world_id TEXT NOT NULL,actor_uid TEXT NOT NULL,request_id TEXT NOT NULL,
   action TEXT NOT NULL,request_hash TEXT NOT NULL,result_json TEXT NOT NULL,
   PRIMARY KEY(world_id,actor_uid,request_id))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_audit_v1(
   event_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,actor_uid TEXT NOT NULL,
   request_id TEXT NOT NULL,action TEXT NOT NULL,from_revision INTEGER NOT NULL,
   to_revision INTEGER NOT NULL,snapshot_hash TEXT,happened_at INTEGER NOT NULL,
   UNIQUE(world_id,actor_uid,request_id))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_source_versions_v1(
   kind TEXT NOT NULL,story_id TEXT NOT NULL,story_version TEXT NOT NULL,content_hash TEXT NOT NULL,
   PRIMARY KEY(kind,story_id,story_version))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_source_grants_v1(
   world_id TEXT NOT NULL,kind TEXT NOT NULL,story_id TEXT NOT NULL,story_version TEXT NOT NULL,
   status TEXT NOT NULL,grant_revision INTEGER NOT NULL CHECK(grant_revision>=1),
   PRIMARY KEY(world_id,kind,story_id,story_version))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_source_notices_v1(
   notice_id TEXT PRIMARY KEY,story_id TEXT NOT NULL,content_hash TEXT NOT NULL,
   reason TEXT NOT NULL CHECK(reason IN ('rights_dispute','source_unpublished','owner_report')),
   evidence_ref TEXT,opened_by TEXT NOT NULL,opened_at INTEGER NOT NULL CHECK(opened_at>=0),
   status TEXT NOT NULL CHECK(status IN ('open','released','revoked')),
   revision INTEGER NOT NULL CHECK(revision>=1),resolution_note TEXT)`);
  storage.sql.exec(`CREATE INDEX IF NOT EXISTS vg_source_notices_active_v1
   ON vg_authoring_source_notices_v1(story_id,content_hash,status)`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_source_notices_delete_v1
   BEFORE DELETE ON vg_authoring_source_notices_v1 BEGIN SELECT RAISE(ABORT,'immutable-source-notice'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_source_notices_update_v1
   BEFORE UPDATE ON vg_authoring_source_notices_v1 WHEN
   NEW.notice_id IS NOT OLD.notice_id OR NEW.story_id IS NOT OLD.story_id OR
   NEW.content_hash IS NOT OLD.content_hash OR NEW.reason IS NOT OLD.reason OR
   NEW.evidence_ref IS NOT OLD.evidence_ref OR NEW.opened_by IS NOT OLD.opened_by OR
   NEW.opened_at IS NOT OLD.opened_at OR OLD.status!='open' OR
   NEW.status NOT IN ('released','revoked') OR NEW.revision!=OLD.revision+1 OR
   OLD.resolution_note IS NOT NULL OR NEW.resolution_note IS NULL OR trim(NEW.resolution_note)=''
   BEGIN SELECT RAISE(ABORT,'immutable-source-notice'); END`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_asset_versions_v1(
   asset_id TEXT NOT NULL,asset_version TEXT NOT NULL,content_hash TEXT NOT NULL,kind TEXT NOT NULL,
   PRIMARY KEY(asset_id,asset_version))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_asset_grants_v1(
   world_id TEXT NOT NULL,asset_id TEXT NOT NULL,asset_version TEXT NOT NULL,
   status TEXT NOT NULL,grant_revision INTEGER NOT NULL CHECK(grant_revision>=1),
   review_status TEXT NOT NULL,license TEXT NOT NULL,source_note TEXT NOT NULL,proof_ref TEXT,
   PRIMARY KEY(world_id,asset_id,asset_version))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_authoring_reviews_v1(
   world_id TEXT NOT NULL,revision INTEGER NOT NULL,snapshot_hash TEXT NOT NULL,
   reviewer_uid TEXT NOT NULL,decision TEXT NOT NULL CHECK(decision IN ('approve','request_changes')),
   note TEXT NOT NULL,validator_version TEXT,happened_at INTEGER NOT NULL,
   PRIMARY KEY(world_id,revision))`);
  // Content revisions, submitted snapshots, receipts and audit rows are append-only.
  for(const table of ['drafts','submissions','operations','audit','source_versions','asset_versions','reviews']){
   for(const operation of ['UPDATE','DELETE'])storage.sql.exec(
    `CREATE TRIGGER IF NOT EXISTS vg_authoring_${table}_${operation.toLowerCase()}_v1
     BEFORE ${operation} ON vg_authoring_${table}_v1
     BEGIN SELECT RAISE(ABORT,'immutable-authoring-record'); END`);
  }
 });
}

export function createSqlAuthoringService({storage,projectId,verify=verifyFirebaseIdToken,
 validateContent,now=Date.now}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||typeof now!=='function')
  throw new TypeError('SQL authoring requires trusted storage and identity adapters');
 initializeAuthoringSchema(storage);
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray();
 const one=(q,...args)=>all(q,...args)[0]||null;
 function world(worldId){
  const row=one('SELECT * FROM vg_authoring_worlds_v1 WHERE world_id=?',worldId);
  return row?{worldId:row.world_id,ownerUid:row.owner_uid,draftRevision:row.draft_revision,
   accessRevision:row.access_revision,draftState:row.draft_state,
   contributorUids:JSON.parse(row.contributors_json)}:null;
 }
 function member(worldId,userId){
  const row=one('SELECT * FROM vg_authoring_members_v1 WHERE world_id=? AND uid=?',worldId,userId);
  return row?{worldId:row.world_id,uid:row.uid,status:row.status,
   roles:JSON.parse(row.roles_json),editSections:JSON.parse(row.sections_json)}:null;
 }
 function draft(worldId){
  const w=world(worldId);if(!w)return null;
  const row=one('SELECT content_json FROM vg_authoring_drafts_v1 WHERE world_id=? AND revision=?',worldId,w.draftRevision);
  return row?{worldId,revision:w.draftRevision,state:w.draftState,content:JSON.parse(row.content_json)}:null;
 }
 function submission(worldId,snapshotHash){
  const row=one('SELECT snapshot_json FROM vg_authoring_submissions_v1 WHERE world_id=? AND snapshot_hash=?',worldId,snapshotHash);
  return row?JSON.parse(row.snapshot_json):null;
 }
 function storySource(reference,{worldId}){
  const row=one(`SELECT v.*,g.status,g.grant_revision FROM vg_authoring_source_versions_v1 v
   JOIN vg_authoring_source_grants_v1 g ON v.kind=g.kind AND v.story_id=g.story_id AND v.story_version=g.story_version
   WHERE g.world_id=? AND v.kind=? AND v.story_id=? AND v.story_version=?`,
   worldId,reference.kind,reference.storyId,reference.storyVersion);
  const held=row&&row.kind==='library'&&one(`SELECT notice_id FROM vg_authoring_source_notices_v1
   WHERE story_id=? AND content_hash=? AND status='open' LIMIT 1`,row.story_id,row.content_hash);
  return row?{worldId,kind:row.kind,storyId:row.story_id,storyVersion:row.story_version,
   contentHash:row.content_hash,grantStatus:held?'revoked':row.status,grantRevision:row.grant_revision}:null;
 }
 function asset(reference,{worldId}){
  const row=one(`SELECT v.*,g.status,g.grant_revision,g.review_status,g.license,g.source_note,g.proof_ref
   FROM vg_authoring_asset_versions_v1 v JOIN vg_authoring_asset_grants_v1 g
   ON v.asset_id=g.asset_id AND v.asset_version=g.asset_version
   WHERE g.world_id=? AND v.asset_id=? AND v.asset_version=?`,worldId,reference.assetId,reference.assetVersion);
  return row?{worldId,assetId:row.asset_id,assetVersion:row.asset_version,contentHash:row.content_hash,kind:row.kind,
   grantStatus:row.status,grantRevision:row.grant_revision,reviewStatus:row.review_status,
   license:row.license,sourceNote:row.source_note,proofRef:row.proof_ref}:null;
 }
 const contentValidator=validateContent===undefined?
  createContentValidator({readStorySource:storySource,readAsset:asset}):validateContent;
 function boundService(who){
  return createAuthoringService({projectId,readWorld:world,readMembership:member,readDraft:draft,
   readSubmission:submission,validateContent:contentValidator,now,verify:async()=>who});
 }
 async function identity(request){
  try{
   const who=await verify(request,projectId);
   return who&&uid(who.uid)?{uid:who.uid}:null;
  }catch{return null;}
 }
 function permitted(w,actorUid,action,sections,replay=false){
  // Receipt replay acknowledges a past action; it does not edit a locked draft.
  // Recheck current ownership/scopes, while ignoring only the workflow lock.
  const current=replay&&w?{...w,draftState:'draft'}:w;
  return isAuthoringActionAllowed({world:current,member:member(w?.worldId,actorUid),
   actorUid,action,sections});
 }
 function receipt(input,actorUid,action,digest,sections){
  const w=world(input.worldId);
  if(!w||!permitted(w,actorUid,action,sections,true))return fail();
  const row=one(`SELECT * FROM vg_authoring_operations_v1
   WHERE world_id=? AND actor_uid=? AND request_id=?`,input.worldId,actorUid,input.requestId);
  if(!row)return null;
  if(row.action!==action||row.request_hash!==digest)return fail('idempotency-conflict');
  const r=JSON.parse(row.result_json);
  const keys=action==='edit_draft'?['ok','worldId','revision','state']:['ok','worldId','revision','state','snapshotHash'];
  if(!equalKeys(r,keys)||r.ok!==true||r.worldId!==input.worldId||!rev(r.revision)||
   r.state!==(action==='edit_draft'?'draft':'submitted')||
   (action==='submit_draft'&&!/^[a-f0-9]{64}$/.test(r.snapshotHash)))return fail('invalid-receipt');
  return {...r,replayed:true};
 }
 function commit(input,actorUid,action,digest,sections,plan){
  return storage.transactionSync(()=>{
   const prior=receipt(input,actorUid,action,digest,sections);
   if(prior)return prior;
   const w=world(input.worldId);
   if(!w||!permitted(w,actorUid,action,sections))return fail();
   const p=plan.preconditions;
   if(!p||p.worldId!==input.worldId||p.ownerUid!==w.ownerUid||p.draftRevision!==w.draftRevision||
    p.accessRevision!==w.accessRevision||p.draftState!==w.draftState||w.draftState!=='draft')
    return fail('revision-conflict');
   for(const dep of p.dependencies||[]){
    const resolver=dep.kind==='source'?storySource:dep.kind==='asset'?asset:null;
    if(!resolver||JSON.stringify(copyAuthoringJson(resolver(dep.reference,{worldId:input.worldId})))!==
     JSON.stringify(copyAuthoringJson(dep.record)))return fail('dependency-conflict');
   }
   const timestamp=now();
   if(!Number.isSafeInteger(timestamp)||timestamp<0)throw Error('invalid-clock');
   let result;
   if(action==='edit_draft'){
    const next=plan.nextDraft;
    if(!validateDraftContent(next.content).valid)return fail('invalid-content');
    storage.sql.exec('INSERT INTO vg_authoring_drafts_v1(world_id,revision,content_json) VALUES(?,?,?)',
     input.worldId,next.revision,JSON.stringify(copyAuthoringContent(next.content)));
    const contributors=[...new Set([...w.contributorUids,actorUid])].sort();
    const changed=all(`UPDATE vg_authoring_worlds_v1 SET draft_revision=?,contributors_json=?
     WHERE world_id=? AND owner_uid=? AND draft_revision=? AND access_revision=? AND draft_state='draft'
     RETURNING world_id`,next.revision,JSON.stringify(contributors),input.worldId,w.ownerUid,w.draftRevision,w.accessRevision);
    if(changed.length!==1)throw Error('write-conflict');
    result={ok:true,worldId:input.worldId,revision:next.revision,state:'draft'};
   }else{
    const s=plan.snapshot;
    storage.sql.exec(`INSERT INTO vg_authoring_submissions_v1(world_id,revision,snapshot_hash,snapshot_json)
     VALUES(?,?,?,?)`,input.worldId,s.draftRevision,s.snapshotHash,JSON.stringify(s));
    const changed=all(`UPDATE vg_authoring_worlds_v1 SET draft_state='submitted'
     WHERE world_id=? AND owner_uid=? AND draft_revision=? AND access_revision=? AND draft_state='draft'
     RETURNING world_id`,input.worldId,w.ownerUid,w.draftRevision,w.accessRevision);
    if(changed.length!==1)throw Error('write-conflict');
    result={ok:true,worldId:input.worldId,revision:s.draftRevision,state:'submitted',snapshotHash:s.snapshotHash};
   }
   storage.sql.exec(`INSERT INTO vg_authoring_operations_v1
    (world_id,actor_uid,request_id,action,request_hash,result_json) VALUES(?,?,?,?,?,?)`,
    input.worldId,actorUid,input.requestId,action,digest,JSON.stringify(result));
   storage.sql.exec(`INSERT INTO vg_authoring_audit_v1
    (event_id,world_id,actor_uid,request_id,action,from_revision,to_revision,snapshot_hash,happened_at)
    VALUES(?,?,?,?,?,?,?,?,?)`,crypto.randomUUID(),input.worldId,actorUid,input.requestId,action,
    w.draftRevision,result.revision,result.snapshotHash||null,timestamp);
   return {...result,replayed:false};
  });
 }
 async function mutate(request,input,action){
  let data,sections;
  try{
   data=copyAuthoringJson(input);
   const keys=action==='edit_draft'?['worldId','expectedRevision','requestId','patch']:['worldId','expectedRevision','requestId'];
   if(!equalKeys(data,keys)||!id(data.worldId)||!rev(data.expectedRevision)||!requestId(data.requestId))
    return fail('invalid-request');
   if(action==='edit_draft'){
    data.patch=copyAuthoringContent(data.patch);sections=Object.keys(data.patch);
    if(!validateDraftContent(data.patch).valid)return fail('invalid-content');
    if(!sections.length)return fail('invalid-request');
   }else sections=[];
  }catch{return fail('invalid-request');}
  const who=await identity(request);
  if(!who)return fail('unauthenticated');
  try{
   const digest=await hashAuthoringJson({action,...data});
   const prior=storage.transactionSync(()=>receipt(data,who.uid,action,digest,sections));
   if(prior)return prior;
   const service=boundService(who);
   const plan=action==='edit_draft'?await service.prepareDraftEdit(request,data):await service.prepareSubmission(request,data);
   if(!plan.ok){
    // A duplicate may have committed during async preparation, including submit
    // locking the draft. Recover its receipt before returning a stale error.
    return storage.transactionSync(()=>receipt(data,who.uid,action,digest,sections))||plan;
   }
   // No await inside the transaction: all current authority, preconditions,
   // state/revision, immutable rows, receipt and audit commit together.
   return commit(data,who.uid,action,digest,sections,plan);
  }catch{return fail('authoring-unavailable');}
 }
 // G1L: decisions and reopening extend the existing header without rewriting snapshots.
 function lifecycleAllowed(w,actorUid,action,replay=false){
  if(action==='reopen_draft')return w?.ownerUid===actorUid;
  return isAuthoringActionAllowed({world:replay&&w?{...w,draftState:'submitted'}:w,
   member:member(w?.worldId,actorUid),actorUid,action:'review_submission'});
 }
 function lifecycleReceipt(data,actorUid,action,digest){
  const w=world(data.worldId);
  if(!w||!lifecycleAllowed(w,actorUid,action,true))return fail();
  const prior=one(`SELECT * FROM vg_authoring_operations_v1
   WHERE world_id=? AND actor_uid=? AND request_id=?`,data.worldId,actorUid,data.requestId);
  if(!prior)return null;
  if(prior.action!==action||prior.request_hash!==digest)return fail('idempotency-conflict');
  const result=JSON.parse(prior.result_json);
  if(result.ok!==true||result.worldId!==data.worldId||!rev(result.revision)||
   result.snapshotHash!==data.snapshotHash||!['draft','inReview','approved'].includes(result.state))
   return fail('invalid-receipt');
  return {...result,replayed:true};
 }
 async function lifecycle(request,input,action){
  let data;
  try{
   data=copyAuthoringJson(input);
   const keys=['worldId','requestId','expectedRevision','expectedAccessRevision','snapshotHash'];
   if(action==='review_submission')keys.push('decision','note');
   if(!equalKeys(data,keys)||!id(data.worldId)||!requestId(data.requestId)||
    !rev(data.expectedRevision)||!rev(data.expectedAccessRevision)||!RegExp('^[a-f0-9]{64}$').test(data.snapshotHash)||
    (action==='review_submission'&&(!['approve','request_changes'].includes(data.decision)||
     typeof data.note!=='string'||!data.note.trim()||data.note.length>4000)))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  const who=await identity(request);if(!who)return fail('unauthenticated');
  try{
   const digest=await hashAuthoringJson({action,...data});
   const prior=storage.transactionSync(()=>lifecycleReceipt(data,who.uid,action,digest));if(prior)return prior;
   const before=world(data.worldId);
   if(!before||!lifecycleAllowed(before,who.uid,action))return fail();
   if(before.draftRevision!==data.expectedRevision||before.accessRevision!==data.expectedAccessRevision||
    !['submitted','inReview','approved'].includes(before.draftState))return fail('revision-conflict');
   const snapshot=submission(data.worldId,data.snapshotHash);
   if(!await verifySubmissionIntegrity(snapshot)||snapshot.worldId!==data.worldId||
    snapshot.draftRevision!==data.expectedRevision||snapshot.submittedBy===who.uid&&action==='review_submission')
    return fail('invalid-submission');
   const serialized=JSON.stringify(snapshot);
   let verdict=null;
   if(action==='review_submission'&&data.decision==='approve'){
    if(typeof contentValidator!=='function')return fail('validator-unavailable');
    verdict=await contentValidator(copyAuthoringContent(snapshot.content),{worldId:data.worldId,actorUid:who.uid});
    if(verdict?.readyForReview!==true||!Array.isArray(verdict.errors)||verdict.errors.length||
     typeof verdict.validatorVersion!=='string'||!verdict.validatorVersion.trim()||verdict.validatorVersion.length>100)
     return fail('content-not-ready');
   }
   return storage.transactionSync(()=>{
    const replay=lifecycleReceipt(data,who.uid,action,digest);if(replay)return replay;
    const w=world(data.worldId);
    if(!w||!lifecycleAllowed(w,who.uid,action))return fail();
    if(w.draftRevision!==data.expectedRevision||w.accessRevision!==data.expectedAccessRevision||
     w.ownerUid!==before.ownerUid||w.draftState!==before.draftState)return fail('revision-conflict');
    if(JSON.stringify(submission(data.worldId,data.snapshotHash))!==serialized)return fail('invalid-submission');
    for(const dep of verdict?.dependencies||[]){
     const resolver=dep.kind==='source'?storySource:dep.kind==='asset'?asset:null;
     if(!resolver||JSON.stringify(copyAuthoringJson(resolver(dep.reference,{worldId:data.worldId})))!==
      JSON.stringify(copyAuthoringJson(dep.record)))return fail('dependency-conflict');
    }
    const timestamp=now();if(!Number.isSafeInteger(timestamp)||timestamp<0)throw Error('invalid-clock');
    let state,revision=w.draftRevision;
    if(action==='review_submission'){
     if(one('SELECT revision FROM vg_authoring_reviews_v1 WHERE world_id=? AND revision=?',data.worldId,revision))
      return fail('review-conflict');
     state=data.decision==='approve'?'approved':'inReview';
     storage.sql.exec(`INSERT INTO vg_authoring_reviews_v1 VALUES(?,?,?,?,?,?,?,?)`,
      data.worldId,revision,data.snapshotHash,who.uid,data.decision,data.note,verdict?.validatorVersion||null,timestamp);
    }else{
     revision++;if(!rev(revision))return fail('revision-conflict');
     state='draft';
     // Copy the immutable submitted content, retaining all IDs and contributor history.
     storage.sql.exec('INSERT INTO vg_authoring_drafts_v1 VALUES(?,?,?)',data.worldId,revision,
      JSON.stringify(copyAuthoringContent(snapshot.content)));
    }
    const changed=all(`UPDATE vg_authoring_worlds_v1 SET draft_revision=?,draft_state=?
     WHERE world_id=? AND owner_uid=? AND draft_revision=? AND access_revision=? AND draft_state=? RETURNING world_id`,
     revision,state,data.worldId,w.ownerUid,w.draftRevision,w.accessRevision,w.draftState);
    if(changed.length!==1)throw Error('write-conflict');
    const result={ok:true,worldId:data.worldId,revision,state,snapshotHash:data.snapshotHash,
     ...(action==='review_submission'?{decision:data.decision}:{})};
    storage.sql.exec('INSERT INTO vg_authoring_operations_v1 VALUES(?,?,?,?,?,?)',
     data.worldId,who.uid,data.requestId,action,digest,JSON.stringify(result));
    storage.sql.exec('INSERT INTO vg_authoring_audit_v1 VALUES(?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),
     data.worldId,who.uid,data.requestId,action,w.draftRevision,revision,data.snapshotHash,timestamp);
    return {...result,replayed:false};
   });
  }catch{return fail('authoring-unavailable');}
 }
 async function viewReviewDecision(request,input){
  const who=await identity(request);if(!who)return fail('unauthenticated');
  const result=await boundService(who).viewSubmission(request,input);if(!result.ok)return result;
  // Editorial notes are not part of a collaborator's section projection.
  const w=world(input.worldId),m=member(input.worldId,who.uid);
  if(!w||!isAuthoringActionAllowed({world:w,member:m,actorUid:who.uid,action:'read_submission'})||
   (w.ownerUid!==who.uid&&m?.roles.includes('collaborator')))return fail();
  try{
   const row=one('SELECT * FROM vg_authoring_reviews_v1 WHERE world_id=? AND snapshot_hash=?',input.worldId,input.snapshotHash);
   return {ok:true,worldId:input.worldId,snapshotHash:input.snapshotHash,review:row?{
    revision:row.revision,reviewerUid:row.reviewer_uid,decision:row.decision,note:row.note,
    validatorVersion:row.validator_version,happenedAt:row.happened_at}:null};
  }catch{return fail('authoring-unavailable');}
 }
 async function view(request,input,method){
  const who=await identity(request);if(!who)return fail('unauthenticated');
  return boundService(who)[method](request,input);
 }
 return Object.freeze({
  reviewSubmission:(request,input)=>lifecycle(request,input,'review_submission'),
  reopenDraft:(request,input)=>lifecycle(request,input,'reopen_draft'),
  viewReviewDecision,
  saveDraft:(request,input)=>mutate(request,input,'edit_draft'),
  submitDraft:(request,input)=>mutate(request,input,'submit_draft'),
  viewDraft:(request,input)=>view(request,input,'viewDraft'),
  viewSubmission:(request,input)=>view(request,input,'viewSubmission')
 });
}
