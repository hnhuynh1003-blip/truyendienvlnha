// Read-only projection of the existing MOD-P2 mock contract. No equip or write API.
import {CHARACTER,OWNER_ID,ENVIRONMENT} from '../prototypes/tutien-combat-s/fixture.mjs';
import {DB_NAME,validateRun} from '../prototypes/tutien-combat-s/mock-repository.mjs';
import {WAVES_RUN_ID} from '../prototypes/tutien-combat-s/module/waves-state.mjs';

export function projectStats(state){
 validateRun(state);
 if(state.ownerId!==OWNER_ID||state.runId!==WAVES_RUN_ID||state.environment!==ENVIRONMENT)throw Error('Sai phạm vi snapshot mock.');
 const active=state.battle?.state==='ACTIVE',b=active?state.battle:null,c=b?.character||CHARACTER;
 return Object.freeze({hp:b?.hp??state.hp,ll:b?.ll??state.ll,maxHp:c.maxHp,maxLl:c.maxLl,attack:c.attack,defense:c.defense,
  active,revision:state.revision,healingPowder:state.inventory.healingPowder,
  source:active?'Snapshot trận MOD-P2 đang chạy':'Fixture MOD-P2 và tài nguyên run hiện tại'});
}

export function readStats(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME);
  request.onupgradeneeded=()=>request.transaction.abort(); // Never initialize/migrate from presentation.
  request.onerror=()=>reject(request.error||Error('Chưa có dữ liệu mock.'));
  request.onsuccess=()=>{
   const db=request.result;let projected;
   try{
    const tx=db.transaction('mockTrials','readonly'),get=tx.objectStore('mockTrials').get(`${OWNER_ID}:${WAVES_RUN_ID}`);
    get.onsuccess=()=>{try{projected=projectStats(get.result?.state);}catch(e){tx.abort();reject(e);}};
    tx.oncomplete=()=>{db.close();resolve(projected);};
    tx.onabort=()=>{db.close();reject(tx.error||Error('Không đọc được snapshot mock.'));};
   }catch(e){db.close();reject(e);}
  };
 });
}
