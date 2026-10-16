const {test}=require('node:test');
const assert=require('node:assert/strict');
const r=require('../js/npc-relationship-v2-r3.js');
test('old 0/20/50/100 affection cannot bypass trust or lore milestones',()=>{
 for(const affinity of [0,20,50,100])
   assert.equal(r.stage({unlocked:true,affinity,trust:0}),'ACQUAINTED');
 assert.equal(r.stage({unlocked:false,affinity:100,trust:100}),'LOCKED');
});
test('higher stages require both relationship thresholds and approved completed story milestones',()=>{
 assert.equal(r.stage({unlocked:true,affinity:40,trust:10}),'FRIENDLY');
 assert.equal(r.stage({unlocked:true,affinity:100,trust:100}),'FRIENDLY');
 const evidence={approvedMilestones:['ch-2'],completedMilestones:['ch-2']};
 assert.equal(r.stage({unlocked:true,affinity:70,trust:30,...evidence}),'TRUSTED');
 assert.equal(r.stage({unlocked:true,affinity:90,trust:60,...evidence}),'BONDED');
 assert.equal(r.stage({unlocked:true,affinity:90,trust:60,approvedMilestones:['ch-2'],completedMilestones:['fake']}),'FRIENDLY');
 assert.equal(r.canReveal({requiredMilestone:'secret',approvedMilestones:['secret'],completedMilestones:['secret']}),true);
 assert.equal(r.canReveal({requiredMilestone:'secret',approvedMilestones:[],completedMilestones:['secret']}),false);
});
test('scripted offline reactions are deterministic and refuse safely',()=>{
 for(const style of ['default','reserved','cheerful','gentle']){
  for(const status of ['ACCEPT','REFUSE','COOLDOWN'])assert.ok(r.react(style,status).length>3);
 }
 assert.equal(r.react('__proto__','REFUSE'),r.react('default','REFUSE'));
});
