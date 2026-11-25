const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../js/personal-cosmetics-p1.js');
const make=(currency=1000,initialStates={book:{chapter:2}})=>{
 let state={currency,exp:77,level:4,inventory:[{id:'old'}],storyStates:initialStates};
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
 const a=make();const result=await a.buy();assert.equal(result.balance,550);
 assert.equal(result.status,'applied');assert.equal(engine.owns(a.state().storyStates,'wallpaper','v38-lantern'),true);
 assert.deepEqual(a.state().storyStates.book,{chapter:2});assert.equal(a.state().exp,77);
 assert.equal(a.state().level,4);assert.deepEqual(a.state().inventory,[{id:'old'}]);
});
test('concurrent duplicate purchase and lost response retry debit exactly once',async()=>{
 const a=make();const result=await Promise.all([a.buy(),a.buy()]);
 assert.deepEqual(result.map(x=>x.status),['applied','already-owned']);
 assert.equal((await a.buy()).status,'already-owned');assert.equal(a.state().currency,550);assert.equal(a.writes(),1);
});
test('font shares wallet, insufficient funds and invalid SKU do not write',async()=>{
 const a=make(35);assert.equal((await a.buy('font','prata')).balance,0);
 await assert.rejects(a.buy(),/Không đủ/);await assert.rejects(a.buy('wallpaper','v38-moon'),/không hợp lệ/);
 assert.equal(a.writes(),1);assert.equal(engine.owns(a.state().storyStates,'font','prata'),true);
});
test('wrong UID and failed commit do not change balance or ownership',async()=>{
 const a=make();a.auth.currentUser.uid='b';await assert.rejects(a.buy(),/đăng nhập/);
 a.auth.currentUser.uid='a';a.fail();await assert.rejects(a.buy(),/network failure/);
 assert.equal(a.writes(),0);assert.equal(a.state().currency,1000);
 assert.equal(engine.owns(a.state().storyStates,'wallpaper','v38-lantern'),false);
});

test('P1B catalog prices and legacy ownership are preserved across repricing',async()=>{
 const catalog=require('../js/phone-wallpaper-v38-catalog.js');
 assert.deepEqual(catalog.ITEMS.filter(x=>x.kind==='premium').map(x=>[x.id,x.price]),[['v38-jade',350],['v38-neon',180],['v38-lantern',450],['v38-fox',750],['v38-abyss',280],['v39-mage',320],['v39-swordsman',400],['v39-wanderer',220],['v39-whitefox',1200]]);
 assert.equal(catalog.ITEMS.filter(x=>x.kind==='free'||x.kind==='gift').length,1);
 const a=make(1000,{book:{chapter:2},[engine.META]:{version:1,owned:{'wallpaper:v38-lantern':true}}});
 assert.equal((await a.buy()).status,'already-owned');assert.equal(a.state().currency,1000);assert.equal(a.writes(),0);
 assert.equal((await a.buy('wallpaper','v38-fox')).balance,250);
 assert.equal(engine.owns(a.state().storyStates,'wallpaper','v38-lantern'),true);
});
test('wallpaper purchase has no native browser confirm dialog',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/phone-wallpaper-v38-studio.js'),'utf8');
 assert.doesNotMatch(source,/\b(?:window\.)?(?:confirm|alert)\s*\(/);
 assert.match(source,/purchaseBusy=true/);
});
