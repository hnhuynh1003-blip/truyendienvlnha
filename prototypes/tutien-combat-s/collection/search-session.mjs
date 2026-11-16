// R3E-GAMEPLAY-RECOVERY: mock-only commands reuse the original collection engine.
import {syncStamina,persistResources,entryEligibility,nextPointSeconds} from './resource-state.mjs';
import {enterTripScene,returnToTripPortal} from './mock-trip.mjs';
import {validateDiscovery,mockDrawIndex,DESTINATIONS} from './discovery.mjs';
export const SEARCH_CONFIG=Object.freeze({explorationSearchCost:2,environment:'MOCK_ONLY',weights:Object.freeze([1,1,1])});
export function upgradeDiscovery(s){
 const d=s.explorationDiscovery;if(!d)return;validateDiscovery(d);
 if(d.version===1)s.explorationDiscovery={...d,version:2,id:'mock-search-legacy',phase:d.view==='area'?'ENTERED':'RESULT',costPaid:0,endReason:null};
 return s.explorationDiscovery;
}
export function hasPendingSearch(s){const d=upgradeDiscovery(s);return d&&['RESULT','ENTERED'].includes(d.phase);}
export function searchEligibility(s,now=Date.now()){
 const pending=hasPendingSearch(s),missing=pending?0:Math.max(0,SEARCH_CONFIG.explorationSearchCost-s.stamina);
 return {allowed:missing===0,missing,waitSeconds:missing?nextPointSeconds(s,now)+(missing-1)*60:0,cost:pending?0:SEARCH_CONFIG.explorationSearchCost};
}
// All mutations are staged: one synchronous storage write before publishing the new state.
export function commitMockCommand(s,storage,mutate,now=Date.now()){
 syncStamina(s,storage,now);const next=structuredClone(s),result=mutate(next);
 if(result?.valid===false)return result;
 persistResources(next,storage,now);Object.assign(s,next);return result;
}
export function startSearch(s,storage,{id,draw=()=>mockDrawIndex(crypto),now=Date.now()}={}){
 return commitMockCommand(s,storage,next=>{
  const d=upgradeDiscovery(next);
  if(d?.id===id||hasPendingSearch(next))return {valid:true,reused:true,discovery:structuredClone(d)};
  if(typeof id!=='string'||!id.startsWith('mock-search-'))throw Error('Invalid search command ID');
  const gate=searchEligibility(next,now);if(!gate.allowed)return {valid:false,reason:'stamina',...gate};
  const index=draw();if(!Number.isInteger(index)||index<0||index>=DESTINATIONS.length)throw Error('Invalid mock RNG result');
  next.stamina-=SEARCH_CONFIG.explorationSearchCost;
  next.explorationDiscovery={version:2,id,environment:'MOCK_ONLY',scene:DESTINATIONS[index],phase:'RESULT',view:'result',costPaid:SEARCH_CONFIG.explorationSearchCost,endReason:null};
  return {valid:true,reused:false,discovery:structuredClone(next.explorationDiscovery)};
 },now);
}
export function finishSearch(s,reason){const d=upgradeDiscovery(s);if(!['CANCELLED','COMPLETED','FAILED','RETREATED','TRIP_ENDED'].includes(reason))throw Error('Invalid ending reason');if(!d||d.phase==='ENDED')return false;d.phase='ENDED';d.view='portal';d.endReason=reason;return true;}
export function cancelSearch(s,storage,now=Date.now()){
 return commitMockCommand(s,storage,next=>{const d=upgradeDiscovery(next);if(d?.phase!=='RESULT')return {valid:false,reason:'phase'};finishSearch(next,'CANCELLED');return {valid:true};},now);
}
export function enterSearchArea(s,storage,{runId,now=Date.now(),entryCosts}={}){
 return commitMockCommand(s,storage,next=>{
  const d=upgradeDiscovery(next);if(d?.phase!=='RESULT'||next.scene)return {valid:false,reason:'phase'};
  const gate=entryEligibility(next,d.scene,entryCosts,now);if(!gate.allowed)return {valid:false,reason:'stamina',...gate};
  if(!enterTripScene(next,d.scene,runId))return {valid:false,reason:'entry'};
  next.stamina-=gate.cost;d.phase='ENTERED';d.view='area';return {valid:true,scene:d.scene};
 },now);
}
export function returnFromArea(s,storage,now=Date.now()){
 return commitMockCommand(s,storage,next=>{if(!next.scene)return {valid:false,reason:'phase'};finishSearch(next,next.status==='success'?'COMPLETED':next.status==='damaged'?'FAILED':'RETREATED');returnToTripPortal(next);return {valid:true};},now);
}
