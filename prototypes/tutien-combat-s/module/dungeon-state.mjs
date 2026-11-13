import {RuleError} from '../combat-core.mjs';
import {ENVIRONMENT} from '../fixture.mjs';
import {validateWaves,checkWaves,recordWave} from './waves-state.mjs';
import {validateExploration,checkExploration,recordExplorationBattle} from './exploration-state.mjs';
export const MODULE_RUN_ID='mod-p1-run-v1';
export const FLOOR=Object.freeze({id:'floor-1',name:'Tầng 1 · Nham thú',enemyId:'mock-stone-beast'});
// Read-only presentation fixture. Not a second cultivation ledger or reading proof.
export const CULTIVATION_VIEW=Object.freeze({name:'Tu sĩ vô danh',realm:'Luyện Khí · mốc giả lập',tuVi:0,next:100,weapon:'Kiếm cố định · đã tính trong Công Kích 36'});
export function freshDungeon(){return {version:1,floorId:FLOOR.id,status:'NOT_STARTED',cleared:false,receipt:null,events:[]};}
export function validateDungeon(s){
 const d=s.dungeon;
 if(![1,2,3].includes(d?.version)||d.version===1&&s.runId!==MODULE_RUN_ID||d.floorId!==FLOOR.id||typeof d.cleared!=='boolean'||!Array.isArray(d.events)||d.events.length!==(d.cleared?1:0)||d.cleared!==!!d.receipt||s.inventory.jadeBlank!==0||s.world.sourceClaimed||s.world.jade||s.rewards.length)throw new RuleError('INVALID_DUNGEON','Save phó bản không tương thích; không tự reset.');
 if(d.version===3)validateExploration(s);else if(d.version===2)validateWaves(s);else if(s.battle?s.battle.state!==d.status:d.status!=='NOT_STARTED')throw new RuleError('INVALID_DUNGEON');
 if(d.receipt&&(d.receipt.ownerId!==s.ownerId||d.receipt.runId!==s.runId||d.receipt.floorId!==FLOOR.id||d.receipt.environment!==ENVIRONMENT||d.receipt.productionRedeemable!==false||d.events[0].receiptId!==d.receipt.id))throw new RuleError('INVALID_DUNGEON');
}
export function checkDungeonCommand(s,c){
 if(s.dungeon.version===3)return checkExploration(s,c);
 if(s.dungeon.version===2)return checkWaves(s,c);
 if(!['START','ACTION','REST'].includes(c.type)||c.purpose!==undefined)throw new RuleError('DUNGEON_COMMAND_ONLY','Module chỉ hỗ trợ phó bản, không có bản đồ hoặc chế tác.');
 if(c.type==='START'&&c.floorId!==FLOOR.id)throw new RuleError('UNKNOWN_FLOOR');
 if(c.type==='ACTION'&&(!Number.isSafeInteger(c.completedAt)||c.completedAt<=0))throw new RuleError('INVALID_EVENT_TIME');
}
export function recordDungeonOutcome(s,c){
 const d=s.dungeon,b=s.battle;if(d.version===3)recordExplorationBattle(s,c);else if(d.version===2)recordWave(s,c);else d.status=b.state;
 if(d.status!=='WON'||d.cleared)return;
 const id=`mock-floor-clear-${s.ownerId}-${s.runId}-${FLOOR.id}`;
 d.cleared=true;d.receipt={id,ownerId:s.ownerId,runId:s.runId,floorId:FLOOR.id,encounterId:b.id,commandId:c.id,outcome:'WON',completedAt:c.completedAt,environment:ENVIRONMENT,productionRedeemable:false};
 d.events=[{type:'DUNGEON_FLOOR_CLEARED',ownerId:s.ownerId,floorId:FLOOR.id,runId:s.runId,outcome:'WON',receiptId:id,completedAt:c.completedAt,environment:ENVIRONMENT}];
}
