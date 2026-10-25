import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqlProvisioningService} from '../src/vangioi-provisioning.mjs';
import {createSqlAuthoringService} from '../src/vangioi-authoring-sql.mjs';

const OWNER='provision-owner',EDITOR='provision-editor';
const req=(user=OWNER)=>new Request('https://unit.test',{headers:{Authorization:'Bearer '+user}});
const createInput=()=>({requestId:crypto.randomUUID(),content:{schemaVersion:'world-content-1',title:'Private world'}});
function setup(path=':memory:'){
 const db=new DatabaseSync(path),hooks={before:null,fail:null};
 const sql={exec(q,...args){
  let rows=[];
  if(q.trim().startsWith('CREATE '))db.exec(q);
  else{const s=db.prepare(q);if(/^\s*SELECT\b/i.test(q)||/\bRETURNING\b/i.test(q))rows=s.all(...args);else s.run(...args);}
  if(hooks.fail&&q.includes(hooks.fail)){hooks.fail=null;throw Error('PRIVATE_SQL_ERROR');}
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){
  hooks.before?.();db.exec('BEGIN IMMEDIATE');
  try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const options={storage,projectId:'truyendienvl',now:()=>1000,verify:async r=>{
  const user=r.headers.get('Authorization')?.slice(7);
  return !user||user==='guest'?null:{uid:user,admin:true,canEditStories:true};
 }};
 const service=createSqlProvisioningService(options),authoring=createSqlAuthoringService(options);
 const rows=(q,...args)=>sql.exec(q,...args).toArray();
 const entitled=(user=OWNER)=>sql.exec(`INSERT INTO vg_authoring_entitlements_v1 VALUES(?,'active',1,1)
  ON CONFLICT(uid) DO UPDATE SET status='active',can_create_world=1`,user);
 const counts=()=>Object.fromEntries(['worlds','drafts','members','operations','audit','access_events']
  .map(t=>[t,rows(`SELECT count(*) n FROM vg_authoring_${t}_v1`)[0].n]));
 const world=async()=>{entitled();return service.createWorld(req(),createInput());};
 const member=(worldId,overrides={})=>({worldId,requestId:crypto.randomUUID(),expectedAccessRevision:1,
  memberUid:EDITOR,status:'active',editSections:['scenes'],...overrides});
 return {db,sql,rows,hooks,service,authoring,options,entitled,counts,world,member,close:()=>db.close()};
}

test('G1E verified entitled author creates a private revision-1 draft, receipt and audit atomically',async()=>{
 const f=setup();try{
  const w=await f.world();assert.equal(w.ok,true);assert.equal(w.state,'draft');
  assert.equal(w.accessRevision,1);assert.match(w.worldId,/^world-[a-f0-9]{40}$/);
  assert.deepEqual(f.counts(),{worlds:1,drafts:1,members:0,operations:1,audit:1,access_events:0});
  const view=await f.authoring.viewDraft(req(),{worldId:w.worldId});assert.equal(view.content.title,'Private world');
  assert.deepEqual(JSON.parse(f.rows('SELECT contributors_json FROM vg_authoring_worlds_v1')[0].contributors_json),[OWNER]);
 }finally{f.close();}
});
test('G1E guest, verified admin or browser editor claim does not issue an AU entitlement',async()=>{
 const f=setup();try{
  for(const user of ['guest',OWNER,'platform-admin'])assert.equal((await f.service.createWorld(req(user),createInput())).ok,false);
  assert.equal(f.counts().worlds,0);
 }finally{f.close();}
});
test('G1E revoked and disabled author entitlements deny creation',async()=>{
 const f=setup();try{
  f.entitled();
  for(const set of ["status='revoked'","status='active',can_create_world=0"]){
   f.sql.exec('UPDATE vg_authoring_entitlements_v1 SET '+set);
   assert.equal((await f.service.createWorld(req(),createInput())).code,'forbidden');
  }assert.equal(f.counts().worlds,0);
 }finally{f.close();}
});
test('G1E creation retry is stable; same UUID cannot silently change initial content',async()=>{
 const f=setup();try{
  f.entitled();const data=createInput(),first=await f.service.createWorld(req(),data);
  const replay=await f.service.createWorld(req(),data);assert.equal(replay.replayed,true);assert.equal(replay.worldId,first.worldId);
  assert.equal((await f.service.createWorld(req(),{...data,content:{title:'Changed'}})).code,'idempotency-conflict');
  assert.equal(f.counts().worlds,1);assert.equal(f.counts().audit,1);
 }finally{f.close();}
});
test('G1E concurrent identical creation commits one world and receipt',async()=>{
 const f=setup();try{
  f.entitled();const data=createInput();const rs=await Promise.all([f.service.createWorld(req(),data),f.service.createWorld(req(),data)]);
  assert.equal(rs.every(r=>r.ok),true);assert.equal(rs.filter(r=>r.replayed).length,1);assert.equal(f.counts().worlds,1);
 }finally{f.close();}
});
test('G1E creation UUID is scoped to verified UID, never a client supplied owner',async()=>{
 const f=setup();try{
  f.entitled();f.entitled(EDITOR);const data=createInput();
  const a=await f.service.createWorld(req(),data),b=await f.service.createWorld(req(EDITOR),data);
  assert.notEqual(a.worldId,b.worldId);assert.equal(f.counts().worlds,2);
 }finally{f.close();}
});
test('G1E authoring content cannot inject ownership, workflow, permissions or malformed fields',async()=>{
 const f=setup();try{
  f.entitled();
  for(const patch of [{ownerUid:EDITOR},{worldId:'takeover-world'},{status:'published'},{roles:['owner']}]){
   assert.equal((await f.service.createWorld(req(),{...createInput(),...patch})).ok,false);
   assert.equal((await f.service.createWorld(req(),{...createInput(),content:patch})).ok,false);
  }
  for(const content of [{genreId:'period'},{title:123},{scenes:[{sceneId:5}]},[]])
   assert.equal((await f.service.createWorld(req(),{...createInput(),content})).ok,false);
  assert.equal(f.counts().worlds,0);
 }finally{f.close();}
});
test('G1E creation does not reset an existing world on response retry',async()=>{
 const f=setup();try{
  f.entitled();const data=createInput(),w=await f.service.createWorld(req(),data);
  f.sql.exec("UPDATE vg_authoring_worlds_v1 SET draft_state='submitted',access_revision=8 WHERE world_id=?",w.worldId);
  assert.equal((await f.service.createWorld(req(),data)).replayed,true);
  const row=f.rows('SELECT * FROM vg_authoring_worlds_v1')[0];assert.equal(row.draft_state,'submitted');assert.equal(row.access_revision,8);
 }finally{f.close();}
});
test('G1E revocation in the final transaction gap blocks creation and receipt replay',async()=>{
 const f=setup();try{
  f.entitled();const data=createInput();assert.equal((await f.service.createWorld(req(),data)).ok,true);
  f.hooks.before=()=>{f.hooks.before=null;f.sql.exec("UPDATE vg_authoring_entitlements_v1 SET status='revoked',entitlement_revision=2");};
  assert.equal((await f.service.createWorld(req(),data)).code,'forbidden');assert.equal(f.counts().audit,1);
  assert.equal((await f.service.createWorld(req(),createInput())).code,'forbidden');
 }finally{f.close();}
});
test('G1E owner grants only collaborator sections and existing authoring projection enforces them',async()=>{
 const f=setup();try{
  const w=await f.world(),m=f.member(w.worldId);
  assert.equal((await f.service.setCollaborator(req(),m)).accessRevision,2);
  const v=await f.authoring.viewDraft(req(EDITOR),{worldId:w.worldId});assert.equal(v.ok,true);assert.deepEqual(v.content,{});
  assert.equal((await f.authoring.saveDraft(req(EDITOR),{worldId:w.worldId,expectedRevision:1,requestId:crypto.randomUUID(),patch:{scenes:[]}})).ok,true);
  assert.equal((await f.authoring.saveDraft(req(EDITOR),{worldId:w.worldId,expectedRevision:2,requestId:crypto.randomUUID(),patch:{title:'Stolen'}})).ok,false);
  assert.equal((await f.authoring.submitDraft(req(EDITOR),{worldId:w.worldId,expectedRevision:2,requestId:crypto.randomUUID()})).ok,false);
  assert.equal(f.counts().access_events,1);
 }finally{f.close();}
});
test('G1E collaborator, stranger and admin claim cannot grant access or alter owner',async()=>{
 const f=setup();try{
  const w=await f.world();await f.service.setCollaborator(req(),f.member(w.worldId));
  for(const actor of [EDITOR,'stranger','platform-admin'])
   assert.equal((await f.service.setCollaborator(req(actor),f.member(w.worldId,{expectedAccessRevision:2,memberUid:'new-user'}))).code,'forbidden');
  assert.equal((await f.service.setCollaborator(req(),f.member(w.worldId,{expectedAccessRevision:2,memberUid:OWNER}))).code,'forbidden');
  assert.equal(f.counts().members,1);assert.equal(f.counts().access_events,1);
 }finally{f.close();}
});
test('G1E owner cannot assign reviewer/publisher or overwrite platform-assigned roles',async()=>{
 const f=setup();try{
  const w=await f.world();
  for(const role of ['reviewer','publisher']){
   assert.equal((await f.service.setCollaborator(req(),{...f.member(w.worldId),roles:[role]})).code,'invalid-request');
   f.sql.exec(`INSERT INTO vg_authoring_members_v1 VALUES(?,?,'active',?,'[]')
    ON CONFLICT(world_id,uid) DO UPDATE SET roles_json=excluded.roles_json`,w.worldId,EDITOR,JSON.stringify([role]));
   for(const status of ['active','revoked'])assert.equal((await f.service.setCollaborator(req(),f.member(w.worldId,{status,editSections:status==='active'?['scenes']:[]}))).code,'forbidden');
  }
  assert.equal(f.counts().access_events,0);
 }finally{f.close();}
});
test('G1E two membership edits with the same access revision cannot overwrite each other',async()=>{
 const f=setup();try{
  const w=await f.world();const rs=await Promise.all([
   f.service.setCollaborator(req(),f.member(w.worldId)),
   f.service.setCollaborator(req(),f.member(w.worldId,{memberUid:'other-editor'}))]);
  assert.equal(rs.filter(r=>r.ok).length,1);assert.equal(rs.filter(r=>r.code==='revision-conflict').length,1);assert.equal(f.counts().members,1);
 }finally{f.close();}
});
test('G1E membership retry canonicalizes scope order and prevents request-ID reuse',async()=>{
 const f=setup();try{
  const w=await f.world(),m=f.member(w.worldId,{editSections:['scenes','views']});
  assert.equal((await f.service.setCollaborator(req(),m)).ok,true);
  assert.equal((await f.service.setCollaborator(req(),{...m,editSections:['views','scenes']})).replayed,true);
  assert.equal((await f.service.setCollaborator(req(),{...m,memberUid:'other-editor'})).code,'idempotency-conflict');
  assert.equal(f.counts().access_events,1);
 }finally{f.close();}
});
test('G1E scope reduction and revocation take effect; contribution history survives revoke/regrant',async()=>{
 const f=setup();try{
  const w=await f.world();await f.service.setCollaborator(req(),f.member(w.worldId));
  const edit={worldId:w.worldId,expectedRevision:1,requestId:crypto.randomUUID(),patch:{scenes:[]}};
  await f.authoring.saveDraft(req(EDITOR),edit);
  await f.service.setCollaborator(req(),f.member(w.worldId,{expectedAccessRevision:2,editSections:['views']}));
  assert.equal((await f.authoring.saveDraft(req(EDITOR),edit)).ok,false);
  await f.service.setCollaborator(req(),f.member(w.worldId,{expectedAccessRevision:3,status:'revoked',editSections:[]}));
  assert.equal((await f.authoring.viewDraft(req(EDITOR),{worldId:w.worldId})).ok,false);
  await f.service.setCollaborator(req(),f.member(w.worldId,{expectedAccessRevision:4}));
  assert.equal((await f.authoring.viewDraft(req(EDITOR),{worldId:w.worldId})).ok,true);
  assert.equal(JSON.parse(f.rows('SELECT contributors_json FROM vg_authoring_worlds_v1')[0].contributors_json).includes(EDITOR),true);
 }finally{f.close();}
});
test('G1E former owner cannot replay access receipts after ownership changes',async()=>{
 const f=setup();try{
  const w=await f.world(),m=f.member(w.worldId);await f.service.setCollaborator(req(),m);
  f.sql.exec("UPDATE vg_authoring_worlds_v1 SET owner_uid='new-owner',access_revision=3");
  assert.equal((await f.service.setCollaborator(req(),m)).code,'forbidden');
 }finally{f.close();}
});
test('G1E ownership or revision change at final transaction entry invalidates access write',async()=>{
 for(const change of ["owner_uid='new-owner'",'access_revision=2']){
  const f=setup();try{
   const w=await f.world();f.hooks.before=()=>{f.hooks.before=null;f.sql.exec('UPDATE vg_authoring_worlds_v1 SET '+change);};
   assert.equal((await f.service.setCollaborator(req(),f.member(w.worldId))).ok,false);assert.equal(f.counts().members,0);
  }finally{f.close();}
 }
});
test('G1E failed creation rolls back header, draft, receipt and audit; retry succeeds',async()=>{
 for(const failure of ['INSERT INTO vg_authoring_drafts','INSERT INTO vg_authoring_operations','INSERT INTO vg_authoring_audit']){
  const f=setup();try{
   f.entitled();const data=createInput();f.hooks.fail=failure;
   assert.deepEqual(await f.service.createWorld(req(),data),{ok:false,code:'authoring-unavailable'});
   assert.equal(f.counts().worlds,0);assert.equal(f.counts().drafts,0);assert.equal(f.counts().audit,0);
   assert.equal((await f.service.createWorld(req(),data)).ok,true);
  }finally{f.close();}
 }
});
test('G1E failed membership mutation rolls back scope, access revision, event and receipt',async()=>{
 for(const failure of ['UPDATE vg_authoring_worlds','INSERT INTO vg_authoring_access_events','INSERT INTO vg_authoring_audit']){
  const f=setup();try{
   const w=await f.world(),m=f.member(w.worldId);f.hooks.fail=failure;
   assert.equal((await f.service.setCollaborator(req(),m)).code,'authoring-unavailable');
   assert.equal(f.counts().members,0);assert.equal(f.counts().access_events,0);assert.equal(f.counts().operations,1);
   assert.equal(f.rows('SELECT access_revision FROM vg_authoring_worlds_v1')[0].access_revision,1);
   assert.equal((await f.service.setCollaborator(req(),m)).ok,true);
  }finally{f.close();}
 }
});
test('G1E malformed memberships, unsafe revisions and self-escalation fields never write',async()=>{
 const f=setup();try{
  const w=await f.world();
  for(const overrides of [{editSections:[]},{editSections:['secretTruth']},{editSections:['scenes','scenes']},
   {status:'revoked'},{expectedAccessRevision:true},{expectedAccessRevision:0},{memberUid:'bad\nuid'},
   {status:'approved'},{admin:true},{roles:['owner']},{requestId:'not-uuid'}])
   assert.equal((await f.service.setCollaborator(req(),f.member(w.worldId,overrides))).ok,false);
  assert.equal(f.counts().members,0);
 }finally{f.close();}
});
test('G1E immutable access history is metadata only, without private story text',async()=>{
 const f=setup();try{
  const w=await f.world();await f.service.setCollaborator(req(),f.member(w.worldId));
  const text=JSON.stringify({events:f.rows('SELECT * FROM vg_authoring_access_events_v1'),audit:f.rows('SELECT * FROM vg_authoring_audit_v1'),receipts:f.rows('SELECT * FROM vg_authoring_operations_v1')});
  assert.equal(text.includes('Private world'),false);
  assert.throws(()=>f.sql.exec('DELETE FROM vg_authoring_access_events_v1'),/immutable-authoring-record/);
  assert.throws(()=>f.sql.exec("UPDATE vg_authoring_access_events_v1 SET status='active'"),/immutable-authoring-record/);
 }finally{f.close();}
});
test('G1E disk reopen preserves provisioning receipts and active scoped membership',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vg-provision-'));let f;
 try{
  const path=join(dir,'worlds.sqlite');f=setup(path);f.entitled();const data=createInput();
  const w=await f.service.createWorld(req(),data),m=f.member(w.worldId);await f.service.setCollaborator(req(),m);
  f.close();f=setup(path);assert.equal((await f.service.createWorld(req(),data)).replayed,true);
  assert.equal((await f.service.setCollaborator(req(),m)).replayed,true);
  assert.equal((await f.authoring.viewDraft(req(EDITOR),{worldId:w.worldId})).ok,true);assert.equal(f.counts().audit,2);
 }finally{f?.close();rmSync(dir,{recursive:true,force:true});}
});
test('G1E unknown-world access request never provisions a world or alters legacy player state',async()=>{
 const f=setup();try{
  f.sql.exec('CREATE TABLE legacy_player_test(uid TEXT,exp INTEGER)');f.sql.exec('INSERT INTO legacy_player_test VALUES(?,99)',OWNER);
  assert.equal((await f.service.setCollaborator(req(),f.member('unknown-world'))).ok,false);
  assert.equal(f.counts().worlds,0);assert.equal(f.rows('SELECT exp FROM legacy_player_test')[0].exp,99);
 }finally{f.close();}
});
