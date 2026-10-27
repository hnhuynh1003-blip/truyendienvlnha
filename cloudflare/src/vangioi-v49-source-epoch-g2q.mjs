// G2Q: metadata-only, fixture-only observed source epochs for EPUB V49.
// This is NOT an atomic Firestore writer, release fence or publish permission.

const project=v=>typeof v==='string'&&/^demo-[a-z0-9-]{1,59}$/.test(v);
const story=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const epoch=v=>Number.isSafeInteger(v)&&v>=1&&v<Number.MAX_SAFE_INTEGER;
const stamp=v=>Number.isSafeInteger(v)&&v>=0&&v<Number.MAX_SAFE_INTEGER;
const hash=v=>typeof v==='string'&&/^sha256-[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const only=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.getPrototypeOf(v)===Object.prototype&&
 Object.keys(v).sort().join(',')===[...keys].sort().join(',');

/**
 * Records OBSERVED versions of a synthetic fixture source. Callers MUST use
 * a trusted snapshot hash callback after every simulated source write,
 * including any restoration of previous bytes. It does not hook/lock real
 * Firestore writes; unrecorded changes and process gaps remain unobservable.
 */
export function createV49FixtureSourceEpochLedger({storage,projectId,
 environment='fixture',verifyOperator,readVerifiedDraftProof,now=Date.now}={}){
 if(environment!=='fixture'||!project(projectId)||!storage?.sql||
  typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  [verifyOperator,readVerifiedDraftProof,now].some(fn=>typeof fn!=='function'))
  throw new TypeError('G2Q requires trusted isolated fixture epoch callbacks');

 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_v49_epochs_g2q(
   project_id TEXT NOT NULL,story_id TEXT NOT NULL,owner_uid TEXT NOT NULL,
   source_epoch INTEGER NOT NULL CHECK(source_epoch>=1),
   source_hash TEXT NOT NULL,chapter_count INTEGER NOT NULL
    CHECK(chapter_count>=1 AND chapter_count<=160),
   PRIMARY KEY(project_id,story_id))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_v49_epoch_ops_g2q(
   project_id TEXT NOT NULL,operation_id TEXT NOT NULL,story_id TEXT NOT NULL,
   actor_uid TEXT NOT NULL,source_epoch INTEGER NOT NULL,
   source_hash TEXT NOT NULL,observed_at INTEGER NOT NULL,
   PRIMARY KEY(project_id,operation_id),
   UNIQUE(project_id,story_id,source_epoch))`);
  for(const action of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS
   vg_fixture_v49_epoch_ops_${action.toLowerCase()}_g2q
   BEFORE ${action} ON vg_fixture_v49_epoch_ops_g2q
   BEGIN SELECT RAISE(ABORT,'immutable-fixture-epoch-op'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_epochs_delete_g2q
   BEFORE DELETE ON vg_fixture_v49_epochs_g2q
   BEGIN SELECT RAISE(ABORT,'immutable-fixture-epoch'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_v49_epochs_update_g2q
   BEFORE UPDATE ON vg_fixture_v49_epochs_g2q WHEN
    NEW.project_id IS NOT OLD.project_id OR NEW.story_id IS NOT OLD.story_id OR
    NEW.owner_uid IS NOT OLD.owner_uid OR
    NEW.source_epoch!=OLD.source_epoch+1
   BEGIN SELECT RAISE(ABORT,'fixture-epoch-regression'); END`);
 });
 const one=(sql,...args)=>storage.sql.exec(sql,...args).toArray()[0]??null;
 const current=storyId=>one(`SELECT owner_uid,source_epoch,source_hash,chapter_count
  FROM vg_fixture_v49_epochs_g2q WHERE project_id=? AND story_id=?`,
  projectId,storyId);
 const time=()=>{const t=now();if(!stamp(t))throw Error('fixture-epoch-clock-unavailable');return t;};

 async function recordObservedEpoch(request,input){
  if(!only(input,['operationId','storyId','expectedEpoch'])||
   !uuid(input.operationId)||!story(input.storyId)||
   (input.expectedEpoch!==null&&!epoch(input.expectedEpoch)))
   throw Error('invalid-fixture-epoch-command');
  let actor;
  try{actor=await verifyOperator(request);}catch{throw Error('fixture-epoch-operator-required');}
  if(!uid(actor?.uid)||actor.operator!==true)
   throw Error('fixture-epoch-operator-required');

  let proof;
  try{proof=await readVerifiedDraftProof({storyId:input.storyId});}
  catch{throw Error('fixture-epoch-proof-unavailable');}
  if(!only(proof,['storyId','ownerUid','sourceHash','chapterCount'])||
   proof.storyId!==input.storyId||!uid(proof.ownerUid)||!hash(proof.sourceHash)||
   !Number.isSafeInteger(proof.chapterCount)||proof.chapterCount<1||
   proof.chapterCount>160)throw Error('fixture-epoch-proof-unavailable');

  return storage.transactionSync(()=>{
   const previous=current(input.storyId);
   let next;
   if(!previous){
    if(input.expectedEpoch!==null)throw Error('fixture-source-epoch-conflict');
    next=1;
    storage.sql.exec(`INSERT INTO vg_fixture_v49_epochs_g2q
     VALUES(?,?,?,?,?,?)`,projectId,input.storyId,proof.ownerUid,next,
     proof.sourceHash,proof.chapterCount);
   }else{
    if(previous.source_epoch!==input.expectedEpoch||
     previous.owner_uid!==proof.ownerUid)
     throw Error('fixture-source-epoch-conflict');
    next=previous.source_epoch+1;
    if(!epoch(next))throw Error('fixture-source-epoch-exhausted');
    // Same hash is intentionally accepted: a source writer can record A->B->A
    // or repeat an identical write without erasing the monotonic epoch.
    const rows=storage.sql.exec(`UPDATE vg_fixture_v49_epochs_g2q
     SET source_epoch=?,source_hash=?,chapter_count=?
     WHERE project_id=? AND story_id=? AND source_epoch=?
     RETURNING source_epoch`,next,proof.sourceHash,proof.chapterCount,
     projectId,input.storyId,previous.source_epoch).toArray();
    if(rows.length!==1)throw Error('fixture-source-epoch-conflict');
   }
   storage.sql.exec(`INSERT INTO vg_fixture_v49_epoch_ops_g2q
    VALUES(?,?,?,?,?,?,?)`,projectId,input.operationId,input.storyId,
    actor.uid,next,proof.sourceHash,time());
   return Object.freeze({ok:true,storyId:input.storyId,sourceEpoch:next,
    sourceHash:proof.sourceHash,observedFixtureOnly:true,canPublish:false});
  });
 }

 function readSourceEpoch({storyId}={}){
  if(!story(storyId))return null;
  return storage.transactionSync(()=>{
   const record=current(storyId);
   if(!record)return null;
   const highwater=one(`SELECT COALESCE(MAX(rowid),0) AS cursor
    FROM vg_fixture_v49_epoch_ops_g2q WHERE project_id=? AND story_id=?`,
    projectId,storyId)?.cursor;
   if(!Number.isSafeInteger(highwater)||highwater<1)
    throw Error('fixture-epoch-history-unavailable');
   return Object.freeze({storyId,ownerUid:record.owner_uid,
    sourceEpoch:record.source_epoch,sourceHash:record.source_hash,
    chapterCount:record.chapter_count,operationHighwater:highwater});
  });
 }
 return Object.freeze({recordObservedEpoch,readSourceEpoch});
}
