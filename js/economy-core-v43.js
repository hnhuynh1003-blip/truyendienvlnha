/* DUDU V43.5 — shared Sandbox economy + quest-event contract.
 * The shop, inventory and quests use stable catalog IDs.
 * All transactions are pure plans; UI MUST gate to Sandbox before applying.
 * Client saves are NOT proof of server ownership or anti-cheat.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
   require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEconomyCoreV43=api;
})(typeof window!=='undefined'?window:null,function(catalog){
 'use strict';
 const VERSION=1;
 const SHOP_IDS=Object.freeze([
   'common-biscuit','common-bottled-water','e2','common-flashlight',
   'common-raincoat','common-basic-medkit','common-water-filter',
   'common-repair-kit','common-compass','common-tent',
   'common-health-box','common-signal-device'
 ]);
 const PRICES=Object.freeze({
   'common-biscuit':8,'common-bottled-water':8,e2:10,
   'common-flashlight':14,'common-raincoat':16,
   'common-basic-medkit':25,'common-water-filter':25,
   'common-repair-kit':30,'common-compass':24,'common-tent':35,
   'common-health-box':42,'common-signal-device':48
 });
 const PURCHASE_PER_ITEM_PER_DAY=3, PURCHASE_TOTAL_PER_DAY=8;
 const EVENT_TO_QUEST=Object.freeze({LOOT_SUCCESS:'q_daily_loot'});
 const KEY_LIMIT=96;
 const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
   !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&
   new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 function localDay(now=Date.now()){
   const date=new Date(now);
   if(!Number.isFinite(date.getTime()))return '';
   const z=n=>String(n).padStart(2,'0');
   return date.getFullYear()+'-'+z(date.getMonth()+1)+'-'+z(date.getDate());
 }
 function safeCoins(value){return Number.isSafeInteger(value)&&value>=0&&value<=1e9;}
 function norm(raw,day=localDay()){
   const state={version:VERSION,day,counts:{},total:0,events:[]};
   if(!validDay(day)||!raw||typeof raw!=='object'||raw.version!==VERSION||
      raw.day!==day)return state;
   const counts=raw.counts;
   if(counts&&typeof counts==='object'&&!Array.isArray(counts)){
     for(const id of SHOP_IDS){
       const n=counts[id];
       if(Number.isSafeInteger(n)&&n>=0)
         state.counts[id]=Math.min(PURCHASE_PER_ITEM_PER_DAY,n);
     }
   }
   state.total=Math.min(PURCHASE_TOTAL_PER_DAY,
     Object.values(state.counts).reduce((a,b)=>a+b,0));
   if(Array.isArray(raw.events))
     state.events=[...new Set(raw.events.filter(x=>
       typeof x==='string'&&x.length>0&&x.length<=KEY_LIMIT))].slice(-300);
   return state;
 }
 function shopCatalog(){
   return SHOP_IDS.map(id=>{
     const item=catalog.byId(id);
     if(!item||item.scope!=='COMMON'||item.acquisition?.method!=='RANDOM'||
        item.unique||item.discardable===false||item.giftable===false)
       throw Error('DUDU invalid shop item: '+id);
     return Object.freeze({...item,price:PRICES[id],storeCategory:
       item.type==='FOOD'?'FOOD':'SUPPLIES'});
   });
 }
 const stock=shopCatalog(), byId=new Map(stock.map(item=>[item.id,item]));
 function preview({tab='COMMON',realmTag=null,query=''}={}){
   const text=typeof query==='string'?query.trim().toLocaleLowerCase('vi').slice(0,60):'';
   let items=[];
   if(tab==='COMMON')items=stock;
   else if(tab==='REALM'&&catalog.REALM_TAGS.includes(realmTag))
     items=catalog.list({scope:'REALM',realmTag});
   else if(tab==='DUDU')items=catalog.list({scope:'DUDU'});
   return items.filter(item=>
     !text||[item.name,item.desc,item.rank].some(v=>
       String(v||'').toLocaleLowerCase('vi').includes(text)));
 }
 function quotePurchase({itemId,coins,state,day=localDay(),inventoryCount=0}={}){
   const product=byId.get(itemId);
   const next=norm(state,day);
   if(!product)return {ok:false,reason:'not-for-sale',state:next};
   if(!validDay(day)||!safeCoins(coins)||!Number.isSafeInteger(inventoryCount)||
      inventoryCount<0||inventoryCount>=500)
     return {ok:false,reason:'invalid-balance-or-cap',state:next};
   if(next.total>=PURCHASE_TOTAL_PER_DAY||
      (next.counts[itemId]||0)>=PURCHASE_PER_ITEM_PER_DAY)
     return {ok:false,reason:'daily-limit',state:next};
   if(coins<product.price)return {ok:false,reason:'not-enough-coins',state:next};
   const newCounts={...next.counts,[itemId]:(next.counts[itemId]||0)+1};
   return {ok:true,product,coins:coins-product.price,
     state:{...next,counts:newCounts,total:next.total+1}};
 }
 function recordEvent(raw,{type,eventId,day=localDay()}={}){
   const state=norm(raw,day);
   if(!validDay(day)||typeof type!=='string'||!Object.hasOwn(EVENT_TO_QUEST,type)||
      typeof eventId!=='string'||eventId.length<1||eventId.length>KEY_LIMIT)
     return {ok:false,state,reason:'invalid-event'};
   const key=type+':'+eventId;
   if(state.events.includes(key))return {ok:false,state,reason:'duplicate'};
   return {ok:true,state:{...state,events:[...state.events,key].slice(-300)},
     questId:EVENT_TO_QUEST[type]};
 }
 function applyQuestProgress(quests,questId,amount=1){
   if(!Array.isArray(quests)||!Number.isSafeInteger(amount)||amount<=0)return quests;
   return quests.map(q=>{
     if(q?.id!==questId||q.claimed||q.current>=q.target)return q;
     return {...q,current:Math.min(q.target,Math.max(0,q.current||0)+amount)};
   });
 }
 function rolloverQuests(quests,lastDay,today=localDay()){
   if(!Array.isArray(quests)||!validDay(today))return {ok:false,quests,day:lastDay};
   if(!validDay(lastDay))return {ok:true,changed:false,quests,day:today};
   if(today<=lastDay)return {ok:true,changed:false,quests,day:lastDay};
   return {ok:true,changed:true,day:today,quests:quests.map(q=>
     q?.type==='DAILY'?{...q,current:0,claimed:false}:q)};
 }
 function instance(product,id){
   if(!product||!byId.has(product.id)||typeof id!=='string'||!id)return null;
   const {price,storeCategory,...item}=product;
   return {...item,instanceId:id,obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}};
 }
 return Object.freeze({VERSION,SHOP_IDS,PRICES,PURCHASE_PER_ITEM_PER_DAY,
   PURCHASE_TOTAL_PER_DAY,EVENT_TO_QUEST,localDay,norm,shopCatalog,preview,
   quotePurchase,recordEvent,applyQuestProgress,rolloverQuests,instance});
});
