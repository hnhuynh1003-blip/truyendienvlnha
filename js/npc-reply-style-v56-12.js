/* V56.12 — messenger-style NPC responses.
 * Existing saved messages and persona records are never modified.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcReplyStyleV5612=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').toLowerCase().replace(/[!?.,…]+/g,' ').replace(/\s+/g,' ').trim();
  function greeting(query){
    const q=normalize(query);
    return /^(xin chao|chao|chao ban|hello|hi|hey|alo|co oi|anh oi|cam on|thanks|ngu ngon|chuc ngu ngon|tam biet|bye)(\s+(co|anh|chi|em|a du|ban))?$/.test(q);
  }
  function wantsDetail(query){
    return /(?:phân tích (?:chi tiết|sâu)|giải thích (?:cụ thể|chi tiết)|kể (?:chi tiết|hết|dài)|nói rõ từng|liệt kê|từng bước|thật dài|viết dài|phác họa chi tiết|càng chi tiết)/i.test(String(query||''))||
      String(query||'').trim().length>420;
  }
  function guidance(query){
    if(greeting(query))return 'TIN NHẮN ĐIỆN THOẠI: Người chơi chỉ chào hỏi hoặc nói một câu xã giao. Đáp lại 1 câu ngắn 5–25 từ, tự nhiên đúng cá tính NPC. KHÔNG kể chuyện, không tự dựng triệu chứng, nhiệm vụ, cảnh báo hệ thống hay sự kiện mới. Không viết lời dẫn trong dấu ngoặc.';
    if(/\b(?:làm quen|kết bạn|nói chuyện)\b/i.test(String(query||'')))
      return 'Người chơi muốn làm quen, không phải bệnh nhân hoặc người gây rối. Trả lời thân thiện vừa phải hoặc dè dặt 1 câu ngắn, không trách móc về thời gian/bệnh viện.';
    if(wantsDetail(query))return 'Người chơi yêu cầu trả lời chi tiết. Trả lời đủ ý trong giọng NPC, có thể dài hơn bình thường; không bịa sự kiện truyện chưa được tác giả xác nhận.';
    return 'TIN NHẮN ĐIỆN THOẠI: Chỉ đáp trực tiếp lời người chơi mới nhắn, thường 1–2 câu (tối đa khoảng 60 từ). Có thể ngập ngừng, đùa nhẹ hoặc hỏi ngược một câu khi hợp cá tính. Không tự thêm [Hệ thống], nhiệm vụ, kịch bản, tình huống khẩn cấp hoặc lời dẫn truyện. Không giải thích dài nếu chưa được hỏi.';
  }
  function words(s){return s.trim().split(/\s+/).filter(Boolean);}
  function trimToWords(s,n){
    const a=words(s);if(a.length<=n)return s.trim();
    return a.slice(0,n).join(' ').replace(/[,;:\-–]+$/,'')+'…';
  }
  function format(answer,query){
    let text=typeof answer==='string'?answer.trim():'';
    if(!text)return '';
    // Only remove obviously synthetic leading system/status decorations; do
    // not alter natural in-character names, quotations or previous history.
    text=text.replace(/^(?:\[(?:Hệ thống|System|Trạng thái|Status)\s*:[^\]]{0,260}\]\s*)+/i,'').trim();
    if(!text)return typeof answer==='string'?answer.trim():'';
    if(wantsDetail(query))return text;
    const casual=/\b(?:làm quen|kết bạn|nói chuyện|chỉ muốn làm quen|mình muốn làm quen|tôi chỉ muốn làm quen)\b/i.test(String(query||''));
    if(greeting(query)||casual){
      const sentences=text.match(/[^.!?。！？…]+[.!?。！？…]+|[^.!?。！？…]+$/g)||[];
      const first=sentences[0]?.trim()||text;
      const second=sentences[1]?.trim()||'';
      const concise=second&&words(first).length<=5&&
        words(first+' '+second).length<=18?first+' '+second:first;
      return trimToWords(concise,28);
    }
    if(words(text).length<=45)return text;
    const sentences=text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[];
    const first=sentences[0]?.trim()||text;
    const firstTwo=sentences.slice(0,2).join(' ').trim();
    // Prefer complete sentences to avoid cutting a natural instant message mid-word.
    if(words(firstTwo).length<=45)return firstTwo;
    if(words(first).length>=12&&words(first).length<=45)return first;
    return trimToWords(firstTwo||text,45);
  }
  return Object.freeze({greeting,wantsDetail,guidance,format});
});
