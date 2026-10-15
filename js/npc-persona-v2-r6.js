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
  const CONVERSATIONS=Object.freeze({
    c_otk:Object.freeze({prompt:'Một người bạn đang kiệt sức vì công việc. Bạn sẽ nói gì?',
      thoughtful:'Khuyên nghỉ ngơi và hỏi xem có thể giúp gì.',
      casual:'Đổi chủ đề để người ấy quên đi mệt mỏi.',
      replyThoughtful:'Bạn để ý đến cảm nhận của người khác. Điều đó đáng quý.',
      replyCasual:'Tôi hiểu ý tốt của bạn, nhưng sự quan tâm cần đúng lúc.'}),
    c_ttl:Object.freeze({prompt:'Một cơn mưa khơi gợi ký ức cũ. Bạn sẽ làm gì?',
      thoughtful:'Ngồi lại và lắng nghe nếu người ấy muốn kể.',
      casual:'Hỏi dồn về những chuyện đã qua.',
      replyThoughtful:'Cảm ơn vì bạn không ép tôi phải kể điều chưa sẵn sàng.',
      replyCasual:'Có lẽ tôi cần thêm thời gian trước khi chia sẻ.'}),
    c_tct:Object.freeze({prompt:'Một người bạn nhắc đến lời hẹn chưa hoàn thành. Bạn sẽ nói gì?',
      thoughtful:'Cùng nhắc lại lời hẹn và tìm cách giữ lời.',
      casual:'Hứa đại cho qua để bầu không khí vui hơn.',
      replyThoughtful:'Giữ chữ tín từ những việc nhỏ là điều tôi trân trọng.',
      replyCasual:'Lời hứa chỉ có ý nghĩa khi chúng ta thật sự thực hiện.'})
  });
  const DEFAULT_CONVERSATION=Object.freeze({prompt:'NPC muốn trò chuyện về một ngày đã qua. Bạn sẽ phản hồi thế nào?',
    thoughtful:'Lắng nghe và hỏi xem có thể giúp gì.',casual:'Nói sang chủ đề khác.',
    replyThoughtful:'Cảm ơn vì đã lắng nghe.',replyCasual:'Chúng ta có thể hiểu nhau thêm vào dịp khác.'});
  function dailyConversation(npc){
    const p=npc&&Object.hasOwn(PRESETS,npc.id)&&PRESETS[npc.id].name===npc.name?
      CONVERSATIONS[npc.id]:null;
    return p||DEFAULT_CONVERSATION;
  }
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
  return Object.freeze({PRESETS,CONVERSATIONS,dailyConversation,previewNpc});
});
