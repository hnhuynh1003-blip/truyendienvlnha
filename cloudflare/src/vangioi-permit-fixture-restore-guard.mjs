// G2F: standalone SQLite fixture ledger for G2E verified restore attempts.
// This is an internal burn-on-attempt guard, NOT a distributed transaction,
// public endpoint, authority, key manager, or production backup policy.

const id=v=>typeof v==='string'&&/^[a-z0-9-]{1,64}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const seq=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...fields].sort().join(',');

export function createSqlFixturePermitRestoreGuard({storage,projectId,environment='fixture',maxAttempts=1000}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !id(projectId)||environment!=='fixture'||!Number.isSafeInteger(maxAttempts)||
  maxAttempts<1||maxAttempts>10000)
  throw new TypeError('G2F requires separate trusted bounded fixture-only SQLite ledger');
 storage.transactionSync(()=>{
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_restore_floor_v1(
   project_id TEXT PRIMARY KEY,checkpoint INTEGER NOT NULL CHECK(checkpoint>=0),
   digest TEXT)`);
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_restore_attempt_v1(
   project_id TEXT NOT NULL,nonce TEXT NOT NULL,issuer_id TEXT NOT NULL,
   key_id TEXT NOT NULL,backup_digest TEXT NOT NULL,checkpoint INTEGER NOT NULL,
   mac TEXT NOT NULL,created_at INTEGER NOT NULL,
   PRIMARY KEY(project_id,nonce))`);
  for(const op of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_restore_attempt_${op.toLowerCase()}_v1
   BEFORE ${op} ON vg_fixture_restore_attempt_v1 BEGIN SELECT RAISE(ABORT,'immutable-fixture-restore-attempt'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_restore_floor_delete_v1
   BEFORE DELETE ON vg_fixture_restore_floor_v1 BEGIN SELECT RAISE(ABORT,'immutable-fixture-restore-floor'); END`);
  storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_restore_floor_update_v1
   BEFORE UPDATE ON vg_fixture_restore_floor_v1 WHEN
   NEW.project_id IS NOT OLD.project_id OR NEW.checkpoint<OLD.checkpoint OR
   (NEW.checkpoint=OLD.checkpoint AND OLD.digest IS NOT NULL AND NEW.digest IS NOT OLD.digest)
   BEGIN SELECT RAISE(ABORT,'fixture-restore-floor-regression'); END`);
  storage.sql.exec('INSERT OR IGNORE INTO vg_fixture_restore_floor_v1 VALUES(?,0,NULL)',projectId);
 });

 const all=(sql,...args)=>storage.sql.exec(sql,...args).toArray();
 const one=(sql,...args)=>all(sql,...args)[0]||null;
 const state=()=>{
  const floors=all('SELECT project_id,checkpoint,digest FROM vg_fixture_restore_floor_v1');
  const attempts=all('SELECT project_id,nonce FROM vg_fixture_restore_attempt_v1');
  if(floors.length!==1||floors[0].project_id!==projectId||
   !seq(floors[0].checkpoint)||
   (floors[0].digest!==null&&!sha(floors[0].digest))||
   attempts.some(r=>r.project_id!==projectId)||attempts.length>maxAttempts)
   throw Error('fixture-restore-ledger-scope-conflict');
  return {floor:floors[0],count:attempts.length};
 };

 function reserveVerifiedSeal(input){
  // This callback MUST be called by the G2E host only after HMAC and G2D
  // checksum/structure verification. SQL alone cannot authenticate the seal.
  if(!only(input,['projectId','environment','issuerId','keyId','nonce','mac',
   'createdAt','checkpoint','backupDigest'])||input.projectId!==projectId||
   input.environment!=='fixture'||!id(input.issuerId)||!id(input.keyId)||
   !uuid(input.nonce)||!sha(input.mac)||!seq(input.checkpoint)||
   !sha(input.backupDigest)||!seq(input.createdAt))
   throw Error('invalid-fixture-verified-seal');
  return storage.transactionSync(()=>{
   const {floor,count}=state();
   if(one('SELECT nonce FROM vg_fixture_restore_attempt_v1 WHERE project_id=? AND nonce=?',
    projectId,input.nonce))throw Error('fixture-restore-seal-replay');
   if(input.checkpoint<floor.checkpoint)throw Error('fixture-restore-checkpoint-rollback');
   if(input.checkpoint===floor.checkpoint&&floor.digest!==null&&floor.digest!==input.backupDigest)
    throw Error('fixture-restore-checkpoint-fork');
   if(count>=maxAttempts)throw Error('fixture-restore-attempt-limit');
   storage.sql.exec('INSERT INTO vg_fixture_restore_attempt_v1 VALUES(?,?,?,?,?,?,?,?)',
    projectId,input.nonce,input.issuerId,input.keyId,input.backupDigest,
    input.checkpoint,input.mac,input.createdAt);
   const advanced=all(`UPDATE vg_fixture_restore_floor_v1 SET checkpoint=?,digest=?
    WHERE project_id=? AND checkpoint=? RETURNING checkpoint`,
    input.checkpoint,input.backupDigest,projectId,floor.checkpoint);
   if(advanced.length!==1)throw Error('fixture-restore-floor-conflict');
   return {ok:true,projectId,environment:'fixture',checkpoint:input.checkpoint};
  });
 }

 function readGuardSnapshot(){
  return storage.transactionSync(()=>{
   const {floor,count}=state();
   return {projectId,environment:'fixture',highwaterCheckpoint:floor.checkpoint,
    highwaterDigest:floor.digest,attemptCount:count};
  });
 }

 return Object.freeze({reserveVerifiedSeal,readGuardSnapshot});
}
