const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const clientCode=fs.readFileSync(path.resolve(__dirname,'../js/collectibles-client.js'),'utf8');
function session({signedIn=true,sandbox=false,status=200}={}){
  const calls=[],uid='admin-fixture-uid';
  const user={uid,getIdToken:async()=> 'mock-jwt'};
  const auth={currentUser:signedIn?user:null};
  const window={firebase:{auth:()=>auth}};
  const fetch=async(url,opts)=>{
    calls.push({url,method:opts.method,authorization:opts.headers.Authorization,
      body:JSON.parse(opts.body)});
    return {ok:status===200,status,json:async()=>status===200?
      {ok:true,alreadyOwned:calls.length>1}:{error:{code:'forbidden'}}};
  };
  vm.runInNewContext(clientCode,{window,fetch,
    AbortSignal:{timeout:()=>({})}});
  window.DuduCollectiblesClient.init(sandbox);
  return {client:window.DuduCollectiblesClient,auth,calls,uid};
}
test('admin self-grant sends ONLY authenticated current UID, never an arbitrary recipient',async()=>{
  const s=session();
  const first=await s.client.grantStoryTestToSelf('story-1','author-item-fixture');
  const repeated=await s.client.grantStoryTestToSelf('story-1','author-item-fixture');
  assert.equal(first.ok,true);
  assert.equal(first.alreadyOwned,false);
  assert.equal(repeated.alreadyOwned,true);
  assert.equal(s.calls.length,2);
  for(const req of s.calls){
    assert.match(req.url,/\/v1\/collectibles\/admin\/grant$/);
    assert.equal(req.method,'POST');
    assert.equal(req.authorization,'Bearer mock-jwt');
    assert.deepEqual(req.body,{uid:s.uid,storyId:'story-1',
      itemId:'author-item-fixture'});
  }
});
test('sandbox, guest, and server permission failures cannot mint ownership',async()=>{
  const sandbox=session({sandbox:true});
  assert.equal((await sandbox.client.grantStoryTestToSelf('story','item')).reason,'sandbox');
  assert.equal(sandbox.calls.length,0);
  const guest=session({signedIn:false});
  assert.equal((await guest.client.grantStoryTestToSelf('story','item')).reason,'unauthenticated');
  assert.equal(guest.calls.length,0);
  const denied=session({status:403});
  assert.equal((await denied.client.grantStoryTestToSelf('story','item')).reason,'forbidden');
  assert.equal(denied.calls.length,1);
});
test('self-test uses story grant API, never chapter timer claim API',()=>{
  assert.match(clientCode,/grantStoryTestToSelf\(storyId,itemId\)/);
  assert.match(clientCode,/root\.firebase\?\.auth\?\.\(\)\?\.currentUser/);
  assert.doesNotMatch(clientCode,/authorRequest\('\/v1\/collectibles\/claim'/);
});

test('a Firebase account switch during token retrieval cannot send an old-UID admin grant',async()=>{
  const s=session();
  const existing=s.auth.currentUser;
  existing.getIdToken=async()=>{
    s.auth.currentUser={uid:'different-admin',getIdToken:async()=> 'other-token'};
    return 'old-token';
  };
  const answer=await s.client.grantStoryTestToSelf('story-1','author-item-fixture');
  assert.equal(answer.ok,false);
  assert.equal(answer.reason,'account-changed');
  assert.equal(s.calls.length,0,'No request is sent after switching Firebase identity');
});
