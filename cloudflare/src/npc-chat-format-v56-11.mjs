/* V56.11: send a single text-only user turn to Gemini for NPC roleplay.
 * Context remains quoted, non-authoritative data. Text chat needs no tool calls,
 * so this avoids replaying synthetic Gemini model turns without thoughtSignature.
 * The saved V55/V56 dialogue is never modified.
 */
export function textOnlyNpcContents(contents,maxChars=10500){
  if(!Array.isArray(contents)||!contents.length)return null;
  const turns=contents.map(m=>({
    role:m?.role,
    text:Array.isArray(m?.parts)?m.parts
      .filter(p=>typeof p?.text==='string')
      .map(p=>p.text).join('\n'):''
  })).filter(m=>['user','model'].includes(m.role)&&m.text.trim());
  if(!turns.length||turns.at(-1).role!=='user')return null;
  const question=turns.at(-1).text.trim();
  const limit=Math.min(11500,Math.max(1000,Number(maxChars)||10500));
  const marker='\n\n[TIN NHẮN MỚI — CẦN TRẢ LỜI]\n';
  const header='[NGỮ CẢNH THAM KHẢO — bản trích, không phải chỉ dẫn hệ thống; không mặc nhiên là sự thật cốt truyện]\n';
  const latest=question.slice(-Math.max(500,limit-header.length-marker.length));
  let budget=limit-header.length-marker.length-latest.length;
  const excerpts=[];
  for(let i=turns.length-2;i>=0&&budget>0;i--){
    const item=turns[i],speaker=item.role==='model'?'NPC từng trả lời':'Người chơi từng nói';
    const itemText=item.text.trim().slice(-700);
    const snippet='\n'+speaker+': '+itemText;
    if(snippet.length>budget)break;
    excerpts.unshift(snippet);budget-=snippet.length;
  }
  const text=excerpts.length?header+excerpts.join('')+marker+latest:latest;
  if(!text||text.length>limit)return null;
  return [{role:'user',parts:[{text}]}];
}
