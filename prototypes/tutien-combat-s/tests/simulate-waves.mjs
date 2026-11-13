import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createWavesRun} from '../module/module-repository.mjs';
import {planCommand} from '../mock-repository.mjs';
import {invalidReason,intent,damage} from '../combat-core.mjs';
const scripts=[['cleave','basic'],['ward','cleave','basic','basic','basic'],['cleave','suppress','ward','basic','cleave','suppress']];
export function simulate(policy,{potions=1}={}){let s=createWavesRun('balance-reader'),serial=0;s.inventory.healingPowder=potions;const rows=[],send=(type,extra={})=>{s=planCommand(s,{id:`sim-${++serial}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,completedAt:1700000000000+serial,...extra}).state;};
 send('START',{floorId:'floor-1'});
 for(let wave=0;wave<3;wave++){
  const begin={hp:s.hp,ll:s.ll,potions:s.inventory.healingPowder},actions=[];
  while(s.battle.state==='ACTIVE'&&actions.length<100){
   const b=s.battle;let a=policy==='tactical'?scripts[wave][actions.length]||'basic':policy==='attack'?(!invalidReason(b,'cleave',s.inventory.healingPowder)?'cleave':'basic'):policy==='waste'?s.inventory.healingPowder&&s.hp<148?'potion':'basic':['ward','basic','basic'][actions.length%3];
   if(policy==='reactive'){const available=a=>!invalidReason(b,a,s.inventory.healingPowder),kill=['basic','suppress','cleave'].find(a=>available(a)&&damage(b.character.attack,a==='cleave'?1.5:1,b.enemy.defense)>=b.enemyHp);a=kill||(intent(b).kind==='heavy'?(available('suppress')?'suppress':available('ward')?'ward':'guard'):available('cleave')?'cleave':'basic');}
   if(invalidReason(b,a,s.inventory.healingPowder))a='basic';actions.push(a);send('ACTION',{action:a,encounterId:b.id});
  }
  rows.push({wave:wave+1,enemy:s.battle.enemy.label,start:begin,end:{hp:s.hp,ll:s.ll,potions:s.inventory.healingPowder},turns:actions.length,outcome:s.battle.state,actions});
  if(s.dungeon.status!=='BETWEEN')break;send('NEXT_WAVE',{encounterId:s.battle.id});
 }
 return {policy,rows,outcome:s.dungeon.status,cleared:s.dungeon.cleared,receipt:!!s.dungeon.receipt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(['attack','tactical','reactive','waste','loop'].map(p=>simulate(p)),null,2));
