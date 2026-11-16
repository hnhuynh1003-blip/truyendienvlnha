// MOCK_ONLY trip orchestration; keeps the existing bag/pending/warehouse arrays.
import {enter,leave,claim} from './model.mjs';
export const MOCK_BAG_POLICY=Object.freeze({environment:'MOCK_ONLY',capacity:9,approval:'An Du R3D-BAG-01'});
export function hasTripBagRoom(s){return s.bag.length<(s.collectionRun?.bagCapacity??MOCK_BAG_POLICY.capacity);}
export function validateTripState(s){
 if(!['bag','pending','warehouse'].every(k=>Array.isArray(s[k]))||!Number.isSafeInteger(s.serial)||s.serial<0)throw Error('Invalid mock collection save');
 const ids=[...s.bag,...s.pending,...s.warehouse].map(x=>x?.id);if(ids.some(x=>typeof x!=='string')||new Set(ids).size!==ids.length)throw Error('Ambiguous mock item ownership');
 if(s.collectionRun&&(!s.collectionRun.id?.startsWith('mock-trip-')||!['ACTIVE','FINALIZED'].includes(s.collectionRun.phase)||s.collectionRun.environment!=='MOCK_ONLY'||(s.collectionRun.bagCapacity!==undefined&&s.collectionRun.bagCapacity!==9)))throw Error('Invalid mock trip');
}
export function restoreTrip(s,saved){validateTripState(saved);Object.assign(s,saved);if(s.collectionRun)s.collectionRun.bagCapacity??=MOCK_BAG_POLICY.capacity;if(s.collectionRun?.phase==='ACTIVE'){s.scene=null;s.ended=true;}else leave(s);return s;}
export function enterTripScene(s,scene,runId){
 if(!['herb','mineral','egg'].includes(scene))return false;validateTripState(s);
 if(s.collectionRun?.phase!=='ACTIVE'){
  if(s.bag.length)throw Error('Unassigned items must not be overwritten');
  if(typeof runId!=='string'||!runId.startsWith('mock-trip-'))throw Error('Invalid mock trip ID');
  s.collectionRun={id:runId,phase:'ACTIVE',environment:'MOCK_ONLY',bagCapacity:MOCK_BAG_POLICY.capacity,finalizeRequestId:null,receipt:null};
 }
 const items=s.bag;s.ended=true;const entered=enter(s,scene);s.bag=items;return entered;
}
export function returnToTripPortal(s){s.scene=null;s.ended=true;}
export function finalizeTrip(s,requestId){
 validateTripState(s);const run=s.collectionRun;if(!run)return null;
 if(run.phase==='FINALIZED'){if(run.finalizeRequestId!==requestId)throw Error('Trip already finalized');return run.receipt;}
 if(requestId!==`finalize:${run.id}`)throw Error('Wrong trip finalization scope');
 const ids=s.bag.map(x=>x.id);s.pending.push(...s.bag.splice(0));claim(s);s.ended=true;s.scene=null;
 const receipt={environment:'MOCK_ONLY',runId:run.id,finalizeRequestId:requestId,itemIds:ids,pendingItemIds:ids.filter(id=>s.pending.some(x=>x.id===id))};
 run.phase='FINALIZED';run.finalizeRequestId=requestId;run.receipt=receipt;return receipt;
}
export function projectTripBag(s,qaCapacity=null){
 if(qaCapacity!==null&&(!Number.isInteger(qaCapacity)||qaCapacity<1||qaCapacity>9))throw Error('Invalid UI-only bag fixture');
 const active=s.collectionRun?.phase==='ACTIVE',items=active?s.bag:[],capacity=qaCapacity??s.collectionRun?.bagCapacity??MOCK_BAG_POLICY.capacity;
 return {environment:qaCapacity===null?'MOCK_ONLY':'UI_ONLY',runId:active?s.collectionRun.id:null,active,capacity,used:items.length,maximum:9,overflow:Math.max(0,items.length-9),
  slots:Array.from({length:9},(_,i)=>({number:i+1,item:items[i]||null,kind:items[i]?(capacity===null||i>=capacity?'held':'occupied'):capacity===null?'locked':i<capacity?'open':i===capacity?'upgrade':'locked'}))};
}

export function commitFinalization(s,requestId,persist){const planned=structuredClone(s);const receipt=finalizeTrip(planned,requestId);persist(planned);Object.assign(s,planned);return receipt;}
