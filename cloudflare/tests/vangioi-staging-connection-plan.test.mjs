import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewStagingConnectionPlan,STAGING_CONNECTION_PLAN_TEMPLATE,
 STAGING_SERVICE_BOUNDARIES,STAGING_REQUIRED_EVIDENCE} from '../src/vangioi-staging-connection-plan.mjs';

const proposed=(options={})=>({
 ...structuredClone(STAGING_CONNECTION_PLAN_TEMPLATE),
 firebase:{...STAGING_CONNECTION_PLAN_TEMPLATE.firebase,projectId:'demo-vangioi-staging',
  databaseId:'(default)',edition:'STANDARD',location:'asia-southeast1',...options.firebase},
 access:{...STAGING_CONNECTION_PLAN_TEMPLATE.access,...options.access},
 ...Object.fromEntries(Object.entries(options).filter(([k])=>!['firebase','access'].includes(k)))
});

test('G2J unresolved project, edition and region remain pending without invented defaults',()=>{
 const result=reviewStagingConnectionPlan(STAGING_CONNECTION_PLAN_TEMPLATE);
 assert.equal(result.ok,true);assert.equal(result.code,'planning-decisions-pending');
 assert.deepEqual(result.pendingDecisions,['firebase-project','firestore-database',
  'firestore-edition','firestore-location']);
 assert.equal(result.firebaseConnectionEstablished,false);assert.equal(result.stagingDeploymentAuthorized,false);
 assert.equal(result.releaseAuthorized,false);
});

test('G2J a fully declared synthetic topology is still NOT approved or connected',()=>{
 const plan=proposed(),result=reviewStagingConnectionPlan(plan);
 assert.equal(result.code,'plan-declared-not-verified');
 assert.equal(result.ok,true);assert.equal(result.planShapeValid,true);
 assert.deepEqual(result.pendingDecisions,[]);
 assert.deepEqual(result.requiredEvidence,[...STAGING_REQUIRED_EVIDENCE]);
 assert.equal(result.permissionsVerified,false);assert.equal(result.stagingDeploymentAuthorized,false);
 assert.equal(JSON.stringify(result).includes('demo-vangioi-staging'),false);
});

test('G2J nondefault database and declared enterprise edition are merely reviewed, not provisioned',()=>{
 const result=reviewStagingConnectionPlan(proposed({firebase:{databaseId:'staging-db',edition:'ENTERPRISE'}}));
 assert.equal(result.code,'plan-declared-not-verified');
 assert.equal(result.firebaseConnectionEstablished,false);
});

test('G2J cannot be pointed at production or share the production project on purpose',()=>{
 for(const options of [{environment:'production'},
  {environment:'fixture'}, {isolation:'shared-production-project'},
  {isolation:'same-project-different-database'},
  {contract:'staging-plan-2'}]){
  const result=reviewStagingConnectionPlan(proposed(options));
  assert.equal(result.code,'unsafe-environment');assert.equal(result.stagingDeploymentAuthorized,false);
 }
});

test('G2J refuses Firebase V49 writer/alternate collection or direct author/reviewer grant',()=>{
 for(const options of [{access:{reader:'server-read-write'}},
  {access:{permit:'client-admin-claim'}},{access:{consumer:'client-firestore-sync'}},
  {access:{author:'publisher-approved'}},{access:{world:'replica-claims-allowed'}},
  {access:{recovery:'same-client'}}, {firebase:{sourceCollection:'studio_data'}}])
  assert.equal(reviewStagingConnectionPlan(proposed(options)).code,'unsafe-access-boundary');
});

test('G2J rejects credentials, role/privilege overrides, and unknown private fields without reflection',()=>{
 for(const options of [
  {serviceAccount:{private_key:'PRIVATE_FAKE_KEY'}},
  {firebase:{credential:'PRIVATE_FAKE_KEY'}},
  {access:{admin:true}},
  {token:'PRIVATE_FAKE_TOKEN'},
  {firestoreRules:'allow read,write: if true;'}
 ]){
  const result=reviewStagingConnectionPlan(proposed(options));
  assert.equal(result.code,'invalid-declaration');
  assert.equal(JSON.stringify(result).includes('PRIVATE_FAKE'),false);
 }
});

test('G2J invalid edition, location, ID and malformed/null values fail closed',()=>{
 for(const bad of [{edition:'UNKNOWN'}, {edition:'standard'}, {location:'https://example.test'},
  {projectId:'project/id'}, {databaseId:'../(default)'}, {databaseId:7}, {projectId:false}])
  assert.equal(reviewStagingConnectionPlan(proposed({firebase:bad})).code,'invalid-firebase-selection');
 for(const bad of [null,undefined,[],{},'test',42,{firebase:null},{access:null}])
  assert.equal(reviewStagingConnectionPlan(bad).code,'invalid-declaration');
});

test('G2J null is an explicit undecided field, not treated as selected or verified',()=>{
 const result=reviewStagingConnectionPlan(proposed({firebase:{projectId:null,edition:null}}));
 assert.deepEqual(result.pendingDecisions,['firebase-project','firestore-edition']);
 assert.equal(result.permissionsVerified,false);
});

test('G2J role proposal includes only server boundaries and clients without privileged grants',()=>{
 assert.equal(STAGING_SERVICE_BOUNDARIES.length,6);
 assert.equal(STAGING_SERVICE_BOUNDARIES.some(p=>p.principal==='author-and-reviewer-browser'&&
  p.never.includes('permit')),true);
 assert.equal(STAGING_SERVICE_BOUNDARIES.some(p=>p.principal==='v49-reader-host'&&
  p.never.includes('firestore-write')),true);
 for(const role of STAGING_SERVICE_BOUNDARIES)assert.equal(Object.isFrozen(role),true);
 assert.equal(Object.isFrozen(STAGING_REQUIRED_EVIDENCE),true);
});

test('G2J offline review does not mutate its input or expose live service configuration',()=>{
 const plan=proposed(),before=structuredClone(plan),result=reviewStagingConnectionPlan(plan);
 assert.deepEqual(plan,before);
 assert.equal('projectId' in result,false);assert.equal('firebase' in result,false);
 assert.equal('secret' in result,false);
});

test('G2J plan module has no Worker/HTTP imports or Firebase SDK/configuration wiring',()=>{
 for(const file of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
  assert.equal(readFileSync(new URL(file,import.meta.url),'utf8').includes('vangioi-staging-connection-plan'),false);
 const source=readFileSync(new URL('../src/vangioi-staging-connection-plan.mjs',import.meta.url),'utf8');
 for(const pattern of [/from ['"]firebase/,/firebase-admin/,/fetch\(/,/wrangler/,/process\.env/])
  assert.equal(pattern.test(source),false,String(pattern));
});
