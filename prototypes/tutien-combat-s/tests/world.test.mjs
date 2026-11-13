import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,planCommand} from '../mock-repository.mjs';
import {ensureWorld,CLUES} from '../world-core.mjs';
let sequence=0;
const command=(s,type,extra={})=>({id:`m-${++sequence}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...extra});
const send=(s,type,extra={})=>planCommand(s,command(s,type,extra)).state;
const move=(s,to)=>send(s,'MOVE',{to});
const act=(s,action)=>send(s,'ACTION',{encounterId:s.battle.id,action});
function observe(s){for(const clue of Object.keys(CLUES))s=send(s,'OBSERVE',{clue});return s;}
function survey(){let s=send(createRun('m-run'),'QUEST_ACCEPT');s=move(s,'fork');s=move(s,'survey');s=observe(s);return send(s,'SOLVE_SURVEY',{choice:'LEFT'});}
function win(s){for(const a of ['cleave','basic','basic','basic'])s=act(s,a);return s;}
function craft(s,variant){s=move(s,'workshop');return send(s,'CRAFT',{variant});}
function finish(s,method){s=move(s,'fog');if(s.world.clues.length<3&&method!=='GUIDE')s=observe(s);s=send(s,'CROSS_FOG',{method,choice:'LEFT'});return send(s,'MARK_ROUTE');}

test('combat branch links result to quest and one shared source entitlement',()=>{
 let s=send(createRun('fight'),'QUEST_ACCEPT');s=move(s,'fork');s=send(s,'START',{purpose:'SOURCE'});assert.equal(s.world.location,'direct');
 s=win(s);assert.equal(s.world.location,'safe');assert.equal(s.world.quest,'MATERIAL_SECURED');assert.equal(s.inventory.jadeBlank,1);
 s=move(s,'fork');s=move(s,'survey');s=observe(s);s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});assert.equal(s.rewards.length,1);assert.equal(s.inventory.jadeBlank,1);
 s=finish(s,'OBSERVE');assert.equal(s.world.quest,'COMPLETE');assert.equal(s.world.routeMarked,true);
});
test('survey then combat does not grant a second jade',()=>{
 let s=survey();assert.equal(s.world.quest,'MATERIAL_SECURED');s=move(s,'fork');s=send(s,'START',{purpose:'SOURCE'});s=win(s);
 assert.equal(s.inventory.jadeBlank,1);assert.equal(s.rewards.length,1);assert.equal(s.rewards[0].source,'survey');
});
for(const variant of ['WARD','GUIDE'])test(`craft ${variant}: exactly one debit/instance, immutable choice, retry`,()=>{
 let s=move(survey(),'workshop');const c=command(s,'CRAFT',{variant});s=planCommand(s,c).state;
 assert.equal(s.world.jade.variant,variant);assert.equal(s.inventory.jadeBlank,0);assert.equal(s.consumptions.filter(r=>r.itemId==='jade-blank').length,1);
 const retry=planCommand(s,c);assert.equal(retry.duplicate,true);assert.deepEqual(retry.state,s);
 assert.throws(()=>send(s,'CRAFT',{variant:variant==='WARD'?'GUIDE':'WARD'}),/đã cam kết/);
 assert.equal(s.world.equipped,null);
});
test('same-revision competing source grants serialize in transaction plans',()=>{
 let s=survey();s.inventory.jadeBlank=0;s.rewards=[];s.world.sourceClaimed=false;s.world.quest='SOURCE_OPEN';
 const a=command(s,'SOLVE_SURVEY',{choice:'LEFT'}),b=command(s,'SOLVE_SURVEY',{choice:'LEFT'});
 s=planCommand(s,a).state;assert.throws(()=>planCommand(s,b),/STALE_REVISION/);assert.equal(s.inventory.jadeBlank,1);
});
test('same-revision competing craft choices only commit one',()=>{
 const s=move(survey(),'workshop'),a=command(s,'CRAFT',{variant:'WARD'}),b=command(s,'CRAFT',{variant:'GUIDE'});
 const next=planCommand(s,a).state;assert.throws(()=>planCommand(next,b),/STALE_REVISION/);assert.equal(next.world.jade.variant,'WARD');assert.equal(next.inventory.jadeBlank,0);
});
test('WARD is +2 defense only on next snapshot; equip changes forbidden during battle',()=>{
 let s=craft(survey(),'WARD');s=send(s,'START');assert.equal(s.battle.character.defense,8);const snapshot=structuredClone(s.battle.character);
 assert.throws(()=>send(s,'EQUIP_JADE',{enabled:true}),/giữa trận/);assert.deepEqual(s.battle.character,snapshot);
 s=act(s,'retreat');s=send(s,'EQUIP_JADE',{enabled:true});assert.deepEqual(s.battle.character,snapshot);
 s=send(s,'START');assert.equal(s.battle.character.defense,10);assert.equal(s.battle.character.attack,36);
 assert.throws(()=>send(s,'EQUIP_JADE',{enabled:false}),/giữa trận/);
 s=act(s,'retreat');s=send(s,'EQUIP_JADE',{enabled:false});s=send(s,'START');assert.equal(s.battle.character.defense,8);
});
test('GUIDE opens hidden route repeatedly without consumption or combat bonus',()=>{
 let s=craft(survey(),'GUIDE');s=send(s,'EQUIP_JADE',{enabled:true});s=send(s,'START');assert.equal(s.battle.character.defense,8);s=act(s,'retreat');
 s=move(s,'fog');const inv=structuredClone(s.inventory),jade=structuredClone(s.world.jade);s=send(s,'CROSS_FOG',{method:'GUIDE'});assert.equal(s.world.location,'marker');
 s=send(s,'MARK_ROUTE');s=move(s,'fog');s=send(s,'CROSS_FOG',{method:'GUIDE'});assert.deepEqual(s.world.jade,jade);assert.deepEqual(s.inventory,inv);
});
test('WARD needs identified wind; no jade route remains available',()=>{
 let s=craft(survey(),'WARD');s=send(s,'EQUIP_JADE',{enabled:true});s=move(s,'fog');s.world.clues=[];
 assert.throws(()=>send(s,'CROSS_FOG',{method:'WARD'}),/dấu gió/);s=send(s,'OBSERVE',{clue:'wind'});s=send(s,'CROSS_FOG',{method:'WARD'});assert.equal(s.world.location,'marker');
});
test('complete without crafting, wrong survey/fog choices do not softlock',()=>{
 let s=send(createRun('no-craft'),'QUEST_ACCEPT');s=move(s,'fork');s=move(s,'survey');assert.throws(()=>send(s,'SOLVE_SURVEY',{choice:'LEFT'}),/ba dấu hiệu/);
 s=observe(s);const inv=structuredClone(s.inventory),hp=s.hp;s=send(s,'SOLVE_SURVEY',{choice:'RIGHT'});assert.deepEqual(s.inventory,inv);assert.equal(s.hp,hp);
 s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});s=move(s,'fog');s=send(s,'CROSS_FOG',{method:'OBSERVE',choice:'CENTER'});assert.equal(s.world.location,'fog');
 s=send(s,'CROSS_FOG',{method:'OBSERVE',choice:'LEFT'});s=send(s,'MARK_ROUTE');assert.equal(s.world.quest,'COMPLETE');assert.equal(s.world.craft,'NOT_CRAFTED');assert.equal(s.inventory.jadeBlank,1);
});
test('completion once, no extra material or EXP, retry returns same receipt',()=>{
 let s=move(survey(),'fog');s=send(s,'CROSS_FOG',{method:'OBSERVE',choice:'LEFT'});const c=command(s,'MARK_ROUTE');s=planCommand(s,c).state;const receipt=structuredClone(s.world.completion);
 assert.deepEqual(planCommand(s,c).state.world.completion,receipt);s=send(s,'MARK_ROUTE');assert.deepEqual(s.world.completion,receipt);assert.equal(s.rewards.length,1);
 for(const key of ['exp','tuVi','currency','level'])assert.equal(Object.hasOwn(s,key),false);
});
test('lost or retreated encounter can still use survey with HP0/no potions',()=>{
 let s=send(createRun('lost'),'QUEST_ACCEPT');s=move(s,'fork');s=send(s,'START',{purpose:'SOURCE'});for(let i=0;i<12;i++)s=act(s,'guard');
 assert.equal(s.hp,0);s.inventory.healingPowder=0;s=move(s,'fork');s=move(s,'survey');s=observe(s);s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});s=finish(s,'OBSERVE');assert.equal(s.world.quest,'COMPLETE');assert.equal(s.hp,0);
});
test('legacy S upgrade preserves all old fields, active battle and previous jade receipt',()=>{
 let legacy=win(send(createRun('legacy'),'START'));delete legacy.world;const before=structuredClone(legacy),upgraded=ensureWorld(legacy);
 const {world,...oldFields}=upgraded;assert.deepEqual(oldFields,before);assert.deepEqual(legacy,before);assert.equal(world.sourceClaimed,true);
 let s=send(upgraded,'QUEST_ACCEPT');assert.equal(s.world.quest,'MATERIAL_SECURED');s=move(s,'fork');s=move(s,'survey');s=observe(s);s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});assert.equal(s.inventory.jadeBlank,1);
 let active=send(createRun('active'),'START');delete active.world;assert.deepEqual(ensureWorld(active).battle,active.battle);
});
test('legacy material with no receipt remains usable and not granted again',()=>{
 const legacy=createRun('legacy-item');delete legacy.world;legacy.inventory.jadeBlank=1;let s=send(legacy,'QUEST_ACCEPT');s=move(s,'fork');s=move(s,'survey');s=observe(s);s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});assert.equal(s.inventory.jadeBlank,1);
 s=craft(s,'GUIDE');assert.equal(s.world.jade.variant,'GUIDE');
});
test('invalid commands preserve inventory, quest and revision',()=>{
 const s=createRun('invalid'),before=structuredClone(s);
 for(const [type,data] of [['MARK_ROUTE',{}],['CRAFT',{variant:'WARD'}],['OBSERVE',{clue:'bad'}],['MOVE',{to:'direct'}],['CROSS_FOG',{method:'GUIDE'}]])assert.throws(()=>send(s,type,data));
 assert.deepEqual(s,before);
});
test('no material -> craft rejected; invalid variant never consumes',()=>{
 const s=move(createRun('empty'),'workshop');assert.throws(()=>send(s,'CRAFT',{variant:'BOTH'}),/WARD hoặc GUIDE/);assert.throws(()=>send(s,'CRAFT',{variant:'WARD'}),/Phôi Ngọc/);assert.equal(s.inventory.jadeBlank,0);
});
test('quest state survives serialization at every major stage',()=>{
 let s=createRun('reload');const restore=()=>{s=JSON.parse(JSON.stringify(s));return s;};assert.equal(restore().world.quest,'NOT_STARTED');
 s=send(s,'QUEST_ACCEPT');assert.equal(restore().world.quest,'SOURCE_OPEN');s=move(s,'fork');s=move(s,'survey');s=observe(s);s=send(s,'SOLVE_SURVEY',{choice:'LEFT'});assert.equal(restore().world.quest,'MATERIAL_SECURED');
 s=move(s,'fog');assert.equal(restore().world.quest,'FINAL_ROUTE_OPEN');s=send(s,'CROSS_FOG',{method:'OBSERVE',choice:'LEFT'});s=send(s,'MARK_ROUTE');assert.equal(restore().world.quest,'COMPLETE');
});
