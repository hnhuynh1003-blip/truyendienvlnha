const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
test('R2 scripts load in dependency order in preview branch',()=>{
 const a=html.indexOf('src="js/npc-relationship-v2-r1.js"');
 const b=html.indexOf('src="js/npc-gift-v2-r2.js"');
 assert.ok(a>0&&b>a);
});
test('R2 Sandbox behavior remains, while real accounts use the new transaction',()=>{
 const start=html.indexOf('async function executeGiftItem(');
 const end=html.indexOf('function openAddCharacterModal(',start);
 const fn=html.slice(start,end);
 assert.ok(fn.includes('if (IS_SANDBOX_MODE) {'));
 const sandbox=fn.slice(fn.indexOf('if (IS_SANDBOX_MODE) {'),
  fn.indexOf("      const result=await commitPersonalNpcExchangeV1('gift'"));
 const acceptGate=sandbox.indexOf("plan.status !== 'ACCEPT'");
 const consume=sandbox.indexOf('userProfile.inventory=before.inventory.filter((_,i)=>i!==itemIdx)');
 assert.ok(acceptGate>=0&&consume>acceptGate,'Only accepted gifts consume exactly one instance');
 assert.match(sandbox,/catch\(_\)\{[\s\S]*?userProfile\.inventory=before\.inventory;/,
   'A failed Sandbox write must restore the inventory');
 assert.match(sandbox,/saveCurrentAccount\(\);[\s\S]*?renderCodexList\(\);\s*return;\s*\}/);
 assert.match(fn,/commitPersonalNpcExchangeV1\('gift',giftStory,char\.id/);
 assert.doesNotMatch(fn,/userProfile\.inventory\.splice\(itemIdx/);
});
