'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('C2.4b wallet/warehouse shows exactly three useful tabs, with no author-gift action',()=>{
 const nodes=[];
 const document={createElement(tag){const node={tag,children:[],attributes:{},dataset:{},
  append(...args){this.children.push(...args)},replaceChildren(...args){this.children=args},
  setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){(this.events??={})[k]=fn}};
  nodes.push(node);return node;}};
 const rules=require('../js/inventory-trade-v43-9.js');
 const win={DuduInventoryTradeV439:rules};
 vm.runInNewContext(read('js/inventory-hub-v43-9.js'),{window:win,document});
 const host=document.createElement('section');
 assert.equal(win.DuduInventoryHubV439.render({host,inventory:[],coins:0}),true);
 const nav=host.children[0];
 assert.deepEqual(nav.children.map(button=>button.dataset.mode),
  ['overview','market','auction']);
 assert.doesNotMatch(read('js/inventory-view-v42.js'),/onStoryGift|Tặng cho truyện/);
 assert.doesNotMatch(read('js/story-comments-ui-v44-2.js'),/selectedGiftId|DuduGiftPickerV4431\.open/);
});

test('C2.4b author mailbox launcher is hidden but old history survives; NPC gifts are retained',()=>{
 const html=read('index.html');
 assert.match(html,/onclick="openPhoneApp\('author-mail'\)"[^>]*hidden style="display:none!important"/);
 assert.match(html,/id="phone-app-author-mail"/);
 assert.match(html,/history\.filter\(x=>x\.action==='GIFT'/);
 const trade=require('../js/inventory-trade-v43-9.js');
 const gift={action:'GIFT',instanceId:'legacy-gift-1',name:'Kỷ niệm',day:'2026-10-20',
  storyId:'book-one',recipientKind:'STORY_SANDBOX',deliveryStatus:'LOCAL_JOURNAL_ONLY'};
 assert.ok(trade.state({version:1,day:'2026-10-30',sold:0,listings:[],history:[gift]}).history
  .some(row=>row.action==='GIFT'),'old local receipts still parse');
 assert.match(html,/commitPersonalNpcExchangeV1/);
 assert.match(html,/personalInventoryAction\('sell',item\)/);
 const docs=read('docs/DUDU-SANDBOX-TO-MAIN-LIVE-C2-2026-10-30.md');
 assert.match(docs,/Đã loại khỏi phạm vi triển khai/);
});
