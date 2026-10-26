import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {parseDraft,inspectContent} from '../../js/vangioi-creator-validation-entry.mjs';
import {content} from './fixtures/vangioi-content.mjs';

test('G1G UI uses shared partial schema without granting rank, publish or owner metadata',()=>{
 const r=parseDraft(JSON.stringify({schemaVersion:'world-content-1',requestedWorldRank:'S',story:{}}));
 assert.equal(r.ok,true);assert.equal(r.content.requestedWorldRank,'S');
 for(const extra of [{ownerUid:'forged'},{officialWorldRank:'S'},{status:'approved'},{aiPolicy:{allowAiRewards:true}}])
  assert.equal(parseDraft(JSON.stringify({schemaVersion:'world-content-1',...extra})).ok,false);
});
test('G1G raw file parser rejects malformed or unsupported JSON and oversized files',()=>{
 for(const value of ['{','null','[]','{"schemaVersion":"world-authoring-0.1"}','{"schemaVersion":"world-content-1","title":42}',
  '{"schemaVersion":"world-content-1","__proto__":{}}'])assert.equal(parseDraft(value).ok,false);
 assert.equal(parseDraft(' '.repeat(2*1024*1024+1)).code,'file-limit');
});
test('G1G required-field errors identify missing fields without returning story prose',()=>{
 const result=inspectContent({schemaVersion:'world-content-1',story:{secretTruth:'PRIVATE_CREATOR_TEXT'}});
 assert.equal(result.valid,false);assert.equal(result.errors.some(e=>e.path==='/storySource'),true);
 assert.equal(JSON.stringify(result).includes('PRIVATE_CREATOR_TEXT'),false);
});
test('G1G complete draft validates structurally and preserves hidden/future sections on import',()=>{
 const c=content(),r=parseDraft(JSON.stringify(c));assert.equal(r.ok,true);assert.deepEqual(r.content,c);
 assert.equal(inspectContent(r.content).valid,true);assert.equal('canPublish' in r,false);
});
test('G1G checked-in browser bundle reproduces and does not include SQL/auth/network writers',()=>{
 execFileSync(process.execPath,[new URL('../scripts/build-vangioi-creator.mjs',import.meta.url).pathname,'--check']);
 const text=readFileSync(new URL('../../js/vangioi-creator-validation.js',import.meta.url),'utf8');
 for(const forbidden of ['vg_authoring_','verifyFirebaseIdToken','new Function(','fetch(','createSqlRegistryService'])assert.equal(text.includes(forbidden),false,forbidden);
});
