import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,planCommand} from '../mock-repository.mjs';
import {battlePresentation,cooldownRemaining} from '../presentation.mjs';
let n=0;
function send(s,type,extra={}){return planCommand(s,{id:`view-${++n}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...extra}).state;}
function act(s,action){return send(s,'ACTION',{encounterId:s.battle.id,action});}
test('new run is safe, not an encounter with a full enemy HP bar',()=>{
 const s=createRun('view');const p=battlePresentation(s);assert.equal(p.active,false);assert.equal(p.enemyVisible,false);assert.equal(p.hasResult,false);assert.match(p.context,/Chưa có trận/);
});
test('active fight has HUD and controls, pure view never changes state',()=>{
 const s=send(createRun('view'),'START'),before=structuredClone(s);assert.equal(battlePresentation(s).controlsVisible,true);assert.deepEqual(s,before);
});
test('defeat keeps zero HP and result, but hides enemy and battle controls',()=>{
 let s=send(createRun('view'),'START');for(let i=0;i<12;i++)s=act(s,'guard');const before=structuredClone(s);const p=battlePresentation(s);
 assert.equal(s.hp,0);assert.equal(p.enemyVisible,false);assert.equal(p.controlsVisible,false);assert.equal(p.resultTitle,'Chiến bại');assert.match(p.context,/Nghỉ mock/);assert.deepEqual(s,before);
});
test('rest presentation preserves historical result and reward entitlement',()=>{
 let s=send(createRun('view'),'START');for(const a of ['cleave','basic','basic','basic'])s=act(s,a);const result=structuredClone(s.battle.result),rewards=structuredClone(s.rewards);
 s=send(s,'REST');assert.equal(s.hp,148);assert.equal(battlePresentation(s).resultTitle,'Chiến thắng');assert.equal(battlePresentation(s).enemyVisible,false);assert.deepEqual(s.battle.result,result);assert.deepEqual(s.rewards,rewards);
});
test('retreat and unstarted are different presentation states',()=>{
 let s=send(createRun('view'),'START');s=act(s,'retreat');assert.equal(battlePresentation(s).resultTitle,'Đã rút lui');assert.equal(battlePresentation(s).hasResult,true);
});
test('cooldown badge uses core readyAt minus current turn, not elapsed time',()=>{
 let s=send(createRun('view'),'START');s=act(s,'cleave');assert.equal(cooldownRemaining(s.battle,'cleave'),2);
 s=act(s,'guard');assert.equal(cooldownRemaining(s.battle,'cleave'),1);s=act(s,'basic');assert.equal(cooldownRemaining(s.battle,'cleave'),0);
 assert.equal(cooldownRemaining(null,'cleave'),0);assert.equal(cooldownRemaining(s.battle,'basic'),0);
});
