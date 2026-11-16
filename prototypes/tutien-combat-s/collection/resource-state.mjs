import {createState} from './model.mjs';
export const RESOURCE_KEY='dudu.collection.r2f.mock.session.v1';
export const STAMINA_RULE=Object.freeze({maximum:60,intervalMs:60_000,environment:'MOCK_ONLY'});
// An Du approved preserving the current free-entry policy; collection still charges model.staminaCost.
export const AREA_ENTRY_COSTS=Object.freeze({herb:0,mineral:0,egg:0});
function validState(s){if(!s||!Number.isInteger(s.stamina)||s.stamina<0||s.stamina>60||!['bag','pending','warehouse'].every(k=>Array.isArray(s[k])))throw Error('Invalid mock stamina snapshot');}
export function advanceStamina(s,now){
 validState(s);if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid clock');
 if(!s.staminaClock)s.staminaClock={version:1,nextAt:s.stamina<60?now+60_000:null,checkpoint:s.stamina,observedAt:now};
 const c=s.staminaClock;if(!Number.isSafeInteger(c.version)||c.version<1||!Number.isSafeInteger(c.observedAt)||c.observedAt<0||!Number.isInteger(c.checkpoint)||c.checkpoint<0||c.checkpoint>60||c.nextAt!==null&&(!Number.isSafeInteger(c.nextAt)||c.nextAt<0||c.nextAt>c.observedAt+60_000))throw Error('Invalid stamina clock');
 const t=Math.max(now,c.observedAt);
 if(s.stamina!==c.checkpoint){if(s.stamina<60&&c.nextAt===null)c.nextAt=t+60_000;if(s.stamina===60)c.nextAt=null;c.version++;c.checkpoint=s.stamina;}
 if(s.stamina<60&&c.nextAt===null){c.nextAt=t+60_000;c.version++;}
 if(s.stamina<60&&t>=c.nextAt){const earned=Math.min(60-s.stamina,1+Math.floor((t-c.nextAt)/60_000));s.stamina+=earned;c.nextAt=s.stamina===60?null:c.nextAt+earned*60_000;c.checkpoint=s.stamina;c.version++;}
 if(s.stamina===60)c.nextAt=null;c.observedAt=t;return s;
}
export function syncStamina(s,storage,now=Date.now()){
 const raw=storage.getItem(RESOURCE_KEY);if(raw){const disk=JSON.parse(raw);validState(disk);if((disk.staminaClock?.version??0)>(s.staminaClock?.version??0)){s.stamina=disk.stamina;s.staminaClock=structuredClone(disk.staminaClock);}}
 return advanceStamina(s,now);
}
export function persistResources(s,storage,now=Date.now()){syncStamina(s,storage,now);storage.setItem(RESOURCE_KEY,JSON.stringify(s));}
export function readResources(storage,now=Date.now()){const raw=storage.getItem(RESOURCE_KEY),s=raw?JSON.parse(raw):createState();advanceStamina(s,now);storage.setItem(RESOURCE_KEY,JSON.stringify(s));return s;}
export function nextPointSeconds(s,now=Date.now()){if(s.stamina>=60)return 0;return Math.max(0,Math.ceil((s.staminaClock.nextAt-Math.max(now,s.staminaClock.observedAt))/1000));}
export function formatTime(seconds){const n=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
export function entryEligibility(s,scene,config=AREA_ENTRY_COSTS,now=Date.now()){
 const cost=config[scene];if(!Number.isInteger(cost)||cost<0||cost>60)return {allowed:false,reason:'configuration',cost:null,missing:null,waitSeconds:null};
 const missing=Math.max(0,cost-s.stamina);return {allowed:missing===0,reason:missing?'stamina':null,cost,missing,waitSeconds:missing?nextPointSeconds(s,now)+(missing-1)*60:0};
}
