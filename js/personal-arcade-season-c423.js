/* C4.23: Season 01 keeps a non-spendable, account-local proof album.
 * PREVIEW deliberately cannot award real inventory, wallet Xu or seasonal marks.
 * Activation follows the one-time test-account reset and server Rules review.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeSeasonC423=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID='s01',PHASE='preview';
 const RELICS=Object.freeze([
  Object.freeze({id:'neon',name:'Vi Mạch Bình Minh',icon:'⌘',world:'Trạm Neon',
   hint:'Đơn Sương mỗi 3 lượt',theme:'cyan'}),
  Object.freeze({id:'mine',name:'Tinh Thạch Sương Lam',icon:'✧',world:'Địa Tầng 07',
   hint:'Mạch Lam mỗi 3 lượt',theme:'violet'}),
  Object.freeze({id:'garden',name:'Giọt Sương Nguyệt',icon:'❀',world:'Vườn Sương',
   hint:'3 vụ mùa hoặc cá hiếm',theme:'rose'}),
  Object.freeze({id:'jade',name:'Ngọc Ấn Khai Mùa',icon:'◆',world:'Ngọc Phường',
   hint:'Xẻ 3 viên đá',theme:'gold'})
 ]);
 const idSet=new Set(RELICS.map(item=>item.id));
 const safeTime=number=>Number.isSafeInteger(number)&&number>=0?number:0;
 const fresh=()=>({version:1,records:{s01:{relics:[],firstAt:0,completedAt:0}}});
 const neonTicket=neon=>Number.isSafeInteger(neon?.orderRound)&&neon.orderRound%3===2;
 const mineVein=mine=>Number.isSafeInteger(mine?.probes)&&mine.probes%3===2;
 function norm(raw,now=Date.now()){
  const source=raw?.records?.s01||{};
  const relics=Array.isArray(source.relics)?RELICS.filter(item=>
   source.relics.includes(item.id)).map(item=>item.id):[];
  const firstAt=Math.min(safeTime(source.firstAt),safeTime(now));
  const completedAt=relics.length===RELICS.length?
   Math.min(safeTime(source.completedAt),safeTime(now)):0;
  return {version:1,records:{s01:{relics,firstAt,completedAt}}};
 }
 function earnedBy(action,before,after){
  if(/^neon-order-[012]$/.test(action)&&neonTicket(before?.neon)&&
     after?.neon?.orderWon>before?.neon?.orderWon)return 'neon';
  if(/^mine-probe-[012]$/.test(action)&&mineVein(before?.mine)&&
     after?.mine?.probeHits>before?.mine?.probeHits)return 'mine';
  if((action==='reel-line'&&after?.garden?.rareFish>before?.garden?.rareFish)||
     ((action==='harvest-all'||/^harvest-[0-3]$/.test(action))&&
      after?.garden?.harvests>=3&&after?.garden?.harvests>before?.garden?.harvests))return 'garden';
  if(action==='jade-cut'&&after?.jade?.cut>=3&&after?.jade?.cut>before?.jade?.cut)return 'jade';
  return null;
 }
 function record(raw,action,before,after,time=Date.now(),enabled=false){
  const state=norm(raw,time),album=state.records.s01;
  const id=enabled?earnedBy(action,before,after):null;
  if(!id||!idSet.has(id)||album.relics.includes(id))return {state,award:null,completed:false};
  album.relics.push(id);
  album.relics=RELICS.filter(item=>album.relics.includes(item.id)).map(item=>item.id);
  if(!album.firstAt)album.firstAt=safeTime(time);
  const completed=album.relics.length===RELICS.length;
  if(completed)album.completedAt=safeTime(time);
  return {state,award:id,completed};
 }
 return Object.freeze({ID,PHASE,RELICS,fresh,norm,neonTicket,mineVein,earnedBy,record});
});
