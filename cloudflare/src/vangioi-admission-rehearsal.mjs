// G1Z: operator-only, ephemeral admission rehearsal. Tokens created here are
// non-durable test handles, NEVER playable session credentials or publisher grants.

const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const only=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const fail=(code='forbidden')=>({ok:false,code});

export function createAdmissionRehearsal({releaseGate,capacity=128}={}){
 if(typeof releaseGate?.evaluateApprovedWorld!=='function'||
  !Number.isSafeInteger(capacity)||capacity<1||capacity>1000)
  throw new TypeError('G1Z requires a trusted G1Y gate and bounded ephemeral capacity');
 const candidates=new Map(),sessions=new Map();

 async function fresh(request,record){
  let verdict;
  try{verdict=await releaseGate.evaluateApprovedWorld(request,{worldId:record.worldId});}
  catch{return fail('admission-unavailable');}
  if(!verdict?.ok)return verdict?.ok===false&&typeof verdict.code==='string'?fail(verdict.code):fail('admission-unavailable');
  if(verdict.eligible!==true||verdict.gateVersion!=='world-release-1'||
   verdict.worldId!==record.worldId||!hash(verdict.snapshotHash))return fail('invalid-gate-verdict');
  if(record.snapshotHash!==null&&record.snapshotHash!==verdict.snapshotHash)return fail('snapshot-conflict');
  return {ok:true,worldId:verdict.worldId,snapshotHash:verdict.snapshotHash};
 }

 async function prepareRelease(request,input){
  if(!only(input,['worldId'])||!id(input.worldId))return fail('invalid-request');
  const result=await fresh(request,{worldId:input.worldId,snapshotHash:null});
  if(!result.ok)return result;
  if(candidates.size>=capacity)return fail('rehearsal-capacity');
  const candidateId=crypto.randomUUID();
  candidates.set(candidateId,{worldId:result.worldId,snapshotHash:result.snapshotHash});
  return {ok:true,stage:'release-candidate',candidateId,...result};
 }

 async function simulateStart(request,input){
  if(!only(input,['candidateId'])||!uuid(input.candidateId))return fail('invalid-request');
  const record=candidates.get(input.candidateId);
  if(!record)return fail();
  const result=await fresh(request,record);
  if(!result.ok)return result;
  if(sessions.size>=capacity)return fail('rehearsal-capacity');
  const sessionId=crypto.randomUUID();
  sessions.set(sessionId,{...record,candidateId:input.candidateId});
  return {ok:true,stage:'simulated-start',sessionId,...result};
 }

 async function verifySession(request,input,stage){
  if(!only(input,['sessionId'])||!uuid(input.sessionId))return fail('invalid-request');
  const record=sessions.get(input.sessionId);
  if(!record)return fail();
  const result=await fresh(request,record);
  if(!result.ok)return result;
  // This only reports an authorization rehearsal decision: no content bytes,
  // gameplay state, reader entitlement or other durable effect is produced.
  return {ok:true,stage,sessionId:input.sessionId,...result};
 }

 return Object.freeze({prepareRelease,simulateStart,
  simulateResume:(r,d)=>verifySession(r,d,'simulated-resume'),
  simulateSourceRead:(r,d)=>verifySession(r,d,'simulated-source-read')});
}
