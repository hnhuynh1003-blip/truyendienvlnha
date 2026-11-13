// G2I: operator-gated, read-only composition of existing fixture checks.
// This is a diagnostic observation, NOT a deploy gate, release token, Firebase
// integration, or transaction spanning the SQL authority and replica.

const id=v=>typeof v==='string'&&/^[a-z0-9-]{1,64}$/.test(v);
const worldId=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const seq=v=>Number.isSafeInteger(v)&&v>=0;
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...fields].sort().join(',');
const fail=code=>({ok:false,code});

// These are explicit unresolved integration/operational decisions. A fixture
// PASS never removes them and no client request can mark them resolved.
export const FIXTURE_STAGING_BLOCKER_IDS=Object.freeze([
 'isolated-firebase-staging-topology',
 'server-service-identity-and-access-review',
 'v49-source-change-and-license-revocation-policy',
 'legacy-permit-baseline-and-migration-plan',
 'durable-consumer-and-consistent-pagination',
 'recovery-key-custody-target-attestation-and-rollback',
 'real-boundary-rechecks-observability-and-owner-approval'
]);

export function createFixtureStagingIntegrationAudit({projectId,environment='fixture',
 authorizeOperator,projectionAudit,stagingReadiness,releaseGate}={}){
 if(!id(projectId)||environment!=='fixture'||typeof authorizeOperator!=='function'||
  typeof projectionAudit?.auditProjection!=='function'||
  typeof stagingReadiness?.checkWorld!=='function'||
  typeof releaseGate?.evaluateApprovedWorld!=='function')
  throw new TypeError('G2I requires trusted read-only fixture gates and operator authorization');

 const projectionValid=r=>only(r,['ok','fixtureAuditPassed','projectId','environment',
  'checkpoint','permitCount','auditVersion'])&&r.ok===true&&r.fixtureAuditPassed===true&&
  r.projectId===projectId&&r.environment==='fixture'&&seq(r.checkpoint)&&
  seq(r.permitCount)&&r.auditVersion==='permit-projection-1';
 const readinessValid=(r,w)=>only(r,['ok','fixtureChecksPassed','worldId','snapshotHash',
  'checkpoint','readinessVersion','environment'])&&r.ok===true&&r.fixtureChecksPassed===true&&
  r.worldId===w&&hash(r.snapshotHash)&&seq(r.checkpoint)&&
  r.readinessVersion==='staging-readiness-1'&&r.environment==='fixture';
 const gateValid=(r,w)=>only(r,['ok','eligible','worldId','snapshotHash','gateVersion'])&&
  r.ok===true&&r.eligible===true&&r.worldId===w&&hash(r.snapshotHash)&&
  r.gateVersion==='world-release-1';

 async function audit(request,input){
  if(!only(input,['worldId'])||!worldId(input.worldId))return fail('invalid-request');
  let permitted=false;
  try{permitted=await authorizeOperator(request,projectId)===true;}catch{}
  if(!permitted)return fail('forbidden');
  try{
   // Observe the same authority/project from both existing gates. Repeat the
   // full-set G2B audit after G2A to catch intervening permit events/changes.
   const before=await projectionAudit.auditProjection(request);
   if(!projectionValid(before))return fail('projection-before-blocked');
   const readiness=await stagingReadiness.checkWorld(request,{worldId:input.worldId});
   if(!readinessValid(readiness,input.worldId))return fail('staging-readiness-blocked');
   if(before.checkpoint!==readiness.checkpoint)return fail('checkpoint-changed');
   const after=await projectionAudit.auditProjection(request);
   if(!projectionValid(after))return fail('projection-after-blocked');
   if(after.checkpoint!==before.checkpoint||after.permitCount!==before.permitCount)
    return fail('projection-changed');
   // Notice and world approval do not necessarily increment permit outbox.
   // Re-evaluate the real G1Y SQL authority after projection verification.
   const gate=await releaseGate.evaluateApprovedWorld(request,{worldId:input.worldId});
   if(!gateValid(gate,input.worldId))return fail('world-gate-blocked');
   if(gate.snapshotHash!==readiness.snapshotHash)return fail('snapshot-changed');
   return {ok:true,code:'fixture-evidence-consistent',
    fixtureEvidenceConsistent:true,auditVersion:'fixture-staging-integration-1',
    projectId,environment:'fixture',worldId:input.worldId,
    snapshotHash:gate.snapshotHash,checkpoint:after.checkpoint,permitCount:after.permitCount,
    stagingDeploymentAuthorized:false,releaseAuthorized:false,
    unresolvedPrerequisiteIds:[...FIXTURE_STAGING_BLOCKER_IDS]};
  }catch{return fail('fixture-integration-unavailable');}
 }
 return Object.freeze({audit});
}
