// G2T: isolated emulator-only trusted publisher transaction rehearsal.
// Authority is a synthetic server-written Firestore projection, NOT live
// SQLite G1R/G2O or an actual reviewer/publisher grant. Never wire runtime.
import {hashV49DraftSnapshot} from './vangioi-v49-draft-integrity-g2n.mjs';

export const G2T_PROJECT='demo-vangioi-g2t';
export const G2T_HOST='127.0.0.1:18086';
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(value);
const uid=value=>typeof value==='string'&&value.length>=1&&value.length<=128&&
 !/[\p{C}]/u.test(value);
const hash=value=>typeof value==='string'&&/^sha256-[0-9a-f]{64}$/.test(value);
const revision=value=>Number.isSafeInteger(value)&&value>=1&&
 value<Number.MAX_SAFE_INTEGER;
const uuid=value=>typeof value==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 Object.getPrototypeOf(value)===Object.prototype;

export function assertG2TEmulator({emulatorHost,projectId,
 credentialPath=null,activeProjectId=null}={}){
 if(emulatorHost!==G2T_HOST||projectId!==G2T_PROJECT||
  credentialPath!==null&&credentialPath!==''||
  activeProjectId!==null&&activeProjectId!==''&&activeProjectId!==G2T_PROJECT)
  throw new TypeError('G2T refuses nonlocal/cross-project Firestore');
 return Object.freeze({projectId,emulatorHost,emulatorOnly:true});
}

/**
 * Validate a SINGLE server-owned projection copied into the same Emulator
 * transaction domain as source and epoch. The real SQLite source of truth is
 * not mirrored/attested by this rehearsal; no cross-DB atomicity is claimed.
 */
export function assertG2TPublishAuthority(a,{storyId,source,epoch,expectedRevision,now}={}){
 if(!plain(a)||!plain(source)||!plain(epoch)||!id(storyId)||
  !revision(expectedRevision)||!Number.isSafeInteger(now)||now<=0||
  a.storyId!==storyId||a.ownerUid!==source.ownerUid||
  a.sourceEpoch!==epoch.sourceEpoch||a.sourceHash!==source.sourceHash||
  a.chapterCount!==source.chapterCount||a.authorityRevision!==expectedRevision||
  !revision(a.authorityRevision)||a.status!=='ready'||a.holdStatus!=='clear')
  throw Error('emulator-publish-authority-conflict');
 const {permit,pin,assignment,release}=a;
 if(![permit,pin,assignment,release].every(plain)||
  permit.status!=='active'||!revision(permit.revision)||
  permit.ownerUid!==source.ownerUid||permit.sourceHash!==source.sourceHash||
  !Number.isSafeInteger(permit.expiresAt)||permit.expiresAt<=now||
  pin.status!=='active'||!revision(pin.revision)||
  pin.sourceHash!==source.sourceHash||
  assignment.status!=='approved'||!uid(assignment.reviewerUid)||
  assignment.scope!=='v49-draft-inspect'||!revision(assignment.revision)||
  assignment.pinRevision!==pin.revision||
  assignment.sourceHash!==source.sourceHash||
  release.status!=='approved'||!revision(release.revision)||
  release.permitRevision!==permit.revision||
  release.pinRevision!==pin.revision||
  release.assignmentRevision!==assignment.revision||
  release.sourceEpoch!==epoch.sourceEpoch||
  release.sourceHash!==source.sourceHash)
  throw Error('emulator-publish-authority-conflict');
 return Object.freeze({permitRevision:permit.revision,pinRevision:pin.revision,
  assignmentRevision:assignment.revision,releaseRevision:release.revision});
}

/**
 * Only this fixture transaction may convert a synthetic draft to published:
 * source/chapters + epoch + server authority projection are all read in one
 * Firestore transaction; the result updates book, source epoch, authority
 * consumption and an operation receipt atomically.
 *
 * fixtureBeforeTransaction (optional) is injected by TEST HOST only, for a
 * revocation/source edit between actor verification and transaction snapshot.
 * NEVER await a competing Admin write while holding transaction read locks:
 * Firestore Emulator uses pessimistic locks and that would deadlock.
 * Real publish needs a separately authorized server design.
 */
export function createG2TEmulatorPublisher({firestore,emulatorHost,
 credentialPath=null,activeProjectId=null,verifyOperator,
 now=Date.now,fixtureBeforeTransaction=async()=>{}}={}){
 assertG2TEmulator({emulatorHost,projectId:firestore?.projectId,
  credentialPath,activeProjectId});
 if(typeof firestore?.runTransaction!=='function'||
  typeof firestore?.collection!=='function'||
  typeof verifyOperator!=='function'||typeof now!=='function'||
  typeof fixtureBeforeTransaction!=='function')
  throw new TypeError('G2T requires a trusted fixture transaction host');

 const books=firestore.collection('epub_stories_v49');
 const epochs=firestore.collection('vg_fixture_v49_epochs_g2r');
 const ops=firestore.collection('vg_fixture_v49_epoch_ops_g2r');
 const authorities=firestore.collection('vg_fixture_v49_publish_authority_g2t');

 async function rehearsePublish(request,{storyId,expectedEpoch,
  expectedSourceHash,expectedAuthorityRevision,operationId}={}){
  if(!id(storyId)||!revision(expectedEpoch)||!hash(expectedSourceHash)||
   !revision(expectedAuthorityRevision)||!uuid(operationId))
   throw Error('emulator-publish-invalid-command');
  let actor;
  try{actor=await verifyOperator(request);}catch{
   throw Error('emulator-publish-operator-required');
  }
  if(!uid(actor?.uid)||actor.operator!==true)
   throw Error('emulator-publish-operator-required');

  await fixtureBeforeTransaction({storyId,operationId,expectedEpoch});
  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),epochRef=epochs.doc(storyId);
   const authorityRef=authorities.doc(storyId),opRef=ops.doc(operationId);
   const [bookDoc,epochDoc,authorityDoc,opDoc]=await Promise.all([
    tx.get(bookRef),tx.get(epochRef),tx.get(authorityRef),tx.get(opRef)]);
   if(opDoc.exists)throw Error('emulator-publish-operation-replay');
   if(!bookDoc.exists||!epochDoc.exists||!authorityDoc.exists)
    throw Error('emulator-publish-source-unavailable');
   const book=bookDoc.data(),source=epochDoc.data();
   if(book?.id!==storyId||book.status!=='draft'||
    !Array.isArray(book.chapterIndex)||book.chapterIndex.length<1||
    book.chapterIndex.length>160||
    book.chapterCount!==book.chapterIndex.length)
    throw Error('emulator-publish-source-unavailable');
   if(source?.storyId!==storyId||source.ownerUid!==book.ownerUid||
    !revision(source.sourceEpoch)||source.sourceEpoch!==expectedEpoch||
    !hash(source.sourceHash)||source.sourceHash!==expectedSourceHash||
    source.chapterCount!==book.chapterCount)
    throw Error('emulator-publish-source-epoch-conflict');

   // A transactional FULL subcollection query detects missing, extra and
   // duplicate chapter documents, not only the declared chapterIndex refs.
   const chapters=await tx.get(bookRef.collection('chapters'));
   if(chapters.size!==book.chapterCount)
    throw Error('emulator-publish-chapters-conflict');
   const byId=new Map(chapters.docs.map(d=>[d.id,d.data()]));
   const snapshot={book,chapters:book.chapterIndex.map(item=>byId.get(item.id))};
   if(snapshot.chapters.some(c=>!c))
    throw Error('emulator-publish-chapters-conflict');
   let proof;
   try{proof=await hashV49DraftSnapshot(snapshot,{storyId});}catch{
    throw Error('emulator-publish-chapters-conflict');
   }
   if(proof.sourceHash!==source.sourceHash||
    proof.ownerUid!==source.ownerUid||
    proof.chapterCount!==source.chapterCount)
    throw Error('emulator-publish-source-epoch-conflict');
   const approval=assertG2TPublishAuthority(authorityDoc.data(),{
    storyId,source:proof,epoch:source,
    expectedRevision:expectedAuthorityRevision,now:now()});
   const nextEpoch=source.sourceEpoch+1;
   if(!revision(nextEpoch))throw Error('emulator-publish-epoch-exhausted');

   const publishedAt=new Date(now()).toISOString();
   tx.update(bookRef,{status:'published',publishedAt,updatedAt:publishedAt});
   tx.update(epochRef,{sourceEpoch:nextEpoch});
   tx.update(authorityRef,{status:'consumed',
    authorityRevision:expectedAuthorityRevision+1});
   tx.create(opRef,{storyId,sourceEpoch:nextEpoch,sourceHash:proof.sourceHash,
    actorUid:actor.uid,kind:'g2t-emulator-publish',
    authorityRevision:expectedAuthorityRevision,...approval});
   return Object.freeze({ok:true,storyId,sourceEpoch:nextEpoch,
    sourceHash:proof.sourceHash,emulatorPublished:true,
    productionAuthorized:false,emulatorOnly:true});
  },{maxAttempts:5});
 }
 return Object.freeze({rehearsePublish});
}
