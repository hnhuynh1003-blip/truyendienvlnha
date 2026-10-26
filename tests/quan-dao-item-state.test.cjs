'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const engine=require('../js/dudu-story-engine-v2b.js'),story=require('../js/dudu-pilot-f-v2b.js');
const choices=s=>engine.view(story,s).choices.map(c=>c.id);
function play(ids,start=engine.begin(story)){
 return ids.reduce((state,id)=>{const r=engine.decide(story,state,id);assert.equal(r.accepted,true,id+': '+r.reason);return r.state;},start);
}
const common=['enter_case','take_case'];
const routes=[['talk_maid','ask_maid_steps','follow_maid_observation'],['visit_store','look_coal_marks','trace_to_kitchen'],['talk_maid','ask_maid_steps','note_maid_statement','visit_kitchen']];
for(const [i,route]of routes.entries())test('Quan Dao one medicine entity across approach '+i,()=>{
 let state=play([...common,...route]);
 assert.ok(choices(state).includes('check_coal_bin'));assert.ok(!choices(state).includes('review_recovered_bundle'));
 state=play(['check_coal_bin','bundle_to_deduce','theory_back','visit_kitchen'],state);
 assert.ok(!choices(state).includes('check_coal_bin'));assert.ok(choices(state).includes('review_recovered_bundle'));
 const denied=engine.decide(story,state,'check_coal_bin');assert.equal(denied.accepted,false);assert.equal(denied.state,state);
 state=engine.restore(story,engine.serialize(story,state));assert.ok(state);
 assert.ok(!choices(state).includes('check_coal_bin'));
 state=play(['review_recovered_bundle','open_hidden_note','record_receipt','inspect_blue_knot','record_knot','bundle_to_deduce','theory_back',
  'talk_maid','ask_maid_steps','follow_maid_observation','review_recovered_bundle','bundle_to_deduce','theory_back',
  'visit_store','look_coal_marks','trace_to_kitchen','review_recovered_bundle','open_hidden_note','receipt_back'],state);
 assert.equal(state.evidence.filter(id=>id==='medicine_bundle').length,1);
 assert.equal(state.log.filter(event=>event.choiceId==='check_coal_bin').length,1);
 assert.ok(state.evidence.includes('care_receipt'));assert.ok(state.evidence.includes('military_knot'));
 assert.match(engine.view(story,state).text,/bạn đã thu nhận/);
 assert.equal(story.rewardsEnabled,false);assert.equal(story.released,false);
});
test('Quan Dao restores old V8 evidence without once marker and still blocks repeat acquisition',()=>{
 let state=play([...common,...routes[1],'check_coal_bin','bundle_to_deduce','theory_back','visit_kitchen']);
 const old={...state,usedChoices:state.usedChoices.filter(id=>id!=='check_coal_bin')};
 const restored=engine.restore(story,JSON.stringify(old));assert.ok(restored);
 assert.ok(!choices(restored).includes('check_coal_bin'));
 assert.equal(engine.decide(story,restored,'check_coal_bin').accepted,false);
 assert.ok(choices(restored).includes('review_recovered_bundle'));
});
test('Quan Dao hiddenIfEvidence is validated and enforced across distinct actions sharing one evidence identity',()=>{
 const copy=JSON.parse(JSON.stringify(story));
 copy.scenes.kitchen.choices.push({...copy.scenes.kitchen.choices[0],id:'another_route_same_bundle',once:false});
 assert.deepEqual(engine.validate(copy),[]);
 let s=engine.begin(copy);
 for(const id of [...common,...routes[1],'another_route_same_bundle','bundle_to_deduce','theory_back','visit_kitchen']){
  const r=engine.decide(copy,s,id);assert.equal(r.accepted,true);s=r.state;
 }
 for(const id of ['check_coal_bin','another_route_same_bundle'])assert.equal(engine.decide(copy,s,id).accepted,false);
 copy.scenes.kitchen.choices[0].hiddenIfEvidence='medicine_bundle';
 assert.ok(engine.validate(copy).some(e=>e.includes('invalid_visibility_rule')));
});
