// G2D: integrity-checked backup and empty-target restore for G2C fixture only.
// This module does not establish the authenticity of a backup, recover an
// authority database, or connect to a real Firebase/production environment.
import {hashAuthoringJson} from './vangioi-authoring.mjs';

const FORMAT='permit-fixture-backup-1';
const safeSeq=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const story=v=>typeof v==='string'&&!!v.trim()&&v.length<=160&&!/[\p{C}]/u.test(v);
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...fields].sort().join(',');
const key=r=>r.storyId+'\u0000'+r.contentHash;
const state=r=>(r.status==='active'&&r.revision===1)||(r.status==='revoked'&&r.revision===2);

export function createSqlPermitFixtureRecovery({storage,projectId,environment='fixture',
 maxEntries=1000,maxEvents=1000}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !/^[a-z0-9-]{1,64}$/.test(projectId||'')||environment!=='fixture'||
  !Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>10000||
  !Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>10000)
  throw new TypeError('G2D requires isolated bounded fixture-only SQLite storage');

 const all=(sql,...args)=>storage.sql.exec(sql,...args).toArray();
 const one=(sql,...args)=>all(sql,...args)[0]||null;
 const backupFields=['format','projectId','environment','checkpoint','entries','events'];

 function validate(snapshot){
  if(!only(snapshot,backupFields)||snapshot.format!==FORMAT||
   snapshot.projectId!==projectId||snapshot.environment!=='fixture'||
   !safeSeq(snapshot.checkpoint)||!Array.isArray(snapshot.entries)||
   !Array.isArray(snapshot.events)||snapshot.entries.length>maxEntries||
   snapshot.events.length>maxEvents)throw Error('invalid-fixture-backup');
  const keys=new Set();
  for(const entry of snapshot.entries){
   if(!only(entry,['storyId','contentHash','status','revision'])||
    !story(entry.storyId)||!hash(entry.contentHash)||!state(entry)||keys.has(key(entry)))
    throw Error('invalid-fixture-backup-entry');
   keys.add(key(entry));
  }
  const seenEvents=new Set(),seenKeys=new Set();let last=0;
  for(const event of snapshot.events){
   if(!only(event,['seq','eventId','storyId','contentHash'])||
    !safeSeq(event.seq)||event.seq<=last||!uuid(event.eventId)||
    !story(event.storyId)||!hash(event.contentHash)||seenEvents.has(event.eventId)||
    !keys.has(key(event)))throw Error('invalid-fixture-backup-event');
   last=event.seq;seenEvents.add(event.eventId);seenKeys.add(key(event));
  }
  if(last!==snapshot.checkpoint||seenKeys.size!==keys.size)
   throw Error('invalid-fixture-backup-history');
  return snapshot;
 }

 function readFixture(){
  return storage.transactionSync(()=>{
   // A backup must originate from a dedicated fixture. Never silently exclude
   // another project's rows while claiming to back up an entire fixture.
   const checkpoints=all('SELECT project_id,seq FROM vg_fixture_permit_checkpoint_v1');
   if(checkpoints.length!==1||checkpoints[0].project_id!==projectId||
    !safeSeq(checkpoints[0].seq))throw Error('fixture-source-scope-conflict');
   const nEntries=one('SELECT COUNT(*) AS n FROM vg_fixture_permit_projection_v1')?.n;
   const nEvents=one('SELECT COUNT(*) AS n FROM vg_fixture_permit_events_v1')?.n;
   if(!Number.isSafeInteger(nEntries)||!Number.isSafeInteger(nEvents)||
    nEntries>maxEntries||nEvents>maxEvents)throw Error('fixture-backup-limit');
   const entries=all(`SELECT project_id,story_id,content_hash,status,revision
    FROM vg_fixture_permit_projection_v1 ORDER BY story_id,content_hash`);
   const events=all(`SELECT project_id,seq,event_id,story_id,content_hash
    FROM vg_fixture_permit_events_v1 ORDER BY seq`);
   if(entries.length!==nEntries||events.length!==nEvents||
    entries.some(r=>r.project_id!==projectId)||events.some(r=>r.project_id!==projectId))
    throw Error('fixture-source-scope-conflict');
   return validate({format:FORMAT,projectId,environment:'fixture',
    checkpoint:checkpoints[0].seq,
    entries:entries.map(r=>({storyId:r.story_id,contentHash:r.content_hash,
     status:r.status,revision:r.revision})),
    events:events.map(r=>({seq:r.seq,eventId:r.event_id,
     storyId:r.story_id,contentHash:r.content_hash}))});
  });
 }

 async function createBackup(){
  const snapshot=readFixture();
  return {...snapshot,digest:await hashAuthoringJson(snapshot)};
 }

 async function checkedBackup(input){
  if(!only(input,[...backupFields,'digest'])||!hash(input.digest))
   throw Error('invalid-fixture-backup');
  // Normalize order, type and fields before hashing. This checksum only detects
  // corruption; a malicious actor could rehash a different, well-formed file.
  // Own copies before the async digest: callers must not mutate validated rows
  // during the await and smuggle an unchecked permission into the SQL writes.
  const snapshot=validate({format:input.format,projectId:input.projectId,
   environment:input.environment,checkpoint:input.checkpoint,
   entries:Array.isArray(input.entries)?input.entries.map(r=>({...r})):input.entries,
   events:Array.isArray(input.events)?input.events.map(r=>({...r})):input.events});
  if((await hashAuthoringJson(snapshot))!==input.digest)
   throw Error('fixture-backup-digest-mismatch');
  return snapshot;
 }

 async function verifyBackup(input){
  const snapshot=await checkedBackup(input);
  return {projectId,environment:'fixture',checkpoint:snapshot.checkpoint,backupDigest:input.digest};
 }

 async function restoreBackup(input){
  const snapshot=await checkedBackup(input);
  return storage.transactionSync(()=>{
   const checkpoints=all('SELECT project_id,seq FROM vg_fixture_permit_checkpoint_v1');
   const entries=one('SELECT COUNT(*) AS n FROM vg_fixture_permit_projection_v1')?.n;
   const events=one('SELECT COUNT(*) AS n FROM vg_fixture_permit_events_v1')?.n;
   if(checkpoints.length!==1||checkpoints[0].project_id!==projectId||
    checkpoints[0].seq!==0||entries!==0||events!==0)
    throw Error('fixture-restore-requires-empty-target');
   for(const r of snapshot.entries)
    storage.sql.exec('INSERT INTO vg_fixture_permit_projection_v1 VALUES(?,?,?,?,?)',
     projectId,r.storyId,r.contentHash,r.status,r.revision);
   for(const r of snapshot.events)
    storage.sql.exec('INSERT INTO vg_fixture_permit_events_v1 VALUES(?,?,?,?,?)',
     projectId,r.seq,r.eventId,r.storyId,r.contentHash);
   const updated=all(`UPDATE vg_fixture_permit_checkpoint_v1 SET seq=?
    WHERE project_id=? AND seq=0 RETURNING seq`,snapshot.checkpoint,projectId);
   if(updated.length!==1)throw Error('fixture-restore-checkpoint-conflict');
   return {ok:true,projectId,environment:'fixture',checkpoint:snapshot.checkpoint,
    entryCount:snapshot.entries.length,eventCount:snapshot.events.length};
  });
 }

 return Object.freeze({createBackup,verifyBackup,restoreBackup});
}
