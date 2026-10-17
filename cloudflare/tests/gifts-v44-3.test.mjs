import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {requestGift,requestDecision} from '../src/gift-requests-v44-3.mjs';
const request={requestId:'req001',storyId:'story01',
 chapterId:'chapter01',itemInstanceId:'owned001',
 destination:'AUTHOR',note:'Cảm ơn bạn'};
test('V44.3: accept exact gift fields only — sender UID and recipient cannot be forged',()=>{
 assert.deepEqual(requestGift(request),request);
 for(const field of [{recipientUid:'another'}, {uid:'admin'}, {ownerUid:'admin'},
 {isAdmin:true},{gift:{id:'custom'}},{item:{id:'f1'}},{authorUid:'author'},
 {proof:'spoof'}, {price:50}, {commentId:'fake-public-comment'}]){
  assert.equal(requestGift({...request,...field}),null);
 }
 assert.equal(requestGift({...request,destination:'NPC'}),null);
 assert.equal(requestGift({...request,itemInstanceId:'weird item'}),null);
 assert.equal(requestGift({...request,storyId:'another story'}),null);
 assert.equal(requestGift({...request,note:'a'.repeat(161)}),null);
 assert.deepEqual(requestDecision({transferId:'gift-123',action:'ACCEPT'}),
  {transferId:'gift-123',action:'ACCEPT'});
 assert.equal(requestDecision({transferId:'gift-123',action:'RETURN'}),null);
 assert.equal(requestDecision({transferId:'gift-123',action:'DECLINE',
  uid:'stranger'}),null);
});
test('V44.3: transfer server uses single global SQL ledger, no browser minting',()=>{
 const p=file=>fs.readFileSync(path.join(import.meta.dirname,'..',file),'utf8');
 const ledger=p('src/gift-ledger-v44-3.mjs');
 const worker=p('src/index.mjs');
 const toml=p('wrangler.toml');
 assert.match(ledger,/CREATE TABLE IF NOT EXISTS trusted_stories/);
 assert.match(ledger,/CREATE TABLE IF NOT EXISTS trusted_items/);
 assert.match(ledger,/CREATE TABLE IF NOT EXISTS gift_receipts/);
 assert.match(ledger,/UNIQUE\(sender_uid,request_id\)/);
 assert.match(ledger,/this\.ctx\.storage\.transactionSync/);
 assert.match(ledger,/holder_type='USER' AND holder_key=\?/);
 assert.match(ledger,/holder_type='ESCROW' AND holder_key=\?/);
 assert.match(ledger,/sender_uid=\?/);
 assert.match(ledger,/recipient_key=\?/);
 assert.doesNotMatch(ledger,/userProfile|localStorage|firebase\.firestore|function grant\(/);
 assert.match(worker,/verifyFirebaseIdToken\(req,env\.PROJECT_ID\)/);
 assert.match(worker,/handleGifts\(req,env,path,origin\)/);
 assert.match(worker,/GIFT_SETTLEMENT_ENABLED!=='true'/);
 assert.match(toml,/GIFTS_ENABLED = "false"/);
 assert.match(toml,/GIFT_SETTLEMENT_ENABLED = "false"/);
 assert.match(toml,/name = "DUDU_GIFT_LEDGER"/);
 assert.match(toml,/new_sqlite_classes = \["DuduGiftLedger"\]/);
});
test('V44.3: item issuer and author binding are not exposed as public routes',()=>{
 const file=p=>fs.readFileSync(path.join(import.meta.dirname,'..',p),'utf8');
 const ledger=file('src/gift-ledger-v44-3.mjs'),worker=file('src/index.mjs');
 assert.doesNotMatch(worker,/\/v1\/gifts\/admin\/mint|\/v1\/gifts\/admin\/bind/);
 assert.doesNotMatch(ledger,/mintTrusted\(|seedAuthorFromClient/);
 assert.match(ledger,/quoteGift\(\{senderUid:uid,\.\.\.e/);
 assert.match(ledger,/import \{quoteGift,transition,STAGES\}/);
 assert.match(worker,/path==='\/v1\/gifts\/author-inbox'/);
});
