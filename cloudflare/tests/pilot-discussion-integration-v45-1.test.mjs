/* V45.1 integration: Worker HTTP + real SQLite discussion instances,
 * three SIGNED-UID-SHAPED test identities (JWT verifier stub ONLY).
 * No Firebase connections, Cloudflare deployment or production records.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {pilotAccess} from '../src/pilot-policy-v45.mjs';
import {scope,postBody,reportBody,moderatorBody,registerBody} from
 '../src/comment-policy-v44-2.mjs';

const discussionSource=fs.readFileSync(
 new URL('../src/comments-v44-2.mjs',import.meta.url),'utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';",
   'class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env} }')
 .replace("'./comment-policy-v44-2.mjs'",JSON.stringify(
   new URL('../src/comment-policy-v44-2.mjs',import.meta.url).href));
const {DuduDiscussion}=await import('data:text/javascript,'+
 encodeURIComponent(discussionSource));
const workerSource=fs.readFileSync(
 new URL('../src/index.mjs',import.meta.url),'utf8')
 .replace(/^import \{[\s\S]*?\} from '[^']+';\s*/gm,'')
 .replace(/^export \{[^}]+\} from '[^']+';\s*/gm,'')
 .replace('export default {','return {');
const verify=async req=>{
 const header=req.headers.get('Authorization')||'';
 if(!header.startsWith('Bearer stub-'))return null;
 const uid=header.slice('Bearer stub-'.length);
 return {uid,admin:uid==='author_123456'||uid==='reader_admin_123456'};
};
const worker=new Function('verifyFirebaseIdToken','pilotAccess','scope',
 'postBody','reportBody','moderatorBody','registerBody',
 'Headers','Response','URL','console',workerSource)(
 verify,pilotAccess,scope,postBody,reportBody,moderatorBody,registerBody,
 Headers,Response,URL,{warn:()=>{},error:()=>{}}
);
const baseEnv={
 PROJECT_ID:'truyendienvl',ALLOWED_ORIGIN:'https://hnhuynh1003-blip.github.io',
 PILOT_ENABLED:'true',PILOT_NAMESPACE:'v45-separate-qa',
 PILOT_READER_A_UID:'reader_a_123456',PILOT_READER_B_UID:'reader_b_123456',
 PILOT_AUTHOR_UID:'author_123456',COMMENTS_ENABLED:'true',
 GIFTS_ENABLED:'false',GIFT_SETTLEMENT_ENABLED:'false',
 PILOT_SETTLEMENT_ENABLED:'false'
};
function setup(){
 const stores=new Map(),dbs=[];
 const binding={getByName(key){
  if(!stores.has(key)){
   const db=new DatabaseSync(':memory:');dbs.push(db);
   const sql={exec(q,...params){
    if(!params.length){
     if(/^\s*(SELECT|WITH|PRAGMA)/i.test(q))
      return {toArray:()=>db.prepare(q).all()};
     db.exec(q);return {toArray:()=>[]};
    }
    const stmt=db.prepare(q);
    if(/^\s*(SELECT|WITH|PRAGMA)/i.test(q))
     return {toArray:()=>stmt.all(...params)};
    stmt.run(...params);return {toArray:()=>[]};
   }};
   const ctx={storage:{sql,transactionSync(action){
    db.exec('BEGIN IMMEDIATE');
    try{const result=action();db.exec('COMMIT');return result}
    catch(e){db.exec('ROLLBACK');throw e}
   }}};
   stores.set(key,new DuduDiscussion(ctx,{}));
  }
  return stores.get(key);
 }};
 return {stores,dbs,env:{...baseEnv,DUDU_DISCUSSION:binding},
  close:()=>dbs.forEach(db=>db.close())};
}
const req=(url,uid,body)=>{
 const method=body===undefined?'GET':'POST';
 return new Request('https://example.invalid'+url,{
  method,headers:{
   ...(uid?{Authorization:'Bearer stub-'+uid}:{}),
   ...(body===undefined?{}:{'Content-Type':'application/json'})
  },...(body===undefined?{}:{body:JSON.stringify(body)})
 });
};
async function call(env,url,uid,body){
 const response=await worker.fetch(req(url,uid,body),env);
 return {status:response.status,data:await response.json()};
}
test('V45.1 A and B exchange actual SQLite comments only inside pilot',async()=>{
 const x=setup();
 try{
  const author=baseEnv.PILOT_AUTHOR_UID,a=baseEnv.PILOT_READER_A_UID;
  const b=baseEnv.PILOT_READER_B_UID;
  const path='/v1/comments/list?storyId=story-01&chapterId=chapter-01';
  const before=await call(x.env,path,a);
  assert.equal(before.status,404,'unknown scopes cannot be published by reader');
  const registry=await call(x.env,'/v1/comments/admin/register',author,{
   storyId:'story-01',chapterIds:['chapter-01']
  });
  assert.equal(registry.status,200,'server-admin registry preparation');
  const message={storyId:'story-01',chapterId:'chapter-01',parentId:null,
   text:'Xin chào từ tài khoản A',requestId:'req_a_0001',
   displayName:'TÁC GIẢ TỰ XƯNG'};
  const first=await call(x.env,'/v1/comments/create',a,message);
  assert.equal(first.status,200);
  const replay=await call(x.env,'/v1/comments/create',a,message);
  assert.equal(replay.status,200);
  assert.equal(replay.data.alreadyPosted,true);
  const readB=await call(x.env,path,b);
  assert.equal(readB.status,200);
  assert.equal(readB.data.comments.length,1);
  assert.equal(readB.data.comments[0].text,message.text);
  assert.equal(readB.data.comments[0].name,'Độc giả A',
   'spoofed display name must be replaced with verified role');
  assert.equal(Object.hasOwn(readB.data.comments[0],'uid'),false);
  const reply=await call(x.env,'/v1/comments/create',b,{
   storyId:'story-01',chapterId:'chapter-01',
   parentId:first.data.id,text:'Độc giả B đã đọc!',requestId:'req_b_0001'
  });
  assert.equal(reply.status,200);
  const readA=await call(x.env,path,a);
  assert.equal(readA.data.comments.length,2);
  assert.equal(readA.data.comments[1].name,'Độc giả B');
  assert.equal(x.stores.size,1);
  assert.equal([...x.stores.keys()][0],'comments-pilot-v45-separate-qa');
 }finally{x.close()}
});
test('V45.1 outsiders, forged admin role and missing pilot gate cannot read/write',async()=>{
 const x=setup();
 try{
  const list='/v1/comments/list?storyId=story-01';
  assert.equal((await call(x.env,list,null)).status,401);
  assert.equal((await call(x.env,list,'stranger_123')).status,403);
  const forged=await call(x.env,'/v1/comments/admin/register',
   baseEnv.PILOT_READER_A_UID,{
    storyId:'story-01',chapterIds:['chapter-01'],admin:true
   });
  assert.equal(forged.status,403);
  assert.equal((await call({...x.env,PILOT_ENABLED:'false'},list,
    baseEnv.PILOT_READER_B_UID)).status,503);
  assert.equal(x.stores.size,0,'no forbidden attempt must open DO storage');
 }finally{x.close()}
});
test('V45.1 different namespace never sees previous Pilot comment data',async()=>{
 const x=setup();
 try{
  const author=baseEnv.PILOT_AUTHOR_UID,reader=baseEnv.PILOT_READER_A_UID;
  const path='/v1/comments/list?storyId=story-01';
  await call(x.env,'/v1/comments/admin/register',author,{
   storyId:'story-01',chapterIds:[]
  });
  const original=await call(x.env,'/v1/comments/create',reader,{
   storyId:'story-01',chapterId:null,parentId:null,
   text:'Chỉ dành cho vùng QA đầu tiên',requestId:'req_x_001'
  });
  assert.equal(original.status,200);
  const other={...x.env,PILOT_NAMESPACE:'v45-other-qa'};
  const isolated=await call(other,path,reader);
  assert.equal(isolated.status,404,'new namespace has independent registry');
  assert.equal(x.stores.size,2);
  assert.notEqual([...x.stores.keys()][0],[...x.stores.keys()][1]);
 }finally{x.close()}
});

test('V45.1 R2 reader with signed admin claim still cannot register or moderate Pilot',async()=>{
 const x=setup();
 try{
  const readerAdmin='reader_admin_123456';
  const custom={...x.env,PILOT_READER_B_UID:readerAdmin};
  const p=await call(custom,'/v1/pilot/status',readerAdmin);
  assert.equal(p.status,200);
  assert.equal(p.data.role,'READER_B');
  assert.equal(p.data.canManagePilot,false);
  assert.equal((await call(custom,'/v1/comments/admin/register',
   readerAdmin,{storyId:'story01',chapterIds:['ch01']})).status,403);
  assert.equal(x.stores.size,0);
  const signedAuthor=await call(custom,'/v1/pilot/status','author_123456');
  assert.equal(signedAuthor.status,200);
  assert.equal(signedAuthor.data.canManagePilot,true);
  const reader=await call(custom,'/v1/pilot/status','reader_a_123456');
  assert.equal(reader.data.canManagePilot,false);
 }finally{x.close()}
});
test('V45.1 R2 cross-UID reply inbox, report, moderation and namespace isolation',async()=>{
 const x=setup();
 try{
  const a=baseEnv.PILOT_READER_A_UID,b=baseEnv.PILOT_READER_B_UID;
  const author=baseEnv.PILOT_AUTHOR_UID;
  const scopePath='/v1/comments/list?storyId=pilot-story&chapterId=ch-01';
  assert.equal((await call(x.env,'/v1/comments/admin/register',author,{
   storyId:'pilot-story',chapterIds:['ch-01']
  })).status,200);
  const first=await call(x.env,'/v1/comments/create',a,{
   storyId:'pilot-story',chapterId:'ch-01',parentId:null,
   text:'Nội dung ban đầu',requestId:'ra-001'
  });
  assert.equal(first.status,200);
  const answered=await call(x.env,'/v1/comments/create',b,{
   storyId:'pilot-story',chapterId:'ch-01',
   parentId:first.data.id,text:'B phản hồi A',requestId:'rb-001'
  });
  assert.equal(answered.status,200);
  const inboxA=await call(x.env,'/v1/comments/inbox',a);
  assert.equal(inboxA.status,200);
  assert.equal(inboxA.data.notifications.length,1);
  const inboxB=await call(x.env,'/v1/comments/inbox',b);
  assert.equal(inboxB.data.notifications.length,0);
  assert.equal((await call(x.env,'/v1/comments/inbox/read',a,{})).status,200);
  assert.equal((await call(x.env,'/v1/comments/inbox',a)).data.notifications[0].read,1);
  const report=await call(x.env,'/v1/comments/report',a,
   {commentId:answered.data.id,reason:'SPOILER'});
  assert.equal(report.status,200);
  const duplicate=await call(x.env,'/v1/comments/report',a,
   {commentId:answered.data.id,reason:'SPOILER'});
  assert.equal(duplicate.data.alreadyReported,true);
  const reports=await call(x.env,'/v1/comments/admin/reports',author);
  assert.equal(reports.status,200);
  assert.equal(reports.data.reports.length,1);
  const denied=await call(x.env,'/v1/comments/admin/moderate',b,{
   commentId:answered.data.id,hidden:true
  });
  assert.equal(denied.status,403);
  const hidden=await call(x.env,'/v1/comments/admin/moderate',author,{
   commentId:answered.data.id,hidden:true
  });
  assert.equal(hidden.status,200);
  assert.equal((await call(x.env,scopePath,a)).data.comments.length,1);
  // The A notice points at hidden B comment and disappears when moderated.
  assert.equal((await call(x.env,'/v1/comments/inbox',a)).data.notifications.length,0);
  const revived=await call(x.env,'/v1/comments/admin/moderate',author,{
   commentId:answered.data.id,hidden:false
  });
  assert.equal(revived.status,200);
  assert.equal((await call(x.env,scopePath,a)).data.comments.length,2);
  const separate={...x.env,PILOT_NAMESPACE:'v45-second-room'};
  assert.equal((await call(separate,scopePath,a)).status,404);
  assert.equal(x.stores.size,2);
 }finally{x.close()}
});
