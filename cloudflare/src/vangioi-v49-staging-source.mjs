// G1S: trusted-host V49 projection for isolated staging tests only.
// No Firebase SDK, network, registry write or cross-store transaction.
import {copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

const validText=(value,max)=>typeof value==='string'&&!!value.trim()&&value.length<=max&&
 !/[\p{C}]/u.test(value);
const validUid=value=>validText(value,128);
const validStoryId=value=>validText(value,160);
const validOrder=(value,index)=>Number.isSafeInteger(value)&&value===index;
const MAX_G1F_SOURCE_BYTES=1024*1024;

function projectV49(raw,storyId){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('invalid-v49-snapshot');
 const book=raw.book,chapters=raw.chapters;
 if(!book||typeof book!=='object'||Array.isArray(book)||book.id!==storyId||
  !validText(book.title,500)||!validUid(book.ownerUid)||
  !['draft','published'].includes(book.status)||
  !Number.isSafeInteger(book.chapterCount)||book.chapterCount<1||book.chapterCount>160||
  !Array.isArray(book.chapterIndex)||book.chapterIndex.length!==book.chapterCount||
  !Array.isArray(chapters)||chapters.length!==book.chapterCount)
  throw Error('invalid-v49-book');
 const byId=new Map();
 for(const chapter of chapters){
  if(!chapter||typeof chapter!=='object'||Array.isArray(chapter)||
   !validText(chapter.id,160)||!validText(chapter.title,500)||
   !Number.isSafeInteger(chapter.order)||
   (chapter.wordCount!==undefined&&!Number.isSafeInteger(chapter.wordCount))||
   typeof chapter.content!=='string'||!chapter.content.trim()||byId.has(chapter.id))
   throw Error('invalid-v49-chapter');
  byId.set(chapter.id,chapter);
 }
 const seen=new Set(),index=[],ordered=[];
 for(const [order,entry] of book.chapterIndex.entries()){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||!validText(entry.id,160)||
   !validText(entry.title,500)||!validOrder(entry.order,order)||seen.has(entry.id))
   throw Error('invalid-v49-index');
  const chapter=byId.get(entry.id);
  if(!chapter||chapter.title!==entry.title||chapter.order!==order)
   throw Error('v49-chapter-mismatch');
  seen.add(entry.id);index.push({id:entry.id,title:entry.title,order});
  ordered.push({chapterId:entry.id,title:entry.title,text:chapter.content});
 }
 // Copy only the G1Q projection. Cover, fingerprint, author claims and
 // Firestore timestamps are not part of the canonical adaptation pin.
 const projectedBook={id:book.id,title:book.title,ownerUid:book.ownerUid,status:book.status,
  chapterCount:book.chapterCount,chapterIndex:index};
 const projectedChapters=ordered.map((chapter,order)=>({id:chapter.chapterId,
  title:chapter.title,order,content:chapter.text}));
 const payload=copyAuthoringJson({format:'story-source-1',title:book.title,chapters:ordered});
 if(new TextEncoder().encode(JSON.stringify(payload)).byteLength>MAX_G1F_SOURCE_BYTES)
  throw Error('v49-payload-limit');
 return {book:projectedBook,chapters:projectedChapters,payload};
}

/**
 * Creates the readSnapshot callback required by G1Q. Both dependencies must
 * come from trusted server code, never a client-supplied request. The host
 * must guarantee that readV49Snapshot reads book/index/chapters consistently.
 * G1S cannot prove that guarantee or make SQLite and Firestore atomic.
 */
export function createV49StagingSnapshotReader({readV49Snapshot,readAdaptationPermit}={}){
 if(typeof readV49Snapshot!=='function'||typeof readAdaptationPermit!=='function')
  throw new TypeError('G1S requires trusted snapshot and permit readers');
 return async function readSnapshot({storyId,authorizedUid}={}){
  if(!validStoryId(storyId)||!validUid(authorizedUid))throw Error('invalid-g1s-request');
  try{
   const raw=await readV49Snapshot({storyId});
   const projected=projectV49(raw,storyId);
   const contentHash=await hashAuthoringJson(projected.payload);
   const result=await readAdaptationPermit({storyId,contentHash});
   const permit=result?.ok===true?result.permit:null;
   if(!permit||permit.storyId!==storyId||permit.contentHash!==contentHash||
    permit.authorizedUid!==authorizedUid||permit.status!=='active')
    throw Error('permit-unavailable');
   return {book:projected.book,chapters:projected.chapters,
    permit:copyAuthoringJson(permit)};
  }catch{
   // No Firestore metadata, chapter text, proof, operator assignment or SQL diagnostics.
   throw Error('v49-staging-source-unavailable');
  }
 };
}
