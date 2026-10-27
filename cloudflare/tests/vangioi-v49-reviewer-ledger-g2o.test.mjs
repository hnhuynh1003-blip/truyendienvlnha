import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createV49SqlFixtureReviewerLedger} from '../src/vangioi-v49-reviewer-ledger-g2o.mjs';
import {createV49DraftIntegrityInspection,hashV49DraftSnapshot}
 from '../src/vangioi-v49-draft-integrity-g2n.mjs';

const STORY='epub-g2o-synthetic',OWNER='author-a',REVIEWER='reviewer-b';
const NOW=Date.parse('2026-10-27T15:00:00.000Z');
const ID=()=>crypto.randomUUID();
const request=(token='operator',body={})=>new Request('https://offline.invalid/g2o',{
 method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
const twoChapterDraft=()=>{
 const chapters=['Nội dung thứ nhất','Nội dung thứ hai'].map((content,order)=>({
  id:'chapter-'+String(order+1).padStart(4,'0'),title:'Chương '+(order+1),
  content,order,wordCount:content.split(/\s+/).length}));
 return {book:{id:STORY,ownerUid:OWNER,status:'draft',title:'Truyện tổng hợp G2O',
  author:'Người viết A',genre:'Nhập EPUB',importSchema:57,chapterCount:2,
  chapterIndex:chapters.map(({id,title,order,wordCount})=>({id,title,order,wordCount})),
  createdAt:'2026-10-27T14:00:00.000Z',updatedAt:'2026-10-27T14:10:00.000Z',
  sourceName:'fictional.epub',importFingerprint:'v57-0123456789abcdef-2',coverImage:''},chapters};
};

function setup(){
 const db=new DatabaseSync(':memory:'),state={raw:twoChapterDraft(),clock:NOW,
  proofReads:0,breakSql:null,verified:0};
 const sql={exec(q,...args){
  let rows=[];
  if(q.trim().startsWith('CREATE '))db.exec(q);
  else{
   const statement=db.prepare(q);
   if(/^\s*(SELECT|WITH)\b|\bRETURNING\b/i.test(q))rows=statement.all(...args);
   else statement.run(...args);
  }
  if(state.breakSql&&q.includes(state.breakSql)){
   state.breakSql=null;throw Error('PRIVATE_SQL_FAILURE');
  }
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){
  db.exec('BEGIN IMMEDIATE');
  try{const result=fn();db.exec('COMMIT');return result;}
  catch(err){db.exec('ROLLBACK');throw err;}
 }};
 const verifyOperator=async req=>{
  state.verified++;
  const token=req?.headers?.get('authorization');
  return token==='Bearer operator'?{uid:'verified-operator',operator:true}:
   token==='Bearer forged-role'?{uid:'reviewer-b',operator:false}:null;
 };
 const readVerifiedDraftProof=async({storyId})=>{
  state.proofReads++;
  return hashV49DraftSnapshot(structuredClone(state.raw),{storyId});
 };
 const makeLedger=(projectId='demo-g2o-fixture')=>createV49SqlFixtureReviewerLedger({
  storage,projectId,verifyOperator,readVerifiedDraftProof,now:()=>state.clock});
 const ledger=makeLedger();
 const rows=(query,...args)=>sql.exec(query,...args).toArray();
 const pin=(expectedRevision=null,operationId=ID())=>({operationId,storyId:STORY,expectedRevision});
 const grant=(expectedPinRevision=1,reviewerUid=REVIEWER,operationId=ID())=>({
  operationId,storyId:STORY,reviewerUid,expectedPinRevision,expiresAt:state.clock+60000});
 const revoke=(pinRevision=1,expectedRevision=1,operationId=ID())=>({
  operationId,storyId:STORY,reviewerUid:REVIEWER,pinRevision,expectedRevision});
 return {db,state,storage,sql,rows,makeLedger,ledger,pin,grant,revoke,close:()=>db.close()};
}

test('G2O pin is computed from actual trusted draft proof and persists to SQLite',async()=>{
 const f=setup();try{
  const result=await f.ledger.pinDraft(request(),f.pin());
  assert.deepEqual(result,{ok:true,kind:'pin-initial',storyId:STORY,revision:1,
   fixtureOnly:true,canPublish:false});
  assert.equal(f.state.proofReads,1);
  const pin=f.ledger.readSourcePin({storyId:STORY});
  assert.deepEqual(pin,{storyId:STORY,ownerUid:OWNER,status:'active',revision:1,
   sourceHash:(await hashV49DraftSnapshot(f.state.raw,{storyId:STORY})).sourceHash});
  assert.deepEqual(f.makeLedger().readSourcePin({storyId:STORY}),pin);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_operations_g2o')[0].n,1);
  assert.equal(JSON.stringify(f.rows('SELECT * FROM vg_fixture_v49_pins_g2o'))
   .includes('Nội dung thứ nhất'),false);
 }finally{f.close();}
});

test('G2O only trusts operator verified outside client; untrusted source hash cannot be pinned',async()=>{
 const f=setup();try{
  await assert.rejects(f.ledger.pinDraft(request('forged-role',{admin:true,operator:true}),
   f.pin()),/fixture-operator-required/);
  await assert.rejects(f.ledger.pinDraft(request('guest',{uid:'verified-operator',operator:true}),
   f.pin()),/fixture-operator-required/);
  assert.equal(f.state.proofReads,0);
  for(const command of [
   {...f.pin(),sourceHash:'sha256-'+'a'.repeat(64)},
   {...f.pin(),ownerUid:'attacker'},
   {...f.pin(),status:'approved'},
   {...f.pin(),expectedRevision:0},
   {...f.pin(),storyId:'../admin'},
   {...f.pin(),operationId:'browser-id'}
  ])await assert.rejects(f.ledger.pinDraft(request(),command),/invalid-fixture-pin-command/);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_pins_g2o')[0].n,0);
 }finally{f.close();}
});

test('G2O a server assignment is scoped to exact current pin and expires safely',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  const g=await f.ledger.grantReview(request(),f.grant());
  assert.equal(g.ok,true);assert.equal(g.canPublish,false);
  const assigned=f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER});
  assert.deepEqual(assigned,{storyId:STORY,reviewerUid:REVIEWER,status:'active',
   scope:'v49-draft-inspect',revision:1,pinRevision:1,
   sourceHash:f.ledger.readSourcePin({storyId:STORY}).sourceHash,expiresAt:NOW+60000});
  assert.equal(f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:'unassigned'}),null);
  f.state.clock+=60000;
  assert.equal(f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
 }finally{f.close();}
});

test('G2O refuses self-review, stale revision, oversized expiry and client-granted roles',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  for(const command of [
   f.grant(2),f.grant(1,OWNER),f.grant(1,'verified-operator'),
   {...f.grant(),expiresAt:NOW},
   {...f.grant(),expiresAt:NOW+7*24*60*60*1000+1},
   {...f.grant(),role:'publisher'},
   {...f.grant(),scope:'v49-publish'},
   {...f.grant(),sourceHash:f.ledger.readSourcePin({storyId:STORY}).sourceHash}
  ])await assert.rejects(f.ledger.grantReview(request(),command));
  await assert.rejects(f.ledger.grantReview(request('forged-role',{admin:true}),f.grant()),
   /fixture-operator-required/);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_assignments_g2o')[0].n,0);
 }finally{f.close();}
});

test('G2O reviewer revocation is monotonic, persists and cannot be silently regranted',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  await f.ledger.grantReview(request(),f.grant());
  const r=await f.ledger.revokeReview(request(),f.revoke());
  assert.equal(r.kind,'review-revoke');assert.equal(r.revision,2);
  assert.equal(f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
  assert.equal(f.makeLedger().readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
  await assert.rejects(f.ledger.revokeReview(request(),f.revoke()),/fixture-review-conflict/);
  await assert.rejects(f.ledger.grantReview(request(),f.grant()),/UNIQUE constraint failed/);
  const row=f.rows('SELECT status,revision FROM vg_fixture_v49_assignments_g2o')[0];
  assert.equal(row.status,'revoked');assert.equal(row.revision,2);
 }finally{f.close();}
});

test('G2O source rotation invalidates old grants; new pin requires new operator grant',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  await f.ledger.grantReview(request(),f.grant());
  f.state.raw.chapters[0].content='Nội dung đổi bởi tác giả';
  f.state.raw.chapters[0].wordCount=6;
  f.state.raw.book.chapterIndex[0].wordCount=6;
  const result=await f.ledger.pinDraft(request(),f.pin(1));
  assert.equal(result.kind,'pin-rotate');assert.equal(result.revision,2);
  assert.equal(f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
  await assert.rejects(f.ledger.grantReview(request(),f.grant(1)),/fixture-review-conflict/);
  // Existing grant from revision 1 can be audit-revoked after source rotated.
  assert.equal((await f.ledger.revokeReview(request(),f.revoke(1))).ok,true);
  await f.ledger.grantReview(request(),f.grant(2));
  const newer=f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER});
  assert.equal(newer.pinRevision,2);assert.equal(newer.revision,1);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_assignments_g2o')[0].n,2);
 }finally{f.close();}
});

test('G2O refuses stale/same-hash pin replay and ownership change',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  await assert.rejects(f.ledger.pinDraft(request(),f.pin(1)),/fixture-pin-conflict/);
  await assert.rejects(f.ledger.pinDraft(request(),f.pin()),/fixture-pin-conflict/);
  f.state.raw.book.ownerUid='another-author';
  await assert.rejects(f.ledger.pinDraft(request(),f.pin(1)),/fixture-pin-conflict/);
  assert.equal(f.ledger.readSourcePin({storyId:STORY}).revision,1);
 }finally{f.close();}
});

test('G2O pin revoke wins forever; reviewer lookup fails closed after revocation',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  await f.ledger.grantReview(request(),f.grant());
  const gone=await f.ledger.revokePin(request(),f.pin(1));
  assert.deepEqual(gone,{ok:true,kind:'pin-revoke',storyId:STORY,revision:2,
   fixtureOnly:true,canPublish:false});
  assert.equal(f.ledger.readSourcePin({storyId:STORY}).status,'revoked');
  assert.equal(f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
  await assert.rejects(f.ledger.revokePin(request(),f.pin(2)),/fixture-pin-conflict/);
  await assert.rejects(f.ledger.grantReview(request(),f.grant(2)),/fixture-review-conflict/);
  f.state.raw.book.title='Sửa mới';
  await assert.rejects(f.ledger.pinDraft(request(),f.pin(2)),/fixture-pin-conflict/);
  assert.equal(f.makeLedger().readSourcePin({storyId:STORY}).status,'revoked');
 }finally{f.close();}
});

test('G2O operation replay fails atomically, including after attempted pin rotation',async()=>{
 const f=setup();try{
  const op=ID();await f.ledger.pinDraft(request(),f.pin(null,op));
  await assert.rejects(f.ledger.grantReview(request(),f.grant(1,REVIEWER,op)),
   /UNIQUE constraint failed/);
  assert.equal(f.ledger.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
  f.state.raw.book.title='Phiên bản mới';
  await assert.rejects(f.ledger.pinDraft(request(),f.pin(1,op)),/UNIQUE constraint failed/);
  assert.equal(f.ledger.readSourcePin({storyId:STORY}).revision,1);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_operations_g2o')[0].n,1);
 }finally{f.close();}
});

test('G2O SQL failure after mutation rolls back grant and operation together',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  f.state.breakSql='INSERT INTO vg_fixture_v49_operations_g2o';
  await assert.rejects(f.ledger.grantReview(request(),f.grant()),/PRIVATE_SQL_FAILURE/);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_assignments_g2o')[0].n,0);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_operations_g2o')[0].n,1);
 }finally{f.close();}
});

test('G2O DB guards reject direct deletion and resurrection even in isolated fixture',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  await f.ledger.grantReview(request(),f.grant());
  await f.ledger.revokeReview(request(),f.revoke());
  for(const query of [
   'DELETE FROM vg_fixture_v49_pins_g2o',
   'DELETE FROM vg_fixture_v49_assignments_g2o',
   'DELETE FROM vg_fixture_v49_operations_g2o',
   "UPDATE vg_fixture_v49_assignments_g2o SET status='active'",
   "UPDATE vg_fixture_v49_pins_g2o SET owner_uid='other-owner'",
   "UPDATE vg_fixture_v49_operations_g2o SET actor_uid='forged'"
  ])assert.throws(()=>f.sql.exec(query),/immutable-fixture|fixture-pin-regression|fixture-reviewer-revocation-regression/);
 }finally{f.close();}
});

test('G2O different fixture projects cannot read or mutate one another’s rows',async()=>{
 const f=setup();try{
  await f.ledger.pinDraft(request(),f.pin());
  const other=f.makeLedger('demo-different-fixture');
  assert.equal(other.readSourcePin({storyId:STORY}),null);
  assert.equal(other.readReviewerAssignment({storyId:STORY,reviewerUid:REVIEWER}),null);
  assert.equal((await other.pinDraft(request(),f.pin())).ok,true);
  assert.equal(f.rows('SELECT COUNT(*) AS n FROM vg_fixture_v49_pins_g2o')[0].n,2);
  assert.equal(f.ledger.readSourcePin({storyId:STORY}).revision,1);
 }finally{f.close();}
});

test('G2O G2N integration denies stale and revoked assignments without live Firebase',async()=>{
 const f=setup();try{
  const verify=async req=>{
   const token=req.headers.get('authorization');
   return token==='Bearer owner'?{uid:OWNER,admin:true}:
    token==='Bearer reviewer'?{uid:REVIEWER,admin:false}:null;
  };
  const gate=createV49DraftIntegrityInspection({verify,
   readDraftHeader:async()=>structuredClone(f.state.raw.book),
   readConsistentSnapshot:async()=>structuredClone(f.state.raw),
   readSourcePin:f.ledger.readSourcePin,
   readReviewerAssignment:f.ledger.readReviewerAssignment,
   now:()=>f.state.clock});
  await f.ledger.pinDraft(request(),f.pin());
  const owner=await gate(request('owner'),{storyId:STORY,mode:'prepublish'});
  assert.equal(owner.ok,true);assert.equal(owner.canPublish,false);
  assert.deepEqual(await gate(request('reviewer'),{storyId:STORY,mode:'review'}),
   {ok:false,code:'forbidden'});
  await f.ledger.grantReview(request(),f.grant());
  assert.equal((await gate(request('reviewer'),{storyId:STORY,mode:'review'})).access,
   'assigned-reviewer');
  await f.ledger.revokeReview(request(),f.revoke());
  assert.deepEqual(await gate(request('reviewer'),{storyId:STORY,mode:'review'}),
   {ok:false,code:'forbidden'});
  f.state.raw.book.title='Tác phẩm sửa đổi';
  assert.deepEqual(await gate(request('owner'),{storyId:STORY,mode:'prepublish'}),
   {ok:false,code:'source-conflict'});
  await f.ledger.pinDraft(request(),f.pin(1));
  assert.equal((await gate(request('owner'),{storyId:STORY,mode:'prepublish'})).ok,true);
  assert.deepEqual(await gate(request('reviewer'),{storyId:STORY,mode:'review'}),
   {ok:false,code:'forbidden'});
  await f.ledger.grantReview(request(),f.grant(2));
  assert.equal((await gate(request('reviewer'),{storyId:STORY,mode:'review'})).access,
   'assigned-reviewer');
 }finally{f.close();}
});

test('G2O cannot be loaded for production or accessed by a public Worker route',()=>{
 const src=readFileSync(new URL('../src/vangioi-v49-reviewer-ledger-g2o.mjs',import.meta.url),'utf8');
 assert.throws(()=>createV49SqlFixtureReviewerLedger({environment:'production'}),/fixture SQLite/);
 const f=setup();try{
  assert.throws(()=>createV49SqlFixtureReviewerLedger({storage:f.storage,
   projectId:'truyendienvl',verifyOperator:async()=>({uid:'op',operator:true}),
   readVerifiedDraftProof:async()=>({})}),/fixture SQLite/);
 }finally{f.close();}
 for(const name of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
  assert.equal(readFileSync(new URL(name,import.meta.url),'utf8').includes('vangioi-v49-reviewer-ledger-g2o'),false);
 assert.doesNotMatch(src,/firebase-admin|createFirebaseApp|issueAdaptationPermit|publishWorld/);
 assert.match(src,/environment!=='fixture'/);
 assert.match(src,/transactionSync/);
 assert.match(src,/canPublish:false/);
});
