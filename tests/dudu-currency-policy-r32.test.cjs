'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const policy=require('../js/dudu-currency-policy-r32.js');
const {XU_TO_STONE,STONE_TO_XU}=policy.DIRECTIONS;
test('R3.2 quotes exactly 100 Xu for 1 Linh Thach without moving money',()=>{
 assert.equal(policy.XU_PER_LINH_THACH,100);
 const q=policy.quote({direction:XU_TO_STONE,xuBalance:350,linhThachBalance:5,amount:300});
 assert.deepEqual({ok:q.ok,spent:q.amountSpent,received:q.amountReceived,remaining:q.remainingSource,destination:q.resultingDestination,previewOnly:q.previewOnly},
  {ok:true,spent:300,received:3,remaining:50,destination:8,previewOnly:true});
 const reverse=policy.quote({direction:STONE_TO_XU,xuBalance:50,linhThachBalance:8,amount:3});
 assert.equal(reverse.amountReceived,300);assert.equal(reverse.resultingDestination,350);
});
test('R3.2 rejects fractional or invalid input, caps, and unavailable balances',()=>{
 const x=(extra={})=>policy.quote({direction:XU_TO_STONE,xuBalance:350,linhThachBalance:5,amount:100,...extra});
 assert.equal(x({amount:101}).reason,'must-be-multiple-of-100-xu');
 assert.equal(x({amount:400}).reason,'insufficient-balance');
 assert.equal(x({amount:0}).reason,'invalid-input');
 assert.equal(x({amount:100.5}).reason,'invalid-input');
 assert.equal(x({xuBalance:NaN}).reason,'invalid-input');
 assert.equal(x({direction:'ARCADE_TO_XU'}).reason,'invalid-input');
 assert.equal(x({linhThachBalance:policy.MAX_BALANCE}).reason,'destination-cap');
 assert.equal(policy.quote({direction:STONE_TO_XU,xuBalance:policy.MAX_BALANCE,linhThachBalance:1,amount:1}).reason,'destination-cap');
});
test('R3.2 pure policy has no storage, network, currency or transaction mutations',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../js/dudu-currency-policy-r32.js'),'utf8');
 assert.doesNotMatch(source,/\.currency\s*=|runTransaction|localStorage\.|sessionStorage\.|fetch\(|httpsCallable|firebase\.|\.update\(|\.set\(/);
 const original={xuBalance:350,linhThachBalance:5,amount:100,direction:XU_TO_STONE};
 const snapshot=JSON.stringify(original);policy.quote(original);assert.equal(JSON.stringify(original),snapshot);
});