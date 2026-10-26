import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqlRegistryService} from '../src/vangioi-registry.mjs';
import {createSqlAuthoringService} from '../src/vangioi-authoring-sql.mjs';
import {createSqlProvisioningService} from '../src/vangioi-provisioning.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {createV49StagingSnapshotReader} from '../src/vangioi-v49-staging-source.mjs';
import {createLibrarySourcePreparer} from '../src/vangioi-library-source.mjs';
import {createV49FirestoreTransactionReader} from '../src/vangioi-v49-firestore-reader.mjs';
import {createPermitReplayRehearsal} from '../src/vangioi-permit-replay.mjs';
import {createV49PrecommitRecheck} from '../src/vangioi-library-precommit.mjs';
import {createV49TransactionFixture} from './fixtures/vangioi-firestore-v49.mjs';
import {content} from './fixtures/vangioi-content.mjs';

const OWNER='registry-owner',OP='registry-operator',OTHER='registry-other';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgkjP6DwAB6gFaZRSBGgAAAABJRU5ErkJggg==';
const req=(user=OWNER)=>new Request('https://unit.test',{headers:{Authorization:'Bearer '+user}});
const sourceInput=()=>({requestId:crypto.randomUUID(),kind:'library',storyId:'story-sample',storyVersion:'v1',
 authorizedUid:OWNER,license:'original',sourceNote:'Operator checked source custody',proofRef:null,
 payload:{format:'story-source-1',title:'Source title',chapters:[{chapterId:'ch-one',title:'Chapter one',text:'PRIVATE_SOURCE_TEXT'}]}});
const assetInput=(kind='sceneBackground',assetId='art-room')=>({requestId:crypto.randomUUID(),assetId,assetVersion:'v1',kind,
 authorizedUid:OWNER,license:'original',sourceNote:'Operator recorded original image',proofRef:null,pngBase64:PNG});
function setup(path=':memory:'){
 const db=new DatabaseSync(path),hooks={before:null,fail:null,count:0};
 const sql={exec(q,...args){
  // Cloudflare SQL binds/returns ArrayBuffer for BLOB; Node SQLite uses views.
  args=args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v);
  let rows=[];
  if(q.trim().startsWith('CREATE '))db.exec(q);
  else{const stmt=db.prepare(q);if(/^\s*(SELECT|WITH)\b|\bRETURNING\b/i.test(q))rows=stmt.all(...args);else stmt.run(...args);}
  if(hooks.fail&&q.includes(hooks.fail)){hooks.fail=null;throw Error('PRIVATE_STORAGE_ERROR');}
  return {toArray:()=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>
   [k,v instanceof Uint8Array?v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength):v])))};
 }};
 const storage={sql,transactionSync(fn){
  hooks.count++;hooks.before?.(hooks.count);db.exec('BEGIN IMMEDIATE');
  try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const options={storage,projectId:'truyendienvl',now:()=>1000,verify:async r=>{
  const user=r.headers.get('Authorization')?.slice(7);return !user||user==='guest'?null:{uid:user,admin:true};
 }};
 const registry=createSqlRegistryService(options),authoring=createSqlAuthoringService(options),provision=createSqlProvisioningService(options);
 const rows=(q,...args)=>sql.exec(q,...args).toArray();
 const operator=()=>sql.exec("INSERT OR REPLACE INTO vg_authoring_registry_operators_v1 VALUES(?,'active')",OP);
 const world=async(user=OWNER)=>{
  sql.exec("INSERT OR REPLACE INTO vg_authoring_entitlements_v1 VALUES(?,'active',1,1)",user);
  return provision.createWorld(req(user),{requestId:crypto.randomUUID(),content:{}});
 };
 const grant=(w,reference,overrides={})=>({worldId:w.worldId,requestId:crypto.randomUUID(),expectedAccessRevision:1,
  expectedGrantRevision:0,reference,status:'active',...overrides});
 const counts=()=>Object.fromEntries(['source_versions','asset_versions','registry_objects','registry_payloads','registry_operations','registry_events']
  .map(t=>[t,rows(`SELECT count(*) n FROM vg_authoring_${t}_v1`)[0].n]));
 return {db,sql,storage,hooks,options,rows,registry,authoring,provision,operator,world,grant,counts,close:()=>db.close()};
}
async function complete(f){
 f.operator();const w=await f.world();const s=await f.registry.registerSource(req(OP),sourceInput());assert.equal(s.ok,true);
 const cover=await f.registry.registerAsset(req(OP),assetInput('worldCover','art-cover'));
 const room=await f.registry.registerAsset(req(OP),assetInput());assert.equal(room.ok,true);assert.equal(cover.ok,true);
 await f.registry.setSourceGrant(req(),f.grant(w,s.reference));
 for(const a of [cover,room])assert.equal((await f.registry.setAssetGrant(req(),f.grant(w,a.reference))).ok,true);
 const c=content();c.storySource=s.reference;c.assets=c.assets.map(a=>({...a,...(a.assetId==='art-cover'?cover:room).reference}));
 assert.equal((await f.authoring.saveDraft(req(),{worldId:w.worldId,requestId:crypto.randomUUID(),expectedRevision:1,patch:c})).ok,true);
 return {w,s,cover,room,c,submit:()=>f.authoring.submitDraft(req(),{worldId:w.worldId,requestId:crypto.randomUUID(),expectedRevision:2})};
}

test('G1F source intake computes canonical content hash and preserves private bytes, not a supplied hash',async()=>{
 const f=setup();try{
  f.operator();const data=sourceInput(),r=await f.registry.registerSource(req(OP),data);assert.equal(r.ok,true);
  assert.equal(r.reference.contentHash,await hashAuthoringJson(data.payload));
  const p=f.rows('SELECT * FROM vg_authoring_registry_payloads_v1')[0];assert.deepEqual(JSON.parse(new TextDecoder().decode(p.payload)),data.payload);
  assert.equal(p.media_type,'application/vnd.dudu.story-source+json');
  const leak=JSON.stringify({events:f.rows('SELECT * FROM vg_authoring_registry_events_v1'),ops:f.rows('SELECT * FROM vg_authoring_registry_operations_v1')});
  assert.equal(leak.includes('PRIVATE_SOURCE_TEXT'),false);
 }finally{f.close();}
});
test('G1F PNG intake hashes actual bytes, stores dimensions and never supplies approval',async()=>{
 const f=setup();try{
  f.operator();const a=await f.registry.registerAsset(req(OP),assetInput());assert.equal(a.ok,true);
  const expected=[...new Uint8Array(await crypto.subtle.digest('SHA-256',Buffer.from(PNG,'base64')))].map(b=>b.toString(16).padStart(2,'0')).join('');
  assert.equal(a.reference.contentHash,expected);
  const p=f.rows('SELECT * FROM vg_authoring_registry_payloads_v1')[0];assert.equal(p.width,1);assert.equal(p.height,1);assert.equal(p.media_type,'image/png');
  assert.deepEqual(Buffer.from(p.payload),Buffer.from(PNG,'base64'));assert.equal('reviewStatus' in a,false);
 }finally{f.close();}
});
test('G1F owner/admin/guest claims cannot issue a registry version without operator assignment',async()=>{
 const f=setup();try{
  for(const actor of [OWNER,'guest','admin']){
   assert.equal((await f.registry.registerSource(req(actor),sourceInput())).ok,false);
   assert.equal((await f.registry.registerAsset(req(actor),assetInput())).ok,false);
  }assert.equal(f.counts().registry_objects,0);
 }finally{f.close();}
});
test('G1F import rejects self-declared approval/hash, missing license proof and malformed payloads',async()=>{
 const f=setup();try{
  f.operator();
  for(const patch of [{contentHash:'a'.repeat(64)},{reviewStatus:'approved'},{license:'unknown'},{license:'licensed'},
   {sourceNote:' '},{authorizedUid:''},{payload:{format:'story-source-1',title:'T',chapters:[]}},
   {payload:{format:'story-source-1',title:'T',chapters:[{chapterId:'a',title:'A',text:' '}]}},
   {payload:{format:'story-source-1',title:'T',chapters:[{chapterId:'a',title:'A',text:'text'},{chapterId:'a',title:'B',text:'text'}]}}])
   assert.equal((await f.registry.registerSource(req(OP),{...sourceInput(),...patch})).ok,false);
  for(const patch of [{reviewStatus:'approved'},{kind:'genreArtwork'},{license:'licensed'},{assetVersion:''}])
   assert.equal((await f.registry.registerAsset(req(OP),{...assetInput(),...patch})).ok,false);
  assert.equal(f.counts().registry_objects,0);
 }finally{f.close();}
});
test('G1F registered asset kinds match the content schema exactly',async()=>{
 const schema=JSON.parse(readFileSync(new URL('../../contracts/vangioi/world-content-1.schema.json',import.meta.url)));
 const f=setup();try{
  f.operator();
  for(const [i,kind] of schema.$defs.asset.properties.kind.enum.entries())
   assert.equal((await f.registry.registerAsset(req(OP),assetInput(kind,'art-kind-'+i))).ok,true,kind);
 }finally{f.close();}
});
test('G1F intake rejects non-PNG, invalid base64, damaged CRC, truncation and oversized data',async()=>{
 const f=setup();try{
  f.operator();const damaged=Buffer.from(PNG,'base64');damaged[20]^=1;
  for(const pngBase64 of ['',PNG+'\n','https://example.test/a.png','PHN2Zz48L3N2Zz4=',
   damaged.toString('base64'),Buffer.from(PNG,'base64').subarray(0,40).toString('base64'),'A'.repeat(1400004)])
   assert.equal((await f.registry.registerAsset(req(OP),{...assetInput(),pngBase64})).ok,false);
  assert.equal(f.counts().asset_versions,0);
 }finally{f.close();}
});
test('G1F same request retries return receipt; reuse with changed payload conflicts',async()=>{
 const f=setup();try{
  f.operator();const d=sourceInput();assert.equal((await f.registry.registerSource(req(OP),d)).ok,true);
  assert.equal((await f.registry.registerSource(req(OP),d)).replayed,true);
  assert.equal((await f.registry.registerSource(req(OP),{...d,sourceNote:'changed'})).code,'idempotency-conflict');
  assert.equal(f.counts().source_versions,1);assert.equal(f.counts().registry_events,1);
 }finally{f.close();}
});
test('G1F concurrent identical intake stores one immutable payload and receipt',async()=>{
 const f=setup();try{
  f.operator();const d=assetInput();const rs=await Promise.all([f.registry.registerAsset(req(OP),d),f.registry.registerAsset(req(OP),d)]);
  assert.equal(rs.every(r=>r.ok),true);assert.equal(rs.filter(r=>r.replayed).length,1);assert.equal(f.counts().asset_versions,1);
 }finally{f.close();}
});
test('G1F another request cannot replace bytes, kind or licensed recipient under the same version',async()=>{
 const f=setup();try{
  f.operator();await f.registry.registerAsset(req(OP),assetInput());
  for(const patch of [{kind:'worldCover'},{authorizedUid:OTHER},{sourceNote:'new rights'}])
   assert.equal((await f.registry.registerAsset(req(OP),{...assetInput(),...patch})).code,'version-conflict');
  assert.equal(f.counts().registry_payloads,1);
 }finally{f.close();}
});
test('G1F previously seeded version cannot be silently adopted as trusted intake',async()=>{
 const f=setup();try{
  f.operator();f.sql.exec('INSERT INTO vg_authoring_source_versions_v1 VALUES(?,?,?,?)','library','story-sample','v1','a'.repeat(64));
  assert.equal((await f.registry.registerSource(req(OP),sourceInput())).code,'version-conflict');assert.equal(f.counts().registry_objects,0);
 }finally{f.close();}
});
test('G1F world ownership alone does not grant use of another account source or asset',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(OTHER),s=await f.registry.registerSource(req(OP),sourceInput()),a=await f.registry.registerAsset(req(OP),assetInput());
  assert.equal((await f.registry.setSourceGrant(req(OTHER),f.grant(w,s.reference))).code,'forbidden');
  assert.equal((await f.registry.setAssetGrant(req(OTHER),f.grant(w,a.reference))).code,'forbidden');
 }finally{f.close();}
});
test('G1F operator cannot attach content to another owner world; collaborator cannot grant itself use',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput());
  for(const actor of [OP,OTHER,'guest'])assert.equal((await f.registry.setSourceGrant(req(actor),f.grant(w,s.reference))).ok,false);
 }finally{f.close();}
});
test('G1F rights are scoped per world and require exact pinned version/hash/kind',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput());
  for(const patch of [{contentHash:'f'.repeat(64)},{storyVersion:'v2'},{kind:'original'}])
   assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,{...s.reference,...patch}))).ok,false);
  assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,s.reference))).ok,true);
  const second=await f.world();assert.equal(f.rows('SELECT * FROM vg_authoring_source_grants_v1 WHERE world_id=?',second.worldId).length,0);
 }finally{f.close();}
});
test('G1F real intake and per-world grants feed the default submit validator end to end',async()=>{
 const f=setup();try{
  const p=await complete(f);const r=await p.submit();assert.equal(r.ok,true);assert.equal(r.state,'submitted');
  const v=await f.authoring.viewSubmission(req(),{worldId:p.w.worldId,snapshotHash:r.snapshotHash});assert.equal(v.ok,true);
  assert.equal(v.snapshot.content.assets[0].contentHash,p.cover.reference.contentHash);
  assert.equal(f.rows('SELECT review_status FROM vg_authoring_asset_grants_v1').every(g=>g.review_status==='pending'),true);
  assert.equal('canPublish' in r,false);
 }finally{f.close();}
});
test('G1F grant replay is historical acknowledgement and never reactivates a revoked world grant',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput()),g=f.grant(w,s.reference);
  await f.registry.setSourceGrant(req(),g);
  await f.registry.setSourceGrant(req(),f.grant(w,s.reference,{expectedGrantRevision:1,status:'revoked'}));
  assert.equal((await f.registry.setSourceGrant(req(),g)).replayed,true);
  assert.equal(f.rows('SELECT status FROM vg_authoring_source_grants_v1')[0].status,'revoked');
 }finally{f.close();}
});
test('G1F conflicting concurrent grants cannot lose grant revisions',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput());
  const rs=await Promise.all([f.registry.setSourceGrant(req(),f.grant(w,s.reference)),f.registry.setSourceGrant(req(),f.grant(w,s.reference))]);
  assert.equal(rs.filter(r=>r.ok).length,1);assert.equal(rs.filter(r=>r.code==='revision-conflict').length,1);
 }finally{f.close();}
});
test('G1F grant revocation denies submit and regrant requires current grant revision',async()=>{
 const f=setup();try{
  const p=await complete(f);const g=f.grant(p.w,p.room.reference,{expectedGrantRevision:1,status:'revoked'});
  assert.equal((await f.registry.setAssetGrant(req(),g)).grantRevision,2);assert.equal((await p.submit()).ok,false);
  assert.equal((await f.registry.setAssetGrant(req(),f.grant(p.w,p.room.reference,{expectedGrantRevision:1}))).code,'revision-conflict');
  assert.equal((await f.registry.setAssetGrant(req(),f.grant(p.w,p.room.reference,{expectedGrantRevision:2}))).ok,true);
  assert.equal((await p.submit()).ok,true);
 }finally{f.close();}
});
test('G1F global version revocation reaches all worlds and cannot be undone by owner regrant',async()=>{
 const f=setup();try{
  const p=await complete(f),w2=await f.world();await f.registry.setAssetGrant(req(),f.grant(w2,p.room.reference));
  const d={requestId:crypto.randomUUID(),reference:p.room.reference,expectedAuthorityRevision:1};
  assert.equal((await f.registry.revokeAssetVersion(req(OP),d)).authorityRevision,2);
  assert.equal(f.rows('SELECT status FROM vg_authoring_asset_grants_v1 WHERE asset_id=?','art-room').every(g=>g.status==='revoked'),true);
  assert.equal((await f.registry.setAssetGrant(req(),f.grant(p.w,p.room.reference,{expectedGrantRevision:2}))).code,'forbidden');
  assert.equal((await p.submit()).ok,false);assert.equal((await f.registry.revokeAssetVersion(req(OP),d)).replayed,true);
 }finally{f.close();}
});
test('G1F source global revocation blocks new grants, retries and default submit',async()=>{
 const f=setup();try{
  const p=await complete(f);assert.equal((await f.registry.revokeSourceVersion(req(OP),{requestId:crypto.randomUUID(),reference:p.s.reference,expectedAuthorityRevision:1})).ok,true);
  assert.equal((await p.submit()).ok,false);
  assert.equal((await f.registry.setSourceGrant(req(),f.grant(p.w,p.s.reference,{expectedGrantRevision:2}))).code,'forbidden');
 }finally{f.close();}
});
test('G1F ordinary owner cannot globally revoke any source or asset version',async()=>{
 const f=setup();try{
  const p=await complete(f);
  for(const [method,reference] of [['revokeSourceVersion',p.s.reference],['revokeAssetVersion',p.room.reference]])
   assert.equal((await f.registry[method](req(),{requestId:crypto.randomUUID(),reference,expectedAuthorityRevision:1})).code,'forbidden');
 }finally{f.close();}
});
test('G1F operator revocation at transaction entry blocks intake, including receipt replay',async()=>{
 const f=setup();try{
  f.operator();const d=sourceInput();await f.registry.registerSource(req(OP),d);
  f.hooks.before=()=>{f.hooks.before=null;f.sql.exec("UPDATE vg_authoring_registry_operators_v1 SET status='revoked'");};
  assert.equal((await f.registry.registerSource(req(OP),d)).code,'forbidden');assert.equal(f.counts().registry_events,1);
 }finally{f.close();}
});
test('G1F owner/access revision or catalog revocation in final gap prevents grants',async()=>{
 for(const change of ["UPDATE vg_authoring_worlds_v1 SET owner_uid='changed-owner'",'UPDATE vg_authoring_worlds_v1 SET access_revision=2',
  "UPDATE vg_authoring_registry_objects_v1 SET status='revoked',authority_revision=2"]){
  const f=setup();try{
   f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput());
   f.hooks.before=()=>{f.hooks.before=null;f.sql.exec(change);};
   assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,s.reference))).ok,false);
   assert.equal(f.rows('SELECT * FROM vg_authoring_source_grants_v1').length,0);
  }finally{f.close();}
 }
});
test('G1F a registry grant change before submit commit is caught by dependency preconditions',async()=>{
 const f=setup();try{
  const p=await complete(f),target=f.hooks.count+2;
  f.hooks.before=n=>{if(n===target)f.sql.exec("UPDATE vg_authoring_source_grants_v1 SET status='revoked',grant_revision=2");};
  assert.equal((await p.submit()).code,'dependency-conflict');assert.equal(f.rows('SELECT * FROM vg_authoring_submissions_v1').length,0);
 }finally{f.close();}
});
test('G1F failed intake rolls back version, catalog, payload, receipt and event together',async()=>{
 for(const table of ['registry_objects','registry_payloads','registry_operations','registry_events']){
  const f=setup();try{
   f.operator();const d=sourceInput();f.hooks.fail='INSERT INTO vg_authoring_'+table;
   assert.deepEqual(await f.registry.registerSource(req(OP),d),{ok:false,code:'registry-unavailable'});
   assert.equal(Object.values(f.counts()).every(n=>n===0),true);assert.equal((await f.registry.registerSource(req(OP),d)).ok,true);
  }finally{f.close();}
 }
});
test('G1F failed grant audit rolls back grant and failed global revoke rolls back every world',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput()),g=f.grant(w,s.reference);
  f.hooks.fail='INSERT INTO vg_authoring_registry_events';assert.equal((await f.registry.setSourceGrant(req(),g)).ok,false);
  assert.equal(f.rows('SELECT * FROM vg_authoring_source_grants_v1').length,0);await f.registry.setSourceGrant(req(),g);
  f.hooks.fail='INSERT INTO vg_authoring_registry_events';
  const d={requestId:crypto.randomUUID(),reference:s.reference,expectedAuthorityRevision:1};
  assert.equal((await f.registry.revokeSourceVersion(req(OP),d)).ok,false);
  assert.equal(f.rows('SELECT status FROM vg_authoring_registry_objects_v1')[0].status,'active');
  assert.equal(f.rows('SELECT status FROM vg_authoring_source_grants_v1')[0].status,'active');
  assert.equal((await f.registry.revokeSourceVersion(req(OP),d)).ok,true);
 }finally{f.close();}
});
test('G1F payload and registry event/receipt rows reject UPDATE/DELETE',async()=>{
 const f=setup();try{
  f.operator();await f.registry.registerSource(req(OP),sourceInput());
  for(const [table,column] of [['registry_payloads','media_type'],['registry_operations','action'],['registry_events','action']]){
   assert.throws(()=>f.sql.exec(`DELETE FROM vg_authoring_${table}_v1`),/immutable-authoring-record/);
   assert.throws(()=>f.sql.exec(`UPDATE vg_authoring_${table}_v1 SET ${column}='tampered'`),/immutable-authoring-record/);
  }
 }finally{f.close();}
});
test('G1F reopen retains image bytes, grants, and receipts without duplicate registrations',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vg-registry-'));let f;
 try{
  const path=join(dir,'registry.sqlite');f=setup(path);f.operator();const d=assetInput(),a=await f.registry.registerAsset(req(OP),d);
  const w=await f.world(),g=f.grant(w,a.reference);await f.registry.setAssetGrant(req(),g);f.close();f=setup(path);
  assert.equal((await f.registry.registerAsset(req(OP),d)).replayed,true);assert.equal((await f.registry.setAssetGrant(req(),g)).replayed,true);
  assert.deepEqual(Buffer.from(f.rows('SELECT payload FROM vg_authoring_registry_payloads_v1')[0].payload),Buffer.from(PNG,'base64'));
 }finally{f?.close();rmSync(dir,{recursive:true,force:true});}
});
test('G1F malformed grant revisions and reference fields never create rights',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),s=await f.registry.registerSource(req(OP),sourceInput());
  for(const patch of [{expectedGrantRevision:true},{expectedGrantRevision:-1},{expectedGrantRevision:Number.MAX_SAFE_INTEGER},
   {expectedAccessRevision:0},{reference:{...s.reference,approved:true}},{status:'approved'},{ownerUid:OWNER}])
   assert.equal((await f.registry.setSourceGrant(req(),{...f.grant(w,s.reference),...patch})).ok,false);
  assert.equal(f.rows('SELECT * FROM vg_authoring_source_grants_v1').length,0);
 }finally{f.close();}
});

test('G1F private source/image readers require both current ownership and active world grants',async()=>{
 const f=setup();try{
  const p=await complete(f);
  const source=await f.registry.readSource(req(),{worldId:p.w.worldId,reference:p.s.reference});
  assert.equal(source.ok,true);assert.equal(source.payload.chapters[0].text,'PRIVATE_SOURCE_TEXT');
  const asset=await f.registry.readAsset(req(),{worldId:p.w.worldId,reference:p.room.reference});
  assert.equal(asset.ok,true);assert.deepEqual(Buffer.from(asset.bytes),Buffer.from(PNG,'base64'));
  for(const actor of [OP,OTHER,'guest']){
   assert.equal((await f.registry.readSource(req(actor),{worldId:p.w.worldId,reference:p.s.reference})).ok,false);
   assert.equal((await f.registry.readAsset(req(actor),{worldId:p.w.worldId,reference:p.room.reference})).ok,false);
  }
  const otherWorld=await f.world();
  assert.equal((await f.registry.readSource(req(),{worldId:otherWorld.worldId,reference:p.s.reference})).ok,false);
  assert.equal((await f.registry.readSource(req(),{worldId:p.w.worldId,reference:{...p.s.reference,contentHash:'c'.repeat(64)}})).ok,false);
 }finally{f.close();}
});
test('G1F private readers deny revoked grants and globally revoked versions',async()=>{
 const f=setup();try{
  const p=await complete(f);
  await f.registry.setSourceGrant(req(),f.grant(p.w,p.s.reference,{expectedGrantRevision:1,status:'revoked'}));
  assert.equal((await f.registry.readSource(req(),{worldId:p.w.worldId,reference:p.s.reference})).ok,false);
  await f.registry.revokeAssetVersion(req(OP),{requestId:crypto.randomUUID(),reference:p.room.reference,expectedAuthorityRevision:1});
  assert.equal((await f.registry.readAsset(req(),{worldId:p.w.worldId,reference:p.room.reference})).ok,false);
 }finally{f.close();}
});
test('G1F revocation after payload hashing starts cannot leak the private read result',async()=>{
 const f=setup();try{
  const p=await complete(f),target=f.hooks.count+2;
  f.hooks.before=n=>{if(n===target)f.sql.exec("UPDATE vg_authoring_source_grants_v1 SET status='revoked',grant_revision=2");};
  const r=await f.registry.readSource(req(),{worldId:p.w.worldId,reference:p.s.reference});
  assert.equal(r.ok,false);assert.equal(JSON.stringify(r).includes('PRIVATE_SOURCE_TEXT'),false);
 }finally{f.close();}
});
test('G1F payload corruption fails closed even when a disk was externally tampered',async()=>{
 const f=setup();try{
  const p=await complete(f);
  // Simulate out-of-band storage corruption, not an exposed service operation.
  f.db.exec('DROP TRIGGER vg_authoring_registry_payloads_update_v1');
  f.sql.exec("UPDATE vg_authoring_registry_payloads_v1 SET payload=? WHERE media_type='application/vnd.dudu.story-source+json'",Buffer.from('tampered'));
  assert.equal((await f.registry.readSource(req(),{worldId:p.w.worldId,reference:p.s.reference})).code,'payload-integrity-conflict');
 }finally{f.close();}
});
test('G1F intake retry after global revocation cannot resurrect an old version',async()=>{
 const f=setup();try{
  f.operator();const d=sourceInput(),s=await f.registry.registerSource(req(OP),d);
  await f.registry.revokeSourceVersion(req(OP),{requestId:crypto.randomUUID(),reference:s.reference,expectedAuthorityRevision:1});
  assert.equal((await f.registry.registerSource(req(OP),d)).code,'forbidden');assert.equal(f.counts().source_versions,1);
 }finally{f.close();}
});

// Independently construct chunks with correct checksums, so parser rejection
// below tests structure/dimensions rather than merely failing a damaged CRC.
function chunk(type,data){
 const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length,0);out.write(type,4);data.copy(out,8);
 let crc=0xffffffff;for(const byte of out.subarray(4,-4)){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
}
test('G1F PNG with valid CRC still rejects unsafe dimensions and unsupported format settings',async()=>{
 const f=setup();try{
  f.operator();const original=Buffer.from(PNG,'base64'),header=original.subarray(16,29);
  for(const edit of [b=>b.writeUInt32BE(0,0),b=>b.writeUInt32BE(10001,4),b=>{b[8]=3;},b=>{b[10]=1;}]){
   const changed=Buffer.from(header);edit(changed);
   const data=Buffer.concat([original.subarray(0,8),chunk('IHDR',changed),original.subarray(33)]);
   assert.equal((await f.registry.registerAsset(req(OP),{...assetInput(),pngBase64:data.toString('base64')})).code,'invalid-image');
  }
 }finally{f.close();}
});
test('G1F APNG, unknown critical chunks and duplicate IHDR are rejected even with valid CRC',async()=>{
 const f=setup();try{
  f.operator();const original=Buffer.from(PNG,'base64');
  for(const extra of [chunk('acTL',Buffer.alloc(8)),chunk('ABCD',Buffer.alloc(0)),original.subarray(8,33)]){
   const data=Buffer.concat([original.subarray(0,33),extra,original.subarray(33)]);
   assert.equal((await f.registry.registerAsset(req(OP),{...assetInput(),pngBase64:data.toString('base64')})).code,'invalid-image');
  }
 }finally{f.close();}
});
test('G1F empty image data and trailing data after IEND cannot become a registered asset',async()=>{
 const f=setup();try{
  f.operator();const original=Buffer.from(PNG,'base64');
  const empty=Buffer.concat([original.subarray(0,33),chunk('IDAT',Buffer.alloc(0)),chunk('IEND',Buffer.alloc(0))]);
  for(const data of [empty,Buffer.concat([original,Buffer.from([1])])])
   assert.equal((await f.registry.registerAsset(req(OP),{...assetInput(),pngBase64:data.toString('base64')})).code,'invalid-image');
 }finally{f.close();}
});
test('G1F new source versions get distinct hashes while old pinned payload remains readable',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world(),a=sourceInput();a.license='licensed';a.proofRef='private-license-reference';
  const first=await f.registry.registerSource(req(OP),a);assert.equal(first.ok,true);
  const next=sourceInput();next.storyVersion='v2';next.payload.chapters[0].text='REVISED_PRIVATE_SOURCE_TEXT';
  const second=await f.registry.registerSource(req(OP),next);assert.equal(second.ok,true);
  assert.notEqual(first.reference.contentHash,second.reference.contentHash);
  await f.registry.setSourceGrant(req(),f.grant(w,first.reference));
  const old=await f.registry.readSource(req(),{worldId:w.worldId,reference:first.reference});
  assert.equal(old.payload.chapters[0].text,'PRIVATE_SOURCE_TEXT');
  assert.equal((await f.registry.readSource(req(),{worldId:w.worldId,reference:second.reference})).ok,false);
 }finally{f.close();}
});

test('G1F immutable catalog descriptors cannot change licensed recipient or reactivate a revoked version',async()=>{
 const f=setup();try{
  f.operator();const s=await f.registry.registerSource(req(OP),sourceInput());
  for(const change of ["authorized_uid='other-user'","license='public_domain'","reference_json='{}'","source_note='changed'"])
   assert.throws(()=>f.sql.exec('UPDATE vg_authoring_registry_objects_v1 SET '+change),/immutable-authoring-record/);
  assert.throws(()=>f.sql.exec('DELETE FROM vg_authoring_registry_objects_v1'),/immutable-authoring-record/);
  await f.registry.revokeSourceVersion(req(OP),{requestId:crypto.randomUUID(),reference:s.reference,expectedAuthorityRevision:1});
  assert.throws(()=>f.sql.exec("UPDATE vg_authoring_registry_objects_v1 SET status='active',authority_revision=3"),/immutable-authoring-record/);
 }finally{f.close();}
});

test('G1F local intake size bound rejects oversized story bytes without persisting a partial source',async()=>{
 const f=setup();try{
  f.operator();const d=sourceInput();d.payload.chapters[0].text='x'.repeat(1024*1024);
  assert.equal((await f.registry.registerSource(req(OP),d)).code,'payload-limit');assert.equal(f.counts().source_versions,0);
 }finally{f.close();}
});

async function manifestFixture(f){
 f.operator();const w=await f.world(),d=sourceInput();
 d.payload.chapters=[{chapterId:'chapter-10',title:'First',text:'PRIVATE_FIRST'},
  {chapterId:'chapter-2',title:'Second',text:'PRIVATE_SECOND'},
  {chapterId:'chapter-1',title:'Third',text:'PRIVATE_THIRD'}];
 const s=await f.registry.registerSource(req(OP),d);assert.equal(s.ok,true);
 assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,s.reference))).ok,true);
 return {w,s,input:{worldId:w.worldId,reference:s.reference}};
}
test('G1O discovery lists only currently granted own sources without private text/license proof',async()=>{
 const f=setup();try{
  const x=await manifestFixture(f),before=f.counts();
  const ungranted=await f.registry.registerSource(req(OP),{...sourceInput(),storyId:'not-granted'});assert.equal(ungranted.ok,true);
  const r=await f.registry.listSources(req(),{worldId:x.w.worldId,after:''});
  assert.equal(r.ok,true);assert.equal(r.sources.length,1);assert.deepEqual(r.sources[0].reference,x.s.reference);
  assert.equal(r.nextCursor,null);assert.equal(r.accessRevision,1);
  for(const secret of ['PRIVATE_FIRST','PRIVATE_SECOND','proofRef','license','authorizedUid'])assert.equal(JSON.stringify(r).includes(secret),false);
  assert.equal(f.counts().registry_events,before.registry_events+1); // Only explicit registration wrote.
 }finally{f.close();}
});
test('G1O manifest preserves stable IDs and order and strips chapter bodies',async()=>{
 const f=setup();try{
  const x=await manifestFixture(f),before=f.counts(),r=await f.registry.sourceManifest(req(),x.input);
  assert.equal(r.ok,true);assert.equal(r.manifest.format,'source-manifest-1');
  assert.deepEqual(r.manifest.chapters.map(c=>c.chapterId),['chapter-10','chapter-2','chapter-1']);
  assert.deepEqual(r.manifest.chapters.map(c=>c.order),[0,1,2]);
  assert.equal(JSON.stringify(r).includes('PRIVATE_'),false);assert.deepEqual(f.counts(),before);
 }finally{f.close();}
});
test('G1O ranges use immutable source order, include both ends and allow a single chapter',async()=>{
 const f=setup();try{
  const x=await manifestFixture(f),range=(start,end)=>f.registry.sourceRange(req(),{...x.input,startChapterId:start,endChapterId:end});
  const r=await range('chapter-10','chapter-2');assert.equal(r.ok,true);
  assert.deepEqual(r.chapters.map(c=>c.text),['PRIVATE_FIRST','PRIVATE_SECOND']);
  assert.equal((await range('chapter-2','chapter-2')).chapters.length,1);
  for(const pair of [['chapter-1','chapter-10'],['missing','chapter-1'],['chapter-10','missing']])
   assert.equal((await range(...pair)).code,'invalid-chapter-range');
 }finally{f.close();}
});
test('G1O all source methods reject guest, foreign owner, operator and admin-only identities',async()=>{
 const f=setup();try{
  const x=await manifestFixture(f);
  for(const user of ['guest',OTHER,OP,'admin']){
   for(const r of [await f.registry.listSources(req(user),{worldId:x.w.worldId,after:''}),
    await f.registry.sourceManifest(req(user),x.input),await f.registry.sourceRange(req(user),{...x.input,startChapterId:'chapter-10',endChapterId:'chapter-1'})])
    assert.equal(r.code,user==='guest'?'unauthenticated':'forbidden');
  }
 }finally{f.close();}
});
test('G1O source grant/version revocation removes discovery and blocks manifest/range',async()=>{
 for(const global of [false,true]){
  const f=setup();try{
   const x=await manifestFixture(f);
   if(global)await f.registry.revokeSourceVersion(req(OP),{requestId:crypto.randomUUID(),expectedAuthorityRevision:1,reference:x.s.reference});
   else await f.registry.setSourceGrant(req(),f.grant(x.w,x.s.reference,{expectedGrantRevision:1,status:'revoked'}));
   assert.deepEqual((await f.registry.listSources(req(),{worldId:x.w.worldId,after:''})).sources,[]);
   assert.equal((await f.registry.sourceManifest(req(),x.input)).code,'forbidden');
   assert.equal((await f.registry.sourceRange(req(),{...x.input,startChapterId:'chapter-10',endChapterId:'chapter-1'})).code,'forbidden');
  }finally{f.close();}
 }
});
test('G1O manifest/range cannot return data if rights change during payload hashing',async()=>{
 for(const method of ['sourceManifest','sourceRange']){
  const f=setup();try{
   const x=await manifestFixture(f);f.hooks.count=0;
   f.hooks.before=count=>{if(count===2){f.hooks.before=null;f.sql.exec("UPDATE vg_authoring_source_grants_v1 SET status='revoked',grant_revision=2");}};
   const input=method==='sourceManifest'?x.input:{...x.input,startChapterId:'chapter-10',endChapterId:'chapter-1'};
   assert.equal((await f.registry[method](req(),input)).code,'forbidden');
  }finally{f.close();}
 }
});
test('G1O discovery has bounded deterministic pages without duplicates',async()=>{
 const f=setup();try{
  f.operator();const w=await f.world();
  for(let i=0;i<52;i++){
   const s=await f.registry.registerSource(req(OP),{...sourceInput(),storyId:'paged-'+i});
   assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,s.reference))).ok,true);
  }
  const page1=await f.registry.listSources(req(),{worldId:w.worldId,after:''});assert.equal(page1.sources.length,50);assert.match(page1.nextCursor,/^[a-f0-9]{64}$/);
  const page2=await f.registry.listSources(req(),{worldId:w.worldId,after:page1.nextCursor});assert.equal(page2.sources.length,2);assert.equal(page2.nextCursor,null);
  assert.equal(new Set([...page1.sources,...page2.sources].map(s=>s.reference.storyId)).size,52);
 }finally{f.close();}
});
test('G1O strict inputs and stale pins fail without leaking source bytes',async()=>{
 const f=setup();try{
  const x=await manifestFixture(f);
  for(const patch of [{after:42},{after:'invalid'},{uid:OWNER},{after:null}])assert.equal((await f.registry.listSources(req(),{worldId:x.w.worldId,after:'',...patch})).code,'invalid-request');
  assert.equal((await f.registry.sourceManifest(req(),{...x.input,reference:{...x.s.reference,contentHash:'a'.repeat(64)}})).code,'forbidden');
  assert.equal((await f.registry.sourceRange(req(),{...x.input,startChapterId:'',endChapterId:'chapter-1'})).code,'invalid-request');
 }finally{f.close();}
});

test('G1Q prepared library payload is accepted unchanged by existing registry and manifest/range services',async()=>{
 const {createLibrarySourcePreparer}=await import('../src/vangioi-library-source.mjs');
 const f=setup();try{
  f.operator();const w=await f.world(),payload=sourceInput().payload,hash=await hashAuthoringJson(payload);
  const snapshot={book:{id:'epub-existing',title:payload.title,ownerUid:OWNER,status:'published',chapterCount:1,
   chapterIndex:[{id:'ch-one',title:'Chapter one',order:0}]},chapters:[{id:'ch-one',title:'Chapter one',order:0,content:'PRIVATE_SOURCE_TEXT'}],
   permit:{storyId:'epub-existing',authorizedUid:OWNER,contentHash:hash,status:'active',revision:1,license:'original',sourceNote:'Synthetic checked permission',proofRef:null}};
  const prepare=createLibrarySourcePreparer({projectId:'truyendienvl',verify:f.options.verify,isOperator:async user=>user===OP,readSnapshot:async()=>snapshot});
  const plan=await prepare(req(OP),{requestId:crypto.randomUUID(),storyId:'epub-existing',authorizedUid:OWNER});assert.equal(plan.ok,true);
  const registered=await f.registry.registerSource(req(OP),plan.registryInput);assert.equal(registered.ok,true);assert.deepEqual(registered.reference,plan.reference);
  assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,registered.reference))).ok,true);
  const input={worldId:w.worldId,reference:registered.reference};
  assert.equal((await f.registry.sourceManifest(req(),input)).manifest.chapters[0].chapterId,'ch-one');
  assert.equal((await f.registry.sourceRange(req(),{...input,startChapterId:'ch-one',endChapterId:'ch-one'})).chapters[0].text,'PRIVATE_SOURCE_TEXT');
 }finally{f.close();}
});

async function permitFixture(f){
 f.operator();const w=await f.world(),d=sourceInput(),hash=await hashAuthoringJson(d.payload);
 d.storyVersion='sha256-'+hash;
 const permit={requestId:crypto.randomUUID(),storyId:d.storyId,contentHash:hash,authorizedUid:OWNER,license:d.license,sourceNote:d.sourceNote,proofRef:d.proofRef};
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),permit)).ok,true);
 return {w,d,permit,hash,revoke:{requestId:crypto.randomUUID(),storyId:d.storyId,contentHash:hash,expectedRevision:1}};
}
test('G1R permit is persisted, read for preparer and issue retries do not duplicate audit',async()=>{
 const f=setup();try{const x=await permitFixture(f);
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),x.permit)).replayed,true);
 const r=await f.registry.readAdaptationPermit(req(OP),{storyId:x.d.storyId,contentHash:x.hash});
 assert.equal(r.permit.status,'active');assert.equal(r.permit.revision,1);assert.equal(r.permit.authorizedUid,OWNER);
 assert.equal((await f.registry.readAdaptationPermit(req(),{storyId:x.d.storyId,contentHash:x.hash})).ok,false);
 assert.throws(()=>f.sql.exec('DELETE FROM vg_authoring_adaptation_permits_v1'),/immutable/);
 assert.throws(()=>f.sql.exec("UPDATE vg_authoring_adaptation_permits_v1 SET permit_json='{}'"),/immutable/);
 }finally{f.close();}
});
test('G1R revocation atomically disables imported source and world grants; old issue retry cannot restore',async()=>{
 const f=setup();try{const x=await permitFixture(f),s=await f.registry.registerSource(req(OP),x.d);assert.equal(s.ok,true);
 await f.registry.setSourceGrant(req(),f.grant(x.w,s.reference));
 assert.equal((await f.registry.revokeAdaptationPermit(req(OP),x.revoke)).ok,true);
 assert.equal((await f.registry.revokeAdaptationPermit(req(OP),x.revoke)).replayed,true);
 assert.equal((await f.registry.readSource(req(),{worldId:x.w.worldId,reference:s.reference})).ok,false);
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),x.permit)).replayed,true);
 assert.equal((await f.registry.registerSource(req(OP),x.d)).ok,false);
 assert.equal(f.rows('SELECT status FROM vg_authoring_adaptation_permits_v1')[0].status,'revoked');
 }finally{f.close();}
});
test('G1R stale prepared import cannot register after permit revocation or change recipient/license/version',async()=>{
 const f=setup();try{const x=await permitFixture(f);
 for(const patch of [{authorizedUid:OTHER},{license:'public_domain'},{storyVersion:'alias-v1'},{sourceNote:'Changed'}])
 assert.equal((await f.registry.registerSource(req(OP),{...x.d,...patch})).ok,false);
 await f.registry.revokeAdaptationPermit(req(OP),x.revoke);
 assert.equal((await f.registry.registerSource(req(OP),x.d)).ok,false);
 assert.equal(f.counts().source_versions,0);
 }finally{f.close();}
});
test('G1R failed audit rolls back permit revocation, object and all grants',async()=>{
 const f=setup();try{const x=await permitFixture(f),s=await f.registry.registerSource(req(OP),x.d);
 await f.registry.setSourceGrant(req(),f.grant(x.w,s.reference));f.hooks.fail='INSERT INTO vg_authoring_registry_events_v1';
 assert.equal((await f.registry.revokeAdaptationPermit(req(OP),x.revoke)).code,'registry-unavailable');
 assert.equal(f.rows('SELECT status FROM vg_authoring_adaptation_permits_v1')[0].status,'active');
 assert.equal((await f.registry.readSource(req(),{worldId:x.w.worldId,reference:s.reference})).ok,true);
 }finally{f.close();}
});
test('G1R denies nonoperators, stale revisions and permit adoption of existing legacy source',async()=>{
 const f=setup();try{const x=await permitFixture(f);
 assert.equal((await f.registry.revokeAdaptationPermit(req(),x.revoke)).code,'forbidden');
 assert.equal((await f.registry.revokeAdaptationPermit(req(OP),{...x.revoke,expectedRevision:2})).code,'revision-conflict');
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),{...x.permit,requestId:crypto.randomUUID()})).code,'version-conflict');
 f.sql.exec("UPDATE vg_authoring_registry_operators_v1 SET status='revoked'");
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),x.permit)).code,'forbidden');
 }finally{f.close();}
});

test('G1U outbox records issue and revoke in order, without leaking private permit fields or replay duplication',async()=>{
 const f=setup();try{
  const x=await permitFixture(f),first=await f.registry.listPermitEvents(req(OP),{after:0});
  assert.equal(first.ok,true);assert.equal(first.events.length,1);
  assert.equal(first.events[0].status,'active');assert.equal(first.events[0].revision,1);
  assert.equal(first.events[0].storyId,x.permit.storyId);assert.equal(first.events[0].contentHash,x.hash);
  assert.equal(first.checkpoint,first.events[0].seq);assert.equal(first.nextCursor,null);
  assert.equal((await f.registry.issueAdaptationPermit(req(OP),x.permit)).replayed,true);
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),x.revoke)).ok,true);
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),x.revoke)).replayed,true);
  const page=await f.registry.listPermitEvents(req(OP),{after:first.checkpoint});
  assert.equal(page.events.length,1);assert.equal(page.events[0].status,'revoked');
  assert.equal(page.events[0].revision,2);assert.ok(page.checkpoint>first.checkpoint);
  assert.equal((await f.registry.listPermitEvents(req(OP),{after:page.checkpoint})).events.length,0);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_permit_outbox_v1')[0].n,2);
  assert.equal(f.rows("SELECT count(*) n FROM vg_authoring_registry_events_v1 WHERE scope='permits'")[0].n,2);
  const leak=JSON.stringify([first,page]);
  for(const forbidden of ['PRIVATE_SOURCE_TEXT',x.permit.sourceNote,x.permit.authorizedUid,'proofRef','requestId','actorUid','license'])
   assert.equal(leak.includes(forbidden),false);
  assert.throws(()=>f.sql.exec('DELETE FROM vg_authoring_permit_outbox_v1'),/immutable/);
  assert.throws(()=>f.sql.exec("UPDATE vg_authoring_permit_outbox_v1 SET status='active'"),/immutable/);
 }finally{f.close();}
});

test('G1U outbox paginates fixed 50 records with monotonic checkpoint even at identical timestamps',async()=>{
 const f=setup();try{
  f.operator();for(let i=0;i<52;i++){
   const r=await f.registry.issueAdaptationPermit(req(OP),{requestId:crypto.randomUUID(),storyId:`outbox-${i}`,
    contentHash:i.toString(16).padStart(64,'0'),authorizedUid:OWNER,license:'original',sourceNote:'Verified in fixture',proofRef:null});
   assert.equal(r.ok,true);
  }
  const a=await f.registry.listPermitEvents(req(OP),{after:0});
  assert.equal(a.events.length,50);assert.equal(a.nextCursor,a.checkpoint);
  const b=await f.registry.listPermitEvents(req(OP),{after:a.nextCursor});
  assert.equal(b.events.length,2);assert.equal(b.nextCursor,null);
  assert.equal(new Set([...a.events,...b.events].map(e=>e.seq)).size,52);
  assert.ok(b.checkpoint>a.checkpoint);
  assert.deepEqual((await f.registry.listPermitEvents(req(OP),{after:b.checkpoint})).events,[]);
  assert.ok(a.events.every(e=>e.happenedAt===1000));
 }finally{f.close();}
});

test('G1U outbox is operator-only and rejects invalid or self-asserted paging authority',async()=>{
 const f=setup();try{
  await permitFixture(f);
  for(const user of [OWNER,OTHER,'guest']){
   assert.equal((await f.registry.listPermitEvents(req(user),{after:0})).ok,false);
  }
  for(const d of [{after:-1},{after:1.2},{after:'0'},{after:null},{after:0,admin:true},{}])
   assert.equal((await f.registry.listPermitEvents(req(OP),d)).code,'invalid-request');
  f.sql.exec("UPDATE vg_authoring_registry_operators_v1 SET status='revoked'");
  assert.equal((await f.registry.listPermitEvents(req(OP),{after:0})).code,'forbidden');
 }finally{f.close();}
});

test('G1U outbox insertion failure rolls back permit issuance and cascading revocation',async()=>{
 const f=setup();try{
  f.operator();const d=sourceInput(),hash=await hashAuthoringJson(d.payload);
  const permit={requestId:crypto.randomUUID(),storyId:d.storyId,contentHash:hash,authorizedUid:OWNER,
   license:d.license,sourceNote:d.sourceNote,proofRef:d.proofRef};
  f.hooks.fail='INSERT INTO vg_authoring_permit_outbox_v1';
  assert.equal((await f.registry.issueAdaptationPermit(req(OP),permit)).code,'registry-unavailable');
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_adaptation_permits_v1')[0].n,0);
  assert.equal(f.rows("SELECT count(*) n FROM vg_authoring_registry_events_v1 WHERE scope='permits'")[0].n,0);
  assert.equal((await f.registry.issueAdaptationPermit(req(OP),permit)).ok,true);
  const w=await f.world();d.storyVersion='sha256-'+hash;
  const source=await f.registry.registerSource(req(OP),d);assert.equal(source.ok,true);
  assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,source.reference))).ok,true);
  f.hooks.fail='INSERT INTO vg_authoring_permit_outbox_v1';
  const revoke={requestId:crypto.randomUUID(),storyId:d.storyId,contentHash:hash,expectedRevision:1};
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),revoke)).code,'registry-unavailable');
  assert.equal((await f.registry.readSource(req(),{worldId:w.worldId,reference:source.reference})).ok,true);
  assert.equal(f.rows('SELECT status FROM vg_authoring_adaptation_permits_v1')[0].status,'active');
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_permit_outbox_v1')[0].n,1);
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),revoke)).ok,true);
  assert.equal((await f.registry.readSource(req(),{worldId:w.worldId,reference:source.reference})).ok,false);
 }finally{f.close();}
});

test('G1U outbox fails closed for a preexisting G1R permit lacking history',async()=>{
 const f=setup();try{
  f.operator();const hash='a'.repeat(64);
  f.sql.exec("INSERT INTO vg_authoring_adaptation_permits_v1 VALUES(?,?,?,'active',1)",
   'historical-story',hash,JSON.stringify({storyId:'historical-story',contentHash:hash,authorizedUid:OWNER,
    license:'original',sourceNote:'Legacy fixture',proofRef:null}));
  assert.equal((await f.registry.listPermitEvents(req(OP),{after:0})).code,'baseline-required');
  assert.equal((await f.registry.readAdaptationPermit(req(OP),{storyId:'historical-story',contentHash:hash})).permit.status,'active');
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_permit_outbox_v1')[0].n,0);
 }finally{f.close();}
});

test('G1U outbox preserves event sequence and revocation across SQLite restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vangioi-g1u-')),file=join(dir,'registry.sqlite');
 try{
  const before=setup(file);let checkpoint,permit;
  try{
   const x=await permitFixture(before);permit=x;
   checkpoint=(await before.registry.listPermitEvents(req(OP),{after:0})).checkpoint;
   assert.equal((await before.registry.revokeAdaptationPermit(req(OP),x.revoke)).ok,true);
  }finally{before.close();}
  const after=setup(file);try{
   const history=await after.registry.listPermitEvents(req(OP),{after:checkpoint});
   assert.equal(history.ok,true);assert.equal(history.events.length,1);
   assert.equal(history.events[0].status,'revoked');assert.equal(history.events[0].revision,2);
   assert.equal((await after.registry.readAdaptationPermit(req(OP),{storyId:permit.d.storyId,contentHash:permit.hash})).permit.status,'revoked');
  }finally{after.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});

function v49ForG1S(storyId='epub-staging'){
 return {book:{id:storyId,title:'Staging V49 book',ownerUid:'verified-book-owner',status:'published',chapterCount:2,
  chapterIndex:[{id:'chapter-0010',order:0,title:'First',wordCount:1},
   {id:'chapter-0002',order:1,title:'Second',wordCount:1}],coverImage:'PRIVATE_COVER'},
  chapters:[{id:'chapter-0002',order:1,title:'Second',content:'PRIVATE_SECOND',wordCount:1},
   {id:'chapter-0010',order:0,title:'First',content:'PRIVATE_FIRST',wordCount:1}]};
}
async function g1sPermitFixture(f,raw){
 f.operator();
 const payload={format:'story-source-1',title:raw.book.title,chapters:[
  {chapterId:'chapter-0010',title:'First',text:'PRIVATE_FIRST'},
  {chapterId:'chapter-0002',title:'Second',text:'PRIVATE_SECOND'}]};
 const hash=await hashAuthoringJson(payload),storyId=raw.book.id;
 const permit={requestId:crypto.randomUUID(),storyId,contentHash:hash,authorizedUid:OWNER,
  license:'licensed',sourceNote:'Synthetic checked rights',proofRef:'private-evidence'};
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),permit)).ok,true);
 const reader=createV49StagingSnapshotReader({
  readV49Snapshot:async()=>structuredClone(raw),
  readAdaptationPermit:({storyId,contentHash})=>f.registry.readAdaptationPermit(req(OP),{storyId,contentHash})
 });
 const prepare=createLibrarySourcePreparer({projectId:'truyendienvl',verify:f.options.verify,
  isOperator:async uid=>uid===OP,readSnapshot:reader});
 const plan=await prepare(req(OP),{requestId:crypto.randomUUID(),storyId,authorizedUid:OWNER});
 assert.equal(plan.ok,true);
 return {plan,payload,hash,storyId};
}

test('G1S staging V49 projection → G1Q preparer → G1R permit → G1F registry → G1O manifest/range',async()=>{
 const f=setup();try{
  const w=await f.world(),x=await g1sPermitFixture(f,v49ForG1S());
  assert.deepEqual(x.plan.registryInput.payload,x.payload);
  const registered=await f.registry.registerSource(req(OP),x.plan.registryInput);
  assert.equal(registered.ok,true);assert.deepEqual(registered.reference,x.plan.reference);
  assert.equal((await f.registry.setSourceGrant(req(),f.grant(w,registered.reference))).ok,true);
  const scope={worldId:w.worldId,reference:registered.reference};
  const manifest=await f.registry.sourceManifest(req(),scope);
  assert.deepEqual(manifest.manifest.chapters.map(c=>c.chapterId),['chapter-0010','chapter-0002']);
  assert.equal(JSON.stringify(manifest).includes('PRIVATE_'),false);
  const range=await f.registry.sourceRange(req(),{...scope,startChapterId:'chapter-0010',endChapterId:'chapter-0002'});
  assert.deepEqual(range.chapters.map(c=>c.text),['PRIVATE_FIRST','PRIVATE_SECOND']);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_adaptation_permits_v1')[0].n,1);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_objects_v1')[0].n,1);
 }finally{f.close();}
});

test('G1S source prepared before revocation cannot commit to registry after G1R revoke',async()=>{
 const f=setup();try{
  const x=await g1sPermitFixture(f,v49ForG1S('epub-before-revoke'));
  const revocation=await f.registry.revokeAdaptationPermit(req(OP),{
   requestId:crypto.randomUUID(),storyId:x.storyId,contentHash:x.hash,expectedRevision:1});
  assert.equal(revocation.status,'revoked');
  const attempt=await f.registry.registerSource(req(OP),x.plan.registryInput);
  assert.equal(attempt.ok,false);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_objects_v1')[0].n,0);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_source_versions_v1')[0].n,0);
 }finally{f.close();}
});

async function g1tPrepared(f,fire){
 f.operator();const payload={format:'story-source-1',title:'Staging V49',chapters:[
  {chapterId:'chapter-0010',title:'First',text:'PRIVATE_FIRST'},
  {chapterId:'chapter-0002',title:'Second',text:'PRIVATE_SECOND'}]};
 const hash=await hashAuthoringJson(payload),permit={requestId:crypto.randomUUID(),storyId:fire.storyId,
  contentHash:hash,authorizedUid:OWNER,license:'licensed',sourceNote:'Synthetic staging permit',proofRef:'private-proof'};
 assert.equal((await f.registry.issueAdaptationPermit(req(OP),permit)).ok,true);
 const readSnapshot=createV49StagingSnapshotReader({
  readV49Snapshot:createV49FirestoreTransactionReader({firestore:fire.firestore}),
  readAdaptationPermit:({storyId,contentHash})=>f.registry.readAdaptationPermit(req(OP),{storyId,contentHash})
 });
 const prepare=createLibrarySourcePreparer({projectId:'truyendienvl',verify:f.options.verify,
  isOperator:async user=>user===OP,readSnapshot});
 const plan=await prepare(req(OP),{requestId:crypto.randomUUID(),storyId:fire.storyId,authorizedUid:OWNER});
 assert.equal(plan.ok,true);assert.deepEqual(plan.registryInput.payload,payload);
 assert.equal(fire.stats.transactions,2);
 return {plan,hash,permit,prepare};
}

test('G1T transactional V49 read integrates with real SQLite permit, registry and manifest without live Firestore',async()=>{
 const f=setup(),fire=createV49TransactionFixture();try{
  const world=await f.world(),x=await g1tPrepared(f,fire);
  const registered=await f.registry.registerSource(req(OP),x.plan.registryInput);
  assert.equal(registered.ok,true);
  assert.equal((await f.registry.setSourceGrant(req(),f.grant(world,registered.reference))).ok,true);
  const scope={worldId:world.worldId,reference:registered.reference};
  const manifest=await f.registry.sourceManifest(req(),scope);
  assert.deepEqual(manifest.manifest.chapters.map(c=>c.chapterId),['chapter-0010','chapter-0002']);
  assert.equal(JSON.stringify(manifest).includes('PRIVATE_FIRST'),false);
  const range=await f.registry.sourceRange(req(),{...scope,startChapterId:'chapter-0002',endChapterId:'chapter-0002'});
  assert.equal(range.chapters[0].text,'PRIVATE_SECOND');
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),{
   requestId:crypto.randomUUID(),storyId:fire.storyId,contentHash:x.hash,expectedRevision:1})).status,'revoked');
  assert.equal((await f.registry.sourceManifest(req(),scope)).code,'forbidden');
 }finally{f.close();}
});

test('G1T prepared Firestore snapshot cannot register after SQLite permit revocation',async()=>{
 const f=setup(),fire=createV49TransactionFixture('epub-revoke-between');try{
  const x=await g1tPrepared(f,fire);
  await f.registry.revokeAdaptationPermit(req(OP),{
   requestId:crypto.randomUUID(),storyId:fire.storyId,contentHash:x.hash,expectedRevision:1});
  assert.equal((await f.registry.registerSource(req(OP),x.plan.registryInput)).ok,false);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_source_versions_v1')[0].n,0);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_objects_v1')[0].n,0);
 }finally{f.close();}
});

test('G1V actual G1U SQLite outbox projects current revoked authority on delayed replay',async()=>{
 const f=setup();try{
  const x=await permitFixture(f);
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),x.revoke)).ok,true);
  let saved={checkpoint:0,rights:new Map()};
  const replay=createPermitReplayRehearsal({
   listPermitEvents:(r,d)=>f.registry.listPermitEvents(r,d),
   readAdaptationPermit:(r,d)=>f.registry.readAdaptationPermit(r,d),
   commitBatch:async({after,checkpoint,projections})=>{
    assert.equal(saved.checkpoint,after);
    const rights=new Map(saved.rights);
    for(const p of projections)rights.set(JSON.stringify([p.storyId,p.contentHash]),{status:p.status,revision:p.revision});
    saved={checkpoint,rights};
   }
  });
  assert.equal((await replay(req(OP),{after:0})).processed,2);
  assert.equal(saved.checkpoint,2);
  assert.deepEqual(saved.rights.get(JSON.stringify([x.permit.storyId,x.hash])),{status:'revoked',revision:2});
  assert.equal((await replay(req(),{after:saved.checkpoint})).code,'forbidden');
 }finally{f.close();}
});

test('G1V unchanged V49 version passes recheck and reaches existing SQL registry',async()=>{
 const f=setup(),fire=createV49TransactionFixture('epub-g1v-unchanged');try{
  const x=await g1tPrepared(f,fire);
  const guarded=createV49PrecommitRecheck({prepare:x.prepare,
   registerSource:(r,d)=>f.registry.registerSource(r,d)});
  const registered=await guarded(req(OP),x.plan);
  assert.equal(registered.ok,true);assert.deepEqual(registered.reference,x.plan.reference);
  assert.equal(fire.stats.transactions,4); // G1Q prepared twice, G1V checked twice again.
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_objects_v1')[0].n,1);
 }finally{f.close();}
});

test('G1V observed Firestore content edit after prepare stops import before registry write',async()=>{
 const f=setup(),fire=createV49TransactionFixture('epub-g1v-edited');try{
  const x=await g1tPrepared(f,fire);
  fire.patch(fire.paths[0],{content:'PRIVATE_CHANGED_AFTER_PREPARE'});
  let writes=0;
  const guarded=createV49PrecommitRecheck({prepare:x.prepare,
   registerSource:async(r,d)=>{writes++;return f.registry.registerSource(r,d);}});
  assert.equal((await guarded(req(OP),x.plan)).ok,false);
  assert.equal(writes,0);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_objects_v1')[0].n,0);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_source_versions_v1')[0].n,0);
 }finally{f.close();}
});

test('G1V revocation after prepare stops rechecked commit without source grant',async()=>{
 const f=setup(),fire=createV49TransactionFixture('epub-g1v-revoked');try{
  const x=await g1tPrepared(f,fire);
  assert.equal((await f.registry.revokeAdaptationPermit(req(OP),{
   requestId:crypto.randomUUID(),storyId:fire.storyId,contentHash:x.hash,expectedRevision:1})).ok,true);
  const guarded=createV49PrecommitRecheck({prepare:x.prepare,
   registerSource:(r,d)=>f.registry.registerSource(r,d)});
  assert.equal((await guarded(req(OP),x.plan)).ok,false);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_objects_v1')[0].n,0);
 }finally{f.close();}
});
