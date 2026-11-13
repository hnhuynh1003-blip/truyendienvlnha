// G2E: signed provenance envelope for G2D fixture backups. Internal host only.
// Not a live key manager, restore endpoint, authority, publisher or role grant.
import {copyAuthoringJson} from './vangioi-authoring.mjs';

const FORMAT='permit-fixture-seal-1';
const DAY=86400000;
const id=v=>typeof v==='string'&&/^[a-z0-9-]{1,64}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const millis=v=>Number.isSafeInteger(v)&&v>=0&&v<Number.MAX_SAFE_INTEGER;
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===[...fields].sort().join(',');
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=s=>Uint8Array.from(s.match(/../g),part=>parseInt(part,16));
const encoder=new TextEncoder();

export function createFixturePermitBackupProvenance({recovery,projectId,environment='fixture',
 issuerId,keyId,secretKey,now=()=>Date.now(),maxAgeMs=7*DAY,maxFutureSkewMs=60000,
 onVerifiedSeal=null}={}){
 if(typeof recovery?.createBackup!=='function'||typeof recovery?.restoreBackup!=='function'||
  (onVerifiedSeal!==null&&(typeof onVerifiedSeal!=='function'||typeof recovery?.verifyBackup!=='function'))||
  !id(projectId)||environment!=='fixture'||!id(issuerId)||!id(keyId)||
  !(secretKey instanceof Uint8Array)||secretKey.byteLength<32||secretKey.byteLength>128||
  typeof now!=='function'||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||maxAgeMs>30*DAY||
  !Number.isSafeInteger(maxFutureSkewMs)||maxFutureSkewMs<0||maxFutureSkewMs>5*60000)
  throw new TypeError('G2E requires trusted fixture host, issuer and independent signing key');

 // Import a private, non-extractable crypto key. Keep the secret out of backup
 // objects, receipts and error messages. Never allow a client to choose it.
 const keyPromise=crypto.subtle.importKey('raw',new Uint8Array(secretKey),
  {name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const claims=(sealed)=>({format:FORMAT,projectId,environment:'fixture',issuerId,keyId,
  createdAt:sealed.createdAt,nonce:sealed.nonce,backupDigest:sealed.backup.digest});

 function checkClock(){
  const current=now();
  if(!millis(current))throw Error('fixture-seal-clock-unavailable');
  return current;
 }

 async function createSealedBackup(){
  const backup=await recovery.createBackup();
  if(!only(backup,['format','projectId','environment','checkpoint','entries','events','digest'])||
   backup.format!=='permit-fixture-backup-1'||backup.projectId!==projectId||
   backup.environment!=='fixture'||!sha(backup.digest))throw Error('fixture-backup-unavailable');
  const createdAt=checkClock(),nonce=crypto.randomUUID();
  const sealed={format:FORMAT,projectId,environment:'fixture',issuerId,keyId,
   createdAt,nonce,backup};
  const signature=await crypto.subtle.sign('HMAC',await keyPromise,
   encoder.encode(JSON.stringify(claims(sealed))));
  return {...sealed,mac:hex(signature)};
 }

 async function restoreSealedBackup(input){
  // Snapshot all caller-owned data before the first await. The envelope and
  // backup must not change while WebCrypto verifies the signed digest.
  let sealed;
  try{sealed=copyAuthoringJson(input);}catch{throw Error('invalid-fixture-seal');}
  if(!only(sealed,['format','projectId','environment','issuerId','keyId',
   'createdAt','nonce','backup','mac'])||sealed.format!==FORMAT||
   sealed.projectId!==projectId||sealed.environment!=='fixture'||
   sealed.issuerId!==issuerId||sealed.keyId!==keyId||
   !millis(sealed.createdAt)||!uuid(sealed.nonce)||!sha(sealed.mac)||
   !sealed.backup||!sha(sealed.backup.digest)||
   sealed.backup.projectId!==projectId||sealed.backup.environment!=='fixture')
   throw Error('invalid-fixture-seal');
  const current=checkClock();
  if(sealed.createdAt>current+maxFutureSkewMs)throw Error('fixture-seal-from-future');
  if(current-sealed.createdAt>maxAgeMs)throw Error('fixture-seal-expired');
  const valid=await crypto.subtle.verify('HMAC',await keyPromise,fromHex(sealed.mac),
   encoder.encode(JSON.stringify(claims(sealed))));
  if(!valid)throw Error('fixture-seal-authentication-failed');

  if(onVerifiedSeal){
   // G2F: authenticate + check G2D body BEFORE burning the nonce in a
   // separate trusted fixture ledger; never reserve for corrupt client bytes.
   const verified=await recovery.verifyBackup(sealed.backup);
   if(verified.projectId!==projectId||verified.environment!=='fixture'||
    verified.backupDigest!==sealed.backup.digest||!millis(verified.checkpoint))
    throw Error('fixture-seal-unverified-backup');
   await onVerifiedSeal(Object.freeze({projectId,environment:'fixture',issuerId,keyId,
    nonce:sealed.nonce,mac:sealed.mac,createdAt:sealed.createdAt,
    checkpoint:verified.checkpoint,backupDigest:verified.backupDigest}));
  }

  // G2D independently recomputes backup.digest and atomically restores into a
  // fresh fixture only. G2B/G1V/G1Y must still recheck live authority rights.
  return recovery.restoreBackup(sealed.backup);
 }

 return Object.freeze({createSealedBackup,restoreSealedBackup});
}
