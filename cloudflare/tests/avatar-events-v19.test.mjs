import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {verifyAwardWebhook,normalizeAwardEvent,EVENT_MAX_SKEW_MS}
 from '../src/avatar-award-webhook.mjs';
const encoder=new TextEncoder();
const SECRET='server-only-very-long-test-secret-no-browser-access-1234';
async function signed(event,now=1792000000000){
 const timestamp=String(now),rawBytes=encoder.encode(JSON.stringify(event));
 const key=await webcrypto.subtle.importKey('raw',encoder.encode(SECRET),
   {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const prefix=encoder.encode(timestamp+'.');
 const input=new Uint8Array(prefix.length+rawBytes.length);
 input.set(prefix);input.set(rawBytes,prefix.length);
 const sig=new Uint8Array(await webcrypto.subtle.sign('HMAC',key,input));
 return {rawBytes,timestamp,signature:Array.from(sig,b=>b.toString(16).padStart(2,'0')).join(''),
   secret:SECRET,now};
}
const EVENT=Object.freeze({
 uid:'readerUID_17',frameId:'legend',source:'VERIFIED_STORY_MILESTONE',
 evidenceId:'server-chapter-event-123',eventId:'event-id-000001',occurredAt:1792000000000
});
test('authentic backend HMAC over raw event bytes is valid',async()=>{
 const input=await signed(EVENT);
 const proof=await verifyAwardWebhook(input);
 assert.deepEqual(proof,EVENT);
 assert.equal(normalizeAwardEvent(EVENT,1792000000000).frameId,'legend');
});
test('forged JWT/browser body, tampering, bad clocks and weak secrets fail closed',async()=>{
 const input=await signed(EVENT);
 const changed={...input,rawBytes:encoder.encode(JSON.stringify({...EVENT,uid:'victim'}))};
 assert.equal(await verifyAwardWebhook(changed),null);
 assert.equal(await verifyAwardWebhook({...input,signature:'f'.repeat(64)}),null);
 assert.equal(await verifyAwardWebhook({...input,secret:'short'}),null);
 assert.equal(await verifyAwardWebhook({...input,now:input.now+EVENT_MAX_SKEW_MS+1}),null);
 assert.equal(await verifyAwardWebhook({...input,timestamp:'invalid'}),null);
 assert.equal(await verifyAwardWebhook({...input,rawBytes:new Uint8Array(3000)}),null);
});
test('event source, scope and proof time validation remain independent from signature',async()=>{
 for(const invalid of [
   {...EVENT,uid:'../../victim'}, {...EVENT,frameId:'author'},
   {...EVENT,source:'BROWSER_MILESTONE'}, {...EVENT,evidenceId:'../../fake'},
   {...EVENT,eventId:'bad space'}, {...EVENT,occurredAt:1000},
   {...EVENT,claimedBy:'readerUID_17'}
 ]){
   const input=await signed(invalid);
   assert.equal(await verifyAwardWebhook(input),null,JSON.stringify(invalid));
 }
});
test('V19 webhooks default OFF; no browser secret or public mint path',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const worker=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const wrangler=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 const store=fs.readFileSync(path.join(root,'src/player-appearance.mjs'),'utf8');
 assert.match(wrangler,/AVATAR_AWARD_ISSUER_ENABLED = "false"/);
 assert.match(wrangler,/AVATAR_AWARDS_ENABLED = "false"/);
 assert.match(worker,/if\(origin\)return error\('origin-forbidden'/);
 assert.match(worker,/verifyAwardWebhook\(/);
 assert.match(worker,/store\.recordSignedAward\(event,now\)/);
 assert.match(worker,/getByName\('player-avatar-'\+event\.uid\)/);
 assert.match(store,/this\.ctx\.storage\.transactionSync/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS award_events/);
 assert.match(store,/INSERT INTO award_events/);
 assert.doesNotMatch(wrangler,/AVATAR_EVENT_HMAC_SECRET\s*=/);
});
