const {test}=require('node:test');
const assert=require('node:assert/strict');
const sync=require('../js/player-avatar-sync-plan-v20.js');
const config=require('../js/player-avatar-v16.js');
const vec=require('../js/npc-portrait-library-v1.js');
const vectors=vec.CATALOG.map(x=>x.id);
const remote=(avatar={kind:'anime',presetId:'anime-moon-blue',frameId:'moon'})=>
  ({ok:true,revision:8,avatar,availableFrames:['none','moon','violet','sakura'],
    lockedFrames:['legend','soulbond'],uploadsEnabled:false});
test('V20 compares V16 save and server without mutating local profile',()=>{
 const profile={name:'Player',playerAvatar:{
   kind:'vector',presetId:'portrait-f-20',uploadId:'',frameId:'sakura'
 },inventory:[{id:'f1'}]};
 const before=JSON.stringify(profile);
 const plan=sync.review(profile,remote(),{vectorIds:vectors});
 assert.equal(plan.status,'conflict');
 assert.equal(plan.canKeepDevice,true);
 assert.equal(plan.canUseServer,true);
 assert.equal(plan.revision,8);
 assert.equal(JSON.stringify(profile),before);
 assert.deepEqual(sync.explicitChoice(plan,'use-device'),{
   ok:true,kind:'server-save',expectedRevision:8,
   avatar:{kind:'vector',presetId:'portrait-f-20',frameId:'sakura'}
 });
 assert.deepEqual(sync.explicitChoice(plan,'use-server'),{
   ok:true,kind:'local-write',
   avatar:{kind:'anime',presetId:'anime-moon-blue',uploadId:'',frameId:'moon'}
 });
 assert.equal(JSON.stringify(profile),before);
});
test('locally uploaded photos are always protected against remote overwrites',()=>{
 const local={playerAvatar:{kind:'upload',uploadId:'own-abcdef123',frameId:'moon'}};
 const plan=sync.review(local,remote(),{vectorIds:vectors});
 assert.equal(plan.status,'local-photo');
 assert.equal(plan.canKeepDevice,false);
 assert.equal(plan.canUseServer,false);
 assert.equal(sync.explicitChoice(plan,'use-server').ok,false);
 assert.equal(sync.explicitChoice(plan,'use-device').ok,false);
 assert.equal(local.playerAvatar.kind,'upload');
});
test('privileged frame received from server needs reviewed client support',()=>{
 const unusual=remote({kind:'anime',presetId:'anime-moon-blue',frameId:'soulbond'});
 unusual.availableFrames.push('soulbond');
 const plan=sync.review({playerAvatar:{kind:'initials',frameId:'none'}},
   unusual,{vectorIds:vectors});
 assert.equal(plan.status,'unsupported-remote-frame');
 assert.equal(plan.canUseServer,false);
 assert.equal(plan.canKeepDevice,true);
 assert.equal(sync.explicitChoice(plan,'use-server').ok,false);
});
test('invalid, outdated or unverified responses never replace device',()=>{
 const local={playerAvatar:{kind:'vector',presetId:'portrait-f-01',frameId:'moon'}};
 for(const invalid of [
   null,{...remote(),ok:false}, {...remote(),revision:-1},
   {...remote(),uploadsEnabled:true},
   {...remote(),avatar:{kind:'upload',uploadId:'other',frameId:'moon'}},
   {...remote(),avatar:{kind:'anime',presetId:'not-in-library',frameId:'moon'}},
   {...remote(),avatar:{kind:'anime',presetId:'anime-moon-blue',frameId:'legend'}},
   {...remote(),availableFrames:null},
   {...remote(),avatar:{kind:'vector',presetId:'portrait-n-01',frameId:'moon'}}
 ]){
   const p=sync.review(local,invalid,{vectorIds:vectors});
   assert.equal(p.status,'unavailable');
   assert.equal(sync.explicitChoice(p,'use-server').ok,false);
 }
});
test('legacy profile safely defaults, identical server state has no migration',()=>{
 const p=sync.review({name:'Reader'},remote({kind:'initials',presetId:'',frameId:'none'}),
   {vectorIds:vectors});
 assert.equal(p.status,'identical');
 assert.deepEqual(p.local,config.safeState({name:'Reader'},{vectorIds:vectors}));
});
test('planner has no network, no local writes and is not wired to production',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/player-avatar-sync-plan-v20.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|localStorage\.|indexedDB\.|saveCurrentAccount\(/);
 assert.doesNotMatch(html,/src="js\/player-avatar-sync-plan-v20.js"/);
});
