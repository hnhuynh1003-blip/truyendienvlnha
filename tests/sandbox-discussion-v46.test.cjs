const {test}=require('node:test');
const assert=require('node:assert/strict');
const sandbox=require('../js/sandbox-discussion.js');
const scope={storyId:'s1',chapterId:'c1'};
const time=Date.parse('2026-10-17T00:00:00Z');
const memory=()=>{const m=new Map([['profile','STAY']]);return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const post=(api,actor,text,id,extra={})=>api.run(actor,{type:'post',...scope,text,requestId:id,...extra});
test('V46 imports V45 storage without losing legacy comments',()=>{
 const st=memory(),legacy={version:1,seq:1,comments:[{id:'sandbox-comment-1',actor:'testA',text:'Old post',requestId:'old',...scope,parentId:null}],notifications:[],reports:[]};
 st.setItem(sandbox.KEY,JSON.stringify(legacy));
 const api=sandbox.create(st,{now:()=>time});
 assert.equal(api.list(scope).length,1);
 assert.equal(post(api,'testB','New reply','new',{parentId:'sandbox-comment-1'}).createdAt,time);
 assert.equal(api.inbox('testA',scope)[0].from,'testB');
 assert.equal(st.getItem('profile'),'STAY');
});
test('AUTHOR hides parent plus replies for testA/testB, restores without deleting them',()=>{
 let now=time;const api=sandbox.create(memory(),{now:()=>now});
 const root=post(api,'testA','Parent','a');now+=100;
 const child=post(api,'testB','Child','b',{parentId:root.id});
 assert.throws(()=>api.run('testB',{type:'moderate',commentId:root.id,hidden:true}),/AUTHOR/);
 api.run('AUTHOR',{type:'moderate',commentId:root.id,hidden:true});
 assert.equal(api.list(scope,'testB').length,0);
 assert.equal(api.list(scope,'AUTHOR').length,2);
 assert.throws(()=>post(api,'AUTHOR','Another reply','c',{parentId:root.id}),/trả lời/);
 api.run('AUTHOR',{type:'moderate',commentId:root.id,hidden:false});
 assert.deepEqual(api.list(scope).map(c=>c.id),[root.id,child.id]);
 api.run('AUTHOR',{type:'moderate',commentId:child.id,hidden:true});
 assert.deepEqual(api.list(scope).map(c=>c.id),[root.id]);
});
test('cooldown, normalized duplicate, idempotency, daily cap',()=>{
 let clock=time;const api=sandbox.create(memory(),{now:()=>clock});
 const first=post(api,'testA','Hello there','1');
 assert.deepEqual(post(api,'testA','Hello there','1'),first);
 assert.throws(()=>post(api,'testA','Different','2'),/6 giây/);
 clock+=6001;assert.throws(()=>post(api,'testA','  HELLO   THERE ','2'),/trùng lặp/);
 for(let i=2;i<=30;i++){clock+=6001;post(api,'testA','Message '+i,String(i))}
 clock+=6001;assert.throws(()=>post(api,'testA','Message 31','31'),/30 bình luận/);
 clock=Date.parse('2026-10-18T00:00:00Z');
 assert.equal(post(api,'testA','New UTC day','next').actor,'testA');
});
test('Reports are AUTHOR-only; reset only clears fictional Sandbox board',()=>{
 const st=memory(),api=sandbox.create(st,{now:()=>time}),c=post(api,'testA','Hello','a');
 api.run('testB',{type:'report',commentId:c.id,reason:'SPAM'});
 api.run('testB',{type:'report',commentId:c.id,reason:'OTHER'});
 assert.equal(api.reports(scope).length,1);
 assert.throws(()=>api.reports(scope,'testA'),/AUTHOR/);
 assert.throws(()=>api.run('testB',{type:'reset'}),/AUTHOR/);
 api.run('AUTHOR',{type:'reset'});
 assert.equal(api.list(scope).length,0);
 assert.equal(st.getItem('profile'),'STAY');
});
