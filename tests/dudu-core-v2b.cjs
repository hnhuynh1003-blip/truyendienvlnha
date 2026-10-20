// DUDU V2B regression. Run: node tests/dudu-core-v2b.cjs
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const v1=require('../js/dudu-story-engine-v1.js');
const legacy=require('../js/dudu-pilot-f-v1.js');
const model=require('../js/dudu-world-model-v2b.js');
const world=require('../js/dudu-pilot-world-v2b.js');
const engine=require('../js/dudu-story-engine-v2b.js');
const scenario=require('../js/dudu-pilot-f-v2b.js');
assert.deepEqual(v1.validate(legacy),[],'Original V1 pilot still valid');
assert.deepEqual(model.validate(world),[],'World Bible schema must pass');
assert.deepEqual(engine.validate(scenario),[],'New scenario cannot bypass checks');
assert.equal(scenario.missionId,legacy.missionId,'V66 IDs stay stable');
assert.equal(scenario.rewardsEnabled,false);
assert.equal(scenario.released,false);
assert.equal(scenario.status,'pilot_only');
assert.equal(Object.keys(world.places).length,3,'Gate, hall, store are real locations');
assert.equal(Object.keys(world.npcs).length,3);
for(const place of Object.values(world.places)){
 assert.ok(fs.existsSync(path.join(root,place.background)),'SVG fallback missing: '+place.background);
 assert.ok(fs.existsSync(path.join(root,place.photo)),'Cinematic photo missing: '+place.photo);
}
const untrusted=model.npcView(world,'guard',{evidence:[],flags:[]});
assert.ok(untrusted.text.includes('trạm gác'));
assert.ok(!untrusted.text.includes('Dấu niêm phong ấy'));
assert.ok(!model.npcView(world,'guard',{evidence:['broken_seal','guard_statement'],flags:[]}).text.includes('Dấu niêm phong ấy'),'Knowledge is not disclosed before explicit confrontation');
assert.ok(model.npcView(world,'guard',{evidence:['broken_seal','guard_statement'],flags:['guard_confronted']}).text.includes('Dấu niêm phong ấy'),'Confrontation reveals authored statement');
assert.ok(!Object.hasOwn(untrusted,'knows')&&!Object.hasOwn(untrusted,'facts'));
assert.equal(model.npcView(world,'unknown',{evidence:[],flags:[]}),null);
assert.deepEqual(model.knownClues(world,['key_log','fake_id']).map(x=>x.id),['key_log']);
function play(choices){
 let state=engine.begin(scenario);
 for(const choice of choices){
  const result=engine.decide(scenario,state,choice);
  assert.equal(result.accepted,true,'Choice should work: '+choice+' => '+result.reason);
  state=result.state;
 }
 return state;
}
const start=engine.begin(scenario);
assert.equal(engine.view(scenario,start).placeId,'gate');
assert.equal(engine.decide(scenario,start,'no-such-action').accepted,false);
const hall=play(['enter_inn_v2b']);
const unauthorized=engine.decide(scenario,hall,'store_visit_v2b');
assert.equal(unauthorized.accepted,false);
assert.equal(unauthorized.reason,'missing_story_precondition');
assert.equal(hall.step,1,'Rejected choice never mutates the state');
assert.ok(engine.view(scenario,hall).choices.find(x=>x.id==='store_visit_v2b').locked);
assert.equal(engine.decide(scenario,hall,'report_guard_v2b').accepted,false);
let withKey=play(['enter_inn_v2b','keeper_visit_v2b','copy_key_log_v2b']);
assert.equal(engine.decide(scenario,withKey,'store_visit_v2b').accepted,true);
assert.equal(engine.view(scenario,play(['enter_inn_v2b','keeper_visit_v2b','copy_key_log_v2b','store_visit_v2b'])).placeId,'store');
assert.deepEqual(engine.restore(scenario,engine.serialize(scenario,withKey)),withKey);
assert.equal(engine.restore(scenario,JSON.stringify({...withKey,scenarioId:legacy.scenarioId})),null,'V1 session cannot silently become V2B state');
const investigation=[
 'enter_inn_v2b','keeper_visit_v2b','copy_key_log_v2b','store_visit_v2b',
 'check_seal_v2b','collect_seal_v2b','return_from_store_v2b',
 'guard_visit_v2b','write_guard_testimony_v2b','guard_visit_v2b',
 'confront_seal_v2b','record_care_receipt_v2b'
];
const preEnd=play(investigation);
assert.equal(preEnd.status,'playing');
assert.equal(engine.view(scenario,preEnd).choices.find(x=>x.id==='report_guard_v2b').locked,false);
assert.equal(engine.decide(scenario,preEnd,'seek_mediation_v2b').accepted,false,'Mediation needs maid testimony');
const result=engine.decide(scenario,preEnd,'report_guard_v2b');
assert.equal(result.accepted,true);
assert.equal(result.state.status,'success');
assert.equal(result.state.endingId,'accountability');
assert.equal(engine.decide(scenario,result.state,'report_guard_v2b').reason,'already_finished');
const mediation=play([
 'enter_inn_v2b','keeper_visit_v2b','copy_key_log_v2b',
 'maid_visit_v2b','write_maid_testimony_v2b',
 'guard_visit_v2b','write_guard_testimony_v2b',
 'store_visit_v2b','check_seal_v2b','collect_seal_v2b',
 'return_from_store_v2b','guard_visit_v2b','confront_seal_v2b',
 'record_care_receipt_v2b','seek_mediation_v2b'
]);
assert.equal(mediation.endingId,'reconcile');
assert.equal(mediation.status,'success');
assert.equal(play(['enter_inn_v2b','accuse_without_proof_v2b']).status,'failure');
assert.equal(play(['leave_inn_v2b']).status,'failure');
const forged={...scenario,rewardsEnabled:true};
assert.ok(engine.validate(forged).includes('pilot_must_stay_locked'));
const illegal=JSON.parse(JSON.stringify(scenario));
illegal.scenes.arrival.choices[0].to='store';
assert.ok(engine.validate(illegal).some(x=>x.includes('illegal_scene_jump')),'Disallow teleporting to store');
const ui=read('js/dudu-pilot-ui-v1.js');
assert.match(ui,/dudu:pilot-f-v2b:/);
assert.match(ui,/dudu-pilot-persona/);
assert.match(ui,/dudu-pilot-choice-hint/);
for(const html of [read('index.html'),read('dudu-pilot.html')]){
 for(const script of ['dudu-world-model-v2b.js','dudu-pilot-world-v2b.js',
  'dudu-story-engine-v2b.js','dudu-pilot-f-v2b.js'])assert.ok(html.includes(script),script);
}
console.log('DUDU V2B: world/scene/NPC knowledge/evidence/restore/endings/safety OK');
