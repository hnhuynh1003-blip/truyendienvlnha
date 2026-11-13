import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SPECIMEN,specimenView} from '../jade-adapter.mjs';
import {createRun,createJadeTrialRun,planCommand} from '../mock-repository.mjs';
const original=createRequire(import.meta.url)('../../../js/personal-jade-core-v1.js');
let n=0;const command=(s,type,data={})=>({id:`jade-${++n}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...data});
const send=(s,type,data)=>planCommand(s,command(s,type,data)).state;
function ready(){let s=createJadeTrialRun('jade-run');s=send(s,'QUEST_ACCEPT');s=send(s,'MOVE',{to:'fork'});s=send(s,'MOVE',{to:'survey'});for(const clue of ['wind','water','moss'])s=send(s,'OBSERVE',{clue});s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});s=send(s,'MOVE',{to:'workshop'});return s;}
test('adapter returns exact original helper output without mutating frozen specimen',()=>{const before=JSON.stringify(SPECIMEN);assert.deepEqual(specimenView(),{surface:original.surface(SPECIMEN),hints:[0,1,2].map(i=>original.scanHint(SPECIMEN,i,2))});assert.equal(JSON.stringify(SPECIMEN),before);assert.deepEqual(specimenView(),specimenView());});
for(const [treatment,variant]of [['PRESERVE_CORE','WARD'],['FOLLOW_VEIN','GUIDE']])test(`MR3 ${variant}: one owned sample, preview change, atomic plan, retry/reload and exclusive output`,()=>{
 let s=ready();assert.equal(s.inventory.jadeBlank,0);assert.equal(s.world.jadeTrial.sample.quantity,1);assert.equal(s.rewards.length,1);
 const before=JSON.stringify(s.world.jadeTrial.sample);for(let spot=0;spot<3;spot++)s=send(s,'JADE_OBSERVE',{spot});assert.equal(JSON.stringify(s.world.jadeTrial.sample),before);
 s=send(s,'JADE_SELECT',{treatment:'FOLLOW_VEIN'});s=send(s,'JADE_SELECT',{treatment});const c=command(s,'CRAFT',{variant}),competitor=command(s,'CRAFT',{variant:variant==='WARD'?'GUIDE':'WARD'});s=planCommand(s,c).state;
 assert.equal(s.world.jadeTrial.sample,null);assert.equal(s.world.jade.variant,variant);assert.equal(s.consumptions.length,1);assert.equal(s.consumptions[0].inputInstanceId,'sample-jade-run');
 s=JSON.parse(JSON.stringify(s));assert.equal(s.world.jadeTrial.receipt.commandId,c.id);assert.equal(s.world.jadeTrial.receipt.productionRedeemable,false);assert.equal(planCommand(s,c).duplicate,true);assert.throws(()=>planCommand(s,competitor),e=>e.code==='STALE_REVISION');assert.throws(()=>send(s,'CRAFT',{variant}));
 s=send(s,'EQUIP_JADE',{enabled:true});s=send(s,'START');assert.equal(s.battle.character.defense,variant==='WARD'?10:8);const snap=JSON.stringify(s.battle.character);assert.throws(()=>send(s,'EQUIP_JADE',{enabled:false}));assert.equal(JSON.stringify(s.battle.character),snap);
});
test('MR3 invalid preview/craft cannot debit sample or advance revision',()=>{const s=ready(),copy=JSON.stringify(s);assert.throws(()=>send(s,'CRAFT',{variant:'WARD'}));assert.throws(()=>send(s,'JADE_SELECT',{treatment:'PRESERVE_CORE'}));assert.equal(JSON.stringify(s),copy);});
test('old S/M run read/serialization has no new sample or changed fields',()=>{const old=createRun('old');const saved=JSON.stringify(old);planCommand(old,command(old,'QUEST_ACCEPT'));assert.equal(JSON.stringify(old),saved);assert.equal(old.world.jadeTrial,undefined);});
test('MR3 can finish without crafting and source remains one after another survey',()=>{let s=ready();s=send(s,'MOVE',{to:'fog'});s=send(s,'CROSS_FOG',{method:'OBSERVE',choice:'LEFT'});s=send(s,'MARK_ROUTE');assert.equal(s.world.quest,'COMPLETE');assert.equal(s.world.jadeTrial.sample.quantity,1);assert.equal(s.world.jade,null);s=send(s,'MOVE',{to:'safe'});s=send(s,'MOVE',{to:'fork'});s=send(s,'MOVE',{to:'survey'});s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});assert.equal(s.rewards.length,1);assert.equal(s.inventory.jadeBlank,0);});
