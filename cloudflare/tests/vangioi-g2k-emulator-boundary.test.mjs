import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createV49TransactionFixture} from './fixtures/vangioi-firestore-v49.mjs';
import {createG2KEmulatorSourceRehearsal,assertG2KLocalEmulator,
 G2K_EMULATOR_PROJECT} from '../src/vangioi-g2k-emulator-boundary.mjs';

const OP='test-operator',RECIPIENT='fake-recipient';
const request=uid=>new Request('https://fixture.invalid',{headers:{Authorization:'Bearer '+uid}});
const input=storyId=>({requestId:crypto.randomUUID(),storyId,authorizedUid:RECIPIENT});
const fixture=(f=createV49TransactionFixture())=>{
 const stats={permits:0,verified:0,operators:0};
 const callbacks={
  verify:async req=>{stats.verified++;const uid=req.headers.get('Authorization')?.slice(7);return uid?{uid,admin:true}:null;},
  isOperator:async uid=>{stats.operators++;return uid===OP;},
  readAdaptationPermit:async({storyId,contentHash})=>{stats.permits++;return {ok:true,permit:{
   storyId,contentHash,authorizedUid:RECIPIENT,status:'active',revision:1,
   license:'original',sourceNote:'Synthetic operator checked',proofRef:null}};}
 };
 const settings={firestore:{...f.firestore,projectId:G2K_EMULATOR_PROJECT},
  emulatorHost:'127.0.0.1:18081',...callbacks};
 return {f,stats,callbacks,settings,probe:()=>createG2KEmulatorSourceRehearsal(settings)};
};

test('G2K hard-codes only a loopback emulator and demo project',()=>{
 const safe=assertG2KLocalEmulator({emulatorHost:'127.0.0.1:18081',firestoreProjectId:G2K_EMULATOR_PROJECT});
 assert.equal(safe.environment,'emulator');assert.equal(safe.projectId,G2K_EMULATOR_PROJECT);
 assert.equal(Object.isFrozen(safe),true);
 assert.equal(assertG2KLocalEmulator({emulatorHost:'localhost:18081',
  firestoreProjectId:G2K_EMULATOR_PROJECT}).environment,'emulator');
});

test('G2K refuses remote host, wrong port, and any non-demo Firebase project',()=>{
 for(const target of [
  {emulatorHost:'firestore.googleapis.com:443'},
  {emulatorHost:'127.0.0.1:8080'},
  {emulatorHost:'0.0.0.0:18081'},
  {emulatorHost:'localhost:18081',firestoreProjectId:'production-firebase'},
  {emulatorHost:'localhost:18081',activeProjectId:'production-firebase'},
  {emulatorHost:'localhost:18081',credentialPath:'/tmp/service-account.json'},
  {emulatorHost:'localhost:18081',credentialPath:'./key.json'},
  {emulatorHost:'localhost:18081',firestoreProjectId:null}
 ])assert.throws(()=>assertG2KLocalEmulator({emulatorHost:'127.0.0.1:18081',
  firestoreProjectId:G2K_EMULATOR_PROJECT,...target}),/G2K refuses/);
});

test('G2K constructor stops wrong SDK project before any Firestore reads',()=>{
 const x=fixture();assert.throws(()=>createG2KEmulatorSourceRehearsal({...x.settings,
  firestore:{...x.settings.firestore,projectId:'real-project'}}),/G2K refuses/);
 assert.equal(x.f.stats.transactions,0);
});

test('G2K unassigned author with forged admin claim cannot trigger any source read',async()=>{
 const x=fixture(),probe=x.probe();
 assert.deepEqual(await probe.prepare(request('fake-author'),input(x.f.storyId)),{ok:false,code:'forbidden'});
 assert.equal(x.f.stats.transactions,0);assert.equal(x.stats.permits,0);
});

test('G2K unauthenticated access fails before touching V49',async()=>{
 const x=fixture(),probe=x.probe();
 assert.deepEqual(await probe.prepare(request(''),input(x.f.storyId)),{ok:false,code:'unauthenticated'});
 assert.equal(x.f.stats.transactions,0);
});

test('G2K trusted synthetic operator reads one coherent pinned source but cannot auto-register',async()=>{
 const x=fixture(),probe=x.probe();
 const r=await probe.prepare(request(OP),input(x.f.storyId));
 assert.equal(r.ok,true);assert.equal(x.f.stats.transactions,2);assert.equal(x.stats.permits,2);
 assert.equal(r.reference.kind,'library');assert.match(r.reference.storyVersion,/^sha256-[0-9a-f]{64}$/);
 assert.equal(r.registryInput.payload.chapters[0].text,'PRIVATE_FIRST');
 for(const key of ['published','canPublish','worldId','grant','session','rewardsEnabled'])
  assert.equal(Object.hasOwn(r,key),false);
});

test('G2K client-supplied permit fields cannot replace the trusted SQL callback',async()=>{
 const x=fixture();x.f.patch(x.f.bookPath,{admin:true,permit:{status:'active',authorizedUid:RECIPIENT}});
 x.settings.readAdaptationPermit=async()=>({ok:false,code:'permit-revoked'});
 assert.deepEqual(await x.probe().prepare(request(OP),input(x.f.storyId)),
  {ok:false,code:'library-source-unavailable'});
});

test('G2K permit issued to another recipient does not authorize adaptation',async()=>{
 const x=fixture();x.settings.readAdaptationPermit=async({storyId,contentHash})=>({ok:true,
  permit:{storyId,contentHash,authorizedUid:'foreign-uid',status:'active',revision:1,
   license:'original',sourceNote:'Synthetic',proofRef:null}});
 assert.equal((await x.probe().prepare(request(OP),input(x.f.storyId))).ok,false);
});

test('G2K a changed source hash cannot reuse a stale adaptation permit',async()=>{
 const x=fixture();let oldHash;
 x.settings.readAdaptationPermit=async({storyId,contentHash})=>({ok:true,permit:{
  storyId,contentHash:oldHash??(oldHash=contentHash),authorizedUid:RECIPIENT,
  status:'active',revision:1,license:'original',sourceNote:'Synthetic',proofRef:null}});
 const probe=x.probe();assert.equal((await probe.prepare(request(OP),input(x.f.storyId))).ok,true);
 x.f.patch(x.f.paths[0],{content:'NEW_CONTENT'});
 assert.equal((await probe.prepare(request(OP),input(x.f.storyId))).ok,false);
});

test('G2K a source edit between read-only transactions fails closed',async()=>{
 const x=fixture();x.f.stats.onRead=({count})=>{
  if(count===3)x.f.patch(x.f.paths[0],{content:'LATE_CHANGE'});
 };
 assert.equal((await x.probe().prepare(request(OP),input(x.f.storyId))).code,'source-conflict');
});

test('G2K callbacks must be trusted and invalid request cannot read source',async()=>{
 const x=fixture();assert.throws(()=>createG2KEmulatorSourceRehearsal({...x.settings,isOperator:null}),/trusted synthetic/);
 assert.equal((await x.probe().prepare(request(OP),{...input(x.f.storyId),permitStatus:'active'})).code,'invalid-request');
 assert.equal(x.f.stats.transactions,0);
});

test('G2K cannot be imported by Worker/HTTP and leaves production Firebase config/Rules unchanged',()=>{
 for(const file of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
  assert.equal(readFileSync(new URL(file,import.meta.url),'utf8').includes('vangioi-g2k-emulator-boundary'),false);
 const firebase=JSON.parse(readFileSync(new URL('../../firebase.json',import.meta.url)));
 assert.equal('firestore' in firebase,false);
 const config=JSON.parse(readFileSync(new URL('../../tools/vangioi/firebase-emulator-g2k.json',import.meta.url)));
 assert.deepEqual(config,{emulators:{firestore:{host:'127.0.0.1',port:18081}}});
});
