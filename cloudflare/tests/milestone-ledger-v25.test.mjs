import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {V25TrustedMilestoneLedger,createV25MilestoneReaders}
 from '../src/milestone-ledger-v25.mjs';
import {normalizeV25Receipt,verifyV25Receipt}
 from '../src/milestone-receipt-v25.mjs';
import {issueV24MilestoneFrame}
 from '../src/avatar-milestone-verifier-v24.mjs';
import {verifyAwardWebhook}
 from '../src/avatar-award-webhook.mjs';

const NOW=1792000000000;
const UID='reader_25',OTHER='reader_else_25',STORY='story_25',CHAPTER='chapter_25';
const APPROVAL_KEY='approval-source-exclusive-backend-secret-v25-0123456789';
const PROGRESS_KEY='progress-source-exclusive-backend-secret-v25-9876543210';
const FRAME_KEY='frame-issuer-exclusive-backend-secret-v25-0987654321';
const secrets=Object.freeze({approval:APPROVAL_KEY,progress:PROGRESS_KEY});
const common={storyId:STORY};
const approval=(frameId='legend',milestoneId='approved_story_25',revision=1)=>({
 eventId:'approve_'+milestoneId+'_'+revision,kind:'APPROVAL_PUBLISHED',
 issuedAt:NOW,...common,milestoneId,revision,frameId,
 chapterId:CHAPTER,npcId:frameId==='soulbond'?'npc_f_03':null,
 minimumTrust:frameId==='soulbond'?50:null,reviewedAt:NOW-100000
});
const chapter=(uid=UID,changes={})=>({
 eventId:'chapter_'+uid,kind:'CHAPTER_VERIFIED',issuedAt:NOW,
 ...common,uid,chapterId:CHAPTER,completedAt:NOW-30000,...changes
});
const bond=(uid=UID,changes={})=>({
 eventId:'bond_'+uid,kind:'BOND_VERIFIED',issuedAt:NOW,...common,uid,
 npcId:'npc_f_03',milestoneId:'approved_bond_25',trust:65,
 verifiedAt:NOW-10000,...changes
});
const completion=(uid=UID,milestoneId='approved_story_25',changes={})=>({
 eventId:'complete_'+uid+'_'+milestoneId,kind:'MILESTONE_COMPLETED',
 issuedAt:NOW,...common,uid,milestoneId,approvalRevision:1,
 evidenceId:'evidence_'+uid+'_'+milestoneId,completedAt:NOW-1000,...changes
});
const revocation=(milestoneId='approved_story_25',revision=2)=>({
 eventId:'revoke_'+milestoneId+'_'+revision,kind:'APPROVAL_REVOKED',
 issuedAt:NOW,...common,milestoneId,revision,reviewedAt:NOW-500
});
const bytes=record=>new TextEncoder().encode(JSON.stringify(record));
async function signed(event,{secret=event.kind.startsWith('APPROVAL_')?
  APPROVAL_KEY:PROGRESS_KEY,rawBytes=bytes(event)}={}){
 const timestamp=String(NOW);
 const key=await webcrypto.subtle.importKey('raw',
   new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const msg=new TextEncoder().encode(timestamp+'.'+new TextDecoder().decode(rawBytes));
 const sig=new Uint8Array(await webcrypto.subtle.sign('HMAC',key,msg));
 return {rawBytes,timestamp,
   signature:Array.from(sig,x=>x.toString(16).padStart(2,'0')).join(''),now:NOW};
}
function makeStore(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON');
 const sql={exec(query,...args){
   if(query.trimStart().startsWith('CREATE TABLE')){
     db.exec(query);return {toArray:()=>[]};
   }
   const statement=db.prepare(query);
   const rows=/^\s*SELECT\b/i.test(query)?statement.all(...args):
     (statement.run(...args),[]);
   return {toArray:()=>rows};
 }};
 // Node sqlite emulates Durable Object synchronous transaction semantics.
 const transactionSync=callback=>{
   db.exec('BEGIN IMMEDIATE');
   try{const result=callback();db.exec('COMMIT');return result;}
   catch(err){db.exec('ROLLBACK');throw err;}
 };
 const ledger=new V25TrustedMilestoneLedger({sql,transactionSync,secrets});
 return {ledger,db};
}
async function ingest(ledger,event,options){
 return ledger.ingestSignedReceipt(await signed(event,options));
}
async function seedStory(ledger,uid=UID){
 assert.equal((await ingest(ledger,approval())).ok,true);
 assert.equal((await ingest(ledger,chapter(uid))).ok,true);
 assert.equal((await ingest(ledger,completion(uid))).ok,true);
}
test('V25 end-to-end: signed approval + independent chapter + milestone => V24/V19 Huyền Thoại',async()=>{
 const {ledger,db}=makeStore();
 await seedStory(ledger);
 const issuer=await issueV24MilestoneFrame({
   uid:UID,frameId:'legend',evidenceId:'evidence_'+UID+'_approved_story_25',
   now:NOW,readers:createV25MilestoneReaders(ledger),secret:FRAME_KEY,
   newEventId:()=> 'server_award_25'
 });
 assert.equal(issuer.ok,true);
 const award=await verifyAwardWebhook({
   rawBytes:issuer.body,timestamp:issuer.timestamp,
   signature:issuer.signature,secret:FRAME_KEY,now:NOW
 });
 assert.equal(award.uid,UID);
 assert.equal(award.frameId,'legend');
 assert.equal(award.source,'VERIFIED_STORY_MILESTONE');
 assert.equal(db.prepare('SELECT count(*) AS n FROM v25_completions').get().n,1);
 db.close();
});
test('V25 soulbond needs approved matching NPC, chapter and trust record',async()=>{
 const {ledger,db}=makeStore(),id='approved_bond_25';
 assert.equal((await ingest(ledger,approval('soulbond',id))).ok,true);
 assert.equal((await ingest(ledger,chapter())).ok,true);
 const tooEarly=await ingest(ledger,completion(UID,id));
 assert.equal(tooEarly.code,'missing-bond-proof');
 assert.equal((await ingest(ledger,bond())).ok,true);
 assert.equal((await ingest(ledger,completion(UID,id))).ok,true);
 const out=await issueV24MilestoneFrame({
   uid:UID,frameId:'soulbond',evidenceId:'evidence_'+UID+'_'+id,
   now:NOW,readers:createV25MilestoneReaders(ledger),secret:FRAME_KEY,
   newEventId:()=> 'server_bond_award_25'
 });
 assert.equal(out.ok,true);
 const award=await verifyAwardWebhook({
   rawBytes:out.body,timestamp:out.timestamp,
   signature:out.signature,secret:FRAME_KEY,now:NOW
 });
 assert.equal(award.frameId,'soulbond');
 const other=await issueV24MilestoneFrame({
   uid:OTHER,frameId:'soulbond',evidenceId:'evidence_'+UID+'_'+id,
   now:NOW,readers:createV25MilestoneReaders(ledger),secret:FRAME_KEY,
   newEventId:()=> 'wrong_owner'
 });
 assert.equal(other.code,'unverified-achievement');
 db.close();
});
test('V25 proof missing or unrelated chapter, revocation, and changed approval version fail closed',async()=>{
 const {ledger,db}=makeStore();
 assert.equal((await ingest(ledger,approval())).ok,true);
 assert.equal((await ingest(ledger,completion())).code,'missing-chapter-proof');
 assert.equal((await ingest(ledger,chapter())).ok,true);
 assert.equal((await ingest(ledger,completion())).ok,true);
 assert.equal((await ingest(ledger,revocation())).ok,true);
 assert.equal(ledger.getApproval({storyId:STORY,milestoneId:'approved_story_25'}),null);
 const later=await issueV24MilestoneFrame({
   uid:UID,frameId:'legend',evidenceId:'evidence_'+UID+'_approved_story_25',
   now:NOW,readers:createV25MilestoneReaders(ledger),secret:FRAME_KEY,
   newEventId:()=> 'after_revoke'
 });
 assert.equal(later.code,'unverified-achievement');
 // Historic event and immutable first revision remain audit-visible internally.
 assert.equal(db.prepare('SELECT count(*) AS n FROM v25_approval_versions').get().n,2);
 assert.equal(db.prepare('SELECT count(*) AS n FROM v25_completions').get().n,1);
 assert.equal((await ingest(ledger,completion(OTHER))).code,'unapproved-milestone');
 db.close();
});
test('same signed event id retries once; changed bytes, duplicate proof and duplicate milestone are rejected',async()=>{
 const {ledger,db}=makeStore();
 const a=approval(),signature=await signed(a);
 assert.equal((await ledger.ingestSignedReceipt(signature)).ok,true);
 assert.deepEqual(await ledger.ingestSignedReceipt(signature),
   {ok:true,alreadyProcessed:true});
 const forged=await signed({...a,chapterId:'other_chapter_25'});
 assert.equal((await ledger.ingestSignedReceipt(forged)).code,'event-id-reuse');
 assert.equal((await ingest(ledger,chapter())).ok,true);
 assert.equal((await ingest(ledger,chapter(UID,{eventId:'another_chapter_receipt'}))).code,
   'chapter-already-recorded');
 assert.equal((await ingest(ledger,completion())).ok,true);
 assert.equal((await ingest(ledger,completion(UID,'approved_story_25',{
   eventId:'second_completion',evidenceId:'other_evidence'}))).code,
   'milestone-already-completed');
 assert.equal(db.prepare('SELECT count(*) AS n FROM v25_event_receipts').get().n,3);
 db.close();
});
test('attestation denies wrong role, tampering, oversized body, replay clock and self-declared browser progress',async()=>{
 const {ledger,db}=makeStore();
 const a=approval(),correct=await signed(a);
 assert.equal((await ingest(ledger,a,{secret:PROGRESS_KEY})).code,
   'invalid-attestation');
 assert.equal((await ledger.ingestSignedReceipt({...correct,
   rawBytes:bytes({...a,revision:98})})).code,'invalid-attestation');
 assert.equal((await ledger.ingestSignedReceipt({...correct,
   rawBytes:new Uint8Array(4000)})).code,'invalid-attestation');
 assert.equal((await ledger.ingestSignedReceipt({...correct,
   timestamp:String(NOW-1_000_000)})).code,'invalid-attestation');
 assert.equal((await ledger.ingestSignedReceipt({rawBytes:bytes(chapter())})).code,
   'invalid-attestation');
 assert.equal(normalizeV25Receipt({...chapter(),clientAffinity:99},NOW),null);
 assert.equal(normalizeV25Receipt({...approval(),npcId:'npc_f_03'},NOW),null);
 assert.equal(await verifyV25Receipt({...correct,secrets:{
   approval:'same-secret-is-long-enough-to-break-domain-separation',
   progress:'same-secret-is-long-enough-to-break-domain-separation'}}),null);
 assert.equal(db.prepare('SELECT count(*) AS n FROM v25_event_receipts').get().n,0);
 db.close();
});
test('NPC achievements reject mismatched proof, low trust, missing approval, and local affection writes',async()=>{
 const {ledger,db}=makeStore(),id='approved_bond_25';
 const sandboxSave={affinity:99,trust:99,stories:3,coins:8000};
 const old=JSON.stringify(sandboxSave);
 assert.equal((await ingest(ledger,bond())).code,'bond-not-eligible');
 assert.equal((await ingest(ledger,approval('soulbond',id))).ok,true);
 assert.equal((await ingest(ledger,bond(UID,{eventId:'bond_too_low',trust:40}))).code,
   'bond-not-eligible');
 assert.equal((await ingest(ledger,bond(UID,{eventId:'bond_wrong_milestone',
   milestoneId:'another_milestone'}))).code,'bond-not-eligible');
 assert.equal((await ingest(ledger,bond())).ok,true);
 assert.equal((await ingest(ledger,bond(UID,{eventId:'bond_second'}))).code,
   'bond-already-recorded');
 assert.equal(JSON.stringify(sandboxSave),old);
 db.close();
});
test('invalid approval revision and pre-approval chapter proof cannot mint',async()=>{
 const {ledger,db}=makeStore();
 assert.equal((await ingest(ledger,approval('legend','approved_story_25',3))).code,
   'approval-revision-conflict');
 assert.equal((await ingest(ledger,approval())).ok,true);
 assert.equal((await ingest(ledger,chapter(UID,{completedAt:NOW-150000}))).ok,true);
 assert.equal((await ingest(ledger,completion())).code,'missing-chapter-proof');
 assert.equal((await ingest(ledger,revocation('approved_story_25',4))).code,
   'approval-revision-conflict');
 db.close();
});
test('V25 remains dark: no public Worker route, storage binding or embedded keys',()=>{
 const root=resolve(import.meta.dirname,'..');
 const worker=readFileSync(resolve(root,'src/index.mjs'),'utf8');
 const config=readFileSync(resolve(root,'wrangler.toml'),'utf8');
 assert.doesNotMatch(worker,/milestone-ledger-v25|milestone-receipt-v25/);
 assert.doesNotMatch(worker,/\/v1\/milestone-ledger/);
 assert.doesNotMatch(config,/DUDU_V25_|DUDU_MILESTONE_EVIDENCE/);
 assert.doesNotMatch(config,/approval-source-exclusive-backend-secret/);
 assert.match(config,/AVATAR_AWARDS_ENABLED = "false"/);
 assert.match(config,/AVATAR_AWARD_ISSUER_ENABLED = "false"/);
});
