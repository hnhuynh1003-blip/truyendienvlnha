// Manual G2R: REAL Firestore Emulator, never a live Firebase database.
// Requires temporary @google-cloud/firestore, @firebase/rules-unit-testing,
// firebase and firebase-tools. Use tools/vangioi/firebase-emulator-g2r.json.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Firestore} from '@google-cloud/firestore';
import {initializeTestEnvironment,assertSucceeds,assertFails}
 from '@firebase/rules-unit-testing';
import {createV49EmulatorEpochWriter,assertG2REmulator,
 G2R_HOST,G2R_PROJECT} from '../../src/vangioi-v49-emulator-epoch-g2r.mjs';
import {createV49EpochFencedRehearsal}
 from '../../src/vangioi-v49-epoch-fence-g2q.mjs';

const emulatorHost=process.env.FIRESTORE_EMULATOR_HOST;
const active=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||
 process.env.FIREBASE_PROJECT_ID||null;
assertG2REmulator({emulatorHost,projectId:G2R_PROJECT,
 credentialPath:process.env.GOOGLE_APPLICATION_CREDENTIALS||null,
 activeProjectId:active});

// Reuse G2M Rules verbatim. G2R does not author/deploy/merge Rules.
const rules=readFileSync(new URL('../fixtures/vangioi-g2m-v49-owner-only.rules',
 import.meta.url),'utf8');
if(!rules.includes('ISOLATED FIRESTORE EMULATOR CANDIDATE')||
 !rules.includes('match /{everythingElse=**}'))
 throw Error('G2R refuses noncandidate Firestore rules');

const env=await initializeTestEnvironment({projectId:G2R_PROJECT,
 firestore:{host:'127.0.0.1',port:18084,rules}});
const db=new Firestore({projectId:G2R_PROJECT});
const STORY='epub-g2r-'+crypto.randomUUID();
const BYPASS='epub-g2r-bypass-'+crypto.randomUUID();
const OWNER='fictional-owner';
const stamp='2026-10-27T12:34:56.000Z';
const chapter='chapter-0001';
const index=[{id:chapter,title:'Chương một',order:0,wordCount:2}];
const inputBook=storyId=>({id:storyId,ownerUid:OWNER,status:'draft',
 title:'Truyện A',author:'Người viết thử',genre:'Nhập EPUB',chapterCount:1,
 chapterIndex:index,createdAt:stamp,updatedAt:stamp,sourceName:'test.epub',
 importSchema:57,importFingerprint:'v57-0123456789abcdef-1',coverImage:''});
const inputChapter={id:chapter,title:'Chương một',order:0,
 content:'xin chào',wordCount:2};
const uuid=()=>crypto.randomUUID();
const request=token=>new Request('https://fixture.invalid/g2r',{
 headers:{Authorization:'Bearer '+token}});
const command=(storyId,expectedEpoch,operationId=uuid())=>
 ({storyId,expectedEpoch,operationId});
const state={title:'Truyện A'};
const writer=createV49EmulatorEpochWriter({firestore:db,emulatorHost,
 activeProjectId:active,
 verifyOperator:async req=>req.headers.get('authorization')==='Bearer op'?
  {uid:'fixture-operator',operator:true}:null,
 prepareMutation:async({previousSnapshot})=>{
  const next=structuredClone(previousSnapshot);
  next.book.title=state.title;
  return next;
 }});

try{
 await env.clearFirestore();
 for(const storyId of [STORY,BYPASS]){
  const book=db.collection('epub_stories_v49').doc(storyId);
  await book.set(inputBook(storyId));
  await book.collection('chapters').doc(chapter).set(inputChapter);
 }
 const primary=db.collection('epub_stories_v49').doc(STORY);
 const baseline=await writer.applyVerifiedWrite(request('op'),command(STORY,null));
 assert.equal(baseline.sourceEpoch,1);
 assert.equal(baseline.canPublish,false);
 const owner=env.authenticatedContext(OWNER,{admin:true}).firestore();
 const guest=env.unauthenticatedContext().firestore();
 const foreign=env.authenticatedContext('foreign',{admin:true,
  reviewer:true,assignedStoryIds:[STORY]}).firestore();
 const publicPath=client=>client.collection('epub_stories_v49').doc(STORY);
 const epochPath=client=>client.collection('vg_fixture_v49_epochs_g2r').doc(STORY);

 // Actual Rules-unit-testing clients, NOT Admin SDK authorization guesses.
 await assertSucceeds(publicPath(owner).get());
 await assertSucceeds(publicPath(owner).collection('chapters').doc(chapter).get());
 for(const denied of [()=>publicPath(guest).get(),()=>publicPath(foreign).get(),
  ()=>publicPath(foreign).collection('chapters').doc(chapter).get(),
  ()=>epochPath(owner).get(),()=>epochPath(owner).set({sourceEpoch:999}),
  ()=>epochPath(guest).get(),()=>epochPath(foreign).get()])
  await assertFails(denied());
 await assertFails(publicPath(owner).collection('chapters').doc(chapter)
  .update({content:'fake write'}));

 // Read-only client security doesn't imply exclusive server write authority.
 // Existing G2M Rules can still let an owner publish without touching epoch.
 await writer.applyVerifiedWrite(request('op'),command(BYPASS,null));
 const bypass=owner.collection('epub_stories_v49').doc(BYPASS);
 await assertSucceeds(bypass.update({status:'published',publishedAt:stamp,
  updatedAt:stamp}));
 assert.equal((await writer.readSourceEpoch({storyId:BYPASS})).sourceEpoch,1);
 assert.equal((await db.collection('epub_stories_v49').doc(BYPASS).get())
  .data().status,'published');

 // Host-side Firestore transaction modifies book + sidecar + operation together.
 state.title='Truyện B';
 const b=await writer.applyVerifiedWrite(request('op'),command(STORY,1));
 assert.equal(b.sourceEpoch,2);
 assert.equal((await primary.get()).data().title,'Truyện B');
 assert.equal((await writer.readSourceEpoch({storyId:STORY})).sourceEpoch,2);
 state.title='Truyện A';
 const a=await writer.applyVerifiedWrite(request('op'),command(STORY,2));
 assert.equal(a.sourceEpoch,3);assert.equal(a.sourceHash,baseline.sourceHash);
 await assert.rejects(writer.applyVerifiedWrite(request('op'),command(STORY,1)),
  /source-epoch-conflict/);

 const replay=uuid();
 state.title='Truyện D';
 await writer.applyVerifiedWrite(request('op'),command(STORY,3,replay));
 await assert.rejects(writer.applyVerifiedWrite(request('op'),command(STORY,4,replay)),
  /operation-replay/);

 // Two writes claiming the exact same epoch: exactly one can commit.
 const start=(await writer.readSourceEpoch({storyId:STORY})).sourceEpoch;
 state.title='Truyện E';
 const conflict=await Promise.allSettled([
  writer.applyVerifiedWrite(request('op'),command(STORY,start)),
  writer.applyVerifiedWrite(request('op'),command(STORY,start))]);
 assert.equal(conflict.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(conflict.filter(r=>r.status==='rejected').length,1);
 assert.equal((await writer.readSourceEpoch({storyId:STORY})).sourceEpoch,start+1);

 // Explicit ABA between two G2Q reads: final SHA matches first, epoch does not.
 const stable=await writer.readSourceEpoch({storyId:STORY});
 state.title='Truyện B';
 const fenced=createV49EpochFencedRehearsal({projectId:G2R_PROJECT,
  readSourceEpoch:writer.readSourceEpoch,rehearse:async()=>{
   await writer.applyVerifiedWrite(request('op'),command(STORY,stable.sourceEpoch));
   state.title='Truyện E';
   await writer.applyVerifiedWrite(request('op'),command(STORY,stable.sourceEpoch+1));
   return {ok:true,storyId:STORY,sourceHash:stable.sourceHash,
    sourceRevision:1,chapterCount:1,access:'owner',
    inspectionOnly:true,raceRehearsalOnly:true,canPublish:false};
  }});
 assert.deepEqual(await fenced(request('op'),{storyId:STORY,mode:'prepublish'}),
  {ok:false,code:'source-epoch-conflict'});
 assert.equal((await writer.readSourceEpoch({storyId:STORY})).sourceHash,
  stable.sourceHash);

 // Admin/server SDK can bypass Rules in the Emulator: detect untracked drift.
 await primary.update({title:'UNTRACKED'});
 await assert.rejects(writer.applyVerifiedWrite(request('op'),
  command(STORY,stable.sourceEpoch+2)),/source-epoch-conflict/);

 console.log(JSON.stringify({g2r:'isolated-emulator-source-epoch',
  actualFirestoreTransaction:true,actualRulesClientChecks:true,
  sourceEpoch:(await writer.readSourceEpoch({storyId:STORY})).sourceEpoch,
  caughtABA:true,staleCasDenied:true,duplicateOperationDenied:true,
  competingWritersExactlyOne:true,untrackedDriftDenied:true,
  clientSidecarDenied:true,
  existingG2MOwnerCanPublishWithoutEpoch:true,
  existingRulesEnforceEpochOnOwnerPublish:false,productionChanged:false}));
}finally{
 try{await env.clearFirestore();}finally{
  await env.cleanup();await db.terminate();
 }
}
