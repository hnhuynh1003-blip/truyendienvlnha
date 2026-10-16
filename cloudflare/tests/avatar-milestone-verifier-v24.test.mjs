import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {issueV24MilestoneFrame,createV24EvidenceReader}
  from '../src/avatar-milestone-verifier-v24.mjs';
import {verifyAwardWebhook} from '../src/avatar-award-webhook.mjs';

const NOW=1792000000000;
const KEY='v24-server-only-staging-key-kept-out-of-client-000123456';
const uid='firebaseReader_24';
const storyId='duduStory_24';
const chapterId='chapter_09';
const npcId='npc_f_12';
const milestoneId='approved_milestone_1';
const evidenceId='signed_evidence_1';

function fixture(frameId='legend',changes={}){
 const source=frameId==='legend'?
   'VERIFIED_STORY_MILESTONE':'VERIFIED_NPC_BOND';
 const completion={uid,evidenceId,source,storyId,milestoneId,
   approvalRevision:3,status:'VERIFIED_COMPLETE',
   verifiedBy:'TRUSTED_SERVER',completedAt:NOW-500,
   ...(frameId==='soulbond'?{npcId}:{}),...changes.completion};
 const approval={storyId,milestoneId,frameId,
   kind:frameId==='legend'?'STORY':'NPC_BOND',
   status:'APPROVED',published:true,revision:3,
   chapterId,reviewedAt:NOW-100000,
   ...(frameId==='soulbond'?{npcId,minimumTrust:50}:{}),
   ...changes.approval};
 const chapter={uid,storyId,chapterId,status:'VERIFIED_COMPLETE',
   verifiedBy:'TRUSTED_SERVER',completedAt:NOW-25000,
   ...changes.chapter};
 const bond={uid,storyId,npcId,milestoneId,status:'VERIFIED_BONDED',
   verifiedBy:'TRUSTED_SERVER',trust:60,verifiedAt:NOW-1000,
   ...changes.bond};
 const calls=[];
 const readers={
   loadCompletion:async args=>{calls.push(['completion',args]);
     if(changes.fail==='completion')throw Error('ledger unavailable');
     return changes.noCompletion?null:completion;},
   loadApproval:async args=>{calls.push(['approval',args]);return approval;},
   loadChapterProof:async args=>{calls.push(['chapter',args]);return chapter;},
   loadBondProof:async args=>{calls.push(['bond',args]);return bond;}
 };
 return {readers,calls,completion,approval,chapter,bond};
}
const issue=(frameId,readers)=>issueV24MilestoneFrame({
 uid,frameId,evidenceId,now:NOW,readers,secret:KEY,
 newEventId:()=>frameId==='legend'?'v24_event_story_1':'v24_event_bond_1'
});

test('V24 story milestone: independent server ledger proof produces V19-verifiable signature',async()=>{
 const f=fixture();
 const signed=await issue('legend',f.readers);
 assert.equal(signed.ok,true);
 const result=await verifyAwardWebhook({
   rawBytes:signed.body,timestamp:signed.timestamp,
   signature:signed.signature,secret:KEY,now:NOW
 });
 assert.deepEqual(result,{uid,frameId:'legend',
   source:'VERIFIED_STORY_MILESTONE',evidenceId,
   eventId:'v24_event_story_1',occurredAt:NOW-500});
 assert.deepEqual(f.calls.map(x=>x[0]),['completion','approval','chapter']);
 assert.deepEqual(f.calls[0][1],{uid,evidenceId,
   source:'VERIFIED_STORY_MILESTONE'});
 assert.ok(!Object.hasOwn(signed,'secret'));
});

test('V24 Tri Ky frame requires author approval, a read proof AND server bond proof',async()=>{
 const f=fixture('soulbond');
 const signed=await issue('soulbond',f.readers);
 assert.equal(signed.ok,true);
 assert.deepEqual(f.calls.map(x=>x[0]),
   ['completion','approval','chapter','bond']);
 assert.deepEqual(f.calls[3][1],{uid,storyId,npcId});
 const result=await verifyAwardWebhook({
   rawBytes:signed.body,timestamp:signed.timestamp,
   signature:signed.signature,secret:KEY,now:NOW
 });
 assert.equal(result.frameId,'soulbond');
 assert.equal(result.source,'VERIFIED_NPC_BOND');
});

test('fake client milestones, wrong owner, stale approval and fake chapter readings cannot unlock',async()=>{
 const variants=[
   {completion:{uid:'anotherUser'}},
   {completion:{evidenceId:'forged'}},
   {completion:{status:'CLIENT_CLAIMED'}},
   {completion:{verifiedBy:'BROWSER'}},
   {completion:{approvalRevision:2}},
   {completion:{completedAt:NOW+1}},
   {approval:{published:false}},
   {approval:{status:'DRAFT'}},
   {approval:{frameId:'soulbond'}},
   {approval:{reviewedAt:NOW-10}},
   {chapter:{uid:'someoneElse'}},
   {chapter:{storyId:'anotherStory'}},
   {chapter:{status:'CLIENT_TIMER'}},
   {chapter:{verifiedBy:'LOCAL_STORAGE'}},
   {chapter:{completedAt:NOW}}
 ];
 for(const invalid of variants){
   const f=fixture('legend',invalid);
   const answer=await issue('legend',f.readers);
   assert.deepEqual(answer,{ok:false,code:'unverified-achievement'},
     JSON.stringify(invalid));
 }
 const f=fixture('legend',{noCompletion:true});
 assert.equal((await issue('legend',f.readers)).ok,false);
});

test('local affection and unverified NPC stages never substitute for trusted soulbond proof',async()=>{
 const variants=[
   {approval:{minimumTrust:101}},
   {approval:{minimumTrust:0}},
   {approval:{npcId:'differentNpc'}},
   {completion:{npcId:'differentNpc'}},
   {bond:{uid:'differentUid'}},
   {bond:{npcId:'differentNpc'}},
   {bond:{milestoneId:'wrongMilestone'}},
   {bond:{verifiedBy:'LOCAL_NPC_SAVE'}},
   {bond:{status:'BROWSER_BONDED'}},
   {bond:{trust:49}},
   {bond:{verifiedAt:NOW+1000}},
   {bond:{verifiedAt:NOW-100}}
 ];
 for(const invalid of variants){
   const answer=await issue('soulbond',fixture('soulbond',invalid).readers);
   assert.deepEqual(answer,{ok:false,code:'unverified-achievement'},
     JSON.stringify(invalid));
 }
 const legacySave={affinity:99,trust:99,npcId,money:12345};
 const unchanged=JSON.stringify(legacySave);
 const f=fixture('soulbond',{bond:{trust:0}});
 assert.equal((await issue('soulbond',f.readers)).ok,false);
 assert.equal(JSON.stringify(legacySave),unchanged);
});

test('fail closed on bad reader configuration, failing ledger and forged award request',async()=>{
 const offline=fixture('legend',{fail:'completion'});
 assert.deepEqual(await issue('legend',offline.readers),
   {ok:false,code:'evidence-unavailable'});
 assert.equal((await issue('author',fixture().readers)).ok,false);
 assert.equal((await issueV24MilestoneFrame({uid,
   frameId:'legend',evidenceId,now:NOW,readers:{},
   secret:KEY,newEventId:()=> 'test_event_1'})).code,
   'trusted-readers-unavailable');
 assert.throws(()=>createV24EvidenceReader({now:NOW}),TypeError);
});

test('V24 is server-only, does not activate awards or change V23 private-photo lifecycle',()=>{
 const root=resolve(import.meta.dirname,'..');
 const code=readFileSync(resolve(root,'src/index.mjs'),'utf8');
 const cfg=readFileSync(resolve(root,'wrangler.toml'),'utf8');
 const v24=readFileSync(resolve(root,'src/avatar-milestone-verifier-v24.mjs'),'utf8');
 const v23=readFileSync(resolve(root,'src/avatar-photo-finalize-v23.mjs'),'utf8');
 assert.doesNotMatch(code,/avatar-milestone-verifier-v24|issueV24MilestoneFrame/);
 assert.doesNotMatch(code,/\/v1\/milestones\/claim/);
 assert.match(cfg,/AVATAR_AWARDS_ENABLED = "false"/);
 assert.match(cfg,/AVATAR_AWARD_ISSUER_ENABLED = "false"/);
 assert.doesNotMatch(cfg,/AVATAR_EVENT_HMAC_SECRET\s*=/);
 assert.match(v24,/loadChapterProof/);
 assert.match(v24,/loadBondProof/);
 assert.match(v23,/publishable:false/);
});
