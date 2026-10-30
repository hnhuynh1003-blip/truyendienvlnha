const {test}=require('node:test');
const assert=require('node:assert/strict');
const exchange=require('../js/personal-npc-exchange-v1.js');
const catalog=require('../js/item-catalog-v2.js');
const collection=require('../js/personal-collection-c24.js');

const uid='reader-uid-1',storyId='novel-1',npcId='npc-1';
const time=Date.UTC(2026,9,30,7,0);
const id=type=>type+'-123e4567-e89b-42d3-a456-426614174000';
const clone=obj=>JSON.parse(JSON.stringify(obj));
function merge(target,source){
 for(const [k,v] of Object.entries(source)){
  if(v&&typeof v==='object'&&!Array.isArray(v)){
   if(!target[k]||typeof target[k]!=='object')target[k]={};
   merge(target[k],v);
  }else target[k]=clone(v);
 }
}
function fixture(){
 const item={...catalog.byId('common-gauze'),instanceId:'owned-1',
  obtainedFrom:{kind:'STARTER'}};
 const profile={currency:200,exp:100,quests:[{id:'keep'}],
  inventory:[item,{...catalog.byId('f1'),instanceId:'owned-2',obtainedFrom:{kind:'STARTER'}}],
  storyStates:{
   [storyId]:{collectedCharacters:{[npcId]:{affinity:22,relationshipV2:{trust:4}},
    'npc-other':{affinity:17}},unrelated:'keep'},
   'other-story':{favoriteNpcV43:'other'}
  }};
 const auth={currentUser:{uid}},writes=[];
 const db={collection(name){assert.equal(name,'profiles_v2');return {doc(owner){
  assert.equal(owner,uid);return {owner};
 }};},async runTransaction(callback){
  const patches=[];
  const tx={async get(){return {exists:true,data:()=>clone(profile)};},
   set(ref,patch,opts){assert.equal(ref.owner,uid);
    assert.deepEqual(opts,{merge:true});patches.push(clone(patch));},
   update(){throw Error('broad update not permitted');}};
  const result=await callback(tx);
  for(const patch of patches){merge(profile,patch);writes.push(patch);}
  return result;
 }};
 return {db,auth,profile,writes,item,npc:{id:npcId,name:'NPC Test',
  giftPreferences:{likedTags:['PRACTICAL']}}};
}
function args(env,kind='gift'){
 return {db:env.db,auth:env.auth,uid,storyId,npcId,npc:env.npc,
  kind,eventId:id(kind),now:time,...(kind==='gift'?{instanceId:'owned-1'}:{amount:50,note:'Chúc vui'})};
}
test('gift consumes one verified item, updates only owned NPC and bond',async()=>{
 const env=fixture(),r=await exchange.run(args(env));
 assert.equal(r.status,'applied');
 assert.equal(r.affinityGain,4);assert.equal(r.trustGain,1);
 assert.deepEqual(env.profile.inventory.map(x=>x.instanceId),['owned-2']);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters[npcId].affinity,26);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters[npcId].relationshipV2.trust,5);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters[npcId].npcBondV43.current,1);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters['npc-other'].affinity,17);
 assert.equal(env.profile.storyStates['other-story'].favoriteNpcV43,'other');
 assert.equal(env.profile.storyStates[storyId].unrelated,'keep');
 assert.equal(env.profile.currency,200);assert.equal(env.profile.exp,100);
 assert.deepEqual(env.profile.quests,[{id:'keep'}]);
 assert.deepEqual(Object.keys(env.writes[0]).sort(),['inventory','storyStates']);
 const journal=collection.snapshot({inventory:env.profile.inventory,
  storyStates:env.profile.storyStates});
 assert.equal(journal.events.filter(x=>x.kind==='NPC_GIFT').length,1);
 assert.equal(journal.events[0].name,'Băng Gạc Cũ');
});
test('retry same gift receipt is a no-op and distinct receipt cannot spend removed item',async()=>{
 const env=fixture(),request=args(env);
 await exchange.run(request);
 const again=await exchange.run(request);
 assert.equal(again.status,'already-applied');assert.equal(env.writes.length,1);
 assert.equal(collection.snapshot({storyStates:env.profile.storyStates}).events.length,1);
 await assert.rejects(exchange.run({...request,eventId:'gift-123e4567-e89b-42d3-a456-426614174001'}),
  /item-not-owned/);
 assert.equal(env.writes.length,1);
});
test('gift rejection, cooldown and forged items never consume inventory',async()=>{
 const env=fixture();
 env.npc.giftPreferences={dislikedTags:['PRACTICAL']};
 await assert.rejects(exchange.run(args(env)),/gift-disliked-gift/);
 assert.equal(env.writes.length,0);
 env.npc.giftPreferences={likedTags:['PRACTICAL']};
 env.profile.storyStates[storyId].collectedCharacters[npcId].relationshipV2.lastGiftAt=time-1000;
 await assert.rejects(exchange.run(args(env)),/gift-five-minute-limit/);
 assert.equal(env.profile.inventory.length,2);
 env.profile.storyStates[storyId].collectedCharacters[npcId].relationshipV2.lastGiftAt=0;
 env.profile.inventory[0].name='Fake item';
 await assert.rejects(exchange.run(args(env)),/item-not-giftable/);
 assert.equal(env.writes.length,0);
});
test('red envelope spends exact virtual Xu and saves recipient-scoped journal',async()=>{
 const env=fixture(),request=args(env,'rp');
 const r=await exchange.run(request);
 assert.equal(r.status,'applied');assert.equal(r.balance,150);
 assert.equal(env.profile.currency,150);
 assert.equal(env.profile.storyStates[storyId].redPacketsV32[npcId].events[0].amount,50);
 assert.equal(env.profile.storyStates[storyId].redPacketsV32[npcId].events[0].note,'Chúc vui');
 assert.equal(env.profile.inventory.length,2);
 assert.equal(env.profile.storyStates[storyId].collectedCharacters[npcId].affinity,22);
 assert.deepEqual(Object.keys(env.writes[0]).sort(),['currency','storyStates']);
 const retry=await exchange.run(request);
 assert.equal(retry.status,'already-applied');assert.equal(env.writes.length,1);
 await assert.rejects(exchange.run({...request,
  eventId:'rp-123e4567-e89b-42d3-a456-426614174001'}),/envelope-cooldown/);
 assert.equal(env.profile.currency,150);
});
test('red envelope checks server balance, daily limits and ownership',async()=>{
 const env=fixture(),request=args(env,'rp');
 env.profile.currency=10;
 await assert.rejects(exchange.run(request),/envelope-insufficient/);
 env.profile.currency=200;
 env.profile.storyStates[storyId].redPacketsV32={
  [npcId]:{day:'2026-10-30',count:3,lastAt:time-300001,events:[]}};
 await assert.rejects(exchange.run(request),/envelope-daily-limit/);
 delete env.profile.storyStates[storyId].collectedCharacters[npcId];
 await assert.rejects(exchange.run(request),/npc-not-unlocked/);
 assert.equal(env.writes.length,0);
 await assert.rejects(exchange.run({...request,uid:'another-uid'}),/invalid-session/);
});
test('request IDs are UUID-based and reject wrong transaction kind',async()=>{
 const env=fixture();
 assert.equal(exchange.requestId('gift',{randomUUID:()=>id('gift').slice(5)}),id('gift'));
 await assert.rejects(exchange.run({...args(env),eventId:id('rp')}),/invalid-session/);
 assert.equal(env.writes.length,0);
});
