/* G2 projection only; canonical classification is delegated to the existing inventory model.
 * No ownership inference, mutation, persistence, network, or combat equipment mapping. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduSharedInventoryG2=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const LIMIT=12;
 const short=(value,n)=>typeof value==='string'?value.slice(0,n):'';
 function project({ready=false,inventory=null,model=null}={}){
  if(!ready||!Array.isArray(inventory)||typeof model?.inspect!=='function')
   return {available:false,items:[]};
  const groups={equipment:[],material:[]};
  let equipment=0,material=0;
  for(const record of inventory){
   const detail=model.inspect(record);
   if(!detail||detail.archive||!['EQUIPMENT','MATERIAL'].includes(detail.category))continue;
   const key=detail.category==='EQUIPMENT'?'equipment':'material';
   if(key==='equipment')equipment++;else material++;
   if(groups[key].length<LIMIT)groups[key].push({
    name:short(detail.name,100)||'Vật phẩm',rank:short(detail.rank,3),
    category:detail.category,world:short(detail.worldLabel,40),source:short(detail.acquisitionKind,20)
   });
  }
  return {available:true,total:inventory.length,equipment,material,items:[...groups.equipment,...groups.material]};
 }
 return Object.freeze({project});
});
