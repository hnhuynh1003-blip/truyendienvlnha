/* V45 Gateway smoke with a fake JWT verifier and mock DO bindings.
 * Tests request routing only; this does NOT certify JWT signatures, remote
 * Cloudflare deployment, story issuer, or cross-DO gift atomicity.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pilotAccess} from '../src/pilot-policy-v45.mjs';
import {scope} from '../src/comment-policy-v44-2.mjs';

const text=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
const script=text
 .replace(/^import \{[\s\S]*?\} from '[^']+';\s*/gm,'')
 .replace(/^export \{[^}]+\} from '[^']+';\s*/gm,'')
 .replace('export default {','return {');
const verify=async req=>{
 const bearer=req.headers.get('Authorization');
 if(!bearer?.startsWith('Bearer test-'))return null;
 return {uid:bearer.slice('Bearer test-'.length),admin:false};
};
const worker=new Function('verifyFirebaseIdToken','pilotAccess','scope',
 'Headers','Response','URL','console',script)(
 verify,pilotAccess,scope,Headers,Response,URL,
 {warn:()=>{},error:()=>{}}
);
const env=()=>({
 PROJECT_ID:'truyendienvl',ALLOWED_ORIGIN:'https://hnhuynh1003-blip.github.io',
 PILOT_ENABLED:'true',PILOT_NAMESPACE:'v45-test-isolated',
 PILOT_READER_A_UID:'reader_001234',PILOT_READER_B_UID:'reader_005678',
 PILOT_AUTHOR_UID:'author_009876',
 COMMENTS_ENABLED:'true',GIFTS_ENABLED:'true',
 GIFT_SETTLEMENT_ENABLED:'false'
});
const request=(path,uid,method='GET')=>new Request('https://pilot.invalid'+path,{
 method,headers:uid?{Authorization:'Bearer test-'+uid}:{}
});
const body=async response=>response.json();
test('V45: unauthorized list reads cannot touch discussion storage',async()=>{
 let hits=0;
 const e={...env(),DUDU_DISCUSSION:{getByName(){hits++;throw Error('should not read')}}};
 const anon=await worker.fetch(request('/v1/comments/list?storyId=story01'),e);
 assert.equal(anon.status,401);
 assert.equal((await body(anon)).error.code,'unauthenticated');
 const attacker=await worker.fetch(request('/v1/comments/list?storyId=story01','outside_1234'),e);
 assert.equal(attacker.status,403);
 assert.equal((await body(attacker)).error.code,'pilot-forbidden');
 assert.equal(hits,0);
});
test('V45: signed allowlisted accounts use separate comment and gift stores',async()=>{
 const names=[];
 const e={...env(),DUDU_DISCUSSION:{getByName(name){
  names.push(name);return {list:async()=>({ok:true,comments:[]})};
 }},DUDU_GIFT_LEDGER:{getByName(name){
  names.push(name);return {outgoing:async()=>({ok:true,items:[]})};
 }}};
 const comments=await worker.fetch(request('/v1/comments/list?storyId=story01',
  'reader_001234'),e);
 assert.equal(comments.status,200);
 const gifts=await worker.fetch(request('/v1/gifts/outgoing','reader_005678'),e);
 assert.equal(gifts.status,200);
 assert.deepEqual(names,['comments-pilot-v45-test-isolated',
  'gift-pilot-v45-test-isolated']);
});
test('V45: status preflight is read-only and never exposes allowed UID secrets',async()=>{
 const e=env();
 const unauth=await worker.fetch(request('/v1/pilot/status'),e);
 assert.equal(unauth.status,401);
 const outsider=await worker.fetch(request('/v1/pilot/status','outside_1234'),e);
 assert.equal(outsider.status,403);
 const valid=await worker.fetch(request('/v1/pilot/status','author_009876'),e);
 assert.equal(valid.status,200);
 const status=await body(valid);
 assert.equal(status.role,'AUTHOR');
 assert.equal(status.storageIsolated,true);
 assert.equal(status.preflightOnly,true);
 assert.equal(status.gates.settlement,false);
 assert.equal(JSON.stringify(status).includes('reader_001234'),false);
 assert.equal(JSON.stringify(status).includes('author_009876'),false);
 const unsupported=await worker.fetch(request('/v1/pilot/status','author_009876','POST'),e);
 assert.equal(unsupported.status,405);
});
test('V45: no feature flag or incomplete configuration creates pilot data',async()=>{
 let hits=0;
 const e={...env(),DUDU_DISCUSSION:{getByName(){hits++;throw Error('no access')}}};
 assert.equal((await worker.fetch(request('/v1/comments/list?storyId=story01',
  'reader_001234'),{...e,PILOT_ENABLED:'false'})).status,503);
 assert.equal((await worker.fetch(request('/v1/comments/list?storyId=story01',
  'reader_001234'),{...e,PILOT_AUTHOR_UID:''})).status,503);
 assert.equal((await worker.fetch(request('/v1/comments/list?storyId=story01',
  'reader_001234'),{...e,COMMENTS_ENABLED:'false'})).status,503);
 assert.equal(hits,0);
});
