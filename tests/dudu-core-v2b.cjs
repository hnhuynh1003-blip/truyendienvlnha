// DUDU Quan Dao V8: short fair-play mystery and non-rewarding pilot checks.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const originalEngine=require('../js/dudu-story-engine-v1.js');
const originalPilot=require('../js/dudu-pilot-f-v1.js');
const model=require('../js/dudu-world-model-v2b.js');
const world=require('../js/dudu-pilot-world-v2b.js');
const engine=require('../js/dudu-story-engine-v2b.js');
const story=require('../js/dudu-pilot-f-v2b.js');
assert.deepEqual(originalEngine.validate(originalPilot),[]);
assert.deepEqual(model.validate(world),[]);
assert.deepEqual(engine.validate(story),[]);
assert.equal(story.scenarioId,'pilot-quan-dao-casefile-v8');
assert.equal(story.scenarioVersion,9);
assert.equal(story.missionId,originalPilot.missionId);
assert.equal(story.status,'pilot_only');
assert.equal(story.released,false);
assert.equal(story.rewardsEnabled,false);
assert.ok(Object.keys(story.scenes).length<=30,'Avoid excessive plot beats');
assert.ok(Object.keys(story.scenes).length>=15,'Investigation needs meaningful branches');
for(const p of Object.values(world.places)){
 assert.ok(fs.existsSync(path.join(root,p.background)),p.background);
 assert.ok(fs.existsSync(path.join(root,p.photo)),p.photo);
}
function play(ids,start=engine.begin(story)){
 let state=start;
 for(const id of ids){
  const next=engine.decide(story,state,id);
  assert.equal(next.accepted,true,'Action '+id+' at '+state.sceneId+' rejected: '+next.reason);
  state=next.state;
 }
 return state;
}
const view=state=>engine.view(story,state);
const ids=state=>view(state).choices.map(c=>c.id);
const start=engine.begin(story);
assert.equal(start.sceneId,'prologue');
assert.match(view(start).text,/DUDU/);
assert.match(view(start).text,/Tìm túi thuốc bị mất, xác định người lấy và nguyên nhân/);
assert.ok(!view(start).text.includes('Lục Tam'),'No culprit spoiler in mission');
const common=['enter_case','take_case'];
const hub=play(common);
assert.equal(hub.sceneId,'hub');
assert.ok(['talk_maid','talk_keeper','talk_guard','visit_store','open_theories']
 .every(c=>ids(hub).includes(c)));
assert.ok(!ids(hub).includes('visit_kitchen'),'Kitchen opens only after discovering lead');
const maid=play(['talk_maid','check_maid_wax','note_wax'],hub);
assert.ok(maid.evidence.includes('wax_cuff'),'A Lien must have a suspicious trace');
const keeper=play(['talk_keeper','ask_corrected_ink','note_ink'],hub);
assert.ok(keeper.evidence.includes('changed_ledger'),'Owner must have a suspicious trace');
const guard=play(['talk_guard','ask_guard_cord','cord_keep_in_mind'],hub);
assert.ok(guard.evidence.includes('guard_cord'),'Soldier must have a suspicious trace');
const earlyGuess=play(['open_theories','theory_guard'],hub);
assert.ok(!ids(earlyGuess).includes('prove_by_ledger'));
assert.ok(!ids(earlyGuess).includes('prove_by_cord'));
assert.equal(engine.decide(story,earlyGuess,'prove_by_ledger').reason,'missing_story_precondition');
assert.equal(play(['accuse_guard_unverified'],earlyGuess).endingId,'wrong_guard');
assert.equal(play(['open_theories','theory_maid','accuse_maid'],hub).endingId,'wrong_maid');
assert.equal(play(['open_theories','theory_keeper','accuse_keeper'],hub).endingId,'wrong_keeper');
const inStore=play(['visit_store'],hub);
assert.equal(inStore.sceneId,'store');
assert.ok(!ids(inStore).includes('prove_by_ledger'));
const viaCoal=play(['look_coal_marks','trace_to_kitchen','check_coal_bin'],inStore);
assert.equal(viaCoal.sceneId,'bundle');
assert.ok(viaCoal.evidence.includes('medicine_bundle'),'Medicine found BEFORE deciding culprit');
assert.ok(!viaCoal.evidence.includes('care_receipt'),'Finding bag alone does not certify motive');
const receipt=play(['open_hidden_note','record_receipt'],viaCoal);
assert.ok(receipt.evidence.includes('care_receipt'));
const notEnough=play(['bundle_to_deduce','theory_guard'],receipt);
assert.ok(!ids(notEnough).includes('prove_by_ledger'),'Bag and slip alone do not name thief');
assert.ok(!ids(notEnough).includes('prove_by_cord'),'Must compare traces to a person');
const withLedger=play(['talk_keeper','inspect_register','note_key_log'],hub);
const ledgerRoute=play(['visit_store','look_coal_marks','trace_to_kitchen','check_coal_bin',
 'open_hidden_note','record_receipt','bundle_to_deduce','theory_guard'],withLedger);
assert.ok(ids(ledgerRoute).includes('prove_by_ledger'));
assert.ok(!ids(ledgerRoute).includes('prove_by_cord'));
const confrontedByLedger=play(['prove_by_ledger'],ledgerRoute);
assert.equal(confrontedByLedger.sceneId,'motive');
assert.ok(!confrontedByLedger.endingId);
const falseMotive=play(['motive_sale'],confrontedByLedger);
assert.equal(falseMotive.sceneId,'motive_mistake');
assert.equal(play(['insist_wrong_motive'],falseMotive).endingId,'wrong_motive');
const solved=play(['motive_emergency','close_case_publicly'],confrontedByLedger);
assert.equal(solved.status,'success');
assert.equal(solved.endingId,'solved');
assert.equal(solved.step,16,'No post-verdict supply errand');
assert.match(story.endings.solved.text,/túi/);
const cordRoute=play(['talk_guard','ask_guard_cord','cord_keep_in_mind',
 'visit_store','look_coal_marks','trace_to_kitchen','check_coal_bin',
 'open_hidden_note','record_receipt','inspect_blue_knot','record_knot',
 'bundle_to_deduce','theory_guard'],hub);
assert.ok(ids(cordRoute).includes('prove_by_cord'),'Matching both physical cords is an independent proof');
assert.ok(!ids(cordRoute).includes('prove_by_ledger'));
const mercy=play(['prove_by_cord','motive_emergency','close_case_with_mercy'],cordRoute);
assert.equal(mercy.endingId,'solved_mercy');
assert.equal(mercy.status,'success');
const throughMaid=play(['talk_maid','ask_maid_steps','follow_maid_observation','check_coal_bin'],hub);
assert.equal(throughMaid.sceneId,'bundle','Alternative exploration path not locked behind full checklist');
for(const [id,sc]of Object.entries(story.scenes)){
 for(const choice of sc.choices){
  if(choice.ending&&story.endings[choice.ending].status==='success')
   assert.equal(id,'reveal','No success before bag, culprit and motive');
 }
}
assert.ok(story.scenes.reveal.choices.every(c=>c.kind==='conclusion'));
assert.deepEqual(engine.restore(story,engine.serialize(story,receipt)),receipt);
assert.equal(engine.restore(story,JSON.stringify({...receipt,scenarioId:'pilot-quan-dao-dawn-rescue-v7'})),null);
const badReward={...story,rewardsEnabled:true};
assert.ok(engine.validate(badReward).includes('pilot_must_stay_locked'));
const badRoute=JSON.parse(JSON.stringify(story));
badRoute.scenes.prologue.choices[0].to='store';
assert.ok(engine.validate(badRoute).some(e=>e.includes('illegal_scene_jump')));
const copy=read('js/dudu-pilot-ui-v1.js');
assert.match(copy,/dudu:pilot-f-casefile-v8:/);
assert.match(copy,/ĐÃ GIẢI ÁN \(BẢN THỬ\)/);
for(const html of [read('index.html'),read('dudu-pilot.html')]){
 assert.ok(html.includes('dudu-pilot-f-v2b.js?v=play-v8'));
 assert.ok(html.includes('dudu-story-engine-v2b.js?v=play-v8'));
}
console.log('DUDU F V8: medicine first / 3 suspects / 2 decisive routes / short verdict / pilot no rewards OK');
