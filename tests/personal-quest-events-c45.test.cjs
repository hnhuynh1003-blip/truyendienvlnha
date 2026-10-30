const {test}=require('node:test');
const assert=require('node:assert/strict');
const events=require('../js/personal-quest-events-c45.js');
const companion=require('../js/personal-companion-checkin-c45.js');

const day='2026-10-30';
const fresh=()=>({currency:140,exp:45,level:1,inventory:[],quests:[],storyStates:{}});
const quest=(state,id)=>state.quests.find(row=>row.id===id);
function record(data,type,eventId,source,at=day){
 const result=events.record(data,{type,eventId,source,day:at});
 if(result.applied)Object.assign(data,result.patch);
 return result;
}
test('purchases and consumed tools add progress once without granting Xu or items',()=>{
 const profile=fresh();
 assert.equal(record(profile,'MARKET_PURCHASE','shop-a').applied,true);
 assert.equal(quest(profile,'q_week_shop').current,1);
 assert.equal(record(profile,'MARKET_PURCHASE','shop-a').applied,false);
 assert.equal(quest(profile,'q_week_shop').current,1);
 record(profile,'MARKET_PURCHASE','shop-b');
 assert.equal(quest(profile,'q_week_shop').current,2);
 record(profile,'ITEM_USE','use-a');
 assert.equal(quest(profile,'q_daily_tool').current,1);
 assert.equal(profile.currency,140);
 assert.equal(profile.exp,45);
 assert.deepEqual(profile.inventory,[]);
});
test('Vạn Bảo and Vé Cào must each be claimed; paid boxes cannot complete both',()=>{
 const profile=fresh();
 assert.equal(record(profile,'FUN_CLAIM','box-1','box').applied,true);
 assert.equal(quest(profile,'q_event_fun').current,1);
 assert.equal(quest(profile,'q_week_fun').current,1);
 assert.equal(quest(profile,'q_daily_fun').current,1);
 assert.equal(record(profile,'FUN_CLAIM','box-2','box').applied,false);
 assert.equal(quest(profile,'q_event_fun').current,1);
 assert.equal(record(profile,'FUN_CLAIM','ticket-1','ticket').applied,true);
 assert.equal(quest(profile,'q_event_fun').current,2);
 assert.equal(quest(profile,'q_week_fun').current,2);
 assert.equal(record(profile,'FUN_CLAIM','ticket-2','ticket').applied,false);
 record(profile,'FUN_CLAIM','box-3','box','2026-10-31');
 assert.equal(quest(profile,'q_event_fun').current,1);
 assert.equal(quest(profile,'q_week_fun').current,3);
 assert.equal(quest(profile,'q_daily_fun').current,1);
});
test('only accepted NPC actions count; each event ID is recorded once',()=>{
 const profile=fresh();
 record(profile,'NPC_GIFT','gift-a');
 assert.equal(quest(profile,'q_daily_npc').current,1);
 assert.equal(quest(profile,'q_npc_gifts').current,1);
 record(profile,'NPC_GIFT','gift-a');
 assert.equal(quest(profile,'q_npc_gifts').current,1);
 record(profile,'NPC_CHECKIN','npc-a:'+day);
 assert.equal(quest(profile,'q_npc_visits').current,1);
 record(profile,'NPC_CHECKIN','npc-b:'+day);
 assert.equal(quest(profile,'q_npc_visits').current,2);
 assert.throws(()=>record(profile,'FUN_CLAIM','box-x','unknown'),/invalid-quest-event/);
});
function fakeCompanion(){
 const profile=fresh();
 const uid='private-owner';
 const auth={currentUser:{uid}};
 let writes=0;
 const db={collection(name){assert.equal(name,'profiles_v2');return {doc(id){
  assert.equal(id,uid);return {uid:id};
 }};},async runTransaction(fn){
  const tx={async get(){return {exists:true,data:()=>JSON.parse(JSON.stringify(profile))};},
   update(ref,patch){assert.equal(ref.uid,uid);Object.assign(profile,patch);writes++;}};
  return fn(tx);
 }};
 return {profile,db,auth,uid,writes:()=>writes};
}
test('main companion check-in records one day and leaves wallet, EXP and inventory untouched',async()=>{
 const {profile,db,auth,uid,writes}=fakeCompanion();
 const at=Date.parse(day+'T09:00:00Z');
 const first=await companion.run({db,auth,uid,now:()=>at});
 assert.equal(first.status,'applied');
 assert.equal(quest(profile,'q_daily_dudu').current,1);
 const again=await companion.run({db,auth,uid,now:()=>at+3600000});
 assert.equal(again.status,'already-applied');
 assert.equal(writes(),1);
 assert.equal(profile.currency,140);
 assert.equal(profile.exp,45);
 assert.deepEqual(profile.inventory,[]);
 const next=await companion.run({db,auth,uid,now:()=>at+86400000});
 assert.equal(next.status,'applied');
 assert.equal(quest(profile,'q_daily_dudu').current,1);
 assert.equal(writes(),2);
 await assert.rejects(companion.run({db,auth,uid:'stranger',now:()=>at}),
  /invalid-account/);
});
