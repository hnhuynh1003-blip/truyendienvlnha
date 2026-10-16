import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {V25TrustedMilestoneLedger,createV25MilestoneReaders}
  from '../src/milestone-ledger-v25.mjs';
import {V26TrustedMilestoneProducer}
  from '../src/milestone-producer-v26.mjs';
import {issueV24MilestoneFrame} from '../src/avatar-milestone-verifier-v24.mjs';
import {verifyAwardWebhook} from '../src/avatar-award-webhook.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const START=1792000000000;
const STORY='dudu_story_v26',CHAPTER='chapter_07',NPC='npc_f_23';
const M_STORY='legend_v26',M_BOND='bond_v26';
const AUTHOR='author_v26',USER_A='firebase_reader_a',USER_B='firebase_reader_b';
const secrets={approval:'v26-staging-approval-role-secret-only-backend-abcdefgh',
  progress:'v26-staging-progress-role-secret-only-backend-ijklmnop'};
const issuerSecret='v26-award-issuer-key-not-for-browsers-abcdefghijk';
const request=(credential,milestoneId)=>({credential,storyId:STORY,milestoneId});
const assertCode=(out,code)=>assert.equal(out.code,code);

function fixture(){
 const db=new DatabaseSync(':memory:');
 const sql={exec(statement,...args){
   if(statement.trimStart().startsWith('CREATE TABLE')){
     db.exec(statement);return {toArray:()=>[]};
   }
   const stmt=db.prepare(statement);
   const result=/^\s*SELECT\b/i.test(statement)?stmt.all(...args):
     (stmt.run(...args),[]);
   return {toArray:()=>result};
 }};
 const transactionSync=fn=>{
   db.exec('BEGIN IMMEDIATE');
   try{const result=fn();db.exec('COMMIT');return result;}
   catch(err){db.exec('ROLLBACK');throw err;}
 };
 const ledger=new V25TrustedMilestoneLedger({sql,transactionSync,secrets});
 let now=START,serial=0;
 const identities=new Map([
   ['author-firebase-jwt',{uid:AUTHOR,admin:true,verifiedBy:'FIREBASE_AUTH'}],
   ['reader-a-jwt',{uid:USER_A,admin:false,verifiedBy:'FIREBASE_AUTH'}],
   ['reader-b-jwt',{uid:USER_B,admin:false,verifiedBy:'FIREBASE_AUTH'}]
 ]);
 const chapters=new Map(),bonds=new Map();
 const readKey=(uid,chapterId=CHAPTER)=>uid+'|'+STORY+'|'+chapterId;
 const bondKey=(uid,milestoneId)=>uid+'|'+STORY+'|'+NPC+'|'+milestoneId;
 const sources={
   async authenticate(token){return identities.get(token)||null;},
   async getStory(id){return id===STORY?{id,ownerUid:AUTHOR,status:'PUBLISHED'}:null;},
   async getChapter(storyId,chapterId){
     return storyId===STORY&&chapterId===CHAPTER?
       {storyId,chapterId,status:'PUBLISHED'}:null;
   },
   async getNpc(storyId,npcId){
     return storyId===STORY&&npcId===NPC?
       {storyId,npcId,status:'ACTIVE'}:null;
   },
   async getChapterEvidence({uid,storyId,chapterId}){
     return storyId===STORY?chapters.get(readKey(uid,chapterId))||null:null;
   },
   async getBondEvidence({uid,storyId,npcId,milestoneId}){
     return storyId===STORY&&npcId===NPC?
       bonds.get(bondKey(uid,milestoneId))||null:null;
   }
 };
 const producer=new V26TrustedMilestoneProducer({
   sources,ledger,secrets,now:()=>now,newId:()=> 'event_'+(++serial)
 });
 return {
   db,sources,ledger,producer,identities,chapters,bonds,
   advance:(ms=1000)=>{now+=ms;return now;},
   clock:()=>now,
   read:(uid,changes={})=>{
     const completedAt=now;
     chapters.set(readKey(uid),{
       uid,storyId:STORY,chapterId:CHAPTER,status:'VERIFIED_COMPLETE',
       verifiedBy:'STORY_READ_SERVICE',completedAt,...changes
     });
   },
   bonded:(uid,milestoneId=M_BOND,changes={})=>{
     bonds.set(bondKey(uid,milestoneId),{
       uid,storyId:STORY,npcId:NPC,milestoneId,
       status:'VERIFIED_BONDED',verifiedBy:'NPC_RELATIONSHIP_SERVICE',
       trust:70,verifiedAt:now,...changes
     });
   },
   async ingest(signed){
     assert.equal(signed.ok,true,JSON.stringify(signed));
     return ledger.ingestSignedReceipt(signed);
   }
 };
}
const publication=(frameId='legend',milestoneId=M_STORY,other={})=>({
  credential:'author-firebase-jwt',storyId:STORY,milestoneId,
  frameId,chapterId:CHAPTER,
  npcId:frameId==='soulbond'?NPC:null,
  minimumTrust:frameId==='soulbond'?50:null,
  expectedRevision:0,...other
});

test('V26 author permissions: only verified admin owning story can approve',async()=>{
 const f=fixture(),input=publication();
 assertCode(await f.producer.authorPublish({...input,credential:'reader-a-jwt'}),
   'not-authorized-or-unpublished');
 assertCode(await f.producer.authorPublish({...input,credential:'forged-jwt'}),
   'not-authorized-or-unpublished');
 f.identities.set('malicious-jwt',{uid:USER_A,admin:true,verifiedBy:'FIREBASE_AUTH'});
 assertCode(await f.producer.authorPublish({...input,credential:'malicious-jwt'}),
   'not-authorized-or-unpublished');
 assertCode(await f.producer.authorPublish({...input,uid:USER_A}),'invalid-request');
 assert.equal((await f.ingest(await f.producer.authorPublish(input))).active,true);
 assert.equal(f.ledger.getApproval({storyId:STORY,milestoneId:M_STORY}).revision,1);
 assertCode(await f.producer.authorPublish(input),'approval-version-conflict');
 f.db.close();
});
test('V26 independent reader A and reader B proof ownership; no cross-account re-use',async()=>{
 const f=fixture();
 await f.ingest(await f.producer.authorPublish(publication()));
 f.advance();
 f.read(USER_A);
 assertCode(await f.producer.verifyChapter({credential:'reader-b-jwt',
   storyId:STORY,chapterId:CHAPTER}),'unverified-chapter');
 const a=await f.producer.verifyChapter({credential:'reader-a-jwt',
   storyId:STORY,chapterId:CHAPTER});
 assert.equal((await f.ingest(a)).chapterVerified,true);
 assert.equal(f.ledger.getChapterProof({uid:USER_B,storyId:STORY,chapterId:CHAPTER}),null);
 assertCode(await f.producer.completeMilestone(request('reader-b-jwt',M_STORY)),
   'chapter-proof-required');
 f.advance();
 const completed=await f.producer.completeMilestone(request('reader-a-jwt',M_STORY));
 const receipt=await f.ingest(completed);
 assert.equal(receipt.completed,true);
 assert.equal(f.ledger.getCompletion({uid:USER_B,evidenceId:receipt.evidenceId,
   source:'VERIFIED_STORY_MILESTONE'}),null);
 const award=await issueV24MilestoneFrame({
   uid:USER_A,frameId:'legend',evidenceId:receipt.evidenceId,
   now:f.clock(),readers:createV25MilestoneReaders(f.ledger),
   secret:issuerSecret,newEventId:()=> 'award_v26_legend'
 });
 assert.equal(award.ok,true);
 const verification=await verifyAwardWebhook({
   rawBytes:award.body,timestamp:award.timestamp,
   signature:award.signature,secret:issuerSecret,now:f.clock()
 });
 assert.equal(verification.uid,USER_A);
 assert.equal(verification.frameId,'legend');
 f.db.close();
});
test('V26 Tri Ky requires author-approved NPC, private server bond and chapter per UID',async()=>{
 const f=fixture();
 await f.ingest(await f.producer.authorPublish(publication('soulbond',M_BOND)));
 f.advance();
 f.read(USER_B);
 await f.ingest(await f.producer.verifyChapter({
   credential:'reader-b-jwt',storyId:STORY,chapterId:CHAPTER}));
 assertCode(await f.producer.verifyBond(request('reader-b-jwt',M_BOND)),
   'unverified-bond');
 f.advance();
 f.bonded(USER_B);
 const bond=await f.producer.verifyBond(request('reader-b-jwt',M_BOND));
 assert.equal((await f.ingest(bond)).bondVerified,true);
 f.advance();
 const completion=await f.ingest(await f.producer.completeMilestone(
   request('reader-b-jwt',M_BOND)));
 const award=await issueV24MilestoneFrame({
   uid:USER_B,frameId:'soulbond',evidenceId:completion.evidenceId,
   now:f.clock(),readers:createV25MilestoneReaders(f.ledger),
   secret:issuerSecret,newEventId:()=> 'award_v26_bond'
 });
 assert.equal(award.ok,true);
 assertCode(await f.producer.completeMilestone(request('reader-a-jwt',M_BOND)),
   'chapter-proof-required');
 f.db.close();
});
test('V26 rejects fake browser timers, affection, spoofed actor and foreign story/NPC',async()=>{
 const f=fixture();
 const original={affinity:100,trust:100,coins:1000};
 const snapshot=JSON.stringify(original);
 await f.ingest(await f.producer.authorPublish(publication('soulbond',M_BOND)));
 f.advance();
 f.read(USER_A,{verifiedBy:'BROWSER_TIMER'});
 assertCode(await f.producer.verifyChapter({
   credential:'reader-a-jwt',storyId:STORY,chapterId:CHAPTER}),
   'unverified-chapter');
 f.read(USER_A);
 f.bonded(USER_A,M_BOND,{verifiedBy:'CLIENT_NPC_AFFINITY'});
 assertCode(await f.producer.verifyBond(request('reader-a-jwt',M_BOND)),
   'unverified-bond');
 assertCode(await f.producer.verifyBond({...request('reader-a-jwt',M_BOND),
   uid:USER_B}),'invalid-request');
 assertCode(await f.producer.verifyBond({...request('reader-a-jwt',M_BOND),
   npcId:NPC}),'invalid-request');
 assertCode(await f.producer.verifyChapter({
   credential:'reader-a-jwt',storyId:'wrong_story',chapterId:CHAPTER}),
   'unauthorized-or-unpublished');
 assertCode(await f.producer.authorPublish(publication('soulbond',M_BOND,{
   milestoneId:'impostor',npcId:'npc_f_other'})), 'invalid-milestone-scope');
 assert.equal(JSON.stringify(original),snapshot);
 f.db.close();
});
test('V26 revocation uses exact author and revision, never silently reactivates',async()=>{
 const f=fixture();
 await f.ingest(await f.producer.authorPublish(publication()));
 assertCode(await f.producer.authorRevoke({
   credential:'reader-a-jwt',storyId:STORY,milestoneId:M_STORY,
   expectedRevision:1}),'not-authorized-or-unpublished');
 assertCode(await f.producer.authorRevoke({
   credential:'author-firebase-jwt',storyId:STORY,milestoneId:M_STORY,
   expectedRevision:0}),'invalid-request');
 f.advance();
 const revoked=await f.producer.authorRevoke({
   credential:'author-firebase-jwt',storyId:STORY,milestoneId:M_STORY,
   expectedRevision:1});
 assert.equal((await f.ingest(revoked)).active,false);
 assert.equal(f.ledger.getApproval({storyId:STORY,milestoneId:M_STORY}),null);
 f.advance();
 assertCode(await f.producer.completeMilestone(request('reader-a-jwt',M_STORY)),
   'unapproved-milestone');
 assertCode(await f.producer.authorPublish(publication()),'approval-version-conflict');
 assert.equal((await f.ingest(await f.producer.authorPublish(
   publication('legend',M_STORY,{expectedRevision:2})))).approvalRevision,3);
 f.db.close();
});
test('V26 tampered receipt and non-authenticated principal are rejected',async()=>{
 const f=fixture();
 const ticket=await f.producer.authorPublish(publication());
 assert.equal(ticket.ok,true);
 const modified=new TextEncoder().encode(new TextDecoder()
   .decode(ticket.rawBytes).replace(CHAPTER,'chapter_99'));
 assertCode(await f.ledger.ingestSignedReceipt({...ticket,
   rawBytes:modified}),'invalid-attestation');
 assertCode(await f.producer.verifyChapter({credential:{uid:USER_A},
   storyId:STORY,chapterId:CHAPTER}),'unauthorized-or-unpublished');
 assertCode(await f.producer.authorPublish({
   ...publication(),expectedRevision:999}),'approval-version-conflict');
 f.db.close();
});
test('V26 fail-closed on missing trusted source and unsupported principal',async()=>{
 const f=fixture();
 f.identities.set('bad-client-principal',{uid:USER_A,admin:false});
 assertCode(await f.producer.verifyChapter({
   credential:'bad-client-principal',storyId:STORY,chapterId:CHAPTER}),
   'unauthorized-or-unpublished');
 f.sources.getStory=async()=>{throw Error('DB offline');};
 assertCode(await f.producer.authorPublish(publication()),'trusted-source-unavailable');
 f.db.close();
});
test('V26 source remains server-only; no new public endpoints, secrets or enabled flags',()=>{
 const root=resolve(import.meta.dirname,'..');
 const source=readFileSync(resolve(root,'src/milestone-producer-v26.mjs'),'utf8');
 const index=readFileSync(resolve(root,'src/index.mjs'),'utf8');
 const config=readFileSync(resolve(root,'wrangler.toml'),'utf8');
 assert.match(source,/class V26TrustedMilestoneProducer/);
 assert.doesNotMatch(index,/milestone-producer-v26|milestone-ledger-v25/);
 assert.doesNotMatch(config,/v26-staging-approval-role-secret/);
 assert.match(config,/AVATAR_AWARDS_ENABLED = "false"/);
 assert.match(config,/AVATAR_AWARD_ISSUER_ENABLED = "false"/);
 assert.match(config,/AVATAR_R2_ENABLED = "false"/);
});
