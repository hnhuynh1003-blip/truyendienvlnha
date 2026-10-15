import {test} from 'node:test';
import assert from 'node:assert/strict';
import {issueVerifiedFrameEvent} from '../src/avatar-achievement-issuer-v20.mjs';
import {verifyAwardWebhook} from '../src/avatar-award-webhook.mjs';

const NOW=1792000000000;
const SECRET='server-only-issuer-key-not-for-browsers-2026-abcdefghijkl';
const EVIDENCE={
  uid:'readerUID_17',evidenceId:'chapter-read-0001',
  source:'VERIFIED_STORY_MILESTONE',
  completed:true,approved:true,serverVerified:true,completedAt:NOW-1000
};
const defaultArgs=()=>({
  uid:EVIDENCE.uid,frameId:'legend',evidenceId:EVIDENCE.evidenceId,
  now:NOW,secret:SECRET,newEventId:()=> 'event-id-000019',
  loadEvidence:async()=>({...EVIDENCE})
});
test('issuer emits V19-verifiable HMAC from authoritative confirmed ledger only',async()=>{
 const args=defaultArgs();
 let checked;
 args.loadEvidence=async(input)=>{checked=input;return {...EVIDENCE};};
 const out=await issueVerifiedFrameEvent(args);
 assert.equal(out.ok,true);
 assert.deepEqual(checked,{uid:EVIDENCE.uid,evidenceId:EVIDENCE.evidenceId,
   source:EVIDENCE.source});
 const event=await verifyAwardWebhook({rawBytes:out.body,
   timestamp:out.timestamp,signature:out.signature,
   secret:SECRET,now:NOW});
 assert.deepEqual(event,{uid:EVIDENCE.uid,frameId:'legend',
   source:EVIDENCE.source,evidenceId:EVIDENCE.evidenceId,
   eventId:'event-id-000019',occurredAt:NOW-1000});
 assert.equal(Object.hasOwn(out,'secret'),false);
});
test('self-declared progress, forged user, unapproved milestones cannot issue',async()=>{
 for(const bad of [
  {uid:'victim'},
  {evidenceId:'different'},
  {source:'CLIENT_STORY_MILESTONE'},
  {completed:false},
  {approved:false},
  {serverVerified:false},
  {completedAt:NOW+1},
  {completedAt:'yesterday'}
 ]){
  const args=defaultArgs();
  args.loadEvidence=async()=>({...EVIDENCE,...bad});
  const out=await issueVerifiedFrameEvent(args);
  assert.deepEqual(out,{ok:false,code:'unverified-achievement'},JSON.stringify(bad));
 }
 const missing=defaultArgs();missing.loadEvidence=async()=>null;
 assert.equal((await issueVerifiedFrameEvent(missing)).ok,false);
 const broken=defaultArgs();broken.loadEvidence=async()=>{throw Error('DB offline');};
 assert.deepEqual(await issueVerifiedFrameEvent(broken),
   {ok:false,code:'evidence-unavailable'});
});
test('unknown frame, broken evidence and no trusted reader cannot mint events',async()=>{
 for(const invalid of [
  {uid:'../victim'},
  {frameId:'author'},
  {evidenceId:'../../other'},
  {secret:'too-short'},
  {newEventId:()=>'bad space'},
  {loadEvidence:null}
 ]){
  const out=await issueVerifiedFrameEvent({...defaultArgs(),...invalid});
  assert.equal(out.ok,false,JSON.stringify(invalid));
 }
});
test('issuer is not imported by public Worker and flags remain off',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const index=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const config=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 assert.doesNotMatch(index,/avatar-achievement-issuer-v20|issueVerifiedFrameEvent/);
 assert.match(config,/AVATAR_AWARD_ISSUER_ENABLED = "false"/);
 assert.match(config,/AVATAR_AWARDS_ENABLED = "false"/);
 assert.doesNotMatch(index,/\/v1\/achievements\/complete/);
});
