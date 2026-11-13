import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, planCommand, MockRepository } from '../mock-repository.mjs';
let seq=0;
function command(s,type,more={}) { return {id:`test-${++seq}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...more}; }
function send(s,type,more={}) { return planCommand(s,command(s,type,more)).state; }
function act(s,action){return send(s,'ACTION',{encounterId:s.battle.id,action});}
function win(s){for(const a of ['cleave','basic','basic','basic'])s=act(s,a);return s;}

test('dedup before stale revision; same ID different payload rejected',()=>{
 let s=createRun('run'),c=command(s,'START'); const p=planCommand(s,c);s=p.state;
 const retry=planCommand(s,c);assert.equal(retry.duplicate,true);assert.deepEqual(retry.reply,p.reply);assert.deepEqual(retry.state,s);
 assert.throws(()=>planCommand(s,{...c,type:'REST'}),/COMMAND_ID_REUSED/);
});
test('competing different commands same revision only first accepted',()=>{
 const s=createRun('run'),a=command(s,'START'),b=command(s,'START');const next=planCommand(s,a).state;
 assert.throws(()=>planCommand(next,b),/STALE_REVISION/);assert.equal(next.encounterSequence,1);
});
test('potion, journal and battle are one immutable transaction plan',()=>{
 let s=send(createRun('run'),'START');s=act(s,'basic');s=act(s,'basic');
 const c=command(s,'ACTION',{encounterId:s.battle.id,action:'potion'}),before=structuredClone(s);const next=planCommand(s,c).state;
 assert.deepEqual(s,before);assert.equal(next.inventory.healingPowder,0);assert.equal(next.consumptions.length,1);assert.equal(next.hp,109);
 const restored=structuredClone(next);assert.equal(planCommand(restored,c).state.consumptions.length,1);
});
test('full HP rejected without mutation/debit/revision',()=>{
 const s=send(createRun('run'),'START'),c=command(s,'ACTION',{encounterId:s.battle.id,action:'potion'});const before=structuredClone(s);
 assert.throws(()=>planCommand(s,c),/đầy/);assert.deepEqual(s,before);
});
test('first win only once per run, repeat has result but no second jade',()=>{
 let s=win(send(createRun('run'),'START'));assert.equal(s.rewards.length,1);assert.equal(s.inventory.jadeBlank,1);
 assert.equal(s.rewards[0].environment,'MOCK_ONLY');assert.equal(s.rewards[0].productionRedeemable,false);
 assert.throws(()=>act(s,'basic'),/kết thúc/);
 s=send(s,'REST');s=win(send(s,'START'));assert.equal(s.rewards.length,1);assert.equal(s.inventory.jadeBlank,1);
 assert.equal('exp' in s,false);assert.equal('tuVi' in s,false);
});
test('retreat and loss do not grant; rest not a potion refill',()=>{
 let s=send(createRun('run'),'START');s=act(s,'basic');s=act(s,'basic');s=act(s,'potion');s=act(s,'retreat');
 assert.equal(s.hp,109);assert.equal(s.rewards.length,0);s=send(s,'REST');assert.equal(s.hp,148);assert.equal(s.inventory.healingPowder,0);
 s=send(s,'START');for(let i=0;i<12;i++)s=act(s,'guard');assert.equal(s.battle.state,'LOST');assert.equal(s.rewards.length,0);
 assert.throws(()=>send(s,'START'),/Hãy nghỉ/);
});
test('wrong owner, run and encounter rejected; no account migration',()=>{
 const s=send(createRun('run'),'START');const c=command(s,'ACTION',{encounterId:s.battle.id,action:'basic'});
 for(const change of [{ownerId:'other'},{runId:'old-run'},{encounterId:'old-encounter'}])assert.throws(()=>planCommand(s,{...c,...change}),/WRONG_/);
});
test('schema mismatch preserved; unsupported IndexedDB fails explicitly',async()=>{
 const s={...createRun('run'),schemaVersion:99};assert.throws(()=>planCommand(s,command(s,'START')),/không tương thích/);assert.equal(s.schemaVersion,99);
 await assert.rejects(MockRepository.open({indexedDB:null}),/IndexedDB/);
 const broken=new MockRepository({transaction(){throw Error('disk unavailable');}});await assert.rejects(broken.read(),/disk unavailable/);
});
