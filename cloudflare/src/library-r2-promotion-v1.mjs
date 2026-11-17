/* L6-P2C2: internal, non-routed immutable copy from quarantine into staged R2.
 * NOT imported by live Worker. The trusted caller MUST derive catalog and
 * identity via authenticated server-side ACL, never a client-supplied catalog.
 * Does not publish catalog, expose objects, delete originals or authorize cutover.
 */
import {validateLayoutBytes,MAX_LAYOUT_BYTES} from './library-r2-layout-v1.mjs';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const REV=/^r-[a-f0-9]{16,32}$/;
const SHA=/^[0-9a-f]{64}$/;
const MIME=Object.freeze({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'});
const MAX=Object.freeze({original:30*1024*1024,chapter:420000,layout:MAX_LAYOUT_BYTES,asset:10*1024*1024});
const matches=(regex,value)=>typeof value==='string'&&regex.test(value);
const valid=(x)=>x&&typeof x==='object'&&!Array.isArray(x);
function metadata(catalog,kind,id,bookId){
 if(kind==='original')return id===bookId?catalog.source:null;
 if(kind==='chapter')return catalog.chapters.get(id)||null;
 if(kind==='layout')return catalog.chapters.get(id)?.layout||null;
 return catalog.assets.get(id)||null;
}
function pathOf(bookId,rev,kind,id,mime){
 const sub=kind==='original'?'originals':kind==='chapter'?'chapters':kind==='layout'?'layouts':'assets';
 return sub+'/'+bookId+'/'+rev+'/'+(kind==='original'?'source.epub':
  kind==='chapter'?id+'.txt':kind==='layout'?id+'.json':id+'.'+MIME[mime]);
}
function validSignature(buffer,kind,mime,ctx){
 const b=new Uint8Array(buffer);
 if(kind==='original')return b.length>=4&&b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4;
 if(kind==='layout'){
  try{validateLayoutBytes(buffer,{bookId:ctx.bookId,revisionId:ctx.revision,
   chapterId:ctx.itemId,assetIds:new Set(ctx.catalog.assets.keys())});return true;}
  catch{return false;}
 }
 if(kind==='chapter'){
  try{const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
   return text.length>0&&text.length<=220000&&!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text);
  }catch{return false;}
 }
 if(mime==='image/png')return b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
 if(mime==='image/jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
 if(mime==='image/gif')return b.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)));
 if(mime==='image/webp')return b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 return false;
}
async function hash(buffer,cryptoApi){
 const bytes=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',buffer));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function checkOptions({bucket,identity,catalog,bookId,ownerUid,uploads,cryptoApi}){
 if(!bucket||typeof bucket.get!=='function'||typeof bucket.put!=='function'||
   !cryptoApi?.subtle?.digest||!identity?.admin||identity.uid!==ownerUid||
   !matches(ID,bookId)||!matches(ID,ownerUid)||
   !valid(catalog)||catalog.ownerUid!==ownerUid||!matches(REV,catalog.revision)||
   !['draft','importing'].includes(catalog.status)||
   !(catalog.chapters instanceof Map)||!(catalog.assets instanceof Map)||
   !Array.isArray(uploads)||!uploads.length||uploads.length>8)
  throw Error('Promotion denied: unauthenticated or invalid context');
 const plan=[],seen=new Set();
 for(const u of uploads){
  if(!valid(u)||Object.keys(u).sort().join(',')!=='id,kind,uploadId'||
     !['original','chapter','asset','layout'].includes(u.kind)||
     !matches(ID,u.id)||!matches(UUID,u.uploadId))
    throw Error('Promotion denied: invalid upload reference');
  const label=u.kind+':'+u.id;
  if(seen.has(label))throw Error('Promotion denied: duplicate upload reference');seen.add(label);
  const meta=metadata(catalog,u.kind,u.id,bookId);
  if(!valid(meta)||!Number.isSafeInteger(meta.bytes)||meta.bytes<1||meta.bytes>MAX[u.kind]||
    !matches(SHA,meta.sha256)||
    (u.kind==='asset'&&!Object.hasOwn(MIME,meta.mime)))
   throw Error('Promotion denied: manifest mismatch');
  plan.push({kind:u.kind,id:u.id,uploadId:u.uploadId,meta,
   source:'quarantine/epub/'+ownerUid+'/'+bookId+'/'+catalog.revision+'/'+u.uploadId+'.bin',
   target:pathOf(bookId,catalog.revision,u.kind,u.id,meta.mime)});
 }
 return plan;
}
function metadataMatch(obj,expected,status,identity,bookId,rev){
 const m=obj?.customMetadata;
 return !!m&&m.state===status&&m.ownerUid===identity&&m.bookId===bookId&&
  m.revision===rev&&m.kind===expected.kind&&
  m.itemId===(expected.kind==='original'?'source':expected.id)&&
  m.sha256===expected.meta.sha256;
}
async function checkedObject(obj,expected,status,ownerUid,bookId,rev,cryptoApi,catalog){
 if(!obj||obj.size!==expected.meta.bytes||typeof obj.arrayBuffer!=='function'||
  !metadataMatch(obj,expected,status,ownerUid,bookId,rev))return null;
 try{const buffer=await obj.arrayBuffer();
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==expected.meta.bytes||
    !validSignature(buffer,expected.kind,expected.meta.mime,{bookId,revision:rev,itemId:expected.id,catalog})||
    (await hash(buffer,cryptoApi))!==expected.meta.sha256)return null;
  return buffer;
 }catch{return null;}
}
const outcome=(copied,reused,issues)=>Object.freeze({
 copied,reused,issues:Object.freeze(issues),allVerified:issues.length===0,
 authorizedToPublish:false,eligibleForDeletion:false,cutoverReady:false
});
/** A single bounded batch (up to 8 items). No DELETE or Firestore write.
 * Conditional R2 PUT is an atomic create-only gate; existing matching objects
 * can be reused for safe retry, conflicting objects stop the batch.
 */
export async function promoteQuarantineBatch({bucket,identity,catalog,bookId,ownerUid,uploads,cryptoApi=globalThis.crypto}={}){
 const plan=checkOptions({bucket,identity,catalog,bookId,ownerUid,uploads,cryptoApi});
 const issues=[];let copied=0,reused=0;
 for(const p of plan){
  const label=p.kind+':'+p.id;
  let staged;
  try{staged=await bucket.get(p.source);}catch{issues.push(label+':source-unavailable');break;}
  const bytes=await checkedObject(staged,p,'QUARANTINED',ownerUid,bookId,catalog.revision,cryptoApi,catalog);
  if(!bytes){issues.push(label+':source-unverified');break;}
  let current;
  try{current=await bucket.get(p.target);}catch{issues.push(label+':target-unavailable');break;}
  if(current){
   const existing=await checkedObject(current,p,'STAGED',ownerUid,bookId,catalog.revision,cryptoApi,catalog);
   if(!existing){issues.push(label+':immutable-conflict');break;}
   reused++;continue;
  }
  const type=p.kind==='chapter'?'text/plain; charset=utf-8':
   p.kind==='layout'?'application/json; charset=utf-8':
   p.kind==='original'?'application/epub+zip':p.meta.mime;
  try{
   // Cloudflare R2 returns null if the onlyIf condition fails. Never overwrite.
   const saved=await bucket.put(p.target,bytes,{
    onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:type},
    customMetadata:{state:'STAGED',ownerUid,bookId,revision:catalog.revision,
     kind:p.kind,itemId:p.kind==='original'?'source':p.id,sha256:p.meta.sha256}
   });
   if(!saved){issues.push(label+':conditional-write-blocked');break;}
  }catch{issues.push(label+':write-unavailable');break;}
  let again;
  try{again=await bucket.get(p.target);}catch{issues.push(label+':readback-unavailable');break;}
  if(!await checkedObject(again,p,'STAGED',ownerUid,bookId,catalog.revision,cryptoApi,catalog)){
   issues.push(label+':readback-mismatch');break;
  }
  copied++;
 }
 return outcome(copied,reused,issues);
}
