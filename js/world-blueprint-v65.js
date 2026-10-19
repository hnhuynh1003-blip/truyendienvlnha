/* DUDU V65 — offline, author-side world scenario blueprint.
 * A template is never gameplay or publication. No Firestore, network, account writes.
 */
(function () {
 'use strict';
 const MODES=Object.freeze(['main','passerby','free']);
 const supportedWorld=id=>{
   const worlds=window.DuduWorldRegistryV63?.starterWorlds||[];
   return worlds.find(w=>w.worldId===id&&w.status==='planned')||null;
 };
 function makeDraft(worldId) {
   const world=supportedWorld(worldId);
   if(!world)return null; // Unknown coordinates are not eligible for scenario templates.
   return {
     schemaVersion:1,
     worldId:world.worldId,
     worldName:world.name,
     tier:world.tier,
     state:'draft',
     storyPromptId:null,
     scenarioId:null,
     storyId:null,
     npcIds:[],
     entryModes:[...MODES],
     narrative:{
       premise:'',
       opening:'',
       objectives:[],
       scenes:[],
       branches:[],
       endings:[]
     },
     identity:{
       mainRole:'',
       passerbyRole:'',
       freeRole:''
     },
     access:{enabled:false,serverValidated:false},
     rewards:{enabled:false,items:[],currency:0},
     notes:''
   };
 }
 function validateDraft(draft) {
   const errors=[];
   if(!draft||typeof draft!=='object'||Array.isArray(draft))return ['invalid_draft'];
   const world=supportedWorld(draft.worldId);
   if(!world)errors.push('unknown_or_unverified_world');
   if(draft.schemaVersion!==1)errors.push('schema_version');
   if(world&&(draft.worldName!==world.name||draft.tier!==world.tier))errors.push('world_identity_mismatch');
   if(draft.state!=='draft')errors.push('draft_only');
   if(draft.access?.enabled!==false||draft.access?.serverValidated!==false)errors.push('access_must_remain_locked');
   if(draft.rewards?.enabled!==false||draft.rewards?.currency!==0||
      !Array.isArray(draft.rewards?.items)||draft.rewards.items.length)errors.push('rewards_must_remain_disabled');
   if(!Array.isArray(draft.entryModes)||draft.entryModes.length!==MODES.length||
      MODES.some(mode=>!draft.entryModes.includes(mode)))errors.push('entry_modes_mismatch');
   if(!Array.isArray(draft.npcIds))errors.push('npc_ids');
   if(!draft.narrative||typeof draft.narrative!=='object'||typeof draft.narrative.premise!=='string'||
      typeof draft.narrative.opening!=='string')errors.push('narrative');
   for(const key of ['objectives','scenes','branches','endings']){
     if(!Array.isArray(draft.narrative?.[key]))errors.push('narrative_'+key);
   }
   return errors;
 }
 window.DuduWorldBlueprintV65=Object.freeze({
   schemaVersion:1,
   entryModes:MODES,
   makeDraft,
   validateDraft,
   canPublish:()=>false // Publication needs a future server-authorized pipeline.
 });
})();
