'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../lib/economy-v52.js');
test('V52 starts server currency at zero and does NOT import mutable client profile balances',()=>{
 assert.deepEqual(model.account(null),{
  balance:0,exp:0,level:1,inventoryCount:0,
  daily:{day:'',total:0,counts:{}},checkinDay:''
 });
 assert.equal(model.PRICES['common-biscuit'],8);
 assert.equal(model.PRICES['common-bottled-water'],8);
 assert.equal(model.PRICES['common-signal-device'],48);
 assert.equal(model.PRICES['dudu-tool-time-pulse-v438'],undefined);
});
test('V52 daily check-in always uses canonical 8 Xu / 8 EXP and blocks repeat',()=>{
 const day='2026-10-17';
 const first=model.checkinPlan(null,day);
 assert.equal(first.ok,true);
 assert.deepEqual(first.award,{coins:8,exp:8});
 assert.equal(first.account.balance,8);
 assert.deepEqual(model.checkinPlan(first.account,day),
  {ok:false,reason:'already-claimed'});
 assert.equal(model.checkinPlan(first.account,'2026-10-16').reason,'clock-backwards');
 assert.equal(model.checkinPlan(first.account,'2026-10-18').account.balance,16);
});
test('V52 validates only server allowlisted items, inventory size and available balance',()=>{
 const fresh=model.purchasePlan(null,'common-biscuit','2026-10-17');
 assert.equal(fresh.reason,'not-enough-coins');
 assert.equal(model.purchasePlan(null,'shop-skill-rare','2026-10-17').reason,'not-for-sale');
 const balance={balance:20,exp:0,level:1,inventoryCount:0};
 const ok=model.purchasePlan(balance,'common-biscuit','2026-10-17');
 assert.equal(ok.ok,true);
 assert.equal(ok.price,8);
 assert.equal(ok.account.balance,12);
 assert.equal(ok.account.inventoryCount,1);
 assert.equal(ok.account.daily.total,1);
 assert.equal(model.purchasePlan({...balance,inventoryCount:500},'common-biscuit','2026-10-17').reason,'inventory-full');
});
test('V52 restricts each item to three and all buys to eight per UTC day',()=>{
 let a={balance:200,exp:0,level:1,inventoryCount:0};
 for(let i=0;i<3;i++)a=model.purchasePlan(a,'common-biscuit','2026-10-17').account;
 assert.equal(model.purchasePlan(a,'common-biscuit','2026-10-17').reason,'daily-limit');
 for(let i=0;i<3;i++)a=model.purchasePlan(a,'common-bottled-water','2026-10-17').account;
 for(let i=0;i<2;i++)a=model.purchasePlan(a,'e2','2026-10-17').account;
 assert.equal(model.purchasePlan(a,'common-compass','2026-10-17').reason,'daily-limit');
 assert.equal(model.purchasePlan(a,'common-compass','2026-10-18').ok,true);
});
test('V52 rejects forged or corrupt server state rather than silently resetting funds',()=>{
 for(let x of [
  {balance:-1,exp:0,level:1,inventoryCount:0},
  {balance:999999999999,exp:0,level:1,inventoryCount:0},
  {balance:10,exp:0,level:1,inventoryCount:5000},
  {balance:'100',exp:0,level:1,inventoryCount:0}]){
  assert.throws(()=>model.account(x),/invalid-server-account/);
 }
 assert.equal(model.checkinPlan({balance:1e9,exp:0,level:1,inventoryCount:0},'2026-10-17').reason,'wallet-cap');
});
test('V52 transaction id is UUID shaped and never accepts arbitrary paths',()=>{
 assert.equal(model.validRequestId('39b2b9e0-9d2a-4e7b-a2b7-55a6a74646b0'),true);
 for(const id of ['../profiles_v2/a','foo','x'.repeat(80),'12345678-1234-1234-1234-123456789012']){
  assert.equal(model.validRequestId(id),false);
 }
});
const fs=require('node:fs'),path=require('node:path');
test('V52 callables require Firebase UID, App Check and are fail-closed',()=>{
 const index=fs.readFileSync(path.join(__dirname,'../index.js'),'utf8');
 for(const fn of ['duduEconomyStatus','duduEconomyDailyCheckIn','duduEconomyPurchase'])
  assert.match(index,new RegExp('exports\\.'+fn+'=onCall\\(economyOptions'));
 assert.match(index,/enforceAppCheck:true/);
 assert.match(index,/snap\.data\(\)\?\.enabled===true&&snap\.data\(\)\?\.schemaVersion===52/);
 assert.match(index,/economyAccountRef\(uid\)/);
 assert.match(index,/tx\.create\(itemRef/);
 assert.match(index,/tx\.create\(receipt/);
 assert.match(index,/tx\.get\(receipt\)/);
 assert.doesNotMatch(index,/userProfile\.|profiles_v2\/\$\{uid\}|request\.data\.price/);
});
