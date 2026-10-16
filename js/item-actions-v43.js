/* V43.5.3 Sandbox consumable rules: pure inventory and cooldown plans.
 * Use only shop-issued whitelisted items, never reset chapter claims.
 * Client-side rules are gameplay, NOT authority to mint server rewards.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
   require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
   typeof module==='object'&&module.exports?
   require('./loot-cadence-v42.js'):root?.DuduLootCadenceV42);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduItemActionsV43=api;
})(typeof window!=='undefined'?window:null,function(core,cadence){
 'use strict';
 const MAX_USE_PER_DAY=2;
 const validDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
   Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
   new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 function norm(raw,day=core.localDay()){
   const empty={version:1,day,used:0,eventIds:[]};
   if(!validDay(day)||!raw||raw.version!==1||raw.day!==day)return empty;
   if(!Number.isSafeInteger(raw.used)||raw.used<0||
     !Array.isArray(raw.eventIds))return empty;
   const ids=[...new Set(raw.eventIds.filter(x=>typeof x==='string'&&
     /^shop-[a-zA-Z0-9-]{1,110}$/.test(x)))].slice(0,MAX_USE_PER_DAY);
   return {...empty,used:Math.min(MAX_USE_PER_DAY,Math.max(raw.used,ids.length)),
     eventIds:ids};
 }
 function validCell(item){
   return !!item&&typeof item==='object'&&!Array.isArray(item)&&
     item.id===core.TOOL_ID&&item.itemId===core.TOOL_ID&&
     item.name===core.TOOL.name&&item.rank===core.TOOL.rank&&
     item.type===core.TOOL.type&&item.scope===core.TOOL.scope&&
     item.giftable===false&&item.unique===false&&
     item.obtainedFrom?.kind==='SHOP'&&
     item.obtainedFrom?.source==='DUDU_MARKET'&&
     typeof item.instanceId==='string'&&
     /^shop-[a-zA-Z0-9-]{1,110}$/.test(item.instanceId);
 }
 function quote({inventory,state,itemInstanceId,lastLootTimestamp,now=Date.now(),
   day=core.localDay(now)}={}){
   const next=norm(state,day);
   const denied=(reason)=>({ok:false,reason,state:next});
   if(!validDay(day)||!Number.isFinite(now)||now<=0||
      day!==core.localDay(now))return denied('invalid-time');
   if(!Array.isArray(inventory)||typeof itemInstanceId!=='string')
     return denied('invalid-inventory');
   const matches=inventory.map((item,index)=>
     item?.instanceId===itemInstanceId?index:-1).filter(index=>index>=0);
   if(matches.length!==1||!validCell(inventory[matches[0]]))
     return denied('unowned-or-invalid');
   if(next.eventIds.includes(itemInstanceId))return denied('already-used');
   if(next.used>=MAX_USE_PER_DAY)return denied('daily-limit');
   const remaining=cadence.phoneRemainingMs(lastLootTimestamp,now);
   if(remaining===0)return denied('no-cooldown');
   const copy=inventory.slice();copy.splice(matches[0],1);
   return {ok:true,remaining,
     inventory:copy,
     lastLootTimestamp:0,
     state:{...next,used:next.used+1,
       eventIds:[...next.eventIds,itemInstanceId]},
     itemId:core.TOOL_ID};
 }
 function availability({inventory,state,itemInstanceId,lastLootTimestamp,
   now=Date.now(),day=core.localDay(now)}={}){
   const plan=quote({inventory,state,itemInstanceId,lastLootTimestamp,now,day});
   const current=norm(state,day);
   return {canUse:plan.ok,reason:plan.ok?'ready':plan.reason,
     used:current.used,limit:MAX_USE_PER_DAY,
     remaining:cadence.phoneRemainingMs(lastLootTimestamp,now)};
 }
 return Object.freeze({MAX_USE_PER_DAY,norm,validCell,quote,availability});
});
