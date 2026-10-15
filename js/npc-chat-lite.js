/* DUDU NPC Lite: conservative script routing and bounded chat contexts.
 * Runs entirely in browser; no Gemini token/API request is used for these exchanges.
 * It never writes inventory, affinity, exp, or quests. Those must be server-validated.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DuduNpcLite = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const SCRIPT_LINES = Object.freeze({
    greeting: [
      'Chào nhé. Có vẻ tín hiệu giữa chúng ta hôm nay khá rõ.',
      'Ồ, lại gặp nhau rồi. Bạn có chuyện gì muốn kể không?',
      'Xin chào. Tôi vẫn đang ở đây, đừng lo.'
    ],
    thanks: [
      'Không có gì. Có bạn ở đây cũng tốt mà.',
      'Bạn khách sáo quá. Tôi nhớ lời cảm ơn này rồi.',
      'Ừ, không cần cảm ơn đâu. Chúng ta còn nhiều chuyện để nói.'
    ],
    goodbye: [
      'Tạm biệt. Đừng quên đường trở về nhé.',
      'Hẹn gặp lại. Tôi sẽ chờ tín hiệu của bạn.',
      'Đi cẩn thận. Khi nào muốn nói chuyện, cứ tìm tôi.'
    ],
    goodnight: [
      'Ngủ ngon. Mong đêm nay những giấc mơ sẽ dịu dàng với bạn.',
      'Ừm, chúc ngủ ngon. Mai chúng ta nói tiếp nhé.',
      'Đêm đã muộn rồi. Nghỉ ngơi đi, tôi vẫn ổn.'
    ]
  });
  const INTENTS = Object.freeze({
    greeting: new Set(['hi', 'hello', 'hey', 'chao', 'xin chao', 'chao ban', 'chao nha', 'hello ban']),
    thanks: new Set(['cam on', 'cam on ban', 'thanks', 'thank you', 'cam on nha']),
    goodbye: new Set(['tam biet', 'bye', 'bye bye', 'hen gap lai', 'chao tam biet']),
    goodnight: new Set(['ngu ngon', 'chuc ngu ngon', 'good night'])
  });

  function normalized(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
      .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }
  function intent(text,characterName) {
    const s=normalized(text);
    if (!s || s.length>55) return null;
    const npc=normalized(characterName);
    const candidates=[s];
    // "Chào Lan" / "Cảm ơn Lan" are still simple greetings, provided the
    // extra words exactly match the selected character's name.
    if (npc && s.endsWith(' '+npc)) candidates.push(s.slice(0,-npc.length-1));
    for (const candidate of candidates) {
      for (const [kind,forms] of Object.entries(INTENTS)) if (forms.has(candidate)) return kind;
    }
    return null; // Real story requests and questions go to AI, never guessed replies.
  }
  function script(text,char,previousMessages) {
    const kind=intent(text,char?.name);
    if (!kind) return null;
    const history=Array.isArray(previousMessages)?previousMessages:[];
    const name=typeof char?.name==='string' ? char.name.trim() : '';
    const id=typeof char?.id==='string'?char.id:'npc';
    // Stable per-character variety with deterministic rotation over consecutive greetings.
    const salt=Array.from(id).reduce((a,c)=>(a+c.charCodeAt(0))%101,0);
    const count=history.filter(m=>m?.role==='user' && intent(m.text,char?.name)===kind).length;
    const lines=SCRIPT_LINES[kind];
    const line=lines[(count+salt)%lines.length];
    return {text:line,source:'script',intent:kind,npc:name};
  }

  function boundedInstruction(persona,max=1200) {
    if (typeof persona!=='string')return '';
    return persona.length>max ? persona.slice(0,max).trimEnd()+'\n[Phần ghi chú còn lại chưa được nạp trong lượt này.]' : persona;
  }
  function boundedContext(messages,limit=8) {
    const recent=(Array.isArray(messages)?messages:[])
      .filter(m=>m && (m.role==='user'||m.role==='model')&&typeof m.text==='string'&&m.text.trim())
      .slice(-limit);
    return recent.map((m,i)=>{
      const latest=i===recent.length-1;
      const max=latest?1000:400;
      const text=m.text.trim();
      return {role:m.role,text:text.length>max?'…'+text.slice(-max):text};
    });
  }
  return Object.freeze({intent,script,boundedInstruction,boundedContext});
});
