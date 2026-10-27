// G2N: isolated trusted-host EPUB V49 draft inspection; NOT a public route,
// Firebase writer, review grant issuer, Vạn Giới permit or publish authority.
// All callbacks are injected by a trusted server. No SDK/IAM/prod credentials.
import {hashAuthoringJson} from './vangioi-authoring.mjs';

const MAX_CHAPTERS=160,MAX_CHARACTERS=220000,MAX_BYTES=420000;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(value);
const uid=value=>typeof value==='string'&&value.length>=1&&value.length<=128&&!/[\p{C}]/u.test(value);
const title=value=>typeof value==='string'&&value.length>=1&&value.length<=140&&
 value.trim()===value&&!/[\p{C}]/u.test(value);
const revision=value=>Number.isSafeInteger(value)&&value>=1;
const digest=value=>typeof value==='string'&&/^sha256-[a-f0-9]{64}$/.test(value);
const fail=(code='forbidden')=>Object.freeze({ok:false,code});
const forbidden=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

function plain(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value))||
  Object.getOwnPropertySymbols(value).length!==0)return false;
 return Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>
  Object.hasOwn(d,'value')&&d.enumerable);
}
const exact=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&
 keys.every(key=>Object.hasOwn(value,key));
const safeChapterId=(value,order)=>value==='chapter-'+String(order+1).padStart(4,'0');

/**
 * Computes a deterministic SHA-256 tree of the ENTIRE draft chapter sequence.
 * No V57 importFingerprint is trusted; digest is NOT an adaptation permit or
 * signature. The caller must source the snapshot from a consistent server read.
 * Per-chapter hashing avoids materializing one 67 MiB JSON digest input.
 */
export async function hashV49DraftSnapshot(snapshot,{storyId}={}){
 if(!id(storyId)||!exact(snapshot,['book','chapters'])||!plain(snapshot.book)||
  !Array.isArray(snapshot.chapters))throw Error('v49-draft-invalid');
 const book=snapshot.book,{chapters}=snapshot;
 if(book.id!==storyId||!uid(book.ownerUid)||book.status!=='draft'||
  !title(book.title)||!title(book.author)||book.genre!=='Nhập EPUB'||
  book.importSchema!==57||
  !Number.isSafeInteger(book.chapterCount)||book.chapterCount<1||
  book.chapterCount>MAX_CHAPTERS||!Array.isArray(book.chapterIndex)||
  book.chapterIndex.length!==book.chapterCount||chapters.length!==book.chapterCount||
  Object.hasOwn(book,'publishedAt'))throw Error('v49-draft-invalid');
 const hashes=[],index=[];
 for(let i=0;i<book.chapterCount;i++){
  const item=book.chapterIndex[i],chapter=chapters[i];
  if(!exact(item,['id','title','wordCount','order'])||
   !exact(chapter,['id','title','wordCount','order','content'])||
   !id(item.id)||!safeChapterId(item.id,i)||!title(item.title)||
   !Number.isSafeInteger(item.order)||item.order!==i||
   !Number.isSafeInteger(item.wordCount)||item.wordCount<1||item.wordCount>MAX_CHARACTERS||
   item.id!==chapter.id||item.order!==chapter.order||
   item.title!==chapter.title||item.wordCount!==chapter.wordCount||
   typeof chapter.content!=='string'||!chapter.content.length||
   chapter.content.trim()!==chapter.content||forbidden.test(chapter.content)||
   chapter.content.length>MAX_CHARACTERS||
   new TextEncoder().encode(chapter.content).byteLength>MAX_BYTES||
   chapter.content.split(/\s+/).filter(Boolean).length!==chapter.wordCount)
   throw Error('v49-draft-invalid');
  index.push({id:item.id,title:item.title,order:i,wordCount:item.wordCount});
  hashes.push(await hashAuthoringJson({id:chapter.id,title:chapter.title,
   order:chapter.order,wordCount:chapter.wordCount,content:chapter.content}));
 }
 const sourceHash='sha256-'+await hashAuthoringJson({format:'v49-draft-integrity-g2n-1',
  book:{id:storyId,ownerUid:book.ownerUid,title:book.title,author:book.author,
   genre:book.genre,chapterCount:book.chapterCount,chapterIndex:index},chapterHashes:hashes});
 return Object.freeze({sourceHash,storyId,ownerUid:book.ownerUid,
  chapterCount:book.chapterCount});
}

function validPin(pin,{storyId,ownerUid,sourceHash}={}){
 return plain(pin)&&pin.storyId===storyId&&pin.ownerUid===ownerUid&&
  pin.status==='active'&&revision(pin.revision)&&digest(pin.sourceHash)&&
  (sourceHash===undefined||pin.sourceHash===sourceHash);
}
function validAssignment(assignment,{storyId,reviewerUid,pin,now}={}){
 return plain(assignment)&&assignment.storyId===storyId&&
  assignment.reviewerUid===reviewerUid&&
  assignment.status==='active'&&assignment.scope==='v49-draft-inspect'&&
  revision(assignment.revision)&&assignment.pinRevision===pin.revision&&
  assignment.sourceHash===pin.sourceHash&&
  Number.isSafeInteger(assignment.expiresAt)&&assignment.expiresAt>now;
}
const samePin=(a,b)=>a.storyId===b.storyId&&a.ownerUid===b.ownerUid&&
 a.status===b.status&&a.revision===b.revision&&a.sourceHash===b.sourceHash;
const sameAssignment=(a,b)=>a.storyId===b.storyId&&a.reviewerUid===b.reviewerUid&&
 a.status===b.status&&a.scope===b.scope&&a.revision===b.revision&&
 a.pinRevision===b.pinRevision&&a.sourceHash===b.sourceHash&&
 a.expiresAt===b.expiresAt;

/**
 * Host contracts:
 * verify(request): genuine server-verified uid + admin custom claim (not body).
 * readDraftHeader(storyId): trusted header, used BEFORE private chapter reads.
 * readConsistentSnapshot(storyId): one coherent, immutable source snapshot.
 * readSourcePin(storyId): trusted, server-owned SHA-256 source version record.
 * readReviewerAssignment(storyId,reviewerUid): server-owned, revocable scope.
 * A preview success does not authorize subsequent Firestore/SQL publication.
 */
export function createV49DraftIntegrityInspection({verify,readDraftHeader,
 readConsistentSnapshot,readSourcePin,readReviewerAssignment,now=Date.now}={}){
 if([verify,readDraftHeader,readConsistentSnapshot,readSourcePin,
  readReviewerAssignment,now].some(fn=>typeof fn!=='function'))
  throw new TypeError('G2N needs trusted host identity, snapshot, pin and assignment callbacks');

 return async function inspect(request,{storyId,mode}={}){
  if(!id(storyId)||!['prepublish','review'].includes(mode))return fail();
  try{
   const actor=await verify(request);
   if(!uid(actor?.uid))return fail();
   const header=await readDraftHeader({storyId});
   if(!plain(header)||header.id!==storyId||!uid(header.ownerUid)||
    header.status!=='draft')return fail();
   const pin=await readSourcePin({storyId});
   if(!validPin(pin,{storyId,ownerUid:header.ownerUid}))return fail();
   const owner=actor.uid===header.ownerUid&&actor.admin===true;
   let assignment=null;
   if(!owner){
    if(mode!=='review')return fail();
    assignment=await readReviewerAssignment({storyId,reviewerUid:actor.uid});
    if(!validAssignment(assignment,{storyId,reviewerUid:actor.uid,pin,now:now()}))
     return fail();
   }
   // Authorization precedes loading chapter prose. No source in failure data.
   const raw=await readConsistentSnapshot({storyId});
   const proof=await hashV49DraftSnapshot(raw,{storyId});
   if(proof.ownerUid!==header.ownerUid||proof.sourceHash!==pin.sourceHash)
    return fail('source-conflict');
   const latestPin=await readSourcePin({storyId});
   if(!validPin(latestPin,{storyId,ownerUid:header.ownerUid,sourceHash:proof.sourceHash})||
    !samePin(pin,latestPin))return fail('source-conflict');
   if(assignment){
    const latest=await readReviewerAssignment({storyId,reviewerUid:actor.uid});
    if(!validAssignment(latest,{storyId,reviewerUid:actor.uid,pin:latestPin,now:now()})||
     !sameAssignment(assignment,latest))return fail();
   }
   const latestHeader=await readDraftHeader({storyId});
   if(!plain(latestHeader)||latestHeader.id!==header.id||
    latestHeader.ownerUid!==header.ownerUid||latestHeader.status!=='draft'||
    latestHeader.title!==raw.book.title||latestHeader.author!==raw.book.author||
    latestHeader.chapterCount!==raw.book.chapterCount||
    latestHeader.updatedAt!==raw.book.updatedAt||
    JSON.stringify(latestHeader.chapterIndex)!==JSON.stringify(raw.book.chapterIndex))
    return fail('source-conflict');
   return Object.freeze({ok:true,storyId,sourceHash:proof.sourceHash,
    sourceRevision:pin.revision,chapterCount:proof.chapterCount,
    access:owner?'owner':'assigned-reviewer',inspectionOnly:true,
    canPublish:false});
  }catch{
   return fail('v49-inspection-unavailable');
  }
 };
}
