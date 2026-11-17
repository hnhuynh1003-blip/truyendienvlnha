/* L6-P2C3: trusted draft catalog serialization for R2 EPUB metadata.
 * Pure constructor: no Firebase writes, no R2 calls, no publish or delete.
 * The identity MUST come from a separately verified server Firebase JWT,
 * NOT from a browser object or a request body.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
const REV=/^r-[a-f0-9]{16,32}$/;
const HASH=/^[a-f0-9]{64}$/;
const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const allowed=x=>x&&typeof x==='object'&&!Array.isArray(x);
const exact=(o,fields)=>allowed(o)&&Object.keys(o).length===fields.length&&
 fields.every(k=>Object.prototype.hasOwnProperty.call(o,k));
const fail=reason=>{throw Error('R2 draft catalog rejected: '+reason);};
const str=(s,max)=>typeof s==='string'&&s.trim()&&s.length<=max&&
 !/[\u0000-\u001F<>]/u.test(s);
const integer=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max;
const S=v=>({stringValue:v}),N=v=>({integerValue:String(v)});
const M=o=>({mapValue:{fields:o}}),A=values=>({arrayValue:{values}});
export function prepareR2CatalogDraft({manifest,layouts,identity,metadata}={}){
 if(!identity?.admin||typeof identity.uid!=='string'||
  !/^[A-Za-z0-9_-]{1,128}$/.test(identity.uid))
  fail('missing verified owner');
 if(!exact(manifest,['schema','bookId','revisionId','source','chapters','assets'])||
  manifest.schema!==1||!ID.test(manifest.bookId||'')||!REV.test(manifest.revisionId||''))
  fail('manifest identity');
 if(!exact(metadata,['title','author','description'])||!str(metadata.title,140)||
  !str(metadata.author,140)||typeof metadata.description!=='string'||
  metadata.description.length>3000||/[\u0000-\u001F<>]/u.test(metadata.description))
  fail('book metadata');
 if(!exact(manifest.source,['name','bytes','sha256'])||
  !str(manifest.source.name,180)||!/\.epub$/i.test(manifest.source.name)||
  !integer(manifest.source.bytes,30*1024*1024)||
  !HASH.test(manifest.source.sha256||''))fail('original EPUB');
 if(!Array.isArray(manifest.chapters)||!manifest.chapters.length||
  manifest.chapters.length>160||!Array.isArray(manifest.assets)||manifest.assets.length>3000||
  !Array.isArray(layouts)||layouts.length!==manifest.chapters.length)fail('chapter/layout count');
 const layoutMap=new Map();
 for(const item of layouts){
  if(!exact(item,['chapterId','bytes','sha256'])||
   !ID.test(item.chapterId||'')||layoutMap.has(item.chapterId)||
   !integer(item.bytes,1048576)||!HASH.test(item.sha256||''))fail('layout summary');
  layoutMap.set(item.chapterId,item);
 }
 const ids=new Set();
 const chapters=manifest.chapters.map((ch,i)=>{
  if(!exact(ch,['id','title','order','wordCount','bytes','sha256'])||
   !ID.test(ch.id||'')||ids.has(ch.id)||!str(ch.title,140)||
   ch.order!==i||!integer(ch.wordCount,220000)||!integer(ch.bytes,420000)||
   !HASH.test(ch.sha256||'')||!layoutMap.has(ch.id))fail('chapter metadata');
  ids.add(ch.id);const l=layoutMap.get(ch.id);
  return M({id:S(ch.id),title:S(ch.title),order:N(i),wordCount:N(ch.wordCount),
   bytes:N(ch.bytes),sha256:S(ch.sha256),
   layout:M({bytes:N(l.bytes),sha256:S(l.sha256)})});
 });
 const assetIds=new Set();let covers=0,coverAssetId='';
 const assets=manifest.assets.map(a=>{
  if(!exact(a,['id','role','mime','bytes','sha256'])||
   !ID.test(a.id||'')||assetIds.has(a.id)||!['cover','illustration'].includes(a.role)||
   !MIME.has(a.mime)||!integer(a.bytes,10*1024*1024)||!HASH.test(a.sha256||''))
   fail('asset metadata');
  assetIds.add(a.id);
  if(a.role==='cover'){covers++;coverAssetId=a.id;}
  return M({id:S(a.id),role:S(a.role),mime:S(a.mime),bytes:N(a.bytes),
   sha256:S(a.sha256)});
 });
 if(covers>1)fail('multiple covers');
 const fields={
  status:S('importing'),ownerUid:S(identity.uid),revision:S(manifest.revisionId),
  title:S(metadata.title),author:S(metadata.author),description:S(metadata.description),
  source:M({name:S(manifest.source.name),bytes:N(manifest.source.bytes),
   sha256:S(manifest.source.sha256)}),
  chapters:A(chapters),assets:A(assets),coverAssetId:S(coverAssetId),
  backend:S('r2')
 };
 if(JSON.stringify(fields).length>800000)fail('Firestore document too large');
 return Object.freeze({
  bookId:manifest.bookId,fields,
  requiresIndependentServerValidation:true,
  catalogWritten:false,authorizedToPublish:false,eligibleForDeletion:false
 });
}
