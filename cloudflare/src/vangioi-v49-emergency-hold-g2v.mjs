// G2V: LOCAL Firestore Emulator emergency-hide and recovery-review rehearsal.
// No legal notice issuing, live authoring, reviewer roles or public endpoint.
import {hashV49DraftSnapshot} from './vangioi-v49-draft-integrity-g2n.mjs';
import {assertG2TPublishAuthority}
 from './vangioi-v49-emulator-publish-g2t.mjs';

export const G2V_PROJECT='demo-vangioi-g2v';
export const G2V_HOST='127.0.0.1:18088';
const id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(x);
const uid=x=>typeof x==='string'&&x.length>0&&x.length<=128&&!/[\p{C}]/u.test(x);
const epoch=x=>Number.isSafeInteger(x)&&x>=1&&x<Number.MAX_SAFE_INTEGER;
const hash=x=>typeof x==='string'&&/^sha256-[a-f0-9]{64}$/.test(x);
const uuid=x=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const reasons=new Set(['urgent-rights-hold','suspected-rights-breach','authority-sync-unknown']);

export function assertG2VEmulator({emulatorHost,projectId,
 credentialPath=null,activeProjectId=null}={}){
 if(emulatorHost!==G2V_HOST||projectId!==G2V_PROJECT||
  credentialPath!==null&&credentialPath!==''||
  activeProjectId!==null&&activeProjectId!==''&&activeProjectId!==G2V_PROJECT)
  throw new TypeError('G2V refuses nonlocal/cross-project Firestore');
 return Object.freeze({projectId,emulatorHost,emulatorOnly:true});
}
const validDual=a=>uid(a?.operatorUid)&&uid(a?.rightsOfficerUid)&&
 a.operatorUid!==a.rightsOfficerUid&&a.authorized===true;

/**
 * Emergency HIDING may proceed even when source epoch, permit projection,
 * notice or chapter metadata is MISSING/CORRUPT. It requires a synthetic
 * server-verified dual authorization scoped to the exact story and case.
 * No attempt to invent/repair a broken epoch: record unverified in hold.
 *
 * Recovery NEVER republishes: only clears a hold for further review after
 * separate signoff, valid source full hash and a renewed G2T authority record.
 */
export function createG2VEmergencyRehearsal({firestore,emulatorHost,
 credentialPath=null,activeProjectId=null,verifyEmergency,verifyRecovery,
 now=Date.now}={}){
 assertG2VEmulator({emulatorHost,projectId:firestore?.projectId,
  credentialPath,activeProjectId});
 if(typeof firestore?.collection!=='function'||
  typeof firestore?.runTransaction!=='function'||
  typeof verifyEmergency!=='function'||typeof verifyRecovery!=='function'||
  typeof now!=='function')
  throw new TypeError('G2V requires two independent trusted host decisions');
 const books=firestore.collection('epub_stories_v49');
 const epochs=firestore.collection('vg_fixture_v49_epochs_g2r');
 const authorities=firestore.collection('vg_fixture_v49_publish_authority_g2t');
 const holds=firestore.collection('vg_fixture_v49_emergency_holds_g2v');
 const clearances=firestore.collection('vg_fixture_v49_recovery_clearances_g2v');
 const ops=firestore.collection('vg_fixture_v49_emergency_ops_g2v');

 async function emergencyHide(request,{storyId,operationId}={}){
  if(!id(storyId)||!uuid(operationId))
   throw Error('emulator-emergency-invalid-command');
  let approval;
  try{approval=await verifyEmergency(request,{storyId});}catch{
   throw Error('emulator-emergency-dual-approval-required');
  }
  if(!validDual(approval)||approval.storyId!==storyId||
   !id(approval.caseId)||!reasons.has(approval.reason))
   throw Error('emulator-emergency-dual-approval-required');

  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),epochRef=epochs.doc(storyId),
    holdRef=holds.doc(storyId),opRef=ops.doc(operationId);
   const [bookDoc,epochDoc,holdDoc,opDoc]=await Promise.all([
    tx.get(bookRef),tx.get(epochRef),tx.get(holdRef),tx.get(opRef)]);
   if(opDoc.exists)throw Error('emulator-emergency-operation-replay');
   if(holdDoc.exists)throw Error('emulator-emergency-existing-hold');
   if(!bookDoc.exists)throw Error('emulator-emergency-book-unavailable');
   const book=bookDoc.data();
   if(book?.id!==storyId||book.status!=='published'||!uid(book.ownerUid))
    throw Error('emulator-emergency-not-public');
   const record=epochDoc.exists?epochDoc.data():null;
   // Structural checks ONLY: emergency path deliberately does not read full
   // chapters; therefore this is NOT source-hash attestation.
   const epochUsable=!!record&&record.storyId===storyId&&
    record.ownerUid===book.ownerUid&&epoch(record.sourceEpoch)&&
    epoch(record.sourceEpoch+1)&&hash(record.sourceHash);
   const nextEpoch=epochUsable?record.sourceEpoch+1:null;
   const stamp=new Date(now()).toISOString();
   const hidden={...book,status:'draft',updatedAt:stamp};
   delete hidden.publishedAt;
   tx.set(bookRef,hidden);
   if(epochUsable)tx.update(epochRef,{sourceEpoch:nextEpoch});
   tx.create(holdRef,{storyId,ownerUid:book.ownerUid,status:'held',
    holdRevision:1,caseId:approval.caseId,reason:approval.reason,
    operatorUid:approval.operatorUid,rightsOfficerUid:approval.rightsOfficerUid,
    sourceEpochRecordUsable:epochUsable,sourceEpochAttested:false,
    sourceEpochAfter:nextEpoch,
    sourceHashObserved:epochUsable?record.sourceHash:null,
    createdAt:stamp});
   tx.create(opRef,{storyId,kind:'g2v-emergency-hide',
    caseId:approval.caseId,reason:approval.reason,
    operatorUid:approval.operatorUid,rightsOfficerUid:approval.rightsOfficerUid,
    sourceEpochRecordUsable:epochUsable,sourceEpochAttested:false,
    sourceEpochAfter:nextEpoch});
   return Object.freeze({ok:true,storyId,emulatorHidden:true,
    sourceEpochRecordUsable:epochUsable,sourceEpochAttested:false,
    sourceEpochAfter:nextEpoch,
    productionAuthorized:false,emulatorOnly:true});
  },{maxAttempts:5});
 }

 async function recoveryReview(request,{storyId,expectedHoldRevision,
  expectedAuthorityRevision,operationId}={}){
  if(!id(storyId)||!epoch(expectedHoldRevision)||
   !epoch(expectedAuthorityRevision)||!uuid(operationId))
   throw Error('emulator-recovery-invalid-command');
  let signoff;
  try{signoff=await verifyRecovery(request,{storyId});}catch{
   throw Error('emulator-recovery-dual-approval-required');
  }
  if(!validDual(signoff)||signoff.storyId!==storyId||
   !uid(signoff.reviewerUid)||signoff.reviewerUid===signoff.operatorUid||
   signoff.reviewerUid===signoff.rightsOfficerUid||!id(signoff.caseId))
   throw Error('emulator-recovery-dual-approval-required');

  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),epochRef=epochs.doc(storyId),
    holdRef=holds.doc(storyId),authorityRef=authorities.doc(storyId),
    clearanceRef=clearances.doc(storyId),opRef=ops.doc(operationId);
   const [b,e,h,a,c,o]=await Promise.all([tx.get(bookRef),tx.get(epochRef),
    tx.get(holdRef),tx.get(authorityRef),tx.get(clearanceRef),tx.get(opRef)]);
   if(o.exists)throw Error('emulator-recovery-operation-replay');
   if(!b.exists||!e.exists||!h.exists||!a.exists||!c.exists)
    throw Error('emulator-recovery-evidence-unavailable');
   const book=b.data(),source=e.data(),hold=h.data(),
    authority=a.data(),clearance=c.data();
   if(book?.id!==storyId||book.status!=='draft'||!uid(book.ownerUid)||
    hold.storyId!==storyId||hold.ownerUid!==book.ownerUid||
    hold.status!=='held'||hold.holdRevision!==expectedHoldRevision||
    hold.caseId!==signoff.caseId)
    throw Error('emulator-recovery-hold-conflict');
   if(source?.storyId!==storyId||source.ownerUid!==book.ownerUid||
    !epoch(source.sourceEpoch)||!hash(source.sourceHash)||
    authority?.status!=='ready'||authority?.authorityRevision!==expectedAuthorityRevision)
    throw Error('emulator-recovery-source-unverified');
   if(clearance?.storyId!==storyId||clearance.caseId!==hold.caseId||
    clearance.status!=='approved'||clearance.sourceEpoch!==source.sourceEpoch||
    clearance.sourceHash!==source.sourceHash||
    clearance.authorityRevision!==expectedAuthorityRevision||
    clearance.operatorUid!==signoff.operatorUid||
    clearance.rightsOfficerUid!==signoff.rightsOfficerUid||
    clearance.reviewerUid!==signoff.reviewerUid)
    throw Error('emulator-recovery-clearance-conflict');
   const chapters=await tx.get(bookRef.collection('chapters'));
   if(!Array.isArray(book.chapterIndex)||chapters.size!==book.chapterCount)
    throw Error('emulator-recovery-source-unverified');
   const byId=new Map(chapters.docs.map(doc=>[doc.id,doc.data()]));
   const snapshot={book,chapters:book.chapterIndex.map(x=>byId.get(x.id))};
   let proof;
   try{proof=await hashV49DraftSnapshot(snapshot,{storyId});}catch{
    throw Error('emulator-recovery-source-unverified');
   }
   if(proof.sourceHash!==source.sourceHash)
    throw Error('emulator-recovery-source-unverified');
   try{assertG2TPublishAuthority(authority,{
    storyId,source:proof,epoch:source,
    expectedRevision:expectedAuthorityRevision,now:now()});}catch{
    throw Error('emulator-recovery-authority-conflict');
   }
   tx.update(holdRef,{status:'review-ready',holdRevision:expectedHoldRevision+1});
   tx.update(clearanceRef,{status:'consumed'});
   tx.create(opRef,{storyId,kind:'g2v-recovery-review',
    caseId:hold.caseId,actorUid:signoff.operatorUid,
    sourceEpoch:source.sourceEpoch,sourceHash:proof.sourceHash,
    authorityRevision:expectedAuthorityRevision});
   // IMPORTANT: no book.status='published' and no publishedAt here.
   return Object.freeze({ok:true,storyId,reviewReady:true,
    emulatorHidden:true,canRepublish:false,productionAuthorized:false,
    emulatorOnly:true});
  },{maxAttempts:5});
 }

 /**
  * G2Y: re-assert an emergency hold with a NEW case after the previous hold
  * was reviewed (or an independent incident occurs while it is still held).
  * A stale clearance cannot authorize this new case. The book never becomes
  * public; if a legacy privileged writer leaked it, hide it in this same tx.
  * Historical cases are immutable local-emulator evidence, not legal records.
  */
 async function reassertEmergencyHold(request,{storyId,expectedHoldRevision,
  operationId}={}){
  if(!id(storyId)||!epoch(expectedHoldRevision)||!uuid(operationId))
   throw Error('emulator-rehold-invalid-command');
  let approval;
  try{approval=await verifyEmergency(request,{storyId,reassert:true});}catch{
   throw Error('emulator-rehold-dual-approval-required');
  }
  if(!validDual(approval)||approval.storyId!==storyId||
   !id(approval.caseId)||!reasons.has(approval.reason))
   throw Error('emulator-rehold-dual-approval-required');

  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),holdRef=holds.doc(storyId),
    epochRef=epochs.doc(storyId),clearanceRef=clearances.doc(storyId),
    opRef=ops.doc(operationId);
   const [b,h,e,c,o]=await Promise.all([tx.get(bookRef),tx.get(holdRef),
    tx.get(epochRef),tx.get(clearanceRef),tx.get(opRef)]);
   if(o.exists)throw Error('emulator-rehold-operation-replay');
   if(!b.exists||!h.exists)throw Error('emulator-rehold-evidence-unavailable');
   const book=b.data(),hold=h.data();
   if(book?.id!==storyId||!uid(book.ownerUid)||
    !['draft','published'].includes(book.status)||
    hold?.storyId!==storyId||hold.ownerUid!==book.ownerUid||
    !['held','review-ready'].includes(hold.status)||
    hold.holdRevision!==expectedHoldRevision||
    !epoch(hold.holdRevision+1)||!id(hold.caseId))
    throw Error('emulator-rehold-hold-conflict');
   if(hold.caseId===approval.caseId)
    throw Error('emulator-rehold-case-replay');

   const previousCaseRef=holdRef.collection('cases').doc(hold.caseId),
    newCaseRef=holdRef.collection('cases').doc(approval.caseId);
   const [previousCase,newCase]=await Promise.all([
    tx.get(previousCaseRef),tx.get(newCaseRef)]);
   if(newCase.exists)throw Error('emulator-rehold-case-replay');
   if(previousCase.exists){
    const previous=previousCase.data();
    const caseRevision=hold.status==='review-ready'?
     expectedHoldRevision-1:expectedHoldRevision;
    if(previous?.storyId!==storyId||previous.caseId!==hold.caseId||
     previous.holdRevision!==caseRevision)
     throw Error('emulator-rehold-history-conflict');
   }else if(hold.previousCaseId!==undefined||
    expectedHoldRevision!==(hold.status==='review-ready'?2:1)){
    // Only the original G2V generation may lack case history.
    throw Error('emulator-rehold-history-conflict');
   }

   const wasPublic=book.status==='published';
   const record=e.exists?e.data():null;
   const epochUsable=wasPublic&&!!record&&
    record.storyId===storyId&&record.ownerUid===book.ownerUid&&
    epoch(record.sourceEpoch)&&epoch(record.sourceEpoch+1)&&
    hash(record.sourceHash);
   const nextEpoch=epochUsable?record.sourceEpoch+1:null;
   const nextRevision=expectedHoldRevision+1;
   const stamp=new Date(now()).toISOString();
   if(!previousCase.exists){
    // A single G2V hold predates the G2Y case ledger; make this explicit.
    tx.create(previousCaseRef,{storyId,caseId:hold.caseId,
     holdRevision:expectedHoldRevision,kind:'g2y-legacy-baseline',
     backfilledFromHold:true,sourceAttested:false});
   }
   tx.create(newCaseRef,{storyId,caseId:approval.caseId,
    holdRevision:nextRevision,previousCaseId:hold.caseId,
    kind:'g2y-repeat-emergency-hold',reason:approval.reason,
    operatorUid:approval.operatorUid,rightsOfficerUid:approval.rightsOfficerUid,
    wasPublic,sourceEpochRecordUsable:epochUsable,
    sourceEpochAttested:false,sourceEpochAfter:nextEpoch,createdAt:stamp});
   if(wasPublic){
    const hidden={...book,status:'draft',updatedAt:stamp};
    delete hidden.publishedAt;
    tx.set(bookRef,hidden);
    if(epochUsable)tx.update(epochRef,{sourceEpoch:nextEpoch});
   }
   if(c.exists)tx.update(clearanceRef,{status:'superseded',
    invalidatedByHoldRevision:nextRevision});
   tx.update(holdRef,{status:'held',holdRevision:nextRevision,
    previousCaseId:hold.caseId,caseId:approval.caseId,
    reason:approval.reason,operatorUid:approval.operatorUid,
    rightsOfficerUid:approval.rightsOfficerUid,reheldAt:stamp,
    sourceEpochRecordUsable:epochUsable,sourceEpochAttested:false,
    sourceEpochAfter:nextEpoch,
    sourceHashObserved:epochUsable?record.sourceHash:null});
   tx.create(opRef,{storyId,kind:'g2y-repeat-emergency-hold',
    previousCaseId:hold.caseId,caseId:approval.caseId,
    holdRevision:nextRevision,wasPublic,
    operatorUid:approval.operatorUid,rightsOfficerUid:approval.rightsOfficerUid,
    sourceEpochRecordUsable:epochUsable,sourceEpochAttested:false,
    sourceEpochAfter:nextEpoch});
   return Object.freeze({ok:true,storyId,emulatorHidden:true,
    holdRevision:nextRevision,caseId:approval.caseId,
    wasPublic,sourceEpochAttested:false,sourceEpochAfter:nextEpoch,
    canRepublish:false,productionAuthorized:false,emulatorOnly:true});
  },{maxAttempts:5});
 }
 return Object.freeze({emergencyHide,recoveryReview,reassertEmergencyHold});
}
