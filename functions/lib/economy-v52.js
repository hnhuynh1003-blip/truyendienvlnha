'use strict';
// DUDU V52: pure, server-authoritative economy plans. NEVER accept client-supplied
// prices, balances, inventory or quest progress. All dates are server UTC dates.
const PRICES=Object.freeze({
  'common-biscuit':8,'common-bottled-water':8,'e2':10,
  'common-flashlight':14,'common-raincoat':16,
  'common-basic-medkit':25,'common-water-filter':25,
  'common-repair-kit':30,'common-compass':24,'common-tent':35,
  'common-health-box':42,'common-signal-device':48
});
const MAX_BALANCE=1000000000,MAX_INVENTORY=500,MAX_DAILY=8,MAX_PER_ITEM=3;
const CHECKIN_COINS=8,CHECKIN_EXP=8;
const utcDay=ms=>new Date(ms).toISOString().slice(0,10);
const validRequestId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
function account(raw){
 if(raw==null)return {balance:0,exp:0,level:1,inventoryCount:0,
  daily:{day:'',total:0,counts:{}},checkinDay:''};
 if(typeof raw!=='object'||!Number.isSafeInteger(raw.balance)||raw.balance<0||
  raw.balance>MAX_BALANCE||!Number.isSafeInteger(raw.inventoryCount)||
  raw.inventoryCount<0||raw.inventoryCount>MAX_INVENTORY||
  !Number.isSafeInteger(raw.exp)||raw.exp<0||raw.exp>1000000||
  !Number.isSafeInteger(raw.level)||raw.level<1||raw.level>999)
   throw Error('invalid-server-account');
 const daily=raw.daily&&typeof raw.daily==='object'?raw.daily:{};
 return {balance:raw.balance,exp:raw.exp,level:raw.level,
  inventoryCount:raw.inventoryCount,
  daily:{day:typeof daily.day==='string'?daily.day:'',
   total:Number.isSafeInteger(daily.total)?daily.total:0,
   counts:daily.counts&&typeof daily.counts==='object'&&!Array.isArray(daily.counts)?daily.counts:{}},
  checkinDay:typeof raw.checkinDay==='string'?raw.checkinDay:''};
}
function checkinPlan(raw,day){
 const a=account(raw);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return {ok:false,reason:'invalid-day'};
 if(a.checkinDay===day)return {ok:false,reason:'already-claimed'};
 if(a.checkinDay&&a.checkinDay>day)return {ok:false,reason:'clock-backwards'};
 if(a.balance>MAX_BALANCE-CHECKIN_COINS)return {ok:false,reason:'wallet-cap'};
 let exp=a.exp+CHECKIN_EXP,level=a.level;
 if(exp>1000000)return {ok:false,reason:'exp-cap'};
 while(level<999&&exp>=level*100){exp-=level*100;level++;}
 return {ok:true,account:{...a,balance:a.balance+CHECKIN_COINS,
  exp,level,checkinDay:day},award:{coins:CHECKIN_COINS,exp:CHECKIN_EXP}};
}
function purchasePlan(raw,itemId,day){
 const a=account(raw);
 if(!Object.hasOwn(PRICES,itemId))return {ok:false,reason:'not-for-sale'};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return {ok:false,reason:'invalid-day'};
 const daily=a.daily.day===day?a.daily:{day,total:0,counts:{}};
 const purchased=Number(daily.counts[itemId]||0);
 if(!Number.isSafeInteger(daily.total)||daily.total<0||daily.total>MAX_DAILY||
  !Number.isSafeInteger(purchased)||purchased<0||purchased>MAX_PER_ITEM)
    return {ok:false,reason:'invalid-server-account'};
 if(daily.total>=MAX_DAILY||purchased>=MAX_PER_ITEM)
   return {ok:false,reason:'daily-limit'};
 if(a.inventoryCount>=MAX_INVENTORY)return {ok:false,reason:'inventory-full'};
 const price=PRICES[itemId];
 if(a.balance<price)return {ok:false,reason:'not-enough-coins'};
 return {ok:true,price,account:{...a,balance:a.balance-price,
  inventoryCount:a.inventoryCount+1,
  daily:{day,total:daily.total+1,counts:{...daily.counts,[itemId]:purchased+1}}}};
}
module.exports=Object.freeze({PRICES,MAX_BALANCE,MAX_INVENTORY,MAX_DAILY,
 MAX_PER_ITEM,CHECKIN_COINS,CHECKIN_EXP,utcDay,validRequestId,
 account,checkinPlan,purchasePlan});
