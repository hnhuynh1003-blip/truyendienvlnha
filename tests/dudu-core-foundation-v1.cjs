// DUDU CORE Foundation V1 — pure Node regression (no Firebase, no real rewards).
// Run: node tests/dudu-core-foundation-v1.cjs
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const policy=require('../js/dudu-core-rules-v1.js');
const engine=require('../js/dudu-story-engine-v1.js');
const story=require('../js/dudu-pilot-f-v1.js');
assert.deepEqual(policy.systemRanks,['F','E','D','C','B','A','S']);
assert.deepEqual(policy.missionTiers,['F','E']);
assert.equal(policy.genreIds.length,6);
assert.equal(policy.requiredAssessmentF,3);
assert.equal(policy.assessmentSummary([
 {tier:'F',missionId:'f01',verified:true,status:'completed'},
 {tier:'F',missionId:'f01',verified:true,status:'completed'},
 {tier:'E',missionId:'e01',verified:true,status:'completed'},
 {tier:'F',missionId:'f02',verified:false,status:'completed'}
]).finished,false,'Never count repeats, E grade, or unverified tasks');
assert.equal(policy.assessmentSummary(['f01','f02','f03'].map(missionId=>(
 {tier:'F',missionId,verified:true,status:'completed'}))).finished,true);
for(const rank of ['F','E','D','C']){
 assert.equal(policy.accessFor(rank),'dispatch_only');
 assert.equal(policy.canRequest({systemRank:rank,selection:'genre',genreId:'ancient'}).allowed,false);
 assert.equal(policy.canRequest({systemRank:rank,selection:'small_world',smallWorldId:'x'}).allowed,false);
}
assert.equal(policy.canRequest({systemRank:'B',selection:'genre',genreId:'ancient'}).allowed,true);
assert.equal(policy.canRequest({systemRank:'B',selection:'small_world',smallWorldId:'x'}).allowed,false);
assert.equal(policy.canRequest({systemRank:'A',selection:'small_world',smallWorldId:'x'}).allowed,true);
assert.equal(policy.canRequest({systemRank:'A',selection:'story',storyId:'x'}).allowed,false);
assert.equal(policy.canRequest({systemRank:'S',selection:'story',storyId:'x'}).allowed,true);
assert.equal(policy.canSignPact(),false);
assert.equal(policy.canGrantReward(),false);
assert.equal(policy.canAssignRealMission(),false);
assert.deepEqual(engine.validate(story),[]);
assert.equal(story.status,'pilot_only');
assert.equal(story.released,false);
assert.equal(story.rewardsEnabled,false);
assert.equal(story.missionId,'dudu-m-an-f01');
assert.equal(new Set(Object.values(story.places).map(x=>x.background)).size,2);
for(const p of Object.values(story.places)){
 assert.ok(fs.existsSync(path.join(root,p.background)),p.background+' must exist');
 assert.match(read(p.background),/<svg/);
}
function advance(state,choice){
 const result=engine.decide(story,state,choice);
 assert.equal(result.accepted,true,'Choice must be accepted: '+choice+' / '+result.reason);
 return result.state;
}
let state=engine.begin(story);
assert.equal(engine.view(story,state).placeId,'gate');
assert.equal(engine.decide(story,state,'wrong_id').accepted,false);
state=advance(state,'enter_quiet');
assert.equal(state.sceneId,'hall');
assert.equal(engine.view(story,state).choices.find(x=>x.id==='confront').locked,true);
assert.equal(engine.decide(story,state,'confront').reason,'missing_evidence');
assert.equal(state.step,1,'Rejects must not mutate player state');
state=advance(state,'meet_keeper');
state=advance(state,'read_ledger');
assert.ok(state.evidence.includes('receipt'));
state=advance(state,'inspect_room');
state=advance(state,'inspect_seal');
assert.ok(state.evidence.includes('broken_seal'));
const checkpoint=engine.serialize(story,state);
const loaded=engine.restore(story,checkpoint);
assert.deepEqual(loaded,state,'Roundtrip reload preserves evidence and scene');
state=advance(loaded,'confront');
assert.equal(state.status,'success');
assert.equal(state.endingId,'exposed');
assert.equal(engine.decide(story,state,'confront').reason,'already_finished');
assert.equal(engine.restore(story,JSON.stringify({...state,missionId:'forged'})),null);
let peaceful=engine.begin(story);
for(const choice of ['enter_quiet','meet_keeper','read_ledger','meet_guard','hear_guard','arrange_talk'])
 peaceful=advance(peaceful,choice);
assert.equal(peaceful.endingId,'peace');
assert.equal(peaceful.status,'success');
let failed=engine.begin(story);
failed=advance(failed,'enter_quiet');
failed=advance(failed,'accuse_maid');
assert.equal(failed.status,'failure');
assert.equal(failed.endingId,'wrong');
let escaped=advance(engine.begin(story),'walk_away');
assert.equal(escaped.status,'failure');
const evil={...story,rewardsEnabled:true};
assert.ok(engine.validate(evil).includes('pilot_must_stay_locked'));
const html=read('index.html'),css=read('css/dudu-pilot-v1.css');
for(const token of ['js/dudu-core-rules-v1.js','js/dudu-story-engine-v1.js',
 'js/dudu-pilot-f-v1.js','js/dudu-pilot-ui-v1.js','css/dudu-pilot-v1.css']){
 assert.ok(html.includes(token),'Index must include '+token);
}
assert.ok(css.includes('@media(max-width:520px)'));
assert.ok(read('js/dudu-pilot-ui-v1.js').includes('sessionStorage'));
assert.ok(!read('js/dudu-pilot-ui-v1.js').includes('grantReward'));
console.log('DUDU CORE Foundation V1: ranks, 3F, F story branches, evidence, scene art, restore, safety OK');
