/* V2B guarded adapter. Keeps Foundation V1 engine immutable and compatible. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?require('./dudu-story-engine-v1.js'):root.DuduStoryEngineV1,
   typeof module==='object'&&module.exports?require('./dudu-world-model-v2b.js'):root.DuduWorldModelV2B);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduStoryEngineV2B=api;
})(typeof window!=='undefined'?window:null,function(base,model){
 'use strict';
 const list=a=>Array.isArray(a)?a:[];
 function validate(s){
  if(!base||!model)return ['missing_core_dependency'];
  const issues=[...base.validate(s)];
  if(!s||!s.world)return [...issues,'missing_world_bible'];
  issues.push(...model.validateScenario(s.world,s));
  for(const scene of Object.values(s.scenes||{}))for(const c of list(scene.choices)){
   if(c.requiresFlags&&!Array.isArray(c.requiresFlags))issues.push('invalid_flag_requirement:'+c.id);
   if(c.requiresNotFlags&&!Array.isArray(c.requiresNotFlags))issues.push('invalid_negative_flag_requirement:'+c.id);
   for(const field of ['visibleIfEvidence','visibleIfFlags','hiddenIfFlags']){
    if(c[field]!==undefined&&(!Array.isArray(c[field])||c[field].some(x=>typeof x!=='string')))
     issues.push('invalid_visibility_rule:'+c.id+':'+field);
   }
  }
  return [...new Set(issues)];
 }
 function visible(c,state){
  if(!c)return false;
  return list(c.visibleIfEvidence).every(e=>state.evidence.includes(e))&&
   list(c.visibleIfFlags).every(f=>state.flags.includes(f))&&
   list(c.hiddenIfFlags).every(f=>!state.flags.includes(f));
 }
 function blocked(c,state){
  return list(c.requiresFlags).some(f=>!state.flags.includes(f))||
    list(c.requiresNotFlags).some(f=>state.flags.includes(f));
 }
 function begin(s){if(validate(s).length)throw Error('invalid_v2b_scenario');return base.begin(s);}
 function view(s,state){
  if(validate(s).length)throw Error('invalid_v2b_scenario');
  const v=base.view(s,state),sc=s.scenes[v.sceneId];
  const choices=v.choices.filter(c=>{
   const raw=sc.choices.find(x=>x.id===c.id);
   return visible(raw,state);
  }).map(c=>{
   const raw=sc.choices.find(x=>x.id===c.id);
   const locked=c.locked||blocked(raw,state);
   return {...c,kind:raw.kind||'action',locked,
    requirementHint:locked?(raw.requirementHint||'Cần hoàn thành bước tìm hiểu trước.'):c.requirementHint};
  });
  const last=state.log[state.log.length-1];
  const previousChoice=last&&s.scenes[last.from]?.choices.find(c=>c.id===last.choiceId);
  return {...v,choices,place:model.placeView(s.world,v.placeId),
   npcDetails:sc.npcId?model.npcView(s.world,sc.npcId,state):null,
   clueDetails:model.knownClues(s.world,v.evidence),
   storyPhase:sc.phase||null,
   passageReaction:typeof previousChoice?.reaction==='string'?previousChoice.reaction:'',
   sceneType:sc.phase==='DẪN TRUYỆN'?'prologue':'story'};
 }
 function decide(s,state,id){
  if(validate(s).length)return {accepted:false,reason:'invalid_scenario',state};
  let v;
  try{v=base.view(s,state);}catch{return {accepted:false,reason:'invalid_state',state};}
  if(state.status!=='playing')return {accepted:false,reason:'already_finished',state};
  const raw=s.scenes[v.sceneId].choices.find(c=>c.id===id);
  if(raw&&!visible(raw,state))return {accepted:false,reason:'undiscovered_action',state};
  if(raw&&blocked(raw,state))return {accepted:false,reason:'missing_story_precondition',state};
  return base.decide(s,state,id);
 }
 function restore(s,v){return validate(s).length?null:base.restore(s,v);}
 function serialize(s,state){if(validate(s).length)throw Error('invalid_v2b_scenario');return base.serialize(s,state);}
 return Object.freeze({version:'2b',validate,begin,view,decide,restore,serialize});
});
