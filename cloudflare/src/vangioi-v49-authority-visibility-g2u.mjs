// G2U: fixture-only authority freshness inspection and post-publication
// visibility suspension. NEVER connect to SQLite/Firebase production or a
// live public route; no legally effective revocation decision is made here.

export const G2U_PROJECT='demo-vangioi-g2u';
export const G2U_HOST='127.0.0.1:18087';
const id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/.test(x);
const uid=x=>typeof x==='string'&&x.length>=1&&x.length<=128&&
 !/[\p{C}]/u.test(x);
const hash=x=>typeof x==='string'&&/^sha256-[a-f0-9]{64}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER;
const epoch=x=>seq(x)&&x>=1;
const uuid=x=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.getPrototypeOf(x)===Object.prototype;
const deny=code=>Object.freeze({ok:false,code});

export function assertG2UEmulator({emulatorHost,projectId,
 credentialPath=null,activeProjectId=null}={}){
 if(emulatorHost!==G2U_HOST||projectId!==G2U_PROJECT||
  credentialPath!==null&&credentialPath!==''||
  activeProjectId!==null&&activeProjectId!==''&&activeProjectId!==G2U_PROJECT)
  throw new TypeError('G2U refuses nonlocal/cross-project Firestore');
 return Object.freeze({projectId,emulatorHost,emulatorOnly:true});
}

/**
 * Observation ONLY: compare a trusted SQL-origin authority high-water/digest
 * twice around one coherent projected snapshot. Cannot freeze source SQL or
 * establish a cross-database commit fence. Never returns publish permission.
 */
export function createG2UAuthorityFreshnessAudit({projectId=G2U_PROJECT,
 verifyOperator,readAuthorityHead,readProjectedAuthority,now=Date.now,
 maxAgeMs=60000}={}){
 if(projectId!==G2U_PROJECT||[verifyOperator,readAuthorityHead,
  readProjectedAuthority,now].some(f=>typeof f!=='function')||
  !Number.isSafeInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>300000)
  throw new TypeError('G2U requires trusted fixture source/projection readers');
 return async function inspect(request){
  try{
   const operator=await verifyOperator(request);
   if(!uid(operator?.uid)||operator.operator!==true)return deny('forbidden');
   const first=await readAuthorityHead({projectId});
   if(!plain(first)||first.projectId!==projectId||!seq(first.head)||
    !hash(first.digest))return deny('authority-unavailable');
   const projected=await readProjectedAuthority({projectId});
   if(!plain(projected)||projected.projectId!==projectId||
    !seq(projected.checkpoint)||!hash(projected.digest)||
    !Number.isSafeInteger(projected.observedAt))
    return deny('projection-invalid');
   const final=await readAuthorityHead({projectId});
   if(!plain(final)||final.projectId!==projectId||
    first.head!==final.head||first.digest!==final.digest)
    return deny('authority-changed');
   if(projected.checkpoint<final.head)return deny('checkpoint-lag');
   if(projected.checkpoint>final.head)return deny('checkpoint-ahead');
   if(projected.digest!==final.digest)return deny('projection-mismatch');
   const time=now();
   if(!Number.isSafeInteger(time)||projected.observedAt>time||
    time-projected.observedAt>maxAgeMs)return deny('projection-stale');
   return Object.freeze({ok:true,checkpoint:final.head,
    observedAt:projected.observedAt,fixtureAuditOnly:true,canPublish:false,
    preventsUnobservedRace:false,sqliteFirestoreAtomic:false});
  }catch{return deny('authority-audit-unavailable');}
 };
}

/**
 * A SERVER-OWNED, already-verified synthetic notice can hide a V49 published
 * book. The same transaction updates book visibility, epoch, authority, notice
 * and immutable operation record. It does NOT run against real legal notices.
 */
export function createG2UEmulatorSuspender({firestore,emulatorHost,
 credentialPath=null,activeProjectId=null,verifyOperator,now=Date.now}={}){
 assertG2UEmulator({emulatorHost,projectId:firestore?.projectId,
  credentialPath,activeProjectId});
 if(typeof firestore?.collection!=='function'||
  typeof firestore?.runTransaction!=='function'||
  typeof verifyOperator!=='function'||typeof now!=='function')
  throw new TypeError('G2U requires a trusted emulator suspension host');

 const books=firestore.collection('epub_stories_v49');
 const epochs=firestore.collection('vg_fixture_v49_epochs_g2r');
 const authorities=firestore.collection('vg_fixture_v49_publish_authority_g2t');
 const notices=firestore.collection('vg_fixture_v49_takedown_notices_g2u');
 const ops=firestore.collection('vg_fixture_v49_epoch_ops_g2r');

 async function rehearseSuspend(request,{storyId,expectedEpoch,
  expectedAuthorityRevision,expectedNoticeRevision,operationId}={}){
  if(!id(storyId)||!epoch(expectedEpoch)||!epoch(expectedAuthorityRevision)||
   !epoch(expectedNoticeRevision)||!uuid(operationId))
   throw Error('emulator-suspend-invalid-command');
  let actor;
  try{actor=await verifyOperator(request);}catch{
   throw Error('emulator-suspend-operator-required');
  }
  if(!uid(actor?.uid)||actor.operator!==true)
   throw Error('emulator-suspend-operator-required');

  return firestore.runTransaction(async tx=>{
   const bookRef=books.doc(storyId),epochRef=epochs.doc(storyId),
    authorityRef=authorities.doc(storyId),noticeRef=notices.doc(storyId),
    operationRef=ops.doc(operationId);
   const [b,e,a,n,o]=await Promise.all([tx.get(bookRef),tx.get(epochRef),
    tx.get(authorityRef),tx.get(noticeRef),tx.get(operationRef)]);
   if(o.exists)throw Error('emulator-suspend-operation-replay');
   if(!b.exists||!e.exists||!a.exists||!n.exists)
    throw Error('emulator-suspend-record-unavailable');
   const book=b.data(),source=e.data(),authority=a.data(),notice=n.data();
   if(book?.id!==storyId||book.status!=='published'||!uid(book.ownerUid)||
    typeof book.publishedAt!=='string')
    throw Error('emulator-suspend-not-published');
   if(source?.storyId!==storyId||source.ownerUid!==book.ownerUid||
    !epoch(source.sourceEpoch)||source.sourceEpoch!==expectedEpoch||
    !hash(source.sourceHash))
    throw Error('emulator-suspend-source-epoch-conflict');
   if(authority?.storyId!==storyId||
    authority.ownerUid!==book.ownerUid||
    authority.status!=='consumed'||!epoch(authority.authorityRevision)||
    authority.authorityRevision!==expectedAuthorityRevision||
    authority.sourceHash!==source.sourceHash)
    throw Error('emulator-suspend-authority-conflict');
   if(notice?.storyId!==storyId||notice.status!=='active'||
    !epoch(notice.revision)||notice.revision!==expectedNoticeRevision||
    notice.authorityRevision!==expectedAuthorityRevision||
    notice.sourceEpoch!==expectedEpoch||notice.sourceHash!==source.sourceHash||
    !seq(notice.sourceCheckpoint)||!['permit-revoked','legal-hold'].includes(notice.reason))
    throw Error('emulator-suspend-notice-conflict');
   if((notice.reason==='permit-revoked'&&
     authority.permit?.status!=='revoked')||
    (notice.reason==='legal-hold'&&authority.holdStatus!=='active'))
    throw Error('emulator-suspend-notice-conflict');
   const nextEpoch=expectedEpoch+1;
   if(!epoch(nextEpoch)||!epoch(expectedAuthorityRevision+1))
    throw Error('emulator-suspend-epoch-exhausted');
   const stamp=new Date(now()).toISOString();
   const hidden={...book,status:'draft',updatedAt:stamp};
   delete hidden.publishedAt;
   tx.set(bookRef,hidden);
   tx.update(epochRef,{sourceEpoch:nextEpoch});
   tx.update(authorityRef,{status:'suspended',
    authorityRevision:expectedAuthorityRevision+1});
   tx.update(noticeRef,{status:'consumed'});
   tx.create(operationRef,{storyId,actorUid:actor.uid,sourceEpoch:nextEpoch,
    sourceHash:source.sourceHash,kind:'g2u-emulator-suspend',
    authorityRevision:expectedAuthorityRevision,
    sourceCheckpoint:notice.sourceCheckpoint,reason:notice.reason});
   return Object.freeze({ok:true,storyId,sourceEpoch:nextEpoch,
    emulatorHidden:true,productionAuthorized:false,emulatorOnly:true});
  },{maxAttempts:5});
 }
 return Object.freeze({rehearseSuspend});
}
