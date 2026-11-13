/* FUN-TOWER1 — five-floor, push-your-luck practice challenge.
 * Points are display-only; they are NOT Xu Vàng, Tiền Xanh, wallet receipts,
 * premium entitlements, or a Firestore-backed reward source.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduFateTowerV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1;
 const FLOORS=Object.freeze([
  {gates:3,safe:2,points:2,title:'Bậc Khai Môn'},
  {gates:3,safe:2,points:5,title:'Hành Lang Sao'},
  {gates:2,safe:1,points:9,title:'Gương Nguyệt'},
  {gates:2,safe:1,points:14,title:'Cổng Tinh Tú'},
  {gates:3,safe:1,points:24,title:'Đỉnh Vận Mệnh'}
 ].map(Object.freeze));
 const MAX_POINTS=FLOORS[FLOORS.length-1].points;
 const validId=s=>typeof s==='string'&&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
 const fail=reason=>({ok:false,reason});
 const validLayout=layout=>Array.isArray(layout)&&layout.length===FLOORS.length&&
  layout.every((row,index)=>Array.isArray(row)&&row.length===FLOORS[index].safe&&
   new Set(row).size===row.length&&row.every(g=>Number.isSafeInteger(g)&&
    g>=0&&g<FLOORS[index].gates));
 const fresh=()=>({version:VERSION,best:0,played:0,run:null});
 function norm(raw){
  const state=fresh();
  if(!raw||typeof raw!=='object'||raw.version!==VERSION)return state;
  if(Number.isSafeInteger(raw.best)&&raw.best>=0&&raw.best<=MAX_POINTS)
   state.best=raw.best;
  if(Number.isSafeInteger(raw.played)&&raw.played>=0&&raw.played<=1000000)
   state.played=raw.played;
  const r=raw.run;
  if(!r||!validId(r.id)||!validLayout(r.layout)||
   !['playing','banked','lost','crowned'].includes(r.status)||
   !Number.isSafeInteger(r.floor)||r.floor<0||r.floor>FLOORS.length||
   !Number.isSafeInteger(r.banked)||r.banked<0||r.banked>MAX_POINTS)return state;
  const expected=r.floor?FLOORS[r.floor-1].points:0;
  if(r.status==='playing'&&(r.floor===FLOORS.length||r.banked!==0)||
   r.status==='banked'&&(r.floor===0||r.banked!==expected)||
   r.status==='lost'&&r.banked!==0||
   r.status==='crowned'&&(r.floor!==FLOORS.length||r.banked!==MAX_POINTS))return state;
  state.run={id:r.id,layout:r.layout.map(row=>[...row]),status:r.status,
   floor:r.floor,banked:r.banked,
   lastGate:Number.isSafeInteger(r.lastGate)?r.lastGate:null};
  return state;
 }
 function start(raw,{id,layout}={}){
  const state=norm(raw);
  if(!validId(id)||!validLayout(layout))return fail('invalid-start');
  if(state.run?.status==='playing')return fail('in-progress');
  if(state.run?.id===id)return fail('already-applied');
  if(state.played>=1000000)return fail('run-cap');
  return {ok:true,state:{...state,played:state.played+1,
   run:{id,status:'playing',floor:0,banked:0,lastGate:null,
    layout:layout.map(row=>[...row])}}};
 }
 function choose(raw,{id,floor,gate}={}){
  const state=norm(raw),run=state.run;
  if(!run||run.id!==id)return fail('run-not-found');
  if(run.status!=='playing')return fail('already-settled');
  // Stale UI button callbacks cannot advance a second floor on double-tap.
  if(floor!==run.floor)return fail('stale-floor');
  const config=FLOORS[floor];
  if(!config||!Number.isSafeInteger(gate)||gate<0||gate>=config.gates)
   return fail('invalid-gate');
  if(!run.layout[floor].includes(gate)){
   return {ok:true,result:'lost',state:{...state,
    run:{...run,status:'lost',banked:0,lastGate:gate}}};
  }
  const nextFloor=floor+1,crowned=nextFloor===FLOORS.length;
  const next={...run,floor:nextFloor,lastGate:gate,
   status:crowned?'crowned':'playing',banked:crowned?MAX_POINTS:0};
  return {ok:true,result:crowned?'crowned':'passed',state:{...state,
   best:crowned?Math.max(state.best,MAX_POINTS):state.best,run:next}};
 }
 function bank(raw,{id,floor}={}){
  const state=norm(raw),run=state.run;
  if(!run||run.id!==id)return fail('run-not-found');
  if(run.status!=='playing')return fail('already-settled');
  if(floor!==run.floor)return fail('stale-floor');
  if(run.floor<1)return fail('nothing-to-bank');
  const points=FLOORS[run.floor-1].points;
  return {ok:true,result:'banked',points,state:{...state,
   best:Math.max(state.best,points),run:{...run,status:'banked',banked:points}}};
 }
 const odds=()=>FLOORS.map((f,index)=>({floor:index+1,
  title:f.title,points:f.points,safe:f.safe,gates:f.gates}));
 return Object.freeze({VERSION,FLOORS,MAX_POINTS,norm,start,choose,bank,odds});
});
