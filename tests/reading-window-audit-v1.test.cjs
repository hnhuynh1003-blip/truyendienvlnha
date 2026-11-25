'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../js/reading-window-audit-v1.js');

const good=Object.freeze({
 uid:'reader-uid',storyId:'novel-1',chapterId:'ch-1',
 contentVersion:'r2-revision-1',startMs:10000,endMs:25000,
 readerOpen:true,visible:true,focused:true,interacting:true,
 progressed:true,offline:false
});

test('R-EXP1 accepts a candidate without EVER issuing EXP or Tu Vi',()=>{
 const result=audit.inspectWindow(good);
 assert.equal(result.candidate,true);
 assert.equal(result.status,'CANDIDATE_ONLY');
 assert.equal(result.clientObservedMs,15000);
 assert.equal(result.verifiedMs,0);
 assert.equal(result.awardExp,0);
 assert.equal(result.awardTuVi,0);
 assert.equal(result.authority,'NONE');
 assert.equal(result.writable,false);
 assert.equal(typeof audit.run,'undefined');
 assert.equal(typeof audit.grant,'undefined');
});

test('hidden or unfocused reader never yields even an offline candidate',()=>{
 for(const patch of [{visible:false},{focused:false},{readerOpen:false}]){
  const result=audit.inspectWindow({...good,...patch});
  assert.equal(result.candidate,false);
  assert.equal(result.clientObservedMs,0);
  assert.equal(result.awardExp,0);
 }
});

test('no reading interaction or no new content progress is ineligible',()=>{
 for(const patch of [{interacting:false},{progressed:false},{offline:true}]){
  const result=audit.inspectWindow({...good,...patch});
  assert.equal(result.status,'INELIGIBLE');
  assert.ok(result.reasons.length>0);
  assert.equal(result.awardTuVi,0);
 }
});

test('reject invalid windows, unstable identifiers and client clocks',()=>{
 for(const patch of [
  {startMs:25000},{endMs:10000},{startMs:-1},
  {endMs:NaN},{startMs:'10000'},
  {uid:''},{chapterId:null},{contentVersion:''}
 ]){
  const result=audit.inspectWindow({...good,...patch});
  assert.equal(result.candidate,false);
  assert.equal(result.verifiedMs,0);
 }
});

test('R-EXP1 does not mutate inputs or invent a rate, cap or proof',()=>{
 const before=JSON.stringify(good);
 const result=audit.inspectWindow(good);
 assert.equal(JSON.stringify(good),before);
 assert.equal(Object.isFrozen(result),true);
 assert.equal(Object.isFrozen(result.reasons),true);
 for(const key of ['expPerMinute','tuViPerMinute','dailyCap','receiptId','serverSigned'])
  assert.equal(Object.hasOwn(result,key),false,key);
});
