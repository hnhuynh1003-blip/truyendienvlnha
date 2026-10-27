// G2J: an offline declaration linter for a *proposed* V49 staging topology.
// This module imports no Firebase SDK, has no IO, and cannot authorize or
// establish any network connection, IAM grant, Firestore Rule, or deployment.

const exact=(value,fields)=>value!==null&&typeof value==='object'&&
 !Array.isArray(value)&&Object.keys(value).sort().join(',')===[...fields].sort().join(',');
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{2,62}$/.test(value);
const location=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{2,63}$/.test(value);
const fail=code=>({ok:false,code,stagingDeploymentAuthorized:false});

// This is a code-reviewed boundary proposal, not a set of credentials, IAM
// roles assigned in Google Cloud, or permissions enforceable in production.
export const STAGING_SERVICE_BOUNDARIES=Object.freeze([
 Object.freeze({principal:'v49-reader-host',identity:'trusted-server',
  allowed:'staging-v49-read-only',never:'firestore-write-or-permit-grant'}),
 Object.freeze({principal:'permit-authority-host',identity:'trusted-server-operator',
  allowed:'sql-issue-revoke-current-rights',never:'client-self-grant-or-v49-write'}),
 Object.freeze({principal:'outbox-projection-consumer',identity:'trusted-server',
  allowed:'sql-outbox-read-and-fixture-replica-write',never:'permit-authority-mutation'}),
 Object.freeze({principal:'restore-custodian',identity:'separate-trusted-server',
  allowed:'signed-metadata-recovery-with-audit',never:'world-admission-or-automatic-unburn'}),
 Object.freeze({principal:'world-rights-gate',identity:'trusted-server-operator',
  allowed:'current-sql-rights-and-holds-recheck',never:'automatic-publish-or-session'}),
 Object.freeze({principal:'author-and-reviewer-browser',identity:'untrusted-client',
  allowed:'local-draft-and-nonprivileged-preview',never:'private-source-or-permit-or-publisher-grant'})
]);

export const STAGING_REQUIRED_EVIDENCE=Object.freeze([
 'firebase-staging-project-and-edition-inventory',
 'separate-project-and-synthetic-data-proof',
 'server-iam-and-service-identity-review',
 'existing-v49-rules-and-reader-boundary-review',
 'source-license-and-legacy-baseline-owner-decision',
 'consumer-recovery-monitoring-and-staging-smoke',
 'owner-deployment-and-rollback-approval'
]);

// Null means Du has not selected this field; never write invented values into
// a project configuration, secret store, firebase.json, or CI environment.
export const STAGING_CONNECTION_PLAN_TEMPLATE=Object.freeze({
 contract:'vangioi-staging-intent-1',environment:'staging',
 isolation:'separate-project-synthetic-only',
 firebase:Object.freeze({projectId:null,databaseId:null,edition:null,location:null,
  sourceCollection:'epub_stories_v49'}),
 access:Object.freeze({reader:'server-read-only',permit:'sql-operator-only',
  consumer:'server-outbox-only',recovery:'separate-custodian',
  author:'no-adaptation-rights',world:'current-authority-recheck'})
});

/**
 * Validate only the shape of a proposed NON-SECRET staging intent. A valid
 * declaration is NOT proof that a project, edition, IAM policy, or Rules exist.
 */
export function reviewStagingConnectionPlan(plan){
 try{
  if(!exact(plan,['contract','environment','isolation','firebase','access'])||
   !exact(plan.firebase,['projectId','databaseId','edition','location','sourceCollection'])||
   !exact(plan.access,['reader','permit','consumer','recovery','author','world']))
   return fail('invalid-declaration');
  if(plan.contract!=='vangioi-staging-intent-1'||plan.environment!=='staging'||
   plan.isolation!=='separate-project-synthetic-only')return fail('unsafe-environment');
  const required=STAGING_CONNECTION_PLAN_TEMPLATE.access;
  if(Object.keys(required).some(field=>plan.access[field]!==required[field])||
   plan.firebase.sourceCollection!=='epub_stories_v49')return fail('unsafe-access-boundary');
  const selections=[
   ['firebase-project',plan.firebase.projectId,id],
   ['firestore-database',plan.firebase.databaseId,v=>v==='(default)'||id(v)],
   ['firestore-edition',plan.firebase.edition,v=>v==='STANDARD'||v==='ENTERPRISE'],
   ['firestore-location',plan.firebase.location,location]
  ];
  if(selections.some(([,value,valid])=>value!==null&&!valid(value)))
   return fail('invalid-firebase-selection');
  const pendingDecisions=selections.filter(([,value])=>value===null).map(([field])=>field);
  return {ok:true,code:pendingDecisions.length?'planning-decisions-pending':'plan-declared-not-verified',
   planShapeValid:true,environment:'staging',pendingDecisions,
   requiredEvidence:[...STAGING_REQUIRED_EVIDENCE],
   firebaseConnectionEstablished:false,permissionsVerified:false,
   stagingDeploymentAuthorized:false,releaseAuthorized:false};
 }catch{return fail('invalid-declaration');}
}
