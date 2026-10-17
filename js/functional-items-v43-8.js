/* DUDU V43.8 — deterministic local functional-item plans, Sandbox only.
 * No verified/rare prizes or Cloudflare/Firebase writes. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
  typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog,
  typeof module==='object'&&module.exports?
  require('./loot-cadence-v42.js'):root?.DuduLootCadenceV42);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduFunctionalItemsV438=api;
})(typeof window!=='undefined'?window:null,function(core,catalog,cadence){
 'use strict';
 const VERSION=1,MAX_INVENTORY=500,MAX_HISTORY=30;
 const ALLOWED=Object.freeze([core.SUPPLY_ID,core.PULSE_ID,core.COUPON_ID]);
 const LIMITS=Object.freeze({[core.SUPPLY_ID]:2,[core.PULSE_ID]:2,[core.COUPON_ID]:1});
 const published=Object.freeze(Object.fromEntries(core.ADDITIONAL_TOOLS.map(x=>[x.id,x])));
 function validDay(x){
  return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
   Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
   new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 }
 function norm(raw,day=core.localDay()){
  const blank={version:VERSION,day,counts:{},usedIds:[],pending:null,history:[]};
  if(!validDay(day))return blank;
  if(!raw||typeof raw!=='object'||raw.version!==VERSION)return blank;
  const history=Array.isArray(raw.history)?raw.history.filter(x=>x&&
   typeof x.id==='string'&&x.id.length<=96&&
   typeof x.kind==='string'&&ALLOWED.includes(x.kind)&&
   validDay(x.day)).slice(-MAX_HISTORY).map(x=>({id:x.id,kind:x.kind,day:x.day})):[];
  if(raw.day!==day)return {...blank,history};
  const counts={};
  for(const id of ALLOWED){
   const n=raw.counts?.[id];
   counts[id]=Number.isSafeInteger(n)?Math.max(0,Math.min(LIMITS[id],n)):0;
  }
  const usedIds=Array.isArray(raw.usedIds)?[...new Set(raw.usedIds.filter(x=>
   typeof x==='string'&&/^shop-[a-zA-Z0-9-]{1,110}$/.test(x)))].slice(-50):[];
  const pending=raw.pending&&typeof raw.pending==='object'&&
   raw.pending.day===day&&raw.pending.kind===core.COUPON_ID&&
   typeof raw.pending.instanceId==='string'&&
   /^shop-[a-zA-Z0-9-]{1,110}$/.test(raw.pending.instanceId)?
   {kind:core.COUPON_ID,instanceId:raw.pending.instanceId,day}:null;
  return {...blank,counts,usedIds,pending,history};
 }
 function trusted(item){
  if(!item||!ALLOWED.includes(item.id))return false;
  const product=published[item.id];
  return item.itemId===product.id&&item.name===product.name&&
   item.rank===product.rank&&item.type===product.type&&
   item.scope==='FUNCTIONAL'&&item.giftable===false&&
   item.unique===false&&item.obtainedFrom?.kind==='SHOP'&&
   item.obtainedFrom?.source==='DUDU_MARKET'&&
   typeof item.instanceId==='string'&&
   /^shop-[a-zA-Z0-9-]{1,110}$/.test(item.instanceId);
 }
 function availability({inventory,state,itemInstanceId,lastLootTimestamp,
  day=core.localDay(),now=Date.now()}={}){
  const s=norm(state,day);
  const item=Array.isArray(inventory)?inventory.find(x=>x?.instanceId===itemInstanceId):null;
  const denied=reason=>({canUse:false,reason,used:s.counts[item?.id]||0,
    limit:LIMITS[item?.id]||0,pending:!!s.pending});
  if(!validDay(day)||day!==core.localDay(now)||!Number.isFinite(now)||now<=0)
   return denied('invalid-time');
  if(!Array.isArray(inventory)||!trusted(item)||
   inventory.filter(x=>x?.instanceId===itemInstanceId).length!==1)
   return denied('unowned-or-invalid');
  if(s.usedIds.includes(itemInstanceId))return denied('already-used');
  if((s.counts[item.id]||0)>=LIMITS[item.id])return denied('daily-limit');
  if(item.id===core.COUPON_ID&&s.pending)return denied('coupon-active');
  if(item.id===core.SUPPLY_ID&&inventory.length>=MAX_INVENTORY)
   return denied('inventory-full');
  if(item.id===core.PULSE_ID&&
    cadence.phoneRemainingMs(lastLootTimestamp,now)<=0)return denied('no-cooldown');
  return {canUse:true,reason:'ready',used:s.counts[item.id]||0,
   limit:LIMITS[item.id],pending:!!s.pending};
 }
 function quoteUse({inventory,state,itemInstanceId,lastLootTimestamp,
  day=core.localDay(),now=Date.now()}={}){
  const avail=availability({inventory,state,itemInstanceId,lastLootTimestamp,day,now});
  if(!avail.canUse)return {ok:false,reason:avail.reason};
  const current=norm(state,day);
  const target=inventory.find(x=>x?.instanceId===itemInstanceId);
  let next=inventory.filter(x=>x!==target);
  let timestamp=lastLootTimestamp;
  let pending=current.pending;
  const extras=[];
  if(target.id===core.SUPPLY_ID){
   for(const [n,id] of ['common-bottled-water','common-biscuit'].entries()){
    const p=catalog.byId(id);
    if(!p||p.scope!=='COMMON'||p.unique||p.discardable===false)
     return {ok:false,reason:'invalid-catalog'};
    extras.push({...p,instanceId:'supply-'+itemInstanceId+'-'+n,
     obtainedFrom:{kind:'EVENT',source:'DUDU_SUPPLY_V438',eventId:itemInstanceId}});
   }
   next=[...extras,...next];
  }else if(target.id===core.PULSE_ID){
   const remaining=cadence.phoneRemainingMs(lastLootTimestamp,now);
   timestamp=remaining<=60000?0:Number(lastLootTimestamp)-60000;
  }else if(target.id===core.COUPON_ID){
   pending={kind:core.COUPON_ID,day,instanceId:itemInstanceId};
  }
  return {ok:true,itemId:target.id,inventory:next,lastLootTimestamp:timestamp,
   added:extras,state:{...current,pending,
    counts:{...current.counts,[target.id]:(current.counts[target.id]||0)+1},
    usedIds:[...current.usedIds,itemInstanceId].slice(-50),
    history:[...current.history,{id:itemInstanceId,kind:target.id,day}].slice(-MAX_HISTORY)}};
 }
 function discount(raw,{itemId,price,day=core.localDay()}={}){
  const s=norm(raw,day);
  if(!s.pending||!core.SHOP_IDS.includes(itemId)||
   !Number.isSafeInteger(price)||price<1)return {amount:0,state:s};
  return {amount:Math.min(12,Math.floor(price*0.25)),state:s};
 }
 function redeem(raw,{itemId,price,day=core.localDay()}={}){
  const d=discount(raw,{itemId,price,day});
  if(!d.amount)return {ok:false,reason:'coupon-not-applicable'};
  return {ok:true,amount:d.amount,state:{...d.state,pending:null}};
 }
 return Object.freeze({VERSION,ALLOWED,LIMITS,norm,trusted,availability,quoteUse,
  discount,redeem});
});
