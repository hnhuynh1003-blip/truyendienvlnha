/* DUDU NPC Relationship R2 — PURE SANDBOX gift decision engine.
 * No writes to inventory, Firestore, Cloudflare, chat or existing gift flow.
 * Caller must verify ownership and commit transaction atomically in R2 integration.
 */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?
    require('./npc-relationship-v2-r1.js'):root?.DuduNpcRelationshipV2);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcGiftR2=api;
})(typeof window!=='undefined'?window:null,function(rules){
  'use strict';
  const NONE=Object.freeze({affinity:0,trust:0});
  const refusal=(reason)=>Object.freeze({status:'REFUSE',reason,consumesItem:false,
    delta:NONE});
  function evaluateGift({npc,item,relationship,now=Date.now(),instanceId,giftEventId}={}){
    if(!rules||!npc||!item||!relationship||!Number.isFinite(now)||
       typeof instanceId!=='string'||!instanceId.trim()||
       typeof giftEventId!=='string'||!giftEventId.trim())
      return refusal('invalid-request');
    if(!relationship.unlocked)return refusal('npc-locked');
    if(!rules.canBeGifted(item))return refusal('not-giftable');
    const tags=rules.itemTags(item);
    if(!tags)return refusal('unknown-item-tags');
    const prefs=rules.normalizePreferences(npc.giftPreferences);
    if(!prefs)return refusal('invalid-npc-preferences');
    const old=relationship.relationshipV2||{};
    if((old.acceptedInstanceIds||[]).includes(instanceId)||
       (old.acceptedGiftEventIds||[]).includes(giftEventId))
      return refusal('already-processed');
    const has=arr=>tags.some(t=>arr.includes(t));
    if(has(prefs.refusedTags))return refusal('boundary-refusal');
    if(has(prefs.dislikedTags))return refusal('disliked-gift');
    const day=new Date(now).toISOString().slice(0,10);
    const count=old.giftDayUtc===day?
      Math.max(0,Number(old.acceptedGiftCountUtc)||0):0;
    if(count>=rules.CONFIG.scoredGiftsPerNpcUtcDay)
      return Object.freeze({status:'COOLDOWN',reason:'daily-limit',
        consumesItem:false,delta:NONE});
    if(Number.isFinite(old.lastGiftAt)&&old.lastGiftAt>0&&
       now-old.lastGiftAt<rules.CONFIG.giftCooldownMs)
      return Object.freeze({status:'COOLDOWN',reason:'five-minute-limit',
        consumesItem:false,delta:NONE});
    const ranked={F:2,E:3,D:4,C:5,B:6,A:6,S:6,SS:6,SSS:6};
    if(!Object.hasOwn(ranked,item.rank))return refusal('invalid-rank');
    const liked=has(prefs.likedTags);
    const base=Math.min(rules.CONFIG.maxAffinityGainPerGift,ranked[item.rank]+(liked?2:0));
    const multiplier=count===0?1:count===1?0.5:0.25;
    const gain=Math.min(rules.CONFIG.maxAffinityGainPerGift,Math.max(1,Math.floor(base*multiplier)));
    const affinity=Number.isFinite(relationship.affinity)?relationship.affinity:20;
    const trust=Number.isFinite(old.trust)?old.trust:0;
    const trustGain=liked&&count===0?1:0;
    // This gift may build trust, but the new ceiling applies only to gains.
    // Legacy affinity above the ceiling is NEVER reduced or overwritten.
    const ceiling=rules.affinityCeiling(trust+trustGain);
    const delta=Object.freeze({affinity:Math.max(0,Math.min(gain,ceiling-affinity)),
      trust:trustGain});
    // Do not consume neutral gifts when the NPC can gain nothing.
    if(delta.affinity===0&&delta.trust===0)return refusal('affinity-locked-by-trust');
    return Object.freeze({status:'ACCEPT',reason:liked?'liked':'neutral',
      consumesItem:true,delta,day,instanceId,giftEventId,
      nextCount:count+1,lastGiftAt:now});
  }
  return Object.freeze({evaluateGift});
});
