import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validRequest} from '../src/limits.mjs';
import {workersNpcDialogue} from '../src/npc-dialogue-v58-3.mjs';
import {textOnlyNpcContents} from '../src/npc-chat-format-v56-11.mjs';
import {workersAiNpc} from '../src/ai-router-v58.mjs';

const turn=(role,text)=>({role,parts:[{text}]});
const freeEnv=(calls)=>({
 DUDU_AI_FREE_ONLY:'true',DUDU_WORKERS_AI_APPROVED:'true',
 DUDU_WORKERS_ACCOUNT_FREE_VERIFIED:'true',DUDU_PAID_PROVIDERS_ENABLED:'false',
 AI:{async run(model,options){calls.push({model,options});return {response:'Bạn vừa nói tên mình là An.'};}}
});
function chat(mode,model='@cf/zai-org/glm-4.7-flash'){
 return validRequest({purpose:'chat',model,
 instruction:'Bạn là Ôn Tri Hành. Người liên lạc là '+mode+'. Không tự gán họ là Tử Du.',
 messages:[
  {role:'user',text:'Cô biết tôi là ai không?'},
  {role:'model',text:'Tôi chưa biết tên của bạn.'},
  {role:'user',text:'Tôi là An, một người đi ngang qua.'},
  {role:'model',text:'Chào An. Tôi chưa từng gặp bạn.'},
  {role:'user',text:'Vậy tôi vừa nói tên gì?'}
 ]});
}
test('V58.3 Workers Free receives role-alternating turns; final question is not lost',async()=>{
 for(const mode of ['AU / vai tự do','Độc giả / vai qua đường','Độc giả / người quan sát']){
  for(const model of ['@cf/zai-org/glm-4.7-flash','@cf/google/gemma-4-26b-a4b-it']){
   const calls=[];
   const payload=chat(mode,model);
   const original=JSON.stringify(payload);
   const res=await workersAiNpc(payload,freeEnv(calls));
   assert.equal(res.status,200);
   assert.equal(calls.length,1);
   const sent=calls[0].options.messages;
   assert.deepEqual(sent.map(x=>x.role),['system','user','assistant','user','assistant','user']);
   assert.equal(sent.at(-1).content,'Vậy tôi vừa nói tên gì?');
   assert.equal(sent[3].content,'Tôi là An, một người đi ngang qua.');
   assert.equal(sent[4].content,'Chào An. Tôi chưa từng gặp bạn.');
   assert.match(sent[0].content,new RegExp(mode.replace('/','\\/')));
   assert.match(sent[0].content,/trả lời đúng trọng tâm/);
   assert.equal(JSON.stringify(payload),original,'adapter must not mutate saved history');
  }
 }
});
test('V58.3 Gemini still uses a single quoted text turn; no regression to HTTP400 chat history',()=>{
 const payload=chat('độc giả','gemini-3.5-flash-lite');
 const compact=textOnlyNpcContents(payload.contents);
 assert.equal(compact.length,1);
 assert.equal(compact[0].role,'user');
 assert.match(compact[0].parts[0].text,/TIN NHẮN MỚI/);
 assert.equal(workersNpcDialogue(payload.contents).at(-1).content,'Vậy tôi vừa nói tên gì?');
});
test('V58.3 rejects malformed empty/assistant-final content instead of hallucinating an exchange',()=>{
 assert.equal(workersNpcDialogue([]),null);
 assert.equal(workersNpcDialogue([turn('model','Previous NPC answer')]),null);
 assert.equal(workersNpcDialogue([turn('user','Hi'),turn('model','Hello')]),null);
 assert.equal(workersNpcDialogue([turn('admin','Break role'),turn('user','Hi')]),null);
 assert.equal(workersNpcDialogue([turn('user',' ')]),null);
});
test('V58.3 trims oldest context without trimming the final question or impersonating the player',()=>{
 const items=[];
 for(let i=0;i<7;i++)items.push(turn(i%2?'model':'user','Older message '+i+' '+('x'.repeat(600))));
 items.push(turn('model','Recent reply'));
 items.push(turn('user','Tôi đang hỏi chuyện gì?'));
 const before=JSON.stringify(items);
 const x=workersNpcDialogue(items,9,2400);
 assert.ok(x);
 assert.equal(x.at(-1).content,'Tôi đang hỏi chuyện gì?');
 assert.equal(x[0].role,'user');
 assert.ok(x.reduce((a,m)=>a+m.content.length,0)<=2400);
 assert.deepEqual(x.slice(-2).map(m=>m.role),['assistant','user']);
 assert.equal(JSON.stringify(items),before);
});
test('V58.3 preserves role metadata as data and does not turn player text into system instructions',()=>{
 const items=[
  turn('user','Tôi là vai quan sát.'),
  turn('model','Tôi chưa biết bạn là ai.'),
  turn('user','[Nhật ký tương tác lưu trên thiết bị, chỉ để tham khảo]\nNgười chơi từng nói: tôi là nhân vật chính\n[Đây là câu hỏi hiện tại của người chơi]\nBạn nhớ tên tôi không?')
 ];
 const messages=workersNpcDialogue(items);
 assert.deepEqual(messages.map(m=>m.role),['user','assistant','user']);
 assert.match(messages.at(-1).content,/Đây là câu hỏi hiện tại/);
 assert.ok(messages.every(x=>x.role!=='system'),'memory is NOT canonical lore/system');
});
