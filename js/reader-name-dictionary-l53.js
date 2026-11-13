/* L5.3 — personal, per-story reading aliases. Pure display transformation:
 * never edits chapters or calls Firestore. All replacements are one-pass.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReaderNameDictionaryL53=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_ENTRIES=300,MAX_PHRASE=90,PREFIX='dudu-reader-names-l53:';
 const forbidden=/[\u0000-\u001f\u007f<>]/u;
 const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const norm=value=>typeof value==='string'
  ?value.normalize('NFC').trim().replace(/\s+/gu,' '):'';
 const key=storyId=>{
  const id=String(storyId||'');
  if(!id||id.length>180)throw Error('Không xác định được truyện.');
  return PREFIX+encodeURIComponent(id);
 };
 function clean(from,to){
  const source=norm(from),target=norm(to);
  if(!source||!target||source.length>MAX_PHRASE||target.length>MAX_PHRASE||
    forbidden.test(source)||forbidden.test(target)||
    !/\p{L}/u.test(source)||!/\p{L}/u.test(target))
   throw Error('Tên phải có chữ, không xuống dòng và dài tối đa 90 ký tự.');
  return Object.freeze({from:source,to:target});
 }
 const fold=text=>text.toLocaleLowerCase('vi');
 function compile(entries){
  const sorted=[...entries].sort((a,b)=>b.from.length-a.from.length);
  const mapping=new Map(sorted.map(item=>[fold(item.from),item.to]));
  if(!sorted.length)return null;
  const alternatives=sorted.map(item=>escapeRegExp(item.from).replace(/ /g,'\\s+'));
  const regex=new RegExp('(^|[^\\p{L}\\p{N}_])('+alternatives.join('|')+
   ')(?=$|[^\\p{L}\\p{N}_])','giu');
  return {regex,mapping};
 }
 function applyPattern(text,pattern){
  if(typeof text!=='string'||!text||!pattern)return text;
  return text.replace(pattern.regex,(full,prefix,matched)=>
   prefix+(pattern.mapping.get(fold(norm(matched)))||matched));
 }
 function replace(text,entries){return applyPattern(text,compile(entries||[]));}
 function create({storage}={}){
  const cache=new Map(),patterns=new Map();
  function read(storyId){
   const token=key(storyId);
   if(cache.has(token))return cache.get(token);
   let value=[];
   try{
    const raw=storage?.getItem(token);
    if(raw){
     const parsed=JSON.parse(raw);
     if(Array.isArray(parsed)){
      const seen=new Set();
      for(const row of parsed.slice(0,MAX_ENTRIES)){
       try{
        const item=clean(row?.from,row?.to),alias=fold(item.from);
        if(!seen.has(alias)){value.push(item);seen.add(alias);}
       }catch(_){/* ignore malformed local entries */}
      }
     }
    }
   }catch(_){/* storage may be disabled; reading remains available */}
   cache.set(token,value);
   return value;
  }
  function write(storyId,entries){
   const token=key(storyId);
   if(!storage?.setItem)throw Error('Không thể lưu từ điển trên thiết bị này.');
   try{storage.setItem(token,JSON.stringify(entries));}
   catch(_){throw Error('Thiết bị từ chối lưu tên riêng. Hãy kiểm tra bộ nhớ trình duyệt.');}
   cache.delete(token);patterns.delete(token);
  }
  function add(storyId,from,to){
   const item=clean(from,to),existing=read(storyId);
   const index=existing.findIndex(row=>fold(row.from)===fold(item.from));
   if(index<0&&existing.length>=MAX_ENTRIES)
    throw Error('Một truyện chỉ lưu tối đa 300 cách gọi. Hãy bỏ tên không dùng.');
   const next=[...existing];
   if(index<0)next.push(item);else next[index]=item;
   write(storyId,next);return item;
  }
  function remove(storyId,from){
   const prior=read(storyId),next=prior.filter(item=>fold(item.from)!==fold(norm(from)));
   if(next.length===prior.length)return false;
   write(storyId,next);return true;
  }
  function render(storyId,content){
   const token=key(storyId);
   if(!patterns.has(token))patterns.set(token,compile(read(storyId)));
   return applyPattern(content,patterns.get(token));
  }
  return Object.freeze({read,add,remove,render});
 }
 return Object.freeze({MAX_ENTRIES,MAX_PHRASE,clean,replace,create});
});
