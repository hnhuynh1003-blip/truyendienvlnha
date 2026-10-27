import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createV49FixtureSourceEpochLedger} from '../src/vangioi-v49-source-epoch-g2q.mjs';
import {createV49EpochFencedRehearsal} from '../src/vangioi-v49-epoch-fence-g2q.mjs';
import {createV49SqlFixtureReviewerLedger} from '../src/vangioi-v49-reviewer-ledger-g2o.mjs';
import {createV49DraftIntegrityInspection,hashV49DraftSnapshot}
 from '../src/vangioi-v49-draft-integrity-g2n.mjs';
import {createV49ReviewRaceRehearsal}
 from '../src/vangioi-v49-review-race-rehearsal-g2p.mjs';

const STORY='epub-g2q-primary',OTHER='epub-g2q-secondary';
const OWNER='fictional-owner',REVIEWER='fictional-reviewer';
const NOW=Date.parse('2026-10-27T16:00:00Z');
const request=(token,body={})=>new Request('https://fixture.invalid/g2q',{
 method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
const uuid=()=>crypto.randomUUID();
const owner={storyId:STORY,mode:'prepublish'};
const reviewer={storyId:STORY,mode:'review'};
function synthetic(storyId){
 const chapters=['Nội dung đầu','Nội dung cuối'].map((content,order)=>({
  id:'chapter-'+String(order+1).padStart(4,'0'),title:'Chương '+(order+1),
  order,wordCount:content.split(/\s+/).length,content}));
 return {book:{id:storyId,ownerUid:OWNER,status:'draft',title:'Truyện nguồn A',
  author:'Tác giả thử nghiệm',genre:'Nhập EPUB',importSchema:57,
  chapterCount:chapters.length,chapterIndex:chapters.map(({id,title,order,wordCount})=>
   ({id,title,order,wordCount})),sourceName:'fictional.epub',coverImage:'',
  importFingerprint:'v57-0123456789abcdef-2',createdAt:'2026-10-27T15:00:00Z',
  updatedAt:'2026-10-27T15:05:00Z'},chapters};
}
function setup(){
 const db=new DatabaseSync(':memory:');
 const state={clock:NOW,transactions:0,snapshotReads:0,interleave:null,
  drafts:new Map([[STORY,synthetic(STORY)],[OTHER,synthetic(OTHER)]])};
 const sql={exec(query,...args){
  let rows=[];
  if(query.trim().startsWith('CREATE '))db.exec(query);
  else{
   const stmt=db.prepare(query);
   if(/^\s*(SELECT|WITH)\b|\bRETURNING\b/i.test(query))rows=stmt.all(...args);
   else stmt.run(...args);
  }
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){
  state.transactions++;db.exec('BEGIN IMMEDIATE');
  try{const value=fn();db.exec('COMMIT');return value;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const verifyOperator=async req=>req?.headers?.get('authorization')==='Bearer op'?
  {uid:'trusted-operator',operator:true}:null;
 const proof=async({storyId})=>hashV49DraftSnapshot(
  structuredClone(state.drafts.get(storyId)),{storyId});
 const sourceEpoch=createV49FixtureSourceEpochLedger({storage,
  projectId:'demo-g2q-fixture',verifyOperator,readVerifiedDraftProof:proof,
  now:()=>state.clock});
 const reviewerLedger=createV49SqlFixtureReviewerLedger({storage,
  projectId:'demo-g2q-fixture',verifyOperator,readVerifiedDraftProof:proof,
  now:()=>state.clock});
 const verify=async req=>{
  const token=req?.headers?.get('authorization');
  return token==='Bearer owner'?{uid:OWNER,admin:true}:
   token==='Bearer reviewer'?{uid:REVIEWER,admin:false}:
   token==='Bearer foreign-admin'?{uid:'foreigner',admin:true}:null;
 };
 const inspect=createV49DraftIntegrityInspection({verify,
  readDraftHeader:async({storyId})=>structuredClone(state.drafts.get(storyId)?.book),
  readConsistentSnapshot:async({storyId})=>{
   state.snapshotReads++;return structuredClone(state.drafts.get(storyId));},
  readSourcePin:reviewerLedger.readSourcePin,
  readReviewerAssignment:reviewerLedger.readReviewerAssignment,
  now:()=>state.clock});
 const rehearse=createV49ReviewRaceRehearsal({environment:'fixture',
  projectId:'demo-g2q-fixture',verify,inspect,
  readAuthorityFence:reviewerLedger.readAuthorityFence,
  onInterleave:async()=>{await state.interleave?.();},now:()=>state.clock});
 const fenced=createV49EpochFencedRehearsal({environment:'fixture',
  projectId:'demo-g2q-fixture',readSourceEpoch:sourceEpoch.readSourceEpoch,rehearse});
 const record=(expectedEpoch=null,storyId=STORY,operationId=uuid())=>
  ({operationId,storyId,expectedEpoch});
 const pin=(expectedRevision=null,storyId=STORY)=>({operationId:uuid(),
  storyId,expectedRevision});
 const init=async({review=false}={})=>{
  await sourceEpoch.recordObservedEpoch(request('op'),record());
  await reviewerLedger.pinDraft(request('op'),pin());
  if(review)await reviewerLedger.grantReview(request('op'),{
   operationId:uuid(),storyId:STORY,reviewerUid:REVIEWER,
   expectedPinRevision:1,expiresAt:state.clock+60000});
 };
 return {db,state,storage,sql,sourceEpoch,reviewerLedger,rehearse,fenced,
  record,pin,init,close:()=>db.close()};
}

test('G2Q trusted initial source observation is epoch 1, no prose or publish',async()=>{
 const f=setup();try{
  const result=await f.sourceEpoch.recordObservedEpoch(request('op'),f.record());
  assert.equal(result.sourceEpoch,1);assert.equal(result.canPublish,false);
  assert.equal(result.observedFixtureOnly,true);
  const current=f.sourceEpoch.readSourceEpoch({storyId:STORY});
  assert.equal(current.sourceHash,result.sourceHash);
  assert.equal(current.ownerUid,OWNER);assert.equal(current.chapterCount,2);
  assert.equal(current.operationHighwater,1);
  assert.equal(Object.isFrozen(current),true);
  assert.equal(JSON.stringify(current).includes('Nội dung đầu'),false);
 }finally{f.close();}
});

test('G2Q requires server-verified operator and ignores body grants/hash',async()=>{
 const f=setup();try{
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('owner',{
   operator:true,sourceHash:'sha256-'+'a'.repeat(64)}),f.record()),
  /operator-required/);
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('foreign-admin',{
   uid:'trusted-operator',operator:true}),f.record()),/operator-required/);
  for(const bad of [{...f.record(),sourceHash:'sha256-'+'b'.repeat(64)},
   {...f.record(),ownerUid:OWNER},{...f.record(),sourceEpoch:99},
   {...f.record(),expectedEpoch:0},{...f.record(),storyId:'../bad'},
   {...f.record(),operationId:'client-assigned'}])
   await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('op'),bad));
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:STORY}),null);
 }finally{f.close();}
});

test('G2Q monotonically advances even after same-byte source restoration',async()=>{
 const f=setup();try{
  const initial=await f.sourceEpoch.recordObservedEpoch(request('op'),f.record());
  f.state.drafts.get(STORY).book.title='Truyện nguồn B';
  const changed=await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(1));
  f.state.drafts.get(STORY).book.title='Truyện nguồn A';
  const restored=await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(2));
  assert.equal(changed.sourceEpoch,2);assert.equal(restored.sourceEpoch,3);
  assert.equal(restored.sourceHash,initial.sourceHash);
  assert.notEqual(changed.sourceHash,initial.sourceHash);
  const repeat=await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(3));
  assert.equal(repeat.sourceEpoch,4);
  assert.equal(repeat.sourceHash,initial.sourceHash);
 }finally{f.close();}
});

test('G2Q stale CAS and duplicate operation cannot change epoch or history',async()=>{
 const f=setup();try{
  const operationId=uuid();
  await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(null,STORY,operationId));
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('op'),f.record(0)),
   /invalid-fixture-epoch/);
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('op'),f.record(null)),
   /fixture-source-epoch-conflict/);
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('op'),
   f.record(1,STORY,operationId)),/UNIQUE constraint failed/);
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:STORY}).sourceEpoch,1);
  assert.equal(f.sql.exec('SELECT COUNT(*) AS n FROM vg_fixture_v49_epoch_ops_g2q')
   .toArray()[0].n,1);
 }finally{f.close();}
});

test('G2Q fixture SQL enforces immutable operations and monotonic version',async()=>{
 const f=setup();try{
  await f.sourceEpoch.recordObservedEpoch(request('op'),f.record());
  for(const stmt of ['DELETE FROM vg_fixture_v49_epochs_g2q',
   'DELETE FROM vg_fixture_v49_epoch_ops_g2q',
   'UPDATE vg_fixture_v49_epochs_g2q SET source_epoch=1',
   "UPDATE vg_fixture_v49_epochs_g2q SET owner_uid='foreigner'",
   "UPDATE vg_fixture_v49_epoch_ops_g2q SET actor_uid='foreigner'"])
   assert.throws(()=>f.sql.exec(stmt),/immutable-fixture|fixture-epoch-regression/);
 }finally{f.close();}
});

test('G2Q owner transfer is rejected and source proof is validated',async()=>{
 const f=setup();try{
  await f.sourceEpoch.recordObservedEpoch(request('op'),f.record());
  f.state.drafts.get(STORY).book.ownerUid='forged-owner';
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('op'),f.record(1)),
   /fixture-source-epoch-conflict/);
  f.state.drafts.get(STORY).book.status='published';
  await assert.rejects(f.sourceEpoch.recordObservedEpoch(request('op'),f.record(1)),
   /fixture-epoch-proof-unavailable/);
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:STORY}).sourceEpoch,1);
 }finally{f.close();}
});

test('G2Q isolates story/project epochs and reads metadata in one transaction',async()=>{
 const f=setup();try{
  await f.sourceEpoch.recordObservedEpoch(request('op'),f.record());
  const isolated=createV49FixtureSourceEpochLedger({storage:f.storage,
   projectId:'demo-other-project',verifyOperator:async()=>({uid:'op',operator:true}),
   readVerifiedDraftProof:async({storyId})=>
    hashV49DraftSnapshot(structuredClone(f.state.drafts.get(storyId)),{storyId})});
  assert.equal(isolated.readSourceEpoch({storyId:STORY}),null);
  await isolated.recordObservedEpoch(request('op'),f.record());
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:STORY}).sourceEpoch,1);
  await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(null,OTHER));
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:OTHER}).sourceEpoch,1);
  const n=f.state.transactions;
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:STORY}).storyId,STORY);
  assert.equal(f.state.transactions,n+1);
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:'../secret'}),null);
 }finally{f.close();}
});

test('G2Q clean owner rehearsal returns only fenced fixture metadata',async()=>{
 const f=setup();try{
  await f.init();const response=await f.fenced(request('owner'),owner);
  assert.equal(response.ok,true);assert.equal(response.sourceEpoch,1);
  assert.equal(response.epochFencedFixtureOnly,true);
  assert.equal(response.inspectionOnly,true);assert.equal(response.canPublish,false);
  assert.equal(response.access,'owner');assert.equal(f.state.snapshotReads,2);
  assert.equal(JSON.stringify(response).includes('Nội dung đầu'),false);
 }finally{f.close();}
});

test('G2Q catches observed A->B->A invisible to original G2P snapshots',async()=>{
 const f=setup();try{
  await f.init();const original=f.state.drafts.get(STORY).book.title;
  f.state.interleave=async()=>{
   f.state.drafts.get(STORY).book.title='Truyện nguồn B';
   await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(1));
   f.state.drafts.get(STORY).book.title=original;
   await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(2));
  };
  const result=await f.fenced(request('owner'),owner);
  assert.deepEqual(result,{ok:false,code:'source-epoch-conflict'});
  assert.equal(f.state.snapshotReads,2);
  assert.equal(f.sourceEpoch.readSourceEpoch({storyId:STORY}).sourceEpoch,3);
 }finally{f.close();}
});

test('G2Q catches a same-byte observed rewrite without changing content hash',async()=>{
 const f=setup();try{
  await f.init();f.state.interleave=async()=>{
   await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(1));};
  assert.deepEqual(await f.fenced(request('owner'),owner),
   {ok:false,code:'source-epoch-conflict'});
 }finally{f.close();}
});

test('G2Q ignores unrelated story epoch advances while checking this story',async()=>{
 const f=setup();try{
  await f.init();f.state.interleave=async()=>{
   await f.sourceEpoch.recordObservedEpoch(request('op'),f.record(null,OTHER));};
  assert.equal((await f.fenced(request('owner'),owner)).ok,true);
 }finally{f.close();}
});

test('G2Q retains G2O revocation and reviewer scope checks',async()=>{
 const f=setup();try{
  await f.init({review:true});
  assert.equal((await f.fenced(request('reviewer',{admin:true}),reviewer)).access,
   'assigned-reviewer');
  assert.deepEqual(await f.fenced(request('reviewer'),owner),
   {ok:false,code:'forbidden'});
  f.state.interleave=async()=>f.reviewerLedger.revokeReview(request('op'),{
   operationId:uuid(),storyId:STORY,reviewerUid:REVIEWER,
   pinRevision:1,expectedRevision:1});
  assert.deepEqual(await f.fenced(request('reviewer'),reviewer),
   {ok:false,code:'authority-conflict'});
 }finally{f.close();}
});

test('G2Q unrecorded source edit is still caught by G2N content digest',async()=>{
 const f=setup();try{
  await f.init();f.state.interleave=()=>{
   f.state.drafts.get(STORY).book.title='Changed but not recorded';};
  assert.deepEqual(await f.fenced(request('owner'),owner),
   {ok:false,code:'source-conflict'});
 }finally{f.close();}
});

test('G2Q cannot detect unrecorded A->B->A: no source-side atomic hook',async()=>{
 const f=setup();try{
  await f.init();const original=f.state.drafts.get(STORY).book.title;
  f.state.interleave=()=>{
   f.state.drafts.get(STORY).book.title='Temporary unrecorded change';
   f.state.drafts.get(STORY).book.title=original;
  };
  // Intentional negative proof: G2Q is NOT safe for real Firestore writes.
  assert.equal((await f.fenced(request('owner'),owner)).ok,true);
 }finally{f.close();}
});

test('G2Q rejects untrusted wiring, absent epoch and cannot enter live Worker',async()=>{
 const f=setup();try{
  assert.deepEqual(await f.fenced(request('owner'),owner),
   {ok:false,code:'forbidden'});
  assert.equal(f.state.snapshotReads,0);
  assert.throws(()=>createV49FixtureSourceEpochLedger({environment:'production'}),
   /fixture epoch/);
  assert.throws(()=>createV49EpochFencedRehearsal({environment:'production'}),
   /fixture epoch/);
  assert.deepEqual(await f.fenced(request('owner'),{storyId:STORY,mode:'publish'}),
   {ok:false,code:'forbidden'});
  for(const path of ['../src/index.mjs','../src/vangioi-authoring-http.mjs']){
   const text=readFileSync(new URL(path,import.meta.url),'utf8');
   assert.equal(text.includes('vangioi-v49-source-epoch-g2q'),false);
   assert.equal(text.includes('vangioi-v49-epoch-fence-g2q'),false);
  }
 }finally{f.close();}
});
