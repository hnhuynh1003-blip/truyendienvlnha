import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createV49StagingSnapshotReader} from '../src/vangioi-v49-staging-source.mjs';
import {createLibrarySourcePreparer} from '../src/vangioi-library-source.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';

const STORY='epub-v49-story',RECIPIENT='permitted-author';
const request=()=>new Request('https://staging.invalid/g1s');

function setup(){
 const raw={book:{id:STORY,title:'A V49 story',ownerUid:'book-publisher',status:'published',chapterCount:2,
  chapterIndex:[{id:'chapter-0010',title:'Opening',order:0,wordCount:2},
   {id:'chapter-0002',title:'Ending',order:1,wordCount:2}],
  coverImage:'PRIVATE_COVER',importFingerprint:'untrusted-v57-fingerprint',admin:true},
  chapters:[{id:'chapter-0002',title:'Ending',order:1,content:'PRIVATE_ENDING',wordCount:1},
   {id:'chapter-0010',title:'Opening',order:0,content:'PRIVATE_OPENING',wordCount:1}]};
 const expected={format:'story-source-1',title:'A V49 story',chapters:[
  {chapterId:'chapter-0010',title:'Opening',text:'PRIVATE_OPENING'},
  {chapterId:'chapter-0002',title:'Ending',text:'PRIVATE_ENDING'}]};
 const calls={snapshots:0,permits:0,hashes:[],onSnapshot:null};
 const readV49Snapshot=async()=>{
  calls.snapshots++;calls.onSnapshot?.(calls.snapshots);return structuredClone(raw);
 };
 const readAdaptationPermit=async({storyId,contentHash})=>{
  calls.permits++;calls.hashes.push(contentHash);
  return {ok:true,permit:{storyId,authorizedUid:RECIPIENT,contentHash,status:'active',revision:1,
   license:'licensed',sourceNote:'Synthetic reviewed license',proofRef:'private-proof-reference'}};
 };
 const hooks={readV49Snapshot,readAdaptationPermit};
 const reader=()=>createV49StagingSnapshotReader(hooks);
 const prepare=()=>createLibrarySourcePreparer({projectId:'truyendienvl',verify:async()=>({uid:'operator'}),
  isOperator:async()=>true,readSnapshot:reader()})(request(),
  {requestId:crypto.randomUUID(),storyId:STORY,authorizedUid:RECIPIENT});
 return {raw,expected,calls,hooks,reader,prepare};
}

test('G1S projects V49 book/chapters without cover, fingerprint, wordCount or self-declared rights',async()=>{
 const f=setup(),result=await f.reader()({storyId:STORY,authorizedUid:RECIPIENT});
 assert.deepEqual(result.book,{id:STORY,title:'A V49 story',ownerUid:'book-publisher',status:'published',chapterCount:2,
  chapterIndex:[{id:'chapter-0010',title:'Opening',order:0},{id:'chapter-0002',title:'Ending',order:1}]});
 assert.deepEqual(result.chapters.map(c=>c.id),['chapter-0010','chapter-0002']);
 assert.deepEqual(f.calls.hashes,[await hashAuthoringJson(f.expected)]);
 assert.equal(JSON.stringify(result).includes('PRIVATE_COVER'),false);
 assert.equal(JSON.stringify(result).includes('untrusted-v57-fingerprint'),false);
 assert.equal(JSON.stringify(result).includes('wordCount'),false);
});

test('G1S read callback works with G1Q without automatic register, grant, publish or source truncation',async()=>{
 const f=setup(),result=await f.prepare();
 assert.equal(result.ok,true);assert.deepEqual(result.registryInput.payload,f.expected);
 assert.equal(result.reference.storyVersion,'sha256-'+await hashAuthoringJson(f.expected));
 assert.equal(result.permitRevision,1);assert.equal(f.calls.snapshots,2);assert.equal(f.calls.permits,2);
 for(const key of ['approved','canPublish','canGrant','worldId'])assert.equal(Object.hasOwn(result,key),false);
});

test('G1S requires both trusted host callbacks and never accepts client-supplied permit data',async()=>{
 assert.throws(()=>createV49StagingSnapshotReader({}),/trusted snapshot and permit readers/);
 const f=setup();let permits=0;
 f.raw.book.permit={status:'active',authorizedUid:RECIPIENT};
 f.hooks.readAdaptationPermit=async()=>{permits++;return {ok:false,code:'forbidden'};};
 await assert.rejects(f.reader()({storyId:STORY,authorizedUid:RECIPIENT}),/v49-staging-source-unavailable/);
 assert.equal(permits,1);
});

for(const [name,edit] of [
 ['importing book',raw=>raw.book.status='importing'],
 ['missing chapter',raw=>raw.chapters.pop()],
 ['duplicate chapter',raw=>raw.chapters[1].id=raw.chapters[0].id],
 ['wrong chapter ID',raw=>raw.book.chapterIndex[0].id='missing'],
 ['wrong index order',raw=>raw.book.chapterIndex[1].order=0],
 ['wrong chapter title',raw=>raw.chapters[0].title='Tampered'],
 ['wrong chapter order',raw=>raw.chapters[1].order=1],
 ['empty chapter text',raw=>raw.chapters[1].content=' '],
 ['missing owner',raw=>raw.book.ownerUid=''],
 ['too many V49 chapters',raw=>raw.book.chapterCount=161],
 ['source exceeds G1F 1 MiB intake',raw=>raw.chapters[1].content='x'.repeat(1024*1024)]
])test('G1S rejects '+name+' before querying a permit',async()=>{
 const f=setup();edit(f.raw);
 await assert.rejects(f.reader()({storyId:STORY,authorizedUid:RECIPIENT}),/v49-staging-source-unavailable/);
 assert.equal(f.calls.permits,0);
});

test('G1S denies absent, revoked, foreign-recipient and stale-content permits',async()=>{
 for(const permit of [null,{ok:false,code:'forbidden'},
  {ok:true,permit:{storyId:STORY,status:'revoked',authorizedUid:RECIPIENT,contentHash:'a'.repeat(64)}},
  {ok:true,permit:{storyId:STORY,status:'active',authorizedUid:'foreign',contentHash:'a'.repeat(64)}},
  {ok:true,permit:{storyId:STORY,status:'active',authorizedUid:RECIPIENT,contentHash:'a'.repeat(64)}}]){
  const f=setup();f.hooks.readAdaptationPermit=async()=>permit;
  await assert.rejects(f.reader()({storyId:STORY,authorizedUid:RECIPIENT}),/v49-staging-source-unavailable/);
 }
});

test('G1S + G1Q detect mutable V49 metadata between reads and keep source text out of errors',async()=>{
 const f=setup();f.calls.onSnapshot=n=>{if(n===2)f.raw.book.status='draft';};
 assert.deepEqual(await f.prepare(),{ok:false,code:'source-conflict'});
 const g=setup();g.hooks.readV49Snapshot=async()=>{throw Error('PRIVATE_FIRESTORE_DIAGNOSTIC');};
 const response=await g.prepare();
 assert.deepEqual(response,{ok:false,code:'library-source-unavailable'});
 assert.equal(JSON.stringify(response).includes('PRIVATE_'),false);
});
