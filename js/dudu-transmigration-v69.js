/* DUDU V69 — independent System Passport/Transmigration contract.
 * This is a pure client DISPLAY AND AUTHOR PREVIEW schema.
 * Browser data, local quest flags, AI text and this evaluator NEVER authorize
 * passport issuance, signing, rewards, punishments or actual world entry.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduTraversalV69=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const attributes=Object.freeze([
  {id:'fortune',name:'Khí vận',impact:'Biến cố ngẫu nhiên, cơ duyên, nhiệm vụ ẩn'},
  {id:'luck',name:'May mắn',impact:'Xác suất phát hiện và điều kiện nhặt vật phẩm'},
  {id:'agility',name:'Nhanh nhẹn',impact:'Né tránh, hành động đúng thời điểm, đường rẽ'},
  {id:'strength',name:'Sức mạnh',impact:'Đối kháng, vận chuyển, phá chướng ngại'},
  {id:'appearance',name:'Nhan sắc',impact:'Ấn tượng ban đầu, cách thương lượng với NPC'},
  {id:'intelligence',name:'Trí tuệ',impact:'Giải đố, phát hiện suy luận và chứng cứ'},
  {id:'stamina',name:'Thể lực',impact:'Sức bền, hành trình dài, hồi phục'},
  {id:'spirit',name:'Tinh thần',impact:'Ý chí, áp lực, khả năng giữ tỉnh táo'}
 ].map(Object.freeze));
 const ids=new Set(attributes.map(x=>x.id));
 const systemRanks=Object.freeze(['F','E','D','C','B','A','S']);
 const defaultStatus=Object.freeze({
  status:'not_launched',source:'unavailable',verified:false,
  passport:Object.freeze({status:'unavailable',receiptId:null,questId:null}),
  pact:Object.freeze({status:'not_launched',signedAt:null,systemId:null}),
  system:Object.freeze({originType:null,rank:null,exp:null}),
  player:Object.freeze({level:null,exp:null,state:'unknown'}),
  stats:Object.freeze(Object.fromEntries(attributes.map(x=>[x.id,null]))),
  progress:Object.freeze({worldsCrossed:null,missionsCompleted:null,achievements:null}),
  rewards:Object.freeze({claimedCount:null,itemCount:null,verifiedItems:null})
 });
 function projection(){
  // Until a versioned server-side ticket and progression service is deployed,
  // no on-device profile/quest/AI claim is eligible to become verified data.
  return defaultStatus;
 }
 function canSignPact(){return false;}
 function canEnterWorld(){return false;}
 function canPromoteSystem(){return false;}
 function canClaimReward(){return false;}
 function canIssuePenalty(){return false;}
 // Author-side *design* evaluator only. Actual client gameplay cannot call
 // this method to grant access; conditions must be recomputed server-side.
 function previewConditions(values,conditions,{verified=false}={}){
  if(!Array.isArray(conditions)||!conditions.length)return {state:'invalid',eligible:false};
  const checks=[];
  for(const condition of conditions){
   const name=condition?.attribute,threshold=condition?.min;
   if(!ids.has(name)||!Number.isSafeInteger(threshold)||threshold<0||threshold>100)
     return {state:'invalid',eligible:false};
   const value=values?.[name];
   const known=verified===true&&Number.isSafeInteger(value)&&value>=0&&value<=100;
   checks.push({attribute:name,min:threshold,
     state:known?(value>=threshold?'met':'unmet'):'unverified'});
  }
  return {state:checks.some(x=>x.state==='unverified')?'unverified':
    checks.every(x=>x.state==='met')?'preview_met':'preview_unmet',
    eligible:false,checks};
 }
 const discoveryExamples=Object.freeze([
  Object.freeze({id:'sample-hidden-quest',title:'Nhiệm vụ ẩn',kind:'mission',
    conditions:Object.freeze([{attribute:'fortune',min:65},{attribute:'intelligence',min:40}])}),
  Object.freeze({id:'sample-loot',title:'Vật phẩm đặc thù',kind:'item',
    conditions:Object.freeze([{attribute:'luck',min:55},{attribute:'agility',min:40}])}),
  Object.freeze({id:'sample-choice',title:'Lựa chọn thương lượng',kind:'choice',
    conditions:Object.freeze([{attribute:'appearance',min:50},{attribute:'spirit',min:35}])}),
  Object.freeze({id:'sample-endurance',title:'Nhánh hành trình dài',kind:'choice',
    conditions:Object.freeze([{attribute:'stamina',min:50},{attribute:'strength',min:45}])})
 ]);
 const authorPolicyFields=Object.freeze([
  Object.freeze({id:'pact-gate',label:'Thẻ thông hành và khế ước',rule:'verified_quest_receipt_then_pact'}),
  Object.freeze({id:'world-entry',label:'Phân phối thế giới',rule:'signed_pact_and_server_eligibility'}),
  Object.freeze({id:'hidden-branches',label:'Nhánh ẩn theo chỉ số',rule:'server_stats_and_world_truth'}),
  Object.freeze({id:'rewards',label:'Ký nhận Xu, EXP, vật phẩm',rule:'idempotent_verified_event'}),
  Object.freeze({id:'protection',label:'Bảo hộ và an toàn',rule:'verified_protection_scope'}),
  Object.freeze({id:'sanctions',label:'Truy vết và xử lý vi phạm',rule:'evidence_review_audit_appeal'})
 ]);
 function validateAuthorDraft(value){
  if(!value||typeof value!=='object'||!authorPolicyFields.some(x=>x.id===value.policyId))return null;
  if(!['observe','review','hold'].includes(value.disposition))return null;
  const note=typeof value.note==='string'?value.note.trim():'';
  if(note.length>220)return null;
  return Object.freeze({policyId:value.policyId,disposition:value.disposition,note,
    status:'local_draft',enforced:false});
 }
 return Object.freeze({
  version:1,attributes,systemRanks,defaultStatus,projection,discoveryExamples,authorPolicyFields,
  previewConditions,validateAuthorDraft,canSignPact,canEnterWorld,
  canPromoteSystem,canClaimReward,canIssuePenalty
 });
});
