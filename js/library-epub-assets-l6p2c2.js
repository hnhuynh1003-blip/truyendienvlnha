/* L6-P2C2: local-only EPUB raster extraction and ordered reading layout.
 * Not loaded by the live reader. No network, R2, Firestore or DOM injection.
 * Unsupported image references fail closed instead of silently dropping art.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubAssetsL6P2C2=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_SOURCE=30*1024*1024, MAX_UNPACKED=80*1024*1024;
 const MAX_ENTRIES=3000,MAX_ASSETS=3000,MAX_IMAGE=10*1024*1024;
 const MAX_CHAPTERS=160,MAX_CHAPTER=420000,MAX_CHAPTER_CHARS=220000;
 const MIME=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/gif','gif']]);
 const forbidden=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u;
 const reject=why=>{throw Error('Không thể giữ nguyên ảnh EPUB: '+why);};
 const local=(name,base='')=>{
  if(typeof name!=='string'||!name||/^[a-z][a-z0-9+.-]*:/i.test(name)||
   name.startsWith('/')||name.startsWith('//')||name.includes('\\')||/[\u0000-\u001f]/u.test(name))return null;
  const parts=base?base.split('/').slice(0,-1):[];
  for(const p of name.split(/[?#]/,1)[0].split('/')){
   let decoded;try{decoded=decodeURIComponent(p);}catch{return null;}
   if(!decoded||decoded==='.')continue;
   if(decoded==='..') {if(!parts.length)return null;parts.pop();continue;}
   if(/[\\/:]/u.test(decoded)||decoded==='.'||decoded==='..')return null;
   parts.push(decoded);
  }
  return parts.join('/')||null;
 };
 const items=(parent,name)=>[...parent.getElementsByTagName('*')].filter(n=>n.localName===name);
 const first=(parent,name)=>items(parent,name)[0]||null;
 function parseXml(raw,Parser){
  if(typeof raw!=='string'||raw.length>4*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(raw))reject('XML có nội dung không hợp lệ');
  const d=new Parser().parseFromString(raw,'application/xml');
  if(d.getElementsByTagName('parsererror').length)reject('EPUB có XML lỗi');
  return d;
 }
 function signature(bytes,mime){
  const b=new Uint8Array(bytes);
  if(mime==='image/png')return b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  if(mime==='image/jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  if(mime==='image/gif')return b.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)));
  if(mime==='image/webp')return b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
  return false;
 }
 async function hash(bytes,cryptoApi){
  if(typeof cryptoApi?.subtle?.digest!=='function')reject('thiếu SHA-256 an toàn');
  const digest=await cryptoApi.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
 }
 function chapterLayout(raw,sourcePath,byPath,Parser){
  if(typeof raw!=='string'||raw.length>1200000)reject('chương XHTML quá dài');
  const doc=new Parser().parseFromString(raw,'text/html');
  const body=doc.body||doc.documentElement;
  if(!body)reject('không tìm thấy nội dung chương');
  if(body.querySelector('svg,math,canvas,object,embed,iframe,picture,video,audio,source'))
   reject('chương chứa thành phần hình ảnh/phương tiện chưa hỗ trợ');
  if([...doc.querySelectorAll('[style]')].some(e=>/url\s*\(/i.test(e.getAttribute('style')||'')))
   reject('chương chứa hình nền trong CSS chưa hỗ trợ');
  for(const unwanted of doc.querySelectorAll('script,style,head,template,noscript,nav,form'))unwanted.remove();
  const fragments=[];let buffer='';let images=0;
  const flush=()=>{
   const text=buffer.replace(/\u00a0/g,' ').replace(/[^\S\n]+/g,' ')
    .replace(/ *\n */g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
   buffer='';if(text)fragments.push(Object.freeze({type:'text',text}));
  };
  const blocks=new Set(['p','h1','h2','h3','h4','h5','h6','div','section','article','li','blockquote','pre','hr','ul','ol','table','tr']);
  const walk=node=>{
   if(node.nodeType===3){buffer+=node.nodeValue||'';return;}
   if(node.nodeType!==1)return;
   const name=node.localName?.toLowerCase()||'';
   if(name==='img'){
    if(node.hasAttribute('srcset'))reject('srcset trong chương chưa hỗ trợ');
    const src=node.getAttribute('src'),path=local(src,sourcePath);
    const asset=path&&byPath.get(path);
    if(!asset)reject('ảnh trong chương không nằm trong manifest: '+String(src||'').slice(0,100));
    flush();images++;
    const alt=String(node.getAttribute('alt')||'').replace(/[\u0000-\u001f<>]/gu,' ').slice(0,180);
    fragments.push(Object.freeze({type:'image',assetId:asset.id,alt}));return;
   }
   if(name==='br'){buffer+='\n';return;}
   if(name==='style'||name==='script'||name==='iframe'||name==='svg'||name==='math')reject('HTML không hỗ trợ');
   const block=blocks.has(name);
   if(block)flush();
   for(const child of node.childNodes)walk(child);
   if(block)flush();
  };
  walk(body);flush();
  return Object.freeze({segments:Object.freeze(fragments),imageCount:images});
 }
 function words(s){return s.trim().split(/\s+/u).filter(Boolean).length;}
 async function extract(file,parsed,{zipLib,Parser,cryptoApi=globalThis.crypto}={}){
  if(!file||typeof file.arrayBuffer!=='function'||typeof file.name!=='string'||
   file.name.length>180||/[\u0000-\u001F<>]/u.test(file.name)||
   !/\.epub$/i.test(file.name)||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_SOURCE)
   reject('tệp EPUB nguồn không hợp lệ');
  if(typeof zipLib?.loadAsync!=='function'||typeof Parser!=='function')reject('thiếu thư viện phân tích EPUB');
  if(!Array.isArray(parsed?.chapters)||!parsed.chapters.length||parsed.chapters.length>MAX_CHAPTERS)
   reject('danh sách chương nguồn không hợp lệ');
  const raw=await file.arrayBuffer();
  if(raw.byteLength!==file.size||raw.byteLength<4||
   ![80,75,3,4].every((v,i)=>new Uint8Array(raw)[i]===v))reject('tệp EPUB không có chữ ký ZIP hợp lệ');
  const zip=await zipLib.loadAsync(raw,{checkCRC32:true});
  const paths=Object.keys(zip.files||{});
  if(!paths.length||paths.length>MAX_ENTRIES)reject('quá nhiều thành phần ZIP');
  let unpacked=0;
  for(const path of paths){
   const normalized=path.endsWith('/')?path.slice(0,-1):path;
   if(!normalized||local(normalized)!==normalized)reject('đường dẫn ZIP không an toàn');
   const n=zip.files[path]?.dir?0:Number(zip.files[path]?._data?.uncompressedSize);
   if(!Number.isSafeInteger(n)||n<0||(unpacked+=n)>MAX_UNPACKED)
    reject('dung lượng giải nén vượt giới hạn');
  }
  const container=zip.file('META-INF/container.xml');
  if(!container)reject('thiếu container.xml');
  const containerDoc=parseXml(await container.async('string'),Parser);
  const opfPath=local(first(containerDoc,'rootfile')?.getAttribute('full-path'));
  if(!opfPath||!zip.file(opfPath))reject('không có OPF');
  const opf=parseXml(await zip.file(opfPath).async('string'),Parser);
  const entries=new Map(),pathsSeen=new Set();
  let coverId=items(opf,'meta').find(x=>x.getAttribute('name')==='cover')?.getAttribute('content')||'';
  for(const item of items(opf,'item')){
   const id=item.getAttribute('id'),href=item.getAttribute('href'),mime=item.getAttribute('media-type');
   const path=local(href,opfPath);
   if(!id||!path||entries.has(id)||!zip.file(path))reject('manifest EPUB có tệp thiếu hoặc sai đường dẫn');
   if(pathsSeen.has(path))reject('manifest EPUB chứa alias đường dẫn trùng');
   pathsSeen.add(path);
   entries.set(id,{id,path,mime,properties:item.getAttribute('properties')||''});
   if(/(?:^|\s)cover-image(?:\s|$)/.test(item.getAttribute('properties')||''))coverId=id;
  }
  for(const path of paths){
   if(/\.(?:svg|jpe?g|png|webp|gif)$/i.test(path)&&!pathsSeen.has(path))
    reject('ảnh EPUB không được khai báo trong OPF: '+path);
  }
  const imgEntries=[...entries.values()].filter(x=>x.mime?.startsWith('image/'));
  if(imgEntries.length>MAX_ASSETS)reject('quá nhiều ảnh');
  if(imgEntries.some(x=>!MIME.has(x.mime)))reject('có ảnh vector hoặc định dạng chưa hỗ trợ');
  const spine=first(opf,'spine');
  if(!spine)reject('thiếu spine');
  const spinePaths=new Set(items(spine,'itemref').filter(e=>e.getAttribute('linear')!=='no')
   .map(e=>entries.get(e.getAttribute('idref'))?.path).filter(Boolean));
  for(const chapter of parsed.chapters){
   if(!chapter||typeof chapter.sourcePath!=='string'||!spinePaths.has(chapter.sourcePath)||
    typeof chapter.content!=='string'||!chapter.content||chapter.content.length>MAX_CHAPTER_CHARS||
    forbidden.test(chapter.content))reject('chương đã lọc không khớp EPUB');
  }
  for(const style of [...entries.values()].filter(x=>x.mime==='text/css')){
   const css=await zip.file(style.path).async('string');
   if(/@import\b/i.test(css))reject('CSS EPUB có @import chưa kiểm tra');
   for(const match of css.matchAll(/url\s*\(\s*(['"]?)([^)'"]+)\1\s*\)/gi)){
    const referenced=local(match[2].trim(),style.path);
    if(!referenced)reject('CSS EPUB tham chiếu URL ngoài hoặc không an toàn');
    if(/\.(?:svg|jpe?g|png|webp|gif)$/i.test(referenced)||
       imgEntries.some(a=>a.path===referenced))
      reject('CSS EPUB chứa ảnh nền chưa có vị trí hiển thị');
   }
  }
  const assets=[],byPath=new Map(),sorted=imgEntries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  for(let i=0;i<sorted.length;i++){
   const entry=sorted[i],bytes=await zip.file(entry.path).async('uint8array');
   if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.byteLength>MAX_IMAGE||
    !signature(bytes,entry.mime))reject('tệp ảnh không hợp lệ: '+entry.path);
   const isCover=entry.id===coverId||(!coverId&&/cover(?:[._/-]|$)/i.test(entry.path));
   const asset={id:'asset-'+String(i+1).padStart(4,'0'),role:isCover?'cover':'illustration',
    mime:entry.mime,bytes:bytes.byteLength,sha256:await hash(bytes,cryptoApi),
    sourcePath:entry.path,data:bytes};
   assets.push(asset);byPath.set(entry.path,asset);
  }
  if(assets.filter(a=>a.role==='cover').length>1)reject('xác định nhiều ảnh bìa');
  const chapters=[],layouts=[];
  for(let i=0;i<parsed.chapters.length;i++){
   const current=parsed.chapters[i],rawHtml=await zip.file(current.sourcePath).async('string');
   const layout=chapterLayout(rawHtml,current.sourcePath,byPath,Parser);
   const bytes=new TextEncoder().encode(current.content);
   if(bytes.byteLength>MAX_CHAPTER)reject('chương quá lớn: '+(i+1));
   if(typeof current.title!=='string'||!current.title.trim()||current.title.length>140)
    reject('tiêu đề chương không hợp lệ');
   const id='chapter-'+String(i+1).padStart(4,'0');
   chapters.push({id,title:current.title,order:i,
    wordCount:words(current.content),bytes:bytes.byteLength,sha256:await hash(bytes,cryptoApi)});
   layouts.push(Object.freeze({chapterId:id,sourcePath:current.sourcePath,...layout}));
  }
  return {manifest:{schema:1,source:{name:file.name,bytes:raw.byteLength,sha256:await hash(raw,cryptoApi)},
    chapters,assets:assets.map(({id,role,mime,bytes,sha256})=>({id,role,mime,bytes,sha256}))},
   assets,layouts,originalBytes:new Uint8Array(raw),cutoverReady:false};
 }
 return Object.freeze({extract,local,chapterLayout,signature});
});
