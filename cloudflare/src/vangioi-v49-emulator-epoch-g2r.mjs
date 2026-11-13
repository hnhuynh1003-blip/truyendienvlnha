// G2R: SOURCE-SIDE Firestore Emulator transaction rehearsal, never production.
// Sidecar is emulator-only: legacy V49 book fields and G2M Rules stay intact.
import {hashV49DraftSnapshot} from './vangioi-v49-draft-integrity-g2n.mjs';

export const G2R_PROJECT='demo-vangioi-g2r';
export const G2R_HOST='127.0.0.1:18084';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const epoch=v=>Number.isSafeInteger(v)&&v>=1&&v<Number.MAX_SAFE_INTEGER;
const hash=v=>typeof v==='string'&&/^sha256-[0-9a-f]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const IMMUTABLE_BOOK=['id','ownerUid','author','genre','status','createdAt',
 'sourceName','importSchema','importFingerprint','coverImage'];

export function assertG2REmulator({emulatorHost,projectId,
 credentialPath=null,activeProjectId=null}={}){
 if(emulatorHost!==G2R_HOST||projectId!==G2R_PROJECT||
  credentialPath!==null&&credentialPath!==''||
  activeProjectId!==null&&activeProjectId!==''&&activeProjectId!==G2R_PROJECT)
  throw new TypeError('G2R refuses nonlocal/cross-project Firestore');
 return Object.freeze({projectId,emulatorHost,emulatorOnly:true});
}

/**
 * initialize: pin the already-seeded synthetic draft, sourceEpoch=1.
 * mutate: in one Firestore transaction, compare epoch, read all chapters,
 * verify original SHA-256, prepare a trusted new complete snapshot, write
 * book/chapters + bumped epoch + operation ID atomically. No browser SDK.
 *
 * prepareMutation must be a deterministic fixture-host callback; Firestore
 * transactions can retry it. It is not a client-controlled input.
 */
export function createV49EmulatorEpochWriter({firestore,emulatorHost,
 credentialPath=null,activeProjectId=null,verifyOperator,prepareMutation}={}){
 assertG2REmulator({emulatorHost,projectId:firestore?.projectId,
  credentialPath,activeProjectId});
 if(typeof firestore?.runTransaction!=='function'||
  typeof firestore?.collection!=='function'||
  typeof verifyOperator!=='function'||typeof prepareMutation!=='function')
  throw new TypeError('G2R requires trusted emulator transaction callbacks');

 const books=firestore.collection('epub_stories_v49');
 const epochs=firestore.collection('vg_fixture_v49_epochs_g2r');
 const operations=firestore.collection('vg_fixture_v49_epoch_ops_g2r');
 const sourceRef=storyId=>epochs.doc(storyId);

 async function applyVerifiedWrite(request,{storyId,expectedEpoch,operationId}={}){
  if(!id(storyId)||!uuid(operationId)||
   (expectedEpoch!==null&&!epoch(expectedEpoch)))
   throw Error('invalid-emulator-epoch-command');
  let actor;
  try{actor=await verifyOperator(request);}catch{throw Error('emulator-operator-required');}
  if(!uid(actor?.uid)||actor.operator!==true)
   throw Error('emulator-operator-required');

  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),epochRef=sourceRef(storyId);
   const opRef=operations.doc(operationId);
   const [sourceRecord,history,bookDoc]=await Promise.all([
    tx.get(epochRef),tx.get(opRef),tx.get(bookRef)]);
   if(history.exists)throw Error('emulator-epoch-operation-replay');
   if(!bookDoc.exists)throw Error('emulator-source-unavailable');
   const book=bookDoc.data();
   if(book?.id!==storyId||book.status!=='draft'||
    !Array.isArray(book.chapterIndex)||book.chapterIndex.length<1||
    book.chapterIndex.length>160||book.chapterCount!==book.chapterIndex.length)
    throw Error('emulator-source-unavailable');
   const refs=book.chapterIndex.map(c=>bookRef.collection('chapters').doc(c.id));
   const chapterDocs=await Promise.all(refs.map(ref=>tx.get(ref)));
   if(chapterDocs.some(d=>!d.exists))throw Error('emulator-source-unavailable');
   const before={book,chapters:chapterDocs.map(d=>d.data())};
   const original=await hashV49DraftSnapshot(before,{storyId});
   const previous=sourceRecord.exists?sourceRecord.data():null;
   let nextEpoch;
   if(!previous){
    if(expectedEpoch!==null)throw Error('emulator-source-epoch-conflict');
    nextEpoch=1;
   }else{
    if(!epoch(previous.sourceEpoch)||previous.sourceEpoch!==expectedEpoch||
     previous.storyId!==storyId||previous.ownerUid!==original.ownerUid||
     previous.sourceHash!==original.sourceHash||
     previous.chapterCount!==original.chapterCount)
     throw Error('emulator-source-epoch-conflict');
    nextEpoch=previous.sourceEpoch+1;
    if(!epoch(nextEpoch))throw Error('emulator-epoch-exhausted');
   }
   // Initial baseline has no source mutation; every subsequent update advances
   // the epoch even when the hash returns to an earlier value.
   let resulting=before;
   if(previous){
    resulting=await prepareMutation({storyId,actorUid:actor.uid,
     previousSnapshot:structuredClone(before)});
    const changed=await hashV49DraftSnapshot(resulting,{storyId});
    if(changed.ownerUid!==original.ownerUid||
     changed.chapterCount!==original.chapterCount||
     resulting.book.status!=='draft'||
     Object.keys(resulting.book).sort().join(',')!==
      Object.keys(before.book).sort().join(',')||
     IMMUTABLE_BOOK.some(key=>resulting.book[key]!==before.book[key])||
     resulting.chapters.some((c,i)=>c.id!==before.chapters[i].id))
     throw Error('emulator-source-identity-conflict');
   }
   const proof=previous?await hashV49DraftSnapshot(resulting,{storyId}):original;
   if(previous){
    tx.set(bookRef,resulting.book);
    resulting.chapters.forEach((chapter,i)=>tx.set(refs[i],chapter));
   }
   tx.set(epochRef,{storyId,ownerUid:proof.ownerUid,sourceEpoch:nextEpoch,
    sourceHash:proof.sourceHash,chapterCount:proof.chapterCount});
   tx.create(opRef,{storyId,sourceEpoch:nextEpoch,sourceHash:proof.sourceHash,
    actorUid:actor.uid});
   return Object.freeze({ok:true,storyId,sourceEpoch:nextEpoch,
    sourceHash:proof.sourceHash,emulatorOnly:true,canPublish:false});
  },{maxAttempts:5});
 }

 async function readSourceEpoch({storyId}={}){
  if(!id(storyId))return null;
  const record=await sourceRef(storyId).get();
  if(!record.exists)return null;
  const x=record.data();
  if(x?.storyId!==storyId||!uid(x.ownerUid)||!epoch(x.sourceEpoch)||
   !hash(x.sourceHash)||!Number.isSafeInteger(x.chapterCount)||
   x.chapterCount<1||x.chapterCount>160)
   throw Error('emulator-source-epoch-invalid');
  // sourceEpoch is the per-story monotonic operation cursor in this rehearsal.
  return Object.freeze({storyId,ownerUid:x.ownerUid,sourceEpoch:x.sourceEpoch,
   sourceHash:x.sourceHash,chapterCount:x.chapterCount,
   operationHighwater:x.sourceEpoch});
 }
 return Object.freeze({applyVerifiedWrite,readSourceEpoch});
}
