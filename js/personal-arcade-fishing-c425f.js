/* C4.46 — phased fishing, built on the original C4.40A timing challenge.
 * The challenge has no wallet access and does not modify saved game data.
 * Only the existing Arcade core may award a caught fish.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeFishingC425F=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_MISSES=2;
 const PULSE_COOLDOWN_MS=450;
 // Every grade has a different fight. This changes only the on-screen skill
 // challenge; catch odds, payouts and saved fish records stay in the core.
 const TIERS=Object.freeze({
  'Thường':Object.freeze({key:'common',label:'Cá thường',required:2,width:33,speed:1.8,phases:[2]}),
  'Quý':Object.freeze({key:'rare',label:'Cá quý',required:3,width:27,speed:1.6,phases:[3]}),
  'Hiếm':Object.freeze({key:'uncommon',label:'Cá hiếm',required:4,width:23,speed:1.45,phases:[2,4]}),
  'Sử thi':Object.freeze({key:'epic',label:'Cá sử thi',required:5,width:20,speed:1.3,phases:[2,4,5]}),
  'Huyền thoại':Object.freeze({key:'mythic',label:'Cá huyền thoại',required:7,width:18,speed:1.15,phases:[2,5,7]})
 });
 const PHASE_NAMES=['DÒ NHỊP','GIẰNG CO','CHỐT CÁ'];
 function key(line){
  return line?`${line.fishId}:${line.biteAt}:${line.escapeAt}:${line.size}:${line.rod}`:'';
 }
 function rules(line,fish,hits=0){
  const tier=TIERS[fish?.rarity]||TIERS[fish?.rare?'Hiếm':'Thường'];
  const rod=Math.max(1,Math.min(5,line?.rod||1));
  const essenceLevel=Math.max(0,Math.min(3,line?.essenceLevel||0));
  const premium=line?.lure==='moon';
  const beat=Math.max(0,Math.min(tier.required-1,Math.floor(hits)||0));
  const phase=tier.phases.findIndex(end=>beat<end)+1;
  const width=Math.min(48,Math.max(12,tier.width+2*(rod-1)+2*essenceLevel+(premium?2:0)-
   2*(phase-1)-((line?.size||0)>=70?2:0)));
  // The safe area shifts after each beat; a new phase also changes the sweep.
  // Every value comes from this particular line and requires no new save fields.
  const seed=Math.max(0,line?.size||0)+beat*37+phase*19+
   (String(line?.fishId||'').length*11);
  const center=26+(seed%49);
  const travelSeconds=Math.max(1.04,tier.speed-.09*(phase-1)+.09*(rod-1)+(premium?0.07:0));
  return {required:tier.required,tier:tier.key,label:tier.label,
   width,left:Math.max(4,Math.min(96-width,center-width/2)),
   travelSeconds,phase,phaseCount:tier.phases.length,
   phaseName:PHASE_NAMES[Math.min(phase-1,2)],
   phaseBeat:beat-(tier.phases[phase-2]||0),
   phaseRequired:tier.phases[phase-1]-(tier.phases[phase-2]||0),
   offsetSeconds:Math.round(travelSeconds*(.13+(seed%7)*.07)*100)/100,
   reverse:(seed%2)===1,
   maxMisses:MAX_MISSES+(premium&&tier.required>=4?1:0)};
 }
 function begin(line){return {key:key(line),hits:0,misses:0,last:'',lastAt:0,done:false};}
 function pulse(fight,accurate,line,fish,time=Date.now()){
  if(!fight||fight.key!==key(line))return {ok:false,reason:'stale'};
  if(!Number.isSafeInteger(time)||time<0)return {ok:false,reason:'invalid-time'};
  if(fight.done)return {ok:false,reason:'finished'};
  if(fight.lastAt&&time-fight.lastAt<PULSE_COOLDOWN_MS)
   return {ok:false,reason:'cooldown'};
  const requirement=rules(line,fish,fight.hits);
  const next={...fight,last:accurate?'hit':'miss',lastAt:time};
  if(accurate)next.hits++;
  else next.misses++;
  const result=next.hits>=requirement.required?'caught':
   next.misses>=requirement.maxMisses?'escaped':accurate?'hit':'miss';
  next.done=result==='caught'||result==='escaped';
  return {ok:true,fight:next,result};
 }
 return Object.freeze({key,rules,begin,pulse,MAX_MISSES,PULSE_COOLDOWN_MS,TIERS});
});
