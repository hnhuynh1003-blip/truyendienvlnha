// G2C: isolated SQLite fixture sink for G1V's trusted permit replay callback.
// It is NOT a production consumer, authority, token issuer or live binding.

const seq=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const story=v=>typeof v==='string'&&!!v.trim()&&v.length<=160&&!/[\p{C}]/u.test(v);
const keys=(v,w)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...w].sort().join(',');
const state=v=>(v.status==='active'&&v.revision===1)||(v.status==='revoked'&&v.revision===2);

export function createSqlPermitFixtureSink({storage,projectId,environment='fixture'}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||environment!=='fixture')
  throw new TypeError('G2C requires isolated trusted fixture-only SQLite storage');
 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_permit_checkpoint_v1(
   project_id TEXT PRIMARY KEY,seq INTEGER NOT NULL CHECK(seq>=0))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_permit_projection_v1(
   project_id TEXT NOT NULL,story_id TEXT NOT NULL,content_hash TEXT NOT NULL,
   status TEXT NOT NULL CHECK(status IN ('active','revoked')),
   revision INTEGER NOT NULL CHECK((status='active' AND revision=1) OR (status='revoked' AND revision=2)),
   PRIMARY KEY(project_id,story_id,content_hash))`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_permit_events_v1(
   project_id TEXT NOT NULL,seq INTEGER NOT NULL CHECK(seq>0),event_id TEXT NOT NULL,
   story_id TEXT NOT NULL,content_hash TEXT NOT NULL,
   PRIMARY KEY(project_id,seq),UNIQUE(project_id,event_id))`);
  for(const op of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_permit_events_${op.toLowerCase()}_v1
   BEFORE ${op} ON vg_fixture_permit_events_v1 BEGIN SELECT RAISE(ABORT,'immutable-fixture-event'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_permit_projection_delete_v1
   BEFORE DELETE ON vg_fixture_permit_projection_v1 BEGIN SELECT RAISE(ABORT,'immutable-fixture-permit'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_permit_projection_update_v1
   BEFORE UPDATE ON vg_fixture_permit_projection_v1 WHEN
   NEW.project_id IS NOT OLD.project_id OR NEW.story_id IS NOT OLD.story_id OR
   NEW.content_hash IS NOT OLD.content_hash OR
   (OLD.status='revoked' AND NEW.status!='revoked') OR NEW.revision<OLD.revision
   BEGIN SELECT RAISE(ABORT,'fixture-revoke-wins'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_permit_checkpoint_delete_v1
   BEFORE DELETE ON vg_fixture_permit_checkpoint_v1 BEGIN SELECT RAISE(ABORT,'immutable-fixture-checkpoint'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_permit_checkpoint_update_v1
   BEFORE UPDATE ON vg_fixture_permit_checkpoint_v1 WHEN
   NEW.project_id IS NOT OLD.project_id OR NEW.seq<OLD.seq
   BEGIN SELECT RAISE(ABORT,'fixture-checkpoint-regression'); END`);
  storage.sql.exec('INSERT OR IGNORE INTO vg_fixture_permit_checkpoint_v1 VALUES(?,0)',projectId);
 });
 const all=(q,...args)=>storage.sql.exec(q,...args).toArray();
 const one=(q,...args)=>all(q,...args)[0]||null;

 function batch(input){
  if(!keys(input,['after','checkpoint','projections'])||!seq(input.after)||!seq(input.checkpoint)||
   input.checkpoint<=input.after||!Array.isArray(input.projections)||
   input.projections.length<1||input.projections.length>50)throw Error('invalid-fixture-batch');
  let previous=input.after;const events=new Set();
  for(const p of input.projections){
   if(!keys(p,['eventId','seq','storyId','contentHash','status','revision'])||
    !uuid(p.eventId)||!seq(p.seq)||p.seq<=previous||!story(p.storyId)||!hash(p.contentHash)||
    !state(p)||events.has(p.eventId))throw Error('invalid-fixture-event');
   previous=p.seq;events.add(p.eventId);
  }
  if(input.checkpoint!==previous)throw Error('invalid-fixture-checkpoint');
  return input.projections;
 }

 function commitBatch(input){
  // Invoked only by the trusted G1V host, never from client JSON or a route.
  const projections=batch(input);
  return storage.transactionSync(()=>{
   const cursor=one('SELECT seq FROM vg_fixture_permit_checkpoint_v1 WHERE project_id=?',projectId)?.seq;
   if(!seq(cursor))throw Error('fixture-checkpoint-unavailable');
   if(cursor!==input.after){
    // A previously committed batch may be acknowledged even when a later G1R
    // revoke made the historical issue event project a newer status on replay.
    // Event identity is immutable; no replay may rewrite data or checkpoint.
    if(input.checkpoint<=cursor&&projections.every(p=>{
     const event=one('SELECT event_id,story_id,content_hash FROM vg_fixture_permit_events_v1 WHERE project_id=? AND seq=?',
      projectId,p.seq);
     return event?.event_id===p.eventId&&event.story_id===p.storyId&&event.content_hash===p.contentHash;
    }))return {ok:true,replayed:true,checkpoint:cursor};
    throw Error('fixture-checkpoint-conflict');
   }
   for(const p of projections){
    const previous=one(`SELECT status,revision FROM vg_fixture_permit_projection_v1
     WHERE project_id=? AND story_id=? AND content_hash=?`,projectId,p.storyId,p.contentHash);
    if(previous&&(previous.status==='revoked'&&p.status!=='revoked'||p.revision<previous.revision))
     throw Error('fixture-revoke-wins');
    storage.sql.exec(`INSERT INTO vg_fixture_permit_projection_v1 VALUES(?,?,?,?,?)
     ON CONFLICT(project_id,story_id,content_hash) DO UPDATE SET status=excluded.status,revision=excluded.revision`,
     projectId,p.storyId,p.contentHash,p.status,p.revision);
    storage.sql.exec('INSERT INTO vg_fixture_permit_events_v1 VALUES(?,?,?,?,?)',
     projectId,p.seq,p.eventId,p.storyId,p.contentHash);
   }
   const advanced=all(`UPDATE vg_fixture_permit_checkpoint_v1 SET seq=?
    WHERE project_id=? AND seq=? RETURNING seq`,input.checkpoint,projectId,input.after);
   if(advanced.length!==1)throw Error('fixture-checkpoint-conflict');
   return {ok:true,replayed:false,checkpoint:input.checkpoint};
  });
 }

 function readReplicaSnapshot({projectId:requested=projectId,environment:mode='fixture'}={}){
  if(requested!==projectId||mode!=='fixture')throw Error('fixture-scope-conflict');
  return storage.transactionSync(()=>{
   const checkpoint=one('SELECT seq FROM vg_fixture_permit_checkpoint_v1 WHERE project_id=?',projectId)?.seq;
   if(!seq(checkpoint))throw Error('fixture-checkpoint-unavailable');
   const entries=all(`SELECT story_id,content_hash,status,revision FROM vg_fixture_permit_projection_v1
    WHERE project_id=? ORDER BY story_id,content_hash`,projectId).map(r=>({
     storyId:r.story_id,contentHash:r.content_hash,status:r.status,revision:r.revision}));
   return {projectId,environment:'fixture',checkpoint,entries};
  });
 }
 return Object.freeze({commitBatch,readReplicaSnapshot,
  readCheckpoint:()=>{const {projectId,environment,checkpoint}=readReplicaSnapshot();
   return {projectId,environment,checkpoint};}});
}
