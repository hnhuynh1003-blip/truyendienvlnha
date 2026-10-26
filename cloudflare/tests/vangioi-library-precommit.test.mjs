import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hashAuthoringJson} from '../src/vangioi-authoring.mjs';
import {createV49PrecommitRecheck} from '../src/vangioi-library-precommit.mjs';

const REQUEST=new Request('https://offline.test/');
async function plan(){
 const payload={format:'story-source-1',title:'Synthetic source',chapters:[{
  chapterId:'chapter-one',title:'First',text:'PRIVATE_SOURCE_TEXT'}]};
 const hash=await hashAuthoringJson(payload),storyId='epub-synthetic';
 return {ok:true,reference:{kind:'library',storyId,storyVersion:'sha256-'+hash,contentHash:hash},permitRevision:1,
  registryInput:{requestId:'123e4567-e89b-42d3-a456-426614174001',kind:'library',storyId,
   storyVersion:'sha256-'+hash,authorizedUid:'book-owner',license:'licensed',
   sourceNote:'Private evidence reviewed',proofRef:'PRIVATE_PROOF',payload}};
}

test('G1V precommit rejects forged plan and avoids all trusted callbacks',async()=>{
 const p=await plan();let reads=0,writes=0;
 const guard=createV49PrecommitRecheck({prepare:async()=>{reads++;return p;},
  registerSource:async()=>{writes++;return {ok:true};}});
 for(const forged of [{...p,reference:{...p.reference,contentHash:'f'.repeat(64)}},
  {...p,registryInput:{...p.registryInput,payload:{...p.registryInput.payload,title:'Tampered'}}},
  {...p,grantStatus:'approved'}]){
  assert.equal((await guard(REQUEST,forged)).code,'invalid-plan');
 }
 assert.equal(reads,0);assert.equal(writes,0);
 assert.throws(()=>createV49PrecommitRecheck({prepare:()=>{}}),TypeError);
});

test('G1V changed permit rights/revision on fresh trusted plan prevents registry write',async()=>{
 const p=await plan();let writes=0;
 const guard=createV49PrecommitRecheck({prepare:async()=>({...p,permitRevision:2}),
  registerSource:async()=>{writes++;return {ok:true};}});
 assert.equal((await guard(REQUEST,p)).code,'source-conflict');assert.equal(writes,0);
});

test('G1V failed recheck never falls back to unguarded registration',async()=>{
 const p=await plan();let writes=0;
 const guard=createV49PrecommitRecheck({prepare:async()=>({ok:false,code:'forbidden'}),
  registerSource:async()=>{writes++;return {ok:true};}});
 assert.equal((await guard(REQUEST,p)).code,'forbidden');assert.equal(writes,0);
 const unreachable=createV49PrecommitRecheck({prepare:async()=>{throw Error('PRIVATE_FIRESTORE_ERROR');},
  registerSource:async()=>{writes++;return {ok:true};}});
 assert.equal((await unreachable(REQUEST,p)).code,'source-unavailable');assert.equal(writes,0);
 assert.equal(JSON.stringify(await unreachable(REQUEST,p)).includes('PRIVATE_'),false);
});

test('G1V registry is still the final authority and late registry failures are not converted to success',async()=>{
 const p=await plan();const calls=[];
 const guard=createV49PrecommitRecheck({prepare:async(_r,input)=>{calls.push(input);return p;},
  registerSource:async()=>({ok:false,code:'forbidden'})});
 assert.equal((await guard(REQUEST,p)).code,'forbidden');
 assert.deepEqual(calls[0],{requestId:p.registryInput.requestId,storyId:p.reference.storyId,
  authorizedUid:p.registryInput.authorizedUid});
});

test('G1V rehearsal and precommit recheck remain outside public Worker and authoring HTTP wiring',()=>{
 for(const pathname of ['../src/index.mjs','../src/vangioi-authoring-http.mjs']){
  const source=readFileSync(new URL(pathname,import.meta.url),'utf8');
  assert.equal(source.includes('vangioi-permit-replay'),false);
  assert.equal(source.includes('vangioi-library-precommit'),false);
 }
});
