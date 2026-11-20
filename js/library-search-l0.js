/* DUDU Library SEARCH L0 — read-only match and rank engine. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduLibrarySearchL0=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const normalize=value=>String(value??'').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
    .toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
  const tokens=value=>normalize(value).split(' ').filter(Boolean);
  const hasTrailingBoundary=value=>/[\s,.;:!?/|)\]}]$/u.test(String(value??''));
  function consume(source,terms,prefixLast){
    const used=new Set();
    for(let i=0;i<terms.length;i++){
      const final=i===terms.length-1;
      const term=terms[i];
      const index=source.findIndex((word,j)=>!used.has(j)&&
        (prefixLast&&final?word.startsWith(term):word===term));
      if(index<0)return false;
      used.add(index);
    }
    return true;
  }
  function rankField(value,query){
    const q=tokens(query);
    if(!q.length)return 0;
    const text=normalize(value),words=tokens(value);
    if(!text)return null;
    const target=q.join(' ');
    if(text===target)return 0;
    if((' '+text+' ').includes(' '+target+' '))return 1;
    if(consume(words,q,false))return 2;
    if(!hasTrailingBoundary(query)&&q[q.length-1].length>=2&&consume(words,q,true))return 3;
    return null;
  }
  function rankTitleAuthor(book,query){
    if(!tokens(query).length)return 0;
    const a=rankField(book?.title,query),b=rankField(book?.author,query);
    if(a!==null)return a;
    if(b!==null)return b+4;
    return null;
  }
  function rankSynopsis(value,query){
    return rankField(value,query);
  }
  function inlineSynopsis(book){
    return String(book?.introData?.text||book?.intro||book?.desc||'').trim();
  }
  function score(book,a,b,extraSynopsis=''){
    const ar=rankTitleAuthor(book,a);
    if(ar===null)return null;
    const br=tokens(b).length?rankSynopsis(inlineSynopsis(book)||extraSynopsis,b):0;
    if(br===null)return null;
    return {rankA:ar,rankB:br};
  }
  function compareRelevance(a,b){
    return a.rankA-b.rankA||a.rankB-b.rankB||a.accentPenalty-b.accentPenalty||
      b.date-a.date||String(a.book.id??'').localeCompare(String(b.book.id??''),'vi');
  }
  function accentPenalty(original,query){
    if(!tokens(query).length)return 0;
    const raw=value=>String(value??'').normalize('NFC').toLocaleLowerCase('vi');
    const needle=raw(query).trim();
    return raw(original).includes(needle)?0:1;
  }
  // Use a bounded, contiguous excerpt from the real synopsis; no generated sentences.
  function snippet(source,query,maxLength=155){
    const raw=String(source||'').replace(/\s+/g,' ').trim();
    if(!raw)return {text:'',markStart:-1,markEnd:-1};
    const needle=tokens(query);
    let flat='',positions=[];
    for(let i=0;i<raw.length;i++){
      const part=String(raw[i]).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[đĐ]/g,'d').toLocaleLowerCase('vi');
      for(const char of part){
        flat+=/[^\p{L}\p{N}]/u.test(char)?' ':char;
        positions.push(i);
      }
    }
    let at=-1,term='';
    const phrase=normalize(query);
    if(phrase){at=flat.indexOf(phrase);if(at>=0)term=phrase;}
    if(at<0){
      for(const candidate of needle){
        const ix=flat.indexOf(candidate);
        if(ix>=0&&(at<0||ix<at)){at=ix;term=candidate;}
      }
    }
    const center=at>=0?positions[at]:0;
    const from=Math.max(0,Math.min(center-38,Math.max(0,raw.length-maxLength)));
    const to=Math.min(raw.length,from+maxLength);
    let text=(from>0?'…':'')+raw.slice(from,to)+(to<raw.length?'…':'');
    const pad=from>0?1:0;
    const first=at>=0?pad+Math.max(0,positions[at]-from):-1;
    const last=at>=0?pad+Math.min(to,positions[Math.min(positions.length-1,at+term.length-1)]+1)-from:-1;
    return {text,markStart:first>=0&&first<text.length?first:-1,markEnd:last>first?Math.min(last,text.length):-1};
  }
  return Object.freeze({normalize,tokens,rankField,rankTitleAuthor,rankSynopsis,inlineSynopsis,score,
    compareRelevance,accentPenalty,snippet});
});