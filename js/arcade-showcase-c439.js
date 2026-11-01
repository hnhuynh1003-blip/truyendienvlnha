/* C4.39 — personal display preferences, never proof of item ownership.
 * Saved IDs are merely a device-side arrangement; every display is checked
 * against the current C4.38 discovery snapshot on every render/action.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduArcadeShowcaseC439=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1,MAX_SLOTS=4;
 const validId=id=>typeof id==='string'&&/^(?:neon-contract-[0-2]|ore-[a-z]+|fish-[a-z]+|jade-[1-7]-[0-7])$/.test(id);
 function normalize(raw){
  let source=raw;
  if(typeof source==='string'){
   try{source=JSON.parse(source);}catch(_){return [];}
  }
  const list=Array.isArray(source)?source:Array.isArray(source?.selected)?source.selected:[];
  return [...new Set(list.filter(validId))].slice(0,MAX_SLOTS);
 }
 const ownedIds=book=>new Set((book?.items||[]).filter(item=>
  item.status==='owned'&&item.owned===true&&item.season==='evergreen').map(item=>item.id));
 function visible(raw,book){
  const allowed=ownedIds(book);
  return normalize(raw).filter(id=>allowed.has(id));
 }
 function toggle(raw,id,book){
  const allowed=ownedIds(book);
  if(!validId(id)||!allowed.has(id))return {ok:false,reason:'not-owned',selected:visible(raw,book)};
  const selected=visible(raw,book);
  if(selected.includes(id))return {ok:true,removed:true,selected:selected.filter(x=>x!==id)};
  if(selected.length>=MAX_SLOTS)return {ok:false,reason:'full',selected};
  return {ok:true,removed:false,selected:[...selected,id]};
 }
 return Object.freeze({VERSION,MAX_SLOTS,normalize,visible,toggle});
});
