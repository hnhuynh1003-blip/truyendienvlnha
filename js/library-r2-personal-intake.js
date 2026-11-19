/* Local-only EPUB preparation. Reuses V48; no requests, tokens or publishing. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduR2PersonalIntake=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clean=(s,max)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
 const synopsis=s=>clean(String(s||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' '),3000);
 function create({parse,options}={}){
  if(typeof parse!=='function')throw Error('Bộ đọc EPUB chưa sẵn sàng.');
  let selected=null,pending=null;
  return Object.freeze({async prepare(file){
   if(file!==selected||!pending){selected=file;const task=Promise.resolve().then(()=>parse(file,options));pending=task;task.catch(()=>{if(pending===task){pending=null;selected=null;}});}
   const parsed=await pending;
   return {parsed,metadata:{title:clean(parsed.title,140),author:parsed.author==='Chưa rõ'?'':clean(parsed.author,140),genre:clean(parsed.genre,220),description:synopsis(parsed.desc),publicationState:['Đang ra','Hoàn thành'].includes(parsed.publicationState)?parsed.publicationState:'Đang ra'},chapters:parsed.chapters.length,hasCover:parsed.hasCover===true};
  }});
 }
 return Object.freeze({create});
});
