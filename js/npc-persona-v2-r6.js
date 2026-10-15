/* Preview personas for three EXISTING canonical NPC identities.
 * Sandbox fallback only; author-edited giftPreferences always wins.
 * This module does not create NPCs, portraits, rewards, stories, or unlocks.
 */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?
    require('./npc-relationship-v2-r1.js'):root?.DuduNpcRelationshipV2);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcPersonaR6=api;
})(typeof window!=='undefined'?window:null,function(rules){
  'use strict';
  const PRESETS=Object.freeze({
    c_otk:Object.freeze({name:'Ôn Tri Hành',
      giftPreferences:Object.freeze({likedTags:['PRACTICAL'],dislikedTags:['DANGEROUS'],reactionStyle:'reserved'}),
      portraitKey:'otk',role:'Cố nhân'}),
    c_ttl:Object.freeze({name:'Tô Thanh Lạc',
      giftPreferences:Object.freeze({likedTags:['DRINK_COFFEE'],dislikedTags:['DANGEROUS'],reactionStyle:'gentle'}),
      portraitKey:'ttl',role:'Ký ức'}),
    c_tct:Object.freeze({name:'Thẩm Cẩm Thư',
      giftPreferences:Object.freeze({likedTags:['KEEPSAKE'],dislikedTags:['DANGEROUS'],reactionStyle:'default'}),
      portraitKey:'tct',role:'Cố nhân'})
  });
  function previewNpc(npc){
    if(!npc||typeof npc!=='object')return null;
    const preset=Object.hasOwn(PRESETS,npc.id)&&PRESETS[npc.id].name===npc.name?
      PRESETS[npc.id]:null;
    const preferences=npc.giftPreferences!=null?rules.normalizePreferences(npc.giftPreferences):
      rules.normalizePreferences(preset?.giftPreferences);
    if(!preferences)return null;
    return Object.freeze({...npc,giftPreferences:preferences,
      previewPortraitKey:preset?.portraitKey||null,
      previewPersonaSource:npc.giftPreferences!=null?'author':'sandbox-default'});
  }
  return Object.freeze({PRESETS,previewNpc});
});
