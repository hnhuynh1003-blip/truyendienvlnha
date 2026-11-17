import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {handleLibraryR2Private} from '../src/library-r2-private-v1.mjs';
const BOOK='epub-3aaabab7',CH='chapter-0001',ASSET='cover-v1',REV='r-0123456789abcdef',ORIGIN='https://hnhuynh1003-blip.github.io';
const text=new TextEncoder().encode('Tu vi tăng.\n\nCảnh giới mới.');
const image=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
const zip=new Uint8Array([80,75,3,4,1,2,3,4,5]);
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture({enabled='true',identity={uid:'reader',admin:false},status='published',allow=true,down=false}={}){
 const records=new Map(),calls=[];
 const chap='chapters/'+BOOK+'/'+REV+'/'+CH+'.txt';
 const asset='assets/'+BOOK+'/'+REV+'/'+ASSET+'.png';
 const original='originals/'+BOOK+'/'+REV+'/source.epub';
 records.set(chap,text);records.set(asset,image);records.set(original,zip);
 const bucket={async get(k){calls.push(['get',k]);if(down)throw Error('offline');const data=records.get(k);return data?{size:data.length,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.length)}:null;},
 async put(k,v,opt){calls.push(['put',k,opt]);if(down)throw Error('offline');records.set(k,new Uint8Array(v));},
 async delete(){throw Error('NEVER DELETE');}};
 const env={LIBRARY_R2_ENABLED:enabled,PROJECT_ID:'truyendienvl',ALLOWED_ORIGIN:ORIGIN,DUDU_LIBRARY_EPUB_BUCKET:bucket};
 const meta={status,ownerUid:'author',revision:REV,
  chapters:new Map([[CH,{id:CH,bytes:text.length,sha256:sha(text)}]]),
  assets:new Map([[ASSET,{id:ASSET,bytes:image.length,sha256:sha(image),mime:'image/png'}]]),
  source:{bytes:zip.length,sha256:sha(zip)}};
 const deps={cryptoApi:webcrypto,verifyIdentity:async()=>identity,loadCatalog:async()=>allow?meta:null};
 const req=(verb,kind,item,body,opts={})=>new Request('https://worker.test/v1/library/r2/'+(opts.action||'read')+'/'+kind+'/'+BOOK+(item?'/'+item:''),{
  method:verb,headers:{Origin:opts.origin||ORIGIN,Authorization:opts.noToken?'':'Bearer '+'x'.repeat(120),
   ...(body?{'Content-Type':opts.mime||'text/plain; charset=utf-8'}:{})},body});
 return {records,calls,env,deps,meta,req,chap,asset,original,run:r=>handleLibraryR2Private(r,env,deps)};
}
test('OFF feature flag denies without touching storage',async()=>{const f=fixture({enabled:'false'});assert.equal((await f.run(f.req('GET','chapter',CH))).status,503);assert.equal(f.calls.length,0);});
test('anonymous/missing token denied',async()=>{const f=fixture();assert.equal((await f.run(f.req('GET','chapter',CH,null,{noToken:true}))).status,401);assert.equal(f.calls.length,0);});
test('unapproved catalog denies without storage reads',async()=>{const f=fixture({allow:false});assert.equal((await f.run(f.req('GET','chapter',CH))).status,403);assert.equal(f.calls.length,0);});
test('chapter returns exact private UTF8 with no-cache headers',async()=>{const f=fixture(),r=await f.run(f.req('GET','chapter',CH));assert.equal(r.status,200);assert.equal(await r.text(),new TextDecoder().decode(text));assert.match(r.headers.get('Cache-Control'),/no-store/);assert.equal(f.calls[0][1],f.chap);});
test('assets verified by MIME and digest',async()=>{const f=fixture(),r=await f.run(f.req('GET','asset',ASSET));assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),image);});
test('original EPUB is owner-only',async()=>{const f=fixture();assert.equal((await f.run(f.req('GET','original'))).status,403);const o=fixture({identity:{uid:'author',admin:true}});assert.equal((await o.run(o.req('GET','original'))).status,200);});
test('tampered or missing R2 objects reject without fallback',async()=>{const f=fixture();f.records.set(f.chap,new Uint8Array(text.length));assert.equal((await f.run(f.req('GET','chapter',CH))).status,502);f.records.delete(f.chap);assert.equal((await f.run(f.req('GET','chapter',CH))).status,404);});
test('malformed paths and mismatched origin refuse access',async()=>{const f=fixture();const bad=new Request('https://worker.test/v1/library/r2/read/chapter/'+BOOK+'/x%2Fsecret');assert.equal((await f.run(bad)).status,404);assert.equal((await f.run(f.req('GET','chapter',CH,null,{origin:'https://evil.test'}))).status,403);assert.equal(f.calls.length,0);});
test('non-admin/wrong-owner/published authors cannot upload',async()=>{for(const o of [{status:'draft'},{status:'draft',identity:{uid:'other',admin:true}},{status:'published',identity:{uid:'author',admin:true}}]){const f=fixture(o);assert.equal((await f.run(f.req('POST','chapter',CH,text,{action:'stage'}))).status,403);assert.equal(f.calls.length,0);}});
test('author stage chapter is quarantined, never publishable',async()=>{const f=fixture({status:'draft',identity:{uid:'author',admin:true}});const r=await f.run(f.req('POST','chapter',CH,text,{action:'stage'}));assert.equal(r.status,201);const d=await r.json();assert.equal(d.publishable,false);assert.equal(d.sha256,sha(text));assert.equal(f.calls[0][2].customMetadata.state,'QUARANTINED');assert.match(f.calls[0][1],/^quarantine\/epub\//);});
test('wrong MIME, payload size and digest never reach bucket put',async()=>{const f=fixture({status:'draft',identity:{uid:'author',admin:true}});assert.equal((await f.run(f.req('POST','chapter',CH,text,{action:'stage',mime:'text/html'}))).status,415);assert.equal((await f.run(f.req('POST','chapter',CH,new TextEncoder().encode('bad'),{action:'stage'}))).status,413);assert.equal((await f.run(f.req('POST','chapter',CH,new Uint8Array(text.length).fill(88),{action:'stage'}))).status,422);assert.equal(f.calls.length,0);});
test('EPUB ZIP and image staged only after signature and digest validation',async()=>{const f=fixture({status:'draft',identity:{uid:'author',admin:true}});assert.equal((await f.run(f.req('POST','original',undefined,zip,{action:'stage',mime:'application/epub+zip'}))).status,201);assert.equal((await f.run(f.req('POST','asset',ASSET,image,{action:'stage',mime:'image/png'}))).status,201);assert.equal(f.calls.length,2);});
test('failed bucket or missing binding fails closed',async()=>{const f=fixture({down:true});assert.equal((await f.run(f.req('GET','chapter',CH))).status,503);delete f.env.DUDU_LIBRARY_EPUB_BUCKET;assert.equal((await f.run(f.req('GET','chapter',CH))).status,503);});
test('OPTIONS succeeds only on allowed origin and cannot make R2 calls',async()=>{const f=fixture(),r=await f.run(f.req('OPTIONS','chapter',CH));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),ORIGIN);assert.equal(f.calls.length,0);});
