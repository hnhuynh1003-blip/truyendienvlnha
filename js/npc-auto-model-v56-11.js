/* V56.11 — deterministic, zero-API-call NPC model routing.
 * Explicit manual selections remain available; defaults stay cost-conscious.
 * This module does not fetch or send messages.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcAutoModelV5611=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const AUTO='auto';
  const DEFAULT='gemini-3.5-flash-lite';
  function route(messages){
    const list=Array.isArray(messages)?messages:[];
    const current=[...list].reverse().find(m=>m?.role==='user'&&typeof m.text==='string');
    const text=(current?.text||'').slice(-2000);
    const length=text.length;
    // Deterministic heuristics, not a paid model query. Prefer Lite for normal
    // greetings, daily chat, or short questions, reserving Flash for heavy lore.
    const complex=/(phân tích|suy luận|giải thích (?:tại sao|vì sao)|mâu thuẫn|lập luận|đối chiếu|chứng minh|giả thuyết|tình huống phức tạp|kịch bản phức tạp|phỏng đoán|motive|reasoning|analyse|analyze|compare)/i.test(text);
    const lore=/(ký ức|thế giới|dòng thời gian|cốt truyện|bí mật|chuyện ngày trước|lịch sử|quan hệ|quá khứ|sự kiện|phó bản|thân phận|vận mệnh|lựa chọn khó|hệ thống)/i.test(text);
    const dialogue=/(nếu .*thì|giả sử|nếu như|theo cô|theo anh|tại sao|vì sao|bởi vì)/i.test(text);
    if(length>900||(complex&&lore))return 'gemini-3.8-flash';
    if(length>350||complex||(lore&&dialogue))return 'gemini-3.6-flash';
    return DEFAULT;
  }
  function selection(value){
    return typeof value==='string'&&value.trim()?value:AUTO;
  }
  return Object.freeze({AUTO,DEFAULT,route,selection});
});
