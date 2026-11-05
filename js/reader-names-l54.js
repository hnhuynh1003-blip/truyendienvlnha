/* L5.4: deterministic, chapter-local name evidence and backwards-compatible
 * device dictionary. No network, chapter mutation, or Firebase dependencies. */
(function(root,factory){
 'use strict';
 const legacy=typeof module==='object'&&module.exports?require('./reader-name-dictionary-l53.js'):root?.DuduReaderNameDictionaryL53;
 const api=factory(legacy);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReaderNameIntelligenceL54=api;
})(typeof window!=='undefined'?window:null,function(legacy){
 'use strict';
 const norm=v=>typeof v==='string'?v.normalize('NFC').trim().replace(/\s+/gu,' '):'';
 const fold=v=>norm(v).toLocaleLowerCase('vi');
 const title=v=>norm(v).replace(/\p{L}[\p{L}\p{M}]*/gu,w=>w[0].toLocaleUpperCase('vi')+w.slice(1).toLocaleLowerCase('vi'));
 const surnames=new Set(('tần mặc ôn trần nguyễn lê lý lâm triệu vương trương lưu liễu tạ tô tiêu diệp hàn bạch mộ sở chu châu ngô đỗ đường đinh phùng phạm hoàng huỳnh hồ hứa hà cao la lục lương lữ mã nhạc nghiêm phó thẩm tống tôn từ tề uông vũ võ vệ vu yến giang khương dương đào đặng đồng đổng đoàn kim kiều khổng mạnh mai ninh phương trình quý quách thạch thiệu tào tôn bùi').split(' '));
 const compound=new Set(['âu dương','tư mã','thượng quan','nam cung','đông phương','độc cô','mộ dung','gia cát','hạ hầu','hoàng phủ','công tôn','tư đồ','tư không']);
 // Deliberately narrow: a surname alone is never sufficient evidence.
 const given=new Set(('an anh băng bình châu chấn chi diệp diễm dung dương duy hạ hà hàm hàn hạo hi hiên hiền hoa hoài huy huyền khang khánh kiệt lam lan linh long luân minh mặc mẫn mỹ nam ngọc nhiên nhược phong phương quân quang sơ tâm thanh thành thần thiên thi hương thu thư tiên tinh tuyết tuấn uyên vân vũ y yên nguyệt uy võ').split(' '));
 const common=new Set(['bình thường','thanh niên','hàn huyên','lâm vào','bạch bạch','hà hà','cao cao','đường đi','hứa hẹn','từ từ','hạ xuống','mặc dù','mặc kệ','minh bạch','lý do','tần suất','thành công','tâm tình','thiên nhiên','phương hướng','tạ ơn','hà cớ','vương quốc','bạch y','thanh âm']);
 const suspicious=new Set(['nếu','rõ','ràng','trắng','đen','sáng','tối','đẹp','vui','buồn']);
 const words=text=>Array.from(String(text||'').normalize('NFC').matchAll(/[\p{L}\p{M}]+/gu),m=>({text:m[0],key:fold(m[0]),start:m.index,end:m.index+m[0].length}));
 function connections(value,profiles){
  const key=fold(value),parts=key.split(' ');
  return profiles.filter(p=>{
   const name=fold(p.name);
   return name===key||p.aliases.some(a=>fold(a.from)===key||fold(a.to)===key)||
    (parts.length>=2&&name.endsWith(' '+key));
  });
 }
 function analyze(input,entries=[],lookup=null){
  const text=String(input||'').normalize('NFC'),tokens=words(text),found=new Map(),positions=new Map();
  const profiles=characters(entries),confirmed=entries.filter(e=>!e.disabledAuto),ignored=new Set(entries.filter(e=>e.disabledAuto).map(e=>fold(e.from)));
  const knownKeys=new Set(confirmed.flatMap(e=>[fold(e.from),fold(e.to)]));
  const add=(name,start,end,reason,context=false,suspect=false)=>{
   const key=fold(name);if(ignored.has(key)||common.has(key)&&!knownKeys.has(key))return;
   const item=found.get(key)||{from:norm(name),to:title(name),count:0,context:0,reason,suspect,occurrences:[]};
   if(!positions.has(key))positions.set(key,new Map());
   if(positions.get(key).has(start))return;positions.get(key).set(start,end);
   item.count++;item.context+=Number(context);item.suspect ||= suspect;item.occurrences.push({start,end});found.set(key,item);
  };
  for(let i=0;i<tokens.length;i++){
   const first=tokens[i],two=tokens[i+1]&&first.key+' '+tokens[i+1].key;
   const surnameSize=compound.has(two)?2:surnames.has(first.key)?1:0;
   if(!surnameSize)continue;
   for(let length=surnameSize+1;length<=surnameSize+2&&length<=4;length++){
    const slice=tokens.slice(i,i+length);if(slice.length!==length)break;
    if(slice.some((w,j)=>j>0&&!/^\s+$/u.test(text.slice(slice[j-1].end,w.start))))break;
    const rest=slice.slice(surnameSize),name=slice.map(w=>w.text).join(' ');
    const suspect=rest.some(w=>suspicious.has(w.key));
    if(!rest.every(w=>given.has(w.key)||suspicious.has(w.key)))continue;
    const end=slice.at(-1).end,after=text.slice(end,end+45),before=text.slice(Math.max(0,first.start-35),first.start);
    const context=/^\s*(?:nói|hỏi|đáp|cười|gật đầu|lắc đầu|quát|thở dài|bước|nhìn|nghe|đứng|đến|rời|xoay người)\b/iu.test(after)||/(?:gọi|tên là|đệ tử|công tử|cô nương|gặp|nhìn|hỏi)\s*$/iu.test(before);
    add(name,first.start,end,'Họ Hán–Việt và ngữ cảnh',context,suspect);
   }
  }
  if(lookup)for(const span of lookup.detect(text)){
   const after=text.slice(span.end,span.end+45),before=text.slice(Math.max(0,span.start-35),span.start);
   const context=/^\s*(?:nói|hỏi|đáp|cười|gật đầu|lắc đầu|quát|thở dài|bước|nhìn|nghe|đứng|đến|rời|xoay người)\b/iu.test(after)||/(?:gọi|tên là|đệ tử|công tử|cô nương|gặp|nhìn|hỏi)\s*$/iu.test(before);
   const onlyDictionary=!found.has(fold(span.from));
   add(span.from,span.start,span.end,'Bộ tra Hán–Việt và nghĩa Việt',context,span.suspect);
   if(onlyDictionary&&found.has(fold(span.from)))found.get(fold(span.from)).dictionaryOnly=true;
  }
  // Explicitly confirmed aliases are evidence, even if a word is also ordinary.
  // Index a bounded number of literal patterns; no whole-book scans.
  const indexNames=new Set(confirmed.flatMap(e=>[e.from,e.to]));
  for(const p of profiles){
   const parts=p.name.split(' ');if(parts.length>=3)indexNames.add(parts.slice(-2).join(' '));
  }
  for(const name of indexNames){
   const escaped=norm(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+');
   const rx=new RegExp('(^|[^\\p{L}\\p{M}\\p{N}_])('+escaped+')(?=$|[^\\p{L}\\p{M}\\p{N}_])','giu');
   for(const m of text.matchAll(rx))add(m[2],m.index+m[1].length,m.index+m[0].length,'Từ điển đã xác nhận');
  }
  const all=[...found.values()].map(item=>{
   const key=fold(item.from),rule=confirmed.find(e=>fold(e.from)===key)||confirmed.find(e=>fold(e.to)===key);
   const links=connections(item.from,profiles);
   item.links=links.map(p=>({id:p.id,name:p.name}));
   item.category=rule?'confirmed':!item.suspect&&item.count>=2&&item.context>=1?'high':'suspect';
   item.to=rule?.to||title(item.from);
   item.auto=!rule&&!item.suspect&&item.count>=3&&item.context>=2&&links.length<=1;
   if(item.suspect){
    item.reason='Có thể là từ dịch nghĩa; cần đối chiếu';
    // A tentative semantic clue is a suggestion only, never a replacement.
    if(key.endsWith(' rõ ràng'))item.links=profiles.filter(p=>fold(p.name)===key.replace(/rõ ràng$/u,'minh')).map(p=>({id:p.id,name:p.name}));
   }
   if(links.length>1){item.auto=false;item.category=rule?'confirmed':'suspect';item.reason='Trùng cách gọi giữa nhiều nhân vật';}
   if(lookup){
    item.suggestions=lookup.suggest(item.from,{profiles});
    const inferred=item.suggestions.filter(s=>s.kind==='inferred'),best=item.suggestions[0];
    if(!rule&&best){item.to=best.name;if(best.kind==='inferred'){item.auto=false;item.suspect=true;item.category='suspect';item.reason=best.reason;}}
    item.inferredAutomatic=!rule&&best?.kind==='inferred'&&best.automatic&&(inferred.length===1||best.personalExact)&&item.count>=3&&item.context>=2&&links.length<=1;
    const at=item.occurrences[0];item.excerpt=text.slice(Math.max(0,at.start-65),Math.min(text.length,at.end+95));
   }
   return item;
  });
  // Suppress prefix fragments when every occurrence belongs to a longer name.
  return all.filter(a=>!a.dictionaryOnly||a.context>0||a.category==='confirmed'||a.count>=2&&a.from===title(a.from))
   .filter(a=>!all.some(b=>b!==a&&fold(b.from).startsWith(fold(a.from)+' ')&&a.occurrences.every(x=>(positions.get(fold(b.from)).get(x.start)||0)>x.end)))
   .sort((a,b)=>({confirmed:0,high:1,suspect:2}[a.category]-{confirmed:0,high:1,suspect:2}[b.category])||b.count-a.count);
 }
 function characters(entries){
  const groups=new Map();
  for(const row of entries.filter(e=>!e.disabledAuto)){
   const id=row.characterId||'legacy:'+fold(row.from);
   if(!groups.has(id))groups.set(id,{id,name:row.characterName||row.to,aliases:[]});
   groups.get(id).aliases.push(row);
  }
  return [...groups.values()];
 }
 function create({storage}={}){
  const histories=new Map(),cache=new Map(),plans=new Map(),EMPTY=[];
  const key=id=>{if(!id||String(id).length>180)throw Error('Không xác định được truyện.');return 'dudu-reader-names-l53:'+encodeURIComponent(id);};
  function validate(rows){
   if(!Array.isArray(rows)||rows.length>legacy.MAX_ENTRIES*2||rows.filter(r=>r?.disabledAuto!==true).length>legacy.MAX_ENTRIES)
    throw Error('Bản sao lưu phải có tối đa 300 cách gọi và 300 tên đã bỏ qua.');
   const seen=new Set();
   return rows.map(row=>{
    const clean=legacy.clean(row?.from,row?.to),alias=fold(clean.from);
    if(seen.has(alias))throw Error('Trùng cách gọi trong bản sao lưu: '+clean.from);seen.add(alias);
    const result={...clean};
    if(row.disabledAuto===true)result.disabledAuto=true;
    if(typeof row.characterId==='string'&&row.characterId.length<=180&&row.characterId){
     result.characterId=row.characterId;result.characterName=legacy.clean(row.characterName,row.characterName).to;
    }
    return result;
   });
  }
  function read(id){
   try{
    const token=key(id),raw=storage?.getItem(token)||'[]';
    if(cache.get(token)?.raw===raw)return cache.get(token).rows.map(r=>({...r}));
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return [];
    const result=[],seen=new Set();
    for(const row of parsed.slice(0,legacy.MAX_ENTRIES*2)){
     try{const item=validate([row])[0];if(!seen.has(fold(item.from))){result.push(item);seen.add(fold(item.from));}}catch(_){/* preserve malformed raw data until an explicit successful write */}
    }
    cache.set(token,{raw,rows:result});return result.map(r=>({...r}));
   }catch(_){return [];}
  }
  function write(id,rows,remember=true){
   // Active legacy-compatible rows come first so L5.3's 300-row reader can
   // still read every active rule. Ignore markers do not consume alias slots.
   const token=key(id),next=validate([...rows.filter(r=>!r.disabledAuto),...rows.filter(r=>r.disabledAuto).slice(-legacy.MAX_ENTRIES)]);
   if(!storage?.setItem)throw Error('Không thể lưu từ điển trên thiết bị này.');
   const old=storage.getItem(token)||'[]';
   // Refuse to replace unreadable data; a backup must be recoverable first.
   try{if(!Array.isArray(JSON.parse(old)))throw Error();}catch(_){throw Error('Dữ liệu cũ bị lỗi. Hãy sao lưu trước khi thay đổi.');}
   try{storage.setItem(token,JSON.stringify(next));}catch(_){throw Error('Thiết bị từ chối lưu từ điển.');}
   if(remember){const history=histories.get(token)||[];history.push({before:old,after:JSON.stringify(next)});histories.set(token,history.slice(-20));}
   return next;
  }
  function add(id,from,to,profileId='',{allowReassign=false}={}){
   const clean=legacy.clean(from,to),rows=read(id),index=rows.findIndex(r=>fold(r.from)===fold(clean.from));
   const profiles=characters(rows),profile=profiles.find(p=>p.id===profileId);
   if(profileId&&!profile)throw Error('Nhân vật đã thay đổi. Hãy chọn lại.');
   if(index>=0&&profile&&rows[index].characterId&&rows[index].characterId!==profile.id&&!rows[index].disabledAuto&&!allowReassign)
    throw Error('Cách gọi này đã thuộc nhân vật khác. Hãy dùng tên đầy đủ để phân biệt.');
   const old=rows[index];
   const characterId=profile?.id||old?.characterId||('person:'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,10));
   const item={...clean,characterId,characterName:profile?.name||old?.characterName||clean.to};
   if(index>=0)rows[index]=item;else rows.push(item);
   // Materialize legacy identity only when the owner explicitly links an alias.
   if(profile?.id.startsWith('legacy:'))for(const r of rows){if('legacy:'+fold(r.from)===profile.id){r.characterId=profile.id;r.characterName=profile.name;}}
   write(id,rows);return item;
  }
  function remove(id,from){
   const rows=read(id),index=rows.findIndex(r=>fold(r.from)===fold(from));if(index<0)return false;
   // A tombstone preserves original display even when the detector finds it again.
   rows[index]={from:rows[index].from,to:rows[index].from,disabledAuto:true};write(id,rows);return true;
  }
  function undo(id){
   const token=key(id),history=histories.get(token)||[],last=history.at(-1);if(!last)return false;
   if(storage.getItem(token)!==last.after)throw Error('Từ điển đã đổi ở tab khác; không thể hoàn tác an toàn.');
   storage.setItem(token,last.before);history.pop();return true;
  }
  function rename(id,profileId,name){
   const cleaned=legacy.clean(name,name).to,rows=read(id),profile=characters(rows).find(p=>p.id===profileId);
   if(!profile)throw Error('Không tìm thấy nhân vật.');
   for(const row of rows)if(profile.aliases.some(a=>fold(a.from)===fold(row.from))){row.characterId=profile.id;row.characterName=cleaned;}
   write(id,rows);
  }
  function detailed(id,text,automatic=EMPTY){
   const token=key(id);let raw='[]';try{raw=storage?.getItem(token)||'[]';}catch(_){}
   let plan=plans.get(token);
   if(!plan||plan.raw!==raw||plan.automatic!==automatic){
    const rows=read(id),keys=new Set(rows.map(r=>fold(r.from)));
    const targets=[];
    for(const row of rows.filter(r=>!r.disabledAuto))if(!keys.has(fold(row.to))){targets.push({from:row.to,to:row.to});keys.add(fold(row.to));}
    const rules=[
    ...rows.filter(r=>!r.disabledAuto),...targets,...automatic.filter(r=>r.auto&&!keys.has(fold(r.from))).map(r=>({from:r.from,to:r.to}))
    ].sort((a,b)=>b.from.length-a.from.length);
    const mapping=new Map(rules.map(r=>[fold(r.from),r.to]));
    const pattern=rules.map(r=>r.from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+')).join('|');
    const rx=rules.length?new RegExp('(^|[^\\p{L}\\p{M}\\p{N}_])('+pattern+')(?=$|[^\\p{L}\\p{M}\\p{N}_])','giu'):null;
    plan={raw,automatic,mapping,rx};plans.set(token,plan);
   }
   const source=String(text||'').normalize('NFC'),segments=[];let result='',cursor=0;
   const {rx,mapping}=plan;
   if(!rx)return {text:source,segments:[{start:0,end:source.length,sourceStart:0,sourceEnd:source.length,replaced:false}],source};
   function append(value,from,to,replaced){const start=result.length;result+=value;segments.push({start,end:result.length,sourceStart:from,sourceEnd:to,replaced,aligned:value.length===to-from&&fold(value)===fold(source.slice(from,to))});}
   for(const match of source.matchAll(rx)){
    const start=match.index+match[1].length,end=match.index+match[0].length;
    append(source.slice(cursor,start),cursor,start,false);append(mapping.get(fold(match[2]))||match[2],start,end,true);cursor=end;
   }
   append(source.slice(cursor),cursor,source.length,false);return {text:result,segments,source};
  }
  function render(id,text,automatic=EMPTY){return detailed(id,text,automatic).text;}
  function backup(id){return JSON.stringify({format:'dudu-reader-names',version:54,storyId:id,entries:read(id)},null,2);}
  function restore(id,content){
   if(typeof content!=='string'||content.length>500000)throw Error('Bản sao lưu quá lớn.');
   let parsed;try{parsed=JSON.parse(content);}catch(_){throw Error('Bản sao lưu không phải JSON hợp lệ.');}
   if(!Array.isArray(parsed)&&(parsed?.format!=='dudu-reader-names'||parsed.version!==54||!Array.isArray(parsed.entries)))throw Error('Không đúng định dạng từ điển.');
   if(!Array.isArray(parsed)&&parsed.storyId!==id)throw Error('Bản sao lưu thuộc truyện khác.');
   const imported=validate(Array.isArray(parsed)?parsed:parsed.entries),rows=read(id),map=new Map(rows.map(r=>[fold(r.from),r]));
   for(const row of imported){
    const old=map.get(fold(row.from));
    if(old&&JSON.stringify(old)!==JSON.stringify(row))throw Error('Xung đột cách gọi: '+row.from+'. Hãy sửa hoặc xóa quy tắc đó trước.');
    map.set(fold(row.from),row);
   }
   return write(id,[...map.values()]);
  }
  return Object.freeze({read,add,remove,undo,rename,render,detailed,backup,restore,characters:id=>characters(read(id)),canUndo:id=>!!histories.get(key(id))?.length});
 }
 return Object.freeze({norm,fold,title,words,analyze,connections,characters,create});
});
