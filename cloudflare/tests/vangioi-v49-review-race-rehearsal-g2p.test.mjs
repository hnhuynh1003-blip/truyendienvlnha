import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createV49SqlFixtureReviewerLedger} from '../src/vangioi-v49-reviewer-ledger-g2o.mjs';
import {createV49DraftIntegrityInspection,hashV49DraftSnapshot}
 from '../src/vangioi-v49-draft-integrity-g2n.mjs';
import {createV49ReviewRaceRehearsal}
 from '../src/vangioi-v49-review-race-rehearsal-g2p.mjs';

const STORY='epub-g2p-primary',OTHER='epub-g2p-secondary';
const OWNER='fictional-author',REVIEWER='fictional-reviewer';
const NOW=Date.parse('2026-10-27T16:00:00.000Z');
const request=(token,body={})=>new Request('https://fixture.invalid/g2p',{
 method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
const uuid=()=>crypto.randomUUID();
function draft(storyId){
 const texts=['Chương mở đầu','Chương kết thúc'];
 const chapters=texts.map((content,order)=>({id:'chapter-'+String(order+1).padStart(4,'0'),
  title:'Phần '+(order+1),order,content,wordCount:content.split(/\s+/).length}));
 return {book:{id:storyId,title:'Truyện giả lập',author:'Người viết thử nghiệm',
  genre:'Nhập EPUB',status:'draft',ownerUid:OWNER,chapterCount:2,
  chapterIndex:chapters.map(({id,title,wordCount,order})=>({id,title,wordCount,order})),
  importSchema:57,importFingerprint:'v57-0123456789abcdef-2',
  sourceName:'offline.epub',coverImage:'',createdAt:'2026-10-27T15:00:00.000Z',
  updatedAt:'2026-10-27T15:05:00.000Z'},chapters};
}
function setup(){
 const db=new DatabaseSync(':memory:'),state={clock:NOW,interleave:null,
  drafts:new Map([[STORY,draft(STORY)],[OTHER,draft(OTHER)]]),transactions:0,
  snapshotReads:0};
 const sql={exec(q,...args){
  let rows=[];
  if(q.trim().startsWith('CREATE '))db.exec(q);
  else{
   const stmt=db.prepare(q);
   if(/^\s*(SELECT|WITH)\b|\bRETURNING\b/i.test(q))rows=stmt.all(...args);
   else stmt.run(...args);
  }
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){
  state.transactions++;db.exec('BEGIN IMMEDIATE');
  try{const v=fn();db.exec('COMMIT');return v;}
  catch(err){db.exec('ROLLBACK');throw err;}
 }};
 const verifyOperator=async req=>req.headers.get('authorization')==='Bearer op'?
  {uid:'fixture-operator',operator:true}:null;
 const readVerifiedDraftProof=async({storyId})=>
  hashV49DraftSnapshot(structuredClone(state.drafts.get(storyId)),{storyId});
 const ledger=createV49SqlFixtureReviewerLedger({storage,projectId:'demo-g2p-fixture',
  verifyOperator,readVerifiedDraftProof,now:()=>state.clock});
 const verify=async req=>{
  const token=req.headers.get('authorization');
  return token==='Bearer owner'?{uid:OWNER,admin:true}:
   token==='Bearer reviewer'?{uid:REVIEWER,admin:false}:
   token==='Bearer foreign-admin'?{uid:'foreign-admin',admin:true}:null;
 };
 const inspect=createV49DraftIntegrityInspection({verify,
  readDraftHeader:async({storyId})=>structuredClone(state.drafts.get(storyId)?.book),
  readConsistentSnapshot:async({storyId})=>{
   state.snapshotReads++;return structuredClone(state.drafts.get(storyId));},
  readSourcePin:ledger.readSourcePin,
  readReviewerAssignment:ledger.readReviewerAssignment,now:()=>state.clock});
 const rehearse=createV49ReviewRaceRehearsal({environment:'fixture',
  projectId:'demo-g2p-fixture',verify,inspect,
  readAuthorityFence:ledger.readAuthorityFence,
  now:()=>state.clock,onInterleave:async()=>{await state.interleave?.();}});
 const pin=(storyId=STORY,expectedRevision=null)=>({operationId:uuid(),storyId,expectedRevision});
 const grant=(reviewerUid=REVIEWER,pinRevision=1,storyId=STORY)=>({
  operationId:uuid(),storyId,reviewerUid,expectedPinRevision:pinRevision,
  expiresAt:state.clock+300000});
 const revokeReview=()=>({operationId:uuid(),storyId:STORY,reviewerUid:REVIEWER,
  pinRevision:1,expectedRevision:1});
 const initial=async({reviewer=false}={})=>{
  await ledger.pinDraft(request('op'),pin());
  if(reviewer)await ledger.grantReview(request('op'),grant());
 };
 return {db,state,storage,sql,ledger,verify,inspect,rehearse,pin,grant,revokeReview,initial,
  close:()=>db.close()};
}
const owner={storyId:STORY,mode:'prepublish'};
const review={storyId:STORY,mode:'review'};

test('G2P two clean owner inspections agree, without publishing or returning prose',async()=>{
 const f=setup();try{
  await f.initial();const result=await f.rehearse(request('owner'),owner);
  assert.equal(result.ok,true);assert.equal(result.raceRehearsalOnly,true);
  assert.equal(result.inspectionOnly,true);assert.equal(result.canPublish,false);
  assert.equal(result.access,'owner');assert.equal(f.state.snapshotReads,2);
  assert.equal(JSON.stringify(result).includes('Chương mở đầu'),false);
  assert.equal(Object.isFrozen(result),true);
 }finally{f.close();}
});

test('G2P two reviewer inspections require current server assignment',async()=>{
 const f=setup();try{
  await f.initial({reviewer:true});
  const result=await f.rehearse(request('reviewer',{admin:true,
   assignments:[STORY],publishPermission:true}),review);
  assert.equal(result.ok,true);assert.equal(result.access,'assigned-reviewer');
  assert.equal(result.canPublish,false);
  assert.deepEqual(await f.rehearse(request('reviewer'),owner),
   {ok:false,code:'forbidden'});
 }finally{f.close();}
});

test('G2P no pin or unsupported user cannot reach private source snapshot',async()=>{
 const f=setup();try{
  assert.deepEqual(await f.rehearse(request('owner'),owner),{ok:false,code:'forbidden'});
  await f.initial();
  assert.deepEqual(await f.rehearse(request('foreign-admin',{uid:OWNER,admin:true}),owner),
   {ok:false,code:'forbidden'});
  assert.deepEqual(await f.rehearse(request('unauthenticated',{uid:OWNER}),owner),
   {ok:false,code:'forbidden'});
  assert.equal(f.state.snapshotReads,0);
 }finally{f.close();}
});

test('G2P detects source edit between G2N reads even when SQLite pin is unchanged',async()=>{
 const f=setup();try{
  await f.initial();f.state.interleave=()=>{
   f.state.drafts.get(STORY).book.title='Phiên bản bị đổi giữa lúc duyệt';};
  assert.deepEqual(await f.rehearse(request('owner'),owner),
   {ok:false,code:'source-conflict'});
  assert.equal(f.state.snapshotReads,2);
 }finally{f.close();}
});

test('G2P detects source re-pin/rotation in the race window via SQLite high-water',async()=>{
 const f=setup();try{
  await f.initial();f.state.interleave=async()=>{
   f.state.drafts.get(STORY).book.title='Nội dung phiên bản mới';
   await f.ledger.pinDraft(request('op'),f.pin(STORY,1));};
  assert.deepEqual(await f.rehearse(request('owner'),owner),
   {ok:false,code:'authority-conflict'});
  assert.equal(f.state.snapshotReads,1,'abort before second private snapshot');
 }finally{f.close();}
});

test('G2P detects pin revoke before the second inspection',async()=>{
 const f=setup();try{
  await f.initial();f.state.interleave=async()=>{
   await f.ledger.revokePin(request('op'),{
    operationId:uuid(),storyId:STORY,expectedRevision:1});};
  assert.deepEqual(await f.rehearse(request('owner'),owner),
   {ok:false,code:'authority-conflict'});
  assert.equal(f.state.snapshotReads,1);
 }finally{f.close();}
});

test('G2P detects reviewer revocation and prevents stale success',async()=>{
 const f=setup();try{
  await f.initial({reviewer:true});f.state.interleave=async()=>{
   await f.ledger.revokeReview(request('op'),f.revokeReview());};
  assert.deepEqual(await f.rehearse(request('reviewer'),review),
   {ok:false,code:'authority-conflict'});
  assert.equal(f.state.snapshotReads,1);
 }finally{f.close();}
});

test('G2P denies expired assignment even though unchanged SQLite records remain',async()=>{
 const f=setup();try{
  await f.initial({reviewer:true});
  f.state.interleave=()=>{f.state.clock+=300000;};
  assert.deepEqual(await f.rehearse(request('reviewer'),review),
   {ok:false,code:'forbidden'});
 }finally{f.close();}
});

test('G2P story-local operation high-water catches another reviewer grant',async()=>{
 const f=setup();try{
  await f.initial({reviewer:true});f.state.interleave=async()=>{
   await f.ledger.grantReview(request('op'),f.grant('another-reviewer'));};
  assert.deepEqual(await f.rehearse(request('reviewer'),review),
   {ok:false,code:'authority-conflict'});
 }finally{f.close();}
});

test('G2P unrelated story operation does not spuriously invalidate own fence',async()=>{
 const f=setup();try{
  await f.initial({reviewer:true});
  f.state.interleave=async()=>{await f.ledger.pinDraft(request('op'),f.pin(OTHER));};
  assert.equal((await f.rehearse(request('reviewer'),review)).ok,true);
  assert.equal(f.ledger.readAuthorityFence({storyId:STORY,reviewerUid:REVIEWER})
   .operationHighwater,2);
 }finally{f.close();}
});

test('G2P SQLite fence is exactly one transaction including pin, grant and op cursor',async()=>{
 const f=setup();try{
  await f.initial({reviewer:true});
  const before=f.state.transactions;
  const fence=f.ledger.readAuthorityFence({storyId:STORY,reviewerUid:REVIEWER});
  assert.equal(f.state.transactions,before+1);
  assert.equal(fence.pinStatus,'active');assert.equal(fence.pinRevision,1);
  assert.equal(fence.assignmentStatus,'active');assert.equal(fence.operationHighwater,2);
  assert.equal(Object.isFrozen(fence),true);
  assert.equal(f.ledger.readAuthorityFence({storyId:'../secret',reviewerUid:REVIEWER}),null);
 }finally{f.close();}
});

test('G2P rejects invalid modes and preserves public-route isolation',async()=>{
 const f=setup();try{
  await f.initial();
  for(const bad of [{storyId:STORY,mode:'publish'},
   {storyId:'../private',mode:'prepublish'},{storyId:STORY,mode:''}])
   assert.deepEqual(await f.rehearse(request('owner'),bad),{ok:false,code:'forbidden'});
  assert.equal(f.state.snapshotReads,0);
  assert.throws(()=>createV49ReviewRaceRehearsal({environment:'production'}),
   /fixture-only/);
  const src=readFileSync(new URL('../src/vangioi-v49-review-race-rehearsal-g2p.mjs',import.meta.url),'utf8');
  for(const entry of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
   assert.equal(readFileSync(new URL(entry,import.meta.url),'utf8')
    .includes('vangioi-v49-review-race-rehearsal-g2p'),false);
  assert.doesNotMatch(src,/firebase-admin|publishWorld|issueAdaptationPermit/);
 }finally{f.close();}
});

test('G2P explicitly cannot detect a Firestore ABA with no version/history change',async()=>{
 const f=setup();try{
  await f.initial();const original=f.state.drafts.get(STORY).book.title;
  f.state.interleave=()=>{
   f.state.drafts.get(STORY).book.title='Thay tạm';
   f.state.drafts.get(STORY).book.title=original;
  };
  // This is an observed limitation, not a safety pass for production.
  assert.equal((await f.rehearse(request('owner'),owner)).ok,true);
 }finally{f.close();}
});
