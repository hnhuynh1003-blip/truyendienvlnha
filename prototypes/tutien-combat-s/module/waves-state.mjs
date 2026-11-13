import {RuleError,clone} from '../combat-core.mjs';
export const WAVES_RUN_ID='mod-p2-run-v1';
export const WAVES_VERSION='mod-p2-balance-1';
export const WAVES=Object.freeze([
 Object.freeze({id:'small-stone-beast',label:'Tiểu Nham Thú',maxHp:64,attack:18,defense:6,intents:Object.freeze(['prepare','basic']),boss:false}),
 Object.freeze({id:'stone-beast',label:'Nham Thú',maxHp:100,attack:26,defense:10,intents:Object.freeze(['prepare','heavy','basic']),boss:false}),
 Object.freeze({id:'stone-king',label:'Nham Thú Vương',maxHp:152,attack:30,defense:12,intents:Object.freeze(['prepare','heavy','heavy','basic']),boss:true})
]);
export function freshWaves(){return {version:2,rulesVersion:WAVES_VERSION,floorId:'floor-1',status:'NOT_STARTED',waveIndex:0,attempt:0,encounters:[],cleared:false,receipt:null,events:[]};}
export const chainOpen=s=>s.dungeon.version===2&&['ACTIVE','BETWEEN'].includes(s.dungeon.status);
export function checkWaves(s,c){const d=s.dungeon;
 if(!['START','NEXT_WAVE','ACTION','REST'].includes(c.type)||c.purpose!==undefined)throw new RuleError('DUNGEON_COMMAND_ONLY');
 if(c.type==='START'&&(c.floorId!=='floor-1'||chainOpen(s)))throw new RuleError('RESUME_CHAIN','Hãy tiếp tục chuỗi đang dở, không quay lại ải trước.');
 if(c.type==='NEXT_WAVE'&&(d.status!=='BETWEEN'||d.waveIndex>=2||c.encounterId!==s.battle?.id))throw new RuleError('NO_NEXT_WAVE');
 if(c.type==='REST'&&chainOpen(s))throw new RuleError('CHAIN_ACTIVE','Không hồi đầy giữa chuỗi. Có thể tiếp tục hoặc rút lui trong trận.');
 if(c.type==='ACTION'&&(d.status!=='ACTIVE'||!Number.isSafeInteger(c.completedAt)||c.completedAt<=0))throw new RuleError('INVALID_WAVE_ACTION');
}
export function configureWave(s,type){const d=s.dungeon;if(type==='START'){d.waveIndex=0;d.attempt++;d.encounters=[];}else d.waveIndex++;
 const enemy=clone(WAVES[d.waveIndex]);s.battle.enemy=enemy;s.battle.enemyHp=enemy.maxHp;d.status='ACTIVE';
}
export function recordWave(s,c){const d=s.dungeon,b=s.battle;if(b.state==='ACTIVE')return;
 if(d.encounters.some(e=>e.encounterId===b.id))throw new RuleError('WAVE_ALREADY_RECORDED');
 d.encounters.push({waveIndex:d.waveIndex,encounterId:b.id,outcome:b.state,hp:b.hp,ll:b.ll,turns:b.log.length});
 d.status=b.state==='WON'?(d.waveIndex===2?'WON':'BETWEEN'):b.state;
}
export function validateWaves(s){const d=s.dungeon;
 if(s.runId!==WAVES_RUN_ID||d.rulesVersion!==WAVES_VERSION||!Number.isInteger(d.waveIndex)||d.waveIndex<0||d.waveIndex>2||!Number.isSafeInteger(d.attempt)||d.attempt<0||!['NOT_STARTED','ACTIVE','BETWEEN','WON','LOST','RETREATED'].includes(d.status)||!Array.isArray(d.encounters))throw new RuleError('INVALID_WAVES');
 if(!s.battle){if(d.status!=='NOT_STARTED'||d.attempt!==0||d.encounters.length)throw new RuleError('INVALID_WAVES');return;}
 const expected=WAVES[d.waveIndex];if(JSON.stringify(s.battle.enemy)!==JSON.stringify(expected))throw new RuleError('INVALID_WAVE_SNAPSHOT');
 if(d.status==='BETWEEN'?(s.battle.state!=='WON'||d.waveIndex>=2):s.battle.state!==d.status)throw new RuleError('INVALID_WAVE_STATUS');
 const done=d.status==='ACTIVE'?d.waveIndex:d.waveIndex+1;if(d.encounters.length!==done||d.encounters.some((e,i)=>e.waveIndex!==i||(i<d.waveIndex&&e.outcome!=='WON'))||new Set(d.encounters.map(e=>e.encounterId)).size!==d.encounters.length)throw new RuleError('INVALID_WAVE_HISTORY');
 if(d.status==='WON'&&!d.cleared)throw new RuleError('BOSS_REQUIRED');
}
