/* L6-P2C1. Internal read-only verifier. NOT a route, NOT deployed.
 * Browser upload IDs only locate objects; NEVER grant publish/delete rights.
 */
import {validateLayoutBytes,MAX_LAYOUT_BYTES} from './library-r2-layout-v1.mjs';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const REV=/^r-[a-f0-9]{16,32}$/;
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const LIMIT={original:31457280,chapter:420000,layout:MAX_LAYOUT_BYTES,asset:10485760};
const valid=(rx,v)=>typeof v==='string'&&rx.test(v);
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
function entries(catalog,bookId){
 return [{kind:'original',id:bookId,meta:catalog.source},
  ...[...catalog.chapters].map(([id,meta])=>({kind:'chapter',id,meta})),
  ...[...catalog.chapters].filter(([,ch])=>ch.layout).map(([id,ch])=>({kind:'layout',id,meta:ch.layout})),
  ...[...catalog.assets].map(([id,meta])=>({kind:'asset',id,meta}))];
}
function inspectContext({catalog,bookId,ownerUid,uploads}){
 if(!valid(ID,bookId)||!valid(UID,ownerUid)||!record(catalog)||
   catalog.ownerUid!==ownerUid||!valid(REV,catalog.revision)||
   !['draft','importing'].includes(catalog.status)||
   !(catalog.chapters instanceof Map)||catalog.chapters.size<1||
   catalog.chapters.size>160||!(catalog.assets instanceof Map)||
   catalog.assets.size>3000||!Array.isArray(uploads))
  throw Error('Invalid EPUB audit context');
 const required=entries(catalog,bookId);
 if(uploads.length!==required.length)throw Error('Incorrect upload count');
 const found=new Map();
 for(const u of uploads){
  if(!record(u)||Object.keys(u).sort().join(',')!=='id,kind,uploadId'||
     !['original','chapter','asset','layout'].includes(u.kind)||
     !valid(ID,u.id)||!valid(UUID,u.uploadId))
    throw Error('Untrusted upload reference');
  const k=u.kind+':'+u.id;
  if(found.has(k))throw Error('Duplicate upload reference');
  found.set(k,u.uploadId);
 }
 for(const item of required){
  const v=item.meta;
  if(!valid(ID,item.id)||!record(v)||
     !Number.isSafeInteger(v.bytes)||v.bytes<1||v.bytes>LIMIT[item.kind]||
     !valid(HASH,v.sha256)||
     (item.kind==='asset'&&!['image/jpeg','image/png','image/webp','image/gif'].includes(v.mime))||
     !found.has(item.kind+':'+item.id))
    throw Error('Catalog metadata mismatch');
 }
 return {required,found};
}
function hasSignature(buf,item,catalog,bookId){
 const b=new Uint8Array(buf);
 if(item.kind==='original')return b.length>=4&&
  b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4;
 if(item.kind==='layout'){
  try{validateLayoutBytes(buf,{bookId,revisionId:catalog.revision,chapterId:item.id,
   assetIds:new Set(catalog.assets.keys())});return true;}
  catch{return false;}
 }
 if(item.kind==='asset'){
  if(item.meta.mime==='image/png')return b.length>=8&&
   [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  if(item.meta.mime==='image/jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  if(item.meta.mime==='image/gif')return b.length>=6&&
   ['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)));
  if(item.meta.mime==='image/webp')return b.length>=12&&
   String.fromCharCode(...b.slice(0,4))==='RIFF'&&
   String.fromCharCode(...b.slice(8,12))==='WEBP';
  return false;
 }
 try {
  const text=new TextDecoder('utf-8',{fatal:true}).decode(buf);
  return text.length>0&&text.length<=220000&&
   !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text);
 }catch{return false;}
}
function hasMetadata(obj,item,ownerUid,bookId,revision){
 const m=obj?.customMetadata;
 return record(m)&&m.state==='QUARANTINED'&&
  m.ownerUid===ownerUid&&m.bookId===bookId&&m.revision===revision&&
  m.kind===item.kind&&m.itemId===(item.kind==='original'?'source':item.id)&&
  m.sha256===item.meta.sha256;
}
const output=(expected,verified,issues)=>Object.freeze({
 complete:verified===expected&&issues.length===0,
 checked:expected,verified,issues:Object.freeze(issues),
 authorizedToPublish:false,eligibleForDeletion:false,
 requiresIndependentServerApproval:true
});
/* Caller MUST provide catalog from an authorized trusted backend and ownerUid
 * from a verified identity; no browser-controlled catalog is trusted here.
 * Reads R2 and computes real SHA-256. No PUT, DELETE, COPY or publish.
 */
export async function auditStagedBook({bucket,catalog,bookId,ownerUid,uploads,cryptoApi=globalThis.crypto}={}){
 const {required,found}=inspectContext({catalog,bookId,ownerUid,uploads});
 if(typeof bucket?.get!=='function'||typeof cryptoApi?.subtle?.digest!=='function')
  throw Error('R2 verification unavailable');
 let verified=0;const issues=[];
 for(const item of required){
  const label=item.kind+':'+item.id;
  const key='quarantine/epub/'+ownerUid+'/'+bookId+'/'+catalog.revision+
   '/'+found.get(label)+'.bin';
  let obj;
  try{obj=await bucket.get(key);}catch{issues.push(label+':storage');continue;}
  if(!obj){issues.push(label+':missing');continue;}
  if(!Number.isSafeInteger(obj.size)||obj.size!==item.meta.bytes||
     !hasMetadata(obj,item,ownerUid,bookId,catalog.revision)||
     typeof obj.arrayBuffer!=='function'){
   issues.push(label+':metadata');continue;
  }
  try{
   const bytes=await obj.arrayBuffer();
   if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==item.meta.bytes||
      !hasSignature(bytes,item,catalog,bookId)){issues.push(label+':payload');continue;}
   const digest=new Uint8Array(await cryptoApi.subtle.digest('SHA-256',bytes));
   const sha=Array.from(digest,v=>v.toString(16).padStart(2,'0')).join('');
   if(sha!==item.meta.sha256){issues.push(label+':checksum');continue;}
   verified++;
  }catch{issues.push(label+':read');}
 }
 return output(required.length,verified,issues);
}
