/* G1 — PRIVATE verified-reading evidence ledger (staging contract).
 * NOT imported by cloudflare/src/index.mjs. No public route or reward issuer.
 * Only a separately audited, authoritative reading service may sign evidence.
 * HMAC establishes signer provenance, NOT human attention/comprehension.
 * No Firebase / R2 connection or token access in this module.
 */
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const PROOF=/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;
const HEX=/^[a-f0-9]{64}$/;
const MAX_BYTES=2048;
const MAX_WINDOW_MS=300000; // implementation upper bound, NOT approved reward cap
const SIGNATURE_SKEW_MS=300000;
const FIELDS=Object.freeze([
 'version','eventId','proofId','uid','storyId','chapterId',
 'contentRevision','sourceMode','progressEpoch','startedAt',
 'endedAt','verifiedActiveMs','evidenceSource'
]);
const failure=code=>Object.freeze({ok:false,code,awardExp:0,awardTuVi:0});
function validId(value,pattern=ID){
 return typeof value==='string'&&pattern.test(value);
}
function validTime(value){return Number.isSafeInteger(value)&&value>0;}
function normalizeEvidence(raw,now){
 if(typeof raw!=='string')return null;
 let ev;
 try{ev=JSON.parse(raw);}catch{return null;}
 if(!ev||typeof ev!=='object'||Array.isArray(ev)||
    Object.getPrototypeOf(ev)!==Object.prototype||
    Object.keys(ev).length!==FIELDS.length||
    !FIELDS.every(k=>Object.hasOwn(ev,k))||
    raw!==JSON.stringify(ev))return null;
 if(ev.version!==1||!validId(ev.eventId,PROOF)||
    !validId(ev.proofId,PROOF)||!validId(ev.uid)||
    !validId(ev.storyId)||!validId(ev.chapterId)||
    !validId(ev.contentRevision)||
    !['WEB','EPUB_R2'].includes(ev.sourceMode)||
    !Number.isSafeInteger(ev.progressEpoch)||ev.progressEpoch<0||
    ev.progressEpoch>2147483647||ev.evidenceSource!=='STORY_READ_SERVICE'||
    !validTime(ev.startedAt)||!validTime(ev.endedAt)||
    ev.endedAt<=ev.startedAt||
    ev.endedAt-ev.startedAt>MAX_WINDOW_MS||
    // Completed evidence must end at or before the trusted ledger clock.
    // The signature timestamp skew does NOT permit future reading evidence.
    ev.endedAt>now||
    !Number.isSafeInteger(ev.verifiedActiveMs)||
    ev.verifiedActiveMs<1||
    ev.verifiedActiveMs>ev.endedAt-ev.startedAt)return null;
 return Object.freeze(ev);
}
function hex(bytes){
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function unhex(value){
 return new Uint8Array(value.match(/.{2}/g).map(x=>parseInt(x,16)));
}
async function verifyEvidence({rawBytes,timestamp,signature,secret,now}){
 if(!(rawBytes instanceof Uint8Array)||rawBytes.byteLength<2||
    rawBytes.byteLength>MAX_BYTES||
    typeof timestamp!=='string'||!/^\d{13}$/.test(timestamp)||
    typeof signature!=='string'||!HEX.test(signature)||
    !validTime(now)||Math.abs(Number(timestamp)-now)>SIGNATURE_SKEW_MS)
    return null;
 let raw;
 try{raw=decoder.decode(rawBytes);}catch{return null;}
 const ev=normalizeEvidence(raw,now);
 if(!ev||!globalThis.crypto?.subtle)return null;
 try{
  const key=await crypto.subtle.importKey(
   'raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('HMAC',key,unhex(signature),
    encoder.encode(timestamp+'.'+raw));
  if(!ok)return null;
  const digest=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',rawBytes)));
  return {evidence:ev,digest};
 }catch{return null;}
}
const rows=(sql,query,...args)=>sql.exec(query,...args).toArray();
export class G1VerifiedReadingLedger{
 #sql;#transaction;#secret;#now;
 constructor({sql,transactionSync,secret,now=Date.now}={}){
  if(!sql||typeof sql.exec!=='function'||
     typeof transactionSync!=='function'||
     typeof secret!=='string'||secret.length<32||
     typeof now!=='function')
    throw new TypeError('trusted private SQL ledger, writer and HMAC secret required');
  this.#sql=sql;this.#transaction=transactionSync;
  this.#secret=secret;this.#now=now;
  sql.exec('CREATE TABLE IF NOT EXISTS g1_read_windows ('+
   'event_id TEXT PRIMARY KEY,proof_id TEXT NOT NULL UNIQUE,'+
   'digest TEXT NOT NULL,uid TEXT NOT NULL,story_id TEXT NOT NULL,'+
   'chapter_id TEXT NOT NULL,revision TEXT NOT NULL,source_mode TEXT NOT NULL,'+
   'progress_epoch INTEGER NOT NULL,started_at INTEGER NOT NULL,'+
   'ended_at INTEGER NOT NULL,active_ms INTEGER NOT NULL,'+
   'received_at INTEGER NOT NULL)');
  sql.exec('CREATE INDEX IF NOT EXISTS g1_read_windows_scope ON '+
   'g1_read_windows(uid,progress_epoch,started_at,ended_at)');
 }
 async ingestSignedEvidence(envelope={}){
  const now=this.#now();
  if(!validTime(now))return failure('clock-unavailable');
  const signed=await verifyEvidence({...envelope,secret:this.#secret,now});
  if(!signed)return failure('invalid-attestation');
  try{
   return this.#transaction(()=>{
    const ev=signed.evidence,digest=signed.digest;
    const old=rows(this.#sql,
     'SELECT digest FROM g1_read_windows WHERE event_id=?',ev.eventId)[0];
    if(old)return old.digest===digest?
     Object.freeze({ok:true,alreadyProcessed:true,awardExp:0,awardTuVi:0}):
     failure('event-id-reuse');
    // A proof cannot be reissued with a different event or epoch to farm EXP.
    if(rows(this.#sql,
       'SELECT event_id FROM g1_read_windows WHERE proof_id=?',ev.proofId).length)
      return failure('duplicate-proof');
    // Concurrent devices/tabs cannot double-count overlapping verified windows
    // even if their signed proofIds differ. Epoch change is explicitly scoped
    // to an owner-approved fresh start, not a new season.
    if(rows(this.#sql,
       'SELECT event_id FROM g1_read_windows WHERE uid=? AND progress_epoch=? '+
       'AND started_at<? AND ended_at>? LIMIT 1',
       ev.uid,ev.progressEpoch,ev.endedAt,ev.startedAt).length)
      return failure('overlapping-window');
    this.#sql.exec('INSERT INTO g1_read_windows ('+
      'event_id,proof_id,digest,uid,story_id,chapter_id,revision,'+
      'source_mode,progress_epoch,started_at,ended_at,active_ms,received_at) '+
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ev.eventId,ev.proofId,digest,ev.uid,ev.storyId,ev.chapterId,
      ev.contentRevision,ev.sourceMode,ev.progressEpoch,ev.startedAt,
      ev.endedAt,ev.verifiedActiveMs,now);
    // Persist only auditable verified time; no EXP/Tu Vi rules approved.
    return Object.freeze({ok:true,alreadyProcessed:false,
      verifiedActiveMs:ev.verifiedActiveMs,
      progressEpoch:ev.progressEpoch,
      awardExp:0,awardTuVi:0});
   });
  }catch{return failure('ledger-write-unavailable');}
 }
}
export const G1_READING_CONTRACT=Object.freeze({
 version:1,maxEnvelopeBytes:MAX_BYTES,maxWindowMs:MAX_WINDOW_MS,
 signatureSkewMs:SIGNATURE_SKEW_MS,issuerConnected:false,
 rewardIssuerEnabled:false,realFirebaseVerified:false,
 publicApiEnabled:false
});
