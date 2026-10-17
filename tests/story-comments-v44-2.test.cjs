const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const c=require('../js/story-comments-v44-2.js');
const base={uid:'reader-a',name:'Độc giả A',storyId:'novel-1',chapterId:'c1'};
const send=(state,id,text,now,params={})=>c.post({state,id,text,now,...base,...params});
test('V44.2: story and chapter entries are distinct even with shared text',()=>{
 const a=send(null,'c-1','Hay quá',100000);
 assert.equal(a.ok,true);
 const b=send(a.state,'c-2','Cảm ơn tác giả',160000,
  {storyId:'novel-1',chapterId:null});
 assert.equal(b.ok,true);
 assert.equal(c.visible(b.state,'novel-1','c1').length,1);
 assert.equal(c.visible(b.state,'novel-1',null).length,1);
 assert.equal(c.visible(b.state,'novel-2','c1').length,0);
 assert.equal(c.visible(b.state,'novel-1','another').length,0);
 assert.equal(a.state.comments.length,1,'no input mutations');
});
test('V44.2: replies may only reference same story/chapter top-level comment',()=>{
 const a=send(null,'parent-1','Ý kiến chương một',100000);
 const b=send(a.state,'reply-1','Mình đồng ý',160000,
  {uid:'reader-b',parentId:'parent-1'});
 assert.equal(b.ok,true);
 assert.equal(b.comment.parentId,'parent-1');
 assert.equal(c.inbox(b.state,'reader-a').length,1);
 assert.equal(c.inbox(b.state,'reader-a')[0].read,false);
 assert.equal(c.inbox(b.state,'reader-b').length,0);
 const wrongStory=send(b.state,'reply-2','Nhầm truyện',250000,
  {uid:'reader-c',storyId:'novel-2',parentId:'parent-1'});
 assert.equal(wrongStory.reason,'invalid-parent');
 const wrongChapter=send(b.state,'reply-3','Nhầm chương',250000,
  {uid:'reader-c',chapterId:'c2',parentId:'parent-1'});
 assert.equal(wrongChapter.reason,'invalid-parent');
 const nested=send(b.state,'reply-4','Lồng trả lời',250000,
  {uid:'reader-c',parentId:'reply-1'});
 assert.equal(nested.reason,'invalid-parent');
});
test('V44.2: per-user cooldown, daily quota, duplicate ID, content policy and gift lock',()=>{
 const first=send(null,'a1','Văn bản hợp lệ',100000);
 assert.equal(send(first.state,'a1','Thêm bình luận',150000).reason,'duplicate');
 assert.equal(send(first.state,'a2','Thêm bình luận',100001).reason,'cooldown');
 assert.equal(send(first.state,'a2','x',160000).reason,'invalid-comment');
 assert.equal(send(first.state,'a2','x'.repeat(601),160000).reason,'invalid-comment');
 assert.equal(send(first.state,'a2','text\u0000',160000).reason,'invalid-comment');
 assert.equal(send(first.state,'a2','Một lời chúc',160000,
  {attachment:{itemId:'common-biscuit'}}).reason,'gift-transfer-disabled');
 const next=send(first.state,'a2','Cảm ơn bạn',160000);
 assert.equal(next.ok,true);
 let state=next.state;
 for(let i=2;i<20;i++){
  const post=send(state,'a'+(i+1),'Đây là phản hồi số '+i,100000+i*60000);
  assert.equal(post.ok,true);
  state=post.state;
 }
 assert.equal(send(state,'cap','Lượt số 21',1400000).reason,'daily-limit');
 assert.equal(c.normalize(state).comments.length,20);
});
test('V44.2: report queue is local and only 1 reason per reporter/comment',()=>{
 const a=send(null,'c1','Bình luận ví dụ',100000);
 const self=c.report({state:a.state,uid:'reader-a',commentId:'c1',reason:'SPAM',now:200000});
 assert.equal(self.reason,'own-comment');
 const result=c.report({state:a.state,uid:'reader-b',commentId:'c1',reason:'SPOILER',now:200000});
 assert.equal(result.ok,true);
 assert.equal(result.state.reports[0].reason,'SPOILER');
 assert.equal(c.report({state:result.state,uid:'reader-b',commentId:'c1',reason:'OTHER',now:300000}).reason,'already-reported');
 assert.equal(c.report({state:result.state,uid:'reader-c',commentId:'c1',reason:'FAKE',now:300000}).reason,'invalid-report');
 assert.equal(c.hide({state:result.state,uid:'reader-b',commentId:'c1'}).reason,'not-owner');
 const hidden=c.hide({state:result.state,uid:'reader-a',commentId:'c1'});
 assert.equal(hidden.ok,true);
 assert.equal(c.visible(hidden.state,'novel-1','c1','reader-a').length,0);
 assert.equal(c.visible(hidden.state,'novel-1','c1','reader-b').length,1,
  'local hide is not global moderation');
});
test('V44.2: local reply notifications can be read without altering any comments',()=>{
 const a=send(null,'parent-1','Xin ý kiến',100000);
 const b=send(a.state,'reply-1','Tôi đồng ý',160000,{uid:'reader-b',parentId:'parent-1'});
 const marked=c.markRead({state:b.state,uid:'reader-a'});
 assert.equal(marked.ok,true);
 assert.equal(c.inbox(marked.state,'reader-a')[0].read,true);
 assert.equal(c.inbox(b.state,'reader-a')[0].read,false);
 assert.equal(marked.state.comments.length,2);
 assert.equal(c.markRead({state:b.state,uid:'bad uid'}).ok,false);
});
test('V44.2: legacy local profiles remain intact and malformed records do not persist',()=>{
 const legacy={inventory:[{id:'f1'}],commentsV442:null};
 const before=JSON.stringify(legacy);
 assert.equal(c.normalize(legacy.commentsV442).comments.length,0);
 assert.equal(JSON.stringify(legacy),before);
 const invalid=c.normalize({version:1,comments:[
  {id:'wrong id',storyId:'x',chapterId:null,uid:'x',name:'a',text:'two',createdAt:1}
 ],notices:[{id:'x',recipientUid:'x',commentId:'x',storyId:'x',createdAt:1}]});
 assert.equal(invalid.comments.length,0);
 assert.equal(invalid.notices.length,1);
});
test('V44.2: UI uses safe text nodes; no fake public comments or item transfer',()=>{
 const get=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const ui=get('js/story-comments-ui-v44-2.js');
 const model=get('js/story-comments-v44-2.js');
 const html=get('index.html');
 assert.match(html,/id="story-comments-v442"/);
 assert.match(html,/id="chapter-comments-v442"/);
 assert.match(html,/renderStoryCommentsV442\('story'\)/);
 assert.match(html,/renderStoryCommentsV442\('chapter'\)/);
 assert.match(ui,/n\.textContent=String\(text\)/);
 assert.match(ui,/gift\.disabled=!uid\|\|!giftChoices\.length/);
 assert.match(ui,/nhật ký bình luận riêng của tài khoản/);
 assert.match(ui,/chưa gửi quản trị viên/);
 assert.match(ui,/Thiệp ủng hộ Sandbox/);
 assert.doesNotMatch(ui+model,/innerHTML\s*=|firebase\.firestore|fetch\(|grant\(|sendGift/);
});
