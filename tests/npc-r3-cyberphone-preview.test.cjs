const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
test('R3 is loaded after R1 and R2 and preview exists in Cyber Phone',()=>{
 const r1=html.indexOf('src="js/npc-relationship-v2-r1.js"');
 const r2=html.indexOf('src="js/npc-gift-v2-r2.js"');
 const r3=html.indexOf('src="js/npc-relationship-v2-r3.js"');
 assert.ok(r1>0&&r2>r1&&r3>r2);
 assert.ok(html.includes('id="npc-relationship-r3-preview"'));
});
test('R3 display is sandbox-only, read-only and does not trust unverified milestone data',()=>{
 const begin=html.indexOf('function switchChatCharacter()');
 const end=html.indexOf('function renderChatMessages(',begin);
 const fn=html.slice(begin,end);
 assert.match(fn,/if \(IS_SANDBOX_MODE && panel\)/);
 assert.match(fn,/DuduNpcRelationshipV2\.previewRelationship/);
 assert.match(fn,/DuduNpcRelationStages\.stage/);
 assert.match(fn,/approvedMilestones:\[\],completedMilestones:\[\]/);
 assert.doesNotMatch(fn,/saveCurrentAccount\(|inventory\.splice|db\.collection\(/);
 assert.match(fn,/panel\.style\.display='none'/);
});
