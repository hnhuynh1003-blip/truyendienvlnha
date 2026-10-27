// G2W: fixture-only V49 writer fence for ALL operations exposed by this facade.
// This is NOT an Admin SDK interceptor, public endpoint, or production gate.
// Independent privileged writers remain able to bypass it until IAM/cutover.
import {hashV49DraftSnapshot} from './vangioi-v49-draft-integrity-g2n.mjs';
import {assertG2TPublishAuthority} from './vangioi-v49-emulator-publish-g2t.mjs';
import {assertG2VEmulator,G2V_PROJECT,G2V_HOST}
 from './vangioi-v49-emergency-hold-g2v.mjs';

const validId=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(x);
const validUid=x=>typeof x==='string'&&x.length>=1&&x.length<=128&&
 !/[\p{C}]/u.test(x);
const validRevision=x=>Number.isSafeInteger(x)&&x>=1&&x<Number.MAX_SAFE_INTEGER;
const validHash=x=>typeof x==='string'&&/^sha256-[0-9a-f]{64}$/.test(x);
const validOperationId=x=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);

// Any hold document (including an unfamiliar, malformed or review-ready one)
// is an absolute barrier. A review-ready decision is NOT a release grant.
export function assertG2WNoEmergencyHold(holdSnapshot){
 if(!holdSnapshot||typeof holdSnapshot.exists!=='boolean')
  throw Error('emulator-writer-hold-unreadable');
 if(holdSnapshot.exists)throw Error('emulator-writer-emergency-hold');
 return true;
}

/**
 * Registry/facade for local V49 server publish attempts. Both entry points
 * share one transaction gate. A restoration after G2V emergency hold is
 * DISABLED until a separate, multi-party release and repeat-hold design.
 *
 * fixtureBeforeTransaction may mutate only synthetic emulator records and
 * exists to demonstrate authority/hold races before a transaction starts.
 */
export function createG2WGuardedPublisher({firestore,emulatorHost,
 credentialPath=null,activeProjectId=null,verifyPublisher,now=Date.now,
 fixtureBeforeTransaction=async()=>{}}={}){
 assertG2VEmulator({emulatorHost,projectId:firestore?.projectId,
  credentialPath,activeProjectId});
 if(typeof firestore?.collection!=='function'||
  typeof firestore?.runTransaction!=='function'||
  typeof verifyPublisher!=='function'||typeof now!=='function'||
  typeof fixtureBeforeTransaction!=='function')
  throw new TypeError('G2W needs a trusted local publisher host');
 const books=firestore.collection('epub_stories_v49');
 const epochs=firestore.collection('vg_fixture_v49_epochs_g2r');
 const authorities=firestore.collection('vg_fixture_v49_publish_authority_g2t');
 const holds=firestore.collection('vg_fixture_v49_emergency_holds_g2v');
 const ops=firestore.collection('vg_fixture_v49_writer_ops_g2w');

 async function commit(request,{storyId,expectedEpoch,expectedSourceHash,
  expectedAuthorityRevision,operationId}={},intent){
  if(!validId(storyId)||!validRevision(expectedEpoch)||
   !validHash(expectedSourceHash)||!validRevision(expectedAuthorityRevision)||
   !validOperationId(operationId))
   throw Error('emulator-writer-invalid-command');
  let operator;
  try{operator=await verifyPublisher(request,{storyId,intent});}catch{
   throw Error('emulator-writer-publisher-required');
  }
  if(!validUid(operator?.uid)||operator.publisher!==true||
   operator.storyId!==storyId||operator.intent!==intent)
   throw Error('emulator-writer-publisher-required');
  await fixtureBeforeTransaction({storyId,intent,operationId});
  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),epochRef=epochs.doc(storyId),
    authorityRef=authorities.doc(storyId),holdRef=holds.doc(storyId),
    opRef=ops.doc(operationId);
   // Read hold in the SAME serializable transaction as every public write.
   // Absent hold participates in conflict detection if another tx creates it.
   const [b,e,a,h,o]=await Promise.all([tx.get(bookRef),tx.get(epochRef),
    tx.get(authorityRef),tx.get(holdRef),tx.get(opRef)]);
   if(o.exists)throw Error('emulator-writer-operation-replay');
   assertG2WNoEmergencyHold(h);
   // No implicit release simply because G2V cleared its review checklist.
   if(intent==='restore')
    throw Error('emulator-writer-independent-restore-release-required');
   if(!b.exists||!e.exists||!a.exists)
    throw Error('emulator-writer-source-unavailable');
   const book=b.data(),source=e.data();
   if(book?.id!==storyId||book.status!=='draft'||
    !Array.isArray(book.chapterIndex)||book.chapterIndex.length<1||
    book.chapterIndex.length>160||book.chapterCount!==book.chapterIndex.length)
    throw Error('emulator-writer-source-unavailable');
   if(source?.storyId!==storyId||source.ownerUid!==book.ownerUid||
    !validRevision(source.sourceEpoch)||source.sourceEpoch!==expectedEpoch||
    source.sourceHash!==expectedSourceHash||
    source.chapterCount!==book.chapterCount)
    throw Error('emulator-writer-source-epoch-conflict');
   const chapters=await tx.get(bookRef.collection('chapters'));
   if(chapters.size!==book.chapterCount)
    throw Error('emulator-writer-chapters-conflict');
   const byId=new Map(chapters.docs.map(doc=>[doc.id,doc.data()]));
   const snapshot={book,chapters:book.chapterIndex.map(item=>byId.get(item.id))};
   if(snapshot.chapters.some(x=>!x))
    throw Error('emulator-writer-chapters-conflict');
   let proof;
   try{proof=await hashV49DraftSnapshot(snapshot,{storyId});}catch{
    throw Error('emulator-writer-chapters-conflict');
   }
   if(proof.sourceHash!==source.sourceHash||
    proof.ownerUid!==source.ownerUid||proof.chapterCount!==source.chapterCount)
    throw Error('emulator-writer-source-epoch-conflict');
   let approval;
   try{approval=assertG2TPublishAuthority(a.data(),{
    storyId,source:proof,epoch:source,
    expectedRevision:expectedAuthorityRevision,now:now()});}catch{
    throw Error('emulator-writer-authority-conflict');
   }
   const nextEpoch=source.sourceEpoch+1;
   if(!validRevision(nextEpoch))throw Error('emulator-writer-epoch-exhausted');
   const stamp=new Date(now()).toISOString();
   tx.update(bookRef,{status:'published',publishedAt:stamp,updatedAt:stamp});
   tx.update(epochRef,{sourceEpoch:nextEpoch});
   tx.update(authorityRef,{status:'consumed',
    authorityRevision:expectedAuthorityRevision+1});
   tx.create(opRef,{storyId,kind:'g2w-guarded-emulator-publish',
    sourceEpoch:nextEpoch,sourceHash:proof.sourceHash,
    publisherUid:operator.uid,authorityRevision:expectedAuthorityRevision,
    holdCheckedAbsent:true,...approval});
   return Object.freeze({ok:true,storyId,emulatorPublished:true,
    sourceEpoch:nextEpoch,holdCheckedAbsent:true,
    productionAuthorized:false,emulatorOnly:true});
  },{maxAttempts:5});
 }
 const publishDraft=(request,command)=>commit(request,command,'publish');
 const restoreAfterHold=(request,command)=>commit(request,command,'restore');
 return Object.freeze({publishDraft,restoreAfterHold,
  projectId:G2V_PROJECT,emulatorHost:G2V_HOST,emulatorOnly:true});
}
