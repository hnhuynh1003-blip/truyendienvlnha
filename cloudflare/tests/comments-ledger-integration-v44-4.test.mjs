/* V44.4: real SQLite execution of registered story/chapter comment ledger.
 * No network, accounts or production records are contacted.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
let src=fs.readFileSync(new URL('../src/comments-v44-2.mjs',import.meta.url),'utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';",
  'class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env} }')
 .replace("'./comment-policy-v44-2.mjs'",JSON.stringify(
  new URL('../src/comment-policy-v44-2.mjs',import.meta.url).href));
const {DuduDiscussion}=await import('data:text/javascript,'+encodeURIComponent(src));
function setup(){
 const db=new DatabaseSync(':memory:');
 const sql={exec(query,...args){
  if(!args.length){
   if(/^\s*(SELECT|WITH|PRAGMA)/i.test(query))
    return {toArray:()=>db.prepare(query).all()};
   db.exec(query);return {toArray:()=>[]};
  }
  const stmt=db.prepare(query);
  if(/^\s*(SELECT|WITH)/i.test(query)){
   const result=stmt.all(...args);return {toArray:()=>result};
  }
  stmt.run(...args);return {toArray:()=>[]};
 }};
 const ctx={storage:{sql,transactionSync(fn){
  db.exec('BEGIN IMMEDIATE');
  try{const v=fn();db.exec('COMMIT');return v;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }}};
 const discussion=new DuduDiscussion(ctx,{});
 const entry=(requestId,text,other={})=>({
  requestId,storyId:'story-one',chapterId:'chapter-one',
  text,displayName:'Độc giả',parentId:null,...other
 });
 return {db,sql,discussion,entry};
}
const now=1760668800000;
test('V44.4 discussion DB: registration, chapter separation, UID-scoped reply notice',()=>{
 const x=setup();
 try{
  assert.equal(x.discussion.post(x.entry('r1','Lời bình mở đầu'),'uid1',now).code,'unknown-scope');
  assert.equal(x.discussion.register({storyId:'story-one',chapterIds:['chapter-one','chapter-two']},'admin',now).ok,true);
  assert.equal(x.discussion.post(x.entry('r1','Lời bình mở đầu'),'uid1',now).ok,true);
  assert.equal(x.discussion.list({storyId:'story-one',chapterId:'chapter-one'}).comments.length,1);
  assert.equal(x.discussion.list({storyId:'story-one',chapterId:'chapter-two'}).comments.length,0);
  const first=x.discussion.list({storyId:'story-one',chapterId:'chapter-one'}).comments[0];
  assert.ok(first.id);
  assert.equal(Object.hasOwn(first,'uid'),false);
  const answer=x.discussion.post(x.entry('r2','Tôi đồng ý',{
   parentId:first.id}),'uid2',now+3000);
  assert.equal(answer.ok,true);
  assert.equal(x.discussion.inbox('uid1').notifications.length,1);
  assert.equal(x.discussion.inbox('uid2').notifications.length,0);
  assert.equal(x.discussion.markRead('uid1').ok,true);
  assert.equal(x.discussion.inbox('uid1').notifications[0].read,1);
 }finally{x.db.close()}
});
test('V44.4 discussion DB: retry is idempotent and cannot replay another text',()=>{
 const x=setup();
 try{
  x.discussion.register({storyId:'story-one',chapterIds:['chapter-one']},'admin',now);
  const a=x.entry('same','Nội dung bất biến');
  const first=x.discussion.post(a,'uid1',now);
  const again=x.discussion.post(a,'uid1',now+20);
  assert.equal(first.ok,true);
  assert.equal(again.alreadyPosted,true);
  assert.equal(first.id,again.id);
  assert.equal(x.discussion.post({...a,text:'Đã chỉnh sửa'},'uid1',now+30).code,'idempotency-conflict');
  assert.equal(x.discussion.post(x.entry('second','Chưa hết thời gian'),'uid1',now+100).code,'cooldown');
  assert.equal(x.discussion.list({storyId:'story-one',chapterId:'chapter-one'}).comments.length,1);
 }finally{x.db.close()}
});
test('V44.4 discussion DB: wrong-scoped replies and duplicate reports blocked',()=>{
 const x=setup();
 try{
  x.discussion.register({storyId:'story-one',chapterIds:['chapter-one','chapter-two']},'admin',now);
  const first=x.discussion.post(x.entry('req1','Không tiết lộ phần sau'),'uid1',now);
  const wrong=x.discussion.post(x.entry('req2','Tôi cũng nghĩ vậy',{
   chapterId:'chapter-two',parentId:first.id}),'uid2',now+5000);
  assert.equal(wrong.code,'invalid-parent');
  const own=x.discussion.report({commentId:first.id,reason:'SPAM'},'uid1',now+10);
  assert.equal(own.code,'own-comment');
  const report=x.discussion.report({commentId:first.id,reason:'SPOILER'},'uid2',now+10000);
  assert.equal(report.ok,true);
  assert.equal(x.discussion.report({commentId:first.id,reason:'SPAM'},'uid2',now+12000).alreadyReported,true);
  assert.equal(x.discussion.reports().reports.length,1);
  x.discussion.moderate({commentId:first.id,hidden:true},'admin');
  assert.equal(x.discussion.list({storyId:'story-one',chapterId:'chapter-one'}).comments.length,0);
  x.discussion.moderate({commentId:first.id,hidden:false},'admin');
  assert.equal(x.discussion.list({storyId:'story-one',chapterId:'chapter-one'}).comments.length,1);
 }finally{x.db.close()}
});
