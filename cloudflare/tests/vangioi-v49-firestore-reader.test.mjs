import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createV49FirestoreTransactionReader} from '../src/vangioi-v49-firestore-reader.mjs';
import {createV49StagingSnapshotReader} from '../src/vangioi-v49-staging-source.mjs';
import {createLibrarySourcePreparer} from '../src/vangioi-library-source.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {createV49TransactionFixture} from './fixtures/vangioi-firestore-v49.mjs';

const RECIPIENT='permitted-author',OP='staging-operator';

async function preparer(f,{readAdaptationPermit}={}){
 const readV49Snapshot=createV49FirestoreTransactionReader({firestore:f.firestore});
 const readSnapshot=createV49StagingSnapshotReader({readV49Snapshot,readAdaptationPermit:readAdaptationPermit||
  (async({storyId,contentHash})=>({ok:true,permit:{storyId,contentHash,authorizedUid:RECIPIENT,
   status:'active',revision:1,license:'licensed',sourceNote:'Synthetic operator proof',proofRef:'private-proof'}}))});
 return createLibrarySourcePreparer({projectId:'truyendienvl',verify:async()=>({uid:OP,admin:true}),
  isOperator:async uid=>uid===OP,readSnapshot})(new Request('https://staging.invalid'),
  {storyId:f.storyId,authorizedUid:RECIPIENT,requestId:crypto.randomUUID()});
}

test('G1T reads book and indexed chapters in exactly one read-only Firestore transaction',async()=>{
 const f=createV49TransactionFixture(),reader=createV49FirestoreTransactionReader({firestore:f.firestore});
 const snapshot=await reader({storyId:f.storyId});
 assert.equal(f.stats.transactions,1);assert.deepEqual(f.stats.options,[{readOnly:true}]);
 assert.deepEqual(f.stats.reads,[f.bookPath,...f.paths]);
 assert.deepEqual(snapshot.chapters.map(c=>c.id),['chapter-0010','chapter-0002']);
 assert.deepEqual(snapshot.chapters.map(c=>c.content),['PRIVATE_FIRST','PRIVATE_SECOND']);
 assert.equal(JSON.stringify(snapshot).includes('PRIVATE_COVER'),false);
 assert.equal(JSON.stringify(snapshot).includes('importFingerprint'),false);
 assert.equal(JSON.stringify(snapshot).includes('wordCount'),false);
});

test('G1T preserves G1Q canonical story version and never treats cover/owner as a permit',async()=>{
 const f=createV49TransactionFixture(),result=await preparer(f);
 const payload={format:'story-source-1',title:'Staging V49',chapters:[
  {chapterId:'chapter-0010',title:'First',text:'PRIVATE_FIRST'},
  {chapterId:'chapter-0002',title:'Second',text:'PRIVATE_SECOND'}]};
 const hash=await hashAuthoringJson(payload);
 assert.equal(result.ok,true);assert.equal(result.reference.storyVersion,'sha256-'+hash);
 assert.deepEqual(result.registryInput.payload,payload);
 assert.equal(f.stats.transactions,2);assert.equal(f.stats.reads.length,6);
 for(const key of ['approved','canPublish','canGrant','worldId'])assert.equal(Object.hasOwn(result,key),false);
});

test('G1T consistent transaction cannot mix a chapter edited after the first read',async()=>{
 const f=createV49TransactionFixture(),reader=createV49FirestoreTransactionReader({firestore:f.firestore});
 f.stats.onRead=({count})=>{if(count===1)f.patch(f.paths[0],{content:'LIVE_CHANGED'});};
 const first=await reader({storyId:f.storyId});
 assert.equal(first.chapters[0].content,'PRIVATE_FIRST');
 f.stats.onRead=null;
 const second=await reader({storyId:f.storyId});
 assert.equal(second.chapters[0].content,'LIVE_CHANGED');
});

test('G1T + G1Q detects V49 changes between two independent transaction snapshots',async()=>{
 const f=createV49TransactionFixture();
 f.stats.onRead=({count})=>{if(count===3)f.patch(f.bookPath,{status:'draft'});};
 assert.deepEqual(await preparer(f),{ok:false,code:'source-conflict'});
});

test('G1T permits are resolved only by the trusted G1R callback, never from Firestore metadata',async()=>{
 const f=createV49TransactionFixture();f.patch(f.bookPath,{permit:{status:'active',authorizedUid:RECIPIENT}});
 let calls=0;
 const result=await preparer(f,{readAdaptationPermit:async()=>{calls++;return {ok:false,code:'forbidden'};}});
 assert.deepEqual(result,{ok:false,code:'library-source-unavailable'});assert.equal(calls,1);
});

test('G1T requires a server Firestore transaction instance, rejects unsafe book IDs',async()=>{
 assert.throws(()=>createV49FirestoreTransactionReader({}),/trusted Firestore server instance/);
 const f=createV49TransactionFixture(),reader=createV49FirestoreTransactionReader({firestore:f.firestore});
 for(const storyId of ['../admin','a/b','ab','',null])
  await assert.rejects(reader({storyId}),/v49-firestore-unavailable/);
 assert.equal(f.stats.transactions,0);
});

for(const [name,change] of [
 ['missing book',f=>f.remove(f.bookPath)],
 ['importing book',f=>f.patch(f.bookPath,{status:'importing'})],
 ['missing chapter',f=>f.remove(f.paths[1])],
 ['duplicate chapter ID',f=>{const book=f.documents.get(f.bookPath);book.chapterIndex[1].id=book.chapterIndex[0].id;}],
 ['invalid chapter path',f=>{const book=f.documents.get(f.bookPath);book.chapterIndex[0].id='../private';}],
 ['wrong order',f=>f.patch(f.paths[1],{order:0})],
 ['wrong chapter ID field',f=>f.patch(f.paths[0],{id:'chapter-9999'})],
 ['wrong title',f=>f.patch(f.paths[0],{title:'Tampered'})],
 ['empty body',f=>f.patch(f.paths[0],{content:'   '})],
 ['oversized chapter',f=>f.patch(f.paths[0],{content:'x'.repeat(220001)})],
 ['too many chapters',f=>f.patch(f.bookPath,{chapterCount:161})]
])test('G1T fails closed for '+name,async()=>{
 const f=createV49TransactionFixture();change(f);
 const reader=createV49FirestoreTransactionReader({firestore:f.firestore});
 await assert.rejects(reader({storyId:f.storyId}),/v49-firestore-unavailable/);
});

test('G1T stops an oversized multi-chapter source instead of silently truncating it',async()=>{
 const f=createV49TransactionFixture(),index=[];
 for(let i=0;i<6;i++){
  const id='chapter-'+String(i+1).padStart(4,'0');
  index.push({id,title:'Chapter '+i,order:i});
  f.set(f.bookPath+'/chapters/'+id,{id,title:'Chapter '+i,order:i,content:'x'.repeat(200000)});
 }
 f.patch(f.bookPath,{chapterCount:6,chapterIndex:index});
 await assert.rejects(createV49FirestoreTransactionReader({firestore:f.firestore})({storyId:f.storyId}),
  /v49-firestore-unavailable/);
 assert.equal(f.stats.transactions,1);
});

test('G1T hides Firestore diagnostics and never falls back to untransactional reads',async()=>{
 const f=createV49TransactionFixture();
 f.firestore.runTransaction=async()=>{throw Error('PRIVATE_EMULATOR_PATH_OR_PERMISSION');};
 await assert.rejects(createV49FirestoreTransactionReader({firestore:f.firestore})({storyId:f.storyId}),
  error=>error.message==='v49-firestore-unavailable');
 assert.equal(f.stats.reads.length,0);
});
