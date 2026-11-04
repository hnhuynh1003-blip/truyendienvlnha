/* DUDU Library L5.1 — deterministic, local chapter preparation.
 * The AI never receives the whole long chapter. No network, Firebase writes
 * or edits happen in this module; a human must review any proposed revision.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduChapterAIChunkL5=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PART_CHARS=2800,MAX_PARTS=48;
 const SPACE=/\s/u, SENTENCE=/[.!?…。！？;]/u;
 const boundary=(text,start,end,check)=>{
  for(let i=end-1;i>start;i--)if(check(text,i))return i+1;
  return -1;
 };
 const chooseEnd=(text,start,maxChars)=>{
  const limit=Math.min(start+maxChars,text.length);
  if(limit===text.length)return limit;
  const min=start+Math.floor(maxChars*.45);
  const breaks=[
   (s,i)=>s[i]==='\n'&&s[i+1]==='\n',
   (s,i)=>s[i]==='\n',
   (s,i)=>SENTENCE.test(s[i])&&SPACE.test(s[i+1]||''),
   (s,i)=>SPACE.test(s[i])
  ];
  for(const good of breaks){
   const cut=boundary(text,min,limit,good);
   if(cut>start)return cut;
  }
  throw Error('Có một đoạn liền mạch quá dài. Hãy thêm khoảng trắng hoặc ngắt đoạn trước khi dùng AI.');
 };
 function plan(text,{partChars=PART_CHARS,maxParts=MAX_PARTS}={}){
  if(typeof text!=='string'||!text.trim())throw Error('Chưa có nội dung chương để biên tập.');
  if(!Number.isInteger(partChars)||partChars<500||partChars>3200||
   !Number.isInteger(maxParts)||maxParts<1||maxParts>MAX_PARTS)
   throw Error('Giới hạn chia đoạn không hợp lệ.');
  const parts=[];
  for(let start=0;start<text.length;){
   const end=chooseEnd(text,start,partChars),raw=text.slice(start,end);
   if(!raw)throw Error('Không thể chia đoạn văn an toàn.');
   const leading=raw.match(/^\s*/u)[0],trailing=raw.match(/\s*$/u)[0];
   const core=raw.trim();
   parts.push(Object.freeze({raw,leading:core?leading:raw,core,trailing:core?trailing:''}));
   if(parts.length>maxParts)
    throw Error('Chương cần hơn '+maxParts+' lượt AI. Hãy biên tập theo từng phần để tiết kiệm lượt.');
   start=end;
  }
  if(!parts.some(part=>part.core))throw Error('Chưa có chữ trong chương.');
  return Object.freeze({source:text,parts:Object.freeze(parts),requests:parts.filter(p=>p.core).length});
 }
 function assemble(prepared,answers){
  if(!prepared||!Array.isArray(prepared.parts)||!Array.isArray(answers)||
   answers.length!==prepared.parts.length)throw Error('Chưa đủ kết quả AI để xem trước.');
  const result=prepared.parts.map((part,i)=>{
   if(!part.core)return part.raw;
   const answer=answers[i];
   if(typeof answer!=='string'||!answer.trim()||answer.length>12000)
    throw Error('Kết quả AI của đoạn '+(i+1)+' không hợp lệ.');
   return part.leading+answer.trim()+part.trailing;
  }).join('');
  return result;
 }
 function context(text,mode='continue'){
  if(typeof text!=='string')throw Error('Nội dung chương không hợp lệ.');
  const source=text.trim(),head=mode==='ideas'?1050:400,tail=mode==='ideas'?1400:1750;
  if(source.length<=head+tail)return source;
  const first=source.slice(0,head).replace(/\s+\S*$/u,'').trim();
  const last=source.slice(-tail).replace(/^\S*\s+/u,'').trim();
  return '[Đầu chương]\n'+first+'\n\n[Đã lược bỏ phần giữa để tiết kiệm ký tự]\n\n[Cuối chương]\n'+last;
 }
 return Object.freeze({PART_CHARS,MAX_PARTS,plan,assemble,context});
});
