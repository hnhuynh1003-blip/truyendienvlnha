/* DUDU R7: author-only Sandbox draft validation.
 * No server entitlement, collectible minting, automatic NPC unlocking,
 * real profile writes or chapter spoiler publication.
 */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?
    require('./npc-relationship-v2-r1.js'):root?.DuduNpcRelationshipV2);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcAuthorR7=api;
})(typeof window!=='undefined'?window:null,function(rel){
  'use strict';
  const ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/;
  const ALLOWED_PORTRAIT=/^assets\/npc\/[a-zA-Z0-9_-]{1,64}\.(png|jpg|jpeg|webp)$/;
  function normalizeDraft(npc,config){
    if(!rel||!npc||!ID.test(npc.id)||!config||
      typeof config!=='object'||Array.isArray(config))return null;
    const giftPreferences=rel.normalizePreferences(config.giftPreferences);
    if(!giftPreferences)return null;
    // Only packaged, same-origin artwork; never remote URLs or arbitrary paths.
    const portraitPath=config.portraitPath==null||config.portraitPath===''?
      null:config.portraitPath;
    if(portraitPath!==null&&
       (typeof portraitPath!=='string'||!ALLOWED_PORTRAIT.test(portraitPath)))return null;
    return Object.freeze({npcId:npc.id,portraitPath,giftPreferences});
  }
  function validateMilestonePlan(plan,{storyId,npcId,knownChapterIds=[]}={}){
    if(!rel?.validScope('sandbox-author',storyId,npcId)||
       !plan||typeof plan!=='object'||Array.isArray(plan)||!Array.isArray(plan.milestones)||
       plan.milestones.length>12)return null;
    const chapters=new Set(knownChapterIds.filter(x=>typeof x==='string'&&ID.test(x)));
    const ids=new Set(),milestones=[];
    for(const entry of plan.milestones){
      if(!entry||typeof entry!=='object'||!ID.test(entry.id)||
         ids.has(entry.id)||!chapters.has(entry.chapterId))return null;
      // A milestone definition NEVER means verified reader completion.
      ids.add(entry.id);
      milestones.push(Object.freeze({id:entry.id,chapterId:entry.chapterId,
        minimumTrust:Math.max(0,Math.min(100,Number.isInteger(entry.minimumTrust)?
          entry.minimumTrust:0))}));
    }
    return Object.freeze({storyId,npcId,milestones:Object.freeze(milestones),
      mode:'AUTHOR_DRAFT_ONLY',verified:false});
  }
  function previewMilestoneStatus(plan){
    return Object.freeze({readyForPublication:false,verified:false,
      // No browser-side completion flags may be promoted to trusted lore.
      approvedMilestones:Object.freeze([]),completedMilestones:Object.freeze([]),
      count:plan?.milestones?.length||0});
  }
  return Object.freeze({normalizeDraft,validateMilestonePlan,
    previewMilestoneStatus,ALLOWED_PORTRAIT});
});
