import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createSqlRegistryService} from '../src/vangioi-registry.mjs';
import {createSqlAuthoringService} from '../src/vangioi-authoring-sql.mjs';
import {createSqlProvisioningService} from '../src/vangioi-provisioning.mjs';
import {createSqlSourceNoticeService} from '../src/vangioi-source-notices.mjs';
import {createSqlWorldReleaseGate} from '../src/vangioi-world-release-gate.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {G5B_REHEARSAL_VERSION,createG5BModerationRehearsal}
 from '../src/vangioi-g5b-moderation-rehearsal.mjs';
import {content} from './fixtures/vangioi-content.mjs';

const OWNER='g5b-owner',REVIEWER='g5b-reviewer',COLLAB='g5b-collaborator',OP='g5b-operator';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgkjP6DwAB6gFaZRSBGgAAAABJRU5ErkJggg==';
const request=user=>new Request('https://fixture.invalid/moderation',{
 headers:{Authorization:`Bearer ${user}`}});
const reviewInput=(s,patch={})=>({worldId:s.w.worldId,requestId:crypto.randomUUID(),
 expectedRevision:s.submitted.revision,expectedAccessRevision:1,
 snapshotHash:s.submitted.snapshotHash,decision:'approve',note:'Manual review on synthetic content',...patch});
const number=(f,table)=>f.rows(`SELECT count(*) AS n FROM vg_authoring_${table}_v1`)[0].n;

function setup(){
 const db=new DatabaseSync(':memory:'),hooks={fail:null,before:null,transactions:0};
 const sql={exec(q,...args){
  args=args.map(x=>x instanceof ArrayBuffer?new Uint8Array(x):x);
  const query=q.trim();let rows=[];
  if(query.startsWith('CREATE '))db.exec(q);
  else{const stmt=db.prepare(q);if(/^(SELECT|WITH)\b|\bRETURNING\b/i.test(query))rows=stmt.all(...args);
   else stmt.run(...args);}
  if(hooks.fail&&q.includes(hooks.fail)){hooks.fail=null;throw Error('PRIVATE_FAULT');}
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){
  hooks.transactions++;hooks.before?.(hooks.transactions);
  db.exec('BEGIN IMMEDIATE');
  try{const x=fn();db.exec('COMMIT');return x;}catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const verify=async r=>{const uid=r?.headers?.get('Authorization')?.slice(7);
  return uid&&uid!=='guest'?{uid,admin:true}:null;};
 const options={storage,projectId:'truyendienvl',verify,now:()=>1000};
 const registry=createSqlRegistryService(options),authoring=createSqlAuthoringService(options),
  provision=createSqlProvisioningService(options),releaseGate=createSqlWorldReleaseGate(options),
  notices=createSqlSourceNoticeService(options);
 sql.exec("INSERT INTO vg_authoring_registry_operators_v1 VALUES(?,'active')",OP);
 sql.exec("INSERT INTO vg_authoring_entitlements_v1 VALUES(?,'active',1,1)",OWNER);
 const rehearsal=createG5BModerationRehearsal({environment:'fixture',storage,
  projectId:'demo-g5b',verify,authoring,releaseGate,operatorRequest:request(OP)});
 const rows=(q,...args)=>sql.exec(q,...args).toArray();
 const act=(input,user=REVIEWER)=>rehearsal.review(request(user),input);
 const source=()=>({requestId:crypto.randomUUID(),kind:'library',storyId:'g5b-story',
  storyVersion:'v1',authorizedUid:OWNER,license:'original',
  sourceNote:'Operator checked synthetic source',proofRef:null,
  payload:{format:'story-source-1',title:'Fixture source',
   chapters:[{chapterId:'chapter-one',title:'One',text:'PRIVATE_G5B_SOURCE_TEXT'}]}});
 const asset=(kind,assetId)=>({requestId:crypto.randomUUID(),assetId,assetVersion:'v1',kind,
  authorizedUid:OWNER,license:'original',sourceNote:'Fixture art',proofRef:null,pngBase64:PNG});
 async function seed({legacy=false}={}){
  const w=await provision.createWorld(request(OWNER),{requestId:crypto.randomUUID(),content:{}});
  assert.equal(w.ok,true);
  const d=source(),h=await hashAuthoringJson(d.payload);
  if(!legacy)assert.equal((await registry.issueAdaptationPermit(request(OP),{
   requestId:crypto.randomUUID(),storyId:d.storyId,contentHash:h,authorizedUid:OWNER,
   license:d.license,sourceNote:d.sourceNote,proofRef:null})).ok,true);
  const s=await registry.registerSource(request(OP),{...d,storyVersion:legacy?'v1':`sha256-${h}`});
  const cover=await registry.registerAsset(request(OP),asset('worldCover','art-cover')),
   room=await registry.registerAsset(request(OP),asset('sceneBackground','art-room'));
  for(const item of [s,cover,room])assert.equal(item.ok,true);
  const grant=x=>({worldId:w.worldId,requestId:crypto.randomUUID(),expectedAccessRevision:1,
   expectedGrantRevision:0,reference:x.reference,status:'active'});
  assert.equal((await registry.setSourceGrant(request(OWNER),grant(s))).ok,true);
  for(const x of [cover,room])assert.equal((await registry.setAssetGrant(request(OWNER),grant(x))).ok,true);
  const c=content();c.storySource=s.reference;
  c.contentTags=['mystery'];c.assets=c.assets.map(a=>({...a,
   ...(a.assetId==='art-cover'?cover:room).reference}));
  assert.equal((await authoring.saveDraft(request(OWNER),{
   worldId:w.worldId,requestId:crypto.randomUUID(),expectedRevision:1,patch:c})).ok,true);
  const submitted=await authoring.submitDraft(request(OWNER),{
   worldId:w.worldId,requestId:crypto.randomUUID(),expectedRevision:2});
  assert.equal(submitted.ok,true);
  sql.exec("INSERT INTO vg_authoring_members_v1 VALUES(?,?,'active',?,?)",w.worldId,REVIEWER,
   JSON.stringify(['reviewer']),'[]');
  return {w,s,cover,room,submitted};
 }
 return {db,sql,storage,hooks,rows,verify,registry,authoring,releaseGate,notices,
  rehearsal,act,seed,close:()=>db.close()};
}

test('G5B records a G1L independent decision, immutable receipt and audit, then checks G1Y without granting release',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s),r=await f.act(a);
  assert.equal(r.version,G5B_REHEARSAL_VERSION);
  assert.equal(r.ok,true);assert.equal(r.moderationRecorded,true);
  assert.equal(r.fixtureGateEligible,true);assert.equal(r.readyForStaging,false);
  assert.equal(r.code,'synthetic-review-passed');
  for(const flag of ['productionAuthorized','publisherAuthorized','published','legalRightsVerified',
   'contentLabelsVerified','missionCompleted','saveCommitted','rewardAuthorized','rewardCommitted'])
   assert.equal(r[flag],false,flag);
  assert.equal(number(f,'reviews'),1);assert.equal(number(f,'audit'),4);
  assert.equal(number(f,'operations'),4);
  assert.equal(f.rows('SELECT reviewer_uid,decision,note FROM vg_authoring_reviews_v1')[0].reviewer_uid,REVIEWER);
  assert.equal(r.note,undefined);assert.equal(r.actorUid,undefined);
  assert.equal(JSON.stringify(r).includes('PRIVATE_G5B_SOURCE_TEXT'),false);
  assert.equal(JSON.stringify(r).includes('SECRET_TRUTH_SENTINEL'),false);
  assert.throws(()=>f.sql.exec("DELETE FROM vg_authoring_reviews_v1"),/immutable-authoring-record/);
 }finally{f.close();}
});

test('G5B rejects client role, publisher, AI and reward assertions before they reach G1L',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s);
  for(const patch of [{actorUid:REVIEWER},{reviewer:true},{publisherApproved:true},
   {AIApproved:true},{rewardAuthorized:true},{proof:'verified'},{expectedRevision:'2'}]){
   const r=await f.act({...a,...patch});assert.equal(r.code,'invalid-request');
  }
  const forged={...a};Object.defineProperty(forged,'ownerVerified',{
   enumerable:true,get(){throw Error('PRIVATE_ATTACK');}});
  assert.equal((await f.act(forged)).code,'invalid-request');
  assert.equal(number(f,'reviews'),0);
 }finally{f.close();}
});

test('G5B enforces G1L reviewer independence, including former contributors, and ignores admin JWT claims',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s);
  assert.equal((await f.act(a,OWNER)).ok,false);
  assert.equal((await f.act(a,'admin-from-client')).ok,false);
  f.sql.exec("INSERT INTO vg_authoring_members_v1 VALUES(?,?,'active',?,?)",s.w.worldId,COLLAB,
   JSON.stringify(['collaborator']),JSON.stringify(['scenes']));
  assert.equal((await f.act(a,COLLAB)).ok,false);
  f.sql.exec('UPDATE vg_authoring_worlds_v1 SET contributors_json=? WHERE world_id=?',
   JSON.stringify([REVIEWER]),s.w.worldId);
  assert.equal((await f.act(a)).ok,false);
  f.sql.exec("UPDATE vg_authoring_members_v1 SET status='revoked' WHERE uid=?",REVIEWER);
  assert.equal(number(f,'reviews'),0);
 }finally{f.close();}
});

test('G5B request_changes keeps feedback in G1L but never admits a stage or mutates submitted snapshot',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s,{decision:'request_changes',note:'Make visual contrast clearer'}),
   r=await f.act(a);
  assert.equal(r.moderationRecorded,true);assert.equal(r.code,'changes-requested');
  assert.equal(r.fixtureGateEligible,false);
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'inReview');
  const view=await f.authoring.viewReviewDecision(request(OWNER),{
   worldId:s.w.worldId,snapshotHash:s.submitted.snapshotHash});
  assert.equal(view.review.note,'Make visual contrast clearer');
  assert.equal(number(f,'submissions'),1);
  assert.equal((await f.releaseGate.evaluateApprovedWorld(request(OP),{worldId:s.w.worldId})).ok,false);
 }finally{f.close();}
});

test('G5B identical retries return an existing receipt and changed payload or decision conflicts',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s);
  const first=await f.act(a),again=await f.act(a);
  assert.equal(first.ok,true);assert.equal(again.replayed,true);
  assert.equal(first.receiptId,again.receiptId);
  assert.equal(number(f,'reviews'),1);
  assert.equal(number(f,'audit'),4);
  for(const patch of [{note:'Different'},{decision:'request_changes'}])
   assert.equal((await f.act({...a,...patch})).code,'idempotency-conflict');
 }finally{f.close();}
});

test('G5B concurrent incompatible decisions on one snapshot allow only one recorded review',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s),b=reviewInput(s,{decision:'request_changes'});
  const rs=await Promise.all([f.act(a),f.act(b)]);
  assert.equal(rs.filter(r=>r.moderationRecorded).length,1);
  assert.equal(number(f,'reviews'),1);assert.equal(number(f,'audit'),4);
 }finally{f.close();}
});

test('G5B fails closed on reviewer revocation/access revision drift at the G1L commit boundary',async()=>{
 const f=setup();try{
  const s=await f.seed(),target=f.hooks.transactions+2;
  f.hooks.before=n=>{if(n===target){
   f.sql.exec("UPDATE vg_authoring_members_v1 SET status='revoked' WHERE uid=?",REVIEWER);
   f.sql.exec('UPDATE vg_authoring_worlds_v1 SET access_revision=access_revision+1 WHERE world_id=?',s.w.worldId);
  }};
  const r=await f.act(reviewInput(s));assert.equal(r.ok,false);
  assert.equal(number(f,'reviews'),0);assert.equal(number(f,'audit'),3);
 }finally{f.close();}
});

test('G5B G1X notice before decision blocks approval; holds after decision deny G1Y on retry',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s),input={storyId:s.s.reference.storyId,
   contentHash:s.s.reference.contentHash,reason:'rights_dispute',evidenceRef:'PRIVATE_NOTICE',requestId:crypto.randomUUID()};
  const n=await f.notices.openNotice(request(OP),input);assert.equal(n.ok,true);
  assert.equal((await f.act(a)).ok,false);assert.equal(number(f,'reviews'),0);
  assert.equal((await f.notices.resolveNotice(request(OP),{
   requestId:crypto.randomUUID(),noticeId:n.noticeId,expectedRevision:1,
   decision:'release',note:'Fixture check resolved'})).ok,true);
  assert.equal((await f.act(a)).fixtureGateEligible,true);
  const after=await f.notices.openNotice(request(OP),{...input,requestId:crypto.randomUUID()});
  assert.equal(after.ok,true);
  const retry=await f.act(a);
  assert.equal(retry.moderationRecorded,true);assert.equal(retry.replayed,true);
  assert.equal(retry.fixtureGateEligible,false);assert.equal(retry.gateCode,'source-held');
  assert.equal(number(f,'reviews'),1);
 }finally{f.close();}
});

test('G5B release of notice does not undo a separately revoked G1R adaptation permit',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s);assert.equal((await f.act(a)).fixtureGateEligible,true);
  const ref=s.s.reference,n=await f.notices.openNotice(request(OP),{
   requestId:crypto.randomUUID(),storyId:ref.storyId,contentHash:ref.contentHash,
   reason:'owner_report',evidenceRef:'PRIVATE_WITHDRAWAL'});
  assert.equal((await f.registry.revokeAdaptationPermit(request(OP),{
   requestId:crypto.randomUUID(),storyId:ref.storyId,contentHash:ref.contentHash,
   expectedRevision:1})).status,'revoked');
  assert.equal((await f.notices.resolveNotice(request(OP),{
   requestId:crypto.randomUUID(),noticeId:n.noticeId,expectedRevision:1,
   decision:'confirm_revoke',note:'Fixture revoked'})).ok,true);
  const r=await f.act(a);
  assert.equal(r.moderationRecorded,true);assert.equal(r.fixtureGateEligible,false);
  assert.equal(number(f,'reviews'),1);
 }finally{f.close();}
});

test('G5B approved source without tracked G1R permit remains ineligible at G1Y',async()=>{
 const f=setup();try{
  const s=await f.seed({legacy:true}),r=await f.act(reviewInput(s));
  assert.equal(r.moderationRecorded,true);assert.equal(r.fixtureGateEligible,false);
  assert.equal(r.gateCode,'permit-untracked');
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'approved');
 }finally{f.close();}
});

test('G5B post-approval image revoke and owner reopen preserve review history but invalidate staging eligibility',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s);
  assert.equal((await f.act(a)).fixtureGateEligible,true);
  f.sql.exec("UPDATE vg_authoring_asset_grants_v1 SET status='revoked' WHERE world_id=?",s.w.worldId);
  assert.equal((await f.act(a)).gateCode,'asset-not-authorized');
  f.sql.exec("UPDATE vg_authoring_asset_grants_v1 SET status='active' WHERE world_id=?",s.w.worldId);
  const reopened=await f.authoring.reopenDraft(request(OWNER),{
   worldId:s.w.worldId,requestId:crypto.randomUUID(),expectedRevision:s.submitted.revision,
   expectedAccessRevision:1,snapshotHash:s.submitted.snapshotHash});
  assert.equal(reopened.state,'draft');
  const historical=await f.act(a);
  assert.equal(historical.moderationRecorded,true);assert.equal(historical.currentReview,false);
  assert.equal(historical.fixtureGateEligible,false);assert.equal(historical.code,'stale-review');
  assert.equal(number(f,'reviews'),1);
 }finally{f.close();}
});

test('G5B is fail-closed if G1Y result is stale/forged, absent or throws after the durable G1L decision',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s),base={environment:'fixture',storage:f.storage,
   projectId:'demo-g5b',verify:f.verify,authoring:f.authoring,operatorRequest:request(OP)};
  const fake=createG5BModerationRehearsal({...base,releaseGate:{evaluateApprovedWorld:async()=>({
   ok:true,eligible:true,worldId:s.w.worldId,snapshotHash:'c'.repeat(64),gateVersion:'world-release-1'})}});
  assert.equal((await fake.review(request(REVIEWER),a)).fixtureGateEligible,false);
  const failed=createG5BModerationRehearsal({...base,releaseGate:{evaluateApprovedWorld:async()=>{
   throw Error('PRIVATE_GATE_ERROR');}}});
  const r=await failed.review(request(REVIEWER),a);
  assert.equal(r.moderationRecorded,true);assert.equal(r.code,'g1y-reader-unavailable');
  assert.equal(JSON.stringify(r).includes('PRIVATE_GATE_ERROR'),false);
  assert.equal(number(f,'reviews'),1);
 }finally{f.close();}
});

test('G5B G1L audit failure rolls back decision, header, receipt; a fresh retry succeeds',async()=>{
 const f=setup();try{
  const s=await f.seed(),a=reviewInput(s);
  f.hooks.fail='INSERT INTO vg_authoring_audit_v1';
  assert.equal((await f.act(a)).ok,false);assert.equal(number(f,'reviews'),0);
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'submitted');
  assert.equal(number(f,'audit'),3);
  assert.equal((await f.act(a)).fixtureGateEligible,true);
 }finally{f.close();}
});

test('G5B fixture constructor and source isolation cannot create a live review, publisher or reward path',()=>{
 assert.throws(()=>createG5BModerationRehearsal({environment:'production'}),/isolated SQL/);
 for(const f of ['../src/index.mjs','../../js/vangioi-creator.js',
  '../src/vangioi-authoring-http.mjs'])
  assert.equal(readFileSync(new URL(f,import.meta.url),'utf8').includes('vangioi-g5b-moderation-rehearsal'),false);
 const source=readFileSync(new URL('../src/vangioi-g5b-moderation-rehearsal.mjs',import.meta.url),'utf8');
 for(const forbidden of ['firebase-admin','eval(', 'INSERT INTO vg_authoring_reviews',
  'UPDATE vg_authoring_worlds'])assert.equal(source.includes(forbidden),false);
});
