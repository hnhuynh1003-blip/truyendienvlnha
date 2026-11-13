'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rule=require('../js/fun-vantvat-f31.js');
const box=require('../js/personal-blind-box-c29.js');
const catalog=require('../js/item-catalog-v2.js');
const visual=require('../js/item-visuals-v13.js');
const uuid='00000000-0000-4000-8000-000000000777';
const instance=(item,kind)=>({...item,instanceId:
  'fun-'+(kind==='VAN_BAO'?'box-':'vantvat-')+uuid,
 obtainedFrom:{kind:'EVENT',source:kind==='VAN_BAO'?
  'DUDU_FUN_BOX':'DUDU_FUN_VANTUONG',eventId:uuid}});

test('F3.5 prices Vạn Tượng independently of the existing 20-Xu Vạn Bảo pool',()=>{
 assert.equal(rule.PRICE,25);
 assert.deepEqual(rule.VALUES,{E:4,D:8,C:16,B:40,A:100,S:300,SS:900,SSS:3000});
 assert.deepEqual(rule.BOX_VALUES,{E:3,D:6,C:12,B:26,A:55,S:120,SS:320,SSS:900});
 assert.equal(box.PRICE,20);
 assert.equal(box.DUPLICATE_RETURN,4);
 for(const item of catalog.funCollectibles){
  const collectible=instance(item,'VAN_BAO');
  assert.equal(rule.valueOf(collectible),rule.BOX_VALUES[item.rank]);
  assert.equal(rule.valueOf({...collectible,obtainedFrom:{...collectible.obtainedFrom,
   source:'DUDU_FUN_VANTUONG'}}),0,'cross-game source cannot reprice a fake item');
 }
 for(const item of catalog.funVantVat){
  const collectible=instance(item,'VAN_VAT');
  assert.equal(rule.valueOf(collectible),rule.VALUES[item.rank]);
 }
});

test('F3.5 preserves rarity weights, bounded average payout and all 18 Khởi Nguyên artworks',()=>{
 const budgets={};
 for(const prize of rule.POOL)budgets[prize.rank]=(budgets[prize.rank]||0)+prize.weight;
 assert.deepEqual(budgets,{E:400000,D:280000,C:170000,B:80000,
  A:36000,S:14000,SS:3000,SSS:200,COIN:92000});
 const expected=rule.POOL.reduce((sum,prize)=>
  sum+prize.weight*(prize.amount??rule.VALUES[prize.rank]),0)/rule.TOTAL;
 assert.ok(expected>20&&expected<21,'average Xu payout is about 20.54');
 assert.ok(expected/rule.PRICE<.85,'spin does not guarantee positive Xu expectation');
 const origin=catalog.funVantVat.filter(item=>item.funRealm==='ORIGIN');
 assert.equal(origin.length,18);
 const paths=new Set();
 for(const item of origin){
  const art=visual.visual(item);
  assert.match(art.src,/^assets\/van-tuong\/(f34|f35)\/.+\.webp$/);
  assert.ok(fs.statSync(path.resolve(__dirname,'..',art.src)).size>10000);
  paths.add(art.src);
 }
 assert.equal(paths.size,18,'every Origin item has a dedicated image URL');
});
