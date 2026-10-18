/* V56.13 — DUDU Link is messaging, not scene-based roleplay.
 * This filters *new* AI text only; prior dialogue, authored NPC data and
 * role-specific memory are never rewritten. Scene gameplay is a future mode.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduNpcDialogueV5613=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const stage=/^(?:ánh mắt|đôi mắt|ánh nhìn|ánh mắt của|bàn tay|đôi tay|khóe môi|nụ cười|vẻ mặt|khuôn mặt|giọng nói|giọng cô|giọng anh|cô ấy|anh ấy|hắn|nàng|cô ta|anh ta|người con gái|người đàn ông|cô khẽ|anh khẽ|tôi khẽ|tôi mỉm cười|tôi gật đầu|tôi nhíu mày|tôi cúi đầu|tôi ngẩng đầu|tôi quay mặt|tôi đưa tay|tôi nhếch môi|tôi nhìn (?:cô|anh|bạn)|tôi lạnh lùng nhìn|khẽ mỉm cười|khẽ nhíu mày|khẽ thở dài|nhíu mày|ngẩng đầu|cúi đầu|gật đầu|mỉm cười|nhếch môi|quay người|đôi môi|một tiếng cười)/i;
 const action=/\b(?:mỉm cười|gật đầu|nhíu mày|quay người|cúi đầu|ngẩng đầu|nhếch môi|ánh mắt|vẻ mặt|bàn tay|nhìn chằm chằm|nhìn về phía|lắc đầu|thở dài|nhún vai|lạnh lùng nhìn)\b/i;
 const genericSystem=/^\s*\[(?:Hệ thống|System|Trạng thái|Status|Narrator|Người dẫn chuyện)\s*:[^\]]{0,260}\]\s*/i;
 const quote=/[“"「]([^”"」\r\n]{1,400})[”"」]/g;
 function normalize(input){return String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();}
 function simpleGreeting(input){
  const text=normalize(input).replace(/[!?.,…]+/g,' ').replace(/\s+/g,' ').trim();
  return /^(?:chao|xin chao|hi|hello|hey|alo)(?:\s+(?:co|anh|chi|em|ban|a du))?$/.test(text);
 }
 function hasNarrationLead(sentence){
  const clean=String(sentence||'').trim().replace(/^(?:[-–—*]+\s*)/,'');
  if(stage.test(clean))return true;
  // Third-person literary framing, not ordinary first-person text messages.
  return /^(?:[A-ZÀ-Ỹ][^.,!?\n]{0,65})\s+(?:khẽ|chậm rãi|lặng lẽ)\s+(?:mỉm cười|nhìn|gật đầu|nhíu mày|quay|nói)/u.test(clean);
 }
 function fallbackGreeting(char){
  const source=normalize([char?.note,char?.role,char?.status].filter(Boolean).join(' '));
  if(/lanh lung|kiem loi|it noi|tram tinh|kho gan/.test(source))return 'Chào. Có chuyện gì?';
  if(/vui ve|tinh nghich|hoat bat|hai huoc/.test(source))return 'Chào bạn! Hôm nay thế nào?';
  if(/diu dang|nhe nhang|am ap|tot bung/.test(source))return 'Chào bạn, có chuyện gì muốn kể không?';
  return 'Chào, bạn muốn nói chuyện gì?';
 }
 function clean(answer,query,char){
  let text=typeof answer==='string'?answer.trim():'';
  if(!text)return '';
  for(let i=0;i<4;i++){
   const before=text;
   text=text.replace(genericSystem,'');
   text=text.replace(/^\s*(?:\*([^*\r\n]{1,170})\*|_([^_\r\n]{1,170})_|\(([^()\r\n]{1,170})\)|\[([^\]\r\n]{1,170})\])\s*/u,(all,a,b,c,d)=>{
     const phrase=a||b||c||d;
     return action.test(phrase)||hasNarrationLead(phrase)?'':all;
   }).trim();
   if(text===before)break;
  }
  // Explicit character-labeled bubbles are converted to the actual message.
  if(char?.name){
    const name=String(char.name).trim();
    if(name&&text.startsWith(name+':'))text=text.slice(name.length+1).trim();
  }
  // A roleplay model sometimes encloses the actual spoken line in quotation
  // marks following descriptive prose. Use the quoted utterance, not prose.
  if(hasNarrationLead(text)){
    const matches=[...text.matchAll(quote)].map(x=>x[1].trim()).filter(Boolean);
    if(matches.length)text=matches.slice(0,3).join(' ');
    else{
      // Remove a complete leading narrative sentence only when actual speech
      // follows; do not mistake literary prose itself for character speech.
      const start=text.match(/^[\s\S]{1,220}?[.!?。！？]\s+/u);
      if(start){
        const remaining=text.slice(start[0].length).trim();
        text=hasNarrationLead(remaining)?'':remaining;
      }else text='';
    }
  }
  text=text.replace(/(?:\*([^*\r\n]{1,170})\*|\(([^()\r\n]{1,170})\))\s*/gu,
    (all,a,b)=>action.test(a||b)?'':all).trim();
  // Do not return fabricated physical actions as instant messages.
  if(!text||hasNarrationLead(text))return simpleGreeting(query)?fallbackGreeting(char):'';
  return text;
 }
 function instruction(){
  return 'DUDU LINK — CHẾ ĐỘ NHẮN TIN TRỰC TIẾP, KHÔNG PHẢI GAME NHẬP VAI THEO CẢNH.\n'+
    'Bạn là chính nhân vật đang cầm điện thoại và trực tiếp nhắn tin với người đọc. '+ 
    'Chỉ xuất ra những chữ nhân vật thực sự gõ vào ô chat, sử dụng ngôi xưng hô tự nhiên.\n'+
    'TUYỆT ĐỐI KHÔNG: kể chuyện ngôi ba, miêu tả ánh mắt/cử chỉ/ngoại hình/cảm xúc như người dẫn truyện; '+ 
    'viết *hành động*, (hành động), [bối cảnh], dấu ngoặc miêu tả; mở cảnh/phó bản, đưa lựa chọn gameplay hoặc biến cuộc chat thành kịch bản.\n'+
    'Giữ phong cách nói, sự lạnh lùng, dịu dàng hay hài hước qua CÁCH DÙNG TỪ chứ không qua văn tả hành động. '+ 
    'Không để tên nhân vật và dấu hai chấm trước câu trả lời.\n'+
    'Ví dụ: người đọc nhắn "hello", nhân vật ít nói có thể đáp "Chào. Có chuyện gì?" '+ 
    'KHÔNG viết "Ánh mắt tôi lạnh lùng nhìn cô" hay "Cô ấy nhíu mày rồi trả lời".\n'+
    'Nếu người đọc hỏi về tình tiết truyện, có thể trả lời bằng lời thoại bình thường và chỉ dựa trên dữ kiện được xác nhận.\n';
 }
 return Object.freeze({clean,instruction,hasNarrationLead,simpleGreeting});
});
