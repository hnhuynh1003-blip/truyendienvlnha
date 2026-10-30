const {test}=require('node:test');
const assert=require('node:assert/strict');
const social=require('../js/personal-npc-social-v1.js');

const day=Date.UTC(2026,9,30,7,0);
const uid='reader_UID-1',storyId='novel-1',npcId='npc-1';
const clone=x=>JSON.parse(JSON.stringify(x));
function merge(target,source){
 for(const [key,value] of Object.entries(source)){
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   if(!target[key]||typeof target[key]!=='object')target[key]={};
   merge(target[key],value);
  }else target[key]=value;
 }
}
function fake(initial){
 const profile=clone(initial),writes=[];
 const auth={currentUser:{uid}};
 const db={collection(name){
  assert.equal(name,'profiles_v2');
  return {doc(id){assert.equal(id,uid);return {id};}};
 },async runTransaction(callback){
  const staged=[];
  const tx={
   async get(){return {exists:true,data:()=>clone(profile)};},
   set(ref,patch,options){
    assert.equal(ref.id,uid);
    assert.deepEqual(options,{merge:true});
    staged.push(clone(patch));
   },
   update(){throw Error('unexpected broad update');}
  };
  const result=await callback(tx);
  for(const patch of staged){merge(profile,patch);writes.push(patch);}
  return result;
 }};
 return {db,auth,profile,writes};
}
function seed(){
 return {currency:125,exp:40,inventory:[{id:'common-gauze',instanceId:'owned-1'}],
  storyStates:{
   [storyId]:{collectedCharacters:{
    [npcId]:{affinity:22,relationshipV2:{trust:4}},
    'npc-2':{affinity:33}
   },unrelatedKey:'preserve'},
   'story-other':{readingProgress:7}
  }};
}
test('real UID favorite toggles on and off with nested Firestore merge only',async()=>{
 const env=fake(seed()),base={db:env.db,auth:env.auth,uid,storyId,npcId};
 const on=await social.run({...base,action:'favorite'});
 assert.equal(on.favoriteNpcV43,npcId);
 assert.equal(env.profile.storyStates[storyId].favoriteNpcV43,npcId);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters['npc-2'].affinity,33);
 const off=await social.run({...base,action:'favorite'});
 assert.equal(off.favoriteNpcV43,'');
 assert.equal(env.profile.storyStates[storyId].favoriteNpcV43,'');
 assert.equal(env.profile.currency,125);
 assert.equal(env.profile.inventory.length,1);
 assert.equal(env.profile.storyStates['story-other'].readingProgress,7);
 assert.ok(env.writes.every(w=>Object.keys(w).join()==='storyStates'));
});
test('daily check-in persists trust and bond once without gifts, Xu or EXP',async()=>{
 const env=fake(seed()),base={db:env.db,auth:env.auth,uid,storyId,npcId,
  action:'checkin',choiceId:'thoughtful',now:day,eventId:'checkin-0001'};
 const first=await social.run(base);
 assert.equal(first.trustGain,3);
 const npc=env.profile.storyStates[storyId].collectedCharacters[npcId];
 assert.equal(npc.relationshipV2.trust,7);
 assert.equal(npc.relationshipV2.lastCheckinUtc,'2026-10-30');
 assert.equal(npc.npcBondV43.current,1);
 assert.equal(env.profile.currency,125);
 assert.equal(env.profile.exp,40);
 assert.equal(env.profile.inventory[0].instanceId,'owned-1');
 await assert.rejects(social.run({...base,eventId:'checkin-0002'}),/already-checked-in/);
 assert.equal(env.writes.length,1);
});
test('max trust still records one daily interaction but awards no extra trust',async()=>{
 const initial=seed();
 initial.storyStates[storyId].collectedCharacters[npcId].relationshipV2.trust=100;
 const env=fake(initial);
 const result=await social.run({db:env.db,auth:env.auth,uid,storyId,npcId,
  action:'checkin',choiceId:'casual',now:day,eventId:'checkin-0003'});
 assert.equal(result.trustGain,0);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters[npcId].relationshipV2.trust,100);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters[npcId].npcBondV43.current,1);
});
test('rejects other UID and NPC without an owned/unlocked progress record',async()=>{
 const env=fake(seed());
 await assert.rejects(social.run({db:env.db,auth:env.auth,uid:'other',
  storyId,npcId,action:'favorite'}),/invalid-session/);
 await assert.rejects(social.run({db:env.db,auth:env.auth,uid,
  storyId,npcId:'unopened',action:'favorite'}),/npc-not-unlocked/);
 assert.equal(env.writes.length,0);
});
