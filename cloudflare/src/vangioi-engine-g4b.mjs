// G4B — offline event/revision replay for G4A candidate states.
// These hashes are tamper-evidence inside a test harness, NOT signatures,
// server authority, real saves, rewards, XP, currency or inventory writes.
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
import {G4A_ENGINE_VERSION,startG4AEngine,applyG4ATransition} from './vangioi-engine-g4a.mjs';

export const G4B_SESSION_VERSION='g4b-session-1';
export const G4B_EVENT_VERSION='g4b-transition-1';
const MAX_EVENTS=1024;
const fail=(code,path='/')=>({ok:false,code,path});
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const revision=v=>Number.isSafeInteger(v)&&v>=0;
const STATE_KEYS=['sceneId','flags'];
const SESSION_KEYS=['version','playerId','worldInstanceId','entryId','contentVersion',
 'contentHash','revision','state','events','chainHash'];
const EVENT_KEYS=['version','eventId','playerId','worldInstanceId','expectedRevision','ruleId'];
const RECORD_KEYS=['eventId','expectedRevision','ruleId','requestHash','chainHash'];

function planReady(plan){
 return plain(plan)&&plan.engineVersion===G4A_ENGINE_VERSION&&
  digest(plan.contentHash)&&typeof plan.contentVersion==='string'&&
  Array.isArray(plan.sceneIds)&&Array.isArray(plan.entries)&&Array.isArray(plan.rules);
}
function sessionShape(s,plan){
 return exact(s,SESSION_KEYS)&&s.version===G4B_SESSION_VERSION&&
  identifier(s.playerId)&&identifier(s.worldInstanceId)&&identifier(s.entryId)&&
  s.contentVersion===plan.contentVersion&&s.contentHash===plan.contentHash&&
  revision(s.revision)&&Array.isArray(s.events)&&s.events.length<=MAX_EVENTS&&
  s.revision===s.events.length&&digest(s.chainHash)&&exact(s.state,STATE_KEYS);
}
function eventShape(e){
 return exact(e,EVENT_KEYS)&&e.version===G4B_EVENT_VERSION&&
  identifier(e.eventId)&&identifier(e.playerId)&&identifier(e.worldInstanceId)&&
  identifier(e.ruleId)&&revision(e.expectedRevision);
}
function sameState(a,b){
 return exact(a,STATE_KEYS)&&a.sceneId===b.sceneId&&
  Array.isArray(a.flags)&&a.flags.length===b.flags.length&&
  a.flags.every((v,i)=>v===b.flags[i]);
}
const genesisPayload=(p,s,state)=>({version:G4B_SESSION_VERSION,
 contentHash:p.contentHash,contentVersion:p.contentVersion,
 playerId:s.playerId,worldInstanceId:s.worldInstanceId,entryId:s.entryId,state});
const eventPayload=(s,e)=>({version:G4B_EVENT_VERSION,eventId:e.eventId,
 playerId:s.playerId,worldInstanceId:s.worldInstanceId,
 expectedRevision:e.expectedRevision,ruleId:e.ruleId});
const nextHash=(previousHash,requestHash,revision,state)=>
 hashAuthoringJson({previousHash,requestHash,revision,state});

// Caller IDs are only synthetic namespace labels; no Auth credentials are
// verified or created here. The returned session is never stored implicitly.
export async function createG4BSession(plan,{playerId,worldInstanceId,entryId}={}){
 if(!planReady(plan))return fail('invalid-plan');
 if(!identifier(playerId)||!identifier(worldInstanceId)||!identifier(entryId))
  return fail('invalid-identity');
 const started=startG4AEngine(plan,entryId);
 if(!started.ok)return fail(started.code);
 const session={version:G4B_SESSION_VERSION,playerId,worldInstanceId,entryId,
  contentVersion:plan.contentVersion,contentHash:plan.contentHash,revision:0,
  state:started.state,events:[],chainHash:''};
 session.chainHash=await hashAuthoringJson(genesisPayload(plan,session,started.state));
 return {ok:true,session,saveCommitted:false,rewardCommitted:false};
}

// Validate EVERY record by deterministic replay, not just a claimed hash.
// A public client could recalculate hashes; a future authoritative server
// must bind verified identity, immutable approved content and storage CAS.
export async function inspectG4BSession(plan,value){
 if(!planReady(plan))return fail('invalid-plan');
 let s;
 try{s=copyAuthoringJson(value);}catch{return fail('invalid-session');}
 if(!sessionShape(s,plan))return fail('invalid-session');
 const start=startG4AEngine(plan,s.entryId);
 if(!start.ok)return fail('invalid-session');
 let state=start.state,chainHash=await hashAuthoringJson(genesisPayload(plan,s,state));
 const seen=new Set();
 for(const [i,record] of s.events.entries()){
  const path=`/events/${i}`;
  if(!exact(record,RECORD_KEYS)||!identifier(record.eventId)||
   !identifier(record.ruleId)||record.expectedRevision!==i||
   !digest(record.requestHash)||!digest(record.chainHash)||seen.has(record.eventId))
   return fail('event-log-invalid',path);
  seen.add(record.eventId);
  const requestHash=await hashAuthoringJson(eventPayload(s,record));
  if(requestHash!==record.requestHash)return fail('event-log-tampered',path);
  const transition=applyG4ATransition(plan,state,record.ruleId);
  if(!transition.ok)return fail('event-log-unreplayable',path);
  state=transition.state;
  chainHash=await nextHash(chainHash,requestHash,i+1,state);
  if(chainHash!==record.chainHash)return fail('event-log-tampered',path);
 }
 if(!sameState(s.state,state)||s.chainHash!==chainHash)
  return fail('session-tampered');
 return {ok:true,session:s,integrity:'offline-replay-only',
  saveCommitted:false,rewardCommitted:false,productionAuthorized:false};
}

// Duplicate eventId + same full request is a no-op even with an old expected
// revision. Reusing the id for a different request is ALWAYS a conflict.
export async function applyG4BEvent(plan,session,event){
 const checked=await inspectG4BSession(plan,session);
 if(!checked.ok)return checked;
 let e;
 try{e=copyAuthoringJson(event);}catch{return fail('invalid-event');}
 if(!eventShape(e))return fail('invalid-event');
 const s=checked.session;
 if(e.playerId!==s.playerId||e.worldInstanceId!==s.worldInstanceId)
  return fail('session-mismatch');
 const requestHash=await hashAuthoringJson(eventPayload(s,e));
 const prior=s.events.find(x=>x.eventId===e.eventId);
 if(prior){
  if(prior.requestHash!==requestHash)return fail('event-id-conflict');
  return {ok:true,duplicate:true,session:s,receipt:{eventId:prior.eventId,
   revision:prior.expectedRevision+1,chainHash:prior.chainHash},
   saveCommitted:false,rewardCommitted:false,productionAuthorized:false};
 }
 if(e.expectedRevision!==s.revision)return fail('revision-conflict');
 if(s.events.length>=MAX_EVENTS)return fail('event-log-full');
 const applied=applyG4ATransition(plan,s.state,e.ruleId);
 if(!applied.ok)return fail(applied.code);
 const nextRevision=s.revision+1;
 const chainHash=await nextHash(s.chainHash,requestHash,nextRevision,applied.state);
 const record={eventId:e.eventId,expectedRevision:e.expectedRevision,
  ruleId:e.ruleId,requestHash,chainHash};
 const updated={...s,revision:nextRevision,state:applied.state,
  chainHash,events:[...s.events,record]};
 return {ok:true,duplicate:false,session:updated,
  receipt:{eventId:e.eventId,revision:nextRevision,chainHash},
  saveCommitted:false,rewardCommitted:false,productionAuthorized:false};
}
