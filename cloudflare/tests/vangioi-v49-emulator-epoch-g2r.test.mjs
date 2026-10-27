import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createV49EmulatorEpochWriter,assertG2REmulator,
 G2R_HOST,G2R_PROJECT} from '../src/vangioi-v49-emulator-epoch-g2r.mjs';
import {createV49EpochFencedRehearsal}
 from '../src/vangioi-v49-epoch-fence-g2q.mjs';

const STORY='epub-g2r-fake',OWNER='fixture-owner';
const uuid=()=>crypto.randomUUID();
const request=token=>new Request('https://fixture.invalid/g2r',{
 headers:{Authorization:'Bearer '+token}});
const command=(expectedEpoch=null,operationId=uuid())=>({
 storyId:STORY,expectedEpoch,operationId});
function initial(){
 const chapters=['Thứ nhất','Thứ hai'].map((content,order)=>({
  id:'chapter-'+String(order+1).padStart(4,'0'),title:'Chương '+(order+1),
  order,wordCount:2,content}));
 return {book:{id:STORY,title:'Truyện A',author:'Người viết',genre:'Nhập EPUB',
  status:'draft',ownerUid:OWNER,chapterCount:2,
  chapterIndex:chapters.map(({id,title,order,wordCount})=>({id,title,order,wordCount})),
  importSchema:57,sourceName:'fixture.epub',importFingerprint:'v57-0123456789abcdef-2',
  coverImage:'',createdAt:'2026-10-27T09:00:00.000Z',
  updatedAt:'2026-10-27T10:00:00.000Z'},chapters};
}
function fake(){
 const raw=initial(),rows=new Map(),state={nextTitle:null,nextOwner:null,
  nextAuthor:null,tx:0};
 rows.set(`epub_stories_v49/${STORY}`,raw.book);
 for(const c of raw.chapters)rows.set(`epub_stories_v49/${STORY}/chapters/${c.id}`,c);
 const doc=(path)=>({path,collection(name){return {doc(id){return doc(path+'/'+name+'/'+id);}};},
  async get(){return snapshot(rows.get(path));}});
 const snapshot=value=>({exists:value!==undefined,
  data(){return structuredClone(value);}});
 const firestore={projectId:G2R_PROJECT,
  collection(name){return {doc(id){return doc(name+'/'+id);}};},
  async runTransaction(fn){
   state.tx++;
   const writes=[];
   const tx={get:async ref=>snapshot(rows.get(ref.path)),
    set(ref,value){writes.push({path:ref.path,value});},
    create(ref,value){if(rows.has(ref.path))throw Error('duplicate-operation');
     writes.push({path:ref.path,value});}};
   const result=await fn(tx);
   for(const w of writes)rows.set(w.path,structuredClone(w.value));
   return result;
  }};
 const writer=createV49EmulatorEpochWriter({firestore,emulatorHost:G2R_HOST,
  verifyOperator:async req=>req.headers.get('authorization')==='Bearer op'?
   {uid:'verified-operator',operator:true}:null,
  prepareMutation:async({previousSnapshot})=>{
   const copy=structuredClone(previousSnapshot);
   if(state.nextTitle!==null)copy.book.title=state.nextTitle;
   if(state.nextOwner!==null)copy.book.ownerUid=state.nextOwner;
   if(state.nextAuthor!==null)copy.book.author=state.nextAuthor;
   return copy;
  }});
 return {writer,rows,state};
}

test('G2R requires exact local demo emulator and no credential path',()=>{
 assert.deepEqual(assertG2REmulator({emulatorHost:G2R_HOST,projectId:G2R_PROJECT}),
  {projectId:G2R_PROJECT,emulatorHost:G2R_HOST,emulatorOnly:true});
 for(const config of [
  {emulatorHost:'remote.example:18084',projectId:G2R_PROJECT},
  {emulatorHost:G2R_HOST,projectId:'truyendienvl'},
  {emulatorHost:G2R_HOST,projectId:G2R_PROJECT,credentialPath:'/secret'},
  {emulatorHost:G2R_HOST,projectId:G2R_PROJECT,activeProjectId:'prod'}
 ])assert.throws(()=>assertG2REmulator(config),/G2R refuses/);
});

test('G2R operator is verified by trusted host, not request body',async()=>{
 const f=fake();
 await assert.rejects(f.writer.applyVerifiedWrite(request('owner'),command()),
  /operator-required/);
 await assert.rejects(f.writer.applyVerifiedWrite(request('forged-admin'),command()),
  /operator-required/);
 assert.equal(f.state.tx,0);
});

test('G2R initial source-side transaction records SHA and epoch without prose',async()=>{
 const f=fake(),result=await f.writer.applyVerifiedWrite(request('op'),command());
 assert.equal(result.ok,true);assert.equal(result.sourceEpoch,1);
 assert.equal(result.canPublish,false);assert.equal(result.emulatorOnly,true);
 const current=await f.writer.readSourceEpoch({storyId:STORY});
 assert.equal(current.sourceHash,result.sourceHash);
 assert.equal(current.chapterCount,2);assert.equal(current.operationHighwater,1);
 assert.equal(JSON.stringify(current).includes('Thứ nhất'),false);
 assert.equal(Object.isFrozen(current),true);
});

test('G2R write updates source and epoch together; stale and replay fail',async()=>{
 const f=fake();await f.writer.applyVerifiedWrite(request('op'),command());
 f.state.nextTitle='Truyện B';
 const op=uuid(),changed=await f.writer.applyVerifiedWrite(request('op'),command(1,op));
 assert.equal(changed.sourceEpoch,2);
 assert.equal(f.rows.get(`epub_stories_v49/${STORY}`).title,'Truyện B');
 assert.equal((await f.writer.readSourceEpoch({storyId:STORY})).sourceEpoch,2);
 await assert.rejects(f.writer.applyVerifiedWrite(request('op'),command(1)),
  /source-epoch-conflict/);
 await assert.rejects(f.writer.applyVerifiedWrite(request('op'),command(2,op)),
  /operation-replay/);
 assert.equal((await f.writer.readSourceEpoch({storyId:STORY})).sourceEpoch,2);
});

test('G2R malformed content or ownership change cannot partially write',async()=>{
 const f=fake();await f.writer.applyVerifiedWrite(request('op'),command());
 f.state.nextOwner='forged-author';
 await assert.rejects(f.writer.applyVerifiedWrite(request('op'),command(1)),
  /identity-conflict/);
 assert.equal(f.rows.get(`epub_stories_v49/${STORY}`).ownerUid,OWNER);
 assert.equal((await f.writer.readSourceEpoch({storyId:STORY})).sourceEpoch,1);
 f.state.nextOwner=null;f.state.nextAuthor='other-author';
 await assert.rejects(f.writer.applyVerifiedWrite(request('op'),command(1)),
  /identity-conflict/);
 assert.equal(f.rows.get(`epub_stories_v49/${STORY}`).author,'Người viết');
});

test('G2R G2Q fence catches observed Firestore A->B->A',async()=>{
 const f=fake();await f.writer.applyVerifiedWrite(request('op'),command());
 const initial=await f.writer.readSourceEpoch({storyId:STORY});
 const rehearsal=createV49EpochFencedRehearsal({environment:'fixture',
  projectId:G2R_PROJECT,readSourceEpoch:f.writer.readSourceEpoch,
  rehearse:async()=>{
   f.state.nextTitle='Truyện B';
   await f.writer.applyVerifiedWrite(request('op'),command(1));
   f.state.nextTitle='Truyện A';
   await f.writer.applyVerifiedWrite(request('op'),command(2));
   // Simulates G2P's two equal hashes with no source revision information.
   return {ok:true,storyId:STORY,sourceHash:initial.sourceHash,
    sourceRevision:1,chapterCount:2,access:'owner',
    raceRehearsalOnly:true,inspectionOnly:true,canPublish:false};
  }});
 assert.deepEqual(await rehearsal(request('op'),{storyId:STORY,mode:'prepublish'}),
  {ok:false,code:'source-epoch-conflict'});
 const final=await f.writer.readSourceEpoch({storyId:STORY});
 assert.equal(final.sourceHash,initial.sourceHash);
 assert.equal(final.sourceEpoch,3);
});

test('G2R detects unrecorded source hash drift before another source write',async()=>{
 const f=fake();await f.writer.applyVerifiedWrite(request('op'),command());
 f.rows.get(`epub_stories_v49/${STORY}`).title='untracked';
 await assert.rejects(f.writer.applyVerifiedWrite(request('op'),command(1)),
  /source-epoch-conflict/);
 assert.equal((await f.writer.readSourceEpoch({storyId:STORY})).sourceEpoch,1);
});

test('G2R remains isolated from Worker, frontend, Firebase live and Rules configs',()=>{
 const source=readFileSync(new URL('../src/vangioi-v49-emulator-epoch-g2r.mjs',
  import.meta.url),'utf8');
 for(const live of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
  assert.equal(readFileSync(new URL(live,import.meta.url),'utf8')
   .includes('vangioi-v49-emulator-epoch-g2r'),false);
 assert.doesNotMatch(source,/firebase-admin|firebase\.json|publishWorld|issueAdaptationPermit/);
 assert.match(source,/emulatorHost!==G2R_HOST/);
 const config=JSON.parse(readFileSync(new URL('../../tools/vangioi/firebase-emulator-g2r.json',
  import.meta.url),'utf8'));
 assert.deepEqual(config,{emulators:{firestore:{host:'127.0.0.1',port:18084}}});
});
