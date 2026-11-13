// G4D — offline-only authority boundary rehearsal around G1Z and G4C.
// G1Y/G1Z check operator release readiness, NOT a player's authorization.
// Every player/access/content pin here comes from an injected TEST HOST.
import {DatabaseSync} from 'node:sqlite';
import {copyAuthoringJson} from './vangioi-authoring.mjs';
import {createG4CFixtureStore} from './vangioi-engine-g4c-fixture.mjs';

export const G4D_FENCE_VERSION='g4d-admission-fixture-1';
const fail=code=>({ok:false,code});
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const worldId=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const epoch=v=>Number.isSafeInteger(v)&&v>=1;

const PIN_KEYS=['worldId','snapshotHash','contentVersion','contentHash','sourceVersion','sourceHash'];
const FENCE_KEYS=['worldId','worldInstanceId','entryId','admissionSessionId'];

// Operator request and host readers must never originate in the player event.
// The G1Z session itself is a non-playable ephemeral rehearsal handle.
export function createG4DAuthorityFixture({database,plan,admission,operatorRequest,
 verifyPlayer,readTrustedAccess,readApprovedPin,onBeforeCommit}={}){
 if(!(database instanceof DatabaseSync)||!plain(plan)||!hash(plan.contentHash)||
  typeof plan.contentVersion!=='string'||
  typeof admission?.simulateResume!=='function'||
  typeof verifyPlayer!=='function'||typeof readTrustedAccess!=='function'||
  typeof readApprovedPin!=='function'||
  (onBeforeCommit!==undefined&&typeof onBeforeCommit!=='function'))
  throw new TypeError('G4D requires trusted offline readers and a G1Z rehearsal');
 database.exec(`CREATE TABLE IF NOT EXISTS vg_g4d_authority_fixture_v1(
  world_instance_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,player_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,admission_session_id TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,content_version TEXT NOT NULL,content_hash TEXT NOT NULL,
  source_version TEXT NOT NULL,source_hash TEXT NOT NULL,
  access_revision INTEGER NOT NULL CHECK(access_revision>=1),
  fence_epoch INTEGER NOT NULL CHECK(fence_epoch>=1),
  status TEXT NOT NULL CHECK(status IN ('active','blocked')))`);
 const one=(sql,...args)=>database.prepare(sql).get(...args)||null;

 async function player(request){
  try{
   const result=await verifyPlayer(request);
   return exact(result,['playerId'])&&id(result.playerId)?result.playerId:null;
  }catch{return null;}
 }
 async function fresh({worldId:world,worldInstanceId,entryId,admissionSessionId},actor){
  try{
   const verdict=await admission.simulateResume(operatorRequest,{sessionId:admissionSessionId});
   if(!exact(verdict,['ok','stage','sessionId','worldId','snapshotHash'])||
    verdict.ok!==true||verdict.stage!=='simulated-resume'||
    verdict.sessionId!==admissionSessionId||verdict.worldId!==world||!hash(verdict.snapshotHash))
    return fail('release-not-eligible');
   const [pin,access]=await Promise.all([
    readApprovedPin({worldId:world,snapshotHash:verdict.snapshotHash}),
    readTrustedAccess({playerId:actor,worldId:world,worldInstanceId,entryId})
   ]);
   if(!exact(pin,PIN_KEYS)||pin.worldId!==world||pin.snapshotHash!==verdict.snapshotHash||
    pin.contentVersion!==plan.contentVersion||pin.contentHash!==plan.contentHash||
    !id(pin.sourceVersion)||!hash(pin.sourceHash))return fail('approved-pin-invalid');
   if(!exact(access,['allowed','revision'])||access.allowed!==true||!epoch(access.revision))
    return fail('player-access-denied');
   return {ok:true,pin,accessRevision:access.revision};
  }catch{return fail('authority-unavailable');}
 }

 async function provision({playerRequest,binding}={}){
  let input;
  try{input=copyAuthoringJson(binding);}catch{return fail('invalid-binding');}
  if(!exact(input,FENCE_KEYS)||!worldId(input.worldId)||!id(input.worldInstanceId)||
   !id(input.entryId)||!id(input.admissionSessionId))return fail('invalid-binding');
  const actor=await player(playerRequest);
  if(!actor)return fail('unauthenticated');
  const checked=await fresh(input,actor);
  if(!checked.ok)return checked;
  const {pin,accessRevision}=checked;
  // G4C and the added G4D fence row are seeded in ONE SQLite transaction.
  const store=createG4CFixtureStore({database,plan,onSeedCommit:()=>{
   database.prepare(`INSERT INTO vg_g4d_authority_fixture_v1 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    input.worldInstanceId,input.worldId,actor,input.entryId,input.admissionSessionId,
    pin.snapshotHash,pin.contentVersion,pin.contentHash,pin.sourceVersion,pin.sourceHash,
    accessRevision,1,'active');
  }});
  const result=await store.seed({playerId:actor,worldInstanceId:input.worldInstanceId,
   entryId:input.entryId,sourceVersion:pin.sourceVersion,sourceHash:pin.sourceHash,
   accessState:'allowed',licenseState:'active',sourceState:'current'});
  return result.ok?{ok:true,fixtureInitialized:true,authority:'synthetic-host-only',
   productionAuthorized:false}:result;
 }

 async function submit({playerRequest,event}={}){
  let command;
  try{command=copyAuthoringJson(event);}catch{return fail('invalid-event');}
  if(!plain(command)||!id(command.worldInstanceId))return fail('invalid-event');
  const actor=await player(playerRequest);
  if(!actor)return fail('unauthenticated');
  const before=one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?',
   command.worldInstanceId);
  if(!before||before.player_id!==actor||before.status!=='active')return fail('player-access-denied');
  const identity={worldId:before.world_id,worldInstanceId:before.world_instance_id,
   entryId:before.entry_id,admissionSessionId:before.admission_session_id};
  const checked=await fresh(identity,actor);
  if(!checked.ok)return checked;
  const {pin,accessRevision}=checked;
  if(before.snapshot_hash!==pin.snapshotHash||before.content_version!==pin.contentVersion||
   before.content_hash!==pin.contentHash||before.source_version!==pin.sourceVersion||
   before.source_hash!==pin.sourceHash||before.access_revision!==accessRevision)
   return fail('admission-pin-changed');
  const store=createG4CFixtureStore({database,plan,onBeforeCommit,
   commitFence:({actorId,event:request,currentSession})=>{
    // This check runs SYNCHRONOUSLY inside G4C's BEGIN IMMEDIATE transaction.
    // A mock revocation must update this same SQLite fence to be atomic.
    const row=one('SELECT * FROM vg_g4d_authority_fixture_v1 WHERE world_instance_id=?',
     request.worldInstanceId);
    return !!row&&row.status==='active'&&row.fence_epoch===before.fence_epoch&&
     row.access_revision===accessRevision&&row.world_id===before.world_id&&
     row.player_id===actorId&&currentSession.player_id===actorId&&
     row.entry_id===before.entry_id&&row.admission_session_id===before.admission_session_id&&
     row.snapshot_hash===pin.snapshotHash&&row.content_version===plan.contentVersion&&
     row.content_hash===plan.contentHash&&row.source_version===pin.sourceVersion&&
     row.source_hash===pin.sourceHash;
   }});
  const result=await store.submit({actorId:actor,event:command});
  return result.ok?{...result,authority:'synthetic-host-only'}:result;
 }

 return Object.freeze({provision,submit});
}
