import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validRequest} from '../src/limits.mjs';
import {textOnlyNpcContents} from '../src/npc-chat-format-v56-11.mjs';
import {classifyGemini400} from '../src/gemini-error-v56-10.mjs';

test('V57.1 AU and reader both use the same validated NPC request',()=>{
 for(const roleName of ['AU kiểm tra vai B','Độc giả kiểm tra vai C']){
  const original={purpose:'chat',model:'gemini-3.5-flash-lite',
    instruction:'NPC nhắn với '+roleName+'; không tự nhận nhầm danh tính.',
    messages:[{role:'user',text:'Xin chào, tôi là '+roleName}]};
  const author=validRequest(original,true);
  const reader=validRequest(original,false);
  assert.deepEqual(reader,author,'chat privilege must not change payload or identity');
  assert.match(reader.systemInstruction.parts[0].text,new RegExp(roleName));
  assert.equal(textOnlyNpcContents(reader.contents).length,1);
  assert.equal(textOnlyNpcContents(reader.contents)[0].role,'user');
  assert.equal(validRequest({...original,purpose:'assist'},false),null);
  assert.ok(validRequest({...original,purpose:'assist'},true));
 }
});
test('V57.1 safe HTTP 400 categories never echo upstream details',()=>{
 const cases=[
  ['API key not valid. Please pass a valid API key: hidden-key','gemini-invalid-key'],
  ['Unknown name "temperature" at generationConfig','gemini-invalid-parameters'],
  ['model example does not support generateContent','gemini-model-request'],
  ['multiturn requests need alternate user and model','gemini-turn-format'],
  ['contents is empty, parts required','gemini-content-format'],
  ['too many tokens in context window','gemini-context-limit'],
  ['unrecognized invalid argument: private-chat-content','invalid-upstream-request']
 ];
 for(const [raw,expected] of cases){
  const classified=classifyGemini400(raw);
  assert.equal(classified.code,expected);
  assert.equal(classified.message.includes(raw),false);
  assert.equal(classified.message.includes('hidden-key'),false);
  assert.equal(classified.message.includes('private-chat-content'),false);
 }
});
test('V57.1 never forwards malformed historical model turns to Gemini',()=>{
 const source=fs.readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.match(source,/const npcContents=payload\.purpose==='chat'\?textOnlyNpcContents\(payload\.contents\):null/);
 assert.match(source,/if\(payload\.purpose==='chat'&&!npcContents\)/);
 assert.match(source,/contents:payload\.purpose==='chat'\?npcContents:payload\.contents/);
 assert.doesNotMatch(source,/textOnlyNpcContents\(payload\.contents\)\s*\|\|\s*payload\.contents/);
 assert.match(source,/if\(result\.error\)return json\(\{error:result\.error\}/,'Do not generate a fake model reply after an error');
});
