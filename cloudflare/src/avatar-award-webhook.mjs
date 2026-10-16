/* V19 — authenticated backend-to-backend event contract.
 * This ONLY verifies an event signed by a secret held by a future trusted
 * story/NPC service. It does not itself establish that the underlying
 * gameplay event took place. Do not distribute the secret to browsers.
 */
import {SERVER_AWARD_SOURCES} from './player-appearance-rules.mjs';
const encoder=new TextEncoder();
export const EVENT_MAX_BYTES=2048;
export const EVENT_MAX_SKEW_MS=5*60*1000;
const GOOD_ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const UID=/^[A-Za-z0-9_-]{1,128}$/;
export function normalizeAwardEvent(value,now){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.keys(value).sort().join(',')!=='eventId,evidenceId,frameId,occurredAt,source,uid')return null;
  const {uid,frameId,source,evidenceId,eventId,occurredAt}=value;
  if(typeof uid!=='string'||!UID.test(uid)||
     !Object.hasOwn(SERVER_AWARD_SOURCES,frameId)||
     source!==SERVER_AWARD_SOURCES[frameId]||
     typeof eventId!=='string'||!GOOD_ID.test(eventId)||
     typeof evidenceId!=='string'||!GOOD_ID.test(evidenceId)||
     !Number.isSafeInteger(occurredAt)||occurredAt<=0||
     occurredAt>now+EVENT_MAX_SKEW_MS||
     occurredAt<now-7*24*3600*1000)return null;
  return Object.freeze({uid,frameId,source,evidenceId,eventId,occurredAt});
}
export async function verifyAwardWebhook({rawBytes,timestamp,signature,secret,now}){
  if(!(rawBytes instanceof Uint8Array)||rawBytes.length<20||
     rawBytes.length>EVENT_MAX_BYTES||
     typeof timestamp!=='string'||!/^\d{13}$/.test(timestamp)||
     !Number.isSafeInteger(now)||
     Math.abs(Number(timestamp)-now)>EVENT_MAX_SKEW_MS||
     typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature)||
     typeof secret!=='string'||secret.length<32)return null;
  const cryptoApi=globalThis.crypto;
  if(!cryptoApi?.subtle)return null;
  const key=await cryptoApi.subtle.importKey('raw',encoder.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  // HMAC authenticates the exact raw bytes, including whitespace/order.
  const prefix=encoder.encode(timestamp+'.');
  const message=new Uint8Array(prefix.length+rawBytes.length);
  message.set(prefix);message.set(rawBytes,prefix.length);
  const mac=new Uint8Array(await cryptoApi.subtle.sign('HMAC',key,message));
  let mismatch=0;
  for(let i=0;i<32;i++)mismatch|=mac[i]^Number.parseInt(signature.slice(i*2,i*2+2),16);
  if(mismatch!==0)return null;
  let payload;
  try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(rawBytes));}
  catch(_){return null;}
  return normalizeAwardEvent(payload,now);
}
