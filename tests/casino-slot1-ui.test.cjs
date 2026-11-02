'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const rules=require('../js/dudu-casino-design-v1.js');
const read=p=>readFileSync(join(__dirname,'..',p),'utf8');
class Node{
 constructor(tag){this.tag=tag;this.className='';this.textContent='';
  this.style={setProperty(key,value){this[key]=value;}};
  this.children=[];this.listeners={};this.disabled=false;this.attributes={};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 addEventListener(key,fn){this.listeners[key]=fn;}
 setAttribute(key,value){this.attributes[key]=value;}
}
const flatten=node=>[node,...node.children.flatMap(flatten)];
function env(){
 const host=new Node('div'),timers=[];let draws=0;
 const window={DuduCasinoDesignV1:rules,document:{createElement:t=>new Node(t)},
  setTimeout(fn){timers.push(fn);},crypto:{getRandomValues(arr){draws++;
   arr.fill(0);return arr;}}};
 vm.runInNewContext(read('js/dudu-casino-slot-ui-v1.js'),{window,Uint32Array,console});
 return{host,window,timers,get draws(){return draws;}};
}

test('CASINO-SLOT1 preview refuses to mount without explicit demo mode',()=>{
 const e=env();
 assert.equal(e.window.DuduCasinoSlotUIV1.mount({host:e.host}),false);
 assert.equal(e.window.DuduCasinoSlotUIV1.mount({demo:true}),false);
 assert.equal(e.host.children.length,0);
});

test('CASINO-SLOT1 preview renders cabinet, chips, 3 × 3 reels, odds and no Xu account',()=>{
 const e=env(),ctrl=e.window.DuduCasinoSlotUIV1.mount({host:e.host,demo:true});
 assert.ok(ctrl);
 const nodes=flatten(e.host);
 assert.equal(nodes.filter(x=>x.className.includes('dudu-slot-tile')).length,9);
 assert.equal(nodes.filter(x=>x.tag==='span'&&
  x.className.startsWith('dudu-slot-line')).length,3);
 assert.equal(nodes.filter(x=>x.tag==='button'&&
  x.className.includes('dudu-slot-chip')).length,3);
 assert.match(nodes.map(x=>x.textContent).join(' '),/KHÔNG TRỪ \/ CỘNG XU THẬT/);
 assert.match(nodes.map(x=>x.textContent).join(' '),/92,0784%/);
 assert.equal(ctrl.state().bet,10);
 assert.equal(e.draws,0);
});

test('CASINO-SLOT1 preview commits result before animation and blocks double-click',async()=>{
 const e=env(),ctrl=e.window.DuduCasinoSlotUIV1.mount({host:e.host,demo:true});
 const chip=flatten(e.host).find(x=>x.className.includes('dudu-slot-chip')&&
  x.textContent.includes('20'));
 chip.listeners.click();
 assert.equal(ctrl.state().bet,20);
 const pending=ctrl.play();
 assert.equal(ctrl.state().busy,true);
 assert.equal(e.draws,1);
 assert.equal(e.timers.length,1);
 const second=await ctrl.play();
 assert.equal(second,false);
 assert.equal(e.draws,1);
 const spin=flatten(e.host).find(x=>x.className==='dudu-slot-spin');
 assert.equal(spin.disabled,true);
 for(let col=0;col<3;col++){
  assert.equal(e.timers.length,1);
  e.timers.shift()();
  await Promise.resolve();
  if(col<2)assert.equal(flatten(e.host).filter(x=>
   x.className.includes('is-stopped')).length,(col+1)*3);
 }
 assert.equal(await pending,true);
 assert.equal(ctrl.state().spins,1);
 assert.equal(ctrl.state().quote.payout,300); // 3 star triples, ×5 per line.
 assert.equal(ctrl.state().quote.net,280);
 assert.equal(ctrl.state().busy,false);
 assert.equal(flatten(e.host).filter(x=>x.className==='dudu-slot-line is-winning').length,3);
 assert.match(flatten(e.host).map(x=>x.textContent).join(' '),/TRÚNG THƯỞNG/);
 assert.equal(e.draws,1);
});

test('CASINO-SLOT1 preview uses code-native themed assets, and excludes Firebase',()=>{
 const preview=read('previews/casino-slot1.html');
 const css=read('css/dudu-casino-slot-v1.css');
 const main=read('index.html');
 assert.match(preview,/lang="vi"/);
 assert.match(preview,/dudu-casino-slot-v1\.css/);
 assert.match(preview,/dudu-casino-slot-ui-v1\.js/);
 assert.match(preview,/DuduCasinoSlotUIV1\.mount/);
 assert.doesNotMatch(preview,/firebase|firestore|currency/ig);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.is-spinning/);
 assert.match(css,/\.dudu-slot-line\.is-winning/);
 assert.doesNotMatch(main,/previews\/casino-slot1\.html/);
});
