// G1Q trusted server-side preparation only. No Firestore SDK, network or registry write.
import {verifyFirebaseIdToken} from './auth.mjs';
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const short=(v,n)=>typeof v==='string'&&!!v.trim()&&v.length<=n&&!/[\p{C}]/u.test(v);
const keys=(o,w)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...w].sort().join(',');
const fail=code=>({ok:false,code});
function payloadFrom(snapshot,storyId){
 if(!keys(snapshot,['book','chapters','permit']))throw Error('invalid-snapshot');
 const {book:b,chapters}=snapshot;
 if(!keys(b,['id','title','ownerUid','status','chapterCount','chapterIndex'])||b.id!==storyId||
  !uid(b.ownerUid)||!short(b.title,500)||!['draft','published'].includes(b.status)||
  !Number.isSafeInteger(b.chapterCount)||b.chapterCount<1||b.chapterCount>5000||
  !Array.isArray(b.chapterIndex)||b.chapterIndex.length!==b.chapterCount||
  !Array.isArray(chapters)||chapters.length!==b.chapterCount)throw Error('invalid-snapshot');
 const byId=new Map();
 for(const c of chapters){
  if(!keys(c,['id','title','order','content'])||!short(c.id,160)||!short(c.title,500)||
   !Number.isSafeInteger(c.order)||typeof c.content!=='string'||!c.content.trim()||byId.has(c.id))throw Error('invalid-chapter');
  byId.set(c.id,c);
 }
 const seen=new Set(),ordered=b.chapterIndex.map((index,i)=>{
  if(!keys(index,['id','title','order'])||index.order!==i||seen.has(index.id))throw Error('invalid-index');
  seen.add(index.id);const c=byId.get(index.id);
  if(!c||c.order!==i||c.title!==index.title)throw Error('chapter-mismatch');
  return {chapterId:c.id,title:c.title,text:c.content};
 });
 const payload=copyAuthoringJson({format:'story-source-1',title:b.title,chapters:ordered});
 if(new TextEncoder().encode(JSON.stringify(payload)).length>1024*1024)throw Error('payload-limit');
 return payload;
}
function permitted(p,storyId,authorizedUid,hash){
 return keys(p,['storyId','authorizedUid','contentHash','status','revision','license','sourceNote','proofRef'])&&
  p.storyId===storyId&&p.authorizedUid===authorizedUid&&p.contentHash===hash&&p.status==='active'&&
  Number.isSafeInteger(p.revision)&&p.revision>=1&&['original','licensed','public_domain'].includes(p.license)&&
  short(p.sourceNote,2000)&&(p.proofRef===null||short(p.proofRef,500))&&(p.license!=='licensed'||p.proofRef!==null);
}
export function createLibrarySourcePreparer({projectId,verify=verifyFirebaseIdToken,isOperator,readSnapshot}={}){
 if(!/^[a-z0-9-]{1,64}$/.test(projectId||'')||typeof verify!=='function'||typeof isOperator!=='function'||typeof readSnapshot!=='function')
  throw new TypeError('Trusted identity, operator and snapshot readers required');
 return async function prepare(request,input){
  let d;
  try{d=copyAuthoringJson(input);
   if(!keys(d,['storyId','authorizedUid','requestId'])||!short(d.storyId,160)||!uid(d.authorizedUid)||
    typeof d.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(d.requestId))return fail('invalid-request');
  }catch{return fail('invalid-request');}
  let who;
  try{who=await verify(request,projectId);}catch{}
  if(!uid(who?.uid))return fail('unauthenticated');
  try{
   if(await isOperator(who.uid)!==true)return fail('forbidden');
   // Readers are installed by trusted host, never accepted from request JSON.
   const first=copyAuthoringJson(await readSnapshot({storyId:d.storyId,authorizedUid:d.authorizedUid}));
   const payload=payloadFrom(first,d.storyId),hash=await hashAuthoringJson(payload);
   if(!permitted(first.permit,d.storyId,d.authorizedUid,hash))return fail('forbidden');
   const digest=await hashAuthoringJson(first);
   const second=copyAuthoringJson(await readSnapshot({storyId:d.storyId,authorizedUid:d.authorizedUid}));
   if(await hashAuthoringJson(second)!==digest)return fail('source-conflict');
   if(await isOperator(who.uid)!==true)return fail('forbidden');
   const p=first.permit;
   return {ok:true,reference:{kind:'library',storyId:d.storyId,storyVersion:'sha256-'+hash,contentHash:hash},
    permitRevision:p.revision,registryInput:{requestId:d.requestId,kind:'library',storyId:d.storyId,storyVersion:'sha256-'+hash,
     authorizedUid:d.authorizedUid,license:p.license,sourceNote:p.sourceNote,proofRef:p.proofRef,payload}};
  }catch{return fail('library-source-unavailable');}
 };
}
