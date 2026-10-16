const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MAX_USER_DAILY,MAX_GLOBAL_DAILY,MIN_INTERVAL_MS,dayUTC,validateRequest,quotaFailure}=require('../lib/ai-limits');
test('UTC rollover stays deterministic',()=>{
  assert.equal(dayUTC(Date.parse('2026-10-15T23:59:59Z')),'2026-10-15');
  assert.equal(dayUTC(Date.parse('2026-10-16T00:00:00Z')),'2026-10-16');
});
test('server rejects malformed, excess content and non-user final turn',()=>{
  const base={purpose:'chat',instruction:'stay in character',messages:[{role:'user',text:'hi'}]};
  assert.ok(validateRequest(base));
  assert.equal(validateRequest({...base,instruction:'a'.repeat(3001)}),null);
  assert.equal(validateRequest({...base,messages:[{role:'model',text:'hi'}]}),null);
  assert.equal(validateRequest({...base,messages:[{role:'user',text:'a'.repeat(12001)}]}),null);
  assert.equal(validateRequest({...base,purpose:'admin-override'}),null);
  assert.deepEqual(validateRequest(base).contents,[{role:'user',parts:[{text:'hi'}]}]);
});
test('quota rejects daily abuse, in-flight parallel requests and rapid spam',()=>{
  const now=Date.now();
  assert.equal(quotaFailure({calls:MAX_USER_DAILY},{calls:0},now),'daily-user');
  assert.equal(quotaFailure({calls:0},{calls:MAX_GLOBAL_DAILY},now),'daily-global');
  assert.equal(quotaFailure({activeUntil:now+5000},{calls:0},now),'in-flight');
  assert.equal(quotaFailure({lastAt:now-MIN_INTERVAL_MS+1},{calls:0},now),'cooldown');
  assert.equal(quotaFailure({calls:0,lastAt:now-100000,activeUntil:0},{calls:0},now),null);
});
