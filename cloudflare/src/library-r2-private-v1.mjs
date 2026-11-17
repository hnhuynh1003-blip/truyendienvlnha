/* L6-P2B: PRIVATE EPUB R2 Worker route prototype.
 * NOT imported by src/index.mjs, NO wrangler bucket binding, NO deployment.
 * Explicit OFF feature gate + verified Firebase JWT + server-side R1.2 ACL.
 * Stage uploads are quarantined; this module cannot publish, delete or migrate.
 */
import {loadAuthorizedCatalog} from './library-r2-firestore-acl-v1.mjs';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
const PREFIX='/v1/library/r2/';
const MIME_EXT=Object.freeze({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'});
const limits=Object.freeze({chapter:420000,asset:10*1024*1024,original:30*1024*1024});
function headers(origin,env,kind='application/json; charset=utf-8'){
 const out=new Headers({'Cache-Control':'private, no-store, max-age=0',
  'Content-Type':kind,'X-Content-Type-Options':'nosniff','Vary':'Origin',
  'Content-Security-Policy':"default-src 'none'; sandbox"});
 if(origin&&origin===env?.ALLOWED_ORIGIN){
  out.set('Access-Control-Allow-Origin',origin);
  out.set('Access-Control-Allow-Headers','Authorization, Content-Type');
  out.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  out.set('Access-Control-Max-Age','600');
 }
 return out;
}
function json(status,code,origin,env,data={}){
 return new Response(JSON.stringify({ok:status<300,code,...data}),{status,headers:headers(origin,env)});
}
function route(path){
 if(!path.startsWith(PREFIX))return null;
 const parts=path.slice(PREFIX.length).split('/');
 if(parts.length<3||parts.length>4)return null;
 const [action,kind,bookId,itemId]=parts;
 if(!['read','stage'].includes(action)||!['chapter','asset','original'].includes(kind)||!ID.test(bookId||''))return null;
 if(kind==='original'?parts.length!==3:parts.length!==4||!ID.test(itemId||''))return null;
 return {action,kind,bookId,itemId};
}
function target(doc,r){
 if(r.kind==='original')return doc.source;
 return (r.kind==='chapter'?doc.chapters:doc.assets).get(r.itemId)||null;
}
function key(doc,r){
 const base=r.kind==='chapter'?'chapters':r.kind==='asset'?'assets':'originals';
 const path=base+'/'+r.bookId+'/'+doc.revision+'/';
 return r.kind==='chapter'?path+r.itemId+'.txt':
  r.kind==='asset'?path+r.itemId+'.'+MIME_EXT[target(doc,r)?.mime]:path+'source.epub';
}
function expectedMime(r,target){
 return r.kind==='chapter'?'text/plain; charset=utf-8':r.kind==='original'? 'application/epub+zip':target.mime;
}
async function hash(bytes,cryptoApi=globalThis.crypto){
 if(!cryptoApi?.subtle?.digest)throw Error('crypto-unavailable');
 return Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function imageSignature(bytes,mime){
 const b=new Uint8Array(bytes);
 if(mime==='image/png')return b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x);
 if(mime==='image/jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
 if(mime==='image/gif')return b.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6)));
 if(mime==='image/webp')return b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 return false;
}
function validateBytes(bytes,r,meta){
 const data=new Uint8Array(bytes);
 if(!data.length||data.length>limits[r.kind]||data.length!==meta.bytes)return false;
 if(r.kind==='original')return data.length>=4&&data[0]===80&&data[1]===75&&[3,5,7].includes(data[2])&&[4,6,8].includes(data[3]);
 if(r.kind==='asset')return imageSignature(bytes,meta.mime);
 try{
  const s=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  return s.length>0&&s.length<=220000&&!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(s);
 }catch{return false;}
}
async function bytesFromBody(req,maximum){
 const declared=req.headers.get('Content-Length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maximum))return null;
 if(!req.body)return null;
 const rd=req.body.getReader();let total=0;const chunks=[];
 try{
  while(true){const {done,value}=await rd.read();if(done)break;
   if(!(value instanceof Uint8Array))return null;
   total+=value.byteLength;
   if(total>maximum){await rd.cancel();return null;}
   chunks.push(value);
  }
  if(!total)return null;
  const data=new Uint8Array(total);let offset=0;
  for(const c of chunks){data.set(c,offset);offset+=c.byteLength;}
  return data.buffer;
 }catch{return null;}
 finally{rd.releaseLock();}
}
function tokenPresent(req){return /^Bearer [A-Za-z0-9_.-]{100,12000}$/.test(req.headers.get('Authorization')||'');}

/** Injection points are ONLY server-owned. The browser cannot supply verify,
 * rules lookup, fetch implementation, identity or storage binding.
 */
export async function handleLibraryR2Private(req,env,{verifyIdentity,loadCatalog=loadAuthorizedCatalog,fetchFn,cryptoApi=globalThis.crypto}={}){
 const origin=req.headers.get('Origin'),url=new URL(req.url),r=route(url.pathname);
 if(!r)return json(404,'not-found',origin,env);
 if(origin&&origin!==env?.ALLOWED_ORIGIN)return json(403,'origin-blocked',origin,env);
 if(env?.LIBRARY_R2_ENABLED!=='true')return json(503,'library-r2-disabled',origin,env);
 if(!env?.DUDU_LIBRARY_EPUB_BUCKET||typeof verifyIdentity!=='function'||typeof loadCatalog!=='function')
  return json(503,'library-r2-unavailable',origin,env);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin,env)});
 if(req.method!==(r.action==='read'?'GET':'POST'))return json(405,'method-not-allowed',origin,env);
 if(!tokenPresent(req))return json(401,'unauthenticated',origin,env);
 const identity=await verifyIdentity(req,env.PROJECT_ID);
 if(!identity?.uid||typeof identity.uid!=='string'||identity.uid.length>128)
  return json(401,'unauthenticated',origin,env);
 let catalog;
 try{catalog=await loadCatalog({request:req,env,identity,bookId:r.bookId,mode:r.action,fetchFn});}
 catch{return json(503,'catalog-unavailable',origin,env);}
 if(!catalog)return json(403,'access-denied',origin,env);
 const meta=target(catalog,r);
 if(!meta)return json(404,'object-not-in-catalog',origin,env);
 if(r.action==='read'&&r.kind==='original'&&!(identity.admin===true&&identity.uid===catalog.ownerUid))
  return json(403,'owner-only',origin,env);
 if(r.action==='stage'&&!(identity.admin===true&&identity.uid===catalog.ownerUid&&
  ['importing','draft'].includes(catalog.status)))return json(403,'owner-only',origin,env);
 if(r.action==='stage'){
  const rawType=(req.headers.get('Content-Type')||'').toLowerCase().trim();
  if(rawType!==expectedMime(r,meta))return json(415,'invalid-media',origin,env);
  const bytes=await bytesFromBody(req,limits[r.kind]);
  if(!bytes||!validateBytes(bytes,r,meta))return json(413,'invalid-payload',origin,env);
  let digest;
  try{digest=await hash(bytes,cryptoApi);}catch{return json(503,'digest-unavailable',origin,env);}
  if(digest!==meta.sha256)return json(422,'digest-mismatch',origin,env);
  if(typeof cryptoApi?.randomUUID!=='function')return json(503,'random-unavailable',origin,env);
  const uploadId=cryptoApi.randomUUID();
  if(!/^[a-f0-9-]{36}$/i.test(uploadId))return json(503,'random-unavailable',origin,env);
  const k='quarantine/epub/'+identity.uid+'/'+r.bookId+'/'+catalog.revision+'/'+uploadId+'.bin';
  try{await env.DUDU_LIBRARY_EPUB_BUCKET.put(k,bytes,{
   httpMetadata:{contentType:'application/octet-stream'},
   customMetadata:{state:'QUARANTINED',ownerUid:identity.uid,
    kind:r.kind,bookId:r.bookId,revision:catalog.revision,itemId:r.itemId||'source',sha256:digest}
  });}catch{return json(503,'storage-unavailable',origin,env);}
  return json(201,'quarantined',origin,env,{uploadId,bytes:bytes.byteLength,sha256:digest,publishable:false});
 }
 let obj;
 try{obj=await env.DUDU_LIBRARY_EPUB_BUCKET.get(key(catalog,r));}
 catch{return json(503,'storage-unavailable',origin,env);}
 if(!obj||typeof obj.arrayBuffer!=='function')return json(404,'object-missing',origin,env);
 let body,digest;
 try{
  if(Number(obj.size)>limits[r.kind]||Number(obj.size)!==meta.bytes)
   return json(502,'content-unverified',origin,env);
  body=await obj.arrayBuffer();
  if(!validateBytes(body,r,meta))return json(502,'content-unverified',origin,env);
  digest=await hash(body,cryptoApi);
 }catch{return json(503,'content-unavailable',origin,env);}
 if(digest!==meta.sha256)return json(502,'content-unverified',origin,env);
 return new Response(body,{status:200,headers:headers(origin,env,expectedMime(r,meta))});
}
export const LIBRARY_R2_PREFIX=PREFIX;
