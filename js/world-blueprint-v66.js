/* DUDU World Mission Blueprint V66: author-only OFFLINE draft by missionId.
 * No persistence, publication, pact signing, rewards, or auth authority.
 */
(function(){
 'use strict';
 const roles=Object.freeze(['main','passerby','free']);
 const taxonomy=()=>window.DuduWorldTaxonomyV66;
 const missionFor=id=>taxonomy()?.missions.find(m=>m.missionId===id)||null;
 function makeDraft(missionId){
   const m=missionFor(missionId);if(!m)return null;
   const genre=taxonomy().genres.find(g=>g.genreId===m.genreId);
   return {
     schemaVersion:2,missionId:m.missionId,genreId:m.genreId,genreName:genre.name,
     missionTitle:m.name,tier:m.tier,state:'draft',pactRequired:true,
     scenarioId:null,storyPromptId:null,storyId:null,npcIds:[],
     entryModes:[...roles],
     narrative:{
       premise:m.premise,opening:'',objectives:[],scenes:[],choices:[],
       branches:[],endings:[],failureRules:[]
     },
     identity:{mainRole:'',passerbyRole:'',freeRole:''},
     access:{enabled:false,serverValidated:false,requiresContract:true},
     progression:{enabled:false,systemExp:0,rankPromotion:false},
     rewards:{enabled:false,items:[],currency:0},
     notes:''
   };
 }
 function validateDraft(draft){
   const errors=[];
   if(!draft||typeof draft!=='object'||Array.isArray(draft))return ['invalid_draft'];
   const m=missionFor(draft.missionId);
   if(!m)errors.push('unknown_mission');
   if(draft.schemaVersion!==2)errors.push('schema_version');
   if(m&&(draft.genreId!==m.genreId||draft.tier!==m.tier||draft.missionTitle!==m.name))
     errors.push('mission_identity_mismatch');
   if(draft.state!=='draft')errors.push('draft_only');
   if(draft.pactRequired!==true||draft.access?.requiresContract!==true)
     errors.push('contract_required');
   if(draft.access?.enabled!==false||draft.access?.serverValidated!==false)
     errors.push('access_must_remain_locked');
   if(draft.progression?.enabled!==false||draft.progression?.systemExp!==0||
      draft.progression?.rankPromotion!==false)errors.push('progression_must_remain_locked');
   if(draft.rewards?.enabled!==false||draft.rewards?.currency!==0||
      !Array.isArray(draft.rewards?.items)||draft.rewards.items.length)
     errors.push('rewards_must_remain_disabled');
   if(draft.scenarioId!==null||draft.storyPromptId!==null||draft.storyId!==null)
     errors.push('binding_requires_review');
   if(!Array.isArray(draft.npcIds)||draft.npcIds.length)
     errors.push('npc_binding_requires_review');
   if(!Array.isArray(draft.entryModes)||draft.entryModes.length!==roles.length||
      roles.some(r=>!draft.entryModes.includes(r)))errors.push('entry_modes_mismatch');
   if(!draft.narrative||typeof draft.narrative.premise!=='string'||
      typeof draft.narrative.opening!=='string'||typeof draft.identity!=='object')
     errors.push('narrative');
   for(const key of ['objectives','scenes','choices','branches','endings','failureRules'])
     if(!Array.isArray(draft.narrative?.[key]))errors.push('narrative_'+key);
   return errors;
 }
 window.DuduWorldBlueprintV66=Object.freeze({
   schemaVersion:2,entryModes:roles,makeDraft,validateDraft,canPublish:()=>false
 });
})();