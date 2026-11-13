const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

test('V72 blueprint: exactly 100, split 90/10, individual perks, no live issuance',async()=>{
 const src=await import(pathToFileURL(path.resolve(__dirname,'../cloudflare/src/dudu-system-pool100-plan.mjs')).href);
 // A deterministic but non-monotonic test picker; not used for a live pool.
 let n=0;
 const plan=src.buildPoolBlueprint(max=>(n++*37+13)%max);
 assert.equal(plan.length,100);
 assert.equal(plan.filter(x=>x.origin==='regular').length,90);
 assert.equal(plan.filter(x=>x.origin==='irregular').length,10);
 assert.equal(new Set(plan.map(x=>x.systemNum)).size,100);
 assert.equal(new Set(plan.map(x=>x.perkKey)).size,100);
 assert.equal(src.validatePoolBlueprint(plan),true);
 assert.ok(plan.every(x=>x.status==='editorial-only'));
 assert.equal(plan.some(x=>Object.hasOwn(x,'hostUid')||Object.hasOwn(x,'rewards')||
   Object.hasOwn(x,'expGrant')),false);
});
test('V72 blueprint refuses skewed ratio and invalid random index',async()=>{
 const src=await import(pathToFileURL(path.resolve(__dirname,'../cloudflare/src/dudu-system-pool100-plan.mjs')).href);
 assert.throws(()=>src.buildPoolBlueprint(max=>max),/invalid random index/);
 const plan=src.buildPoolBlueprint(()=>0);
 const mutated=plan.map(x=>({...x}));
 mutated[0].origin=mutated[0].origin==='regular'?'irregular':'regular';
 assert.equal(src.validatePoolBlueprint(mutated),false);
});
