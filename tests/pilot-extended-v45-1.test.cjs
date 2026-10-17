/* V45.1 R2: fake signed identities + network response permutations only. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../js/pilot-client-v45-1.js');

function setup({role='READER_A',canManagePilot=false,remote}={}){
 const calls=[],app={name:'[DEFAULT]',options:{projectId:'truyendienvl'}};
 const identity={uid:'reader_0000123',getIdToken:async()=> 'jwt-reader'};
 const auth={currentUser:null,
  setPersistence:async()=>{},
  signInWithPopup:async()=>{auth.currentUser=identity},
  signOut:async()=>{auth.currentUser=null}
 };
 function authFn(){return auth}
 authFn.Auth={Persistence:{SESSION:'SESSION'}};
 authFn.GoogleAuthProvider=class {};
 const firebase={apps:[app],app:()=>app,initializeApp:()=>app,auth:authFn};
 const fetch=async(url,options)=>{
  calls.push({url,options});
  if(remote)return remote(url,options);
  const response=url.endsWith('/v1/pilot/status')?
   {ok:true,role,canManagePilot,preflightOnly:true,gates:{comments:true}}:
   url.endsWith('/v1/comments/admin/reports')?{ok:true,reports:[]}:
   url.endsWith('/v1/comments/inbox')?{ok:true,notifications:[]}:
   {ok:true,id:'comment_001'};
  return {ok:true,status:200,json:async()=>response};
 };
 return {calls,auth,identity,client:api.create({firebase,fetch})};
}
test('R2: reply and report are bounded, reject fake sender, ownership and gift fields',async()=>{
 const x=setup();
 await x.client.login();await x.client.status();
 assert.equal((await x.client.post({storyId:'story01',requestId:'req123',
  text:'hello',senderUid:'uid_fake'})).code,'invalid-comment');
 assert.equal((await x.client.post({storyId:'story01',requestId:'req123',
  text:'hello',itemInstanceId:'forged'})).code,'invalid-comment');
 assert.equal((await x.client.post({storyId:'story01',requestId:'req123',
  text:'hello',parentId:'bad space'})).code,'invalid-comment');
 assert.equal((await x.client.report('abc123','ANY')).code,'invalid-report');
 assert.equal(x.calls.length,1);
 const posted=await x.client.post({storyId:'story01',chapterId:'ch01',
  requestId:'req123',text:'Lời hồi đáp',parentId:'parent001'});
 assert.equal(posted.ok,true);
 assert.equal((await x.client.report('parent001','SPOILER')).ok,true);
 assert.deepEqual(x.calls.slice(1).map(x=>new URL(x.url).pathname),
  ['/v1/comments/create','/v1/comments/report']);
 assert.deepEqual(JSON.parse(x.calls[1].options.body),{
  storyId:'story01',chapterId:'ch01',text:'Lời hồi đáp',
  requestId:'req123',parentId:'parent001'
 });
 assert.deepEqual(JSON.parse(x.calls[2].options.body),{
  commentId:'parent001',reason:'SPOILER'
 });
});
test('R2: inbox and read receipts belong to verified Pilot user',async()=>{
 const x=setup();
 assert.equal((await x.client.inbox()).code,'pilot-login-required');
 await x.client.login();
 assert.equal((await x.client.inbox()).code,'pilot-check-required');
 await x.client.status();
 assert.equal((await x.client.inbox()).ok,true);
 assert.equal((await x.client.markInboxRead()).ok,true);
 assert.equal(x.calls.length,3);
 assert.equal(x.calls[2].options.body,'{}');
 assert.deepEqual(x.calls.slice(1).map(x=>new URL(x.url).pathname),
  ['/v1/comments/inbox','/v1/comments/inbox/read']);
});
test('R2: author display role alone cannot call signed-admin Pilot methods',async()=>{
 const x=setup({role:'AUTHOR',canManagePilot:false});
 await x.client.login();await x.client.status();
 assert.equal(x.client.session().role,'AUTHOR');
 assert.equal(x.client.session().canManagePilot,false);
 assert.equal((await x.client.register('story01',['chapter01'])).code,'pilot-admin-required');
 assert.equal((await x.client.reports()).code,'pilot-admin-required');
 assert.equal((await x.client.moderate('comment01',true)).code,'pilot-admin-required');
 assert.equal(x.calls.length,1);
});
test('R2: privileged Pilot role requires signed server canManagePilot; invalid registry rejected',async()=>{
 const x=setup({role:'AUTHOR',canManagePilot:true});
 await x.client.login();await x.client.status();
 assert.equal(x.client.session().canManagePilot,true);
 assert.equal((await x.client.register('story01',['chapter01','chapter01'])).code,'invalid-register');
 assert.equal((await x.client.register('story01',['illegal chapter'])).code,'invalid-register');
 assert.equal((await x.client.register('story01',['chapter01'])).ok,true);
 assert.equal((await x.client.reports()).ok,true);
 assert.equal((await x.client.moderate('comment01',true)).ok,true);
 assert.deepEqual(x.calls.slice(1).map(x=>new URL(x.url).pathname),
  ['/v1/comments/admin/register','/v1/comments/admin/reports',
   '/v1/comments/admin/moderate']);
});
test('R2: stale network response never crosses account switches or logouts',async()=>{
 let resolve;
 const x=setup({remote:async url=>{
  if(url.endsWith('/v1/pilot/status'))
   return {ok:true,status:200,json:async()=>({ok:true,role:'READER_A',
    preflightOnly:true,canManagePilot:false})};
  return new Promise(r=>{resolve=r});
 }});
 await x.client.login();await x.client.status();
 const old=x.client.list('story01');
 // wait for getIdToken and the actual fetch to begin
 await new Promise(r=>setImmediate(r));
 assert.equal(typeof resolve,'function');
 x.auth.currentUser={uid:'reader_0000567',getIdToken:async()=> 'jwt-other'};
 resolve({ok:true,status:200,json:async()=>({ok:true,comments:[{text:'private old'}]})});
 const outcome=await old;
 assert.equal(outcome.code,'session-changed');
 assert.equal(x.client.session().approved,false);
 assert.equal((await x.client.inbox()).code,'pilot-check-required');
});
test('R2: a 403 from Worker clears cached Pilot approval',async()=>{
 const x=setup({remote:async url=>{
  const body=url.endsWith('/v1/pilot/status')?
   {ok:true,role:'READER_A',preflightOnly:true}:{
    error:{code:'pilot-forbidden'}};
  return {ok:!body.error,status:body.error?403:200,
   json:async()=>body};
 }});
 await x.client.login();await x.client.status();
 assert.equal(x.client.session().approved,true);
 assert.equal((await x.client.inbox()).code,'pilot-forbidden');
 assert.equal(x.client.session().approved,false);
 assert.equal((await x.client.inbox()).code,'pilot-check-required');
});
