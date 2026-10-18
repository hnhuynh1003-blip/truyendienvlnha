/* DUDU EPUB V57 — safe local XHTML extraction and cover-thumbnail helpers.
 * Runs in the user's browser. Never uploads original EPUB or embedded images.
 * No remote image references are followed. The only persistent cover value
 * is an explicitly bounded JPEG data URI thumbnail stored with book metadata.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubTextV57=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const MAX_COVER_CHARS=32000;
 function getText(raw,Parser){
  if(typeof raw!=='string'||!Parser)throw Error('Thiếu trình đọc XHTML');
  const doc=new Parser().parseFromString(raw,'text/html');
  for(const node of doc.querySelectorAll('script,style,iframe,object,embed,svg,math,nav,form,head,noscript,template'))
   node.remove();
  const body=doc.body||doc.documentElement;
  // EPUB converters often use <p>...<br/>...<br/>...</p> for many
  // paragraphs. textContent ignores <br> entirely. Use DOM text nodes,
  // not innerHTML, so inline formatting remains safe plain text.
  for(const br of body.querySelectorAll('br'))br.replaceWith(doc.createTextNode('\n'));
  const names='h1,h2,h3,h4,p,li,blockquote,pre';
  const blocks=[...body.querySelectorAll(names)]
   .filter(n=>!n.parentElement?.closest(names));
  const normalize=s=>s.replace(/\u00a0/g,' ')
   .replace(/[^\S\n]+/g,' ').replace(/ *\n */g,'\n')
   .replace(/\n{4,}/g,'\n\n\n').trim();
  const content=blocks.map(n=>normalize(n.textContent||'')).filter(Boolean);
  return normalize(content.length?content.join('\n\n'):body.textContent||'');
 }
 function category(title='',filePath=''){
  const t=String(title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/đ/gi,'d').trim().toLowerCase();
  const path=String(filePath||'').toLowerCase();
  if(/(?:^|\/)(?:cover|title[_-]?page|copyright)(?:\.|[_-])/i.test(path)
    || /^(?:bia sach|trang bia|title page|copyright|trang ten sach)$/.test(t))
    return 'metadata';
  if(/^(?:van an|gioi thieu|loi mo dau|loi tua|prologue|preface|mo dau)$/.test(t))
    return 'intro';
  if(/^(?:quan trong|thong bao|loi nhan|ghi chu (?:tu|cua) (?:editor|nguoi dang)|credits?|notice)$/.test(t))
    return 'notice';
  return 'chapter';
 }
 function validThumbnail(uri){
  return typeof uri==='string'&&uri.length<MAX_COVER_CHARS
    &&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri);
 }
 async function coverThumbnail(entry,host=root){
  if(!entry||!host?.document||typeof host.Blob!=='function'||typeof host.Image!=='function')
   return '';
  try{
   const bytes=await entry.async('uint8array');
   if(!bytes?.length||bytes.length>2*1024*1024)return '';
   const blob=new host.Blob([bytes],{type:'image/jpeg'});
   const url=host.URL.createObjectURL(blob);
   try{
    const image=new host.Image();
    await new Promise((resolve,reject)=>{
     image.onload=resolve;image.onerror=reject;image.src=url;
    });
    const canvas=host.document.createElement('canvas');
    const max=176,scale=Math.min(1,max/Math.max(1,image.width,image.height));
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)return '';
    ctx.fillStyle='#f4f1e9';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.68);
    return validThumbnail(data)?data:'';
   }finally{host.URL.revokeObjectURL(url);}
  }catch(_){return '';}
 }
 return Object.freeze({getText,category,validThumbnail,coverThumbnail,MAX_COVER_CHARS});
});
