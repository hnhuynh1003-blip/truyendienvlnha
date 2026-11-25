/* P0.1 canonical cultivation labels. Pure/read-only; never grants Tu Vi or EXP.
 * Names and 9 x 10 structure were approved. Thresholds, odds and Honor titles
 * are intentionally NOT part of this registry.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCultivationRealmsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const REALMS=Object.freeze([
  ['luyen-khi','Luyện Khí'],
  ['truc-co','Trúc Cơ'],
  ['kim-dan','Kim Đan'],
  ['nguyen-anh','Nguyên Anh'],
  ['hoa-than','Hóa Thần'],
  ['luyen-hu','Luyện Hư'],
  ['hop-the','Hợp Thể'],
  ['dai-thua','Đại Thừa'],
  ['do-kiep','Độ Kiếp']
 ].map(([id,name],index)=>Object.freeze({id,name,index:index+1})));
 const BY_ID=new Map(REALMS.map(realm=>[realm.id,realm]));
 const PHASES=Object.freeze(['Sơ kỳ','Trung kỳ','Hậu kỳ','Viên mãn']);
 function phaseOf(stage){
  if(!Number.isSafeInteger(stage)||stage<1||stage>10)return null;
  return PHASES[stage===10?3:Math.floor((stage-1)/3)];
 }
 function describe(realmId,stage){
  const realm=BY_ID.get(realmId),phase=phaseOf(stage);
  if(!realm||!phase)return null;
  return Object.freeze({realmId:realm.id,realm:realm.name,realmIndex:realm.index,
   stage,phase,label:realm.name+' · Tầng '+stage+' · '+phase,
   finalStage:realm.index===REALMS.length&&stage===10,
   requiresBreakthrough:stage===10&&realm.index<REALMS.length,
   // No numeric account-level/EXP conversion is defined here.
   nextRealmId:stage===10&&realm.index<REALMS.length?
    REALMS[realm.index].id:null});
 }
 return Object.freeze({VERSION:1,REALMS,PHASES,phaseOf,describe});
});
