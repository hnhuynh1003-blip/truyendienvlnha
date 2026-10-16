const {test}=require('node:test');
const assert=require('node:assert/strict');
const sync=require('../js/player-avatar-staging-v22.js');
const client=require('../js/player-avatar-sync-v17.js');
const vectors=require('../js/npc-portrait-library-v1.js').CATALOG.map(p=>p.id);
const avatar=require('../js/player-avatar-v16.js');
const defaultAvatar=()=>({kind:'initials',presetId:'',frameId:'none'});
function fixture(){
  const records=new Map();
  const sent=[];
  let requests=0;
  const backend=async(url,options)=>{
    requests++;const uid=options.headers.Authorization.replace('Bearer signed-','');
    const state=records.get(uid)||{revision:0,avatar:defaultAvatar()};
    sent.push({uid,url,method:options.method,body:options.body});
    if(url.endsWith('/mine')){
      return {ok:true,json:async()=>({...state,availableFrames:avatar.FREE.map(f=>f.id),
        lockedFrames:['legend','soulbond','author'],uploadsEnabled:false})};
    }
    const body=JSON.parse(options.body);
    if(body.expectedRevision!==state.revision)
      return {ok:false,json:async()=>({error:{code:'revision-conflict'},revision:state.revision})};
    if(!avatar.FREE.some(f=>f.id===body.avatar.frameId)||
       body.avatar.kind==='upload')throw Error('unsafe backend payload');
    const next={revision:state.revision+1,avatar:body.avatar};
    records.set(uid,next);
    return {ok:true,json:async()=>({...next,availableFrames:avatar.FREE.map(f=>f.id),
      lockedFrames:['legend','soulbond','author'],uploadsEnabled:false})};
  };
  let user='uid_A',localOwner='uid_A';
  let profile={name:'Player A',playerAvatar:{
    kind:'anime',presetId:'anime-moon-blue',frameId:'moon'}};
  let writes=0;
  const make=()=>sync.create({
    enabled:true,
    identity:()=>({uid:user,getIdToken:async()=> 'signed-'+user}),
    localOwner:()=>localOwner,
    localProfile:()=>profile,
    vectorIds:()=>vectors,
    createClient:({getIdToken})=>client.createClient({enabled:true,getIdToken,fetchImpl:backend}),
    applyLocal:(selection,uid)=>{
      if(user!==uid||localOwner!==uid||profile.playerAvatar?.kind==='upload')return false;
      const a=avatar.validate(selection,{vectorIds:vectors});
      if(!a)return false;
      profile.playerAvatar={...a};writes++;return true;
    }
  });
  return {records,sent,get requests(){return requests;},make,
    get user(){return user;},set user(v){user=v;},
    get localOwner(){return localOwner;},set localOwner(v){localOwner=v;},
    get profile(){return profile;},set profile(v){profile=v;},
    get writes(){return writes;}};
}
test('V22 refuses disabled mode and mismatched sandbox/Firebase UID with zero token calls',async()=>{
 const f=fixture(),c=f.make();
 f.localOwner='tester-a';
 assert.deepEqual(await c.inspect(),{ok:false,code:'owner-mismatch'});
 assert.equal(f.requests,0);
 const off=sync.create({enabled:false});
 assert.deepEqual(await off.inspect(),{ok:false,code:'disabled'});
 assert.equal(f.requests,0);
});
test('V22 explicit device-to-server save round trip retains local avatar',async()=>{
 const f=fixture(),c=f.make();
 const before=JSON.stringify(f.profile);
 const read=await c.inspect();
 assert.equal(read.ok,true);
 assert.equal(read.review.status,'conflict');
 assert.equal(f.requests,1);
 assert.equal(f.writes,0);
 const saved=await c.resolve('use-device');
 assert.deepEqual(saved,{ok:true,kind:'saved-server',revision:1});
 assert.equal(f.records.get('uid_A').avatar.presetId,'anime-moon-blue');
 assert.equal(f.writes,0);
 assert.equal(JSON.stringify(f.profile),before);
 assert.equal(f.sent[1].uid,'uid_A');
 assert.deepEqual(Object.keys(JSON.parse(f.sent[1].body)).sort(),['avatar','expectedRevision']);
 assert.equal((await c.inspect()).review.status,'identical');
});
test('V22 only applies remote avatar to device after explicit confirmation',async()=>{
 const f=fixture();f.records.set('uid_A',{revision:6,
  avatar:{kind:'vector',presetId:'portrait-f-04',frameId:'sakura'}});
 const c=f.make();
 assert.equal((await c.inspect()).review.status,'conflict');
 assert.equal(f.writes,0);
 const outcome=await c.resolve('use-server');
 assert.deepEqual(outcome,{ok:true,kind:'saved-device'});
 assert.equal(f.profile.playerAvatar.presetId,'portrait-f-04');
 assert.equal(f.profile.name,'Player A');
 assert.equal(f.writes,1);
 assert.equal(f.sent.length,1,'Choosing server must not create a server write');
});
test('V22 never synchronizes or replaces local uploaded images',async()=>{
 const f=fixture();
 f.profile.playerAvatar={kind:'upload',uploadId:'own-local-photo',frameId:'moon'};
 const c=f.make(),plan=await c.inspect();
 assert.equal(plan.review.status,'local-photo');
 assert.equal(plan.review.canUseServer,false);
 assert.equal(plan.review.canKeepDevice,false);
 assert.equal((await c.resolve('use-device')).ok,false);
 assert.equal((await c.resolve('use-server')).ok,false);
 assert.equal(f.requests,1);
 assert.equal(f.writes,0);
 assert.equal(f.profile.playerAvatar.uploadId,'own-local-photo');
});
test('V22 two-device 409 conflict forces a NEW user choice, never auto-retries',async()=>{
 const f=fixture();const a=f.make(),b=f.make();
 assert.equal((await a.inspect()).ok,true);
 assert.equal((await b.inspect()).ok,true);
 assert.equal((await a.resolve('use-device')).ok,true);
 const conflict=await b.resolve('use-device');
 assert.equal(conflict.ok,false);
 assert.equal(conflict.code,'revision-conflict');
 assert.equal(conflict.revision,1);
 assert.deepEqual(await b.resolve('use-device'),{ok:false,code:'stale-account'});
 assert.equal(f.requests,4,'GET+GET+POST+conflicting POST only');
 assert.equal(f.records.get('uid_A').revision,1);
});
test('V22 invalidates old read after account change or edited local avatar',async()=>{
 const f=fixture(),c=f.make();
 await c.inspect();f.user='uid_B';
 assert.deepEqual(await c.resolve('use-device'),{ok:false,code:'stale-account'});
 assert.equal(f.requests,1);
 f.user='uid_A';await c.inspect();
 f.profile.playerAvatar={kind:'initials',presetId:'',frameId:'none'};
 assert.deepEqual(await c.resolve('use-server'),{ok:false,code:'local-changed'});
 assert.equal(f.writes,0);
});
test('V22 never reads real Firebase from inside the controller or uploads photos',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../js/player-avatar-staging-v22.js'),'utf8');
 const ui=fs.readFileSync(require('node:path').join(__dirname,'../js/player-avatar-sync-ui-v22.js'),'utf8');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const config=fs.readFileSync(require('node:path').join(__dirname,'../cloudflare/wrangler.toml'),'utf8');
 assert.match(ui,/avatarSync'\)==='staging'/);
 assert.match(ui,/account\.getIdToken\(\)/);
 assert.match(ui,/avatarV22Identity\(\)\?\.uid!==uid/);
 assert.match(html,/src="js\/player-avatar-staging-v22.js"/);
 assert.match(html,/id="player-avatar-v22-panel"/);
 assert.match(config,/PLAYER_AVATAR_SYNC_ENABLED = "false"/);
 assert.doesNotMatch(source,/firebase\.|localStorage\.|fetch\(/);
 assert.doesNotMatch(ui,/DUDU_AVATAR_PRIVATE_BUCKET|uploadPhoto|R2\.put/);
});
