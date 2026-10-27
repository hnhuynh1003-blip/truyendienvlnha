import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createG2VEmergencyRehearsal,G2V_HOST,G2V_PROJECT}
 from '../src/vangioi-v49-emergency-hold-g2v.mjs';
import {assertG2WNoEmergencyHold}
 from '../src/vangioi-v49-guarded-publisher-g2w.mjs';

const storyId='epub-g2y-unit',ownerUid='owner-g2y';
const firstCase='case-first-g2y',secondCase='case-second-g2y';
const hash='sha256-'+'a'.repeat(64);
const command=(revision=2,operationId='123e4567-e89b-42d3-a456-426614174001')=>({
 storyId,expectedHoldRevision:revision,operationId});
const signoff=caseId=>({storyId,caseId,reason:'urgent-rights-hold',
 authorized:true,operatorUid:'operator-one',rightsOfficerUid:'rights-two'});
const bookKey=`epub_stories_v49/${storyId}`;
const epochKey=`vg_fixture_v49_epochs_g2r/${storyId}`;
const holdKey=`vg_fixture_v49_emergency_holds_g2v/${storyId}`;
const clearanceKey=`vg_fixture_v49_recovery_clearances_g2v/${storyId}`;
const opKey=x=>`vg_fixture_v49_emergency_ops_g2v/${x}`;
const caseKey=x=>`${holdKey}/cases/${x}`;
const fixture=({publicBook=true,sourceValid=true,holdStatus='review-ready',
 holdRevision=2,hasHold=true}={})=>{
 const records=new Map([[bookKey,{id:storyId,ownerUid,
  status:publicBook?'published':'draft',publishedAt:'old-date',chapterCount:1}],
  [epochKey,{storyId,ownerUid,sourceEpoch:5,
   sourceHash:sourceValid?hash:'bad-hash'}],
  [clearanceKey,{storyId,caseId:firstCase,status:'consumed'}]]);
 if(hasHold)records.set(holdKey,{storyId,ownerUid,status:holdStatus,
  holdRevision,caseId:firstCase,reason:'suspected-rights-breach'});
 const clone=x=>structuredClone(x);
 const ref=path=>({path,collection:segment=>collection(path+'/'+segment)});
 const collection=base=>({doc:name=>ref(base+'/'+name)});
 const firestore={projectId:G2V_PROJECT,collection,
  async runTransaction(work){
   const pending=[];
   const tx={
    async get(doc){const exists=records.has(doc.path);
     return {exists,data:()=>exists?clone(records.get(doc.path)):undefined};},
    create(doc,data){pending.push(['create',doc.path,clone(data)]);},
    set(doc,data){pending.push(['set',doc.path,clone(data)]);},
    update(doc,data){pending.push(['update',doc.path,clone(data)]);}
   };
   const result=await work(tx);
   for(const [type,path,data] of pending){
    if(type==='create'&&records.has(path))throw Error('already-exists');
    if(type==='update'&&!records.has(path))throw Error('not-found');
    records.set(path,type==='update'?{...records.get(path),...data}:data);
   }
   return result;
  }};
 const service=createG2VEmergencyRehearsal({firestore,emulatorHost:G2V_HOST,
  verifyEmergency:async()=>signoff(secondCase),
  verifyRecovery:async()=>null,now:()=>Date.parse('2026-10-27T17:00:00Z')});
 return {records,service};
};

test('G2Y reviewed hold can be reasserted atomically and hides a leaked public book',async()=>{
 const {records,service}=fixture();
 const output=await service.reassertEmergencyHold({},command());
 assert.equal(output.ok,true);
 assert.equal(output.wasPublic,true);
 assert.equal(output.emulatorHidden,true);
 assert.equal(output.canRepublish,false);
 assert.equal(output.productionAuthorized,false);
 assert.equal(records.get(bookKey).status,'draft');
 assert.equal('publishedAt' in records.get(bookKey),false);
 assert.equal(records.get(epochKey).sourceEpoch,6);
 assert.equal(records.get(holdKey).holdRevision,3);
 assert.equal(records.get(holdKey).status,'held');
 assert.equal(records.get(holdKey).caseId,secondCase);
 assert.equal(records.get(clearanceKey).status,'superseded');
 assert.equal(records.get(caseKey(firstCase)).backfilledFromHold,true);
 assert.equal(records.get(caseKey(secondCase)).holdRevision,3);
 assert.equal(records.get(opKey(command().operationId)).sourceEpochAttested,false);
 assert.throws(()=>assertG2WNoEmergencyHold({exists:true}),/emergency-hold/);
});

test('G2Y re-hold keeps private book private and does not alter epoch',async()=>{
 const {records,service}=fixture({publicBook:false});
 const output=await service.reassertEmergencyHold({},command());
 assert.equal(output.wasPublic,false);
 assert.equal(output.sourceEpochAfter,null);
 assert.equal(records.get(bookKey).status,'draft');
 assert.equal(records.get(epochKey).sourceEpoch,5);
});

test('G2Y emergency still hides leaked published book with corrupt epoch',async()=>{
 const {records,service}=fixture({sourceValid:false});
 const output=await service.reassertEmergencyHold({},command());
 assert.equal(output.wasPublic,true);
 assert.equal(output.sourceEpochAfter,null);
 assert.equal(records.get(epochKey).sourceEpoch,5);
 assert.equal(records.get(bookKey).status,'draft');
});

test('G2Y reassert supports further independent held and reviewed generations',async()=>{
 const {records,service}=fixture();
 await service.reassertEmergencyHold({},command());
 const nextService=createG2VEmergencyRehearsal({
  firestore:serviceFirestore(records),emulatorHost:G2V_HOST,
  verifyEmergency:async()=>signoff('case-third-g2y'),verifyRecovery:async()=>null});
 const second=await nextService.reassertEmergencyHold({},command(3,
  '123e4567-e89b-42d3-a456-426614174002'));
 assert.equal(second.holdRevision,4);
 assert.equal(records.get(holdKey).caseId,'case-third-g2y');
 assert.equal(records.get(caseKey('case-third-g2y')).previousCaseId,secondCase);
 records.set(holdKey,{...records.get(holdKey),status:'review-ready',holdRevision:5});
 const thirdService=createG2VEmergencyRehearsal({
  firestore:serviceFirestore(records),emulatorHost:G2V_HOST,
  verifyEmergency:async()=>signoff('case-fourth-g2y'),verifyRecovery:async()=>null});
 const third=await thirdService.reassertEmergencyHold({},command(5,
  '123e4567-e89b-42d3-a456-426614174003'));
 assert.equal(third.holdRevision,6);
 assert.equal(records.get(caseKey('case-fourth-g2y')).previousCaseId,'case-third-g2y');
});

// Reuse the same storage object with an explicit transaction mock, mirroring
// the sequential CAS checks; this never connects a real Firebase project.
function serviceFirestore(records){
 const collection=base=>({doc:name=>({path:base+'/'+name,
  collection:child=>collection(base+'/'+name+'/'+child)})});
 return {projectId:G2V_PROJECT,collection,
  async runTransaction(work){
   const writes=[];const tx={
    get:async ref=>({exists:records.has(ref.path),
     data:()=>structuredClone(records.get(ref.path))}),
    create:(ref,data)=>writes.push(['create',ref.path,data]),
    set:(ref,data)=>writes.push(['set',ref.path,data]),
    update:(ref,data)=>writes.push(['update',ref.path,data])};
   const result=await work(tx);
   for(const [kind,path,data] of writes){
    if(kind==='create'&&records.has(path))throw Error('already-exists');
    if(kind==='update'&&!records.has(path))throw Error('not-found');
    records.set(path,kind==='update'?{...records.get(path),...data}:data);
   }
   return result;
  }};
}

test('G2Y rejects stale revision, stale case, missing hold and malformed commands',async()=>{
 for(const invalid of [{...command(),expectedHoldRevision:1},
  {...command(),expectedHoldRevision:0},
  {...command(),operationId:'not-a-uuid'}]){
  const {service}=fixture();
  await assert.rejects(service.reassertEmergencyHold({},invalid),/emulator-rehold-/);
 }
 const missing=fixture({hasHold:false});
 await assert.rejects(missing.service.reassertEmergencyHold({},command()),
  /evidence-unavailable/);
 const stale=fixture();
 stale.records.set(caseKey(secondCase),{storyId,caseId:secondCase,holdRevision:10});
 await assert.rejects(stale.service.reassertEmergencyHold({},command()),
  /case-replay/);
});

test('G2Y rejects same-case reuse and missing history after generation 2',async()=>{
 const same=fixture();
 same.records.set(holdKey,{...same.records.get(holdKey),caseId:secondCase});
 await assert.rejects(same.service.reassertEmergencyHold({},command()),/case-replay/);
 const gap=fixture({holdRevision:7});
 await assert.rejects(gap.service.reassertEmergencyHold({},command(7)),
  /history-conflict/);
});

test('G2Y refuses forged or single-actor emergency approvals',async()=>{
 const {records}=fixture();
 for(const forged of [null,{...signoff(secondCase),authorized:false},
  {...signoff(secondCase),rightsOfficerUid:'operator-one'},
  {...signoff(secondCase),storyId:'epub-not-ours'}]){
  const svc=createG2VEmergencyRehearsal({firestore:serviceFirestore(records),
   emulatorHost:G2V_HOST,verifyEmergency:async()=>forged,
   verifyRecovery:async()=>null});
  await assert.rejects(svc.reassertEmergencyHold({},command()),
   /dual-approval-required/);
 }
 assert.equal(records.get(holdKey).holdRevision,2);
});

test('G2Y has no production or public-restore wiring',()=>{
 const src=readFileSync(new URL('../src/vangioi-v49-emergency-hold-g2v.mjs',
  import.meta.url),'utf8');
 assert.ok(src.includes('reassertEmergencyHold'));
 assert.ok(!src.includes("from 'firebase-admin"));
 assert.ok(!src.includes('canRepublish:true'));
 assert.ok(!src.includes('productionAuthorized:true'));
});
