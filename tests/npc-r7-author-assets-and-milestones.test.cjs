const {test}=require('node:test');
const assert=require('node:assert/strict');
const author=require('../js/npc-author-v2-r7.js');
const stages=require('../js/npc-relationship-v2-r3.js');
const npc={id:'c_otk',name:'Ôn Tri Hành'};
test('author R7 preferences remain optional and preserve immutable NPC identity',()=>{
 const original=JSON.stringify(npc);
 const config=author.normalizeDraft(npc,{giftPreferences:{
   likedTags:['PRACTICAL'],dislikedTags:['DANGEROUS'],reactionStyle:'reserved'},
   portraitPath:'assets/npc/on-tri-hanh.webp'});
 assert.equal(config.npcId,npc.id);
 assert.deepEqual(config.giftPreferences.likedTags,['PRACTICAL']);
 assert.equal(config.portraitPath,'assets/npc/on-tri-hanh.webp');
 assert.equal(JSON.stringify(npc),original);
 const blank=author.normalizeDraft(npc,{giftPreferences:null,portraitPath:''});
 assert.equal(blank.portraitPath,null);
 assert.deepEqual(blank.giftPreferences.likedTags,[]);
});
test('portrait allowlist rejects external, script, unsafe and traversal URLs',()=>{
 for(const path of [
  'https://evil.example/image.webp','//evil.example/a.png',
  'data:image/svg+xml,a','javascript:alert(1)','../assets/npc/a.png',
  'assets/npc/../../secret.jpg','assets/npc/a.svg',
  'assets/npc/a.png?x=1','assets/npc/a.webp#x',
  'assets\\npc\\x.png','assets/npc/☀.png'
 ])assert.equal(author.normalizeDraft(npc,{giftPreferences:null,portraitPath:path}),null,path);
 for(const path of ['assets/npc/x.png','assets/npc/on-tri-hanh.webp',
  'assets/npc/NPC-01.jpeg'])
  assert.equal(author.normalizeDraft(npc,{giftPreferences:null,portraitPath:path})?.portraitPath,path);
 assert.equal(author.normalizeDraft(npc,{
  giftPreferences:{likedTags:['PRACTICAL'],refusedTags:['PRACTICAL']},
  portraitPath:null}),null);
});
test('milestone draft references only existing chapter IDs and never validates completion',()=>{
 const ctx={storyId:'truyen-dien-vl',npcId:'c_otk',knownChapterIds:['ch1','ch2']};
 const plan=author.validateMilestonePlan({milestones:[
  {id:'trust-main',chapterId:'ch1',minimumTrust:30},
  {id:'bond-main',chapterId:'ch2',minimumTrust:60}]},ctx);
 assert.equal(plan.milestones.length,2);
 assert.equal(plan.mode,'AUTHOR_DRAFT_ONLY');
 assert.equal(plan.verified,false);
 const restricted=author.previewMilestoneStatus(plan);
 assert.deepEqual(restricted.approvedMilestones,[]);
 assert.deepEqual(restricted.completedMilestones,[]);
 assert.equal(stages.stage({unlocked:true,affinity:100,trust:100,...restricted}),'FRIENDLY');
 assert.equal(stages.canReveal({requiredMilestone:'bond-main',...restricted}),false);
});
test('milestone plans fail closed for forged and duplicate chapter references',()=>{
 const ctx={storyId:'s1',npcId:'c_otk',knownChapterIds:['chapter1']};
 for(const milestones of [
  [{id:'chapter-1',chapterId:'not-existing'}],
  [{id:'m1',chapterId:'chapter1'},{id:'m1',chapterId:'chapter1'}],
  [{id:'../invalid',chapterId:'chapter1'}]
 ]) assert.equal(author.validateMilestonePlan({milestones},ctx),null);
 assert.equal(author.validateMilestonePlan({milestones:[]},{...ctx,storyId:'../invalid'}),null);
});
