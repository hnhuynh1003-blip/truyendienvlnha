/* DUDU V25 — private producer-to-ledger attestation.
 * This verifier authenticates the provenance of a receipt, NOT whether
 * someone actually read a chapter. Only separately audited server writers
 * may hold the approval/progress keys or create these receipts.
 */
const enc=new TextEncoder();
const dec=new TextDecoder('utf-8',{fatal:true});
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const HEX=/^[a-f0-9]{64}$/;
export const V25_MAX_RECEIPT_BYTES=2048;
export const V25_MAX_CLOCK_SKEW_MS=5*60*1000;
const SHAPES=Object.freeze({
  APPROVAL_PUBLISHED:['eventId','kind','issuedAt','storyId','milestoneId',
    'revision','frameId','chapterId','npcId','minimumTrust','reviewedAt'],
  APPROVAL_REVOKED:['eventId','kind','issuedAt','storyId','milestoneId',
    'revision','reviewedAt'],
  CHAPTER_VERIFIED:['eventId','kind','issuedAt','uid','storyId','chapterId',
    'completedAt'],
  BOND_VERIFIED:['eventId','kind','issuedAt','uid','storyId','npcId',
    'milestoneId','trust','verifiedAt'],
  MILESTONE_COMPLETED:['eventId','kind','issuedAt','uid','storyId',
    'milestoneId','approvalRevision','evidenceId','completedAt']
});
export function receiptRole(kind){
  return kind==='APPROVAL_PUBLISHED'||kind==='APPROVAL_REVOKED'?
    'approval':Object.hasOwn(SHAPES,kind)?'progress':null;
}
const validId=v=>typeof v==='string'&&ID.test(v);
const validTime=(v,issuedAt)=>Number.isSafeInteger(v)&&v>0&&v<=issuedAt;
const ownShape=(record,names)=>Object.keys(record).length===names.length&&
  Object.keys(record).every(k=>names.includes(k));
export function normalizeV25Receipt(value,now){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const expected=SHAPES[value.kind];
  if(!expected||!ownShape(value,expected)||
    !validId(value.eventId)||!Number.isSafeInteger(now)||
    !Number.isSafeInteger(value.issuedAt)||
    Math.abs(value.issuedAt-now)>V25_MAX_CLOCK_SKEW_MS)return null;
  if(!validId(value.storyId))return null;
  if(value.kind.startsWith('APPROVAL_')){
    if(!validId(value.milestoneId)||
      !Number.isSafeInteger(value.revision)||value.revision<1||
      !validTime(value.reviewedAt,value.issuedAt))return null;
    if(value.kind==='APPROVAL_PUBLISHED'){
      if(!validId(value.chapterId)||
        !['legend','soulbond'].includes(value.frameId))return null;
      if(value.frameId==='legend'&&
        (value.npcId!==null||value.minimumTrust!==null))return null;
      if(value.frameId==='soulbond'&&
        (!validId(value.npcId)||!Number.isInteger(value.minimumTrust)||
        value.minimumTrust<50||value.minimumTrust>100))return null;
    }
  }else{
    if(!validId(value.uid))return null;
    if(value.kind==='CHAPTER_VERIFIED'&&
      (!validId(value.chapterId)||
        !validTime(value.completedAt,value.issuedAt)))return null;
    if(value.kind==='BOND_VERIFIED'&&
      (!validId(value.npcId)||!validId(value.milestoneId)||
       !Number.isInteger(value.trust)||value.trust<0||value.trust>100||
       !validTime(value.verifiedAt,value.issuedAt)))return null;
    if(value.kind==='MILESTONE_COMPLETED'&&
      (!validId(value.milestoneId)||!validId(value.evidenceId)||
       !Number.isSafeInteger(value.approvalRevision)||
       value.approvalRevision<1||
       !validTime(value.completedAt,value.issuedAt)))return null;
  }
  return Object.freeze({...value});
}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
/* The API passes distinct, secret backend-only approval/progress keys.
 * No keys in wrangler.toml, browser source, or repository.
 * Reject padded/non-canonical signatures, unknown fields, and stale receipts.
 */
export async function verifyV25Receipt({
  rawBytes,timestamp,signature,secrets,now
}={}){
  if(!(rawBytes instanceof Uint8Array)||
    rawBytes.length<20||rawBytes.length>V25_MAX_RECEIPT_BYTES||
    typeof timestamp!=='string'||!/^\d{13}$/.test(timestamp)||
    !Number.isSafeInteger(now)||
    Math.abs(Number(timestamp)-now)>V25_MAX_CLOCK_SKEW_MS||
    typeof signature!=='string'||!HEX.test(signature)||
    !secrets||typeof secrets!=='object'||!globalThis.crypto?.subtle)
    return null;
  let candidate;
  try{candidate=JSON.parse(dec.decode(rawBytes));}
  catch(_){return null;}
  const event=normalizeV25Receipt(candidate,now);
  if(!event)return null;
  const role=receiptRole(event.kind),secret=secrets[role];
  if(typeof secret!=='string'||secret.length<32||
     secrets.approval===secrets.progress)return null;
  const cryptoApi=globalThis.crypto.subtle;
  const key=await cryptoApi.importKey('raw',enc.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const message=enc.encode(timestamp+'.'+dec.decode(rawBytes));
  const expected=new Uint8Array(await cryptoApi.sign('HMAC',key,message));
  let mismatch=0;
  for(let i=0;i<32;i++)
    mismatch|=expected[i]^Number.parseInt(signature.slice(i*2,i*2+2),16);
  if(mismatch!==0)return null;
  const hash=new Uint8Array(await cryptoApi.digest('SHA-256',rawBytes));
  // Only these two fields may cross the attestation/ledger boundary.
  return Object.freeze({event,digest:hex(hash)});
}
