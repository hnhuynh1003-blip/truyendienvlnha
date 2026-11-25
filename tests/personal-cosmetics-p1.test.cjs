const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../js/personal-cosmetics-p1.js');
const make=(currency=100)=>{
 let state={currency,exp:77,level:4,inventory:[{id:'old'}],storyStates:{book:{chapter:2}}};
 let writes=0,fail=false,queue=Promise.resolve();
 const auth={currentUser:{uid:'a'}};
 const db={collection:name=>{assert.equal(name,'profiles_v2');return {doc:uid=>uid};},
 runTransaction(fn){
  const task=queue.then(async()=>{
   let patch;
   const result=await fn({get:async uid=>{assert.equal(uid,'a');return {exists:true,data:()=>structuredClone(state)};},
    update:(uid,p)=>{assert.equal(uid,'a');patch=p;}});
   if(fail)throw Error('network failure');
   if(patch){state={...state,...patch};writes++;}
   return result;
  });
  queue=task.catch(()=>{});return task;
 }};
 return {auth,db,state:()=>state,writes:()=>writes,fail:()=>{fail=true;},
  buy:(kind='wallpaper',id='v38-lantern')=>engine.purchase({auth,db,uid:'a',kind,id})};
};
test('purchase changes only existing wallet and permanent ownership, not EXP or inventory',async()=>{
 const a=make();const result=await a.buy();assert.equal(result.balance,55);
 assert.equal(result.status,'applied');assert.equal(engine.owns(a.state().storyStates,'wallpaper','v38-lantern'),true);
 assert.deepEqual(a.state().storyStates.book,{chapter:2});assert.equal(a.state().exp,77);
 assert.equal(a.state().level,4);assert.deepEqual(a.state().inventory,[{id:'old'}]);
});
test('concurrent duplicate purchase and lost response retry debit exactly once',async()=>{
 const a=make();const result=await Promise.all([a.buy(),a.buy()]);
 assert.deepEqual(result.map(x=>x.status),['applied','already-owned']);
 assert.equal((await a.buy()).status,'already-owned');assert.equal(a.state().currency,55);assert.equal(a.writes(),1);
});
test('font shares wallet, insufficient funds and invalid SKU do not write',async()=>{
 const a=make(35);assert.equal((await a.buy('font','prata')).balance,0);
 await assert.rejects(a.buy(),/Không đủ/);await assert.rejects(a.buy('wallpaper','v38-moon'),/không hợp lệ/);
 assert.equal(a.writes(),1);assert.equal(engine.owns(a.state().storyStates,'font','prata'),true);
});
test('wrong UID and failed commit do not change balance or ownership',async()=>{
 const a=make();a.auth.currentUser.uid='b';await assert.rejects(a.buy(),/đăng nhập/);
 a.auth.currentUser.uid='a';a.fail();await assert.rejects(a.buy(),/network failure/);
 assert.equal(a.writes(),0);assert.equal(a.state().currency,100);
 assert.equal(engine.owns(a.state().storyStates,'wallpaper','v38-lantern'),false);
});
