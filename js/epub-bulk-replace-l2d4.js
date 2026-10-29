/* DUDU L2D.4 — EPUB terminology correction planner.
 * Pure, read-only preview: NO Firestore writes and NO automatic application.
 * Selected patches will be persisted only by the separately reviewed L2D.5
 * workflow with revisions, permissions and partial-failure recovery.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubBulkReplaceL2D4=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_CHAPTERS=160,MAX_RULES=30,MAX_MATCHES=20000,MAX_CHARS=220000,MAX_BYTES=420000;
 const IDENTIFIER=/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/;
 const WORD=/[\p{L}\p{N}_]/u;
 const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const prevChar=(text,pos)=>{
  if(!pos)return '';
  let at=pos-1;
  if(at&&text.charCodeAt(at)>=0xDC00&&text.charCodeAt(at)<=0xDFFF)at--;
  return String.fromCodePoint(text.codePointAt(at));
 };
 const nextChar=(text,pos)=>pos<text.length?String.fromCodePoint(text.codePointAt(pos)):'';
 const isWord=c=>!!c&&WORD.test(c);
 const wholeWord=(text,start,end)=>!isWord(prevChar(text,start))&&!isWord(nextChar(text,end));
 const urlRanges=text=>{
  const matches=[];
  for(const m of text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/gi))
   matches.push([m.index,m.index+m[0].length]);
  return matches;
 };
 const overlaps=(start,end,ranges)=>ranges.some(([a,b])=>start<b&&end>a);
 const pattern=rule=>new RegExp(escapeRegex(rule.from),'gu'+(rule.caseSensitive?'':'i'));

 function normalizeRules(inputs){
  if(!Array.isArray(inputs)||!inputs.length||inputs.length>MAX_RULES)
   throw Error('Cần 1–30 quy tắc tìm và thay thế');
  return inputs.map((input,i)=>{
   const from=typeof input?.from==='string'?input.from.trim():'';
   const to=typeof input?.to==='string'?input.to.trim():'';
   if(!from||!to||from.length>120||to.length>160||
      /[\r\n\u0000-\u001F]/.test(from+to)||from===to)
    throw Error('Quy tắc '+(i+1)+' thiếu từ hoặc vượt giới hạn');
   return Object.freeze({from,to,wholeWord:input.wholeWord!==false,
    caseSensitive:input.caseSensitive===true});
  });
 }

 function validateChapters(chapters){
  if(!Array.isArray(chapters)||!chapters.length||chapters.length>MAX_CHAPTERS)
   throw Error('Chỉ nhận từ 1 đến 160 chương EPUB');
  const seen=new Set();
  for(const ch of chapters){
   if(!IDENTIFIER.test(ch?.id)||seen.has(ch.id)||typeof ch.content!=='string'||
      !ch.content.trim()||ch.content.length>MAX_CHARS||
      !Number.isSafeInteger(ch.editVersion??0)||(ch.editVersion??0)<0)
    throw Error('Thiếu nội dung, trùng mã hoặc phiên bản chương không hợp lệ');
   seen.add(ch.id);
  }
 }

 // The entire search is performed against ORIGINAL text. New replacements
 // never cascade into later search rules and original line breaks survive.
 function prepare(chapters,inputs){
  validateChapters(chapters);
  const rules=normalizeRules(inputs);
  const allHits=[],chapterPlans=[];
  for(const chapter of chapters){
   const content=chapter.content,ranges=urlRanges(content),hits=[];
   for(let ruleIndex=0;ruleIndex<rules.length;ruleIndex++){
    const rule=rules[ruleIndex],re=pattern(rule);
    for(const m of content.matchAll(re)){
     const start=m.index,end=start+m[0].length;
     if((rule.wholeWord&&!wholeWord(content,start,end))||
        overlaps(start,end,ranges)||m[0]===rule.to)continue;
     const hit=Object.freeze({
      id:chapter.id+'|'+start+'|'+end+'|'+ruleIndex,
      chapterId:chapter.id,chapterTitle:String(chapter.title||chapter.id),
      ruleIndex,start,end,matched:m[0],replacement:rule.to,
      before:content.slice(Math.max(0,start-55),start),
      after:content.slice(end,Math.min(content.length,end+55)),
     });
     hits.push(hit);
     if(allHits.length+hits.length>MAX_MATCHES)
      throw Error('Có quá nhiều kết quả; hãy thu hẹp tên hoặc chọn ít chương hơn');
    }
   }
   hits.sort((a,b)=>a.start-b.start||b.end-a.end||a.ruleIndex-b.ruleIndex);
   // Conflicts are shown and rejected if both are selected; there is never
   // a silent priority between overlapping character/place names.
   const conflicts=[];
   for(let i=0;i<hits.length;i++){
    for(let j=i+1;j<hits.length&&hits[j].start<hits[i].end;j++){
     conflicts.push(Object.freeze([hits[i].id,hits[j].id]));
    }
   }
   allHits.push(...hits);
   chapterPlans.push(Object.freeze({id:chapter.id,title:String(chapter.title||chapter.id),
    content,editVersion:chapter.editVersion??0,hits:Object.freeze(hits),
    conflicts:Object.freeze(conflicts)}));
  }
  return Object.freeze({rules:Object.freeze(rules),
   chapters:Object.freeze(chapterPlans),hits:Object.freeze(allHits),
   total:allHits.length,conflictCount:chapterPlans.reduce((n,ch)=>n+ch.conflicts.length,0)});
 }

 // Explicit selection is mandatory. An empty selection means no changes.
 // Each returned patch contains the original snapshot for optimistic locking
 // when a future persistence controller calls L2D.3.saveChapter.
 function selectedPatches(plan,selectedIds){
  if(!plan||!Array.isArray(plan.chapters)||!Array.isArray(selectedIds))
   throw Error('Chưa chọn những vị trí cần chỉnh sửa');
  const selection=new Set(selectedIds);
  if(selection.size!==selectedIds.length)throw Error('Danh sách lựa chọn bị trùng');
  const recognized=new Set(plan.hits.map(h=>h.id));
  for(const id of selection)if(!recognized.has(id))
   throw Error('Vị trí đã chọn không thuộc kết quả đang xem');
  const patches=[];
  for(const chapter of plan.chapters){
   const hits=chapter.hits.filter(h=>selection.has(h.id));
   if(!hits.length)continue;
   hits.sort((a,b)=>a.start-b.start||a.end-b.end);
   for(let i=1;i<hits.length;i++){
    if(hits[i].start<hits[i-1].end)
     throw Error('Hai quy tắc đang sửa chồng lên nhau; bỏ chọn một kết quả');
   }
   let content=chapter.content;
   for(let i=hits.length-1;i>=0;i--){
    const h=hits[i];
    if(content.slice(h.start,h.end)!==h.matched)
     throw Error('Nội dung xem trước không còn khớp; cần quét lại');
    content=content.slice(0,h.start)+h.replacement+content.slice(h.end);
   }
   if(content.length>MAX_CHARS||new TextEncoder().encode(content).length>MAX_BYTES)
    throw Error('Nội dung sau sửa vượt giới hạn của chương');
   if(content!==chapter.content)patches.push(Object.freeze({
    chapterId:chapter.id,expectedContent:chapter.content,
    expectedVersion:chapter.editVersion,content,
    changedOccurrences:hits.length,
    // Compact, original-offset operations for crash-safe recovery. They
    // reconstruct both versions from Firestore without saving full chapters
    // in the browser's recovery manifest.
    edits:Object.freeze(hits.map(h=>Object.freeze({
     start:h.start,end:h.end,matched:h.matched,replacement:h.replacement
    }))),
   }));
  }
  return Object.freeze({patches:Object.freeze(patches),chaptersChanged:patches.length,
   occurrencesChanged:patches.reduce((n,p)=>n+p.changedOccurrences,0)});
 }
 return Object.freeze({MAX_CHAPTERS,MAX_RULES,MAX_MATCHES,normalizeRules,
  prepare,selectedPatches});
});
