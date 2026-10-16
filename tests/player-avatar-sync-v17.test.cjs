const {test}=require('node:test');
const assert=require('node:assert/strict');
const Sync=require('../js/player-avatar-sync-v17.js');

test('V17 sync never sends network requests until explicitly enabled',async()=>{
 let calls=0,auth=0;
 const app=Sync.createClient({getIdToken:async()=>{auth++;return 'signed-jwt';},
   fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({})};}});
 assert.deepEqual(await app.read(),{ok:false,code:'disabled'});
 assert.deepEqual(await app.save({kind:'initials'},0),{ok:false,code:'disabled'});
 assert.equal(calls,0);assert.equal(auth,0);
});

test('Only fixed verified Worker origin may receive Bearer token',()=>{
 assert.throws(()=>Sync.createClient({enabled:true,endpoint:'https://evil.example'}),/untrusted-endpoint/);
 assert.throws(()=>Sync.createClient({endpoint:'http://localhost:5500'}),/untrusted-endpoint/);
 assert.match(Sync.ENDPOINT,/^https:\/\//);
});

test('V17 read/save use live JWT, never a recipient UID or photo bytes',async()=>{
 const captured=[];
 const payload={revision:5,
   avatar:{kind:'anime',frameId:'moon',presetId:'anime-moon-blue'},
   availableFrames:['none','moon'],lockedFrames:['soulbond'],
   uploadsEnabled:false};
 const app=Sync.createClient({enabled:true,getIdToken:async()=> 'test-jwt',
   fetchImpl:async(url,options)=>{
     captured.push({url,options});return {ok:true,json:async()=>payload};
   }});
 const read=await app.read();
 assert.equal(read.ok,true);assert.equal(read.revision,5);
 const result=await app.save(payload.avatar,5);
 assert.equal(result.ok,true);assert.equal(captured.length,2);
 assert.equal(captured[0].options.method,'GET');
 assert.equal(captured[1].options.method,'POST');
 for(const call of captured){
   assert.equal(call.options.headers.Authorization,'Bearer test-jwt');
   assert.equal(call.options.cache,'no-store');
   assert.ok(call.url.startsWith(Sync.ENDPOINT+'/v1/player-avatar/'));
 }
 const body=JSON.parse(captured[1].options.body);
 assert.equal(body.expectedRevision,5);
 assert.deepEqual(Object.keys(body).sort(),['avatar','expectedRevision']);
 assert.ok(!('uploadId' in body.avatar));
});

test('V17 rejects browser photos and UID overrides and honors version conflicts',async()=>{
 let count=0;
 const app=Sync.createClient({enabled:true,getIdToken:async()=> 'jwt',
   fetchImpl:async()=>{
     count++;return {ok:false,json:async()=>({error:{code:'revision-conflict'},revision:7})};
   }});
 assert.deepEqual(await app.save({kind:'upload',uploadId:'own-photo'},1),
   {ok:false,code:'unsupported-avatar'});
 assert.deepEqual(await app.save({kind:'anime',uid:'victim'},1),
   {ok:false,code:'unsupported-avatar'});
 assert.deepEqual(await app.save({kind:'initials'},-1),
   {ok:false,code:'invalid-revision'});
 assert.equal(count,0);
 assert.deepEqual(await app.save({kind:'initials',frameId:'none'},5),
   {ok:false,code:'revision-conflict',revision:7});
});
