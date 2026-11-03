/* F3.9 · presentation-only prize focus, physical stop position and recent spins.
 * Never draws prizes, changes odds or grants Xu. The Firestore receipt is final.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduVantVatWheelF39=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCORES=Object.freeze({COIN:0,F:1,E:2,D:3,C:4,B:5,A:6,S:7,SS:8,SSS:9});
 function featured(results){
  if(!Array.isArray(results))return null;
  return results.reduce((best,row)=>{
   if(!row||typeof row!=='object')return best;
   if(!best)return row;
   const score=(SCORES[row.rank]||0)*10+(row.kind==='ITEM'?2:row.kind==='DUPLICATE'?1:0);
   const current=(SCORES[best.rank]||0)*10+(best.kind==='ITEM'?2:best.kind==='DUPLICATE'?1:0);
   return score>current?row:best;
  },null);
 }
 function landing(itemId,sectors=9){
  if(!Number.isSafeInteger(sectors)||sectors<2||360%sectors!==0)throw Error('invalid-sectors');
  const key=String(itemId||'COIN');
  let hash=0;
  for(const letter of key)hash=((hash*31)>>>0)+letter.codePointAt(0)>>>0;
  const slot=hash%sectors,sectorDegrees=360/sectors;
  const degrees=360*8+((sectors-slot)%sectors)*sectorDegrees;
  return Object.freeze({slot,degrees});
 }
 function summary(results){
  const rows=Array.isArray(results)?results:[],focus=featured(rows);
  return Object.freeze({count:rows.length,focus,
   rare:rows.filter(row=>['S','SS','SSS'].includes(row?.rank)).length,
   items:rows.filter(row=>row?.kind==='ITEM').length,
   duplicates:rows.filter(row=>row?.kind==='DUPLICATE').length,
   gold:rows.reduce((total,row)=>total+
    (['COIN','DUPLICATE'].includes(row?.kind)&&Number.isSafeInteger(row?.amount)?row.amount:0),0)});
 }
 function recent(state,limit=20){
  const max=Number.isSafeInteger(limit)?Math.max(0,Math.min(30,limit)):20;
  if(!max)return [];
  const receipts=state?.batchReceipts&&typeof state.batchReceipts==='object'?
   Object.values(state.batchReceipts):[];
  const batches=receipts.filter(receipt=>
   Number.isSafeInteger(receipt?.at)&&Array.isArray(receipt.results))
   .sort((a,b)=>b.at-a.at);
  const rows=[],seen=new Set();
  for(const receipt of batches){
   for(const result of [...receipt.results].reverse()){
    if(!result||seen.has(result.spinId))continue;
    seen.add(result.spinId);
    rows.push({...result,at:receipt.at});
    if(rows.length>=max)return rows;
   }
  }
  for(const entry of [...(Array.isArray(state?.history)?state.history:[])].reverse()){
   if(!entry||seen.has(entry.id))continue;
   seen.add(entry.id);
   rows.push({spinId:entry.id,itemId:entry.itemId,kind:entry.duplicate?'DUPLICATE':'ITEM',
    amount:entry.returned||0,at:0});
   if(rows.length>=max)return rows;
  }
  return rows;
 }
 return Object.freeze({SCORES,featured,landing,summary,recent});
});
