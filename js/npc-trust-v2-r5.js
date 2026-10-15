/* DUDU NPC V2 R5: client-only sandbox trust progression.
 * Never award EXP, coins, inventory, collectibles, or real backend entitlements.
 * AI chat content and chapter read flags are NOT proof of milestone completion.
 */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?
    require('./npc-relationship-v2-r1.js'):root?.DuduNpcRelationshipV2);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcTrustR5=api;
})(typeof window!=='undefined'?window:null,function(rules){
  'use strict';
  const CHECK_IN_GAIN=3;
  function evaluateCheckin({uid,storyId,npcId,unlocked,relationship,now=Date.now(),
    eventId}={}){
    const fail=(reason)=>Object.freeze({ok:false,reason,gain:0});
    if(!rules||!rules.validScope(uid,storyId,npcId)||!unlocked||
       !relationship||!Number.isFinite(now)||now<0||
       typeof eventId!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(eventId))
      return fail('invalid-or-locked');
    const day=new Date(now).toISOString().slice(0,10);
    const existing=relationship.relationshipV2||{};
    const events=Array.isArray(existing.trustEventIds)?existing.trustEventIds:[];
    if(events.includes(eventId))return fail('duplicate');
    if(existing.lastCheckinUtc===day)return fail('daily-limit');
    const oldTrust=Number.isFinite(existing.trust)?
      Math.max(0,Math.min(100,existing.trust)):0;
    const gain=Math.max(0,Math.min(CHECK_IN_GAIN,100-oldTrust));
    if(!gain)return fail('max-trust');
    return Object.freeze({ok:true,kind:'CHECK_IN',gain,day,eventId});
  }
  function applyCheckin(relationship,plan){
    if(!plan?.ok||plan.kind!=='CHECK_IN'||!relationship)return null;
    const v2=relationship.relationshipV2||{};
    if(v2.lastCheckinUtc===plan.day||
       (v2.trustEventIds||[]).includes(plan.eventId))return null;
    return Object.freeze({...v2,
      trust:Math.max(0,Math.min(100,(Number(v2.trust)||0)+plan.gain)),
      lastCheckinUtc:plan.day,
      trustEventIds:Object.freeze([...(v2.trustEventIds||[]),plan.eventId].slice(-100))
    });
  }
  // Story milestones require a future trusted server evidence contract.
  // A client callback, AI response, or localStorage claim is NEVER sufficient.
  function evaluateMilestone({trustedServerEvidence=false}={}){
    return Object.freeze({ok:false,reason:trustedServerEvidence?
      'server-milestone-service-not-configured':'unverified-milestone',gain:0});
  }
  return Object.freeze({CHECK_IN_GAIN,evaluateCheckin,applyCheckin,evaluateMilestone});
});
