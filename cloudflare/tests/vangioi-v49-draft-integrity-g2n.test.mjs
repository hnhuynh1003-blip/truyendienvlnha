import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createV49DraftIntegrityInspection,hashV49DraftSnapshot}
 from '../src/vangioi-v49-draft-integrity-g2n.mjs';

const STORY='epub-g2n-fictional',OWNER='owner-a',REVIEWER='reviewer-b';
const NOW=Date.parse('2026-10-27T12:00:00.000Z');
const request=(token,body)=>new Request('https://staging.invalid/isolated-g2n',{
 method:'POST',headers:{Authorization:'Bearer '+token},
 body:JSON.stringify(body||{})});
const chapterId=i=>'chapter-'+String(i+1).padStart(4,'0');
const chapterText=i=>'Nội dung tổng hợp '+(i+1);
const wordCount=s=>s.split(/\s+/).filter(Boolean).length;

function draft(chapterCount=2){
 const chapters=Array.from({length:chapterCount},(_,order)=>{
  const content=chapterText(order);
  return {id:chapterId(order),order,title:'Chương '+(order+1),
   content,wordCount:wordCount(content)};
 });
 const chapterIndex=chapters.map(({id,order,title,wordCount})=>({id,order,title,wordCount}));
 return {book:{id:STORY,title:'Nguồn thử nghiệm',author:'Tác giả A',
  genre:'Nhập EPUB',status:'draft',ownerUid:OWNER,chapterCount,
  chapterIndex,createdAt:'2026-10-27T11:00:00.000Z',
  updatedAt:'2026-10-27T11:10:00.000Z',sourceName:'fictional.epub',
  importFingerprint:'v57-0123456789abcdef-'+chapterCount,importSchema:57,coverImage:''},chapters};
}

async function setup(chapterCount=2){
 const raw=draft(chapterCount),proof=await hashV49DraftSnapshot(raw,{storyId:STORY});
 const state={raw,pin:{storyId:STORY,ownerUid:OWNER,sourceHash:proof.sourceHash,
  revision:1,status:'active'},assignment:null,heads:0,snapshots:0,pins:0,assignments:0,
  onPin:null,onAssignment:null};
 state.assignment={storyId:STORY,reviewerUid:REVIEWER,status:'active',
  scope:'v49-draft-inspect',revision:1,pinRevision:1,sourceHash:proof.sourceHash,
  expiresAt:NOW+300000};
 const verify=async req=>{
  const token=req?.headers?.get('authorization');
  if(token==='Bearer owner-token')return {uid:OWNER,admin:true};
  if(token==='Bearer owner-without-role')return {uid:OWNER,admin:false};
  if(token==='Bearer reviewer-token')return {uid:REVIEWER,admin:false};
  if(token==='Bearer foreign-admin')return {uid:'foreign-admin',admin:true};
  if(token==='Bearer anonymous-token')return null;
  throw Error('UNTRUSTED_AUTH_DIAGNOSTIC');
 };
 const gate=createV49DraftIntegrityInspection({verify,now:()=>NOW,
  readDraftHeader:async()=>{state.heads++;return structuredClone(state.raw.book);},
  readConsistentSnapshot:async()=>{state.snapshots++;return structuredClone(state.raw);},
  readSourcePin:async()=>{state.pins++;state.onPin?.(state.pins);return structuredClone(state.pin);},
  readReviewerAssignment:async()=>{state.assignments++;
   state.onAssignment?.(state.assignments);
   return state.assignment?structuredClone(state.assignment):null;}});
 return {state,gate,proof};
}
const prepublish={storyId:STORY,mode:'prepublish'};
const review={storyId:STORY,mode:'review'};

test('G2N author can inspect full draft and source hash without granting publish',async()=>{
 const {state,gate,proof}=await setup();
 const result=await gate(request('owner-token'),prepublish);
 assert.deepEqual(result,{ok:true,storyId:STORY,sourceHash:proof.sourceHash,
  sourceRevision:1,chapterCount:2,access:'owner',inspectionOnly:true,canPublish:false});
 assert.equal(state.snapshots,1);assert.equal(state.pins,2);
 assert.equal(state.assignments,0);
 assert.equal(JSON.stringify(result).includes('Nội dung tổng hợp'),false);
 assert.equal(Object.isFrozen(result),true);
});

test('G2N reviewer with current server assignment can inspect but cannot publish',async()=>{
 const {gate,state}=await setup();
 const result=await gate(request('reviewer-token',{admin:true,assignedStoryIds:[STORY]}),review);
 assert.equal(result.ok,true);assert.equal(result.access,'assigned-reviewer');
 assert.equal(result.canPublish,false);assert.equal(result.inspectionOnly,true);
 assert.equal(state.assignments,2);assert.equal(state.snapshots,1);
 assert.equal(JSON.stringify(result).includes('Nội dung tổng hợp'),false);
 assert.deepEqual(await gate(request('reviewer-token'),prepublish),{ok:false,code:'forbidden'});
});

test('G2N denies forged request roles and foreign admins before any private chapter read',async()=>{
 for(const token of ['foreign-admin','owner-without-role','anonymous-token','bad-token']){
  const {gate,state}=await setup();
  const result=await gate(request(token,{uid:OWNER,admin:true,role:'publisher',
   grants:[STORY],sourceHash:state.pin.sourceHash,reviewer:true}),prepublish);
  assert.equal(result.ok,false,token);
  assert.equal(state.snapshots,0,token);
  assert.equal(JSON.stringify(result).includes('UNTRUSTED_AUTH_DIAGNOSTIC'),false);
 }
});

test('G2N denies reviewer lacking current server assignment before chapter read',async()=>{
 const modifications=[
  s=>s.assignment=null,
  s=>s.assignment.status='revoked',
  s=>s.assignment.scope='v49-edit-or-publish',
  s=>s.assignment.reviewerUid='somebody-else',
  s=>s.assignment.storyId='another-story',
  s=>s.assignment.sourceHash='sha256-'+'f'.repeat(64),
  s=>s.assignment.pinRevision=2,
  s=>s.assignment.expiresAt=NOW,
  s=>s.assignment.revision=0
 ];
 for(const change of modifications){
  const {state,gate}=await setup();change(state);
  assert.deepEqual(await gate(request('reviewer-token',{assignedStoryIds:[STORY]}),review),
   {ok:false,code:'forbidden'});
  assert.equal(state.snapshots,0);
 }
});

test('G2N checks entire index including middle slots G2M Rules cannot fully inspect',async()=>{
 const cases=[
  s=>s.raw.book.chapterIndex[1].unknownScope='admin',
  s=>s.raw.book.chapterIndex[1].order=0,
  s=>s.raw.book.chapterIndex[1].id=s.raw.book.chapterIndex[0].id,
  s=>s.raw.book.chapterIndex[1].title='Wrong',
  s=>s.raw.book.chapterIndex[1].wordCount=-1,
  s=>s.raw.book.chapterIndex[1].wordCount=500000,
  s=>s.raw.chapters[1].wordCount=999,
  s=>s.raw.chapters[1].order=0,
  s=>s.raw.chapters[1].id='chapter-9999',
  s=>s.raw.chapters[1].content=' ',
  s=>s.raw.chapters[1].content='hello\u0000world',
  s=>s.raw.chapters[1].content='x'.repeat(220001),
  s=>s.raw.chapters[1].content='😀'.repeat(110000),
  s=>s.raw.chapters.push(structuredClone(s.raw.chapters[1])),
  s=>s.raw.chapters.pop(),
  s=>s.raw.book.chapterCount=4,
  s=>s.raw.book.ownerUid='foreign-owner',
  s=>s.raw.book.status='importing'
 ];
 for(const change of cases){
  const {state,gate}=await setup(3);change(state);
  const result=await gate(request('owner-token'),prepublish);
  assert.equal(result.ok,false,'corrupted draft unexpectedly passed');
  assert.equal(result.canPublish,undefined);
 }
});

test('G2N rejects validly-shaped but edited content/title against server-owned pinned SHA-256',async()=>{
 for(const change of [
  s=>{s.raw.chapters[0].content='Nội dung chỉnh sửa';s.raw.chapters[0].wordCount=4;
   s.raw.book.chapterIndex[0].wordCount=4;},
  s=>s.raw.book.title='Tiêu đề thay đổi',
  s=>s.raw.book.author='Tác giả mới'
 ]){
  const {state,gate}=await setup();change(state);
  assert.deepEqual(await gate(request('owner-token'),prepublish),
   {ok:false,code:'source-conflict'});
 }
});

test('G2N rechecks pin and reviewer assignment at completion; revocation wins in fixture',async()=>{
 {
  const {state,gate}=await setup();state.onPin=count=>{if(count===2)state.pin.status='revoked';};
  assert.deepEqual(await gate(request('owner-token'),prepublish),
   {ok:false,code:'source-conflict'});
 }
 {
  const {state,gate}=await setup();state.onPin=count=>{if(count===2)state.pin.revision=2;};
  assert.deepEqual(await gate(request('owner-token'),prepublish),
   {ok:false,code:'source-conflict'});
 }
 {
  const {state,gate}=await setup();state.onAssignment=count=>{
   if(count===2)state.assignment.status='revoked';};
  assert.deepEqual(await gate(request('reviewer-token'),review),
   {ok:false,code:'forbidden'});
 }
 {
  const {state,gate}=await setup();state.onAssignment=count=>{
   if(count===2)state.assignment.revision=2;};
  assert.deepEqual(await gate(request('reviewer-token'),review),
   {ok:false,code:'forbidden'});
 }
 {
  const {state,gate}=await setup();state.onPin=count=>{
   if(count===2)state.raw.book.status='published';};
  assert.deepEqual(await gate(request('owner-token'),prepublish),
   {ok:false,code:'source-conflict'});
 }
});

test('G2N requires current active server pin, never accepts raw V57 fingerprint as authority',async()=>{
 for(const change of [
  s=>s.pin=null,
  s=>s.pin.status='revoked',
  s=>s.pin.sourceHash='v57-0123456789abcdef-2',
  s=>s.pin.ownerUid='other',
  s=>s.pin.revision=0,
  s=>s.pin.storyId='other'
 ]){
  const {state,gate}=await setup();change(state);
  assert.deepEqual(await gate(request('owner-token'),prepublish),
   {ok:false,code:'forbidden'});
  assert.equal(state.snapshots,0);
 }
});

test('G2N rejects invalid call contracts and hides storage/auth exceptions',async()=>{
 assert.throws(()=>createV49DraftIntegrityInspection({}),/trusted host/);
 const {state,gate}=await setup();
 for(const arg of [{storyId:'../admin',mode:'review'},{storyId:STORY,mode:'publish'},
  {storyId:STORY,mode:'read_private'},{storyId:STORY,mode:''}])
  assert.deepEqual(await gate(request('owner-token'),arg),{ok:false,code:'forbidden'});
 assert.equal(state.heads,0);assert.equal(state.snapshots,0);
 const broken=createV49DraftIntegrityInspection({verify:async()=>({uid:OWNER,admin:true}),
  readDraftHeader:async()=>({id:STORY,ownerUid:OWNER,status:'draft'}),
  readConsistentSnapshot:async()=>{throw Error('FIRESTORE_SECRET_PATH_AND_UID');},
  readSourcePin:async()=>state.pin,readReviewerAssignment:async()=>state.assignment});
 const result=await broken(request('owner-token'),prepublish);
 assert.deepEqual(result,{ok:false,code:'v49-inspection-unavailable'});
 assert.equal(JSON.stringify(result).includes('FIRESTORE_SECRET_PATH_AND_UID'),false);
});

test('G2N verifies 160 ordered chapters and does not inherit G1T 1MiB source-intake cap',async()=>{
 const max=await setup(160);
 assert.equal((await max.gate(request('owner-token'),prepublish)).chapterCount,160);
 const over=draft(161);
 await assert.rejects(hashV49DraftSnapshot(over,{storyId:STORY}),/v49-draft-invalid/);
 const large=await setup(6);
 for(let i=0;i<6;i++){
  large.state.raw.chapters[i].content='x'.repeat(200000);
  large.state.raw.chapters[i].wordCount=1;
  large.state.raw.book.chapterIndex[i].wordCount=1;
 }
 const total=new TextEncoder().encode(large.state.raw.chapters.map(c=>c.content).join('')).length;
 assert.ok(total>1024*1024);
 const pinned=await hashV49DraftSnapshot(large.state.raw,{storyId:STORY});
 large.state.pin.sourceHash=pinned.sourceHash;
 const result=await large.gate(request('owner-token'),prepublish);
 assert.equal(result.ok,true);
 assert.equal(result.chapterCount,6);
});

test('G2N helper has no live Worker import, Firebase SDK, Firestore mutation or permission grant',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const candidate=read('../src/vangioi-v49-draft-integrity-g2n.mjs');
 for(const module of ['../src/index.mjs','../src/vangioi-authoring-http.mjs'])
  assert.equal(read(module).includes('vangioi-v49-draft-integrity-g2n'),false);
 for(const suspicious of ['firebase-admin','admin.initializeApp','firestore().collection',
  'issueAdaptationPermit','publishWorld','deploy --only','grantRole'])
  assert.equal(candidate.includes(suspicious),false,suspicious);
 assert.match(candidate,/canPublish:false/);
 assert.match(candidate,/readReviewerAssignment/);
 assert.match(candidate,/hashAuthoringJson/);
});
