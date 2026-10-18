import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {textOnlyNpcContents} from '../src/npc-chat-format-v56-11.mjs';
import {validRequest} from '../src/limits.mjs';
import {resolveModel,NPC_MODELS} from '../src/npc-models.mjs';
const base=messages=>({purpose:'chat',instruction:'Bạn là một nhân vật trong truyện.',model:'gemini-3.5-flash-lite',messages});
test('V56.11 Gemini receives just one user part even after multiple NPC turns',()=>{
 const messages=[];
 for(let i=0;i<9;i++){
   messages.push({role:'user',text:'Câu hỏi của độc giả '+i});
   if(i<8)messages.push({role:'model',text:'Lời đáp của NPC '+i});
 }
 const recent=messages.slice(-12);
 const verified=validRequest(base(recent));
 assert.ok(verified);
 const compact=textOnlyNpcContents(verified.contents);
 assert.equal(compact.length,1);
 assert.equal(compact[0].role,'user');
 assert.equal(compact[0].parts.length,1);
 assert.match(compact[0].parts[0].text,/Câu hỏi của độc giả 8/);
 assert.ok(compact[0].parts[0].text.length<=10500);
});
test('V56.11 preserves saved prior dialogue unaltered while treating prior answers as quotations',()=>{
 const original=[
  {role:'user',parts:[{text:'Bắt đầu'}]},
  {role:'model',parts:[{text:'Xin chào'}]},
  {role:'user',parts:[{text:'Alo'}]}
 ];
 const before=JSON.stringify(original);
 const compact=textOnlyNpcContents(original);
 assert.equal(JSON.stringify(original),before);
 assert.match(compact[0].parts[0].text,/NPC từng trả lời: Xin chào/);
 assert.match(compact[0].parts[0].text,/TIN NHẮN MỚI.*Alo/s);
});
test('V56.11 sends current message intact when prior context is too long',()=>{
 const contents=[];
 for(let i=0;i<9;i++)contents.push({role:i%2===0?'user':'model',parts:[{text:'x'.repeat(700)}]});
 contents.push({role:'user',parts:[{text:'Câu hỏi thật cuối cùng'}]});
 const text=textOnlyNpcContents(contents,2500)[0].parts[0].text;
 assert.ok(text.length<=2500);
 assert.ok(text.endsWith('Câu hỏi thật cuối cùng'));
});
test('V56.11 model server allowlist remains strictly seven IDs, Auto cannot reach Gemini',()=>{
 assert.equal(NPC_MODELS.length,7);
 assert.equal(resolveModel('auto'),null);
 assert.equal(validRequest(base([{role:'user',text:'Xin chào'}]))?.model,'gemini-3.5-flash-lite');
 assert.equal(validRequest({...base([{role:'user',text:'Xin chào'}]),model:'auto'}),null);
});
test('V56.11 invalid final model turn cannot be submitted',()=>{
 assert.equal(textOnlyNpcContents([{role:'model',parts:[{text:'Chào'}]}]),null);
});

test('V56.11 production Worker compacts NPC chat and does not override deprecated Gemini sampling values',()=>{
 const worker=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
 assert.match(worker,/textOnlyNpcContents\(payload\.contents\)/);
 assert.doesNotMatch(worker,/temperature:payload\.purpose/);
});
