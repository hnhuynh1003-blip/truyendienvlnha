import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqlAuthoringService} from '../src/vangioi-authoring-sql.mjs';
import {verifySubmissionIntegrity} from '../src/vangioi-authoring.mjs';

const W='world-sql-test',OWNER='sql-test-owner',EDITOR='sql-test-editor';
const req=(user=OWNER,body={})=>new Request('https://unit.test/authoring',{
 method:'POST',headers:{Authorization:'Bearer '+user,'Content-Type':'application/json'},body:JSON.stringify(body)});
const input=(patch={title:'New title'},expectedRevision=1,requestId=crypto.randomUUID())=>
 ({worldId:W,expectedRevision,requestId,patch});
function setup({path=':memory:',seed=true,validateContent,now=()=>1000}={}){
 const db=new DatabaseSync(path);
 const hooks={failAfter:null,beforeTransaction:null,transactions:0};
 const sql={exec(q,...args){
  const text=q.trim();let result;
  if(text.startsWith('CREATE ')){db.exec(text);result=[];}
  else{
   const statement=db.prepare(text);
   result=/^(SELECT|WITH)\b/i.test(text)||/\bRETURNING\b/i.test(text)?statement.all(...args):(statement.run(...args),[]);
  }
  if(hooks.failAfter&&text.includes(hooks.failAfter)){
   hooks.failAfter=null;throw Error('INJECTED_PRIVATE_STORAGE_FAILURE');
  }
  return {toArray:()=>result};
 }};
 const storage={sql,transactionSync(fn){
  hooks.transactions++;
  hooks.beforeTransaction?.(hooks.transactions);
  db.exec('BEGIN IMMEDIATE');
  try{const r=fn();db.exec('COMMIT');return r;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const validator=validateContent|| (async()=>({readyForReview:true,errors:[],validatorVersion:'sql-fixture-v1'}));
 const create=(overrides={})=>createSqlAuthoringService({storage,projectId:'truyendienvl',
  verify:async r=>{
   const user=r.headers.get('Authorization')?.replace('Bearer ','');
   return user&&user!=='guest'?{uid:user,admin:user==='sql-test-admin'}:null;
  },validateContent:validator,now,...overrides});
 const service=create();
 const rows=(q,...args)=>sql.exec(q,...args).toArray();
 if(seed){
  sql.exec(`INSERT INTO vg_authoring_worlds_v1
   (world_id,owner_uid,draft_revision,access_revision,draft_state,contributors_json)
   VALUES(?,?,1,1,'draft','[]')`,W,OWNER);
  sql.exec('INSERT INTO vg_authoring_drafts_v1 VALUES(?,1,?)',W,
   JSON.stringify({title:'Initial',story:{secretTruth:'SQL_AUTHOR_SECRET'},scenes:[]}));
  sql.exec('INSERT INTO vg_authoring_members_v1 VALUES(?,?,\'active\',?,?)',
   W,EDITOR,JSON.stringify(['collaborator']),JSON.stringify(['scenes']));
 }
 const counts=()=>Object.fromEntries(['drafts','submissions','operations','audit']
  .map(name=>[name,rows(`SELECT COUNT(*) AS n FROM vg_authoring_${name}_v1`)[0].n]));
 return {db,sql,storage,hooks,create,service,rows,counts,close:()=>db.close()};
}

test('G1C save commits content/header/contributor/receipt/audit and retains prior revision',async()=>{
 const f=setup();try{
  const r=await f.service.saveDraft(req(),input());
  assert.deepEqual(r,{ok:true,worldId:W,revision:2,state:'draft',replayed:false});
  assert.deepEqual(f.counts(),{drafts:2,submissions:0,operations:1,audit:1});
  const world=f.rows('SELECT * FROM vg_authoring_worlds_v1')[0];
  assert.equal(world.draft_revision,2);assert.deepEqual(JSON.parse(world.contributors_json),[OWNER]);
  assert.equal(JSON.parse(f.rows('SELECT content_json FROM vg_authoring_drafts_v1 WHERE revision=1')[0].content_json).title,'Initial');
  const v=await f.service.viewDraft(req(),{worldId:W});
  assert.equal(v.revision,2);assert.equal(v.content.title,'New title');
  assert.equal(v.content.story.secretTruth,'SQL_AUTHOR_SECRET');
 }finally{f.close();}
});
test('G1C collaborator stores scoped edits and never reads Story Bible',async()=>{
 const f=setup();try{
  const r=await f.service.saveDraft(req(EDITOR),input({scenes:[{sceneId:'new-scene'}]}));
  assert.equal(r.ok,true);
  const v=await f.service.viewDraft(req(EDITOR),{worldId:W});
  assert.deepEqual(Object.keys(v.content),['scenes']);
  assert.equal(JSON.stringify(v).includes('SQL_AUTHOR_SECRET'),false);
  assert.deepEqual(JSON.parse(f.rows('SELECT contributors_json FROM vg_authoring_worlds_v1')[0].contributors_json),[EDITOR]);
 }finally{f.close();}
});
test('G1C repeated identical edit returns its receipt without another revision or audit',async()=>{
 const f=setup();try{
  const a=input();const first=await f.service.saveDraft(req(),a);
  const replay=await f.service.saveDraft(req(),a);
  assert.equal(first.replayed,false);assert.equal(replay.replayed,true);
  assert.equal(replay.revision,first.revision);
  assert.deepEqual(f.counts(),{drafts:2,submissions:0,operations:1,audit:1});
 }finally{f.close();}
});
test('G1C canonical request fingerprint ignores patch key order',async()=>{
 const f=setup();try{
  const a=input({title:'Ordered',scenes:[]});
  assert.equal((await f.service.saveDraft(req(),a)).ok,true);
  const b={...a,patch:{scenes:[],title:'Ordered'}};
  assert.equal((await f.service.saveDraft(req(),b)).replayed,true);
 }finally{f.close();}
});
test('G1C reusing request ID for different data/action is rejected',async()=>{
 const f=setup();try{
  const a=input();await f.service.saveDraft(req(),a);
  assert.equal((await f.service.saveDraft(req(),{...a,patch:{title:'Different'}})).code,'idempotency-conflict');
  const {patch,...b}=a;
  assert.equal((await f.service.submitDraft(req(),b)).code,'idempotency-conflict');
  assert.equal(f.counts().audit,1);
 }finally{f.close();}
});
test('G1C two edits from the same revision cannot silently overwrite each other',async()=>{
 const f=setup();try{
  const rs=await Promise.all([f.service.saveDraft(req(),input({title:'Writer A'})),
   f.service.saveDraft(req(),input({title:'Writer B'}))]);
  assert.equal(rs.filter(r=>r.ok).length,1);
  assert.equal(rs.filter(r=>r.code==='revision-conflict').length,1);
  assert.deepEqual(f.counts(),{drafts:2,submissions:0,operations:1,audit:1});
 }finally{f.close();}
});
test('G1C concurrent identical edit retries both acknowledge one committed edit',async()=>{
 const f=setup();try{
  const a=input();const rs=await Promise.all([f.service.saveDraft(req(),a),f.service.saveDraft(req(),a)]);
  assert.equal(rs.every(r=>r.ok),true);assert.equal(rs.filter(r=>r.replayed).length,1);
  assert.equal(f.counts().operations,1);assert.equal(f.counts().drafts,2);
 }finally{f.close();}
});
test('G1C submission atomically locks the revision and persists a verifiable snapshot',async()=>{
 const f=setup();try{
  const a={worldId:W,expectedRevision:1,requestId:crypto.randomUUID()};
  const r=await f.service.submitDraft(req(),a);
  assert.equal(r.ok,true);assert.equal(r.state,'submitted');
  assert.deepEqual(f.counts(),{drafts:1,submissions:1,operations:1,audit:1});
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'submitted');
  const s=JSON.parse(f.rows('SELECT snapshot_json FROM vg_authoring_submissions_v1')[0].snapshot_json);
  assert.equal(await verifySubmissionIntegrity(s),true);
  assert.equal(s.content.story.secretTruth,'SQL_AUTHOR_SECRET');
  assert.equal((await f.service.saveDraft(req(),input())).ok,false);
  assert.equal((await f.service.submitDraft(req(),{...a,requestId:crypto.randomUUID()})).ok,false);
 }finally{f.close();}
});
test('G1C a lost submission response retries successfully even though the draft is locked',async()=>{
 let validations=0;
 const f=setup({validateContent:async()=>{
  validations++;return {readyForReview:true,errors:[],validatorVersion:'test'};
 }});try{
  const a={worldId:W,expectedRevision:1,requestId:crypto.randomUUID()};
  const first=await f.service.submitDraft(req(),a);
  const replay=await f.service.submitDraft(req(),a);
  assert.equal(replay.replayed,true);assert.equal(replay.snapshotHash,first.snapshotHash);
  assert.equal(validations,1);assert.equal(f.counts().submissions,1);assert.equal(f.counts().audit,1);
 }finally{f.close();}
});
test('G1C concurrent identical submissions commit exactly one snapshot and receipt',async()=>{
 const f=setup();try{
  const a={worldId:W,expectedRevision:1,requestId:crypto.randomUUID()};
  const rs=await Promise.all([f.service.submitDraft(req(),a),f.service.submitDraft(req(),a)]);
  assert.equal(rs.every(r=>r.ok),true);assert.equal(rs.filter(r=>r.replayed).length,1);
  assert.equal(rs[0].snapshotHash,rs[1].snapshotHash);
  assert.deepEqual(f.counts(),{drafts:1,submissions:1,operations:1,audit:1});
 }finally{f.close();}
});
test('G1C concurrent edit versus submission has one winner for a revision',async()=>{
 const f=setup();try{
  const rs=await Promise.all([f.service.saveDraft(req(),input()),f.service.submitDraft(req(),
   {worldId:W,expectedRevision:1,requestId:crypto.randomUUID()})]);
  assert.equal(rs.filter(r=>r.ok).length,1);
  assert.equal(f.counts().operations,1);assert.equal(f.counts().audit,1);
 }finally{f.close();}
});
test('G1C failures after writes roll back draft/header/receipt/audit together',async()=>{
 for(const failure of ['UPDATE vg_authoring_worlds_v1','INSERT INTO vg_authoring_operations_v1',
  'INSERT INTO vg_authoring_audit_v1']){
  const f=setup();try{
   f.hooks.failAfter=failure;
   const a=input();const r=await f.service.saveDraft(req(),a);
   assert.deepEqual(r,{ok:false,code:'authoring-unavailable'});
   assert.deepEqual(f.counts(),{drafts:1,submissions:0,operations:0,audit:0});
   assert.equal(f.rows('SELECT draft_revision FROM vg_authoring_worlds_v1')[0].draft_revision,1);
   assert.equal((await f.service.saveDraft(req(),a)).ok,true);
  }finally{f.close();}
 }
});
test('G1C a failed submission cannot leave a locked draft or orphan snapshot',async()=>{
 const f=setup();try{
  f.hooks.failAfter='INSERT INTO vg_authoring_audit_v1';
  const a={worldId:W,expectedRevision:1,requestId:crypto.randomUUID()};
  assert.equal((await f.service.submitDraft(req(),a)).ok,false);
  assert.deepEqual(f.counts(),{drafts:1,submissions:0,operations:0,audit:0});
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'draft');
  assert.equal((await f.service.submitDraft(req(),a)).ok,true);
 }finally{f.close();}
});
test('G1C revocation in the gap before the write transaction is checked inside that transaction',async()=>{
 const f=setup();try{
  const target=f.hooks.transactions+2;
  f.hooks.beforeTransaction=n=>{
   if(n===target){
    f.sql.exec("UPDATE vg_authoring_members_v1 SET status='revoked' WHERE uid=?",EDITOR);
    f.sql.exec('UPDATE vg_authoring_worlds_v1 SET access_revision=access_revision+1');
   }
  };
  assert.equal((await f.service.saveDraft(req(EDITOR),input({scenes:[]}))).ok,false);
  assert.deepEqual(f.counts(),{drafts:1,submissions:0,operations:0,audit:0});
 }finally{f.close();}
});
test('G1C owner/access revision changes in the final gap cannot commit a stale plan',async()=>{
 for(const query of ["UPDATE vg_authoring_worlds_v1 SET owner_uid='new-owner',access_revision=2",
  'UPDATE vg_authoring_worlds_v1 SET access_revision=2']){
  const f=setup();try{
   const target=f.hooks.transactions+2;
   f.hooks.beforeTransaction=n=>{if(n===target)f.sql.exec(query);};
   assert.equal((await f.service.saveDraft(req(),input())).ok,false);
   assert.equal(f.counts().drafts,1);assert.equal(f.counts().audit,0);
  }finally{f.close();}
 }
});
test('G1C request receipts cannot be replayed after the actor loses current rights',async()=>{
 const f=setup();try{
  const a=input({scenes:[]});assert.equal((await f.service.saveDraft(req(EDITOR),a)).ok,true);
  f.sql.exec("UPDATE vg_authoring_members_v1 SET status='revoked' WHERE uid=?",EDITOR);
  assert.equal((await f.service.saveDraft(req(EDITOR),a)).code,'forbidden');
  assert.equal(f.counts().operations,1);
 }finally{f.close();}
});
test('G1C request ID alone cannot read another UID receipt',async()=>{
 const f=setup();try{
  const a=input({scenes:[]});assert.equal((await f.service.saveDraft(req(EDITOR),a)).ok,true);
  const other=await f.service.saveDraft(req(OWNER),a);
  assert.equal(other.ok,false);assert.equal(other.replayed,undefined);
  assert.equal(f.counts().operations,1);
 }finally{f.close();}
});
test('G1C guests, unassigned readers, forged admins and out-of-scope patches never write',async()=>{
 const f=setup();try{
  for(const user of ['guest','sql-test-reader','sql-test-admin',EDITOR])
   assert.equal((await f.service.saveDraft(req(user,{ownerUid:user,admin:true}),input())).ok,false);
  assert.deepEqual(f.counts(),{drafts:1,submissions:0,operations:0,audit:0});
 }finally{f.close();}
});
test('G1C malformed IDs/revisions or injected plans are refused before writes',async()=>{
 const f=setup();try{
  for(const patch of [{requestId:'not-uuid'},{worldId:"'; DROP TABLE x;--"},{expectedRevision:true},
   {ownerUid:'forged'},{plan:{ok:true}},{patch:{officialWorldRank:'S'}}])
   assert.equal((await f.service.saveDraft(req(),{...input(),...patch})).ok,false);
  assert.equal(f.counts().drafts,1);
 }finally{f.close();}
});
test('G1C SQL-looking story prose is bound as data and never executed',async()=>{
 const f=setup();try{
  const title="'; DROP TABLE vg_authoring_worlds_v1; --";
  assert.equal((await f.service.saveDraft(req(),input({title}))).ok,true);
  assert.equal((await f.service.viewDraft(req(),{worldId:W})).content.title,title);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_authoring_worlds_v1')[0].n,1);
 }finally{f.close();}
});
test('G1C validator missing/rejected/offline cannot persist submission',async()=>{
 const f=setup();try{
  for(const validateContent of [undefined,async()=>({readyForReview:false,errors:['not ready']}),
   async()=>{throw Error('VALIDATOR_PRIVATE_ERROR');}]){
   const s=f.create({validateContent});
   assert.equal((await s.submitDraft(req(),{worldId:W,expectedRevision:1,requestId:crypto.randomUUID()})).ok,false);
  }
  assert.deepEqual(f.counts(),{drafts:1,submissions:0,operations:0,audit:0});
 }finally{f.close();}
});
test('G1C immutable SQL triggers reject updates/deletes of history, snapshots, receipts and audit',async()=>{
 const f=setup();try{
  await f.service.saveDraft(req(),input());
  await f.service.submitDraft(req(),{worldId:W,expectedRevision:2,requestId:crypto.randomUUID()});
  for(const [table,column] of [['drafts','content_json'],['submissions','snapshot_json'],
   ['operations','result_json'],['audit','action']]){
   assert.throws(()=>f.sql.exec(`UPDATE vg_authoring_${table}_v1 SET ${column}='tampered'`),/immutable-authoring-record/);
   assert.throws(()=>f.sql.exec(`DELETE FROM vg_authoring_${table}_v1`),/immutable-authoring-record/);
  }
  assert.equal(f.counts().drafts,2);assert.equal(f.counts().submissions,1);
 }finally{f.close();}
});
test('G1C receipts do not contain Story Bible, and audit stores only action metadata',async()=>{
 const f=setup();try{
  await f.service.saveDraft(req(),input());
  const output=JSON.stringify({operations:f.rows('SELECT * FROM vg_authoring_operations_v1'),
   audit:f.rows('SELECT * FROM vg_authoring_audit_v1')});
  assert.equal(output.includes('SQL_AUTHOR_SECRET'),false);
  assert.equal(output.includes('secretTruth'),false);
 }finally{f.close();}
});
test('G1C on-disk SQLite retains drafts, snapshots and deduplication after reopening',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vangioi-sql-'));
 const path=join(dir,'authoring.sqlite');let f;
 try{
  f=setup({path});await f.service.saveDraft(req(),input());
  const a={worldId:W,expectedRevision:2,requestId:crypto.randomUUID()};
  const submitted=await f.service.submitDraft(req(),a);assert.equal(submitted.ok,true);
  f.close();f=setup({path,seed:false});
  const replay=await f.service.submitDraft(req(),a);
  assert.equal(replay.replayed,true);assert.equal(replay.snapshotHash,submitted.snapshotHash);
  const s=await f.service.viewSubmission(req(),{worldId:W,snapshotHash:replay.snapshotHash});
  assert.equal(s.ok,true);assert.equal(s.snapshot.content.title,'New title');
  assert.deepEqual(f.counts(),{drafts:2,submissions:1,operations:2,audit:2});
 }finally{f?.close();rmSync(dir,{recursive:true,force:true});}
});
test('G1C scoped submission reads and contributor history survive SQL persistence',async()=>{
 const f=setup();try{
  await f.service.saveDraft(req(EDITOR),input({scenes:[]}));
  const s=await f.service.submitDraft(req(),{worldId:W,expectedRevision:2,requestId:crypto.randomUUID()});
  const r=await f.service.viewSubmission(req(EDITOR),{worldId:W,snapshotHash:s.snapshotHash});
  assert.equal(r.ok,true);assert.deepEqual(Object.keys(r.content),['scenes']);
  f.sql.exec('UPDATE vg_authoring_members_v1 SET roles_json=?,sections_json=? WHERE uid=?',
   JSON.stringify(['reviewer']),'[]',EDITOR);
  assert.equal((await f.service.viewSubmission(req(EDITOR),{worldId:W,snapshotHash:s.snapshotHash,forReview:true})).ok,false);
 }finally{f.close();}
});
test('G1C no world is auto-created or legacy account data deleted on unknown-world requests',async()=>{
 const f=setup();try{
  f.sql.exec('CREATE TABLE legacy_player_test(uid TEXT PRIMARY KEY,exp INTEGER)');
  f.sql.exec('INSERT INTO legacy_player_test VALUES(?,99)',OWNER);
  assert.equal((await f.service.saveDraft(req(),{...input(),worldId:'unknown-world'})).ok,false);
  assert.equal(f.rows('SELECT exp FROM legacy_player_test')[0].exp,99);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_authoring_worlds_v1')[0].n,1);
 }finally{f.close();}
});
