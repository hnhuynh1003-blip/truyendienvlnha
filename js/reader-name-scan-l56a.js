/* L5.6A — evidence-first, chapter-only review. Never changes source prose. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReaderNameScanL56A=api;
})(typeof window!=='undefined'?window:typeof self!=='undefined'?self:null,function(){
 'use strict';
 const norm=s=>typeof s==='string'?s.normalize('NFC').trim().replace(/\s+/gu,' '):'';
 const fold=s=>norm(s).toLocaleLowerCase('vi');
 const title=s=>norm(s).replace(/\p{L}[\p{L}\p{M}]*/gu,w=>w[0].toLocaleUpperCase('vi')+w.slice(1).toLocaleLowerCase('vi'));
 const escaped=s=>s.replace(/[\^$.*+?()[\]{}|]/g,'\\$&').replace(/\s+/gu,'\\s+');
 const beforeRx=/(?:tên là|gọi là|gọi|công tử|cô nương|đệ tử|thiếu gia|đại nhân|sư huynh|sư tỷ|tiên tử|nhân vật|người tên)\s*$/iu;
 const afterRx=/^\s*(?:nói|hỏi|đáp|cười|quát|gật đầu|lắc đầu|thở dài|nhìn|bước|xoay người|lên tiếng|trả lời)(?=$|[^\p{L}\p{M}])/iu;
 function occurrences(text,phrase){
  if(!phrase||phrase.length>90)return [];
  const rx=new RegExp('(^|[^\\p{L}\\p{M}\\p{N}_])('+escaped(phrase)+')(?=$|[^\\p{L}\\p{M}\\p{N}_])','giu');
  const all=[];
  for(const match of text.matchAll(rx)){
   const start=match.index+match[1].length,end=start+match[2].length;
   all.push({start,end});
  }
  return all;
 }
 function evidence(text,at){
  return beforeRx.test(text.slice(Math.max(0,at.start-55),at.start).normalize('NFC'))||
   afterRx.test(text.slice(at.end,Math.min(text.length,at.end+55)).normalize('NFC'));
 }
 function analyze(input,entries=[],lookup=null,ignored=[]){
  const text=String(input||'');
  if(text.length>2000000)throw Error('Chương vượt giới hạn 2 triệu ký tự; hãy sửa tên thủ công.');
  const active=entries.filter(r=>r&&!r.disabledAuto&&norm(r.from)&&norm(r.to));
  const excluded=new Set(ignored.map(fold));
  const profiles=new Map();
  for(const rule of active){
   const id=rule.characterId||'legacy:'+fold(rule.from);
   if(!profiles.has(id))profiles.set(id,{id,name:rule.characterName||rule.to,aliases:[]});
   profiles.get(id).aliases.push(rule);
  }
  const people=[...profiles.values()];
  const confirmed=new Map();
  for(const rule of active)for(const value of [rule.from,rule.to]){
   const key=fold(value);
   if(!confirmed.has(key))confirmed.set(key,[]);
   if(!confirmed.get(key).includes(rule))confirmed.get(key).push(rule);
  }
  const results=new Map();
  function add(phrase){
   const key=fold(phrase),isConfirmed=confirmed.has(key);
   if((!isConfirmed&&excluded.has(key))||results.has(key))return;
   const all=occurrences(text,phrase);
   if(!all.length)return;
   const contextual=all.filter(at=>evidence(text,at)).length;
   if(!isConfirmed&&!contextual)return;
   const matchingRules=confirmed.get(key)||[];
   const shortLinks=people.filter(p=>fold(p.name)!==key&&fold(p.name).endsWith(' '+key)).map(p=>({id:p.id,name:p.name}));
   const linked=matchingRules.map(r=>{
    const p=people.find(x=>x.aliases.includes(r));
    return p?{id:p.id,name:p.name}:null;
   }).filter(Boolean);
   const uniqueLinks=[...new Map(linked.concat(shortLinks).map(p=>[p.id,p])).values()];
   const suggestions=!isConfirmed&&lookup?lookup.suggest(phrase,{profiles:people}):[];
   const proposed=suggestions[0];
   const inferred=!!proposed&&proposed.kind==='inferred';
   const ambiguous=uniqueLinks.length>1||suggestions.some(s=>s.ambiguous)||
    new Set(suggestions.filter(s=>s.profileId).map(s=>s.profileId)).size>1;
   const resolved=isConfirmed&&matchingRules.length===1?matchingRules[0].to:proposed?.name||title(phrase);
   const actualCategory=isConfirmed?'confirmed':inferred||ambiguous||contextual<2?'suspect':'high';
   const first=all[0];
   results.set(key,{
    from:text.slice(first.start,first.end),to:resolved,count:all.length,context:contextual,
    occurrences:all.slice(0,12),category:actualCategory,auto:false,inferredAutomatic:false,
    suspect:actualCategory==='suspect',links:uniqueLinks,suggestions,
    reason:isConfirmed?(matchingRules.length===1?'Quy tắc đã xác nhận trong truyện':'Cách gọi trùng nhiều quy tắc; cần kiểm tra'):
     inferred?'Suy luận từ nghĩa Việt · chưa xác minh':
     ambiguous?'Tên rút gọn trùng nhiều nhân vật · chưa xác minh':
     uniqueLinks.length?'Tên rút gọn có liên hệ hồ sơ · chưa xác minh':
     'Có bằng chứng ngữ cảnh trong chương · chưa xác minh',
    excerpt:text.slice(Math.max(0,first.start-65),Math.min(text.length,first.end+95))
   });
  }
  for(const key of confirmed.keys())add(key);
  // A shortened name is a proposal only when its literal phrase has chapter context.
  for(const person of people){
   const parts=norm(person.name).split(' ');
   if(parts.length<3)continue;
   const short=parts.slice(-2).join(' '),key=fold(short);
   if(!confirmed.has(key)&&!excluded.has(key))add(short);
  }
  if(lookup){
   const seeds=new Map();
   for(const span of lookup.detect(text)){
    const key=fold(span.from);
    if(!confirmed.has(key)&&!excluded.has(key)&&!seeds.has(key))seeds.set(key,span.from);
    if(seeds.size>=100)break;
   }
   for(const phrase of seeds.values())add(phrase);
  }
  const list=[...results.values()];
  return list.filter(a=>a.category==='confirmed'||!list.some(b=>
   b!==a&&fold(b.from).startsWith(fold(a.from)+' ')&&a.occurrences.every(x=>
    b.occurrences.some(y=>y.start===x.start&&y.end>x.end))))
   .sort((a,b)=>({confirmed:0,high:1,suspect:2}[a.category]-{confirmed:0,high:1,suspect:2}[b.category])||b.context-a.context||b.count-a.count)
   .slice(0,80);
 }
 return Object.freeze({analyze,occurrences,evidence});
});
