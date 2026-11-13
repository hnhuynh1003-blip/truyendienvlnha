const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../js/vangioi-arc-plan.js');
const pin={kind:'library',storyId:'epub-existing',storyVersion:'version-1',contentHash:'a'.repeat(64)};
const plan=()=>({schemaVersion:'arc-plan-1',arcs:[{arcId:'arc-one',title:'First chapter range',source:{...pin},mode:'manual',startChapterId:'ch-1',endChapterId:'ch-9',opening:'',goal:'',ending:''}]});
test('G1N incomplete planning is allowed; source pins survive later source changes',()=>{
 const p=plan(),c=A.copy(p);p.arcs[0].source.storyVersion='version-2';assert.equal(c.arcs[0].source.storyVersion,'version-1');
 assert.equal(A.inspect(A.empty()).valid,true);c.arcs[0].source=null;assert.equal(A.inspect(c).valid,true);
});
for(const [name,change] of [['duplicate',p=>p.arcs.push({...p.arcs[0]})],['authority',p=>p.approved=true],['arc authority',p=>p.arcs[0].published=true],['auto AI',p=>p.arcs[0].mode='ai'],['pin hash',p=>p.arcs[0].source.contentHash=['a'.repeat(64)]],['version missing',p=>delete p.arcs[0].source.storyVersion],['extra source',p=>p.arcs[0].source.owner=true],['oversize text',p=>p.arcs[0].goal='x'.repeat(4001)],['wrong version',p=>p.schemaVersion='future']])test('G1N rejects '+name,()=>{const p=plan();change(p);assert.equal(A.inspect(p).valid,false);assert.throws(()=>A.copy(p));});
test('G1N diagnostics do not leak plot and plan copy does not mutate input',()=>{const p=plan();p.arcs[0].ending='SECRET';const before=JSON.stringify(p);A.copy(p);assert.equal(JSON.stringify(p),before);assert.ok(!JSON.stringify(A.inspect(p)).includes('SECRET'));});
