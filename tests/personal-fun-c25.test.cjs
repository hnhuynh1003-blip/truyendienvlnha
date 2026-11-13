'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const fun=require('../js/personal-fun-c25.js');
const rules=require('../js/dudu-fun-rules-v43.js');
const collection=require('../js/personal-collection-c24.js');
const copy=x=>structuredClone(x);
const at=Date.UTC(2026,9,30,9,0);
const day='2026-10-30';
const action=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function env(){
 const base=()=>({currency:100,inventory:[],storyStates:{},quests:[],
  questV437:{},questsDayV43:'2026-10-29'});
 const accounts=new Map([['alice',base()],['bob',base()]]),
  auth={currentUser:{uid:'alice'}};
 let writes=0;
 const db={collection(name){assert.equal(name,'profiles_v2');return{
  doc(uid){return {uid,get:async()=>({exists:accounts.has(uid),
   data:()=>copy(accounts.get(uid))})};}
 };},async runTransaction(fn){
  const patches=[];
  const tx={async get(ref){return{exists:accounts.has(ref.uid),
   data:()=>copy(accounts.get(ref.uid))};},
   update(ref,patch){patches.push([ref.uid,copy(patch)]);}};
  const response=await fn(tx);
  for(const [uid,patch] of patches){Object.assign(accounts.get(uid),patch);writes++;}
  return response;
 }};
 const run=(kind,type,options={})=>fun.run({db,auth,uid:'alice',kind,type,
  now:()=>at,...options});
 return {accounts,auth,db,run,get writes(){return writes;}};
}

test('C2.5 real Hộp Mù awards exactly one approved item with a journal receipt',async()=>{
 const h=env();
 assert.equal((await h.run('begin','box',{theme:'moon',roll:.76,seed:0})).status,'applied');
 assert.equal((await fun.load({db:h.db,auth:h.auth,uid:'alice',now:()=>at})).state
  .rounds.box.reward.itemId,'common-biscuit');
 for(let i=0;i<3;i++){
  const moved=await h.run('advance','box',{choice:0,actionId:action(i)});
  assert.equal(moved.status,'applied');
 }
 const before=h.accounts.get('alice').currency;
 const reward=await h.run('claim','box');
 assert.equal(reward.status,'applied');assert.equal(reward.reward.kind,'ITEM');
 const a=h.accounts.get('alice');
 assert.equal(a.currency,before);
 assert.equal(a.inventory.length,1);
 assert.equal(a.inventory[0].id,'common-biscuit');
 assert.equal(a.inventory[0].instanceId,'fun-box-'+day);
 assert.equal(a.quests.find(x=>x.id==='q_daily_fun').current,1);
 assert.equal(a.quests.find(x=>x.id==='q_week_fun').current,1);
 const saved=collection.snapshot({inventory:a.inventory,storyStates:a.storyStates});
 assert.equal(saved.events.filter(x=>x.kind==='FUN').length,1);
 const committed=h.writes;
 assert.equal((await h.run('claim','box')).status,'already-applied');
 assert.equal(h.writes,committed);
 assert.equal(a.inventory.length,1);
 await assert.rejects(h.run('begin','box',{roll:0,seed:11}),
  e=>e.reason==='already-started');
});

test('C2.5 two free games award real Xu once and advance daily/weekly events',async()=>{
 const h=env();
 await h.run('begin','box',{roll:0,seed:0});
 for(let n=10;n<13;n++)await h.run('advance','box',{choice:0,actionId:action(n)});
 await h.run('claim','box');
 await h.run('begin','ticket',{roll:.999,seed:12});
 for(let n=0;n<3;n++)await h.run('advance','ticket',{choice:n,actionId:action(20+n)});
 const outcome=await h.run('claim','ticket');
 const a=h.accounts.get('alice');
 assert.equal(outcome.reward.amount,40);
 assert.equal(a.currency,145);
 assert.equal(a.quests.find(q=>q.id==='q_daily_fun').current,1);
 assert.equal(a.quests.find(q=>q.id==='q_week_fun').current,2);
 assert.equal(a.quests.find(q=>q.id==='q_event_fun').current,2);
 assert.equal(a.storyStates[fun.META].history.length,2);
 assert.equal(rules.progress(a.storyStates[fun.META],day).done,2);
 const writes=h.writes;
 await h.run('claim','ticket');
 assert.equal(a.currency,145);assert.equal(h.writes,writes);
});

test('C2.5 duplicate game input cannot advance twice or mint a second reward',async()=>{
 const h=env();
 await h.run('begin','box',{roll:.01,seed:5});
 const id=action(100);
 const result=await h.run('advance','box',{choice:rules.sequence(5)[0],actionId:id});
 const writes=h.writes;
 const retry=await h.run('advance','box',{choice:rules.sequence(5)[0],actionId:id});
 assert.equal(result.state.rounds.box.step,1);
 assert.equal(retry.status,'already-applied');
 assert.equal(retry.state.rounds.box.step,1);
 assert.equal(h.writes,writes);
});

test('C2.5 claimed item blocked by full inventory remains claimable later',async()=>{
 const h=env(),a=h.accounts.get('alice');
 a.inventory=Array.from({length:500},(_,i)=>({instanceId:'old-'+i}));
 await h.run('begin','box',{roll:.76,seed:0});
 for(let n=0;n<3;n++)await h.run('advance','box',{choice:0,actionId:action(n)});
 const before=h.writes;
 await assert.rejects(h.run('claim','box'),e=>e.reason==='inventory-full');
 assert.equal(h.writes,before);
 assert.equal(a.storyStates[fun.META].rounds.box.status,'ready');
 a.inventory=[];
 assert.equal((await h.run('claim','box')).status,'applied');
 assert.equal(a.inventory.length,1);
});

test('C2.5 isolates UIDs and rejects rollback clocks',async()=>{
 const h=env();
 await h.run('begin','ticket',{roll:0,seed:3});
 h.auth.currentUser={uid:'bob'};
 assert.equal((await fun.load({db:h.db,auth:h.auth,uid:'bob',now:()=>at})).state
  .rounds.ticket,null);
 assert.equal(h.accounts.get('bob').currency,100);
 h.auth.currentUser={uid:'alice'};
 await assert.rejects(fun.run({db:h.db,auth:h.auth,uid:'bob',kind:'claim',
  type:'ticket',now:()=>at}),e=>e.reason==='invalid-account');
 await assert.rejects(h.run('advance','ticket',{
  choice:0,actionId:action(40),now:()=>at-24*3600000}),
  e=>e.reason==='clock-backwards');
 h.auth.currentUser={uid:'bob'};
 await assert.rejects(h.run('claim','ticket'),e=>e.reason==='invalid-account');
});

test('C2.5 main is wired to the remote game, with no retrospective practice conversion',()=>{
 const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../js/dudu-fun-ui-v43.js'),'utf8');
 assert.match(main,/personal-fun-c25\.js\?v=c25-1/);
 assert.match(main,/DuduFunLiveBridgeC25=Object\.freeze/);
 assert.match(main,/await Promise\.allSettled\(\[\.\.\.pendingLiveProfileWrites\]\)/);
 assert.match(ui,/if\(!sandbox\(\)\)return liveAction\('claim'\)/);
 assert.doesNotMatch(ui,/dudu-fun:practice:v51:/);
 assert.match(ui,/Đã nhận vào tài khoản/);
});
