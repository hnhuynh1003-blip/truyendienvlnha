/* DUDU STUDIO L6-C11: deterministic, OFFLINE, read-only browser EPUB -> R2 candidate pack.
 * No HTTP, Firebase, R2 or filesystem write. Not loaded by live index.html.
 * This is NOT a trusted publisher: backend must validate a server-issued draft,
 * bytes, hashes, ACL, approval and STAGED audit independently.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduEpubR2SidecarL6C11=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
 const REV=/^r-[a-f0-9]{16,32}$/;
 const MAX_FILE=30*1024*1024,MAX_ENTRIES=3000,MAX_UNPACKED=80*1024*1024;
 const MAX_CHAPTERS=160,MAX_CHARS=220000,MAX_CHAPTER_BYTES=420000,MAX_LAYOUT_BYTES=1048576;
 const chapterSplit=root?.DuduR2ChapterSplitR1||
  (typeof require==='function'?require('./library-r2-chapter-split-r1.js'):null);
 const MAX_ASSET=10*1024*1024,MAX_IMAGES_PER_CHAPTER=40;
 const MIMES=Object.freeze({'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'});
 const RX_CONTROL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u;
 const blocks='h1,h2,h3,h4,p,li,blockquote,pre';
 const banned='script,style,iframe,object,embed,svg,math,nav,form,head,noscript,template';
 const bad=reason=>{throw Error('C11 sidecar BLOCKED: '+reason);};
 const utf8=new TextEncoder();
 const nonempty=s=>typeof s==='string'&&!!s.trim();
 const asBytes=x=>x instanceof Uint8Array?x:x instanceof ArrayBuffer?new Uint8Array(x):null;
 const collapse=s=>s.replace(/\s+/gu,' ').trim();
 const normalize=s=>s.replace(/\u00a0/g,' ').replace(/[^\S\n]+/g,' ')
  .replace(/ *\n */g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
 const first=(el,name)=>el&&([...el.getElementsByTagName('*')].find(x=>x.localName===name)||null);
 const all=(el,name)=>el?[...el.getElementsByTagName('*')].filter(x=>x.localName===name):[];
 function xml(raw,Parser){
  if(typeof raw!=='string'||/<!DOCTYPE|<!ENTITY/i.test(raw))bad('DTD/ENTITY unsupported');
  const d=new Parser().parseFromString(raw,'application/xml');
  if(d.getElementsByTagName('parsererror').length)bad('invalid EPUB XML');
  return d;
 }
 // Same relative-path semantics as V48, tightened to prevent ambiguous zip aliases.
 function pathOf(href,base=''){
  if(!nonempty(href)||href.startsWith('/')||href.startsWith('\\')||
    /^[a-z][a-z0-9+.-]*:/i.test(href)||href.startsWith('//')||
    href.includes('\\')||/[\u0000-\u001F]/.test(href)||href.includes('?'))bad('unsafe EPUB href');
  const clean=href.split('#',1)[0];
  const segments=base?base.split('/').slice(0,-1):[];
  for(const part of clean.split('/')){
   let x;try{x=decodeURIComponent(part);}catch{bad('invalid encoded path');}
   if(!x||x==='.')continue;
   if(x==='..'){
    if(!segments.length)bad('path traversal');
    segments.pop();continue;
   }
   if(x.includes('/')||x.includes('\\'))bad('unsafe EPUB segment (encoded slash/backslash in path)');
   if(x.includes(':'))bad('unsafe EPUB segment (colon in resource filename)');
   if(/[\u0000-\u001F]/.test(x)||x==='..')bad('unsafe EPUB segment (control or traversal)');
   segments.push(x);
  }
  const dest=segments.join('/');
  if(!dest||dest.startsWith('/'))bad('empty EPUB resource path');
  return dest;
 }
 function rawArchivePath(s){
  if(!nonempty(s)||s.endsWith('/')||s.startsWith('/')||s.includes('\\')||
    /[\u0000-\u001f]/.test(s)||s.split('/').some(x=>!x||x==='.'||x==='..')||
    s.includes('%2f')||s.includes('%2F'))bad('unsafe ZIP name');
  return s;
 }
 async function hash(data,cryptoApi){
  const b=asBytes(data);
  if(!b||typeof cryptoApi?.subtle?.digest!=='function')bad('WebCrypto unavailable');
  const result=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',b));
  return [...result].map(x=>x.toString(16).padStart(2,'0')).join('');
 }
 function imageValid(data,mime){
  const b=asBytes(data);
  if(!b||b.byteLength<4||b.byteLength>MAX_ASSET)return false;
  const prefix=(...arr)=>arr.every((v,i)=>b[i]===v);
  if(mime==='image/png')return b.length>=24&&prefix(137,80,78,71,13,10,26,10)&&
    String.fromCharCode(...b.slice(12,16))==='IHDR'&&b[16]+b[17]+b[18]+b[19]>0;
  if(mime==='image/jpeg')return prefix(255,216,255);
  if(mime==='image/gif')return b.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)));
  if(mime==='image/webp')return b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&
    String.fromCharCode(...b.slice(8,12))==='WEBP';
  return false;
 }
 function stripDangerous(doc){
  const body=doc.body||doc.documentElement;
  if(!body)bad('missing XHTML body');
  if(body.querySelector('svg,math,picture,source,video,audio,canvas,object,embed,iframe'))
   bad('unsupported rich media/SVG');
  // V57 ignores these nodes. Since they cannot become reader content,
  // reject media hidden inside them rather than losing images silently.
  for(const node of body.querySelectorAll(banned)){
   if(node.querySelector?.('img,picture,video,canvas'))bad('media inside removed XHTML section');
   node.remove();
  }
  if(body.querySelector('picture,source,video,audio,canvas,object,embed,svg,math'))
   bad('unsupported rich media');
  for(const br of body.querySelectorAll('br'))br.replaceWith(doc.createTextNode('\n'));
  return body;
 }
 function textAndImageSegments(raw,Parser,originalText,resolveImage){
  if(typeof raw!=='string'||raw.length>MAX_CHARS*5)bad('XHTML chapter too long');
  const doc=new Parser().parseFromString(raw,'text/html');
  if([...doc.querySelectorAll('style,[style]')].some(el=>/url\s*\(/i.test(el.getAttribute('style')||el.textContent||'')))
   bad('CSS background images unsupported');
  const body=stripDangerous(doc),entries=[],usedImages=new Set();
  const text=s=>{const clean=normalize(s);if(clean){if(clean.length>MAX_CHARS||RX_CONTROL.test(clean))bad('unsafe chapter text');entries.push({type:'text',text:clean});}};
  const image=img=>{
   usedImages.add(img);
   if(img.hasAttribute('srcset')||img.hasAttribute('onload')||img.hasAttribute('onerror'))bad('unsupported image attribute');
   const src=img.getAttribute('src');
   const alt=img.getAttribute('alt')||'';
   if(!nonempty(src)||alt.length>180||/[\u0000-\u001F<>]/u.test(alt))bad('unsafe image reference/alt');
   entries.push({type:'image',src,alt});
  };
  const visitBlock=block=>{
   let buffer='';
   const flush=()=>{text(buffer);buffer='';};
   const walk=node=>{
    if(node.nodeType===3){buffer+=node.nodeValue||'';return;}
    if(node.nodeType!==1)return;
    if(node.localName?.toLowerCase()==='img'){flush();image(node);return;}
    for(const child of node.childNodes)walk(child);
   };
   for(const child of block.childNodes)walk(child);
   flush();
  };
  const seenBlocks=new Set();
  for(const node of body.querySelectorAll(blocks+',img')){
   if(node.localName?.toLowerCase()==='img'){
    if(!usedImages.has(node)&&!node.closest(blocks))image(node);
   }else if(!node.parentElement?.closest(blocks)){
    seenBlocks.add(node);visitBlock(node);
   }
  }
  if(!seenBlocks.size){
   if(body.querySelector('img'))bad('inline image without canonical text block');
   text(body.textContent||'');
  }
  const original=collapse(originalText),actual=collapse(entries.filter(x=>x.type==='text').map(x=>x.text).join(' '));
  if(!original||actual!==original)bad('V48 text vs XHTML layout mismatch');
  if(entries.filter(x=>x.type==='image').length>300)bad('layout image count over limit');
  if(new Set(entries.filter(x=>x.type==='image').map(x=>x.src)).size>MAX_IMAGES_PER_CHAPTER)
   bad('chapter media exceeds preview 40-image cap');
  // resolving image references is async; preserve deterministic DOM order.
  return entries;
 }
 async function buildPackage({file,parsed,bookId,revisionId,zipLib,Parser,
   textV57,cryptoApi=globalThis.crypto}={}){
  if(!ID.test(bookId||'')||!REV.test(revisionId||''))bad('IDs must be server-issued, no implicit allocation');
  if(!file||typeof file.name!=='string'||!/\.epub$/i.test(file.name)||file.name.length>180||
    !Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_FILE||typeof file.arrayBuffer!=='function')
    bad('EPUB file bounds');
  if(!parsed||parsed.sourceName!==file.name||!Array.isArray(parsed.chapters)||!parsed.chapters.length||
    parsed.chapters.length>MAX_CHAPTERS||typeof zipLib?.loadAsync!=='function'||
    typeof Parser!=='function'||typeof textV57?.getText!=='function')
    bad('canonical V48/V57 parser output required');
  const fileBytes=new Uint8Array(await file.arrayBuffer());
  if(fileBytes.length!==file.size)bad('file changed while reading');
  // Inspect central-directory size/count BEFORE CRC verification forces inflate.
  let zip;try{zip=await zipLib.loadAsync(fileBytes,{checkCRC32:false});}
  catch{bad('invalid ZIP structure');}
  const filenames=Object.keys(zip.files);
  if(filenames.length>MAX_ENTRIES)bad('too many archive entries');
  let total=0;const names=new Set();
  for(const name of filenames){
   const z=zip.files[name];if(z.dir)continue;
   rawArchivePath(name);
   if(names.has(name))bad('duplicate ZIP file');names.add(name);
   const n=Number(z?._data?.uncompressedSize);
   if(!Number.isSafeInteger(n)||n<0||n>MAX_UNPACKED)bad('ZIP unknown/unbounded size');
   total+=n;if(total>MAX_UNPACKED)bad('ZIP inflated-size cap');
  }
  if(!names.has('mimetype')||await zip.file('mimetype').async('string')!=='application/epub+zip')
   bad('EPUB mimetype absent or invalid');
  // Only after preflight bounds may CRC verification decompress the archive.
  try{await zipLib.loadAsync(fileBytes,{checkCRC32:true});}
  catch{bad('ZIP CRC mismatch');}
  const load=async(name,mode='string')=>{
   if(!names.has(name))bad('missing ZIP resource: '+name);
   const v=await zip.file(name).async(mode);
   if(mode==='uint8array'&&v.length>MAX_ASSET)bad('oversized image');
   return v;
  };
  const container=xml(await load('META-INF/container.xml'),'function'===typeof Parser?Parser:null);
  const opfPath=pathOf(first(container,'rootfile')?.getAttribute('full-path'));
  const opf=xml(await load(opfPath),Parser);
  const itemNodes=all(first(opf,'manifest'),'item'),manifestItems=new Map(),byPath=new Map();
  for(const element of itemNodes){
   const id=element.getAttribute('id'),href=element.getAttribute('href');
   if(!id||manifestItems.has(id))bad('invalid duplicate manifest id');
   const path=pathOf(href,opfPath),mime=element.getAttribute('media-type')||'';
   if(byPath.has(path))bad('alias/duplicate OPF path');
   if(!names.has(path))bad('OPF references absent resource');
   const item={id,path,mime,properties:(element.getAttribute('properties')||'').split(/\s+/).filter(Boolean)};
   manifestItems.set(id,item);byPath.set(path,item);
  }
  const spine=first(opf,'spine');
  if(!spine)bad('missing EPUB spine');
  const refs=all(spine,'itemref').filter(x=>x.getAttribute('linear')!=='no');
  if(!refs.length||refs.length>MAX_CHAPTERS)bad('spine bounds');
  const coverMeta=all(opf,'meta').find(x=>x.getAttribute('name')==='cover');
  const coverId=coverMeta?.getAttribute('content')||'';
  const coverCandidates=[...manifestItems.values()].filter(it=>it.properties.includes('cover-image'));
  if(coverCandidates.length>1||coverCandidates.length&&coverId&&
    manifestItems.get(coverId)?.path!==coverCandidates[0].path)bad('ambiguous cover');
  const coverItem=coverCandidates[0]||manifestItems.get(coverId)||manifestItems.get('cover-image')||
    [...manifestItems.values()].find(it=>/cover/i.test(it.id)&&Object.hasOwn(MIMES,it.mime))||null;
  if(coverItem&&!Object.hasOwn(MIMES,coverItem.mime))bad('unsupported cover MIME');
  const contentRecords=[];
  for(const ref of refs){
   const item=manifestItems.get(ref.getAttribute('idref'));
   if(!item||!names.has(item.path)||(!/xhtml|html|xml/i.test(item.mime)&&!/\.x?html?$/i.test(item.path)))
    bad('unsupported/missing spine item');
   const raw=await load(item.path),doc=new Parser().parseFromString(raw,'text/html');
   const heading=doc.body?.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g,' ').trim()||
     doc.querySelector('head title')?.textContent?.trim()||'';
   const kind=textV57.category?.(heading,item.path)||'chapter';
   if(kind==='metadata')continue;
   const content=textV57.getText(raw,Parser);
   if(!content)continue;
   if(!chapterSplit?.split)bad('missing R2 chapter split module');
   const title=(heading||'').trim().slice(0,140)||'Chương '+(contentRecords.length+1);
   const parts=chapterSplit.split(content,title);
   if(contentRecords.length+parts.length>MAX_CHAPTERS)
    bad('more than 160 chapters after splitting; split book into volumes');
   if(parts.length>1){
    // Do not discard or misplace inline images and rich media when splitting.
    // Long text-only XHTML is supported; mixed-media XHTML stays BLOCKED
    // until a corresponding, validated image-aware partitioner is approved.
    const doc=new Parser().parseFromString(raw,'text/html');
    if([...doc.querySelectorAll('style,[style]')].some(el=>
       /url\s*\(/i.test(el.getAttribute('style')||el.textContent||'')))
     bad('long XHTML CSS background media cannot be split');
    const body=stripDangerous(doc);
    if(body.querySelector('img,picture,source,video,audio,canvas,svg,math'))
     bad('long XHTML with images cannot be split without an image-safe adapter');
   }
   for(const part of parts)contentRecords.push({raw,path:item.path,title:part.title,
    content:part.content,kind,fromSplit:parts.length>1});
  }
  if(contentRecords.length!==parsed.chapters.length)bad('V48 spine vs parsed chapter count mismatch');
  const source={name:file.name,bytes:fileBytes.length,sha256:await hash(fileBytes,cryptoApi)};
  const assets=[],assetParts=[],assetByPath=new Map(),assetByDigest=new Map(),chapterParts=[],layouts=[],layoutParts=[],chapters=[];
  const useAsset=async(path,role)=>{
   const entry=byPath.get(path);
   if(!entry||!Object.hasOwn(MIMES,entry.mime)||
     !(entry.mime==='image/jpeg'?/\.jpe?g$/i.test(path):path.toLowerCase().endsWith(MIMES[entry.mime])))
    bad('unsupported or undeclared image');
   if(assetByPath.has(path))return assetByPath.get(path);
   const bytes=await load(path,'uint8array');
   if(!imageValid(bytes,entry.mime))bad('image bytes/MIME mismatch');
   const digest=await hash(bytes,cryptoApi),key=entry.mime+':'+digest;
   let asset=assetByDigest.get(key);
   if(!asset){
    const id='asset-'+digest.slice(0,24);
    asset={id,role,mime:entry.mime,bytes:bytes.length,sha256:digest};
    if(assets.some(x=>x.id===id))bad('asset id hash collision');
    assets.push(asset);assetParts.push({kind:'asset',id,data:bytes});assetByDigest.set(key,asset);
   }else if(role==='cover'&&asset.role!=='cover')asset.role='cover';
   assetByPath.set(path,asset);return asset;
  };
  let coverAssetId='';
  if(coverItem){const cover=await useAsset(coverItem.path,'cover');coverAssetId=cover.id;}
  for(let i=0;i<contentRecords.length;i++){
   const record=contentRecords[i],fromParser=parsed.chapters[i];
   if(fromParser.sourcePath!==record.path||fromParser.content!==record.content||
     fromParser.title!==record.title||fromParser.kind!==record.kind)bad('canonical V48 chapter mismatch');
   const id='chapter-'+String(i+1).padStart(3,'0');
   const segments=record.fromSplit
    ?[{type:'text',text:record.content}]
    :textAndImageSegments(record.raw,Parser,record.content);
   for(let j=0;j<segments.length;j++){
    if(segments[j].type!=='image')continue;
    const imagePath=pathOf(segments[j].src,record.path),asset=await useAsset(imagePath,'illustration');
    segments[j]={type:'image',assetId:asset.id,alt:segments[j].alt};
   }
   const layout={schema:1,bookId,revisionId,chapterId:id,segments};
   const layoutBytes=utf8.encode(JSON.stringify(layout)),chapterBytes=utf8.encode(record.content);
   if(!layoutBytes.length||layoutBytes.length>MAX_LAYOUT_BYTES||
     !chapterBytes.length||chapterBytes.length>MAX_CHAPTER_BYTES||
     record.content.length>MAX_CHARS||RX_CONTROL.test(record.content))bad('chapter/layout byte limits');
   const normalized=collapse(segments.filter(x=>x.type==='text').map(x=>x.text).join(' '));
   if(normalized!==collapse(record.content))bad('generated layout does not match chapter');
   const wordCount=record.content.trim().split(/\s+/u).filter(Boolean).length;
   chapters.push({id,title:record.title,order:i,wordCount,bytes:chapterBytes.length,
    sha256:await hash(chapterBytes,cryptoApi)});
   layouts.push({chapterId:id,bytes:layoutBytes.length,sha256:await hash(layoutBytes,cryptoApi)});
   chapterParts.push({kind:'chapter',id,data:chapterBytes});
   layoutParts.push({kind:'layout',id,data:layoutBytes});
  }
  if(assets.length>3000)bad('asset count exceeded');
  const manifest={schema:1,bookId,revisionId,source,chapters,assets};
  const parts=[{kind:'original',id:bookId,data:fileBytes},...chapterParts.flatMap((ch,i)=>[ch,layoutParts[i]]),...assetParts];
  const synopsis=typeof parsed.desc==='string'?parsed.desc:'';
  return Object.freeze({manifest,layouts,parts,coverAssetId,
   metadataFromV48:Object.freeze({title:parsed.title,author:parsed.author,
    genre:parsed.genre||'',description:synopsis}),
   requiresOwnerSelectedPublicationState:true,
   requiresTrustedServerDraft:true,authorizedToPublish:false,
   eligibleForDeletion:false,eligibleForStaging:false,
   canWriteFirestore:false,canAwardExp:false,
   reviewOnly:true});
 }
 return Object.freeze({buildPackage,limits:Object.freeze({MAX_FILE,MAX_ENTRIES,MAX_UNPACKED,
  MAX_CHAPTERS,MAX_CHAPTER_BYTES,MAX_LAYOUT_BYTES,MAX_ASSET,MAX_IMAGES_PER_CHAPTER})});
});
