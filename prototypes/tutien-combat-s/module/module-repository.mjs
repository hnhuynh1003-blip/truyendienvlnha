import {MockRepository,createRun,validateRun,createExplorationRun} from '../mock-repository.mjs';
import {freshDungeon,MODULE_RUN_ID} from './dungeon-state.mjs';
import {freshWaves,WAVES_RUN_ID} from './waves-state.mjs';
import {EXPLORATION_RUN_ID,isP3Run} from './exploration-state.mjs';
export function createModuleRun(ownerId){const s=createRun(MODULE_RUN_ID,ownerId);s.dungeon=freshDungeon();return s;}
export function createWavesRun(ownerId){const s=createRun(WAVES_RUN_ID,ownerId);s.dungeon=freshWaves();return s;}
export async function openModule(options={}){
 const waves=options.edition==='waves',explore=options.edition==='explore',runId=explore?(options.explorationRunId||EXPLORATION_RUN_ID):waves?WAVES_RUN_ID:MODULE_RUN_ID;
 if(explore&&!isP3Run(runId))throw Error('Invalid exploration run');
 const repo=await MockRepository.open({...options,trialRunId:runId});
 try{
  await new Promise((resolve,reject)=>{
   const tx=repo.db.transaction('mockTrials','readwrite'),store=tx.objectStore('mockTrials'),key=`${repo.ownerId}:${runId}`,req=store.get(key);let failure;
   req.onsuccess=()=>{try{if(req.result){const s=req.result.state;validateRun(s);if(!s.dungeon||s.ownerId!==repo.ownerId||s.runId!==runId)throw Error('Module save scope mismatch');}else{if(explore&&options.explorationRunId&&runId!==EXPLORATION_RUN_ID)throw Error('Unknown exploration trial; original save unchanged');store.add({key,state:explore?createExplorationRun(runId,repo.ownerId):waves?createWavesRun(repo.ownerId):createModuleRun(repo.ownerId)});}}catch(e){failure=e;tx.abort();}};
   tx.oncomplete=resolve;tx.onabort=()=>reject(failure||tx.error||Error('Module storage aborted'));tx.onerror=()=>{};
  });
  return repo;
 }catch(e){repo.close();throw e;}
}
