import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createAuthoringHttpHandler,AUTHORING_HTTP_MAX_BYTES} from '../src/vangioi-authoring-http.mjs';
import {createSqlRegistryService} from '../src/vangioi-registry.mjs';
import {content} from './fixtures/vangioi-content.mjs';
const ORIGIN='https://author.test',BASE='/api/vangioi/authoring/v1',OWNER='http-owner',EDITOR='http-editor';
function setup(){
 const db=new DatabaseSync(':memory:'),hooks={before:null,fail:null,verify:null};
 const sql={exec(q,...args){
  args=args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v);
  let rows=[];
  if(q.trim().startsWith('CREATE '))db.exec(q);
  else{const s=db.prepare(q);if((/^\s*SELECT\b/i.test(q)||/\bRETURNING\b/i.test(q)))rows=s.all(...args);else s.run(...args);}
  if(hooks.fail&&q.includes(hooks.fail)){hooks.fail=null;throw Error('SQL_PRIVATE_DIAGNOSTIC');}
  return {toArray:()=>rows};
 }};
 const storage={sql,transactionSync(fn){hooks.before?.();db.exec('BEGIN IMMEDIATE');
  try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const options={storage,projectId:'truyendienvl',allowedOrigins:[ORIGIN],now:()=>1000,
  verify:async request=>{
   if(hooks.verify)return hooks.verify(request);
   const token=request.headers.get('authorization')?.slice(7);
   return token&&token!=='guest'?{uid:token,admin:true,canEditStories:true}:null;
  }};
 const handle=createAuthoringHttpHandler(options);
 const request=(path,method='GET',data,user=OWNER,headers={})=>new Request(ORIGIN+BASE+path,{
  method,headers:{Origin:ORIGIN,Authorization:'Bearer '+user,...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},
  ...(data===undefined?{}:{body:typeof data==='string'?data:JSON.stringify(data)})});
 const call=async(...args)=>{const response=await handle(request(...args));return {status:response.status,data:await response.json(),headers:response.headers};};
 const rows=(q,...args)=>sql.exec(q,...args).toArray();
 const entitled=(user=OWNER)=>sql.exec("INSERT INTO vg_authoring_entitlements_v1 VALUES(?,'active',1,1)",user);
 const create=async(c={schemaVersion:'world-content-1',title:'Private',story:{secretTruth:'HTTP_PRIVATE_TRUTH'},scenes:[]})=>{
  entitled();const r=await call('/worlds','POST',{requestId:crypto.randomUUID(),content:c});assert.equal(r.status,200);return r.data.worldId;
 };
 function registry(worldId,c){
  const s=c.storySource;
  sql.exec('INSERT INTO vg_authoring_source_versions_v1 VALUES(?,?,?,?)',s.kind,s.storyId,s.storyVersion,s.contentHash);
  sql.exec("INSERT INTO vg_authoring_source_grants_v1 VALUES(?,?,?,?,'active',1)",worldId,s.kind,s.storyId,s.storyVersion);
  for(const a of c.assets){
   sql.exec('INSERT INTO vg_authoring_asset_versions_v1 VALUES(?,?,?,?)',a.assetId,a.assetVersion,a.contentHash,a.kind);
   sql.exec("INSERT INTO vg_authoring_asset_grants_v1 VALUES(?,?,?,'active',1,'pending','original','Synthetic fixture',NULL)",worldId,a.assetId,a.assetVersion);
  }
 }
 const membership=(w,user,role='reviewer',sections=[])=>sql.exec("INSERT INTO vg_authoring_members_v1 VALUES(?,?,'active',?,?)",w,user,JSON.stringify([role]),JSON.stringify(sections));
 return {handle,call,request,rows,sql,hooks,options,entitled,create,registry,membership,close:()=>db.close()};
}
const edit=(overrides={})=>({requestId:crypto.randomUUID(),expectedRevision:1,patch:{title:'Edited'},...overrides});

test('G1K HTTP creates, saves, replays and reads an actual SQL draft',async()=>{
 const f=setup();try{
  const w=await f.create(),input=edit();
  const r=await f.call(`/worlds/${w}/draft`,'PATCH',input);assert.equal(r.status,200);assert.equal(r.data.revision,2);
  assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',input)).data.replayed,true);
  const view=await f.call(`/worlds/${w}/draft`);assert.equal(view.data.content.title,'Edited');
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_drafts_v1')[0].n,2);
  assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',edit())).status,409);
  assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',{...input,patch:{title:'Other'}})).data.code,'idempotency-conflict');
 }finally{f.close();}
});
test('G1K bearer identity is required and admin/client headers do not grant AU entitlement',async()=>{
 const f=setup();try{
  const data={requestId:crypto.randomUUID(),content:{title:'Draft'}};
  for(const authorization of ['', 'Basic anything','Bearer guest','Bearer a b']){
   const r=await f.call('/worlds','POST',data,OWNER,{Authorization:authorization,'X-Owner-Uid':OWNER,'X-Admin':'true'});
   assert.equal(r.status,401);
  }
  assert.equal((await f.call('/worlds','POST',data)).status,403);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_worlds_v1')[0].n,0);
 }finally{f.close();}
});
test('G1K HTTP collaborator scopes, revocation and private-world enumeration',async()=>{
 const f=setup();try{
  const w=await f.create();
  const grant={requestId:crypto.randomUUID(),expectedAccessRevision:1,memberUid:EDITOR,status:'active',editSections:['scenes']};
  assert.equal((await f.call(`/worlds/${w}/collaborators`,'PUT',grant)).status,200);
  const scoped=await f.call(`/worlds/${w}/draft`,'GET',undefined,EDITOR);
  assert.deepEqual(scoped.data.content,{scenes:[]});assert.equal(JSON.stringify(scoped.data).includes('HTTP_PRIVATE_TRUTH'),false);
  assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',edit(),EDITOR)).status,403);
  assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',edit({patch:{scenes:[]}}),EDITOR)).status,200);
  assert.equal((await f.call(`/worlds/${w}/collaborators`,'PUT',{...grant,requestId:crypto.randomUUID(),expectedAccessRevision:2,status:'revoked',editSections:[]})).status,200);
  const denied=await f.call(`/worlds/${w}/draft`,'GET',undefined,EDITOR);
  assert.equal(denied.status,403);
  assert.deepEqual(denied.data,(await f.call('/worlds/world-absent/draft','GET',undefined,EDITOR)).data);
 }finally{f.close();}
});
test('G1K URL identity and server metadata cannot be supplied through body or query',async()=>{
 const f=setup();try{
  const w=await f.create();
  for(const extra of [{worldId:w},{forReview:true},{snapshotHash:'a'.repeat(64)}])
   assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',{...edit(),...extra})).status,400);
  for(const patch of [{ownerUid:EDITOR},{officialWorldRank:'S'},{status:'approved'}])
   assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',edit({patch}))).status,400);
  assert.equal((await f.call(`/worlds/${w}/draft?uid=${OWNER}`)).status,400);
  assert.equal(f.rows('SELECT draft_revision FROM vg_authoring_worlds_v1')[0].draft_revision,1);
 }finally{f.close();}
});
test('G1K real validator submission locks snapshot; independent review read is distinct from approval',async()=>{
 const f=setup();try{
  const c=content(),w=await f.create(c);f.registry(w,c);
  f.membership(w,'http-reviewer');f.membership(w,EDITOR,'collaborator',['scenes']);
  const data={requestId:crypto.randomUUID(),expectedRevision:1};
  const submitted=await f.call(`/worlds/${w}/submissions`,'POST',data);
  assert.equal(submitted.status,200);const hash=submitted.data.snapshotHash;
  assert.match(hash,/^[a-f0-9]{64}$/);
  assert.equal((await f.call(`/worlds/${w}/submissions`,'POST',data)).data.replayed,true);
  const path=`/worlds/${w}/submissions/${hash}`;
  const review=await f.call(path+'/review','GET',undefined,'http-reviewer');
  assert.equal(review.status,200);assert.equal(review.data.snapshot.content.story.secretTruth,c.story.secretTruth);
  assert.equal((await f.call(path+'/review')).status,403);
  assert.equal((await f.call(path+'/review','GET',undefined,EDITOR)).status,403);
  const scoped=await f.call(path,'GET',undefined,EDITOR);assert.deepEqual(Object.keys(scoped.data.content),['scenes']);
  assert.equal((await f.call(`/worlds/${w}/draft`,'GET',undefined,'http-reviewer')).status,403);
  assert.equal((await f.call(`/worlds/${w}/draft`,'PATCH',edit())).status,403);
  assert.equal((await f.call(path+'/review','POST',{} , 'http-reviewer')).status,405);
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'submitted');
 }finally{f.close();}
});
test('G1K incomplete content and missing source grant cannot submit',async()=>{
 const f=setup();try{
  const w=await f.create(content());
  const r=await f.call(`/worlds/${w}/submissions`,'POST',{requestId:crypto.randomUUID(),expectedRevision:1});
  assert.equal(r.status,422);assert.equal(r.data.code,'content-not-ready');
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_submissions_v1')[0].n,0);
 }finally{f.close();}
});
test('G1K exact HTTPS origins, preflight and no ambient cookie authentication',async()=>{
 const f=setup();try{
  assert.throws(()=>createAuthoringHttpHandler({...f.options,allowedOrigins:['*']}));
  assert.throws(()=>createAuthoringHttpHandler({...f.options,allowedOrigins:['https://author.test/path']}));
  for(const origin of ['null','https://author.test.evil','https://evil.test']){
   const r=await f.call('/worlds','POST',{},OWNER,{Origin:origin});assert.equal(r.status,403);
   assert.equal(r.headers.has('access-control-allow-origin'),false);
  }
  const response=await f.handle(f.request('/worlds','OPTIONS',undefined,OWNER,{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization, content-type'}));
  assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),ORIGIN);
  assert.equal(response.headers.has('access-control-allow-credentials'),false);
  assert.equal((await f.call('/worlds','OPTIONS',undefined,OWNER,{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-admin'})).status,403);
  assert.equal((await f.call('/worlds','POST',{},OWNER,{Authorization:'',Cookie:'admin=true'})).status,401);
 }finally{f.close();}
});
test('G1K strict routing, method restrictions and response privacy headers',async()=>{
 const f=setup();try{
  for(const path of ['/worlds/','/worlds/%77orld-test/draft','/entitlements','/registry','/worlds/world-test/publish'])
   assert.equal((await f.call(path)).status,404);
  const r=await f.call('/worlds','DELETE',{});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'POST, OPTIONS');
  assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 }finally{f.close();}
});
test('G1K JSON/media/UTF-8/envelope and byte limits fail without any write',async()=>{
 const f=setup();try{
  for(const text of ['{','null','[]','42'])assert.equal((await f.call('/worlds','POST',text)).status,400);
  assert.equal((await f.call('/worlds','POST','{}',OWNER,{'Content-Type':'text/plain'})).status,415);
  assert.equal((await f.call('/worlds','POST','{}',OWNER,{'Content-Encoding':'gzip'})).status,415);
  assert.equal((await f.call('/worlds','POST','{}',OWNER,{'Content-Length':'3'})).status,400);
  assert.equal((await f.call('/worlds','POST','{}',OWNER,{'Content-Length':String(AUTHORING_HTTP_MAX_BYTES+1)})).status,413);
  assert.equal((await f.call('/worlds','POST','"'+'ấ'.repeat(Math.ceil(AUTHORING_HTTP_MAX_BYTES/3))+'"')).status,413);
  const invalid=new Request(ORIGIN+BASE+'/worlds',{method:'POST',headers:{Authorization:'Bearer '+OWNER,'Content-Type':'application/json'},body:new Uint8Array([123,34,0xff,34,58,49,125])});
  assert.equal((await f.handle(invalid)).status,400);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_worlds_v1')[0].n,0);
 }finally{f.close();}
});
test('G1K streamed payload is bounded before parse and oversized stream gets cancelled',async()=>{
 const f=setup();try{
  let cancelled=false;
  const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(65536));},cancel(){cancelled=true;}});
  const request=new Request(ORIGIN+BASE+'/worlds',{method:'POST',duplex:'half',headers:{Authorization:'Bearer '+OWNER,'Content-Type':'application/json','Content-Length':'1'},body:stream});
  const r=await f.handle(request);assert.equal(r.status,413);assert.equal(cancelled,true);
 }finally{f.close();}
});
test('G1K invalid identity is rejected before body consumption; verifier exceptions stay private',async()=>{
 const f=setup();try{
  let pulls=0;
  const stream=new ReadableStream({pull(c){pulls++;c.enqueue(new Uint8Array([123]));}},{highWaterMark:0});
  const req=new Request(ORIGIN+BASE+'/worlds',{method:'POST',duplex:'half',headers:{Authorization:'Bearer guest','Content-Type':'application/json'},body:stream});
  assert.equal((await f.handle(req)).status,401);assert.equal(pulls,0);await req.body.cancel();
  f.hooks.verify=()=>{throw Error('SECRET_AUTH_DIAGNOSTIC');};
  const r=await f.call('/worlds','POST',{});assert.deepEqual(r.data,{ok:false,code:'authoring-unavailable'});assert.equal(r.status,503);
 }finally{f.close();}
});
test('G1K permission revocation at commit and transaction failure never yield success',async()=>{
 const f=setup();try{
  const w=await f.create();f.membership(w,EDITOR,'collaborator',['scenes']);
  f.hooks.before=()=>{f.hooks.before=null;f.sql.exec("UPDATE vg_authoring_members_v1 SET status='revoked'");};
  const revoked=await f.call(`/worlds/${w}/draft`,'PATCH',edit({patch:{scenes:[]}}),EDITOR);assert.equal(revoked.status,403);
  f.hooks.fail='INSERT INTO vg_authoring_audit';
  const failed=await f.call(`/worlds/${w}/draft`,'PATCH',edit());assert.equal(failed.status,503);
  assert.equal(JSON.stringify(failed.data).includes('SQL_PRIVATE'),false);
  assert.equal(f.rows('SELECT draft_revision FROM vg_authoring_worlds_v1')[0].draft_revision,1);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_drafts_v1')[0].n,1);
 }finally{f.close();}
});
test('G1K transport stays isolated from live Worker, bindings and frontend submission',()=>{
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.equal(worker.includes('vangioi-authoring-http'),false);
});

async function reviewFixture(f){
 const c=content(),w=await f.create(c);f.registry(w,c);
 f.membership(w,'reviewer-one');f.membership(w,'reviewer-two');f.membership(w,EDITOR,'collaborator',['scenes']);
 const r=await f.call(`/worlds/${w}/submissions`,'POST',{requestId:crypto.randomUUID(),expectedRevision:1});
 assert.equal(r.status,200);
 const hash=r.data.snapshotHash,path=`/worlds/${w}/submissions/${hash}`;
 const decision=(overrides={})=>({requestId:crypto.randomUUID(),expectedRevision:1,expectedAccessRevision:1,
  decision:'approve',note:'Synthetic content checked; no publication permission.',...overrides});
 const reopen=(overrides={})=>({requestId:crypto.randomUUID(),expectedRevision:1,expectedAccessRevision:1,...overrides});
 return {w,c,hash,path,decision,reopen};
}
test('G1L approval pins snapshot, stores immutable decision/audit and replay does not repeat writes',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f),data=x.decision();
  const r=await f.call(x.path+'/decisions','POST',data,'reviewer-one');
  assert.equal(r.status,200);assert.equal(r.data.state,'approved');
  assert.equal((await f.call(x.path+'/decisions','POST',data,'reviewer-one')).data.replayed,true);
  const row=f.rows('SELECT * FROM vg_authoring_reviews_v1')[0];
  assert.equal(row.snapshot_hash,x.hash);assert.equal(row.validator_version,'world-content-1-semantic-2');
  assert.throws(()=>f.sql.exec("UPDATE vg_authoring_reviews_v1 SET note='tampered'"),/immutable/);
  assert.throws(()=>f.sql.exec('DELETE FROM vg_authoring_reviews_v1'),/immutable/);
  const view=await f.call(x.path+'/decisions');assert.equal(view.data.review.note,data.note);
  assert.equal((await f.call(x.path+'/decisions','GET',undefined,EDITOR)).status,403);
  assert.equal((await f.call(x.path+'/decisions','GET',undefined,'stranger')).status,403);
  assert.equal(f.rows("SELECT count(*) n FROM vg_authoring_audit_v1 WHERE action='review_submission'")[0].n,1);
  assert.equal((await f.call(x.path+'/decisions','POST',{...data,note:'Changed'},'reviewer-one')).status,409);
 }finally{f.close();}
});
test('G1L request changes stays locked until owner reopens a new revision and resubmits',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f),data=x.decision({decision:'request_changes',note:'Revise the ending.'});
  assert.equal((await f.call(x.path+'/decisions','POST',data,'reviewer-one')).data.state,'inReview');
  assert.equal((await f.call(`/worlds/${x.w}/draft`,'PATCH',edit())).status,403);
  assert.equal((await f.call(x.path+'/decisions','POST',x.decision(),'reviewer-two')).data.code,'review-conflict');
  const reopen=x.reopen();const opened=await f.call(x.path+'/reopen','POST',reopen);
  assert.equal(opened.status,200);assert.equal(opened.data.revision,2);
  assert.equal((await f.call(x.path+'/reopen','POST',reopen)).data.replayed,true);
  assert.equal((await f.call(x.path+'/review','GET',undefined,'reviewer-one')).status,403);
  assert.equal((await f.call(x.path+'/decisions')).data.review.decision,'request_changes');
  assert.equal((await f.call(`/worlds/${x.w}/draft`)).data.content.story.secretTruth,x.c.story.secretTruth);
  assert.equal((await f.call(`/worlds/${x.w}/draft`,'PATCH',edit({expectedRevision:2}))).status,200);
  const next=await f.call(`/worlds/${x.w}/submissions`,'POST',{requestId:crypto.randomUUID(),expectedRevision:3});
  assert.equal(next.status,200);assert.notEqual(next.data.snapshotHash,x.hash);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_submissions_v1')[0].n,2);
  assert.equal((await f.call(x.path+'/decisions','POST',x.decision(),'reviewer-two')).status,409);
 }finally{f.close();}
});
test('G1L reviewer must be independent of owner, collaborators and past contributors',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f);f.membership(x.w,OWNER);
  f.membership(x.w,'former-author');
  f.sql.exec('UPDATE vg_authoring_worlds_v1 SET contributors_json=?',JSON.stringify([OWNER,'former-author']));
  for(const user of [OWNER,EDITOR,'former-author','stranger','guest']){
   const r=await f.call(x.path+'/decisions','POST',x.decision(),user);assert.equal(r.status,user==='guest'?401:403);
  }
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_reviews_v1')[0].n,0);
 }finally{f.close();}
});
test('G1L only owner may reopen and all workflow pins and exact fields are required',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f);
  for(const user of [EDITOR,'reviewer-one','stranger'])assert.equal((await f.call(x.path+'/reopen','POST',x.reopen(),user)).status,403);
  for(const extra of [{expectedRevision:2},{expectedAccessRevision:2}])
   assert.equal((await f.call(x.path+'/reopen','POST',x.reopen(extra))).status,409);
  for(const extra of [{decision:'publish'},{note:''},{officialWorldRank:'S'},{note:'x'.repeat(4001)},{expectedAccessRevision:0}])
   assert.equal((await f.call(x.path+'/decisions','POST',x.decision(extra),'reviewer-one')).status,400);
  assert.equal((await f.call(`/worlds/${x.w}/submissions/${'f'.repeat(64)}/reopen`,'POST',x.reopen())).status,409);
 }finally{f.close();}
});
test('G1L concurrent decisions commit exactly one result and losing reviewer receives conflict',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f);
  const rs=await Promise.all(['reviewer-one','reviewer-two'].map(user=>f.call(x.path+'/decisions','POST',x.decision(),user)));
  assert.equal(rs.filter(r=>r.status===200).length,1);assert.equal(rs.filter(r=>r.status===409||r.status===403).length,1);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_reviews_v1')[0].n,1);
 }finally{f.close();}
});
test('G1L concurrent identical decision retries return the same receipt',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f),data=x.decision();
  const rs=await Promise.all([f.call(x.path+'/decisions','POST',data,'reviewer-one'),f.call(x.path+'/decisions','POST',data,'reviewer-one')]);
  assert.equal(rs.every(r=>r.status===200),true);assert.equal(rs.filter(r=>r.data.replayed).length,1);
 }finally{f.close();}
});
test('G1L reviewer revocation and access revision changes at commit block decisions',async()=>{
 for(const change of ["UPDATE vg_authoring_members_v1 SET status='revoked' WHERE uid='reviewer-one'",
  'UPDATE vg_authoring_worlds_v1 SET access_revision=2']){
  const f=setup();try{
   const x=await reviewFixture(f);let count=0;
   f.hooks.before=()=>{if(++count===2){f.hooks.before=null;f.sql.exec(change);}};
   const r=await f.call(x.path+'/decisions','POST',x.decision(),'reviewer-one');assert.ok([403,409].includes(r.status));
   assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_reviews_v1')[0].n,0);
  }finally{f.close();}
 }
});
test('G1L approval revalidates registry rights and commit rechecks dependencies',async()=>{
 for(const during of [false,true]){
  const f=setup();try{
   const x=await reviewFixture(f);
   const revoke=()=>f.sql.exec("UPDATE vg_authoring_asset_grants_v1 SET status='revoked',grant_revision=2");
   if(!during)revoke();else{let count=0;f.hooks.before=()=>{if(++count===2){f.hooks.before=null;revoke();}};}
   const r=await f.call(x.path+'/decisions','POST',x.decision(),'reviewer-one');assert.equal(r.status,during?409:422);
   assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_reviews_v1')[0].n,0);
  }finally{f.close();}
 }
});
test('G1L failed decision audit rolls back header, decision and receipt together',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f);f.hooks.fail='INSERT INTO vg_authoring_audit';
  assert.equal((await f.call(x.path+'/decisions','POST',x.decision(),'reviewer-one')).status,503);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_reviews_v1')[0].n,0);
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'submitted');
  assert.equal(f.rows("SELECT count(*) n FROM vg_authoring_operations_v1 WHERE action='review_submission'")[0].n,0);
 }finally{f.close();}
});
test('G1L reopening approved content invalidates current approval but retains old immutable history',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f),decision=x.decision();
  assert.equal((await f.call(x.path+'/decisions','POST',decision,'reviewer-one')).status,200);
  const opened=await f.call(x.path+'/reopen','POST',x.reopen());assert.equal(opened.data.state,'draft');
  const replay=await f.call(x.path+'/decisions','POST',decision,'reviewer-one');assert.equal(replay.data.replayed,true);
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'draft');
  assert.equal(f.rows('SELECT draft_revision FROM vg_authoring_worlds_v1')[0].draft_revision,2);
  f.sql.exec("UPDATE vg_authoring_members_v1 SET status='revoked' WHERE uid='reviewer-one'");
  assert.equal((await f.call(x.path+'/decisions','POST',decision,'reviewer-one')).status,403);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_submissions_v1')[0].n,1);
 }finally{f.close();}
});
test('G1L failed reopen rolls back new draft while preserving the approved snapshot',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f);await f.call(x.path+'/decisions','POST',x.decision(),'reviewer-one');
  f.hooks.fail='INSERT INTO vg_authoring_audit';
  assert.equal((await f.call(x.path+'/reopen','POST',x.reopen())).status,503);
  assert.equal(f.rows('SELECT draft_state FROM vg_authoring_worlds_v1')[0].draft_state,'approved');
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_drafts_v1')[0].n,1);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_submissions_v1')[0].n,1);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_reviews_v1')[0].n,1);
 }finally{f.close();}
});
test('G1L concurrent owner reopen requests create only one revision; receipt replay stays historical',async()=>{
 const f=setup();try{
  const x=await reviewFixture(f),data=x.reopen();
  const rs=await Promise.all([f.call(x.path+'/reopen','POST',data),f.call(x.path+'/reopen','POST',data)]);
  assert.equal(rs.every(r=>r.status===200),true);assert.equal(rs.filter(r=>r.data.replayed).length,1);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_drafts_v1')[0].n,2);
  const next=await f.call(`/worlds/${x.w}/draft`,'PATCH',edit({expectedRevision:2}));assert.equal(next.data.revision,3);
  assert.equal((await f.call(x.path+'/reopen','POST',data)).data.revision,2);
  assert.equal(f.rows('SELECT draft_revision FROM vg_authoring_worlds_v1')[0].draft_revision,3);
 }finally{f.close();}
});

async function sourceHttpFixture(f){
 const w=await f.create(),service=createSqlRegistryService(f.options);
 f.sql.exec("INSERT INTO vg_authoring_registry_operators_v1 VALUES('source-operator','active')");
 const source=await service.registerSource(f.request('/unused','GET',undefined,'source-operator'),{
  requestId:crypto.randomUUID(),kind:'library',storyId:'existing-story',storyVersion:'v1',authorizedUid:OWNER,
  license:'original',sourceNote:'Synthetic operator attestation',proofRef:null,
  payload:{format:'story-source-1',title:'Private title',chapters:[
   {chapterId:'chapter-10',title:'First',text:'PRIVATE_CHAPTER_FIRST'},
   {chapterId:'chapter-2',title:'Second',text:'PRIVATE_CHAPTER_SECOND'}]}});
 assert.equal(source.ok,true);
 assert.equal((await service.setSourceGrant(f.request('/unused'),{worldId:w,requestId:crypto.randomUUID(),expectedAccessRevision:1,
  expectedGrantRevision:0,reference:source.reference,status:'active'})).ok,true);
 return {w,service,reference:source.reference,path:`/worlds/${w}/sources`,
  range:{reference:source.reference,startChapterId:'chapter-10',endChapterId:'chapter-2'}};
}
test('G1P authenticated HTTP discovers registry source, reads manifest and exact ordered range without writes',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f),before=f.rows('SELECT count(*) n FROM vg_authoring_registry_events_v1')[0].n;
  const list=await f.call(x.path+'/query','POST',{after:''});assert.equal(list.status,200);assert.deepEqual(list.data.sources[0].reference,x.reference);
  assert.equal(JSON.stringify(list.data).includes('PRIVATE_CHAPTER'),false);
  const manifest=await f.call(x.path+'/manifest','POST',{reference:x.reference});assert.equal(manifest.status,200);
  assert.deepEqual(manifest.data.manifest.chapters.map(c=>c.chapterId),['chapter-10','chapter-2']);
  assert.equal(JSON.stringify(manifest.data).includes('PRIVATE_CHAPTER'),false);
  const range=await f.call(x.path+'/range','POST',x.range);assert.equal(range.status,200);
  assert.deepEqual(range.data.chapters.map(c=>c.text),['PRIVATE_CHAPTER_FIRST','PRIVATE_CHAPTER_SECOND']);
  assert.equal(f.rows('SELECT count(*) n FROM vg_authoring_registry_events_v1')[0].n,before);
  for(const r of [list,manifest,range]){
   assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
   assert.equal(r.headers.get('access-control-allow-origin'),ORIGIN);
  }
 }finally{f.close();}
});
test('G1P HTTP denies guest, collaborator, reviewer, operator and forged admin access to source bodies',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f);f.membership(x.w,EDITOR,'collaborator',['storySource']);f.membership(x.w,'reviewer');
  for(const user of ['guest',EDITOR,'reviewer','source-operator','stranger'])for(const [endpoint,data]of [
   ['query',{after:''}],['manifest',{reference:x.reference}],['range',x.range]]){
   const r=await f.call(x.path+'/'+endpoint,'POST',data,user,{'X-Admin':'true','X-Owner-Uid':OWNER});
   assert.equal(r.status,user==='guest'?401:403);assert.equal(JSON.stringify(r.data).includes('PRIVATE_'),false);
  }
 }finally{f.close();}
});
test('G1P HTTP URL identity, exact envelopes, pins and methods cannot be smuggled through input',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f);
  for(const [endpoint,data]of [['query',{after:''}],['manifest',{reference:x.reference}],['range',x.range]]){
   assert.equal((await f.call(x.path+'/'+endpoint,'GET')).status,405);
   for(const extra of [{worldId:x.w},{uid:OWNER},{approved:true},{forReview:true},{snapshotHash:'a'.repeat(64)}])
    assert.equal((await f.call(x.path+'/'+endpoint,'POST',{...data,...extra})).status,400);
   assert.equal((await f.call(x.path+'/'+endpoint+'?uid='+OWNER,'POST',data)).status,400);
  }
  assert.equal((await f.call(x.path+'/manifest','POST',{reference:{...x.reference,contentHash:'f'.repeat(64)}})).status,403);
  assert.equal((await f.call(x.path+'/range','POST',{...x.range,startChapterId:'chapter-2',endChapterId:'chapter-10'})).status,422);
  assert.equal((await f.call(x.path+'/range','POST',{...x.range,endChapterId:'missing'})).data.code,'invalid-chapter-range');
 }finally{f.close();}
});
test('G1P HTTP source grant revocation blocks reads and removes discovery',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f);
  await x.service.setSourceGrant(f.request('/unused'),{worldId:x.w,requestId:crypto.randomUUID(),expectedAccessRevision:1,
   expectedGrantRevision:1,reference:x.reference,status:'revoked'});
  assert.deepEqual((await f.call(x.path+'/query','POST',{after:''})).data.sources,[]);
  assert.equal((await f.call(x.path+'/manifest','POST',{reference:x.reference})).status,403);
  assert.equal((await f.call(x.path+'/range','POST',x.range)).status,403);
 }finally{f.close();}
});
test('G1P HTTP rechecks source rights while hash yields, before returning private range',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f);await f.call(x.path+'/query','POST',{after:''});let count=0;
  f.hooks.before=()=>{if(++count===2){f.hooks.before=null;f.sql.exec("UPDATE vg_authoring_source_grants_v1 SET status='revoked',grant_revision=2");}};
  const r=await f.call(x.path+'/range','POST',x.range);assert.equal(r.status,403);assert.equal(JSON.stringify(r.data).includes('PRIVATE_'),false);
 }finally{f.close();}
});
test('G1P HTTP source routes retain media, byte, Origin and preflight restrictions',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f);
  assert.equal((await f.call(x.path+'/manifest','POST',{},OWNER,{Origin:'https://evil.test'})).status,403);
  assert.equal((await f.call(x.path+'/manifest','POST','{}',OWNER,{'Content-Type':'text/plain'})).status,415);
  assert.equal((await f.call(x.path+'/range','POST','{}',OWNER,{'Content-Length':String(AUTHORING_HTTP_MAX_BYTES+1)})).status,413);
  const response=await f.handle(f.request(x.path+'/query','OPTIONS',undefined,OWNER,{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization, content-type'}));
  assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-methods'),'POST');
  assert.equal((await f.call(`/worlds/${x.w}/sources/register`,'POST',{})).status,404);
  assert.equal((await f.call(`/worlds/${x.w}/sources/grant`,'POST',{})).status,404);
 }finally{f.close();}
});
test('G1P HTTP hides registry/storage errors and reports payload integrity failure without bytes',async()=>{
 const f=setup();try{
  const x=await sourceHttpFixture(f);f.hooks.fail='FROM vg_authoring_registry_objects_v1 o';
  const r=await f.call(x.path+'/query','POST',{after:''});assert.equal(r.status,503);
  assert.equal(JSON.stringify(r.data).includes('SQL_PRIVATE'),false);
  // Insert corrupt payload fixture with matching declared reference is impossible via service;
  // exercise the existing byte integrity guard by replacing storage reads in this test only.
  const original=f.options.storage.sql.exec;
  f.options.storage.sql.exec=(q,...args)=>q.includes('SELECT * FROM vg_authoring_registry_payloads_v1')?
   {toArray:()=>[{payload:new TextEncoder().encode('{}'),media_type:'application/json'}]}:original(q,...args);
  const bad=await f.call(x.path+'/manifest','POST',{reference:x.reference});assert.equal(bad.status,409);
  assert.deepEqual(bad.data,{ok:false,code:'payload-integrity-conflict'});
 }finally{f.close();}
});
