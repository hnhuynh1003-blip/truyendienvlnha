/* DUDU Story Memory v1: local-only, retrieval of prior actual chat snippets.
 * It never invents facts, edits NPC canon or writes Firestore.
 * Caller MUST pass messages already scoped to one Firebase UID + storyId + NPC ID.
 */
(function (root, factory) {
  'use strict';
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  if(root) root.DuduStoryMemory=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const STOP=new Set([
    'la','co','cua','toi','ban','mot','nhung','va','voi','cho','khi','thi','ma',
    'the','nao','sao','duoc','khong','nua','hay','day','roi','luc','noi','chuyen',
    'nhan','vat','nho','con','ve','chung','ta','da','tung','gia','su','theo','kieu',
    'chao','xin','cam','on','dieu','nay','kia','nhu','nhieu','rat','lieu','hom',
    'nay','hom','qua','bay','gio','vay','nhe','nha','vua','xong','lan'
  ]);
  function normalize(value) {
    return String(value||'').normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D')
      .toLowerCase();
  }
  function keywords(value) {
    return new Set(normalize(value).split(/[^a-z0-9]+/)
      .filter(x=>x.length>=3&&!STOP.has(x)).slice(0,32));
  }
  function shorten(text,max=220) {
    if(typeof text!=='string') return '';
    const t=text.trim();
    return t.length<=max?t:'…'+t.slice(-max+1);
  }
  function recall(history,query,options={}) {
    const messages=Array.isArray(history)?history:[];
    const latest=messages.filter(m=>m&&(m.role==='user'||m.role==='model')&&
      typeof m.text==='string'&&m.text.trim());
    // Ignore current live turn + last 8 messages. They are already in the short context.
    const older=latest.slice(0,Math.max(0,latest.length-8));
    const terms=keywords(query);
    if(terms.size<2||older.length<2)return [];
    const candidates=[];
    for(let i=0;i+1<older.length;i++){
      const user=older[i], model=older[i+1];
      if(user.role!=='user'||model.role!=='model'||model.source==='script')continue;
      const haystack=keywords(user.text+' '+model.text);
      const matches=[...terms].filter(term=>haystack.has(term));
      if(matches.length<2)continue;
      candidates.push({i,score:matches.length,turns:[
        {role:'user',text:shorten(user.text)},
        {role:'model',text:shorten(model.text)}
      ]});
      i++;
    }
    // Relevance first, recency second. Restore chronological order for role-play.
    candidates.sort((a,b)=>b.score-a.score||b.i-a.i);
    return candidates.slice(0,Math.min(2,options.maxPairs||2)).sort((a,b)=>a.i-b.i)
      .flatMap(x=>x.turns);
  }
  return Object.freeze({recall,keywords});
});
