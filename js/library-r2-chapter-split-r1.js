/* DUDU R2 Chapter Split R1 — deterministic, LOCAL ONLY.
 * Splits a single V57 canonical plain-text chapter into bounded virtual
 * chapters without changing even one code unit. No upload, state or I/O.
 * The caller must still validate the original EPUB, layouts and media.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduR2ChapterSplitR1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_INPUT=4500000,MAX_PART_CHARS=155000,MAX_PART_BYTES=290000,MAX_PARTS=160;
 const textBytes=new TextEncoder();
 function safeCut(text,end){
  if(end>0&&end<text.length){
   const left=text.charCodeAt(end-1),right=text.charCodeAt(end);
   if(left>=0xd800&&left<=0xdbff&&right>=0xdc00&&right<=0xdfff)return end-1;
  }
  return end;
 }
 function takeLength(text,start){
  const cap=safeCut(text,Math.min(text.length,start+MAX_PART_CHARS));
  if(textBytes.encode(text.slice(start,cap)).length<=MAX_PART_BYTES)return cap;
  let lo=start+1,hi=cap,ok=start;
  while(lo<=hi){
   // Advance by the original pivot, NOT the surrogate-adjusted cut:
   // otherwise a budget boundary inside an emoji pair could loop forever.
   const pivot=Math.floor((lo+hi)/2);
   const mid=safeCut(text,pivot);
   if(mid<=start){lo=pivot+1;continue;}
   if(textBytes.encode(text.slice(start,mid)).length<=MAX_PART_BYTES){
    ok=mid;lo=pivot+1;
   }else hi=pivot-1;
  }
  return safeCut(text,ok);
 }
 function split(text,title){
  if(typeof text!=='string'||!text.trim()||text.length>MAX_INPUT||
     typeof title!=='string'||!title.trim()||title.length>140)
   throw Error('R2 chapter split: invalid original text or title');
  if(text.length<=220000&&textBytes.encode(text).length<=420000)
   return Object.freeze([{title,content:text}]);
  const content=[],startLength=text.length;
  for(let start=0;start<text.length;){
   if(content.length>=MAX_PARTS)throw Error('R2 chapter split: exceeds 160 chapters; separate the EPUB into volumes');
   let end=takeLength(text,start);
   if(end<=start)throw Error('R2 chapter split: cannot fit Unicode content safely');
   if(end<text.length){
    const span=end-start,lower=start+Math.floor(span*.55);
    const paragraph=text.lastIndexOf('\n\n',end-1);
    const newline=text.lastIndexOf('\n',end-1);
    const space=text.lastIndexOf(' ',end-1);
    let at=paragraph>=lower?paragraph+2:newline>=lower?newline+1:space>=lower?space+1:end;
    at=safeCut(text,at);
    if(at>start)end=at;
   }
   const part=text.slice(start,end);
   if(!part.trim())throw Error('R2 chapter split: whitespace-only part not safe');
   if(part.length>MAX_PART_CHARS||textBytes.encode(part).length>MAX_PART_BYTES)
    throw Error('R2 chapter split: exceeded part bounds');
   content.push(part);
   start=end;
  }
  if(content.join('')!==text||content.join('').length!==startLength)
   throw Error('R2 chapter split: lossless invariant failed');
  return Object.freeze(content.map((part,i)=>{
   const suffix=' (phần '+(i+1)+'/'+content.length+')';
   return Object.freeze({title:title.slice(0,140-suffix.length).trimEnd()+suffix,content:part});
  }));
 }
 return Object.freeze({split,MAX_INPUT,MAX_PART_CHARS,MAX_PART_BYTES,MAX_PARTS});
});