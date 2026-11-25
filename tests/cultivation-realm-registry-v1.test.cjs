'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const realms=require('../js/cultivation-realm-registry-v1.js');

test('P0.1 preserves approved nine major realm names in order',()=>{
 assert.equal(realms.REALMS.length,9);
 assert.deepEqual(realms.REALMS.map(r=>r.name),[
  'Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần',
  'Luyện Hư','Hợp Thể','Đại Thừa','Độ Kiếp']);
 assert.deepEqual(realms.REALMS.map(r=>r.index),[1,2,3,4,5,6,7,8,9]);
});

test('P0.1 enumerates exactly 90 valid labels with stage phases',()=>{
 const labels=new Set();
 for(const realm of realms.REALMS){
  for(let stage=1;stage<=10;stage++){
   const entry=realms.describe(realm.id,stage);
   assert.equal(entry.realm,realm.name);
   assert.equal(entry.stage,stage);
   assert.equal(entry.phase,stage<=3?'Sơ kỳ':stage<=6?'Trung kỳ':stage<=9?'Hậu kỳ':'Viên mãn');
   assert.equal(entry.label,`${realm.name} · Tầng ${stage} · ${entry.phase}`);
   labels.add(entry.label);
   assert.equal(entry.requiresBreakthrough,stage===10&&realm.index<9);
  }
 }
 assert.equal(labels.size,90);
 assert.equal(realms.describe('kim-dan',7).label,'Kim Đan · Tầng 7 · Hậu kỳ');
});

test('breakthrough is manual; no invented tenth realm or automatic EXP conversion',()=>{
 const d=realms.describe('do-kiep',10);
 assert.equal(d.finalStage,true);
 assert.equal(d.nextRealmId,null);
 assert.equal(d.requiresBreakthrough,false);
 assert.equal(realms.describe('luyen-khi',10).nextRealmId,'truc-co');
 assert.equal(Object.hasOwn(realms,'grantExp'),false);
 assert.equal(Object.hasOwn(realms,'levelToRealm'),false);
 assert.equal(Object.hasOwn(realms,'breakthrough'),false);
 assert.equal(Object.isFrozen(realms.REALMS),true);
 assert.equal(Object.isFrozen(d),true);
});

test('unknown realm, invalid stage or untrusted implicit fallback is rejected',()=>{
 for(const realm of ['LEVEL_1','',undefined,null,'kim_dan','constructor','__proto__'])
  assert.equal(realms.describe(realm,1),null);
 for(const stage of [-1,0,11,1.2,'1',Infinity,NaN,undefined])
  assert.equal(realms.describe('kim-dan',stage),null);
});
