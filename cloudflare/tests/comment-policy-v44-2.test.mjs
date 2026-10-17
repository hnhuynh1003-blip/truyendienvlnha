import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {COMMENT_LIMITS,scope,postBody,reportBody,moderatorBody,registerBody}
 from '../src/comment-policy-v44-2.mjs';
const req={storyId:'story-1',chapterId:'chapter-1',requestId:'unique-1',
 text:'Cảm ơn chương truyện này!',parentId:null,displayName:'Độc giả'};
const file=p=>fs.readFileSync(path.join(import.meta.dirname,'..',p),'utf8');
test('V44.2 server: accept bounded public comment fields without user role or gift payload',()=>{
 assert.deepEqual(postBody(req),req);
 assert.equal(COMMENT_LIMITS.maxText,600);
 for(const bad of [
  {...req,uid:'victim'}, {...req,ownerUid:'victim'},
  {...req,recipientUid:'victim'}, {...req,isAdmin:true},
  {...req,attachment:{id:'some-item'}},{...req,giftId:'shop-x'},
  {...req,text:'x'}, {...req,text:'x'.repeat(601)},
  {...req,text:'a\u0000b'},{...req,requestId:'weird request id'},
  {...req,storyId:'story space'},
  {...req,displayName:'n'.repeat(60)}
 ])assert.equal(postBody(bad),null);
 assert.equal(postBody({...req,chapterId:null}).chapterId,null);
 assert.equal(postBody({...req,parentId:'reply-1'}).parentId,'reply-1');
});
test('V44.2 server: only exact, explicitly registered story/chapter scope',()=>{
 assert.deepEqual(scope({storyId:'story-1'}),{storyId:'story-1',chapterId:null});
 assert.equal(scope({storyId:'story 1'}),null);
 assert.equal(scope({storyId:'story-1',chapterId:'chapter x'}),null);
 assert.deepEqual(registerBody({storyId:'story-1',chapterIds:['c1','c2']}),
  {storyId:'story-1',chapterIds:['c1','c2']});
 assert.equal(registerBody({storyId:'story-1',chapterIds:['c1','c1']}),null);
 assert.equal(registerBody({storyId:'story-1',chapterIds:['c1'],ownerUid:'fake'}),null);
 assert.equal(registerBody({storyId:'story-1',chapterIds:['no spaces']}),null);
});
test('V44.2 server: report/hidden moderation allowlisted, not user-granted',()=>{
 assert.deepEqual(reportBody({commentId:'c-1',reason:'SPOILER'}),
  {commentId:'c-1',reason:'SPOILER'});
 assert.equal(reportBody({commentId:'c-1',reason:'MALWARE'}),null);
 assert.equal(reportBody({commentId:'c-1',reason:'SPAM',uid:'victim'}),null);
 assert.deepEqual(moderatorBody({commentId:'c-1',hidden:true}),
  {commentId:'c-1',hidden:true});
 assert.equal(moderatorBody({commentId:'c-1',hidden:'true'}),null);
 assert.equal(moderatorBody({commentId:'c-1',hidden:true,isAdmin:true}),null);
});
test('V44.2 server: public storage gate OFF and only signed admin may register/moderate',()=>{
 const wr=file('wrangler.toml'),worker=file('src/index.mjs'),ledger=file('src/comments-v44-2.mjs');
 assert.match(wr,/COMMENTS_ENABLED = "false"/);
 assert.match(wr,/name = "DUDU_DISCUSSION"/);
 assert.match(wr,/new_sqlite_classes = \["DuduDiscussion"\]/);
 assert.match(worker,/if\(env\.COMMENTS_ENABLED!=='true'\)/);
 assert.match(worker,/await verifyFirebaseIdToken\(req,env.PROJECT_ID\)/);
 assert.match(worker,/if\(adminPath&&!user\.admin\)/);
 assert.match(worker,/store\.register\(parsed,user\.uid,now\)/);
 assert.match(worker,/store\.moderate\(parsed,user\.uid\)/);
 assert.match(worker,/store\.report\(parsed,user\.uid,now\)/);
 assert.doesNotMatch(ledger,/profiles_v2|userProfile|localStorage|generateContent|gift_transfer/);
});
test('V44.2 server: DO enforces serialized SQL idempotency, scope and moderation',()=>{
 const ledger=file('src/comments-v44-2.mjs');
 assert.match(ledger,/UNIQUE\(uid,request_id\)/);
 assert.match(ledger,/PRIMARY KEY\(comment_id,reporter_uid\)/);
 assert.match(ledger,/this\.ctx\.storage\.transactionSync/);
 assert.match(ledger,/if\(!this\.registered\(entry\.storyId,entry\.chapterId\)\)/);
 assert.match(ledger,/parent\.storyId!==entry\.storyId/);
 assert.match(ledger,/now-last\.at<COMMENT_LIMITS\.cooldownMs/);
 assert.match(ledger,/parent&&parent\.uid!==uid/);
 assert.match(ledger,/WHERE n\.recipient_uid=\?/);
 assert.match(ledger,/c\.hidden=0/);
});
test('V44.2 server: browser comments explicitly sandbox, no API auto-enabled on GitHub Pages',()=>{
 const page=file('../index.html');
 assert.match(page,/IS_SANDBOX_MODE\|\|!novel/);
 assert.match(page,/userProfile\.commentsV442=next/);
 assert.doesNotMatch(page,/COMMENT_ENABLED = true|DuduDiscussion\.post/);
});
