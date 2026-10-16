import {test} from 'node:test';
import assert from 'node:assert/strict';
import {USER_DAILY_LIMIT,GLOBAL_DAILY_LIMIT,MIN_INTERVAL_MS,validRequest,quotaFailure,utcDay} from '../src/limits.mjs';

test('UTC day rollover and fixed limits',()=>{
  assert.equal(utcDay(Date.parse('2026-10-15T23:59:00Z')),'2026-10-15');
  assert.equal(utcDay(Date.parse('2026-10-16T00:00:00Z')),'2026-10-16');
  assert.equal(USER_DAILY_LIMIT,25);
  assert.equal(GLOBAL_DAILY_LIMIT,200);
  assert.equal(MIN_INTERVAL_MS,10000);
});
test('server validates chat schema and prevents unconstrained prompts',()=>{
  const input={purpose:'chat',instruction:'Nhập vai nhân vật',messages:[{role:'user',text:'Xin chào'}]};
  assert.equal(validRequest(input,false)?.contents[0].role,'user');
  assert.equal(validRequest({...input,purpose:'assist'},false),null,'Readers cannot invoke author assist');
  assert.ok(validRequest({...input,purpose:'assist'},true),'Admin may use author assist');
  assert.equal(validRequest({...input,instruction:'x'.repeat(3001)},false),null);
  assert.equal(validRequest({...input,messages:[{role:'user',text:'x'.repeat(12001)}]},false),null);
  assert.equal(validRequest({...input,messages:[{role:'model',text:'hi'}]},false),null);
  assert.equal(validRequest({...input,messages:Array(13).fill({role:'user',text:'hi'})},false),null);
  assert.equal(validRequest({purpose:'chat',instruction:'a',messages:[]},false),null);
});
test('global, per-user, cooldown and in-flight quota are separate',()=>{
  const now=Date.now(),empty={calls:0,last_at:now-100000,active_until:0};
  assert.equal(quotaFailure({calls:USER_DAILY_LIMIT},{calls:0},now),'daily-user');
  assert.equal(quotaFailure(empty,{calls:GLOBAL_DAILY_LIMIT},now),'daily-global');
  assert.equal(quotaFailure({...empty,active_until:now+1000},{calls:0},now),'in-flight');
  assert.equal(quotaFailure({...empty,last_at:now-100},{calls:0},now),'cooldown');
  assert.equal(quotaFailure(empty,{calls:0},now),null);
});
test('request limits do not accept client-provided identity or custom model',()=>{
  const input={purpose:'chat',instruction:'a',messages:[{role:'user',text:'b'}],
    uid:'forged-user',model:'expensive-model'};
  const parsed=validRequest(input);
  assert.ok(parsed);
  assert.equal(parsed.uid,undefined);
  assert.equal(parsed.model,undefined);
  assert.equal(parsed.contents[0].parts[0].text,'b');
});
