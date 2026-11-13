/* DUDU Foundation / deterministic standalone scene engine.
 * Pure game simulation: does not call AI, Firebase, network, economy, or local storage.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduStoryEngineV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const cleanArray=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
 const unique=v=>[...new Set(v)];
 const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function validate(s){
  const errors=[];
  if(!plain(s)||s.schemaVersion!==1)return ['scenario_schema'];
  if(s.status!=='pilot_only'||s.released!==false||s.rewardsEnabled!==false)
   errors.push('pilot_must_stay_locked');
  if(!/^dudu-m-[a-z]{2}-[fe][0-9]{2}$/.test(s.missionId||'')||s.tier!=='F')
   errors.push('pilot_mission_identity');
  if(!/^[-a-z0-9]+$/.test(s.scenarioId||''))errors.push('scenario_id');
  if(!plain(s.places)||!Object.keys(s.places).length)errors.push('places_missing');
  if(!plain(s.scenes)||!own(s.scenes,s.startSceneId))errors.push('starting_scene_missing');
  if(!plain(s.endings)||Object.keys(s.endings).length<2)errors.push('endings_missing');
  if(typeof s.worldCover!=='string'||!s.worldCover.startsWith('assets/worlds/'))
   errors.push('world_cover_missing');
  for(const [key,p] of Object.entries(s.places||{})){
   if(!plain(p)||typeof p.label!=='string'||!p.label||
    !/^assets\/worlds\/[a-z0-9/_-]+\.svg$/.test(p.background||''))
    errors.push('place_asset:'+key);
  }
  const seen=new Set();
  for(const [key,scene] of Object.entries(s.scenes||{})){
   if(!plain(scene)||typeof scene.title!=='string'||typeof scene.text!=='string'||
     !own(s.places||{},scene.placeId)||!Array.isArray(scene.choices)||!scene.choices.length){
    errors.push('invalid_scene:'+key);continue;
   }
   for(const c of scene.choices){
    if(!plain(c)||!c.id||!c.label||seen.has(c.id)){errors.push('invalid_choice:'+key);continue;}
    seen.add(c.id);
    if(!!c.to===!!c.ending)errors.push('choice_requires_exactly_one_destination:'+c.id);
    if(c.to&&!own(s.scenes||{},c.to))errors.push('unknown_scene:'+c.id);
    if(c.ending&&!own(s.endings||{},c.ending))errors.push('unknown_ending:'+c.id);
    if(c.requires&&!Array.isArray(c.requires))errors.push('choice_requirements:'+c.id);
   }
  }
  for(const [k,e] of Object.entries(s.endings||{})){
   if(!plain(e)||!['success','failure'].includes(e.status)||
    typeof e.title!=='string'||typeof e.text!=='string')errors.push('ending:'+k);
  }
  return unique(errors);
 }
 function begin(s){
  if(validate(s).length)throw new Error('invalid_pilot_scenario');
  return {version:1,missionId:s.missionId,scenarioId:s.scenarioId,
   sceneId:s.startSceneId,status:'playing',endingId:null,step:0,
   evidence:[],flags:[],usedChoices:[],relations:{},log:[]};
 }
 function verifyState(s,state){
  if(!plain(state)||state.version!==1||state.missionId!==s.missionId||
     state.scenarioId!==s.scenarioId||!own(s.scenes,state.sceneId)||
     !['playing','success','failure'].includes(state.status)||
     !Number.isSafeInteger(state.step)||state.step<0||state.step>10000||
     !Array.isArray(state.evidence)||!Array.isArray(state.flags)||
     !Array.isArray(state.usedChoices)||!Array.isArray(state.log)||
     !plain(state.relations)||state.log.length>100||
     state.evidence.some(x=>typeof x!=='string')||
     state.flags.some(x=>typeof x!=='string')||
     state.usedChoices.some(x=>typeof x!=='string')||
     (state.status!=='playing'&&!own(s.endings,state.endingId))||
     (state.status==='playing'&&state.endingId!==null))return false;
  return true;
 }
 function view(s,state){
  if(!verifyState(s,state))throw new Error('invalid_state');
  const scene=s.scenes[state.sceneId];
  const available=scene.choices.filter(c=>!c.once||!state.usedChoices.includes(c.id));
  return {missionId:s.missionId,scenarioId:s.scenarioId,sceneId:state.sceneId,
   title:scene.title,text:scene.text,npc:scene.npc||'',
   placeId:scene.placeId,place:s.places[scene.placeId],
   choices:available.map(c=>({id:c.id,label:c.label,
    locked:cleanArray(c.requires).some(k=>!state.evidence.includes(k)),
    requirementHint:c.requirementHint||'Cần thêm thông tin trước khi kết luận.'})),
   evidence:state.evidence.slice(),relations:{...state.relations},
   status:state.status,ending:state.endingId?s.endings[state.endingId]:null};
 }
 function decide(s,state,choiceId){
  if(!verifyState(s,state))return {accepted:false,reason:'invalid_state',state};
  if(state.status!=='playing')return {accepted:false,reason:'already_finished',state};
  if(state.step>=10000)return {accepted:false,reason:'step_limit',state};
  const choice=s.scenes[state.sceneId].choices.find(c=>c.id===choiceId);
  if(!choice)return {accepted:false,reason:'unknown_choice',state};
  if(choice.once&&state.usedChoices.includes(choice.id))
   return {accepted:false,reason:'already_used',state};
  if(cleanArray(choice.requires).some(k=>!state.evidence.includes(k)))
   return {accepted:false,reason:'missing_evidence',state};
  const newState={
   ...state,step:state.step+1,sceneId:choice.to||state.sceneId,
   evidence:unique([...state.evidence,...cleanArray(choice.gainEvidence)]),
   flags:unique([...state.flags,...cleanArray(choice.addFlags)]),
   usedChoices:choice.once?[...state.usedChoices,choice.id]:state.usedChoices.slice(),
   relations:{...state.relations},
   log:[...state.log,{choiceId:choice.id,from:state.sceneId,to:choice.to||null,
    ending:choice.ending||null,step:state.step+1}].slice(-100)
  };
  if(plain(choice.relations)){
   for(const [npc,delta] of Object.entries(choice.relations)){
    if(Number.isInteger(delta))newState.relations[npc]=Math.max(-10,
     Math.min(10,(newState.relations[npc]||0)+delta));
   }
  }
  if(choice.ending){
   newState.endingId=choice.ending;newState.status=s.endings[choice.ending].status;
  }
  return {accepted:true,reason:null,state:newState};
 }
 function restore(s,serialized){
  if(validate(s).length||typeof serialized!=='string'||serialized.length>24000)return null;
  try{
   const parsed=JSON.parse(serialized);
   return verifyState(s,parsed)?parsed:null;
  }catch{return null;}
 }
 function serialize(s,state){
  if(!verifyState(s,state))throw new Error('invalid_state');
  return JSON.stringify(state);
 }
 return Object.freeze({version:1,validate,begin,view,decide,restore,serialize});
});
