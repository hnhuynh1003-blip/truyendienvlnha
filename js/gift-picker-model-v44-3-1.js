/* DUDU V44.3.1 — compact gift selection for already-eligible inventory.
 * A group is only a visual summary. Posting still consumes exactly one
 * concrete instanceId via the existing server-gated Sandbox gift contract.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduGiftPickerModelV4431=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MODES=Object.freeze([
  {id:'ALL',label:'Tất cả'},
  {id:'COMMON',label:'Phổ thông'},
  {id:'WORLD',label:'Thế giới'},
  {id:'MATERIAL',label:'Nguyên liệu'},
  {id:'TOOL',label:'Dụng cụ'},
  {id:'RECENT',label:'Gần đây'}
 ]);
 const clean=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/đ/g,'d').replace(/Đ/g,'D').toLocaleLowerCase('vi').trim();
 function groups(choices=[]){
  if(!Array.isArray(choices))return [];
  const rows=[],byId=new Map(),instances=new Set();
  choices.slice(0,500).forEach((x,index)=>{
   if(!x||typeof x.instanceId!=='string'||!x.instanceId||
      typeof x.name!=='string'||!x.name||instances.has(x.instanceId))return;
   instances.add(x.instanceId);
   // Do not group unknown IDs together; each unique instance stays separate.
   const id=String(x.itemId||x.id||x.instanceId);
   let row=byId.get(id);
   if(!row){
    row={id,name:x.name,icon:String(x.icon||'🎁'),
     description:String(x.description||'').slice(0,150),
     rank:String(x.rank||'F'),scope:String(x.scope||'COMMON'),
     category:String(x.category||'OTHER'),recent:!!x.recent,
     instances:[],firstIndex:index};
    byId.set(id,row);rows.push(row);
   }
   row.instances.push(x.instanceId);
   if(x.recent)row.recent=true;
  });
  return rows.map(row=>Object.freeze({...row,
   count:row.instances.length,instanceId:row.instances[0],
   instances:Object.freeze([...row.instances])}));
 }
 function filter(rows=[],{mode='ALL',query=''}={}){
  const q=clean(query);
  return rows.filter(row=>{
   const match=mode==='ALL'||mode==='RECENT'&&row.recent||
    mode==='COMMON'&&row.scope==='COMMON'||
    mode==='WORLD'&&['REALM','STORY','CHAPTER'].includes(row.scope)||
    mode==='MATERIAL'&&row.category==='MATERIAL'||
    mode==='TOOL'&&['TOOL','ACTIVATABLE'].includes(row.category);
   return match&&(!q||clean(row.name+' '+row.id+' '+row.description).includes(q));
  });
 }
 function selection(rows=[],instanceId){
  if(typeof instanceId!=='string')return null;
  return rows.find(row=>row.instances.includes(instanceId))||null;
 }
 return Object.freeze({MODES,groups,filter,selection,clean});
});
