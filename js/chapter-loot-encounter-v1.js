/* DUDU Chapter Loot — personal-only reader surprise.
 * One deterministic encounter per account/story/chapter. Only some chapters
 * contain it; a click consumes the opportunity even when the roll misses.
 * Profile claim records prevent reloads from rerolling. This is client-side
 * gameplay, NOT proof of an authentic server reward.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduChapterLootEncounterV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const APPEAR_PERCENT=25;
 const SUCCESS_PERCENT=45;
 function hash(value){
  let h=2166136261;
  for(const ch of String(value)){
   h^=ch.codePointAt(0);h=Math.imul(h,16777619);
  }
  return h>>>0;
 }
 function lootKey(storyId,chapterId){return String(storyId)+'_'+String(chapterId);}
 function attempted(value){return value!==undefined&&value!==null&&value!==false;}
 function encounter({accountId,storyId,chapterId,paragraphCount,claim}={}){
  if(!accountId||!storyId||chapterId===null||chapterId===undefined||
    !Number.isSafeInteger(paragraphCount)||paragraphCount<1)
   return Object.freeze({visible:false,attempted:false,afterParagraph:-1});
  const already=attempted(claim);
  const seed=String(accountId)+'\u0000'+String(storyId)+'\u0000'+String(chapterId);
  const visible=!already&&hash('spawn:'+seed)%100<APPEAR_PERCENT;
  // Place after roughly 20–70% of the content; never float over the text.
  const min=Math.floor((paragraphCount-1)*0.2);
  const max=Math.floor((paragraphCount-1)*0.7);
  const afterParagraph=min+hash('place:'+seed)%(max-min+1);
  return Object.freeze({visible,attempted:already,afterParagraph});
 }
 function rollSuccess(random){
  if(typeof random!=='number'||!Number.isFinite(random)||random<0||random>=1)
   return false;
  return random<SUCCESS_PERCENT/100;
 }
 function missMarker(now=Date.now()){
  if(!Number.isSafeInteger(now)||now<=0)throw Error('invalid-attempt-time');
  return 'miss:'+now;
 }
 return Object.freeze({APPEAR_PERCENT,SUCCESS_PERCENT,hash,lootKey,attempted,
  encounter,rollSuccess,missMarker});
});
