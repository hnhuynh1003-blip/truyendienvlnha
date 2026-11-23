/* Personal display boundaries only. No chapter text is persisted. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;if(root)root.DuduParagraphModelR1=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const MAX=10000;
 function boundaries(text){const result=[];for(let i=0;i<text.length;i++)if(text[i]==='\n')result.push(i+1);return result;}
 function valid(text,cuts){
  if(!Array.isArray(cuts)||cuts.length>MAX)return false;
  const ends=new Set(Array.from(new Intl.Segmenter('vi',{granularity:'grapheme'}).segment(text),x=>x.index));
  return cuts.every((x,i)=>Number.isSafeInteger(x)&&x>0&&x<text.length&&(!i||x>cuts[i-1])&&ends.has(x));
 }
 function parts(text,cuts){if(!valid(text,cuts))throw Error('INVALID_BOUNDARIES');const edges=[0,...cuts,text.length];return edges.slice(1).map((end,i)=>text.slice(edges[i],end).replace(/\n/g,' ').trim()).filter(Boolean);}
 const key=(uid,book,chapter,fp)=>'dudu-paragraph-r1:'+JSON.stringify([uid,book,chapter,fp]);
 function record(scope,cuts){return {schema:1,uid:scope.uid,book:scope.book,chapter:scope.chapter,fingerprint:scope.fingerprint,cuts:cuts.map(x=>x.slice())};}
 function validate(data,scope,texts){return !!data&&data.schema===1&&['uid','book','chapter','fingerprint'].every(k=>data[k]===scope[k])&&Array.isArray(data.cuts)&&data.cuts.length===texts.length&&data.cuts.every((c,i)=>valid(texts[i],c));}
 return Object.freeze({boundaries,valid,parts,key,record,validate});
});
