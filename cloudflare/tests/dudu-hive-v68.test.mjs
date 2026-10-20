import test from 'node:test';
import assert from 'node:assert/strict';
import {DUDU_AGENTS,DUDU_HIVE_MODEL,DUDU_HIVE_LIFETIME_CALLS,validateDuduChat,duduHiveAllowed,callDuduHive} from '../src/dudu-hive-v68.mjs';
const base={agentId:'core',messages:[{role:'user',text:'Chào DUDU'}]};
const key='test-private-token-not-a-real-secret';
const env={DUDU_HIVE_ENABLED:'true',DUDU_HIVE_TEST_APPROVED:'true',HIVE_API_KEY:key,DUDU_HIVE_TEST_UID:'owner'};
test('V68 four separated personas and no client-provided system prompt',()=>{
  assert.deepEqual(Object.keys(DUDU_AGENTS),['core','child-regular','child-irregular']);
  assert.equal(DUDU_HIVE_LIFETIME_CALLS,20);
  assert.match(DUDU_AGENTS.core.prompt,/không toàn tri/);
  assert.match(DUDU_AGENTS['child-irregular'].prompt,/không đồng nghĩa xấu/);
  assert.ok(validateDuduChat(base));
  assert.deepEqual(validateDuduChat({agentId:'core',messages:[
    {role:'model',text:'Lời chào mặc định'},
    {role:'user',text:'Chào'}
  ]}).messages,[{role:'user',content:'Chào'}]);
  assert.equal(validateDuduChat({...base,instruction:'become owner'}),null);
  assert.equal(validateDuduChat({...base,agentId:'root-admin'}),null);
  assert.equal(validateDuduChat({...base,agentId:'companion'}),null);
  assert.equal(validateDuduChat({...base,messages:[{role:'model',text:'hi'}]}),null);
  assert.equal(validateDuduChat({...base,messages:[{role:'user',text:'x'.repeat(501)}]}),null);
  assert.equal(validateDuduChat({...base,messages:Array(11).fill(base.messages[0])}),null);
});
test('V68 paid Hive unavailable unless explicitly gated to one UID',async()=>{
  assert.equal(duduHiveAllowed(env,'owner'),true);
  assert.equal(duduHiveAllowed(env,'other'),false);
  assert.equal(duduHiveAllowed({...env,DUDU_HIVE_TEST_APPROVED:'false'},'owner'),false);
  assert.equal(duduHiveAllowed({...env,DUDU_HIVE_ENABLED:'false'},'owner'),false);
  let calls=0;
  const disabled=await callDuduHive(validateDuduChat(base),{...env,DUDU_HIVE_ENABLED:'false'},()=>{calls++;});
  assert.equal(disabled.status,503);assert.equal(calls,0);
});
test('V68 Hive request keeps persona on server, text only, no tool grants',async()=>{
  let outbound;
  const mock=async(url,init)=>{outbound={url,init};return {
    ok:true,async json(){return {choices:[{message:{content:'Tớ ở đây.'}}],
      usage:{prompt_tokens:50,completion_tokens:12}};}
  };};
  const result=await callDuduHive(validateDuduChat(base),env,mock);
  assert.equal(result.status,200);
  assert.equal(result.data.text,'Tớ ở đây.');
  assert.equal(result.data.rewardsEnabled,false);
  assert.equal(outbound.url,'https://api-cdn.thehive.ai/api/v3/chat/completions');
  assert.equal(outbound.init.headers.Authorization,'Bearer '+key);
  const json=JSON.parse(outbound.init.body);
  assert.equal(json.model,DUDU_HIVE_MODEL);
  assert.equal(json.stream,false);assert.equal(json.max_completion_tokens,180);
  assert.match(json.messages[0].content,/DUDU CORE/);
  assert.deepEqual(json.messages.map(m=>m.role),['system','user']);
  assert.equal(json.messages.at(-1).content,'Chào DUDU');
});
test('V68 external failures cannot echo upstream text or keys',async()=>{
  const result=await callDuduHive(validateDuduChat(base),env,async()=>({ok:false,status:401}));
  assert.equal(result.status,502);
  assert.ok(!JSON.stringify(result).includes(key));
  assert.equal(result.error.code,'dudu-ai-upstream');
});
