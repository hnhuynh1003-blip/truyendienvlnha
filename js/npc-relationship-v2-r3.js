/* R3: read-only relationship stages, author-approved lore gates and scripted
 * persona reactions. Never treats AI text, gift records or legacy affection as
 * proof that a story milestone was completed.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcRelationStages=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const STAGES=Object.freeze(['LOCKED','ACQUAINTED','FRIENDLY','TRUSTED','BONDED']);
  const SCRIPT=Object.freeze({
    default:Object.freeze({ACCEPT:'Cảm ơn bạn vì món quà.',REFUSE:'Mình xin phép không nhận món này.',COOLDOWN:'Chúng ta trò chuyện thêm nhé.'}),
    reserved:Object.freeze({ACCEPT:'Tôi sẽ giữ món quà này cẩn thận.',REFUSE:'Xin lỗi, tôi không thể nhận.',COOLDOWN:'Để lúc khác nhé.'}),
    cheerful:Object.freeze({ACCEPT:'Ôi, cảm ơn bạn nhiều lắm!',REFUSE:'Hôm nay mình không nhận món này nha.',COOLDOWN:'Mình vừa nhận quà rồi, nói chuyện tiếp nào!'}),
    gentle:Object.freeze({ACCEPT:'Mình rất trân trọng tấm lòng của bạn.',REFUSE:'Mình cảm ơn nhưng xin không nhận nhé.',COOLDOWN:'Tấm lòng của bạn là đủ rồi.'})
  });
  function stage({unlocked=false,affinity=0,trust=0,approvedMilestones=[],completedMilestones=[]}={}){
    if(!unlocked)return 'LOCKED';
    const a=Number.isFinite(affinity)?affinity:0;
    const t=Number.isFinite(trust)?trust:0;
    const verified=Array.isArray(approvedMilestones)&&Array.isArray(completedMilestones)&&
      approvedMilestones.length>0&&approvedMilestones.every(id=>
        typeof id==='string'&&completedMilestones.includes(id));
    if(a>=90&&t>=60&&verified)return 'BONDED';
    if(a>=70&&t>=30&&verified)return 'TRUSTED';
    if(a>=40&&t>=10)return 'FRIENDLY';
    return 'ACQUAINTED';
  }
  function canReveal({requiredMilestone,approvedMilestones=[],completedMilestones=[]}={}){
    return typeof requiredMilestone==='string'&&requiredMilestone.length>0&&
      approvedMilestones.includes(requiredMilestone)&&
      completedMilestones.includes(requiredMilestone);
  }
  function react(style='default',status='REFUSE'){
    const persona=Object.hasOwn(SCRIPT,style)?style:'default';
    return SCRIPT[persona][status]||SCRIPT[persona].REFUSE;
  }
  return Object.freeze({STAGES,stage,canReveal,react});
});
