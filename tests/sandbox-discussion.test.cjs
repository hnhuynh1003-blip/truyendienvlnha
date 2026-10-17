const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const model=require('../js/sandbox-discussion.js');
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),m}};
const scope={storyId:'story-1',chapterId:'chapter-1'};
const post=(api,actor,id,extra={})=>api.run(actor,{type:'post',...scope,text:'Xin chào',requestId:id,...extra});
test('fictional A/B share comments, scoped replies, inbox and reports after reload',()=>{
 const storage=memory(),a=model.create(storage),b=model.create(storage);
 const c=post(a,'testA','a');assert.equal(b.list(scope)[0].id,c.id);
 const reply=post(b,'testB','b',{parentId:c.id});
 assert.equal(model.create(storage).list(scope).length,2);
 assert.equal(a.inbox('testA',scope)[0].commentId,reply.id);
 assert.equal(a.inbox('testB',scope).length,0);
 b.run('testB',{type:'read',...scope});assert.equal(a.inbox('testA',scope)[0].read,false);
 a.run('testA',{type:'read',...scope});assert.equal(a.inbox('testA',scope)[0].read,true);
 b.run('testB',{type:'report',commentId:c.id,reason:'SPAM'});
 b.run('testB',{type:'report',commentId:c.id,reason:'OTHER'});
 assert.equal(a.reports(scope).length,1);
 for(const other of [{storyId:'other',chapterId:'chapter-1'},{storyId:'story-1',chapterId:'other'},{storyId:'story-1',chapterId:null}]){
  assert.equal(a.list(other).length,0);assert.equal(a.inbox('testA',other).length,0);assert.equal(a.reports(other).length,0);
  assert.throws(()=>post(b,'testB','wrong'+JSON.stringify(other),{...other,parentId:c.id}));
 }
 assert.equal(storage.m.size,1);assert.ok(storage.m.has(model.KEY));
 assert.equal(model.create(memory()).list(scope).length,0);
});
test('retries, malformed actions and storage failures do not publish phantom writes',()=>{
 const storage=memory(),api=model.create(storage),c=post(api,'testA','a');
 assert.deepEqual(post(api,'testA','a'),c);assert.equal(api.list(scope).length,1);
 assert.throws(()=>post(api,'testB','a'));
 assert.throws(()=>post(api,'real-uid','b'));
 const reply=post(api,'testB','b',{parentId:c.id});
 assert.throws(()=>post(api,'testA','c',{parentId:reply.id}));
 assert.throws(()=>api.run('testB',{type:'report',commentId:c.id,reason:'BAD'}));
 const before=storage.getItem(model.KEY);storage.setItem=()=>{throw Error('quota')};
 assert.throws(()=>post(api,'testA','new'));assert.equal(storage.getItem(model.KEY),before);
});
test('Sandbox wiring has no reachable live Pilot panel and main guard precedes storage',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 assert.match(html,/DuduSandboxDiscussionUI\?\.render/);
 assert.doesNotMatch(html,/DuduPilotLabUIV451\?\.render|DuduStoryPilotCommentsV452\?\.render/);
 const ui=fs.readFileSync(require('node:path').join(__dirname,'../js/sandbox-discussion-ui.js'),'utf8');
 assert.ok(ui.indexOf('if(!sandbox||!storyId)return false')<ui.indexOf('create(root.localStorage)'));
 assert.doesNotMatch(ui,/fetch\(|firebase|DuduPilotClient/);
});
