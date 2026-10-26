import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLibrarySourcePreparer} from '../src/vangioi-library-source.mjs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
async function fixture(){
 const payload={format:'story-source-1',title:'Book',chapters:[{chapterId:'chapter-0010',title:'First',text:'PRIVATE_ONE'},
  {chapterId:'chapter-0002',title:'Second',text:'PRIVATE_TWO'}]};
 const s={book:{id:'epub-existing',title:'Book',ownerUid:'book-owner',status:'published',chapterCount:2,
  chapterIndex:payload.chapters.map((c,order)=>({id:c.chapterId,title:c.title,order}))},
  chapters:payload.chapters.map((c,order)=>({id:c.chapterId,title:c.title,order,content:c.text})).reverse(),
  permit:{storyId:'epub-existing',authorizedUid:'adapter-author',contentHash:await hashAuthoringJson(payload),status:'active',revision:1,
   license:'licensed',sourceNote:'Synthetic adaptation permission',proofRef:'private-proof'}};
 const input={storyId:'epub-existing',authorizedUid:'adapter-author',requestId:crypto.randomUUID()},hooks={reads:0,operators:0,onRead:null,onOperator:null};
 const options={projectId:'truyendienvl',verify:async()=>({uid:'operator',admin:true}),
  isOperator:async()=>{hooks.operators++;return hooks.onOperator?.(hooks.operators)??true;},
  readSnapshot:async()=>{hooks.reads++;hooks.onRead?.(hooks.reads);return structuredClone(s);}};
 return {s,input,payload,hooks,options,run:()=>createLibrarySourcePreparer(options)(new Request('https://test'),input)};
}
test('G1Q preserves library/chapter IDs and source order, computes canonical pin and only prepares operator input',async()=>{
 const f=await fixture(),r=await f.run();assert.equal(r.ok,true);assert.deepEqual(r.registryInput.payload,f.payload);
 assert.equal(r.reference.contentHash,await hashAuthoringJson(f.payload));assert.equal(r.reference.storyVersion,'sha256-'+r.reference.contentHash);
 assert.equal(r.registryInput.storyId,'epub-existing');assert.equal(r.permitRevision,1);
 for(const key of ['approved','canPublish','canGrant','worldId'])assert.equal(Object.hasOwn(r,key),false);
});
for(const [name,change]of [
 ['no permit',f=>f.s.permit=null],['revoked permit',f=>f.s.permit.status='revoked'],['foreign recipient',f=>f.s.permit.authorizedUid='other'],
 ['stale hash',f=>f.s.permit.contentHash='f'.repeat(64)],['missing licensed proof',f=>f.s.permit.proofRef=null],
 ['incomplete import',f=>f.s.book.status='importing'],['missing chapter',f=>f.s.chapters.pop()],
 ['duplicate chapter',f=>f.s.chapters[1]=structuredClone(f.s.chapters[0])],['order mismatch',f=>f.s.book.chapterIndex.reverse()],
 ['title mismatch',f=>f.s.chapters[0].title='Other']
])test('G1Q rejects '+name,async()=>{const f=await fixture();change(f);const r=await f.run();assert.equal(r.ok,false);assert.equal(JSON.stringify(r).includes('PRIVATE_'),false);});
test('G1Q owner/admin claims do not replace operator assignment; guest cannot read source',async()=>{
 const f=await fixture();f.hooks.onOperator=()=>false;assert.equal((await f.run()).code,'forbidden');assert.equal(f.hooks.reads,0);
 f.options.verify=async()=>null;assert.equal((await f.run()).code,'unauthenticated');assert.equal(f.hooks.reads,0);
});
test('G1Q concurrent source or permit updates invalidate preparation; operator is checked again',async()=>{
 for(const change of [f=>f.s.chapters[0].content='Changed',f=>f.s.permit.status='revoked',f=>f.s.permit.revision++]){
  const f=await fixture();f.hooks.onRead=n=>{if(n===2)change(f);};assert.equal((await f.run()).code,'source-conflict');
 }
 const f=await fixture();f.hooks.onOperator=n=>n===1;assert.equal((await f.run()).code,'forbidden');
});
test('G1Q request cannot supply payload, license, permit or operator; failures stay private',async()=>{
 for(const extra of [{payload:{}},{license:'original'},{permit:{}},{admin:true}]){
  const f=await fixture();Object.assign(f.input,extra);assert.equal((await f.run()).code,'invalid-request');assert.equal(f.hooks.reads,0);
 }
 const f=await fixture();f.options.readSnapshot=async()=>{throw Error('PRIVATE_FIRESTORE_ERROR');};
 assert.deepEqual(await f.run(),{ok:false,code:'library-source-unavailable'});
});
test('G1Q over-limit source fails without truncation or a registry command',async()=>{
 const f=await fixture();f.s.chapters[0].content='x'.repeat(1024*1024);const r=await f.run();assert.equal(r.ok,false);assert.equal(Object.hasOwn(r,'registryInput'),false);
});
