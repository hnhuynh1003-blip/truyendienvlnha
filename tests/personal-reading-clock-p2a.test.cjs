const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../js/personal-reading-clock-p2a.js');
const ctx={uid:'a',storyId:'book',chapterId:'1',mode:'WEB',revision:'r1'};
const sample=(clock,at,patch={})=>clock.sample({at,uid:'a',readerOpen:true,visible:true,focused:true,online:true,...patch});
test('chapter opening alone awards nothing; recent input permits monotonic observation',()=>{
 const c=model.create();c.open(ctx,0);sample(c,1000);sample(c,2000);assert.equal(c.snapshot().observedMs,0);
 c.activity(2000);sample(c,3000);sample(c,4000);assert.equal(c.snapshot().observedMs,1000);
 assert.equal(c.snapshot().awardExp,0);assert.equal(c.snapshot().awardTuVi,0);
});
test('hidden, unfocused, offline and inactive windows pause without catch-up',()=>{
 const c=model.create({idleMs:2500});c.open(ctx,0);c.activity(0);sample(c,1000);sample(c,2000);
 sample(c,3000,{visible:false});sample(c,4000);assert.equal(c.snapshot().observedMs,1000);
 c.activity(4000);sample(c,5000);sample(c,6000);sample(c,7000);assert.equal(c.snapshot().observedMs,2000);
 sample(c,8000,{focused:false});sample(c,9000,{online:false});sample(c,10000);
 assert.equal(c.snapshot().observedMs,2000);
});
test('R2 and Web share observation; account switch, close, long suspension and rollback do not credit',()=>{
 const c=model.create();c.open(ctx,0);c.activity(0);sample(c,1000);sample(c,2000);
 c.open({...ctx,chapterId:'2',mode:'EPUB_R2'},2000);assert.equal(c.snapshot().chapterMs,0);
 c.activity(2000);sample(c,3000);sample(c,10000);assert.equal(c.snapshot().observedMs,1000);
 sample(c,9000);sample(c,10000);assert.equal(c.snapshot().observedMs,1000);
 sample(c,11000,{uid:'b'});assert.equal(c.snapshot().context,null);assert.equal(c.snapshot().observedMs,0);
 c.open({...ctx,uid:'b'},12000);c.close();assert.equal(c.snapshot().context,null);
});
test('quote requires explicit policy and carries partial units without live issuance',()=>{
 assert.throws(()=>model.quote({observedMs:60000}),/explicit-policy/);
 assert.deepEqual(model.quote({observedMs:90000,unitMs:60000,expPerUnit:2,remainderMs:0}),
 {units:1,exp:2,remainderMs:30000,simulation:true});
 assert.equal(model.quote({observedMs:30000,unitMs:60000,expPerUnit:2,remainderMs:30000}).exp,2);
});
