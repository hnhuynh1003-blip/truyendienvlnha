import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectStats} from '../../js/tutien-view-ux-r2.mjs';
import {createWavesRun} from '../../prototypes/tutien-combat-s/module/module-repository.mjs';
import {planCommand} from '../../prototypes/tutien-combat-s/mock-repository.mjs';
import {OWNER_ID} from '../../prototypes/tutien-combat-s/fixture.mjs';
const command=(s,type,extra={})=>({id:'ux-'+s.revision,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...extra});
test('UX read projection preserves entire run and uses the existing fixed-sword totals once',()=>{
 const s=createWavesRun(OWNER_ID),before=JSON.stringify(s),v=projectStats(s);
 assert.deepEqual([v.hp,v.maxHp,v.ll,v.maxLl,v.attack,v.defense],[148,148,38,38,36,8]);
 assert.equal(JSON.stringify(s),before);assert(Object.isFrozen(v));assert.equal(v.active,false);
});
test('UX active stats follow committed character snapshot and current resources, without applying statuses twice',()=>{
 let s=createWavesRun(OWNER_ID);s=planCommand(s,command(s,'START',{floorId:'floor-1'})).state;
 s=planCommand(s,command(s,'ACTION',{encounterId:s.battle.id,action:'ward',completedAt:1})).state;
 const before=JSON.stringify(s),v=projectStats(s);
 assert.equal(v.ll,32);assert.equal(v.hp,s.battle.hp);assert.equal(v.attack,s.battle.character.attack);assert.equal(v.defense,s.battle.character.defense);assert.equal(v.defense,8);
 assert.equal(JSON.stringify(s),before);
});
test('UX rejects a different owner and MOD-P2 has no equip command contract',()=>{
 const foreign=createWavesRun('another-owner');assert.throws(()=>projectStats(foreign),/phạm vi/);
 const s=createWavesRun(OWNER_ID),before=JSON.stringify(s);
 assert.throws(()=>planCommand(s,command(s,'EQUIP_JADE',{enabled:true})),/DUNGEON_COMMAND_ONLY/);
 assert.equal(JSON.stringify(s),before);
});
