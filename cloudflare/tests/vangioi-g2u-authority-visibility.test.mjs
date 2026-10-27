import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertG2UEmulator,createG2UAuthorityFreshnessAudit,
 createG2UEmulatorSuspender,G2U_HOST,G2U_PROJECT}
 from '../src/vangioi-v49-authority-visibility-g2u.mjs';

const digest='sha256-'+'e'.repeat(64);
const head={projectId:G2U_PROJECT,head:7,digest};
const projected={projectId:G2U_PROJECT,checkpoint:7,digest,observedAt:100000};
const verifyOperator=async request=>request?.operator===true?
 {uid:'fixture-operator',operator:true}:null;
const audit=(source=()=>head,replica=()=>projected,clock=()=>101000)=>
 createG2UAuthorityFreshnessAudit({verifyOperator,readAuthorityHead:source,
  readProjectedAuthority:replica,now:clock});

test('G2U only reports an observation, never a publish grant',async()=>{
 assert.deepEqual(await audit()({operator:true}),{
  ok:true,checkpoint:7,observedAt:100000,fixtureAuditOnly:true,
  canPublish:false,preventsUnobservedRace:false,sqliteFirestoreAtomic:false});
});

for(const [label,replica,result] of [
 ['checkpoint lag',{checkpoint:6},'checkpoint-lag'],
 ['checkpoint ahead',{checkpoint:8},'checkpoint-ahead'],
 ['same checkpoint different digest',{digest:'sha256-'+'f'.repeat(64)},'projection-mismatch'],
 ['malformed digest',{digest:'not-a-hash'},'projection-invalid'],
 ['projection from other project',{projectId:'other'},'projection-invalid'],
 ['future projection timestamp',{observedAt:102000},'projection-stale']
 ]){
 test('G2U freshness fails closed on '+label,async()=>{
  const got=await audit(()=>head,()=>({...projected,...replica}))({operator:true});
  assert.deepEqual(got,{ok:false,code:result});
 });
}

test('G2U rejects stale observation and a head changing during projection read',async()=>{
 assert.deepEqual(await audit(()=>head,()=>projected,()=>170001)({operator:true}),
  {ok:false,code:'projection-stale'});
 let reads=0;
 const changed=await audit(()=>({...head,head:++reads===1?7:8}))({operator:true});
 assert.deepEqual(changed,{ok:false,code:'authority-changed'});
});

test('G2U rejects unverified operator, reader failure, invalid host',async()=>{
 assert.deepEqual(await audit()({operator:false}),{ok:false,code:'forbidden'});
 assert.deepEqual(await audit(()=>{throw Error('sql offline');})({operator:true}),
  {ok:false,code:'authority-audit-unavailable'});
 assert.deepEqual(assertG2UEmulator({emulatorHost:G2U_HOST,projectId:G2U_PROJECT}),
  {projectId:G2U_PROJECT,emulatorHost:G2U_HOST,emulatorOnly:true});
 for(const args of [
  {emulatorHost:'127.0.0.1:80',projectId:G2U_PROJECT},
  {emulatorHost:G2U_HOST,projectId:'truyendienvl'},
  {emulatorHost:G2U_HOST,projectId:G2U_PROJECT,credentialPath:'secret.json'},
  {emulatorHost:G2U_HOST,projectId:G2U_PROJECT,activeProjectId:'real'}
 ])assert.throws(()=>assertG2UEmulator(args),/refuses/);
});

test('G2U suspender requires server-verified role and valid bounded command',async()=>{
 const db={projectId:G2U_PROJECT,collection:()=>({}),runTransaction:async()=>{throw Error('unexpected-tx');}};
 assert.throws(()=>createG2UEmulatorSuspender({firestore:db,
  emulatorHost:G2U_HOST}),/trusted emulator suspension host/);
 const suspender=createG2UEmulatorSuspender({firestore:db,
  emulatorHost:G2U_HOST,verifyOperator});
 const command={storyId:'epub-g2u-1',expectedEpoch:2,
  expectedAuthorityRevision:3,expectedNoticeRevision:1,
  operationId:'123e4567-e89b-42d3-a456-426614174000'};
 await assert.rejects(suspender.rehearseSuspend({operator:false},command),
  /operator-required/);
 await assert.rejects(suspender.rehearseSuspend({operator:true},
  {...command,expectedNoticeRevision:0}),/invalid-command/);
});

test('G2U is isolated from production Rules, EPUB and Worker routing',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(read('../../tools/vangioi/firebase-emulator-g2u.json')),
  {emulators:{firestore:{host:'127.0.0.1',port:18087}}});
 assert.equal('firestore' in JSON.parse(read('../../firebase.json')),false);
 const manual=read('./manual/vangioi-g2u-takedown-emulator.mjs');
 for(const part of ['G2U_PROJECT','G2U_HOST','guest-public-after-suspend-denied',
  'notice-revoked-after-publication','concurrent-suspension-exactly-one',
  'sqliteFreshnessNotTransactional:true'])
  assert.ok(manual.includes(part),part);
 for(const path of ['../src/index.mjs','../../js/epub-production-v49.js',
  '../../security/firestore-epub-v49.rules.review'])
  assert.equal(read(path).includes('vangioi-g2u'),false);
});
