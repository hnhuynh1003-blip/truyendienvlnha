/* DUDU CORE / Foundation V1. Approved structure; no runtime account authority.
 * A system rank is NOT a mission tier, world genre, or player mastery score.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCoreRulesV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const systemRanks=Object.freeze(['F','E','D','C','B','A','S']);
 const missionTiers=Object.freeze(['F','E']);
 const genreIds=Object.freeze(['ancient','modern','era','future','cultivation','apocalypse']);
 const access=Object.freeze({
  F:'dispatch_only',E:'dispatch_only',D:'dispatch_only',C:'dispatch_only',
  B:'genre_choice',A:'eligible_small_world',S:'licensed_story_routes'
 });
 const requiredAssessmentF=3;
 function accessFor(rank){
  return Object.prototype.hasOwnProperty.call(access,rank)?access[rank]:null;
 }
 function canRequest({systemRank,selection,genreId,smallWorldId,storyId}={}){
  const scope=accessFor(systemRank);
  if(!scope)return {allowed:false,reason:'unknown_system_rank'};
  if(selection==='dispatch')return {allowed:true,reason:'dispatch_only'};
  if(selection==='genre'&&scope!=='dispatch_only'&&genreIds.includes(genreId))
   return {allowed:true,reason:'server_eligibility_required'};
  if(selection==='small_world'&&(scope==='eligible_small_world'||scope==='licensed_story_routes')&&
    typeof smallWorldId==='string'&&smallWorldId.length>0)
   return {allowed:true,reason:'server_eligibility_required'};
  if(selection==='story'&&scope==='licensed_story_routes'&&typeof storyId==='string'&&storyId.length>0)
   return {allowed:true,reason:'server_license_required'};
  return {allowed:false,reason:'rank_or_selection_restricted'};
 }
 function assessmentSummary(missions){
  const completed=Array.isArray(missions)?missions.filter(x=>x&&x.tier==='F'&&
   x.verified===true&&x.status==='completed'&&typeof x.missionId==='string'):[];
  const distinct=new Set(completed.map(x=>x.missionId));
  return Object.freeze({verifiedDistinctF:distinct.size,required:requiredAssessmentF,
   finished:distinct.size>=requiredAssessmentF});
 }
 const api={
  version:1,systemRanks,missionTiers,genreIds,requiredAssessmentF,
  originTypes:Object.freeze(['regular','irregular','unknown']),
  hostStats:Object.freeze(['appearance','stamina','agility','spirit','luck','fortune']),
  progressionFields:Object.freeze(['systemXP','hostMasteryXP','accessMerit']),
  accessFor,canRequest,assessmentSummary,
  // Read-only world prototypes must never become contract/reward authority.
  canSignPact:()=>false,canGrantReward:()=>false,canAssignRealMission:()=>false
 };
 return Object.freeze(api);
});
