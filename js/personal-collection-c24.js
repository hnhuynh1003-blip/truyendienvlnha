/* C2.4c — owner-scoped collection and item journey, no grants.
 * A journal is a projection of verified profile inventory and existing
 * transaction receipts. It is NOT an alternative inventory or anti-cheat.
 */
(function(root,factory){
 'use strict';
 const node=typeof module==='object'&&module.exports;
 const api=factory(
  node?require('./item-catalog-v2.js'):root?.DuduItemCatalog,
  node?require('./economy-core-v43.js'):root?.DuduEconomyCoreV43);
 if(node)module.exports=api;
 if(root)root.DuduPersonalCollectionC24=api;
})(typeof window!=='undefined'?window:null,function(catalog,economy){
 'use strict';
 const META='__duduCollectionC24',VERSION=1,MAX_EVENTS=90;
 const KINDS=Object.freeze(['SHOP','USE','SELL','GLOBAL','CHAPTER','QUEST',
  'NPC_GIFT','SUPPLY']);
 const realms=catalog.REALM_TAGS;
 const products=new Map((economy.FUNCTIONAL_TOOLS||[]).map(x=>[x.id,x]));
 const validId=s=>typeof s==='string'&&s.length>0&&s.length<=220&&
  !/[\u0000-\u001f]/.test(s)&&!['__proto__','constructor','prototype'].includes(s);
 const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const time=x=>Number.isSafeInteger(x)&&x>0&&x<=8640000000000000;
 function canonical(item){
  if(!isObject(item))return null;
  const id=item.id||item.itemId;
  if(!validId(id))return null;
  const approved=catalog.byId(id)||products.get(id);
  if(!approved||approved.archived||item.id!==approved.id||
    item.itemId!==approved.id||
    item.name!==approved.name||item.rank!==approved.rank||
    item.scope!==approved.scope||item.type!==approved.type||
    (approved.scope==='REALM'&&item.realmTag!==approved.realmTag))return null;
  return approved;
 }
 function normalize(raw){
  const found={};
  for(const tag of realms){
   const allowed=new Set(catalog.list({scope:'REALM',realmTag:tag}).map(x=>x.id));
   found[tag]=[...new Set(Array.isArray(raw?.found?.[tag])?
    raw.found[tag].filter(id=>typeof id==='string'&&allowed.has(id)):[])].slice(0,20);
  }
  const events=[],seen=new Set();
  const source=Array.isArray(raw?.events)?raw.events:[];
  for(const row of source.slice(-MAX_EVENTS*3)){
   if(!isObject(row)||!validId(row.id)||seen.has(row.id)||
    !KINDS.includes(row.kind)||!time(row.at)||
    !Number.isSafeInteger(row.price)||Math.abs(row.price)>1000000000)continue;
   const item=catalog.byId(row.itemId)||products.get(row.itemId);
   if(!item||item.archived||!item.id)continue;
   seen.add(row.id);
   events.push({id:row.id,kind:row.kind,itemId:item.id,at:row.at,
    price:row.price,instanceId:validId(row.instanceId)?row.instanceId:''});
  }
  return {version:VERSION,found,events:events.slice(-MAX_EVENTS)};
 }
 function mergeInventory(state,inventory){
  for(const owned of Array.isArray(inventory)?inventory:[]){
   const item=canonical(owned);
   if(item?.scope==='REALM'&&item.realmTag&&state.found[item.realmTag]&&
     !state.found[item.realmTag].includes(item.id))
    state.found[item.realmTag].push(item.id);
  }
  return state;
 }
 function append(raw,{eventId,kind,item,at=Date.now(),price=0,instanceId='',inventory=[]}={}){
  const state=mergeInventory(normalize(raw),inventory);
  const product=canonical(item);
  if(!product||!validId(eventId)||!KINDS.includes(kind)||!time(at)||
   !Number.isSafeInteger(price)||Math.abs(price)>1000000000)
   return {ok:false,reason:'invalid-event',state};
  if(state.events.some(row=>row.id===eventId))return {ok:true,duplicate:true,state};
  if(product.scope==='REALM'&&product.realmTag&&
    !state.found[product.realmTag].includes(product.id))
   state.found[product.realmTag].push(product.id);
  state.events=[...state.events,{id:eventId,kind,itemId:product.id,at,price,
    instanceId:validId(instanceId)?instanceId:''}].slice(-MAX_EVENTS);
  return {ok:true,duplicate:false,state};
 }
 // Project previously-issued wallet receipts without modifying cloud data.
 // Their timestamp is known; old items without receipts are ONLY counted as
 // currently held and must not receive an invented acquisition date.
 function receiptEvents(storyStates){
  const states=isObject(storyStates)?storyStates:{};
  const shop=isObject(states.__duduPersonalItemsV1?.receipts)?
   states.__duduPersonalItemsV1.receipts:{};
  const progress=isObject(states.__duduPersonalProgressC23?.globalReceipts)?
   states.__duduPersonalProgressC23.globalReceipts:{};
  const rows=[];
  for(const [id,receipt] of Object.entries(shop)){
   if(!validId(id)||!isObject(receipt))continue;
   const kind={purchase:'SHOP',use:'USE',sell:'SELL'}[receipt.kind];
   const item=catalog.byId(receipt.itemId)||products.get(receipt.itemId);
   const at=Date.parse(receipt.at);
   if(!kind||!item||item.archived||!item.id||!time(at))continue;
   rows.push({id,kind,itemId:item.id,at,
    price:Number.isSafeInteger(receipt.price)?receipt.price:0,
    instanceId:validId(receipt.instanceId)?receipt.instanceId:''});
  }
  for(const [id,receipt] of Object.entries(progress)){
   if(!validId(id)||!isObject(receipt))continue;
   const item=catalog.byId(receipt.itemId),at=receipt.at;
   if(!item||item.archived||!item.id||!time(at))continue;
   rows.push({id,kind:'GLOBAL',itemId:item.id,at,price:0,
    instanceId:validId(receipt.instanceId)?receipt.instanceId:''});
  }
  return rows;
 }
 function snapshot({inventory=[],storyStates={}}={}){
  const states=isObject(storyStates)?storyStates:{};
  const state=mergeInventory(normalize(states[META]),inventory);
  const byId=new Map();
  for(const row of [...receiptEvents(states),...state.events])byId.set(row.id,row);
  const events=[...byId.values()].sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id))
   .slice(0,MAX_EVENTS).map(row=>{
    const item=catalog.byId(row.itemId)||products.get(row.itemId);
    return {...row,name:item.name,icon:item.icon,rank:item.rank};
   });
  const total=realms.reduce((n,tag)=>n+state.found[tag].length,0);
  return {found:state.found,events,total,historyLimit:MAX_EVENTS};
 }
 return Object.freeze({META,VERSION,MAX_EVENTS,KINDS,canonical,normalize,
  mergeInventory,append,receiptEvents,snapshot});
});
