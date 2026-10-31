/* C4.25F — a small, testable fishing timing challenge.
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
 function key(line){
  return line?`${line.fishId}:${line.biteAt}:${line.escapeAt}:${line.size}:${line.rod}`:'';
 }
 function rules(line,fish,hits=0){
  const rare=fish?.rare===true,rod=Math.max(1,Math.min(5,line?.rod||1));
  const width=Math.min(50,(rare?25:32)+4*(rod-1));
  const center=36+((Math.max(0,line?.size||0)+hits*19)%29);
  return {required:rare?3:2,maxMisses:MAX_MISSES,
   width,left:Math.max(4,Math.min(96-width,center-width/2)),
   travelSeconds:(rare?1.35:1.8)+.07*(rod-1)};
 }
 function begin(line){return {key:key(line),hits:0,misses:0,last:'',lastAt:0};}
 function pulse(fight,accurate,line,fish,time=Date.now()){
  if(!fight||fight.key!==key(line))return {ok:false,reason:'stale'};
  const requirement=rules(line,fish,fight.hits);
  const next={...fight,last:accurate?'hit':'miss',lastAt:time};
  if(accurate)next.hits++;
  else next.misses++;
  return {ok:true,fight:next,result:next.hits>=requirement.required?'caught':
   next.misses>=MAX_MISSES?'escaped':accurate?'hit':'miss'};
 }
 return Object.freeze({key,rules,begin,pulse,MAX_MISSES});
});
