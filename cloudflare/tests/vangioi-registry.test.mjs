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
