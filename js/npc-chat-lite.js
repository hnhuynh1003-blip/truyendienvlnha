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
  // Short, safe personality variations; these never invent NPC-specific memories.
  const PERSONALITY_LINES = Object.freeze({
    reserved: {
      greeting:['Ừ, tôi nghe đây.','Là bạn sao? Có chuyện gì?','Chào. Tôi vẫn ở đây.'],
      thanks:['Không cần khách sáo.','Ừ, không có gì.','Tôi hiểu. Đừng bận tâm.'],
      goodbye:['Đi cẩn thận.','Tạm biệt.','Ừ, hẹn gặp lại.'],
      goodnight:['Ngủ ngon.','Đêm muộn rồi, nghỉ đi.','Đừng thức quá khuya.']
    },
    cheerful: {
      greeting:['A, là bạn đây rồi!','Chào chào! Hôm nay có gì vui nào?','Bạn đến đúng lúc quá!'],
      thanks:['Hì hì, có gì đâu!','Đừng khách sáo thế chứ!','Lần sau lại kể tôi nghe nữa nhé!'],
      goodbye:['Tạm biệt nha, nhớ quay lại đó!','Hẹn gặp lại!','Bye bye, đi vui vẻ nhé!'],
      goodnight:['Ngủ ngon, mơ đẹp nha!','Chúc bạn một đêm thật vui!','Mai lại nói chuyện tiếp nhé!']
    },
    gentle: {
      greeting:['Chào bạn. Hôm nay mọi chuyện ổn chứ?','Tôi ở đây, cứ nói với tôi nhé.','Lại gặp nhau rồi. Tôi rất vui.'],
      thanks:['Không cần cảm ơn đâu.','Tôi vui vì giúp được bạn.','Có gì đâu, bạn cứ yên tâm.'],
      goodbye:['Hẹn gặp lại, chăm sóc bản thân nhé.','Tạm biệt bạn. Đường về bình an.','Tôi sẽ đợi bạn quay lại.'],
      goodnight:['Chúc ngủ ngon, nghỉ ngơi thật tốt nhé.','Đêm nay hãy ngủ thật yên bình.','Hẹn gặp lại vào ngày mai nhé.']
    }
  });
  function personaStyle(char) {
    const profile=normalized((char?.note||'')+' '+(char?.role||''));
    if (/\b(lanh lung|kiem loi|it noi|tram tinh|kho gan)\b/.test(profile)) return 'reserved';
    if (/\b(tinh nghich|vui ve|hoat bat|hai huoc|nhanh nhen)\b/.test(profile)) return 'cheerful';
    if (/\b(diu dang|am ap|hien lanh|nhe nhang|tot bung)\b/.test(profile)) return 'gentle';
    return 'default';
  }
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
  // A free canned reply is only safe when no unresolved story/emotion context
  // is being continued. A brief "chào" inside an ongoing AI conversation
  // must be handled in context by the AI, not by a random generic line.
  function hasSensitiveStatus(char) {
    const status=normalized(char?.status || '');
    return /(bi thuong|nguy hiem|truy duoi|phan boi|ke thu|gian du|hoang loan|khung hoang|mat ket noi|mat tich|bi phong toa|danh nhau|chien dau|nguy kich|bat tinh|bi bat)/.test(status);
  }
  function canUseScript(kind,char,history) {
    if (!kind || hasSensitiveStatus(char)) return false;
    const recent=(Array.isArray(history)?history:[])
      .filter(m=>m && (m.role==='user'||m.role==='model')).slice(-8);
    if (!recent.length) return true;
    // A pending unanswered message is not an invitation to switch to small talk.
    if (recent[recent.length-1].role!=='model') return false;
    // Even a one-word message after a meaningful AI answer may carry subtext.
    if (recent.some(m=>m.role==='model' && m.source!=='script')) return false;
    // Do not repeat indefinitely or make characters appear scripted.
    const recentSameIntent=recent.filter(m=>m.role==='user' && intent(m.text,char?.name)===kind).length;
    if (recentSameIntent>=2) return false;
    return true;
  }
  function script(text,char,previousMessages) {
    const kind=intent(text,char?.name);
    const history=Array.isArray(previousMessages)?previousMessages:[];
    if (!canUseScript(kind,char,history)) return null;
    const name=typeof char?.name==='string' ? char.name.trim() : '';
    const id=typeof char?.id==='string'?char.id:'npc';
    const salt=Array.from(id).reduce((a,c)=>(a+c.charCodeAt(0))%101,0);
    const count=history.filter(m=>m?.role==='user' && intent(m.text,char?.name)===kind).length;
    const style=personaStyle(char);
    const lines=style==='default' ? SCRIPT_LINES[kind] : PERSONALITY_LINES[style][kind];
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
