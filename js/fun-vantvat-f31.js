/* F3.1 shared, fixed Xu values. Not a player-to-player market. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduFunVantVatF31=api;
})(typeof window!=='undefined'?window:null,function(catalog){
 'use strict';
 const VALUES=Object.freeze({E:3,D:6,C:12,B:26,A:55,S:120,SS:320,SSS:900});
 const PRICE=15,MAX_WALLET=1000000000;
 const POOL=Object.freeze((catalog.funVantVat||[]).map(item=>Object.freeze({
  itemId:item.id,rank:item.rank,weight:({E:2000,D:1400,C:850,B:400,A:180,S:70,SS:15,SSS:2})[item.rank]
 })).concat([Object.freeze({itemId:'F31_COIN_8',rank:'COIN',weight:700,amount:8}),
  Object.freeze({itemId:'F31_COIN_30',rank:'COIN',weight:220,amount:30})]));
 const TOTAL=POOL.reduce((n,p)=>n+p.weight,0);
 function draw(roll){
  if(!Number.isSafeInteger(roll)||roll<0||roll>=TOTAL)return null;
  let cursor=0;
  for(const prize of POOL){cursor+=prize.weight;if(roll<cursor)return prize;}
  return null;
 }
 function valueOf(item){
  const approved=catalog.byId(item?.id);
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
  return VALUES[approved.rank]||0;
 }
 return Object.freeze({PRICE,MAX_WALLET,POOL,TOTAL,VALUES,draw,valueOf});
});
