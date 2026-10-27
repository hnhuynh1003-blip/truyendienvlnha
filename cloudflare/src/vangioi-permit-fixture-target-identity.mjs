// G2H: opt-in target identity stored inside one isolated G2C SQLite fixture.
// An ID copied with a SQLite file is NOT a physical device attestation.

const project=v=>typeof v==='string'&&/^[a-z0-9-]{1,64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);

export function createSqlFixtureTargetIdentity({storage,projectId,environment='fixture',
 provision=false}={}){
 if(!storage?.sql||typeof storage.sql.exec!=='function'||typeof storage.transactionSync!=='function'||
  !project(projectId)||environment!=='fixture'||typeof provision!=='boolean')
  throw new TypeError('G2H requires isolated fixture-only target identity storage');
 const all=(sql,...args)=>storage.sql.exec(sql,...args).toArray();
 if(provision)storage.transactionSync(()=>{
  // Never mint an identity on arbitrary SQLite storage lacking G2C's isolated
  // fixture checkpoint. This does not replace service-level authorization.
  const checkpoints=all('SELECT project_id FROM vg_fixture_permit_checkpoint_v1');
  if(checkpoints.length!==1||checkpoints[0].project_id!==projectId)
   throw Error('fixture-target-checkpoint-scope-conflict');
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS vg_fixture_restore_target_identity_v1(
   project_id TEXT PRIMARY KEY,target_id TEXT NOT NULL UNIQUE)`);
  for(const op of ['UPDATE','DELETE'])storage.sql.exec(`CREATE TRIGGER IF NOT EXISTS vg_fixture_restore_target_identity_${op.toLowerCase()}_v1
   BEFORE ${op} ON vg_fixture_restore_target_identity_v1
   BEGIN SELECT RAISE(ABORT,'immutable-fixture-target-identity'); END`);
  const rows=all('SELECT project_id,target_id FROM vg_fixture_restore_target_identity_v1');
  if(rows.length>1||rows.some(row=>row.project_id!==projectId||!uuid(row.target_id)))
   throw Error('fixture-target-scope-conflict');
  if(rows.length===0)storage.sql.exec('INSERT INTO vg_fixture_restore_target_identity_v1 VALUES(?,?)',
   projectId,crypto.randomUUID());
 });

 function readIdentity(){
  // Read-only mode never creates a new identity while verifying a target.
  return storage.transactionSync(()=>{
   const rows=all('SELECT project_id,target_id FROM vg_fixture_restore_target_identity_v1');
   if(rows.length!==1||rows[0].project_id!==projectId||!uuid(rows[0].target_id))
    throw Error('fixture-target-identity-unavailable');
   return {projectId,environment:'fixture',targetFixtureId:rows[0].target_id};
  });
 }
 return Object.freeze({readIdentity});
}
