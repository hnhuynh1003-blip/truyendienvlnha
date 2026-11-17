import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalog,checkApprovedReader,loadAuthorizedCatalog}
 from '../src/library-r2-firestore-acl-v1.mjs';
const ID='epub-3aaabab7',REV='r-0123456789abcdef',HASH='a'.repeat(64),TOKEN='a'.repeat(120);
const str=v=>({stringValue:v}),num=v=>({integerValue:String(v)}),boolean=v=>({booleanValue:v});
const map=fields=>({mapValue:{fields}}),arr=values=>({arrayValue:{values}});
const fields=(status='published')=>({status:str(status),ownerUid:str('author'),revision:str(REV),
 chapters:arr([map({id:str('chapter-0001'),bytes:num(11),sha256:str(HASH),order:num(0)})]),
 assets:arr([map({id:str('cover-v1'),bytes:num(8),mime:str('image/png'),sha256:str(HASH)})]),
 source:map({bytes:num(199),sha256:str(HASH)})
});
const request=()=>new Request('https://worker.test/v1/library/r2/read/chapter/'+ID+'/chapter-0001',{
 headers:{Authorization:'Bearer '+TOKEN}});
const env={PROJECT_ID:'truyendienvl'};
function readerFetch({approvedStatus=200,enabled=true,profileStatus=200,catalogStatus=200,status='published'}={}){
 const calls=[];
 async function fetchFn(url,opts){
  calls.push({url,opts});
  if(url.includes('/approved_accounts_v1/'))return new Response(JSON.stringify({fields:{enabled:boolean(enabled)}}),{status:approvedStatus});
  if(url.includes('/profiles_v2/'))return new Response(JSON.stringify({fields:{name:str('Legacy')}}),{status:profileStatus});
  if(url.includes('/epub_catalog_r2_v1/'))return new Response(JSON.stringify({fields:fields(status)}),{status:catalogStatus});
  throw Error('unexpected URL');
 }
 return {fetchFn,calls};
}
test('Firestore catalog parser accepts typed fields and preserves immutable IDs',()=>{
 const doc=parseCatalog(fields());
 assert.equal(doc.chapters.get('chapter-0001').bytes,11);
 assert.equal(doc.revision,REV);assert.equal(doc.source.sha256,HASH);
});
test('Firestore catalog parser rejects duplicate IDs, invalid hashes and order',()=>{
 const x=fields();x.chapters.arrayValue.values.push(x.chapters.arrayValue.values[0]);
 assert.throws(()=>parseCatalog(x),/chưa hợp lệ/);
 const y=fields();y.chapters.arrayValue.values[0].mapValue.fields.sha256=str('malformed');
 assert.throws(()=>parseCatalog(y),/chưa hợp lệ/);
 const z=fields();z.chapters.arrayValue.values[0].mapValue.fields.order=num(2);
 assert.throws(()=>parseCatalog(z),/chưa hợp lệ/);
});
test('approved account enabled true is authorized, explicit enabled false denies even with legacy profile',async()=>{
 const ok=readerFetch();
 assert.equal(await checkApprovedReader({identity:{uid:'reader'},token:TOKEN,projectId:env.PROJECT_ID,fetchFn:ok.fetchFn}),true);
 const revoked=readerFetch({enabled:false});
 assert.equal(await checkApprovedReader({identity:{uid:'reader'},token:TOKEN,projectId:env.PROJECT_ID,fetchFn:revoked.fetchFn}),false);
 assert.equal(revoked.calls.some(x=>x.url.includes('/profiles_v2/')),false);
});
test('missing allowlist doc permits existing grandfather profile, but never a missing profile',async()=>{
 for(const [profileStatus,result] of [[200,true],[404,false],[403,false]]){
  const f=readerFetch({approvedStatus:404,profileStatus});
  assert.equal(await checkApprovedReader({identity:{uid:'reader'},token:TOKEN,projectId:env.PROJECT_ID,fetchFn:f.fetchFn}),result);
 }
});
test('approval read errors do not authorize fallback by grandfather profile',async()=>{
 for(const approvedStatus of [401,403,500,503]){
  const f=readerFetch({approvedStatus});
  assert.equal(await checkApprovedReader({identity:{uid:'reader'},token:TOKEN,projectId:env.PROJECT_ID,fetchFn:f.fetchFn}),false);
  assert.equal(f.calls.some(x=>x.url.includes('/profiles_v2/')),false);
 }
});
test('admin claim bypasses allowlist for owner, never for non-owner draft',async()=>{
 const f=readerFetch({status:'draft'});
 const user={uid:'author',admin:true};
 const d=await loadAuthorizedCatalog({request:request(),env,identity:user,bookId:ID,mode:'read',fetchFn:f.fetchFn});
 assert.equal(d.status,'draft');
 assert.equal(f.calls.filter(x=>x.url.includes('approved_accounts')).length,0);
 const notOwner=await loadAuthorizedCatalog({request:request(),env,identity:{uid:'other',admin:true},bookId:ID,mode:'read',fetchFn:f.fetchFn});
 assert.equal(notOwner,null);
});
test('published catalog denied to unauthenticated or unapproved and allowed to approved reader',async()=>{
 const ok=readerFetch();
 assert.equal((await loadAuthorizedCatalog({request:request(),env,identity:{uid:'reader',admin:false},bookId:ID,mode:'read',fetchFn:ok.fetchFn})).status,'published');
 const revoked=readerFetch({enabled:false});
 assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:{uid:'reader',admin:false},bookId:ID,mode:'read',fetchFn:revoked.fetchFn}),null);
 assert.equal(revoked.calls.some(x=>x.url.includes('epub_catalog')),false);
 assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:null,bookId:ID,mode:'read',fetchFn:ok.fetchFn}),null);
});
test('even approved reader denied archived, deleting and draft chapters',async()=>{
 for(const status of ['archived','deleting','draft','importing']){
  const f=readerFetch({status});
  assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:{uid:'reader',admin:false},bookId:ID,mode:'read',fetchFn:f.fetchFn}),null);
 }
});
test('only owner with admin claim can stage draft, published and unowned blocked',async()=>{
 const f=readerFetch({status:'draft'});
 const yes=await loadAuthorizedCatalog({request:request(),env,identity:{uid:'author',admin:true},bookId:ID,mode:'stage',fetchFn:f.fetchFn});
 assert.equal(yes.status,'draft');
 assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:{uid:'reader',admin:false},bookId:ID,mode:'stage',fetchFn:f.fetchFn}),null);
 assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:{uid:'other',admin:true},bookId:ID,mode:'stage',fetchFn:f.fetchFn}),null);
 const pub=readerFetch();
 assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:{uid:'author',admin:true},bookId:ID,mode:'stage',fetchFn:pub.fetchFn}),null);
});
test('missing/unpublished catalog rules remain hard denied before R2 use',async()=>{
 for(const catalogStatus of [401,403,404,503]){
  const f=readerFetch({catalogStatus});
  assert.equal(await loadAuthorizedCatalog({request:request(),env,identity:{uid:'author',admin:true},bookId:ID,mode:'stage',fetchFn:f.fetchFn}),null);
 }
});
test('backend forwards Firebase user token, never OAuth service credentials',async()=>{
 const f=readerFetch();
 await loadAuthorizedCatalog({request:request(),env,identity:{uid:'reader',admin:false},bookId:ID,mode:'read',fetchFn:f.fetchFn});
 assert.ok(f.calls.every(x=>x.opts.headers.Authorization==='Bearer '+TOKEN));
 assert.ok(f.calls.every(x=>x.opts.cache==='no-store'&&x.opts.redirect==='error'));
});
