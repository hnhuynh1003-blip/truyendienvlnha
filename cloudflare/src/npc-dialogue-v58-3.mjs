/* DUDU V58.3 — preserve real user/assistant turns for Cloudflare Workers AI.
 * Gemini must continue using its existing textOnlyNpcContents() workaround.
 * Inputs come from the already validated per-UID/story/role/NPC chat request.
 * Never create, import, synchronize, or train on other users' chat records.
 */
const MAX_TURNS=9;
const MAX_CONTEXT_CHARS=9000;

export function workersNpcDialogue(contents,maxTurns=MAX_TURNS,maxChars=MAX_CONTEXT_CHARS){
  if(!Array.isArray(contents)||!contents.length)return null;
  const turnLimit=Math.max(1,Math.min(MAX_TURNS,Math.floor(Number(maxTurns))||MAX_TURNS));
  const charLimit=Math.max(1000,Math.min(MAX_CONTEXT_CHARS,Math.floor(Number(maxChars))||MAX_CONTEXT_CHARS));
  const turns=[];
  for(const item of contents){
    if(item?.role!=='user'&&item?.role!=='model')return null;
    if(!Array.isArray(item.parts))return null;
    const text=item.parts.filter(p=>typeof p?.text==='string').map(p=>p.text).join('\n').trim();
    if(!text)return null;
    const role=item.role==='model'?'assistant':'user';
    const prior=turns.at(-1);
    if(prior?.role===role)prior.content+='\n'+text;
    else turns.push({role,content:text});
  }
  if(turns.at(-1)?.role!=='user')return null;
  const recent=turns.slice(-turnLimit);
  while(recent[0]?.role==='assistant')recent.shift();
  if(!recent.length||recent.at(-1).role!=='user')return null;
  // Preserve the final question byte-for-byte after trimming outer spaces.
  // Drop oldest context pairs instead of shortening the user's latest turn.
  let size=recent.reduce((sum,m)=>sum+m.content.length,0);
  while(size>charLimit&&recent.length>1){
    recent.shift();
    while(recent[0]?.role==='assistant')recent.shift();
    size=recent.reduce((sum,m)=>sum+m.content.length,0);
  }
  if(size>charLimit)return null;
  return recent;
}
