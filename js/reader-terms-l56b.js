/* L5.6B: offline glossary. Candidates do not modify the reader or source chapters. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReaderTermsL56B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=s=>typeof s==='string'?s.normalize('NFC').trim().replace(/\s+/gu,' '):'';
 const fold=s=>norm(s).toLocaleLowerCase('vi');
 const defaults=('tu vi|linh căn|cảnh giới|đan điền|linh khí|linh thạch|pháp bảo|công pháp|pháp khí|đan dược|nguyên thần|thần thức|trận pháp|kết giới|kiếm ý|kiếm khí|chân khí|linh lực|bí cảnh|thiên kiếp|phi thăng|luyện khí|trúc cơ|kim đan|nguyên anh|hóa thần|độ kiếp').split('|');
 const MAX=200,MAX_IGNORED=300;
 const key=id=>{
  if(!id||String(id).length>180)throw Error('Không xác định được truyện.');
  return 'dudu-reader-terms-l56b:'+encodeURIComponent(id);
 };
 function cleanTerm(s){
  const v=norm(s);
  if(v.length<2||v.length>90||/[\r\n<>]/u.test(v)||!/\p{L}/u.test(v))
   throw Error('Thuật ngữ cần từ 2 đến 90 ký tự, không chứa ký hiệu HTML.');
  return v;
 }
 function cleanNote(s){
  const v=norm(s||'');
  if(v.length>240||/[\r\n<>]/u.test(v))throw Error('Ghi chú tối đa 240 ký tự.');
  return v;
 }
 function blank(){return {version:1,entries:[],ignored:[]};}
 function validate(data){
  if(!data||data.version!==1||!Array.isArray(data.entries)||!Array.isArray(data.ignored)||
   data.entries.length>MAX||data.ignored.length>MAX_IGNORED)
   throw Error('Dữ liệu thuật ngữ không hợp lệ; chưa ghi đè dữ liệu cũ.');
  const seen=new Set();
  const entries=data.entries.map(r=>{
   const term=cleanTerm(r?.term),note=cleanNote(r?.note);
   if(seen.has(fold(term)))throw Error('Thuật ngữ bị trùng: '+term);
   seen.add(fold(term));return {term,note};
  });
  const ignores=new Set();
  const ignored=data.ignored.map(v=>{
   const s=cleanTerm(v);
   if(ignores.has(fold(s)))throw Error('Danh sách bỏ qua có mục trùng.');
   ignores.add(fold(s));return s;
  });
  return {version:1,entries,ignored};
 }
 function literalMatches(text,phrase){
  const escape=s=>s.replace(/[|\\{}()[\]^$+*?.]/g,'\\$&').replace(/\s+/gu,'\\s+');
  const nfc=escape(norm(phrase)),nfd=escape(norm(phrase).normalize('NFD'));
  const inner=nfc===nfd?nfc:'(?:'+nfc+'|'+nfd+')';
  const rx=new RegExp('(?<![\\p{L}\\p{M}\\p{N}_])'+inner+'(?![\\p{L}\\p{M}\\p{N}_])','giu');
  return Array.from(text.matchAll(rx),m=>({start:m.index,end:m.index+m[0].length}));
 }
 function analyze(text,entries=[],ignored=[],nameRules=[]){
  const source=String(text||'');
  if(source.length>2000000)throw Error('Chương quá dài; chỉ kiểm tra từng phần.');
  const active=validate({version:1,entries,ignored});
  const excluded=new Set(active.ignored.map(fold));
  const names=new Set(nameRules.filter(v=>v&&!v.disabledAuto).flatMap(v=>[fold(v.from),fold(v.to)]));
  const saved=new Map(active.entries.map(r=>[fold(r.term),r]));
  const possibilities=new Map(defaults.map(s=>[fold(s),s]));
  for(const entry of active.entries)possibilities.set(fold(entry.term),entry.term);
  const result=[];
  for(const [id,phrase] of possibilities){
   if(names.has(id)||(!saved.has(id)&&excluded.has(id)))continue;
   const hits=literalMatches(source,phrase);
   if(!hits.length)continue;
   const found=saved.get(id),first=hits[0];
   result.push({
    kind:found?'termConfirmed':'termCandidate',term:source.slice(first.start,first.end),
    note:found?.note||'',count:hits.length,occurrences:hits.slice(0,12),
    excerpt:source.slice(Math.max(0,first.start-65),Math.min(source.length,first.end+85)),
    evidence:found?'Đã lưu trong từ điển thuật ngữ của truyện':'Danh mục gợi ý cục bộ · chưa xác minh',
    source:'L5.6B trên thiết bị',auto:false
   });
  }
  return result.sort((a,b)=>Number(b.kind==='termConfirmed')-Number(a.kind==='termConfirmed')||a.occurrences[0].start-b.occurrences[0].start).slice(0,150);
 }
 function create({storage}={}){
  const history=new Map();
  function load(id){
   const k=key(id);let raw;
   try{raw=storage?.getItem(k);}catch(_){throw Error('Không đọc được từ điển thuật ngữ trên thiết bị.');}
   if(!raw)return blank();
   let parsed;try{parsed=JSON.parse(raw);}catch(_){throw Error('Từ điển thuật ngữ hỏng; dữ liệu cũ chưa bị ghi đè.');}
   return validate(parsed);
  }
  function persist(id,next){
   const k=key(id);
   if(!storage?.setItem)throw Error('Thiết bị không hỗ trợ lưu thuật ngữ.');
   const after=JSON.stringify(validate(next)),before=storage.getItem(k);
   try{storage.setItem(k,after);}catch(_){throw Error('Không lưu được thuật ngữ; dữ liệu cũ được giữ nguyên.');}
   history.set(k,{before,after});return next;
  }
  function read(id){return load(id).entries;}
  function ignored(id){return load(id).ignored;}
  function add(id,term,note='',nameRules=[]){
   const phrase=cleanTerm(term),meaning=cleanNote(note),state=load(id);
   const names=new Set(nameRules.filter(r=>r&&!r.disabledAuto).flatMap(r=>[fold(r.from),fold(r.to)]));
   if(names.has(fold(phrase)))throw Error('Cụm này đã là tên nhân vật; hãy chỉnh trong Từ điển nhân vật.');
   const pos=state.entries.findIndex(r=>fold(r.term)===fold(phrase));
   if(pos>=0)state.entries[pos]={term:phrase,note:meaning};
   else{if(state.entries.length>=MAX)throw Error('Một truyện tối đa 200 thuật ngữ.');state.entries.push({term:phrase,note:meaning});}
   state.ignored=state.ignored.filter(r=>fold(r)!==fold(phrase));
   return persist(id,state);
  }
  function remove(id,term){
   const state=load(id),next=state.entries.filter(r=>fold(r.term)!==fold(term));
   if(next.length===state.entries.length)return false;
   state.entries=next;persist(id,state);return true;
  }
  function ignore(id,term){
   const phrase=cleanTerm(term),state=load(id);
   if(state.entries.some(r=>fold(r.term)===fold(phrase)))throw Error('Thuật ngữ đã lưu; hãy xóa mục trước khi bỏ qua.');
   if(!state.ignored.some(v=>fold(v)===fold(phrase))){state.ignored.push(phrase);if(state.ignored.length>MAX_IGNORED)state.ignored.shift();persist(id,state);}
   return state.ignored;
  }
  function allow(id,term){
   const state=load(id),next=state.ignored.filter(s=>fold(s)!==fold(term));
   if(next.length!==state.ignored.length){state.ignored=next;persist(id,state);}
   return next;
  }
  function undo(id){
   const k=key(id),old=history.get(k);
   if(!old)return false;
   if(storage?.getItem(k)!==old.after)throw Error('Từ điển đã thay đổi ở tab khác; không thể hoàn tác.');
   if(old.before===null)storage.removeItem(k);
   else storage.setItem(k,old.before);
   history.delete(k);return true;
  }
  function backup(id){return JSON.stringify({format:'dudu-reader-terms',storyId:id,...load(id)},null,2);}
  function restore(id,input){
   if(typeof input!=='string'||input.length>200000)throw Error('Tệp sao lưu thuật ngữ quá lớn.');
   let parsed;try{parsed=JSON.parse(input);}catch(_){throw Error('JSON thuật ngữ không hợp lệ.');}
   if(parsed?.format!=='dudu-reader-terms'||parsed.storyId!==id)throw Error('Bản sao lưu không thuộc truyện này.');
   const imported=validate(parsed),old=load(id),mapped=new Map(old.entries.map(r=>[fold(r.term),r]));
   for(const entry of imported.entries){
    const k=fold(entry.term),current=mapped.get(k);
    if(current&&current.note!==entry.note)throw Error('Xung đột ghi chú thuật ngữ: '+entry.term);
    mapped.set(k,entry);
   }
   const ignored=[...new Map([...old.ignored,...imported.ignored].map(v=>[fold(v),v])).values()]
    .filter(v=>!mapped.has(fold(v))).slice(-MAX_IGNORED);
   return persist(id,{version:1,entries:[...mapped.values()],ignored});
  }
  function scan(id,text,nameRules=[]){const data=load(id);return analyze(text,data.entries,data.ignored,nameRules);}
  return Object.freeze({read,ignored,add,remove,ignore,allow,undo,backup,restore,scan});
 }
 return Object.freeze({defaults,norm,fold,analyze,create});
});
