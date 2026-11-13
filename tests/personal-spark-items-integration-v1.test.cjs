'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Personal shop is loaded on Spark without requiring Functions or Blaze',()=>{
 const html=source('index.html'),ui=source('js/economy-live-v52.js');
 assert.match(html,/js\/personal-spark-items-v1\.js/);
 assert.match(html,/DUDU_SPARK_ITEMS_V1_READY = true/);
 assert.match(html,/\(!DUDU_SPARK_PERSONAL_MODE\|\|window\.DUDU_SPARK_ITEMS_V1_READY===true\)/);
 assert.match(ui,/if\(personal\(\)\)\{showPersonalMarket\(\);return;\}/);
 assert.match(ui,/personalMode:true,readOnly:false/);
 assert.match(ui,/engine\.run\(\{db:root\.firebase\.firestore\(\)/);
 assert.doesNotMatch(ui,/userProfile\.currency\s*\+=/);
});
test('Live inventory has functional use and common-item sale controls only for owner',()=>{
 const html=source('index.html');
 assert.match(html,/const personalItemsReady=\(\)=>!IS_SANDBOX_MODE/);
 assert.match(html,/personalInventoryAction\('use',item\)/);
 assert.match(html,/personalInventoryAction\('sell',item\)/);
 assert.match(html,/DuduLootCadenceV42\.phoneRemainingMs/);
 assert.match(html,/localStorage\.setItem\('profile_'\+uid,JSON\.stringify\(userProfile\)\)/);
});
test('Spark shop UI uses returned wallet and inventory with no Cloud Functions call',async()=>{
 let removedStatus=false;
 const storage=new Map(),shop={},status={remove(){removedStatus=true;}},balance={textContent:''};
 const dom={ 'shop-items-container':shop,'dudu-v52-shop-status':status,'shop-currency-val':balance };
 const document={getElementById:id=>dom[id]||null,createElement:tag=>({
  tagName:tag,textContent:'',append(){},replaceChildren(){},setAttribute(){}})};
 const account={uid:'reader-1'},calls=[];let marketConfig=null,refreshed=0;
 const inventory=[{id:'common-biscuit',instanceId:'shop-item'}],nextStates={novel:{chapter:1}};
 const window={document,DUDU_SPARK_ITEMS_V1_READY:true,
  DuduAuth:{isReady:()=>true,uid:()=>account.uid},
  DuduEconomyCoreV43:require('../js/economy-core-v43.js'),
  DuduPersonalSparkItemsV1:{requestId:()=> 'shop-12345678-1234-1234-1234-123456789abc',
   async run(args){calls.push(args);return{
    status:'applied',balance:7,inventory,storyStates:nextStates};}},
  firebase:{auth:()=>({currentUser:account}),firestore:()=>({})},
  DuduMarketUIV43:{render:cfg=>{marketConfig=cfg;return true;}},
  showSystemAlert(){},renderWallet(){refreshed++;}
 };
 const userProfile={currency:15,inventory:[],storyStates:{}};
 const localStorage={getItem:k=>storage.get(k)||null,
  setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 vm.runInNewContext(source('js/economy-live-v52.js'),
  {window,document,userProfile,localStorage,IS_SANDBOX_MODE:false});
 await window.DuduEconomyLiveV52.openShop();
 assert.equal(removedStatus,true,'legacy personal-wallet banner should be removed');
 assert.equal(marketConfig.personalMode,true);
 assert.equal(marketConfig.readOnly,false);
 assert.equal(marketConfig.coins,15);
 assert.ok(marketConfig.saleIds.includes('common-biscuit'));
 assert.ok(!marketConfig.saleIds.includes('dudu-tool-discount-v438'));
 assert.equal(await marketConfig.onBuy('common-biscuit'),true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].kind,'purchase');
 assert.equal(userProfile.currency,7);
 assert.equal(userProfile.inventory,inventory);
 assert.equal(userProfile.storyStates,nextStates);
 assert.equal(refreshed,1);
 assert.equal(storage.has('dudu-personal-shop:pending:reader-1'),false);
});
