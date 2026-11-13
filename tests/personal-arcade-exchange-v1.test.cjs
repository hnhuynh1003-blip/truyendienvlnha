'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const exchange=require('../js/personal-arcade-exchange-v1.js');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('10 Arcade Xu converts to 1 wallet Xu, with exact integer-tenths accounting',()=>{
 assert.equal(exchange.GAME_XU_PER_WALLET_XU,10);
 assert.equal(exchange.MIN_GAME_XU,10);
 const q=exchange.quote({availableTenths:1029,requestedGameXu:100});
 assert.equal(q.ok,true);
 assert.equal(q.previewOnly,true);
 assert.equal(q.gameXu,100);
 assert.equal(q.walletXu,10);
 assert.equal(q.maxGameXu,100,'Fractional Xu never rounds up a purchase');
 assert.equal(exchange.quote({availableTenths:99,requestedGameXu:10}).ok,false);
 assert.equal(exchange.quote({availableTenths:100,requestedGameXu:10}).walletXu,1);
});

test('amount is user selected, must be a positive multiple of ten and within balance',()=>{
 for(const requestedGameXu of [0,5,10.5,25,-10,NaN,Infinity,'10',null]){
  assert.equal(exchange.quote({availableTenths:2000,requestedGameXu}).ok,false,String(requestedGameXu));
 }
 for(const n of [10,50,100,200]){
  const q=exchange.quote({availableTenths:2000,requestedGameXu:n});
  assert.equal(q.ok,true,String(n));assert.equal(q.walletXu,n/10);
 }
 assert.equal(exchange.quote({availableTenths:2000,requestedGameXu:210}).reason,'insufficient-balance');
});

test('no arbitrary daily exchange ceiling; player can select any affordable amount',()=>{
 assert.equal('DAILY_WALLET_XU_CAP' in exchange,false);
 const available=exchange.remaining({availableTenths:100000});
 assert.equal(available.maxGameXu,10000);
 assert.equal(exchange.quote({availableTenths:100000,requestedGameXu:10000}).walletXu,1000);
 assert.equal(exchange.quote({availableTenths:100000,requestedGameXu:10010}).ok,false);
});

test('corrupt coin balance cannot produce a quote',()=>{
 for(const availableTenths of [-1,1.25,NaN,Infinity,'100000']){
  assert.equal(exchange.quote({availableTenths,requestedGameXu:10}).ok,false);
 }
 assert.equal(exchange.quote({availableTenths:1000000001,requestedGameXu:10}).ok,false);
 assert.doesNotMatch(source('js/personal-arcade-exchange-v1.js'),/localStorage|firebase|fetch\(|userProfile|grantCoins/);
});

test('the old 10:1 quote module remains archival; public wallet uses unified Xu',()=>{
 const html=source('index.html'),ui=source('js/personal-arcade-ui-v1.js');
 assert.match(html,/arcade-unified-xu-r32\.js/);
 assert.match(html,/DUDU_ARCADE_UNIFIED_XU_R32_READY=true/);
 assert.doesNotMatch(html,/onclick="window\.DuduPersonalArcadeUIV1\?\.openExchange/);
 assert.doesNotMatch(html,/data-arcade-exchange="open"/);
 assert.match(ui,/unifiedBridge\.run/);
 assert.match(ui,/if\(unifiedMode\(\)\)return false;/);
 assert.match(ui,/DUDU_SPARK_EXCHANGE_V1_READY===true/,
  'old gate stays unused; it cannot become an automatic credit');
});
