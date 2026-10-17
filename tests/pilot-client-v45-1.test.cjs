const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const client=require('../js/pilot-client-v45-1.js');
const file=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

function fixture(){
 const requests=[],auths=[],apps=[{name:'[DEFAULT]',options:{projectId:'pilot-test'}}];
 const user={uid:'reader_a_123',getIdToken:async()=> 'signed-token-reader'};
 const auth={currentUser:null,
  setPersistence:async value=>auths.push(value),
  signInWithPopup:async()=>{auth.currentUser=user},
  signOut:async()=>{auth.currentUser=null}};
 const authFn=()=>auth;
 authFn.Auth={Persistence:{SESSION:'SESSION_ONLY'}};
 authFn.GoogleAuthProvider=class Provider{};
 const sdk={apps,app:()=>apps[0],initializeApp:(options,name)=>{
  const app={name,options};apps.push(app);return app;
 },auth:authFn};
 const fetch=async(url,opts)=>{
  requests.push({url,opts});
  if(url.endsWith('/v1/pilot/status')){
   return {ok:true,status:200,json:async()=>({
    ok:true,role:'READER_A',preflightOnly:true,storageIsolated:true,
    gates:{comments:true,gifts:false,settlement:false}
   })};
  }
  if(url.includes('/v1/comments/list?')){
   return {ok:true,status:200,json:async()=>({
    ok:true,comments:[{id:'comment01',name:'Pilot A',text:'Xin chào'}]
   })};
  }
  if(url.endsWith('/v1/comments/create')){
   return {ok:true,status:200,json:async()=>({
    ok:true,id:'comment02',alreadyPosted:false
   })};
  }
  throw Error('Unexpected endpoint '+url);
 };
 return {requests,auths,apps,user,auth,sdk,fetch,
  instance:client.create({firebase:sdk,fetch})};
}
test('V45.1 never initializes a Firebase session or network on module load',()=>{
 const x=fixture();
 assert.equal(x.apps.length,1);
 assert.equal(x.requests.length,0);
 assert.equal(x.instance.session().signed,false);
 assert.equal(x.apps.length,1,'opening Sandbox Pilot UI cannot initialize Auth');
 assert.equal(x.instance.session().approved,false);
 assert.equal(x.requests.length,0);
});
test('V45.1 uses a separate named Firebase app with session-only persistence',async()=>{
 const x=fixture();
 const logged=await x.instance.login();
 assert.equal(logged.ok,true);
 assert.equal(x.apps[1].name,'dudu-v451-pilot-auth');
 assert.deepEqual(x.auths,['SESSION_ONLY']);
 assert.equal(x.instance.session().signed,true);
 assert.equal(x.instance.session().approved,false);
 assert.equal(x.requests.length,0,'login is not a Firestore write or comment request');
 const out=await x.instance.logout();
 assert.equal(out.ok,true);
 assert.equal(x.instance.session().signed,false);
});
test('V45.1 requires successful allowlisted status before reading/writing comments',async()=>{
 const x=fixture();
 assert.equal((await x.instance.list('story01')).code,'pilot-login-required');
 await x.instance.login();
 assert.equal((await x.instance.list('story01')).code,'pilot-check-required');
 assert.equal((await x.instance.post({storyId:'story01',text:'Chào Pilot',
  requestId:'id_0001'})).code,'pilot-check-required');
 assert.equal(x.requests.length,0);
 const state=await x.instance.status();
 assert.equal(state.ok,true);
 assert.equal(x.instance.session().role,'READER_A');
 const list=await x.instance.list('story01','chapter01');
 assert.equal(list.comments.length,1);
 const post=await x.instance.post({storyId:'story01',chapterId:'chapter01',
  text:'  Chào Pilot  ',requestId:'req_123'});
 assert.equal(post.ok,true);
 const message=x.requests.find(r=>r.url.endsWith('/v1/comments/create'));
 assert.equal(JSON.parse(message.opts.body).text,'Chào Pilot');
 assert.equal(JSON.parse(message.opts.body).requestId,'req_123');
 assert.equal(message.opts.headers.Authorization,'Bearer signed-token-reader');
 assert.equal(x.requests.length,3,'preflight, list, post');
 assert.ok(x.requests.every(r=>r.url.startsWith(client.ORIGIN+'/v1/')));
});
test('V45.1 rejects invalid scope, gifted items, foreign routes and forged role',async()=>{
 const x=fixture();
 await x.instance.login();
 await x.instance.status();
 assert.equal(client.cleanScope('bad scope',null),null);
 assert.equal(client.cleanScope('story01','bad/chapter'),null);
 assert.equal((await x.instance.post({storyId:'story01',text:'x',
  requestId:'safe123'})).code,'invalid-comment');
 assert.equal((await x.instance.post({storyId:'story01',text:'Hi',
  requestId:'other/one',itemInstanceId:'forged'})).code,'invalid-comment');
 assert.equal((await x.instance.list('bad scope')).code,'invalid-scope');
 assert.equal(x.requests.length,1);
 const src=file('js/pilot-client-v45-1.js');
 assert.doesNotMatch(src,/firebase\.firestore\(|db\.collection\(|userProfile\./);
 assert.doesNotMatch(src,/\/v1\/gifts\//);
 assert.doesNotMatch(src,/localStorage\.setItem/);
});
test('V45.1 detects a swapped Firebase UID before reusing approval',async()=>{
 const x=fixture();
 await x.instance.login();
 await x.instance.status();
 x.auth.currentUser={uid:'reader_b_456',
  getIdToken:async()=> 'signed-token-other'};
 assert.equal(x.instance.session().approved,false);
 assert.equal((await x.instance.list('story01')).code,'pilot-check-required');
 assert.equal(x.requests.length,1);
});
test('V45.1 is mounted only inside the Sandbox laboratory view',()=>{
 const html=file('index.html');
 const ui=file('js/pilot-lab-ui-v45-1.js');
 assert.match(html,/id="pilot-v451-content"/);
 assert.match(html,/js\/pilot-client-v45-1\.js\?v=45-1-r2/);
 assert.match(html,/js\/pilot-lab-ui-v45-1\.js\?v=45-1-r2/);
 assert.match(html,/css\/pilot-v45-1\.css\?v=45-1-r2/);
 assert.match(html,/DuduPilotLabUIV451\?\.render\(\{[\s\S]*?sandbox:IS_SANDBOX_MODE/);
 assert.match(ui,/if\(!sandbox\|\|!client\(\)\)/);
 assert.doesNotMatch(ui,/firebase\.firestore\(|db\.collection\(|userProfile\./);
});
