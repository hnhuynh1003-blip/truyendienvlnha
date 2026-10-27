// G2O: isolated fixture-only SQLite operator ledger for V49 G2N callback data.
// NOT a live role issuer, reviewer UI/API, Firebase DB, permit store or publish.

// Demo namespace is an additional guard, not proof of actual storage isolation.
const project=v=>typeof v==='string'&&/^demo-[a-z0-9-]{1,59}$/.test(v);
const story=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>=1&&v.length<=128&&!/[\p{C}]/u.test(v);
const version=v=>Number.isSafeInteger(v)&&v>=1&&v<Number.MAX_SAFE_INTEGER;
const stamp=v=>Number.isSafeInteger(v)&&v>=0&&v<Number.MAX_SAFE_INTEGER;
const source=v=>typeof v==='string'&&/^sha256-[0-9a-f]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const only=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...fields].sort().join(',');
const WEEK_MS=7*24*60*60*1000;
const receipt=(kind,storyId,revision)=>Object.freeze({ok:true,kind,storyId,revision,
 fixtureOnly:true,canPublish:false});

/**
 * The readVerifiedDraftProof callback MUST hash a consistent server-side V49
 * snapshot with hashV49DraftSnapshot from G2N. It must never accept a hash or
 * owner UID from a browser request. All writes require verified host operator.
 */
export function createV49SqlFixtureReviewerLedger({storage,projectId,
 environment='fixture',verifyOperator,readVerifiedDraftProof,now=Date.now}={}){
 if(environment!=='fixture'||!project(projectId)||!storage?.sql||
  typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  [verifyOperator,readVerifiedDraftProof,now].some(fn=>typeof fn!=='function'))
  throw new TypeError('G2O requires trusted operator and isolated fixture SQLite callbacks');

 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_v49_pins_g2o(
   project_id TEXT NOT NULL,story_id TEXT NOT NULL,owner_uid TEXT NOT NULL,
   source_hash TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('active','revoked')),
   revision INTEGER NOT NULL CHECK(revision>=1),
   PRIMARY KEY(project_id,story_id))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_v49_assignments_g2o(
   project_id TEXT NOT NULL,story_id TEXT NOT NULL,reviewer_uid TEXT NOT NULL,
   pin_revision INTEGER NOT NULL CHECK(pin_revision>=1),source_hash TEXT NOT NULL,
   status TEXT NOT NULL CHECK(status IN ('active','revoked')),
   revision INTEGER NOT NULL CHECK(revision>=1),expires_at INTEGER NOT NULL,
   PRIMARY KEY(project_id,story_id,reviewer_uid,pin_revision))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_v49_operations_g2o(
   project_id TEXT NOT NULL,operation_id TEXT NOT NULL,actor_uid TEXT NOT NULL,
   kind TEXT NOT NULL,story_id TEXT NOT NULL,reviewer_uid TEXT,
   revision INTEGER NOT NULL,created_at INTEGER NOT NULL,
   PRIMARY KEY(project_id,operation_id))`);
  for(const action of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_operations_${action.toLowerCase()}_g2o
   BEFORE ${action} ON vg_fixture_v49_operations_g2o
   BEGIN SELECT RAISE(ABORT,'immutable-fixture-operation'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_pins_delete_g2o
   BEFORE DELETE ON vg_fixture_v49_pins_g2o
   BEGIN SELECT RAISE(ABORT,'immutable-fixture-pin'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_pins_update_g2o
   BEFORE UPDATE ON vg_fixture_v49_pins_g2o WHEN
    NEW.project_id IS NOT OLD.project_id OR NEW.story_id IS NOT OLD.story_id OR
    NEW.owner_uid IS NOT OLD.owner_uid OR OLD.status!='active' OR
    NEW.revision!=OLD.revision+1 OR
    (NEW.status='active' AND NEW.source_hash=OLD.source_hash) OR
    (NEW.status='revoked' AND NEW.source_hash!=OLD.source_hash)
   BEGIN SELECT RAISE(ABORT,'fixture-pin-regression'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_assignments_delete_g2o
   BEFORE DELETE ON vg_fixture_v49_assignments_g2o
   BEGIN SELECT RAISE(ABORT,'immutable-fixture-assignment'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_assignments_update_g2o
   BEFORE UPDATE ON vg_fixture_v49_assignments_g2o WHEN
    NEW.project_id IS NOT OLD.project_id OR NEW.story_id IS NOT OLD.story_id OR
    NEW.reviewer_uid IS NOT OLD.reviewer_uid OR
    NEW.pin_revision!=OLD.pin_revision OR NEW.source_hash!=OLD.source_hash OR
    NEW.expires_at!=OLD.expires_at OR OLD.status!='active' OR
    NEW.status!='revoked' OR NEW.revision!=OLD.revision+1
   BEGIN SELECT RAISE(ABORT,'fixture-reviewer-revocation-regression'); END`);
 });
 const all=(sql,...args)=>storage.sql.exec(sql,...args).toArray();
 const one=(sql,...args)=>all(sql,...args)[0]||null;
 const readPinRow=storyId=>one(`SELECT story_id,owner_uid,source_hash,status,revision
  FROM vg_fixture_v49_pins_g2o WHERE project_id=? AND story_id=?`,projectId,storyId);
 const time=()=>{const t=now();if(!stamp(t))throw Error('fixture-invalid-clock');return t;};
 const authenticated=async request=>{
  try{
   const actor=await verifyOperator(request);
   if(!uid(actor?.uid)||actor.operator!==true)throw Error('unauthorized');
   return actor.uid;
  }catch{throw Error('fixture-operator-required');}
 };
 const audit=(operationId,actorUid,kind,storyId,reviewerUid,revision)=>{
  storage.sql.exec('INSERT INTO vg_fixture_v49_operations_g2o VALUES(?,?,?,?,?,?,?,?)',
   projectId,operationId,actorUid,kind,storyId,reviewerUid,revision,time());
 };

 async function pinDraft(request,input){
  if(!only(input,['operationId','storyId','expectedRevision'])||
   !uuid(input.operationId)||!story(input.storyId)||
   (input.expectedRevision!==null&&!version(input.expectedRevision)))
   throw Error('invalid-fixture-pin-command');
  const actorUid=await authenticated(request);
  let proof;
  try{proof=await readVerifiedDraftProof({storyId:input.storyId});}
  catch{throw Error('fixture-source-unavailable');}
  if(!only(proof,['sourceHash','storyId','ownerUid','chapterCount'])||
   proof.storyId!==input.storyId||!uid(proof.ownerUid)||!source(proof.sourceHash)||
   !Number.isSafeInteger(proof.chapterCount)||proof.chapterCount<1||proof.chapterCount>160)
   throw Error('fixture-source-unavailable');
  return storage.transactionSync(()=>{
   const old=readPinRow(input.storyId);
   if(!old){
    if(input.expectedRevision!==null)throw Error('fixture-pin-conflict');
    storage.sql.exec('INSERT INTO vg_fixture_v49_pins_g2o VALUES(?,?,?,?,?,?)',
     projectId,input.storyId,proof.ownerUid,proof.sourceHash,'active',1);
    audit(input.operationId,actorUid,'pin-initial',input.storyId,null,1);
    return receipt('pin-initial',input.storyId,1);
   }
   if(old.status!=='active'||old.revision!==input.expectedRevision||
    old.owner_uid!==proof.ownerUid||old.source_hash===proof.sourceHash)
    throw Error('fixture-pin-conflict');
   const next=old.revision+1;
   if(!version(next))throw Error('fixture-pin-revision-exhausted');
   const changed=all(`UPDATE vg_fixture_v49_pins_g2o SET source_hash=?,revision=?
    WHERE project_id=? AND story_id=? AND revision=? AND status='active' RETURNING revision`,
    proof.sourceHash,next,projectId,input.storyId,old.revision);
   if(changed.length!==1)throw Error('fixture-pin-conflict');
   audit(input.operationId,actorUid,'pin-rotate',input.storyId,null,next);
   return receipt('pin-rotate',input.storyId,next);
  });
 }

 async function revokePin(request,input){
  if(!only(input,['operationId','storyId','expectedRevision'])||
   !uuid(input.operationId)||!story(input.storyId)||!version(input.expectedRevision))
   throw Error('invalid-fixture-revoke-command');
  const actorUid=await authenticated(request);
  return storage.transactionSync(()=>{
   const old=readPinRow(input.storyId);
   if(!old||old.status!=='active'||old.revision!==input.expectedRevision)
    throw Error('fixture-pin-conflict');
   const next=old.revision+1;
   if(!version(next))throw Error('fixture-pin-revision-exhausted');
   const updated=all(`UPDATE vg_fixture_v49_pins_g2o SET status='revoked',revision=?
    WHERE project_id=? AND story_id=? AND status='active' AND revision=? RETURNING revision`,
    next,projectId,input.storyId,old.revision);
   if(updated.length!==1)throw Error('fixture-pin-conflict');
   audit(input.operationId,actorUid,'pin-revoke',input.storyId,null,next);
   return receipt('pin-revoke',input.storyId,next);
  });
 }

 async function grantReview(request,input){
  if(!only(input,['operationId','storyId','reviewerUid','expectedPinRevision','expiresAt'])||
   !uuid(input.operationId)||!story(input.storyId)||!uid(input.reviewerUid)||
   !version(input.expectedPinRevision)||!stamp(input.expiresAt))
   throw Error('invalid-fixture-review-command');
  const actorUid=await authenticated(request);
  return storage.transactionSync(()=>{
   const pin=readPinRow(input.storyId),clock=time();
   if(!pin||pin.status!=='active'||pin.revision!==input.expectedPinRevision||
    pin.owner_uid===input.reviewerUid||actorUid===input.reviewerUid||
    input.expiresAt<=clock||
    input.expiresAt>clock+WEEK_MS)throw Error('fixture-review-conflict');
   storage.sql.exec('INSERT INTO vg_fixture_v49_assignments_g2o VALUES(?,?,?,?,?,?,?,?)',
    projectId,input.storyId,input.reviewerUid,pin.revision,pin.source_hash,
    'active',1,input.expiresAt);
   audit(input.operationId,actorUid,'review-grant',input.storyId,input.reviewerUid,1);
   return receipt('review-grant',input.storyId,1);
  });
 }

 async function revokeReview(request,input){
  if(!only(input,['operationId','storyId','reviewerUid','pinRevision','expectedRevision'])||
   !uuid(input.operationId)||!story(input.storyId)||!uid(input.reviewerUid)||
   !version(input.pinRevision)||!version(input.expectedRevision))
   throw Error('invalid-fixture-review-revoke-command');
  const actorUid=await authenticated(request);
  return storage.transactionSync(()=>{
   const pin=readPinRow(input.storyId);
   // A historical grant can still be explicitly marked revoked after a pin
   // rotation; it cannot become usable again under the newer pin revision.
   if(!pin||pin.revision<input.pinRevision)
    throw Error('fixture-review-conflict');
   const next=input.expectedRevision+1;
   if(!version(next))throw Error('fixture-review-revision-exhausted');
   const changed=all(`UPDATE vg_fixture_v49_assignments_g2o SET status='revoked',revision=?
    WHERE project_id=? AND story_id=? AND reviewer_uid=? AND pin_revision=?
    AND status='active' AND revision=? RETURNING revision`,next,
    projectId,input.storyId,input.reviewerUid,input.pinRevision,input.expectedRevision);
   if(changed.length!==1)throw Error('fixture-review-conflict');
   audit(input.operationId,actorUid,'review-revoke',input.storyId,input.reviewerUid,next);
   return receipt('review-revoke',input.storyId,next);
  });
 }

 function readSourcePin({storyId}={}){
  if(!story(storyId))return null;
  return storage.transactionSync(()=>{
   const row=readPinRow(storyId);
   return row?{storyId:row.story_id,ownerUid:row.owner_uid,
    sourceHash:row.source_hash,status:row.status,revision:row.revision}:null;
  });
 }
 function readReviewerAssignment({storyId,reviewerUid}={}){
  if(!story(storyId)||!uid(reviewerUid))return null;
  return storage.transactionSync(()=>{
   const pin=readPinRow(storyId);
   if(!pin||pin.status!=='active')return null;
   const row=one(`SELECT story_id,reviewer_uid,pin_revision,source_hash,status,revision,expires_at
    FROM vg_fixture_v49_assignments_g2o WHERE project_id=? AND story_id=?
    AND reviewer_uid=? AND pin_revision=?`,projectId,storyId,reviewerUid,pin.revision);
   if(!row||row.status!=='active'||row.source_hash!==pin.source_hash||
    row.expires_at<=time())return null;
   return {storyId:row.story_id,reviewerUid:row.reviewer_uid,
    status:'active',scope:'v49-draft-inspect',revision:row.revision,
    pinRevision:row.pin_revision,sourceHash:row.source_hash,expiresAt:row.expires_at};
  });
 }
 return Object.freeze({pinDraft,revokePin,grantReview,revokeReview,
  readSourcePin,readReviewerAssignment});
}
