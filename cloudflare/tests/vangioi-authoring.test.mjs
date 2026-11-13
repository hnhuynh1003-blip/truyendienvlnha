import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalJWKSet,generateKeyPair,exportJWK,SignJWT} from 'jose';
import {verifyFirebaseIdToken} from '../src/auth.mjs';
import {createAuthoringService,verifySubmissionIntegrity} from '../src/vangioi-authoring.mjs';

const WORLD='world-test-one',OWNER='test-owner';
const request=(uid='test-owner',payload={})=>new Request('https://unit.test/authoring',{
 method:'POST',headers:{Authorization:'Bearer '+uid,'Content-Type':'application/json'},
 body:JSON.stringify(payload)});
function setup(extra={}){
 const state={
  world:{worldId:WORLD,ownerUid:OWNER,draftRevision:1,accessRevision:1,draftState:'draft',
   contributorUids:['test-former-editor']},
  draft:{worldId:WORLD,revision:1,state:'draft',content:{title:'Draft test',genreId:'modern',
   requestedWorldRank:'S',story:{secretTruth:'AUTHOR_SECRET'},scenes:[{sceneId:'scene-test'}]}},
  members:new Map(),snapshots:new Map(),reads:0,
 };
 const adapters={projectId:'truyendienvl',
  verify:async req=>{
   const uid=req.headers.get('Authorization')?.replace('Bearer ','');
   return uid&&uid!=='guest'?{uid,admin:uid==='test-admin'}:null;
  },
  readWorld:async wid=>wid===WORLD?state.world:null,
  readMembership:async(wid,user)=>state.members.get(wid+':'+user)||null,
  readDraft:async()=>{state.reads++;return state.draft;},
  readSubmission:async(wid,digest)=>state.snapshots.get(wid+':'+digest)||null,
  validateContent:async()=>({readyForReview:true,errors:[],validatorVersion:'fixture-validator-1'}),
  now:()=>1000,...extra,
 };
 const service=createAuthoringService(adapters);
 function member(user,role='collaborator',editSections=['scenes']){
  const row={worldId:WORLD,uid:user,status:'active',roles:[role],editSections};
  state.members.set(WORLD+':'+user,row);return row;
 }
 async function submit(){
  const result=await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1});
  assert.equal(result.ok,true);
  const s=result.snapshot;
  // Only this test fixture performs a simulated transaction. No service method
  // writes a database, applies this header or grants a published world.
  state.snapshots.set(WORLD+':'+s.snapshotHash,structuredClone(s));
  state.world.draftState='submitted';state.draft.state='submitted';
  return s;
 }
 return {state,service,member,submit,adapters};
}
const authorize=(service,user,action,sections=[])=>service.authorize(request(user),{worldId:WORLD,action,sections});

test('G1B guest cannot read private content or trigger a draft read',async()=>{
 const {state,service}=setup();
 assert.deepEqual(await service.viewDraft(request('guest'),{worldId:WORLD}),{ok:false,code:'unauthenticated'});
 assert.equal(state.reads,0);
});
test('G1B reader, Firebase admin and forged JSON owner/role do not gain world rights',async()=>{
 const {state,service}=setup();
 for(const user of ['test-reader','test-admin']){
  const r=await service.viewDraft(request(user,{ownerUid:user,admin:true,role:'author',worldId:WORLD}),{worldId:WORLD});
  assert.deepEqual(r,{ok:false,code:'forbidden'});
  assert.equal(JSON.stringify(r).includes('AUTHOR_SECRET'),false);
 }
 assert.equal(state.reads,0);
});
test('G1B owner can read/edit/submit but not self-review or publish',async()=>{
 const {service}=setup();
 for(const action of ['read_draft','submit_draft'])assert.equal((await authorize(service,OWNER,action)).ok,true);
 assert.equal((await authorize(service,OWNER,'edit_draft',['story'])).ok,true);
 assert.equal((await authorize(service,OWNER,'review_submission')).ok,false);
 assert.equal((await authorize(service,OWNER,'publish')).ok,false);
});
test('G1B collaborators receive only their allowed section, never entire Story Bible',async()=>{
 const {service,member}=setup();member('test-editor');
 const r=await service.viewDraft(request('test-editor'),{worldId:WORLD});
 assert.deepEqual(Object.keys(r.content),['scenes']);
 assert.equal(JSON.stringify(r).includes('AUTHOR_SECRET'),false);
 assert.equal(Object.isFrozen(r.content.scenes[0]),true);
});
test('G1B collaborator edits are section-scoped and cannot submit',async()=>{
 const {service,member}=setup();member('test-editor');
 assert.equal((await authorize(service,'test-editor','edit_draft',['scenes'])).ok,true);
 for(const sections of [['story'],['scenes','story'],[],['ownerUid'],['*']])
  assert.equal((await authorize(service,'test-editor','edit_draft',sections)).ok,false);
 assert.equal((await authorize(service,'test-editor','submit_draft')).ok,false);
});
test('G1B roles do not cross worlds or UIDs',async()=>{
 const {service,member}=setup();
 const row=member('test-editor');row.worldId='world-other';
 assert.equal((await authorize(service,'test-editor','read_draft')).ok,false);
 row.worldId=WORLD;row.uid='test-other';
 assert.equal((await authorize(service,'test-editor','read_draft')).ok,false);
 assert.equal((await service.authorize(request(OWNER),{worldId:'world-other',action:'read_draft'})).ok,false);
});
test('G1B revoked, malformed and unknown memberships fail closed',async()=>{
 const {service,member}=setup();
 for(const patch of [{status:'revoked'},{roles:['owner']},{roles:['admin']},{roles:['collaborator','collaborator']},
  {editSections:['*']},{editSections:['ownerUid']}]){
  Object.assign(member('test-editor'),patch);
  assert.equal((await authorize(service,'test-editor','read_draft')).ok,false);
 }
});
test('G1B reviewers cannot edit drafts and publishers are not implicitly reviewers',async()=>{
 const {service,member,state}=setup();
 member('test-reviewer','reviewer',[]);member('test-publisher','publisher',[]);
 assert.equal((await authorize(service,'test-reviewer','read_draft')).ok,false);
 assert.equal((await authorize(service,'test-reviewer','edit_draft',['story'])).ok,false);
 state.world.draftState='submitted';
 assert.equal((await authorize(service,'test-reviewer','review_submission')).ok,true);
 assert.equal((await authorize(service,'test-publisher','review_submission')).ok,false);
});
test('G1B owner/former contributor/current collaborator cannot self-review even with reviewer role',async()=>{
 const {service,member,state}=setup();state.world.draftState='inReview';
 for(const user of [OWNER,'test-former-editor','test-editor']){
  const row=member(user,'reviewer',[]);
  if(user==='test-editor')row.roles.push('collaborator');
  assert.equal((await authorize(service,user,'review_submission')).ok,false);
 }
});
test('G1B submitted and approved revisions cannot be edited or submitted again',async()=>{
 const {service,state}=setup();
 for(const status of ['submitted','inReview','approved']){
  state.world.draftState=status;
  assert.equal((await authorize(service,OWNER,'edit_draft',['title'])).ok,false);
  assert.equal((await authorize(service,OWNER,'submit_draft')).ok,false);
 }
});
test('G1B invalid input and storage outages deny access without leaking adapter errors',async()=>{
 const {service}=setup({readWorld:async()=>{throw Error('PRIVATE_DB_ERROR');}});
 const r=await authorize(service,OWNER,'read_draft');
 assert.deepEqual(r,{ok:false,code:'authoring-unavailable'});
 for(const worldId of ['',WORLD+'/../private','__proto__'])
  assert.equal((await service.authorize(request(),{worldId,action:'read_draft'})).ok,false);
});
test('G1B auth verifier failures never fall back to client role',async()=>{
 const {service}=setup({verify:async()=>{throw Error('invalid token');}});
 assert.equal((await service.viewDraft(request(),{worldId:WORLD})).ok,false);
});
test('G1B snapshot is detached, deeply frozen, version-bound and not yet committed',async()=>{
 const {service,state}=setup();
 const before=structuredClone(state.draft);
 const r=await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1});
 assert.equal(r.ok,true);assert.equal(r.requiresAtomicCommit,true);
 assert.deepEqual(state.draft,before);assert.equal(state.world.draftState,'draft');
 assert.equal(r.snapshot.draftRevision,1);assert.equal(r.snapshot.submittedBy,OWNER);
 assert.equal(await verifySubmissionIntegrity(r.snapshot),true);
 assert.deepEqual(r.preconditions,{worldId:WORLD,ownerUid:OWNER,draftRevision:1,accessRevision:1,draftState:'draft'});
 state.draft.content.story.secretTruth='changed after snapshot';
 assert.equal(r.snapshot.content.story.secretTruth,'AUTHOR_SECRET');
 assert.throws(()=>{r.snapshot.content.story.secretTruth='mutate';},TypeError);
});
test('G1B canonical hashing ignores object key order and binds world/revision/submitter/time',async()=>{
 const a=setup(),b=setup();
 b.state.draft.content=Object.fromEntries(Object.entries(b.state.draft.content).reverse());
 const ra=await a.service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1});
 const rb=await b.service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1});
 assert.equal(ra.snapshot.snapshotHash,rb.snapshot.snapshotHash);
 for(const [field,value] of [['worldId','world-other'],['draftRevision',2],['submittedBy','test-attacker'],
  ['submittedAt',2000],['validatorVersion','different-validator']]){
  const forged=structuredClone(ra.snapshot);forged[field]=value;
  assert.equal(await verifySubmissionIntegrity(forged),false,field);
 }
});
test('G1B missing/failed validation cannot create a submission',async()=>{
 const missing=setup({validateContent:undefined});
 assert.equal((await missing.service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).code,'validator-unavailable');
 for(const verdict of [null,{readyForReview:true},{readyForReview:false,errors:[],validatorVersion:'test'},
  {readyForReview:true,errors:['missing asset'],validatorVersion:'test'},
  {readyForReview:true,errors:[],validatorVersion:''}]){
  const {service}=setup({validateContent:async()=>verdict});
  assert.equal((await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).ok,false);
 }
});
test('G1B a draft cannot provide its own validation, owner, rank approval or release status',async()=>{
 for(const key of ['validation','ownerUid','author','worldRank','officialWorldRank','status','releaseId','aiEnabled']){
  const {service,state}=setup();state.draft.content[key]='forged';
  const r=await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1});
  assert.equal(r.ok,false,key);
 }
});
test('G1B stale revisions, wrong-world drafts and inconsistent headers are rejected',async()=>{
 const {service,state}=setup();
 for(const value of [0,-1,1.5,true,'1',2])
  assert.equal((await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:value})).ok,false);
 state.draft.worldId='world-other';
 assert.equal((await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).ok,false);
 state.draft.worldId=WORLD;state.draft.revision=2;
 assert.equal((await service.viewDraft(request(),{worldId:WORLD})).ok,false);
});
test('G1B content changes during validation reject the previously prepared snapshot',async()=>{
 let fixture;
 fixture=setup({validateContent:async()=>{
  fixture.state.draft.content.title='edited concurrently';
  return {readyForReview:true,errors:[],validatorVersion:'test'};
 }});
 assert.equal((await fixture.service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).code,'revision-conflict');
});
test('G1B ownership transfer during validation prevents submission by prior owner',async()=>{
 let fixture;
 fixture=setup({validateContent:async()=>{
  fixture.state.world.ownerUid='test-new-owner';fixture.state.world.accessRevision++;
  return {readyForReview:true,errors:[],validatorVersion:'test'};
 }});
 assert.equal((await fixture.service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).ok,false);
});
test('G1B revision/access changes during validation require retry',async()=>{
 for(const field of ['draftRevision','accessRevision']){
  let fixture;
  fixture=setup({validateContent:async()=>{
   fixture.state.world[field]++;
   return {readyForReview:true,errors:[],validatorVersion:'test'};
  }});
  assert.equal((await fixture.service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).ok,false);
 }
});
test('G1B revoked collaborator rights during draft reads leak no content',async()=>{
 const fixture=setup();fixture.member('test-editor');
 const service=createAuthoringService({...fixture.adapters,readDraft:async()=>{
  fixture.state.members.get(WORLD+':test-editor').status='revoked';return fixture.state.draft;
 }});
 const r=await service.viewDraft(request('test-editor'),{worldId:WORLD});
 assert.equal(r.ok,false);assert.equal('content' in r,false);
});
test('G1B changed UID or section scope during draft reads cannot return the prior projection',async()=>{
 const fixture=setup();fixture.member('test-editor');
 let calls=0;
 const switched=createAuthoringService({...fixture.adapters,verify:async()=>({uid:++calls===1?OWNER:'test-editor'})});
 assert.equal((await switched.viewDraft(request(),{worldId:WORLD})).ok,false);
 const scopes=createAuthoringService({...fixture.adapters,readDraft:async()=>{
  fixture.state.members.get(WORLD+':test-editor').editSections=[];return fixture.state.draft;
 }});
 assert.equal((await scopes.viewDraft(request('test-editor'),{worldId:WORLD})).ok,false);
});
test('G1B non-JSON content, getters, prototype keys and oversized data cannot enter snapshots',async()=>{
 let getterCalls=0;
 const malicious=[NaN,Infinity,()=>true,BigInt(1),new Date(),JSON.parse('{"__proto__":{}}')];
 const accessor={};Object.defineProperty(accessor,'text',{enumerable:true,get(){getterCalls++;return 'bad';}});
 malicious.push(accessor);
 const cyclic={};cyclic.self=cyclic;malicious.push(cyclic,'x'.repeat(2*1024*1024+1));
 for(const value of malicious){
  const {service,state}=setup();state.draft.content.story=value;
  assert.equal((await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).ok,false);
 }
 assert.equal(getterCalls,0);
});
test('G1B validators cannot mutate frozen author content',async()=>{
 const {service,state}=setup({validateContent:async content=>{
  content.story.secretTruth='mutated';return {readyForReview:true,errors:[],validatorVersion:'bad'};
 }});
 assert.equal((await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).ok,false);
 assert.equal(state.draft.content.story.secretTruth,'AUTHOR_SECRET');
});
test('G1B invalid snapshot envelopes and modified payloads fail integrity checks',async()=>{
 const {submit}=setup();const s=await submit();
 for(const input of [null,{}, {...s,content:{title:'tampered'}},{...s,canPublish:true},{...s,snapshotHash:'x'}])
  assert.equal(await verifySubmissionIntegrity(input),false);
});
test('G1B reviewer reads a stored immutable snapshot, never a client-supplied source',async()=>{
 const {service,member,submit}=setup();const s=await submit();member('test-reviewer','reviewer',[]);
 const r=await service.viewSubmission(request('test-reviewer',{snapshot:{content:'forged'}}),
  {worldId:WORLD,snapshotHash:s.snapshotHash,forReview:true});
 assert.equal(r.ok,true);assert.equal(r.snapshot.content.story.secretTruth,'AUTHOR_SECRET');
 assert.equal(r.snapshot.snapshotHash,s.snapshotHash);
});
test('G1B snapshot disclosure follows permissions and collaborator section scopes',async()=>{
 const {service,member,submit}=setup();const s=await submit();member('test-editor');
 const args={worldId:WORLD,snapshotHash:s.snapshotHash};
 const r=await service.viewSubmission(request('test-editor'),args);
 assert.deepEqual(Object.keys(r.content),['scenes']);
 assert.equal(JSON.stringify(r).includes('AUTHOR_SECRET'),false);
 for(const user of ['test-reader','test-admin','guest'])assert.equal((await service.viewSubmission(request(user),args)).ok,false);
});
test('G1B a changed/stale submission cannot be reviewed as the current revision',async()=>{
 const {service,state,member,submit}=setup();const s=await submit();member('test-reviewer','reviewer',[]);
 state.world.draftRevision=2;
 assert.equal((await service.viewSubmission(request('test-reviewer'),
  {worldId:WORLD,snapshotHash:s.snapshotHash,forReview:true})).code,'revision-conflict');
});
test('G1B wrong-world or corrupted stored snapshots cannot be opened',async()=>{
 const {service,state,submit}=setup();const s=await submit();
 state.snapshots.get(WORLD+':'+s.snapshotHash).content.title='corrupted';
 assert.equal((await service.viewSubmission(request(),{worldId:WORLD,snapshotHash:s.snapshotHash})).code,'invalid-submission');
});
test('G1B review privilege revoked while loading a snapshot is enforced before returning content',async()=>{
 const fixture=setup();const s=await fixture.submit();fixture.member('test-reviewer','reviewer',[]);
 const service=createAuthoringService({...fixture.adapters,readSubmission:async()=>{
  fixture.state.members.get(WORLD+':test-reviewer').status='revoked';return s;
 }});
 const r=await service.viewSubmission(request('test-reviewer'),{worldId:WORLD,snapshotHash:s.snapshotHash,forReview:true});
 assert.equal(r.ok,false);assert.equal('snapshot' in r,false);
});
test('G1B genuine signed Firebase JWT binds authoring access to subject and project',async()=>{
 const pair=await generateKeyPair('RS256');const key=await exportJWK(pair.publicKey);
 key.kid='test-authoring-key';key.use='sig';
 const jwks=createLocalJWKSet({keys:[key]});
 const fixture=setup({verify:(req,project)=>verifyFirebaseIdToken(req,project,jwks)});
 async function token(sub,admin=false,aud='truyendienvl'){
  const now=Math.floor(Date.now()/1000);
  return new SignJWT({auth_time:now,admin}).setProtectedHeader({alg:'RS256',kid:key.kid})
   .setSubject(sub).setAudience(aud).setIssuer('https://securetoken.google.com/truyendienvl')
   .setIssuedAt(now).setExpirationTime(now+3600).sign(pair.privateKey);
 }
 const access=jwt=>fixture.service.viewDraft(request(jwt),{worldId:WORLD});
 assert.equal((await access(await token(OWNER))).ok,true);
 assert.equal((await access(await token('test-reader',true))).ok,false);
 assert.equal((await access(await token(OWNER,false,'wrong-project'))).code,'unauthenticated');
});

test('G1B actual edit keys determine collaborator rights, not claimed sections',async()=>{
 const {service,member}=setup();member('test-editor');
 const r=await service.prepareDraftEdit(request('test-editor'),{worldId:WORLD,expectedRevision:1,
  sections:['scenes'],patch:{story:{secretTruth:'forged'}}});
 assert.equal(r.ok,false);
});
test('G1B prepared edits are detached new revisions and retain unedited sections',async()=>{
 const {service,member,state}=setup();member('test-editor');
 const before=structuredClone(state.draft);
 const r=await service.prepareDraftEdit(request('test-editor'),{worldId:WORLD,expectedRevision:1,
  patch:{scenes:[{sceneId:'scene-new'}]}});
 assert.equal(r.ok,true);assert.equal(r.requiresAtomicCommit,true);
 assert.equal(r.nextDraft.revision,2);assert.equal(r.nextDraft.state,'draft');
 assert.equal(r.nextDraft.content.story.secretTruth,'AUTHOR_SECRET');
 assert.deepEqual(r.nextWorldHeader.contributorUids,['test-editor','test-former-editor']);
 assert.deepEqual(state.draft,before);assert.equal(state.world.draftRevision,1);
 assert.equal(Object.isFrozen(r.nextDraft.content.scenes[0]),true);
});
test('G1B incomplete drafts can be prepared for saving without a fake submit validation',async()=>{
 const {service}=setup({validateContent:undefined});
 const r=await service.prepareDraftEdit(request(),{worldId:WORLD,expectedRevision:1,patch:{story:{}}});
 assert.equal(r.ok,true);assert.deepEqual(r.nextDraft.content.story,{});
 assert.equal((await service.prepareSubmission(request(),{worldId:WORLD,expectedRevision:1})).code,'validator-unavailable');
});
test('G1B edits cannot replace server ownership, lifecycle, revision or official rank',async()=>{
 const {service}=setup();
 for(const key of ['ownerUid','status','revision','worldId','officialWorldRank','accessRevision'])
  assert.equal((await service.prepareDraftEdit(request(),{worldId:WORLD,expectedRevision:1,
   patch:{[key]:'forged'}})).ok,false,key);
 assert.equal((await service.prepareDraftEdit(request(),{worldId:WORLD,expectedRevision:1,patch:{}})).ok,false);
});
test('G1B stale/locked edit plans and revision overflow are rejected',async()=>{
 const {service,state}=setup();
 for(const n of [2,0,true,Number.MAX_SAFE_INTEGER])
  assert.equal((await service.prepareDraftEdit(request(),{worldId:WORLD,expectedRevision:n,patch:{title:'test'}})).ok,false);
 state.world.draftState='submitted';state.draft.state='submitted';
 assert.equal((await service.prepareDraftEdit(request(),{worldId:WORLD,expectedRevision:1,patch:{title:'test'}})).ok,false);
});
test('G1B a new contributor remains unable to self-review after leaving collaboration',async()=>{
 const {service,member,state,submit}=setup();member('test-editor');
 const r=await service.prepareDraftEdit(request('test-editor'),{worldId:WORLD,expectedRevision:1,
  patch:{scenes:[]}});
 // Simulated commit of the returned plans (the real adapter is not built yet).
 Object.assign(state.world,r.nextWorldHeader);
 state.draft=structuredClone(r.nextDraft);
 member('test-editor','reviewer',[]);
 state.world.draftState='submitted';state.draft.state='submitted';
 assert.equal((await authorize(service,'test-editor','review_submission')).ok,false);
});
