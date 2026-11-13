/* L2D: one read-only search surface for legacy and published EPUB stories.
 * Old EPUBs may store their synopsis as a chapter named "Văn án" instead of
 * in the book metadata. Never write to Firestore or mutate book/chapter data.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibrarySynopsisSearchL2D=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';

 const normalize=value=>String(value||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLocaleLowerCase('vi');
 const inlineSynopsis=book=>String(book?.introData?.text||book?.intro||book?.desc||'').trim();
 const synopsisChapter=book=>Array.isArray(book?.chapters)?book.chapters.find(ch=>
  /^văn án(?:\b|\s|:|$)/iu.test(String(ch?.title||'').trim())):null;
 const cleanSynopsis=value=>String(value||'').replace(/^\s*văn án\s*(?:\r?\n)+/iu,'').trim();

 function matches(book,query,extraSynopsis=''){
  const words=normalize(query).trim().split(/\s+/).filter(Boolean);
  if(!words.length)return true;
  const fields=[book?.title,book?.author,book?.genre,book?.desc,
   book?.introData?.text,book?.intro,extraSynopsis];
  if(Array.isArray(book?.characters))for(const character of book.characters){
   fields.push(character?.name);
  }
  const haystack=normalize(fields.filter(Boolean).join(' '));
  return words.every(word=>haystack.includes(word));
 }

 function createIndex(readChapter){
  if(typeof readChapter!=='function')throw TypeError('Cần hàm đọc chương công khai');
  const resolved=new Map();
  const fetching=new Map();
  const failed=new Set();
  const keyFor=book=>{
   const chapter=synopsisChapter(book);
   return chapter?String(book.id)+'|'+String(book.updatedAt||'')+'|'+String(chapter.id):'';
  };
  const eligible=book=>!!(book?._cloudV49&&!inlineSynopsis(book)&&synopsisChapter(book)?.id);
  // Published metadata takes precedence if an author later edits an old EPUB.
  const getSynopsis=book=>inlineSynopsis(book)?'':(resolved.get(keyFor(book))||'');
  const isUnresolved=book=>{
   const key=keyFor(book);
   return !!(eligible(book)&&!resolved.has(key)&&!failed.has(key));
  };
  const isFailed=book=>eligible(book)&&failed.has(keyFor(book));

  function ensure(book){
   if(!eligible(book))return Promise.resolve(inlineSynopsis(book));
   const key=keyFor(book);
   if(resolved.has(key))return Promise.resolve(resolved.get(key));
   if(failed.has(key))return Promise.reject(Error('Văn án EPUB chưa tải được trong phiên này'));
   if(fetching.has(key))return fetching.get(key);
   const chapter=synopsisChapter(book);
   const task=Promise.resolve().then(()=>typeof chapter.content==='string'?
    {content:chapter.content}:readChapter(book.id,chapter.id))
    .then(result=>{
     const value=cleanSynopsis(result?.content);
     resolved.set(key,value);
     return value;
    })
    .catch(error=>{failed.add(key);throw error;})
    .finally(()=>fetching.delete(key));
   fetching.set(key,task);
   return task;
  }

  async function loadMissing(books,onProgress=()=>{}){
   const queue=(Array.isArray(books)?books:[]).filter(isUnresolved);
   let cursor=0;
   async function worker(){
    while(cursor<queue.length){
     const book=queue[cursor++];
     try{await ensure(book);}catch(_){/* Keep other results available. */}
     onProgress();
    }
   }
   await Promise.all(Array.from({length:Math.min(3,queue.length)},worker));
  }

  return Object.freeze({getSynopsis,ensure,loadMissing,isUnresolved,isFailed});
 }

 return Object.freeze({normalize,matches,inlineSynopsis,synopsisChapter,cleanSynopsis,createIndex});
});
