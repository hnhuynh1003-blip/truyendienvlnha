import {RuleError,clone} from '../combat-core.mjs';
import {WAVES} from './waves-state.mjs';
export const EXPLORATION_RUN_ID='mod-p3-run-v1';
export const EXPLORATION_VERSION='mod-p3-reference-1';
export const P3_ENEMIES=Object.freeze([WAVES[0],Object.freeze({...WAVES[1],attack:24}),WAVES[2]]);
export const NEST_DANGER=Object.freeze([3,4,7]);
const terminal=['CLAIMED','FAILED','SKIPPED'];
const fail=(code,message=code)=>{throw new RuleError(code,message);};
export const isP3Run=id=>id===EXPLORATION_RUN_ID||/^mod-p3-[0-9a-f-]{36}$/.test(id);
export function freshExploration(){return {version:3,rulesVersion:EXPLORATION_VERSION,floorId:'floor-1',status:'NOT_STARTED',waveIndex:0,attempt:0,armor:0,encounters:[],cleared:false,receipt:null,events:[],opportunities:{herb:{status:'AVAILABLE',position:0,receipt:null},egg:{status:'AVAILABLE',position:0,receipt:null}}};}
export const p3ChainOpen=s=>['ACTIVE','BETWEEN','EXPLORING'].includes(s.dungeon.status);
export const opportunityKind=s=>s.dungeon.waveIndex===0?'herb':s.dungeon.waveIndex===1?'egg':null;
export function p3Defense(s){const d=s.dungeon,b=s.battle;if(d.waveIndex===0)return b.phase===0&&!b.weaken?24:6;return P3_ENEMIES[d.waveIndex].defense+(d.waveIndex===1?d.armor:0);}
export function refreshEnemy(s){if(s.battle?.state==='ACTIVE')s.battle.enemy.defense=p3Defense(s);}
export function configureExploration(s,type){const d=s.dungeon;if(type==='START'){d.waveIndex=0;d.attempt++;d.encounters=[];}else{const op=d.opportunities[opportunityKind(s)];if(!terminal.includes(op.status))op.status='SKIPPED';d.waveIndex++;}d.armor=0;s.battle.enemy=clone(P3_ENEMIES[d.waveIndex]);s.battle.enemyHp=s.battle.enemy.maxHp;d.status='ACTIVE';refreshEnemy(s);}
export function checkExploration(s,c){const d=s.dungeon;
 if(!['START','NEXT_WAVE','ACTION','REST','OPEN_EVENT','HERB_PICK','EGG_STEP','RETREAT_SAFE'].includes(c.type)||c.purpose!==undefined)fail('P3_COMMAND_ONLY');
 if(c.type==='START'&&(c.floorId!=='floor-1'||p3ChainOpen(s)))fail('RESUME_CHAIN','Tiếp tục chuỗi đang dở; không tạo lại cơ hội bằng Bắt đầu.');
 if(c.type==='REST'&&p3ChainOpen(s))fail('CHAIN_ACTIVE','Chưa thể hồi đầy giữa chuỗi. Rút lui ở điểm an toàn nếu muốn kết thúc.');
 if(c.type==='NEXT_WAVE'&&(!['BETWEEN','EXPLORING'].includes(d.status)||d.waveIndex>=2||c.encounterId!==s.battle?.id))fail('NO_NEXT_WAVE');
 if(c.type==='ACTION'&&(d.status!=='ACTIVE'||!Number.isSafeInteger(c.completedAt)||c.completedAt<=0))fail('INVALID_P3_ACTION');
 if(['OPEN_EVENT','HERB_PICK','EGG_STEP','RETREAT_SAFE'].includes(c.type)&&!['BETWEEN','EXPLORING'].includes(d.status))fail('NOT_SAFE_POINT');
}
export function recordExplorationBattle(s,c){const d=s.dungeon,b=s.battle;
 if(d.waveIndex===1){if(['guard','ward'].includes(c.action))d.armor=0;else if(['basic','cleave','suppress'].includes(c.action))d.armor=Math.min(16,d.armor+8);}
 if(b.state==='ACTIVE'){refreshEnemy(s);return;}
 d.encounters.push({waveIndex:d.waveIndex,encounterId:b.id,outcome:b.state,hp:b.hp,ll:b.ll,turns:b.log.length});
 d.status=b.state==='WON'?(d.waveIndex===2?'WON':'BETWEEN'):b.state;
}
function collect(s,c,kind,quality){const op=s.dungeon.opportunities[kind],id=`${kind}-${s.runId}`,receiptId=`pickup-${id}`;
 if(s.inventory.loot.some(i=>i.instanceId===id))fail('ALREADY_COLLECTED');
 const item={instanceId:id,itemId:kind==='herb'?'mock-spirit-herb':'mock-beast-egg',ownerId:s.ownerId,runId:s.runId,source:kind==='herb'?'HERB_PATCH':'BEAST_NEST',quality,state:kind==='herb'?'MATERIAL':'UNHATCHED',quantity:1,receiptId,collectedAt:c.completedAt,environment:s.environment,productionRedeemable:false};
 s.inventory.loot.push(item);op.status='CLAIMED';op.receipt={id:receiptId,commandId:c.id,instanceId:id,source:item.source,ownerId:s.ownerId,runId:s.runId,quality,collectedAt:c.completedAt,environment:s.environment};
}
export function applyExploration(s,c){const d=s.dungeon,kind=opportunityKind(s),op=d.opportunities[kind];
 if(c.type==='RETREAT_SAFE'){if(op?.status==='ACTIVE')op.status='SKIPPED';d.status='RETREATED';return;}
 if(!op)fail('NO_OPPORTUNITY');
 if(c.type==='OPEN_EVENT'){if(terminal.includes(op.status))fail('OPPORTUNITY_USED','Cơ hội của run này đã giải quyết.');op.status='ACTIVE';d.status='EXPLORING';return;}
 if(op.status!=='ACTIVE'||d.status!=='EXPLORING')fail('EVENT_NOT_ACTIVE');
 if(!Number.isSafeInteger(c.completedAt)||c.completedAt<=0)fail('INVALID_PICKUP_TIME');
 if(c.type==='HERB_PICK'){
  if(kind!=='herb'||!Number.isInteger(c.force)||c.force<0||c.force>100)fail('INVALID_FORCE');
  op.position=c.force;if(c.force>=45&&c.force<=65)collect(s,c,kind,c.force>=50&&c.force<=60?'FINE':'COMMON');else op.status='FAILED';
 }else if(c.type==='EGG_STEP'){
  if(kind!=='egg'||!Number.isInteger(c.to)||c.to<0||c.to>8||Math.abs((op.position%3)-(c.to%3))+Math.abs(Math.floor(op.position/3)-Math.floor(c.to/3))!==1)fail('INVALID_NEST_STEP');
  op.position=c.to;if(NEST_DANGER.includes(c.to))op.status='FAILED';else if(c.to===8)collect(s,c,kind,'MOCK');
 }else fail('UNKNOWN_EXPLORATION_COMMAND');
}
export function validateExploration(s){const d=s.dungeon;
 if(!isP3Run(s.runId)||d.rulesVersion!==EXPLORATION_VERSION||!Number.isInteger(d.waveIndex)||d.waveIndex<0||d.waveIndex>2||!Number.isSafeInteger(d.attempt)||d.attempt<0||![0,8,16].includes(d.armor)||!['NOT_STARTED','ACTIVE','BETWEEN','EXPLORING','WON','LOST','RETREATED'].includes(d.status)||!Array.isArray(d.encounters)||!Array.isArray(s.inventory.loot)||s.inventory.loot.length>2||!d.opportunities)fail('INVALID_P3_SAVE');
 for(const kind of ['herb','egg']){const op=d.opportunities[kind];if(!op||!['AVAILABLE','ACTIVE',...terminal].includes(op.status)||!Number.isInteger(op.position)||op.position<0||op.position>(kind==='herb'?100:8))fail('INVALID_OPPORTUNITY');const items=s.inventory.loot.filter(i=>i.instanceId===`${kind}-${s.runId}`);if(items.length!==(op.status==='CLAIMED'?1:0)||!!op.receipt!==(op.status==='CLAIMED'))fail('INVALID_LOOT');if(items.length){const i=items[0],r=op.receipt;if(i.ownerId!==s.ownerId||i.runId!==s.runId||i.quantity!==1||i.environment!==s.environment||i.productionRedeemable!==false||i.receiptId!==r.id||r.instanceId!==i.instanceId||r.id!==`pickup-${i.instanceId}`||r.ownerId!==s.ownerId||r.runId!==s.runId||r.quality!==i.quality||r.collectedAt!==i.collectedAt||r.source!==i.source||r.environment!==s.environment||!Number.isSafeInteger(i.collectedAt)||i.collectedAt<=0||i.itemId!==(kind==='herb'?'mock-spirit-herb':'mock-beast-egg')||i.state!==(kind==='herb'?'MATERIAL':'UNHATCHED')||i.source!==(kind==='herb'?'HERB_PATCH':'BEAST_NEST')||!(kind==='herb'?['COMMON','FINE']:['MOCK']).includes(i.quality))fail('INVALID_LOOT_OWNER');}}
 if(new Set(s.inventory.loot.map(i=>i.instanceId)).size!==s.inventory.loot.length||s.inventory.loot.some(i=>!['herb','egg'].some(k=>i.instanceId===`${k}-${s.runId}`)))fail('INVALID_LOOT');
 if(!s.battle){if(d.status!=='NOT_STARTED'||d.attempt!==0||d.encounters.length)fail('INVALID_P3_SAVE');return;}
 const expected=clone(P3_ENEMIES[d.waveIndex]);expected.defense=s.battle.state==='ACTIVE'?p3Defense(s):s.battle.enemy.defense;
 if(JSON.stringify(s.battle.enemy)!==JSON.stringify(expected))fail('INVALID_P3_SNAPSHOT');
 if(['BETWEEN','EXPLORING'].includes(d.status)?s.battle.state!=='WON':d.status==='RETREATED'?!(s.battle.state==='RETREATED'||s.battle.state==='WON'):s.battle.state!==d.status)fail('INVALID_P3_STATUS');
 const count=d.status==='ACTIVE'?d.waveIndex:d.waveIndex+1;if(d.encounters.length!==count||new Set(d.encounters.map(e=>e.encounterId)).size!==d.encounters.length||d.encounters.some((e,i)=>e.waveIndex!==i||i<d.waveIndex&&e.outcome!=='WON'))fail('INVALID_P3_HISTORY');
 if(d.status==='WON'&&(!d.cleared||d.waveIndex!==2)||['BETWEEN','EXPLORING'].includes(d.status)&&d.waveIndex>=2)fail('BOSS_REQUIRED');
}
export function behaviorText(s){if(s.dungeon.version!==3||!s.battle||s.battle.state!=='ACTIVE')return '';const b=s.battle,d=s.dungeon;
 if(d.waveIndex===0)return b.enemy.defense===24?'Lẩn tránh: Phòng Thủ 24 trong pha ẩn mình. Có thể Thủ để chờ lộ thân, hoặc dùng Hàn giảm nguy hiểm đòn kế.':'Đã lộ thân: Phòng Thủ 6. Đây là lúc dùng đòn mạnh.';
 if(d.waveIndex===1)return `Giáp tích lũy ${d.armor}/16 · Phòng Thủ ${b.enemy.defense}. Mỗi đòn đánh làm tăng 8 giáp cho lượt sau; Thủ hoặc Giáp làm rơi giáp sau lượt. Đọc tụ lực trước trọng kích.`;
 return '';
}
