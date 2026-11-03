'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const rootDir=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(rootDir,p),'utf8');
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};
  this.className='';this.style={setProperty(){}};this.dataset={};}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text||this.children.map(n=>n.textContent||'').join('');}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(key,value){(this.attributes||(this.attributes={}))[key]=value;}
 addEventListener(kind,callback){this.listeners[kind]=callback;}
}
const walk=node=>[node,...node.children.flatMap(walk)];
const trigger=(node,kind)=>{assert.ok(node?.listeners?.[kind]);node.listeners[kind]();};

test('F3.6 Shop selects physical items explicitly; no sale before user checks a box',()=>{
 const host=new Node('section'),sold=[],entries=[
  {instanceId:'a',itemId:'f31-apple-moon',rank:'E',price:4,name:'Táo Nguyệt Quang'},
  {instanceId:'b',itemId:'f31-fossil-shell',rank:'E',price:4,name:'Vỏ Sao'},
  {instanceId:'c',itemId:'f31-sword-bamboo',rank:'D',price:8,name:'Kiếm Trúc'}];
 const stub={document:{createElement:tag=>new Node(tag)},
  confirm:()=>true,
  DuduEconomyCoreV43:{norm:()=>({counts:{},total:0}),preview:()=>[],
   PURCHASE_TOTAL_PER_DAY:20,TOOL_LIMITS:{}},
  DuduPersonalBulkSaleF34:{MAX_BATCH:100,candidates:()=>entries},
  DuduItemArtV13:{mount:()=>false},
  DuduStoryMarketV43:{options:()=>[]}};
 stub.window=stub;
 vm.runInNewContext(read('js/market-ui-v43.js'),stub);
 stub.DuduMarketUIV43.render({host,coins:400,onBuy:()=>{},personalMode:true,
  inventory:entries.map(x=>({instanceId:x.instanceId,icon:'✦'})),
  storyStates:{},onBulkSell:ids=>sold.push([...ids])});
 const tab=walk(host).find(n=>n.tag==='button'&&n.textContent==='Bán nhanh');
 trigger(tab,'click');
 let action=walk(host).find(n=>n.className==='f34-quick-confirm');
 assert.equal(action.disabled,true);
 let choices=walk(host).filter(n=>n.className.includes('f36-quick-item'));
 assert.equal(choices.length,3);
 const second=choices[1].children[0];second.checked=true;trigger(second,'change');
 action=walk(host).find(n=>n.className==='f34-quick-confirm');
 assert.equal(action.disabled,false);
 assert.match(action.textContent,/Bán 1 món · \+4 Xu/);
 trigger(action,'click');
 assert.deepEqual(sold,[['b']]);
 const clear=walk(host).find(n=>n.tag==='button'&&n.textContent==='Bỏ chọn');
 trigger(clear,'click');assert.equal(action.disabled,true);
 const all=walk(host).find(n=>n.tag==='button'&&n.textContent==='✓ Chọn tất cả');
 trigger(all,'click');assert.match(action.textContent,/Bán 3 món · \+16 Xu/);
});

test('F3.6 popup and new spin controls are wired, old inline result title removed',()=>{
 const ui=read('js/dudu-fun-ui-v43.js'),css=read('css/dudu-fun-v43.css');
 const market=read('js/market-ui-v43.js'),html=read('index.html');
 assert.match(ui,/for\(const count of \[1,5,10\]\)/);
 assert.match(ui,/vvBridge\(\)\.runBatch\(pending\)/);
 assert.match(ui,/function showVantVatRewards\(results,count\)/);
 assert.match(ui,/close\.onclick=dismiss/);
 assert.doesNotMatch(ui,/stage\.append\(machine,el\('strong','f34-vantvat-title'/);
 assert.match(css,/\.f36-vantvat-overlay\{/);
 assert.match(css,/\.f36-vantvat-reward-grid\.is-single/);
 assert.match(market,/quickSelectedIds=new Set\(\)/);
 for(const filename of ['fun-vantvat-f31','personal-vantvat-f31',
  'market-ui-v43','dudu-fun-ui-v43'])
  assert.match(html,new RegExp(filename+'\\.js\\?v='+
   (filename==='dudu-fun-ui-v43'?'f37-1':'f36-1')));
 assert.match(html,/css\/dudu-fun-v43\.css\?v=f37-1/);
 assert.match(html,/css\/market-v43\.css\?v=f36-1/);
});
