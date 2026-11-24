import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {G1VerifiedReadingLedger,G1_READING_CONTRACT}
 from '../src/verified-reading-ledger-g1.mjs';

const START=1792000000000;
const SECRET='g1-test-private-service-signing-secret-44-characters';
const textEncoder=new TextEncoder();
function fixture(){
 const db=new DatabaseSync(':memory:');
 let now=START,insertFails=false;
 const sql={exec(query,...args){
  if(/^CREATE\s+(TABLE|INDEX)/i.test(query)){
   db.exec(query);return {toArray:()=>[]};
  }
  if(/^INSERT\s+INTO\s+g1_read_windows/i.test(query)&&insertFails)
   throw Error('simulated database failure');
  const stmt=db.prepare(query);
  return {toArray:()=>/^SELECT/i.test(query)?stmt.all(...args):
   (stmt.run(...args),[])};
 }};
 const transactionSync=fn=>{
  db.exec('BEGIN IMMEDIATE');
  try{const result=fn();db.exec('COMMIT');return result;}
  catch(err){db.exec('ROLLBACK');throw err;}
 };
 const ledger=new G1VerifiedReadingLedger({
  sql,transactionSync,secret:SECRET,now:()=>now
 });
 let seq=0;
 const base=()=>({
  version:1,eventId:'read_event_'+(++seq),
  proofId:'trusted_proof_'+seq,
  uid:'firebase_reader_A',storyId:'epub_001',chapterId:'chapter_001',
  contentRevision:'revision_r2_1',sourceMode:'EPUB_R2',
  progressEpoch:0,startedAt:START-90000,endedAt:START-30000,
  verifiedActiveMs:50000,evidenceSource:'STORY_READ_SERVICE'
 });
 async function sign(event,opts={}){
  const payload=opts.raw??JSON.stringify(event);
  const timestamp=String(opts.timestamp??now);
  const key=await crypto.subtle.importKey(
   'raw',textEncoder.encode(opts.secret??SECRET),
   {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,
   textEncoder.encode(timestamp+'.'+payload));
  return {rawBytes:textEncoder.encode(payload),
   timestamp,signature:Buffer.from(sig).toString('hex')};
 }
 return {
  db,ledger,base,sign,setNow:n=>{now=n;},
  failInserts:yes=>{insertFails=yes;},
  count:()=>db.prepare('SELECT count(*) AS n FROM g1_read_windows').get().n,
  inspect:()=>db.prepare('SELECT uid,progress_epoch,active_ms FROM g1_read_windows').all()
 };
}

test('G1 stays private with no public route, issuer or reward API',()=>{
 const index=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 const src=readFileSync(new URL('../src/verified-reading-ledger-g1.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(index,/verified-reading-ledger-g1/);
 assert.equal(G1_READING_CONTRACT.publicApiEnabled,false);
 assert.equal(G1_READING_CONTRACT.issuerConnected,false);
 assert.equal(G1_READING_CONTRACT.rewardIssuerEnabled,false);
 assert.equal(G1_READING_CONTRACT.realFirebaseVerified,false);
 assert.doesNotMatch(src,/\bawardExp:\s*[1-9]/);
 assert.doesNotMatch(src,/\bawardTuVi:\s*[1-9]/);
});

test('signed authoritative window stored once, retry idempotent, no EXP or Tu Vi',async()=>{
 const f=fixture(),envelope=await f.sign(f.base());
 const first=await f.ledger.ingestSignedEvidence(envelope);
 assert.equal(first.ok,true);
 assert.equal(first.verifiedActiveMs,50000);
 assert.equal(first.awardExp,0);
 assert.equal(first.awardTuVi,0);
 assert.equal(first.progressEpoch,0);
 assert.equal(f.count(),1);
 const again=await f.ledger.ingestSignedEvidence(envelope);
 assert.equal(again.ok,true);
 assert.equal(again.alreadyProcessed,true);
 assert.equal(again.awardExp,0);
 assert.equal(f.count(),1);
});

test('tampered, wrong key, expired and client-supplied evidence fail closed',async()=>{
 const f=fixture(),first=f.base(),signed=await f.sign(first);
 for(const envelope of [
  {...signed,rawBytes:textEncoder.encode(JSON.stringify({...first,verifiedActiveMs:60000}))},
  await f.sign(first,{secret:'fake-stolen-browser-input-incorrect-private-secret'}),
  {...signed,signature:'0'.repeat(64)},
  await f.sign(first,{timestamp:START-400000}),
  {rawBytes:textEncoder.encode(JSON.stringify(first))}
 ]){
  const r=await f.ledger.ingestSignedEvidence(envelope);
  assert.equal(r.ok,false);
  assert.equal(r.code,'invalid-attestation');
 }
 assert.equal(f.count(),0);
});

test('reject extra fields, client browser proof, unbounded time and bad identity',async()=>{
 const f=fixture(),ref=f.base();
 const bad=[
  {...ref,uid:''},
  {...ref,contentRevision:'<script>'},
  {...ref,startedAt:ref.endedAt},
  {...ref,endedAt:ref.startedAt+3600000},
  {...ref,verifiedActiveMs:9000000},
  {...ref,verifiedActiveMs:0},
  {...ref,progressEpoch:-1},
  {...ref,sourceMode:'FAKE_READER'},
  {...ref,evidenceSource:'BROWSER_TIMER'},
  {...ref,proofFromClient:true}
 ];
 for(const ev of bad){
  const r=await f.ledger.ingestSignedEvidence(await f.sign(ev));
  assert.equal(r.ok,false,JSON.stringify(ev));
  assert.equal(r.code,'invalid-attestation');
 }
 const withDuplicateJsonKey=JSON.stringify(ref).replace('"version":1,','"version":1,"version":1,');
 const duplicate=await f.ledger.ingestSignedEvidence(await f.sign(ref,{raw:withDuplicateJsonKey}));
 assert.equal(duplicate.ok,false);
 assert.equal(f.count(),0);
});

test('2 tabs/devices cannot double count overlapping window within same UID/epoch',async()=>{
 const f=fixture(),first=f.base();
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(first))).ok,true);
 const overlapping={...f.base(),startedAt:first.startedAt+10000,
  endedAt:first.endedAt+10000};
 const blocked=await f.ledger.ingestSignedEvidence(await f.sign(overlapping));
 assert.equal(blocked.ok,false);
 assert.equal(blocked.code,'overlapping-window');
 assert.equal(f.count(),1);
 const adjacent={...f.base(),startedAt:first.endedAt,
  endedAt:first.endedAt+10000,verifiedActiveMs:5000};
 const ok=await f.ledger.ingestSignedEvidence(await f.sign(adjacent));
 assert.equal(ok.ok,true);
 assert.equal(f.count(),2);
});

test('proofId cannot be duplicated to farm after fresh-start epoch or between UID',async()=>{
 const f=fixture(),a=f.base();
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(a))).ok,true);
 for(const patch of [
  {progressEpoch:1},
  {uid:'firebase_reader_B'},
  {storyId:'other_story',chapterId:'chapter_other'}
 ]){
  const event={...f.base(),...patch,proofId:a.proofId};
  const out=await f.ledger.ingestSignedEvidence(await f.sign(event));
  assert.equal(out.code,'duplicate-proof');
 }
 assert.equal(f.count(),1);
});

test('test-account fresh-start epoch preserves receipts and scopes new progress',async()=>{
 const f=fixture(),a=f.base();
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(a))).ok,true);
 const b={...f.base(),progressEpoch:1,verifiedActiveMs:25000};
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(b))).ok,true);
 const c={...f.base(),uid:'firebase_reader_B',verifiedActiveMs:20000};
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(c))).ok,true);
 assert.equal(f.count(),3);
 assert.deepEqual(f.inspect().map(r=>[r.uid,r.progress_epoch]),[
  ['firebase_reader_A',0],['firebase_reader_A',1],['firebase_reader_B',0]]);
});

test('eventId reuse with different signed content is conflict, no second insert',async()=>{
 const f=fixture(),a=f.base();
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(a))).ok,true);
 const changed={...a,proofId:'different_proof_0001',verifiedActiveMs:40000};
 const out=await f.ledger.ingestSignedEvidence(await f.sign(changed));
 assert.equal(out.ok,false);assert.equal(out.code,'event-id-reuse');
 assert.equal(f.count(),1);
});

test('SQL failure returns error without recording event and allows safe retry',async()=>{
 const f=fixture(),event=f.base(),signed=await f.sign(event);
 f.failInserts(true);
 const denied=await f.ledger.ingestSignedEvidence(signed);
 assert.equal(denied.code,'ledger-write-unavailable');
 assert.equal(f.count(),0);
 f.failInserts(false);
 const ok=await f.ledger.ingestSignedEvidence(signed);
 assert.equal(ok.ok,true);
 assert.equal(f.count(),1);
});

test('constructor requires private SQL, transactional writer and service secret',()=>{
 assert.throws(()=>new G1VerifiedReadingLedger(),/trusted private/);
 assert.throws(()=>new G1VerifiedReadingLedger({
  sql:{exec(){}},transactionSync(){},secret:'x'
 }),/trusted private/);
});

test('WEB and EPUB_R2 are both source-labelled without any book read/loot grants',async()=>{
 const f=fixture(),r2=f.base();
 r2.storyId='epub-0123456789abcdef0123456789abcdef';
 r2.contentRevision='r-0123456789abcdef0123456789abcdef';
 assert.equal((await f.ledger.ingestSignedEvidence(await f.sign(r2))).ok,true);
 const web={...f.base(),uid:'firebase_reader_B',sourceMode:'WEB',
  storyId:'legacy_web_story',chapterId:'web_chapter_1',
  contentRevision:'web_version_1',verifiedActiveMs:12000};
 const result=await f.ledger.ingestSignedEvidence(await f.sign(web));
 assert.equal(result.ok,true);
 assert.equal(result.awardExp,0);
 assert.equal(result.awardTuVi,0);
 assert.equal(f.count(),2);
});
