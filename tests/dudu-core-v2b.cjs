// DUDU F V4 — discovery-first interactive pilot regression.
// Run: node tests/dudu-core-v2b.cjs
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base=require('../js/dudu-story-engine-v1.js');
const legacy=require('../js/dudu-pilot-f-v1.js');
const model=require('../js/dudu-world-model-v2b.js');
const world=require('../js/dudu-pilot-world-v2b.js');
const engine=require('../js/dudu-story-engine-v2b.js');
const scenario=require('../js/dudu-pilot-f-v2b.js');
assert.deepEqual(base.validate(legacy),[]);
assert.deepEqual(model.validate(world),[]);
assert.deepEqual(engine.validate(scenario),[]);
assert.equal(scenario.missionId,legacy.missionId);
assert.equal(scenario.released,false);
assert.equal(scenario.rewardsEnabled,false);
assert.equal(scenario.status,'pilot_only');
assert.equal(scenario.startSceneId,'prologue');
assert.equal(Object.keys(world.places).length,3);
for(const p of Object.values(world.places)){
 assert.ok(fs.existsSync(path.join(root,p.background)),p.background);
 assert.ok(fs.existsSync(path.join(root,p.photo)),p.photo);
}
const fakeKnowledge=JSON.parse(JSON.stringify(world));
fakeKnowledge.npcs.maid.lines.unshift({factId:'borrowed_medicine',text:'Spoiler'});
assert.ok(model.validate(fakeKnowledge).includes('npc_unknown_fact:maid'));
const initial=engine.begin(scenario);
const initialView=engine.view(scenario,initial);
assert.ok(!initialView.text.includes('túi thuốc'));
assert.equal(initialView.choices.length,1);
assert.equal(engine.decide(scenario,initial,'suspect_guard').accepted,false);
assert.ok(!model.npcView(world,'guard',initial).text.includes('mở hòm'));
function play(seq,starting){
 let state=starting||engine.begin(scenario);
 for(const id of seq){
  const result=engine.decide(scenario,state,id);
  assert.equal(result.accepted,true,'Action '+id+': '+result.reason);
  state=result.state;
 }
 return state;
}
const start=['approach_inn_v3','help_maid_v3','ask_about_inn','stay_to_listen'];
const hall=play(start);
assert.equal(hall.sceneId,'hub');
assert.ok(hall.flags.includes('helped_maid'));
assert.ok(model.npcView(world,'maid',hall).text.includes('giúp em ngoài hiên'));
assert.equal(engine.decide(scenario,hall,'store_visit_v2b').reason,'undiscovered_action');
assert.equal(engine.decide(scenario,hall,'assemble_clues').reason,'undiscovered_action');
assert.equal(hall.step,start.length);
const before=engine.view(scenario,hall);
assert.ok(before.choices.some(c=>c.id==='keeper_visit_v2b'));
assert.ok(before.choices.some(c=>c.id==='maid_visit_v2b'));
assert.ok(before.choices.some(c=>c.id==='corridor_visit'));
for(const forbidden of ['assemble_clues','suspect_guard','report_guard_v2b','blame_maid','store_visit_v2b']){
 assert.ok(!before.choices.some(c=>c.id===forbidden),'Premature action visible: '+forbidden);
}
const withKey=play(['keeper_visit_v2b','keeper_ask_register','copy_key_log_v2b'],hall);
assert.ok(withKey.evidence.includes('key_log'));
assert.equal(engine.decide(scenario,withKey,'store_visit_v2b').accepted,true);
const withMaid=play(['maid_visit_v2b','ask_maid_last_night','write_maid_testimony_v2b'],withKey);
const withStore=play(['store_visit_v2b','check_seal_v2b','collect_seal_v2b','return_from_store_v2b'],withMaid);
assert.ok(withStore.evidence.includes('broken_seal'));
assert.ok(engine.view(scenario,withStore).choices.some(c=>c.id==='assemble_clues'));
assert.ok(!engine.view(scenario,withStore).choices.some(c=>c.id==='report_guard_v2b'));
const records=engine.view(scenario,withStore).clueDetails.map(x=>x.id);
assert.deepEqual(records,['key_log','maid_statement','broken_seal']);
const notes=play(['assemble_clues'],withStore);
assert.equal(notes.sceneId,'notes');
assert.ok(engine.view(scenario,notes).choices.some(c=>c.id==='suspect_guard'));
assert.ok(engine.view(scenario,notes).choices.some(c=>c.id==='suspect_maid'));
assert.ok(engine.view(scenario,notes).choices.some(c=>c.id==='suspect_keeper'));
assert.ok(!engine.view(scenario,notes).choices.some(c=>c.id==='revisit_resolution'));
const guessed=play(['suspect_guard'],notes);
assert.equal(guessed.sceneId,'claim_guard');
assert.equal(engine.decide(scenario,guessed,'show_ledger_and_seal').reason,'undiscovered_action');
const rejected=play(['only_uniform'],guessed);
assert.equal(rejected.sceneId,'weak_reason');
assert.equal(play(['weak_back'],rejected).sceneId,'notes');
const accused=play(['suspect_maid','blame_maid'],notes);
assert.equal(accused.endingId,'wrong');
const wrongKeeper=play(['suspect_keeper','blame_keeper'],notes);
assert.equal(wrongKeeper.endingId,'wrong_keeper');
assert.equal(play(['approach_inn_v3','enter_inn_v2b','watch_the_room','leave_inn_v2b']).endingId,'withdraw');
const heardGuard=play(['guard_visit_v2b','ask_guard_where','write_guard_testimony_v2b'],withStore);
const guarded=play(['assemble_clues','suspect_guard','show_ledger_and_seal'],heardGuard);
assert.equal(guarded.sceneId,'confront_guard');
assert.ok(!model.npcView(world,'guard',guarded).text.includes('mở hòm'));
const admitted=play(['ask_for_full_account'],guarded);
assert.equal(admitted.sceneId,'guard_truth');
assert.ok(admitted.flags.includes('guard_confronted'));
assert.ok(model.npcView(world,'guard',admitted).text.includes('mở hòm'));
const beforeReceipt=engine.view(scenario,admitted);
assert.ok(!beforeReceipt.choices.some(c=>c.id==='report_guard_v2b'));
const complete=play(['inspect_receipt','record_care_receipt_v2b'],admitted);
assert.equal(complete.sceneId,'notes');
const endingChoices=engine.view(scenario,complete).choices.map(c=>c.id);
assert.ok(endingChoices.includes('revisit_resolution'));
assert.ok(!endingChoices.includes('report_guard_v2b'));
const accountability=play(['revisit_resolution','report_guard_v2b'],complete);
const reconciliation=play(['revisit_resolution','seek_mediation_v2b'],complete);
assert.equal(accountability.endingId,'accountability');
assert.equal(reconciliation.endingId,'reconcile');
assert.equal(accountability.status,'success');
assert.equal(reconciliation.status,'success');
assert.equal(engine.decide(scenario,accountability,'report_guard_v2b').reason,'already_finished');
assert.deepEqual(engine.restore(scenario,engine.serialize(scenario,complete)),complete);
assert.equal(engine.restore(scenario,JSON.stringify({...complete,scenarioId:'pilot-quan-dao-narrative-v3'})),null);
const tampered={...scenario,rewardsEnabled:true};
assert.ok(engine.validate(tampered).includes('pilot_must_stay_locked'));
const illegal=JSON.parse(JSON.stringify(scenario));
illegal.scenes.prologue.choices[0].to='store';
assert.ok(engine.validate(illegal).some(x=>x.includes('illegal_scene_jump')));
const invalidVisibility=JSON.parse(JSON.stringify(scenario));
invalidVisibility.scenes.hub.choices[0].visibleIfEvidence='spoiler';
assert.ok(engine.validate(invalidVisibility).some(x=>x.includes('invalid_visibility_rule')));
const ui=read('js/dudu-pilot-ui-v1.js');
assert.match(ui,/dudu:pilot-f-investigation-v4:/);
assert.match(ui,/dudu-pilot-evidence-toggle/);
assert.match(ui,/dudu-pilot-choice-prompt/);
assert.match(ui,/dudu-pilot-prose/);
for(const html of [read('index.html'),read('dudu-pilot.html')]){
 for(const script of ['dudu-world-model-v2b.js','dudu-pilot-world-v2b.js',
  'dudu-story-engine-v2b.js','dudu-pilot-f-v2b.js'])assert.ok(html.includes(script),script);
}
console.log('DUDU F V4: explore / NPC / hidden choices / own deductions / routes / restore / no rewards OK');
