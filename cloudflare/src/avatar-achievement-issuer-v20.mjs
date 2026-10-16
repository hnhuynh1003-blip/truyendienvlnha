/* V20 trusted achievement issuer *contract* (not wired to gameplay).
 * A signed event is possible only after an independently trusted reader
 * returns the authoritative, completed and approved achievement record.
 * Do not call with browser-provided records or ship a signing key to clients.
 */
import {SERVER_AWARD_SOURCES} from './player-appearance-rules.mjs';
import {normalizeAwardEvent} from './avatar-award-webhook.mjs';

const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const encoder=new TextEncoder();
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

export async function issueVerifiedFrameEvent({
  uid,frameId,evidenceId,now,loadEvidence,secret,newEventId
}={}){
  if(typeof uid!=='string'||!ID.test(uid)||
     typeof evidenceId!=='string'||!ID.test(evidenceId)||
     !Object.hasOwn(SERVER_AWARD_SOURCES,frameId)||
     !Number.isSafeInteger(now)||now<=0||
     typeof loadEvidence!=='function'||typeof newEventId!=='function'||
     typeof secret!=='string'||secret.length<32)
    return {ok:false,code:'invalid-issuer-configuration'};

  const source=SERVER_AWARD_SOURCES[frameId];
  let evidence;
  try{evidence=await loadEvidence({uid,evidenceId,source});}
  catch(_){return {ok:false,code:'evidence-unavailable'};}
  // "Completed" must come from the trusted server ledger, NEVER a local
  // affinity threshold, client timer, chat text or editable story draft.
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)||
     evidence.uid!==uid||evidence.evidenceId!==evidenceId||
     evidence.source!==source||
     evidence.completed!==true||evidence.approved!==true||
     evidence.serverVerified!==true||
     !Number.isSafeInteger(evidence.completedAt)||
     evidence.completedAt<=0||evidence.completedAt>now)
    return {ok:false,code:'unverified-achievement'};
  // No client-visible issuer exists until an authoritative gameplay ledger
  // implements loadEvidence and is independently audited.
  const eventId=newEventId();
  const event={uid,frameId,source,evidenceId,eventId,occurredAt:evidence.completedAt};
  if(!normalizeAwardEvent(event,now))
    return {ok:false,code:'invalid-event'};
  if(!globalThis.crypto?.subtle)return {ok:false,code:'crypto-unavailable'};
  const timestamp=String(now),body=encoder.encode(JSON.stringify(event));
  const input=encoder.encode(timestamp+'.'+new TextDecoder().decode(body));
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=toHex(new Uint8Array(await crypto.subtle.sign('HMAC',key,input)));
  // Event bytes and signature are for a trusted backend-to-backend request.
  // Neither these bytes nor the secret should ever become a browser reward API.
  return {ok:true,timestamp,body,signature};
}
