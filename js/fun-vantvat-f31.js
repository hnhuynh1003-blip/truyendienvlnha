/* F3.5 source-specific, fixed Xu values. Not a player-to-player market. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduFunVantVatF31=api;
})(typeof window!=='undefined'?window:null,function(catalog){
 'use strict';
 // F3.5 reprices Vạn Tượng only. Existing Vạn Bảo keeps its old sale
 // quotes, including for collectors who already own those items.
 const BOX_VALUES=Object.freeze({E:3,D:6,C:12,B:26,A:55,S:120,SS:320,SSS:900});
 const VALUES=Object.freeze({E:4,D:8,C:16,B:40,A:100,S:300,SS:900,SSS:3000});
 const PRICE=25,MAX_WALLET=1000000000;
 // A fixed probability budget PER RANK. Adding a collectible must never
 // silently make S/SS/SSS drops more common or inflate expected Xu returns.
 // 100x resolution permits all three SSS identities to remain drawable,
 // while preserving the exact percentages and expected Xu value.
 const RANK_BUDGET=Object.freeze({E:400000,D:280000,C:170000,B:80000,A:36000,S:14000,SS:3000,SSS:200});
 const rankCounters={};
 const counts=(catalog.funVantVat||[]).reduce((a,item)=>
  (a[item.rank]=(a[item.rank]||0)+1,a),{});
 const POOL=Object.freeze((catalog.funVantVat||[]).map(item=>{
  const index=rankCounters[item.rank]||0;
  rankCounters[item.rank]=index+1;
  const count=counts[item.rank],budget=RANK_BUDGET[item.rank];
  return Object.freeze({itemId:item.id,rank:item.rank,
   weight:Math.floor(budget/count)+(index<budget%count?1:0)});
 }).concat([Object.freeze({itemId:'F31_COIN_8',rank:'COIN',weight:70000,amount:8}),
  Object.freeze({itemId:'F31_COIN_30',rank:'COIN',weight:22000,amount:30})]));
 const TOTAL=POOL.reduce((n,p)=>n+p.weight,0);
 const HIGH_RANKS=Object.freeze(['A','S','SS','SSS']);
 const RARE_POOL=Object.freeze(POOL.filter(p=>HIGH_RANKS.includes(p.rank)));
 const RARE_TOTAL=RARE_POOL.reduce((n,p)=>n+p.weight,0);
 function draw(roll){
  if(!Number.isSafeInteger(roll)||roll<0||roll>=TOTAL)return null;
  let cursor=0;
  for(const prize of POOL){cursor+=prize.weight;if(roll<cursor)return prize;}
  return null;
 }
 // F3.6: the hundredth non-A+ spin guarantees a physical collectible, not coins.
 // Prefer one the player doesn't already hold, without inventing an item ID.
 function guaranteed(roll,ownedIds=[]){
  if(!Number.isSafeInteger(roll)||roll<0||roll>=RARE_TOTAL)return null;
  const owned=new Set(Array.isArray(ownedIds)?ownedIds:[]);
  const available=RARE_POOL.filter(row=>!owned.has(row.itemId));
  const pool=available.length?available:RARE_POOL;
  const total=pool.reduce((n,p)=>n+p.weight,0);
  const target=roll%total;
  let cursor=0;
  for(const prize of pool){cursor+=prize.weight;if(target<cursor)return prize;}
  return null;
 }
 function valueOf(item){
  const approved=catalog.byId(item?.id);
  if(approved?.collectionSet==='VAN_CARD'&&['id','itemId','name','rank','type','scope','collectionSet'].every(k=>item[k]===approved[k])&&JSON.stringify(item.crafting)===JSON.stringify(approved.crafting)&&item.cardKind===approved.cardKind&&item.obtainedFrom?.kind==='EVENT'&&item.obtainedFrom.source==='DUDU_FUN_VANBAO_CHESS'&&/^fun-chess-[0-9a-f-]{36}$/.test(item.instanceId||'')&&item.instanceId==='fun-chess-'+item.obtainedFrom.eventId)return approved.sellValue;

  if(!approved||!['VAN_BAO','VAN_VAT'].includes(approved.collectionSet)||
   item.itemId!==approved.id||item.name!==approved.name||
   item.rank!==approved.rank||item.scope!==approved.scope||
   item.type!==approved.type||
   item.obtainedFrom?.kind!=='EVENT')return 0;
  const source=approved.collectionSet==='VAN_BAO'?'DUDU_FUN_BOX':'DUDU_FUN_VANTUONG';
  if(item.obtainedFrom.source!==source||
   !/^fun-(box|vantvat)-[0-9a-f-]{36}$/.test(item.instanceId)||
   item.instanceId!=='fun-'+(approved.collectionSet==='VAN_BAO'?'box-':'vantvat-')+
    item.obtainedFrom.eventId)return 0;
  const scale=approved.collectionSet==='VAN_BAO'?BOX_VALUES:VALUES;
  return scale[approved.rank]||0;
 }
 return Object.freeze({PRICE,MAX_WALLET,POOL,TOTAL,RARE_TOTAL,HIGH_RANKS,
  VALUES,BOX_VALUES,draw,guaranteed,valueOf});
});
