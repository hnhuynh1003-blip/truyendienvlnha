'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../js/market-ui-v43.js'),'utf8');

function element(tag){
 return {
  tag,children:[],dataset:{},hidden:false,textContent:'',
  append(...nodes){this.children.push(...nodes);},
  replaceChildren(...nodes){this.children=[...nodes];},
  setAttribute(){},
  addEventListener(event,fn){(this.events??={})[event]=fn;}
 };
}

test('Main shop keeps one phone title and wallet; tabs and filters remain usable',()=>{
 const win={DuduEconomyCoreV43:{
  norm:()=>({counts:{},total:0}),preview:()=>[],
  PURCHASE_TOTAL_PER_DAY:10,PURCHASE_PER_ITEM_PER_DAY:3,TOOL_LIMITS:{}
 }};
 const doc={createElement:element};
 vm.runInNewContext(source,{window:win,document:doc});
 const host=element('section');
 const config={host,coins:107,state:null,onBuy:()=>true,personalMode:true};
 assert.equal(win.DuduMarketUIV43.render(config),true);
 let toolbar=host.children.find(x=>x.className==='dudu-v43-market-toolbar');
 assert.ok(toolbar);
 assert.equal(toolbar.children.some(child=>child.className==='dudu-v43-market-intro'),false,
  'do not repeat the shop header with a DUDU MARKET tagline');
 const [groups,tabs,filters,hint]=toolbar.children;
 assert.equal(groups.children.length,4,'SELL is only exposed with its callback');
 assert.deepEqual(Array.from(groups.children,x=>x.textContent),['Vật Phẩm','Tu Tiên','Ngoại Hình','Sưu Tầm']);
 assert.equal(filters.children[0].placeholder,'Tìm tên vật phẩm hoặc phẩm cấp');
 assert.equal(hint.hidden,true,'balance already appears once above the shop');
 assert.equal(hint.textContent,'');
 groups.children[3].events.click();
 toolbar=host.children.find(x=>x.className==='dudu-v43-market-toolbar');
 assert.equal(toolbar.children[1].children.length,3,'legacy collection sources remain available');
 assert.equal(toolbar.children[3].hidden,false,'realm guidance remains visible');
 assert.match(toolbar.children[3].textContent,/Vật phẩm vị diện/);
});
