'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const owner=fs.readFileSync(path.join(root,'js/firebase-owner-self-check-c13b6d.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'js/firebase-worker-get-probe-c13b6d.js'),'utf8');

test('C13-B6D: both client diagnostics allow at most 5 seconds future issuedAt skew',()=>{
  assert.match(owner,/const ISSUED_SKEW_MS=5000;/);
  assert.match(worker,/const ISSUED_SKEW_MS = 5000;/);
  assert.match(owner,/issued>now\+ISSUED_SKEW_MS/);
  assert.match(worker,/issued <= now \+ ISSUED_SKEW_MS/);
  assert.doesNotMatch(owner,/issued>now\)code=/);
  assert.doesNotMatch(worker,/issued <= now &&/);
  assert.doesNotThrow(()=>new Function(owner));
  assert.doesNotThrow(()=>new Function(worker));
});

test('C13-B6D: expiration, owner claims and Worker identity checks remain strict',()=>{
  assert.match(owner,/jwtExpiry<=now/);
  assert.match(owner,/sdkExpiry<=now/);
  assert.match(owner,/claims\.admin===true/);
  assert.match(owner,/claims\.sub===OWNER/);
  assert.match(worker,/exp \* 1000 > now/);
  assert.match(worker,/expiry > now/);
  assert.match(worker,/claims\.admin === true/);
  assert.match(worker,/claims\.sub === OWNER/);
  assert.match(worker,/anonymousStatus !== 401/);
  assert.match(worker,/ownerStatus === 200/);
});
