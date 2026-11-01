/* C4.40A — a small, testable fishing timing challenge.
 * The challenge has no wallet access and does not modify saved game data.
 * Only the existing Arcade core may award a caught fish.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeFishingC425F=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_MISSES=3;
 const PULSE_COOLDOWN_MS=450;
 // Every grade has a different fight. This changes only the on-screen skill
 // challenge; catch odds, payouts and saved fish records stay in the core.
 const TIERS=Object.freeze({
  'Thường':Object.freeze({key:'common',label:'Cá thường',required:2,width:34,speed:1.85}),
  'Quý':Object.freeze({key:'rare',label:'Cá quý',required:3,width:29,speed:1.7}),
  'Hiếm':Object.freeze({key:'uncommon',label:'Cá hiếm',required:3,width:25,speed:1.55}),
  'Sử thi':Object.freeze({key:'epic',label:'Cá sử thi',required:4,width:22,speed:1.45}),
  'Huyền thoại':Object.freeze({key:'mythic',label:'Cá huyền thoại',required:5,width:19,speed:1.35})
 });
 function key(line){
  return line?`${line.fishId}:${line.biteAt}:${line.escapeAt}:${line.size}:${line.rod}`:'';
 }
 function rules(line,fish,hits=0){
  const tier=TIERS[fish?.rarity]||TIERS[fish?.rare?'Hiếm':'Thường'];
  const rod=Math.max(1,Math.min(5,line?.rod||1));
  const width=Math.min(50,Math.max(18,tier.width+3*(rod-1)-
   ((line?.size||0)>=70?2:0)));
  const center=36+((Math.max(0,line?.size||0)+hits*19)%29);
  return {required:tier.required,tier:tier.key,label:tier.label,maxMisses:MAX_MISSES,
   width,left:Math.max(4,Math.min(96-width,center-width/2)),
   travelSeconds:tier.speed+.07*(rod-1)};
 }
 function begin(line){return {key:key(line),hits:0,misses:0,last:'',lastAt:0};}
 function pulse(fight,accurate,line,fish,time=Date.now()){
  if(!fight||fight.key!==key(line))return {ok:false,reason:'stale'};
  if(!Number.isSafeInteger(time)||time<0)return {ok:false,reason:'invalid-time'};
  if(fight.lastAt&&time-fight.lastAt<PULSE_COOLDOWN_MS)
   return {ok:false,reason:'cooldown'};
  const requirement=rules(line,fish,fight.hits);
  const next={...fight,last:accurate?'hit':'miss',lastAt:time};
  if(accurate)next.hits++;
  else next.misses++;
  return {ok:true,fight:next,result:next.hits>=requirement.required?'caught':
   next.misses>=MAX_MISSES?'escaped':accurate?'hit':'miss'};
 }
 return Object.freeze({key,rules,begin,pulse,MAX_MISSES,PULSE_COOLDOWN_MS,TIERS});
});
