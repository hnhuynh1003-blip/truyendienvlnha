const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
test('R2 scripts load in dependency order in preview branch',()=>{
 const a=html.indexOf('src="js/npc-relationship-v2-r1.js"');
 const b=html.indexOf('src="js/npc-gift-v2-r2.js"');
 assert.ok(a>0&&b>a);
});
test('R2 commit is isolated to sandbox and never removes inventory on refusal',()=>{
 const start=html.indexOf('async function executeGiftItem(');
 const end=html.indexOf('function openAddCharacterModal(',start);
 const fn=html.slice(start,end);
 assert.ok(fn.includes('if (IS_SANDBOX_MODE) {'));
 const sandbox=fn.slice(fn.indexOf('if (IS_SANDBOX_MODE) {'),fn.indexOf('      const rankBonus'));
 assert.ok(sandbox.indexOf("plan.status !== 'ACCEPT'")<sandbox.indexOf('userProfile.inventory.splice(itemIdx,1)'));
 assert.ok(sandbox.indexOf('return;\n      }')>sandbox.indexOf('saveCurrentAccount()'));
 assert.ok(fn.includes('const rankBonus = { "F": 5, "E": 10'), 'Live legacy path remains unchanged');
});
