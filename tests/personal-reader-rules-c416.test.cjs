'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const quests=require('../js/personal-quest-events-c45.js');
const messages=require('../js/personal-transaction-error-c416.js');
const rules=readFileSync(join(__dirname,'../firestore.rules'),'utf8');
const html=readFileSync(join(__dirname,'../index.html'),'utf8');

function allowedFields(){
 const match=rules.match(/function allowedLegacyProfileFields\(\)\s*\{\s*return\s*\[([\s\S]*?)\]/);
 assert.ok(match,'owner profile allowlist exists');
 return [...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
}

test('C4.16 all fields produced by a first-time reader purchase are allowed by Rules',()=>{
 const recorded=quests.record({quests:[],storyStates:{}},
  {type:'MARKET_PURCHASE',eventId:'shop-first-reader',day:'2026-10-31'});
 assert.equal(recorded.applied,true);
 const fields=['currency','inventory',...Object.keys(recorded.patch)];
 for(const field of fields)
  assert.ok(allowedFields().includes(field),field+' must be addable to a new reader profile');
 for(const field of ['questV437','questsDayV43'])
  assert.match(rules,new RegExp("data\\.get\\('"+field+"'"));
 assert.match(rules,/allow update: if self\(uid\) && validLegacyProfile/);
 assert.match(rules,/allow list: if false/);
 assert.match(rules,/data\.get\('currency', 0\) <= 1000000000/);
});

test('C4.16 personal transaction messages distinguish server rejection and unknown status',()=>{
 const denied=messages.message({code:'permission-denied'});
 assert.match(denied,/Firebase.*403/);
 assert.doesNotMatch(denied,/mất mạng|kết nối/i);
 assert.match(messages.message({reason:'profile-missing'}),/Hồ sơ chưa được tạo/);
 assert.match(messages.message({code:'unavailable'}),/phản hồi chắc chắn/);
 assert.match(messages.message({message:'Không đủ Xu để mua món này'}),/không đủ/i);
 assert.equal(messages.message({code:'unknown'},'Thao tác khác'),'Thao tác khác');
});

test('C4.16 live UI loads cached-busted login/transaction error scripts',()=>{
 for(const file of ['profile-save-c23','auth-v2','personal-transaction-error-c416',
   'dudu-fun-ui-v43','economy-live-v52'])
  assert.match(html,new RegExp('js/'+file+'\\.js\\?v=c416-1'));
});
