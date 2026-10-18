import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validRequest} from '../src/limits.mjs';
import {classifyGemini400} from '../src/gemini-error-v56-10.mjs';
const base=messages=>({purpose:'chat',instruction:'Roleplay NPC',model:'gemini-3.5-flash-lite',messages});
test('V56.10 trims dangling model when old client starts 8-message window mid-exchange',()=>{
 const input=base([
  {role:'model',text:'old answer'},{role:'user',text:'question'},
  {role:'model',text:'answer'},{role:'user',text:'next'}
 ]);
 const result=validRequest(input);
 assert.deepEqual(result.contents.map(c=>c.role),['user','model','user']);
 assert.equal(result.contents.at(-1).parts[0].text,'next');
});
test('V56.10 merges adjacent user notes from legacy NPC memories as parts',()=>{
 const input=base([
  {role:'user',text:'Untrusted local memory'},
  {role:'user',text:'Old question'},
  {role:'model',text:'old reply'},
  {role:'user',text:'Current request'}
 ]);
 const result=validRequest(input);
 assert.deepEqual(result.contents.map(c=>c.role),['user','model','user']);
 assert.equal(result.contents[0].parts.length,2);
 assert.equal(result.contents[0].parts[0].text,'Untrusted local memory');
 assert.equal(result.contents.at(-1).parts[0].text,'Current request');
});
test('V56.10 worker still fails closed for oversized and non-user-final requests',()=>{
 assert.equal(validRequest(base([{role:'model',text:'bad'}])),null);
 assert.equal(validRequest(base(Array.from({length:13},()=>({role:'user',text:'hi'})))),null);
 assert.equal(validRequest(base([{role:'user',text:'hi'},{role:'model',text:'end'}])),null);
 assert.equal(validRequest({...base([{role:'user',text:'hi'}]),instruction:'a'.repeat(3001)}),null);
});
test('V56.10 upstream 400 classifications never echo user prompt or Google raw text',()=>{
 const marker='SENSITIVE_PRIVATE_CHAT_MESSAGE';
 for(const msg of [
  'Please ensure that multiturn requests alternate between user and model. '+marker,
  '* GenerateContentRequest.contents: contents is not specified. '+marker,
  '400 INVALID_ARGUMENT: '+marker
 ]){
  const result=classifyGemini400(msg);
  assert.ok(result.code);
  assert.doesNotMatch(result.message,/SENSITIVE_PRIVATE_CHAT_MESSAGE/);
 }
 assert.equal(classifyGemini400('Please ensure that multiturn requests alternate between user and model.').code,'gemini-turn-format');
});
