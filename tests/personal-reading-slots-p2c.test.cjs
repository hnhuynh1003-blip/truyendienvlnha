const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,queue}=require('../js/personal-reading-slots-p2c.js');
const policy=require('../js/personal-reading-policy-p2c.js');
const fs=require('node:fs');
const path=require('node:path');
test('policy remains disabled; no default live rate and legacy first-open gate retained',()=>{
 assert.equal(policy.enabled(),false);assert.equal(policy.policy,null);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/if\(!window\.DuduReadingRewardBridgeP2C\?\.enabled\(\)\)void personalProgressActionC23\('read'/);
 assert.match(html,/policy:DuduPersonalReadingPolicyP2C\.policy,slots/);
});
test('only full contiguous observed aligned slots are emitted; hidden gap and wall rollback drop partial',()=>{
 const c=create();let out=[];
 for(let i=0;i<=25;i++)out.push(...c.observe({wall:100000+i*1000,mono:i*1000,observed:i*1000,active:true}));
 assert.deepEqual(out,[100000,110000]);
 c.reset();out=[];
 for(let i=0;i<=8;i++)out.push(...c.observe({wall:130000+i*1000,mono:30000+i*1000,observed:i*1000,active:true}));
 c.observe({wall:139000,mono:39000,observed:8000,active:false});
 assert.deepEqual(c.observe({wall:140000,mono:40000,observed:9000,active:true}),[]);
 assert.deepEqual(c.observe({wall:130000,mono:41000,observed:10000,active:true}),[]);
 assert.deepEqual(out,[]);
});
test('bounded queue deduplicates pending slots, retries same ticket and isolates account switches',()=>{
 const q=queue();q.bind('a');const slots=Array.from({length:6},(_,i)=>100000+i*10000);
 q.push('a',slots);q.push('a',slots);assert.equal(q.size(),6);
 const a=q.begin('a',{now:200000});assert.deepEqual(a.slots,slots);
 assert.equal(q.begin('a',{now:200000}),null);q.settle(a,false);
 const b=q.begin('a',{now:200000});assert.deepEqual(b.slots,slots);
 q.bind('b');assert.equal(q.settle(b,true),false);assert.equal(q.size(),0);
 assert.equal(q.push('a',slots),false);q.push('b',slots);
 const c=q.begin('b',{now:200000});assert.equal(q.settle(c,true),true);assert.equal(q.size(),0);
});
