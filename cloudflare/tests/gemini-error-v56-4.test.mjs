import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
test('V56.4 differentiates upstream key access, model absence and quota',()=>{
 for(const code of ['invalid-upstream-request','gemini-access-denied','model-unavailable','gemini-rate-limit','gemini-overloaded']){
  assert.ok(worker.includes(code),'missing '+code);
 }
 assert.match(worker,/response\.status===401\|\|response\.status===403/);
 assert.match(worker,/response\.status===404\?'model-unavailable'/);
 assert.match(worker,/response\.status===429\?'gemini-rate-limit'/);
 assert.match(worker,/response\.status===503\?'gemini-overloaded'/);
 assert.doesNotMatch(worker,/unavailable=\[400,403,404\]/);
});
