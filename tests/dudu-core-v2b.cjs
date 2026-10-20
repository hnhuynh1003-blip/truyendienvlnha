// DUDU Quan Dao V7: the investigation must restore care supplies, not only identify a suspect.
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
const story=require('../js/dudu-pilot-f-v2b.js');
assert.deepEqual(base.validate(legacy),[]);
assert.deepEqual(model.validate(world),[]);
assert.deepEqual(engine.validate(story),[]);
assert.equal(story.status,'pilot_only');
assert.equal(story.released,false);
assert.equal(story.rewardsEnabled,false);
assert.equal(story.scenarioVersion,8);
assert.equal(story.missionId,legacy.missionId);
assert.equal(story.scenarioId,'pilot-quan-dao-dawn-rescue-v7');
assert.equal(Object.keys(world.places).length,3);
assert.equal(world.npcs.porter.name,'Đinh Nhị');
assert.ok(world.facts.stock_for_convoy && world.facts.ridge_safe_path);
for(const p of Object.values(world.places)){
 assert.ok(fs.existsSync(path.join(root,p.background)),p.background);
 assert.ok(fs.existsSync(path.join(root,p.photo)),p.photo);
}
const at=st=>engine.view(story,st);
const opts=st=>at(st).choices.map(c=>c.id);
function play(ids,initial=engine.begin(story)){
 let st=initial;
 for(const id of ids){
  const r=engine.decide(story,st,id);
  assert.equal(r.accepted,true,'Action '+id+' at '+st.sceneId+': '+r.reason);
  st=r.state;
 }
 return st;
}
const entrance=engine.begin(story);
assert.equal(entrance.sceneId,'prologue');
assert.ok(!at(entrance).text.includes('túi thuốc'));
const hub=play(['approach_inn_v3','help_maid_v3','ask_about_inn','stay_to_listen']);
assert.ok(story.scenes.table_talk.text.includes('đoàn xe'));
assert.ok(opts(hub).includes('assemble_clues'),'Early hypothesis does not require five clues');
assert.ok(!opts(hub).includes('hub_present_verified_record'));
assert.equal(engine.decide(story,hub,'store_visit_v2b').reason,'undiscovered_action');
const notes=play(['assemble_clues'],hub);
assert.ok(['suspect_maid','suspect_keeper','suspect_guard'].every(x=>opts(notes).includes(x)));
for(const [person,suspect,accuse,challenge,reconsider] of [
 ['maid','suspect_maid','blame_maid','challenge_maid','reconsider_maid'],
 ['keeper','suspect_keeper','blame_keeper','challenge_keeper','reconsider_keeper'],
 ['guard','suspect_guard','blame_guard_without_proof','challenge_guard','reconsider_guard']
]){
 const accused=play([suspect,accuse],notes);
 assert.equal(accused.sceneId,challenge,person);
 assert.equal(accused.status,'playing','No automatic arrest of '+person);
 assert.equal(play([reconsider],accused).sceneId,'notes');
}
const key=play(['keeper_visit_v2b','keeper_ask_register','copy_key_log_v2b'],hub);
assert.ok(!opts(key).includes('hub_present_verified_record'));
const store=play(['store_visit_v2b','check_seal_v2b','collect_seal_v2b','return_from_store_v2b'],key);
assert.deepEqual(store.evidence,['key_log','broken_seal']);
const complaint=play(['assemble_clues','suspect_guard'],store);
assert.ok(opts(complaint).includes('show_ledger_and_seal'));
const initialConfession=play(['show_ledger_and_seal','ask_for_full_account'],complaint);
assert.ok(initialConfession.flags.includes('private_admission'));
assert.ok(!opts(initialConfession).includes('finish_formal_with_supply'));
const receiptReview=play(['inspect_receipt','review_receipt'],initialConfession);
const badVerification=play(['trust_stamp_only'],receiptReview);
assert.ok(!badVerification.evidence.includes('care_receipt'));
const verified=play(['recheck_receipt','match_receipt_entries'],badVerification);
assert.ok(verified.evidence.includes('care_receipt'));
assert.ok(verified.flags.includes('receipt_checked'));
assert.equal(verified.evidence.length,3,'No five-clue collection threshold');
const partial=play(['verified_formal_now','report_guard_v2b'],verified);
assert.equal(partial.status,'playing','Confession and signature are not victory');
assert.equal(partial.sceneId,'supply_audit');
assert.ok(opts(partial).includes('file_only_finish'));
assert.equal(play(['file_only_finish'],partial).endingId,'paper_only');
assert.equal(play(['check_sack_stock','call_all_used'],partial).endingId,'paper_only');
const computed=play(['check_sack_stock','calculate_remaining'],partial);
assert.equal(computed.sceneId,'route_plan');
assert.ok(computed.flags.includes('supply_balance_verified'));
assert.equal(play(['route_choose_bridge'],computed).endingId,'route_blocked');
const guide=play(['route_seek_advice'],computed);
assert.equal(at(guide).npcDetails.name,'Đinh Nhị');
assert.ok(at(guide).npcDetails.text.includes('sườn đá'));
const fromRain=play(['choose_escorted_ridge','watch_for_return'],guide);
assert.equal(fromRain.sceneId,'courier_in');
assert.ok(!fromRain.flags.includes('medicine_recovered'));
assert.equal(play(['hand_off_untallied'],fromRain).endingId,'unverified_handover');
const counted=play(['inspect_returned_bag'],fromRain);
assert.ok(counted.flags.includes('medicine_recovered'));
assert.ok(!counted.flags.includes('convoy_supplied'));
const delivered=play(['deliver_to_convoy'],counted);
assert.ok(delivered.flags.includes('convoy_supplied'));
assert.equal(play(['finish_rescue_without_truth'],delivered).endingId,'unresolved_reputation');
const goodFormal=play(['finish_formal_with_supply'],delivered);
assert.equal(goodFormal.status,'success');
assert.equal(goodFormal.endingId,'accountability');
assert.ok(story.endings.accountability.text.includes('bốn cuộn băng'));
const hearing=play(['verified_public_hearing'],verified);
assert.equal(play(['ask_for_public_confession'],hearing).status,'playing');
const publicProof=play(['show_verified_receipt_publicly'],hearing);
assert.ok(publicProof.flags.includes('public_confirmed'));
const maid=play(['listen_maid_again','record_witness_after_proof'],publicProof);
assert.ok(maid.flags.includes('public_witness_heard'));
const agreed=play(['seek_mediation_v2b'],maid);
assert.equal(agreed.sceneId,'supply_audit');
assert.equal(agreed.status,'playing');
const reconciled=play(['check_sack_stock','calculate_remaining','route_seek_advice',
 'choose_escorted_ridge','watch_for_return','inspect_returned_bag',
 'deliver_to_convoy','finish_mediated_with_supply'],agreed);
assert.equal(reconciled.endingId,'reconcile');
assert.equal(reconciled.status,'success');
assert.ok(story.endings.reconcile.text.includes('thuốc'));
for(const [id,scene] of Object.entries(story.scenes))for(const ch of scene.choices){
 if(ch.ending && story.endings[ch.ending].status==='success'){
  assert.equal(id,'convoy_ready','No early success for '+ch.id);
  assert.ok(ch.requiresFlags.includes('medicine_recovered'));
  assert.ok(ch.requiresFlags.includes('convoy_supplied'));
 }
}
const allClueState=play(['verified_more_search','maid_visit_v2b','ask_maid_last_night','write_maid_testimony_v2b',
 'guard_visit_v2b','ask_guard_where','write_guard_testimony_v2b'],verified);
assert.deepEqual(allClueState.evidence.slice().sort(),Object.keys(world.clues).sort(),
 'All 5 old clues remain collectable');
assert.deepEqual(engine.restore(story,engine.serialize(story,delivered)),delivered);
assert.equal(engine.restore(story,JSON.stringify({...delivered,scenarioId:'pilot-quan-dao-fair-evidence-v6-1'})),null,
 'Old scenario may not pretend to have finished new content');
let revisits=hub;
for(let i=0;i<65;i++)revisits=play(['assemble_clues','keep_searching'],revisits);
assert.ok(revisits.step>100);
assert.ok(revisits.log.length<=100);
assert.deepEqual(revisits.evidence,[]);
assert.deepEqual(engine.restore(story,engine.serialize(story,revisits)),revisits);
assert.equal(play(['step_away'],revisits).endingId,'withdraw');
const noReward={...story,rewardsEnabled:true};
assert.ok(engine.validate(noReward).includes('pilot_must_stay_locked'));
const illegal=JSON.parse(JSON.stringify(story));
illegal.scenes.prologue.choices[0].to='store';
assert.ok(engine.validate(illegal).some(x=>x.includes('illegal_scene_jump')));
const badNpc=JSON.parse(JSON.stringify(story));
badNpc.scenes.route_advice.npcId='wrong';
assert.ok(engine.validate(badNpc).includes('unknown_npc:route_advice'));
const ui=read('js/dudu-pilot-ui-v1.js');
assert.match(ui,/dudu:pilot-f-dawn-rescue-v7:/);
assert.match(ui,/actionAlert/);
for(const html of [read('index.html'),read('dudu-pilot.html')]){
 assert.ok(html.includes('dudu-pilot-f-v2b.js?v=play-v7'));
 assert.ok(html.includes('dudu-pilot-ui-v1.js?v=play-v7'));
}
console.log('DUDU F V7: clues -> stock audit -> safe return -> delivery -> accountable outcomes OK');
