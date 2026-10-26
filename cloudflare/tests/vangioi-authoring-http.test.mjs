import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createAuthoringHttpHandler,AUTHORING_HTTP_MAX_BYTES} from '../src/vangioi-authoring-http.mjs';
import {content} from './fixtures/vangioi-content.mjs';
const ORIGIN='https://author.test',BASE='/api/vangioi/authoring/v1',OWNER='http-owner',EDITOR='http-editor';
function setup(){
 const db=new DatabaseSync(':memory:'),hooks={before:null,fail:null,verify:null};
 const sql={exec(q,...args){
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
